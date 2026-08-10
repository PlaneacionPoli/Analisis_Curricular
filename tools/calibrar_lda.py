"""
Calibración del número óptimo de tópicos k para LDA.

Evalúa coherencia c_v para k en [5, 20] sobre el corpus real de
SaberAsociado (≈5.780 núcleos). Genera un reporte con la curva de
coherencia para seleccionar el k óptimo visualmente.

Uso:
    python tools/calibrar_lda.py
    python tools/calibrar_lda.py --k-min 5 --k-max 20 --step 1
    python tools/calibrar_lda.py --output docs/lda_calibracion.png
"""

import argparse
import sys
import unicodedata
import re
from pathlib import Path

import pandas as pd
import numpy as np

sys.path.append(str(Path(__file__).parent.parent))


def _normalizar(texto: str) -> str:
    if pd.isna(texto):
        return ''
    t = unicodedata.normalize('NFKD', str(texto))
    t = t.encode('ascii', 'ignore').decode('ascii')
    t = t.lower().strip()
    t = re.sub(r'[^a-z\s]', ' ', t)
    t = re.sub(r'\s+', ' ', t)
    return t.strip()


def cargar_corpus() -> list:
    """Carga todos los archivos Excel y extrae SaberAsociado."""
    from config import INPUT_FOLDER
    from src.extractor import ExcelExtractor

    input_folder = Path(INPUT_FOLDER)
    excel_files = list(input_folder.rglob('*.xlsx'))

    if not excel_files:
        print(f"[X] No se encontraron archivos en: {input_folder}")
        sys.exit(1)

    print(f"[FOLDER] Cargando corpus desde {len(excel_files)} archivos...")
    corpus = []
    errores = 0

    for i, fp in enumerate(excel_files, 1):
        try:
            extractor = ExcelExtractor(str(fp))
            data = extractor.extract_all()
            df_ra = data.get('resultados_aprendizaje', pd.DataFrame())
            if not df_ra.empty and 'SaberAsociado' in df_ra.columns:
                textos = df_ra['SaberAsociado'].dropna().tolist()
                corpus.extend([_normalizar(t) for t in textos if pd.notna(t) and len(str(t)) > 10])
            print(f"  [{i}/{len(excel_files)}] {fp.name} — {len(corpus)} docs acumulados")
        except Exception as e:
            errores += 1
            print(f"  [!] Error en {fp.name}: {e}")

    corpus = [t for t in corpus if len(t.split()) >= 3]
    print(f"\n[OK] Corpus final: {len(corpus)} documentos ({errores} archivos con error)\n")
    return corpus


def calcular_coherencia_cv(corpus: list, k_range: range, stopwords: list) -> dict:
    """
    Calcula coherencia UMass aproximada para cada k en k_range.
    Usa CountVectorizer + LDA de sklearn (no requiere gensim).
    """
    from sklearn.feature_extraction.text import CountVectorizer
    from sklearn.decomposition import LatentDirichletAllocation

    print(f"[ML] Evaluando k en {list(k_range)}...")
    print("     (Esto puede tardar varios minutos)\n")

    vectorizer = CountVectorizer(
        max_features=800,
        min_df=3,
        max_df=0.85,
        stop_words=stopwords,
        ngram_range=(1, 2)
    )
    doc_word = vectorizer.fit_transform(corpus)
    doc_word_dense = doc_word.toarray()

    resultados = {}

    for k in k_range:
        lda = LatentDirichletAllocation(
            n_components=k,
            random_state=42,
            max_iter=150,
            learning_method='batch',
            n_jobs=-1
        )
        lda.fit(doc_word)

        # Perplejidad (log-verosimilitud negativa, cuanto menor mejor)
        perplexity = lda.perplexity(doc_word)

        # Score UMass aproximado: para cada par de palabras en un tópico,
        # medir co-ocurrencia en el corpus
        coherencia_topicos = []
        for topic in lda.components_:
            top_idx = topic.argsort()[:-11:-1]  # top 10 palabras
            top_words_matrix = doc_word_dense[:, top_idx]

            # Conteos de co-ocurrencia
            scores = []
            for i in range(len(top_idx)):
                for j in range(i + 1, len(top_idx)):
                    co_occ = np.sum((top_words_matrix[:, i] > 0) & (top_words_matrix[:, j] > 0))
                    freq_j = np.sum(top_words_matrix[:, j] > 0)
                    if freq_j > 0:
                        scores.append(np.log((co_occ + 1) / freq_j))
            coherencia_topicos.append(np.mean(scores) if scores else 0)

        coherencia_media = np.mean(coherencia_topicos)
        resultados[k] = {
            'k': k,
            'perplexity': round(perplexity, 2),
            'coherencia_umass': round(coherencia_media, 4),
        }
        print(f"  k={k:2d} | perplexity={perplexity:8.1f} | coherencia={coherencia_media:.4f}")

    return resultados


def generar_reporte(resultados: dict, output_path: str | None):
    """Imprime tabla de resultados y guarda gráfico si matplotlib disponible."""
    print("\n" + "="*55)
    print(f"{'k':>4} | {'Perplexity':>12} | {'Coherencia UMass':>16}")
    print("-"*55)
    for k, r in sorted(resultados.items()):
        print(f"{k:>4} | {r['perplexity']:>12.1f} | {r['coherencia_umass']:>16.4f}")
    print("="*55)

    # k óptimo: maximizar coherencia
    k_opt = max(resultados, key=lambda k: resultados[k]['coherencia_umass'])
    print(f"\n[*] k óptimo sugerido (max coherencia): {k_opt}")
    print(f"    Coherencia: {resultados[k_opt]['coherencia_umass']:.4f}")
    print(f"    Perplexity: {resultados[k_opt]['perplexity']:.1f}")

    # Guardar CSV
    df = pd.DataFrame(list(resultados.values()))
    csv_path = Path(output_path).with_suffix('.csv') if output_path else Path('docs/lda_calibracion.csv')
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(csv_path, index=False)
    print(f"\n[DATA] Resultados guardados en: {csv_path}")

    # Gráfico opcional
    try:
        import matplotlib.pyplot as plt

        fig, ax1 = plt.subplots(figsize=(10, 5))
        ks = sorted(resultados.keys())
        coh = [resultados[k]['coherencia_umass'] for k in ks]
        perp = [resultados[k]['perplexity'] for k in ks]

        ax1.plot(ks, coh, 'b-o', label='Coherencia UMass')
        ax1.set_xlabel('Número de tópicos (k)')
        ax1.set_ylabel('Coherencia UMass', color='b')
        ax1.axvline(x=k_opt, color='green', linestyle='--', alpha=0.7, label=f'k óptimo={k_opt}')

        ax2 = ax1.twinx()
        ax2.plot(ks, perp, 'r--s', label='Perplexity', alpha=0.6)
        ax2.set_ylabel('Perplexity', color='r')

        lines1, labels1 = ax1.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper right')

        plt.title('Calibración LDA — Corpus SaberAsociado\nSistema Análisis Microcurricular')
        plt.tight_layout()

        img_path = output_path or 'docs/lda_calibracion.png'
        plt.savefig(img_path, dpi=150, bbox_inches='tight')
        print(f"[CHART] Gráfico guardado en: {img_path}")
        plt.close()

    except ImportError:
        print("[!]  matplotlib no disponible — solo se guardó el CSV")

    return k_opt


def main():
    parser = argparse.ArgumentParser(description='Calibrar k para LDA sobre corpus curricular')
    parser.add_argument('--k-min', type=int, default=5, help='k mínimo a evaluar (default: 5)')
    parser.add_argument('--k-max', type=int, default=20, help='k máximo a evaluar (default: 20)')
    parser.add_argument('--step', type=int, default=1, help='Paso entre valores de k (default: 1)')
    parser.add_argument('--output', type=str, default=None, help='Ruta del gráfico de salida (.png)')
    args = parser.parse_args()

    k_range = range(args.k_min, args.k_max + 1, args.step)

    from src.topic_modeler import STOPWORDS

    corpus = cargar_corpus()
    if len(corpus) < 20:
        print(f"[X] Corpus insuficiente ({len(corpus)} docs). Mínimo recomendado: 20.")
        sys.exit(1)

    resultados = calcular_coherencia_cv(corpus, k_range, STOPWORDS)
    k_opt = generar_reporte(resultados, args.output)

    print(f"\n[OK] Actualizar N_TOPICS_DEFAULT en src/topic_modeler.py a: {k_opt}")
    print("     Luego re-ejecutar: python run_analysis.py")


if __name__ == '__main__':
    main()
