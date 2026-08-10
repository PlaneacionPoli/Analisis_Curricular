"""
Análisis de asignaturas compartidas y divergencia inter-sede.

Orden de análisis:
1. Intra-sede: mismo programa en distintas sedes (PBOG vs HMED vs VNAL)
2. Inter-programa: programas distintos vs otros programas
3. Asignaturas con nombre exacto idéntico
"""

import logging
import re
import unicodedata
from typing import Dict
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))


logger = logging.getLogger(__name__)

UMBRAL_IDENTICO = 0.95
UMBRAL_SIMILAR = 0.60
COLUMNAS_CONTENIDO = [
    'Nombre asignatura o módulo',
    'Indicadores de logro asignatura o módulo',
    'Núcleos temáticos',
    'Resultado de aprendizaje'
]


def _normalizar(texto: str) -> str:
    if pd.isna(texto):
        return ''
    t = unicodedata.normalize('NFKD', str(texto))
    t = t.encode('ascii', 'ignore').decode('ascii')
    t = t.lower().strip()
    t = re.sub(r'\s+', ' ', t)
    return t


def _extraer_texto_asignatura(row: pd.Series) -> str:
    """
    Concatena columnas de contenido de una fila en un solo texto
    para calcular similitud.
    """
    partes = []
    for col in COLUMNAS_CONTENIDO[1:]:
        val = row.get(col, '')
        if pd.notna(val) and str(val).strip() and str(val) != 'nan':
            partes.append(_normalizar(str(val)))
    return ' '.join(partes)


def _buscar_columna(df: pd.DataFrame, target: str):
    """Busca columna por nombre normalizado."""
    target_norm = _normalizar(target).replace(' ', '')
    for col in df.columns:
        col_norm = _normalizar(col).replace(' ', '')
        if col_norm == target_norm:
            return col
    return None


def detectar_asignaturas_identicas(df: pd.DataFrame) -> pd.DataFrame:
    """
    Encuentra asignaturas con el mismo nombre exacto en múltiples
    programas o sedes.

    Args:
        df: DataFrame consolidado con columnas Programa, Sede,
            Nombre asignatura o módulo

    Returns:
        DataFrame con columnas: nombre_asignatura, programas (lista),
            sedes (lista), num_programas
    """
    asig_col = _buscar_columna(df, 'Nombre asignatura o módulo')
    if asig_col is None:
        logger.warning("Columna 'Nombre asignatura o módulo' no encontrada")
        return pd.DataFrame()

    df = df.copy()
    df[asig_col] = df[asig_col].astype(str).str.strip()

    agrupado = (
        df.groupby(asig_col)
        .agg(
            programas=('Programa', lambda x: list(dict.fromkeys(x))),
            sedes=('Sede', lambda x: list(dict.fromkeys(x))),
            conteo_programas=('Programa', 'nunique'),
            conteo_sedes=('Sede', 'nunique')
        )
        .reset_index()
    )

    multiples_programas = agrupado[agrupado['conteo_programas'] > 1].copy()
    multiples_programas = multiples_programas.sort_values('conteo_programas', ascending=False)
    multiples_programas.rename(columns={asig_col: 'nombre_asignatura'}, inplace=True)

    logger.info(
        f"Asignaturas idénticas: {len(multiples_programas)} "
        f"compartidas entre múltiples programas"
    )
    return multiples_programas


def comparar_intra_sede(df: pd.DataFrame) -> pd.DataFrame:
    """
    PASO 1: Compara el mismo programa en distintas sedes.
    Calcula similitud coseno entre asignaturas del mismo programa
    base pero en distintas sedes.

    Args:
        df: DataFrame consolidado con todos los programas

    Returns:
        DataFrame con pares (programa, sede_a, sede_b, similitud, n_asignaturas_compartidas)
    """
    asig_col = _buscar_columna(df, 'Nombre asignatura o módulo')
    if asig_col is None:
        return pd.DataFrame()

    programas = df.groupby('Programa')
    resultados = []

    for prog_name, grupo in programas:
        sedes = grupo['Sede'].dropna().unique()
        if len(sedes) < 2:
            continue

        for i in range(len(sedes)):
            for j in range(i + 1, len(sedes)):
                    sede_a, sede_b = sedes[i], sedes[j]
                    grupo_a = grupo[grupo['Sede'] == sede_a]
                    grupo_b = grupo[grupo['Sede'] == sede_b]

                    asignaturas_a = set(
                        grupo_a[asig_col].dropna().astype(str).str.strip()
                    )
                    asignaturas_b = set(
                        grupo_b[asig_col].dropna().astype(str).str.strip()
                    )

                    compartidos = asignaturas_a & asignaturas_b
                    union = asignaturas_a | asignaturas_b
                    jaccard = len(compartidos) / len(union) if union else 0

                    textos_a = [_extraer_texto_asignatura(row)
                                for _, row in grupo_a.iterrows()]
                    textos_b = [_extraer_texto_asignatura(row)
                                for _, row in grupo_b.iterrows()]

                    similitud_semantica = 0.0
                    if textos_a and textos_b:
                        corpus = textos_a + textos_b
                        try:
                            vectorizer = TfidfVectorizer(
                                max_features=200, min_df=1, max_df=0.9,
                                ngram_range=(1, 2)
                            )
                            tfidf = vectorizer.fit_transform(corpus)
                            n_a = len(textos_a)
                            sim = cosine_similarity(
                                tfidf[:n_a], tfidf[n_a:]
                            )
                            similitud_semantica = float(sim.max())
                        except Exception:
                            pass

                    resultados.append({
                        'programa': prog_name,
                        'sede_a': sede_a,
                        'sede_b': sede_b,
                        'codigo_a': grupo_a['Codigo'].iloc[0] if 'Codigo' in grupo_a.columns else '',
                        'codigo_b': grupo_b['Codigo'].iloc[0] if 'Codigo' in grupo_b.columns else '',
                        'asignaturas_a': len(asignaturas_a),
                        'asignaturas_b': len(asignaturas_b),
                        'asignaturas_compartidas': len(compartidos),
                        'jaccard_similitud': round(jaccard, 4),
                        'similitud_semantica_max': round(similitud_semantica, 4),
                        'n_asignaturas_a': len(grupo_a),
                        'n_asignaturas_b': len(grupo_b)
                    })

    df_resultado = pd.DataFrame(resultados)
    if not df_resultado.empty:
        df_resultado = df_resultado.sort_values(
            'similitud_semantica_max', ascending=False
        )
    logger.info(
        f"Intra-sede: {len(df_resultado)} pares de sedes comparados "
        f"para {df_resultado['programa'].nunique() if not df_resultado.empty else 0} programas"
    )
    return df_resultado


def comparar_inter_programa(
    df: pd.DataFrame,
    umbral_identico: float = UMBRAL_IDENTICO,
    umbral_similar: float = UMBRAL_SIMILAR,
    max_asignaturas: int = 500
) -> pd.DataFrame:
    """
    PASO 2: Compara asignaturas entre programas distintos.
    Encuentra pares con similitud >= umbral_similar.

    Para conjuntos grandes (> max_asignaturas) toma una muestra
    estratificada por programa para limitar el tiempo de cómputo O(n²).

    Args:
        df: DataFrame consolidado
        umbral_identico: Similitud para considerar idéntico (0.95)
        umbral_similar: Similitud mínima para reportar (0.60)
        max_asignaturas: Máximo de asignaturas a comparar (default 500)

    Returns:
        DataFrame con pares inter-programa, similitud y recomendación
    """
    asig_col = _buscar_columna(df, 'Nombre asignatura o módulo')
    if asig_col is None:
        return pd.DataFrame()

    programas = df['Programa'].unique()
    if len(programas) < 2:
        logger.warning("Se requieren al menos 2 programas para comparación inter-programa")
        return pd.DataFrame()

    todas_asignaturas = []
    for prog in programas:
        sub = df[df['Programa'] == prog]
        for _, row in sub.iterrows():
            txt = _extraer_texto_asignatura(row)
            nombre_asig = str(row.get(asig_col, '')).strip()
            if nombre_asig and nombre_asig != 'nan' and len(txt) > 5:
                todas_asignaturas.append({
                    'programa': prog,
                    'sede': row.get('Sede', ''),
                    'asignatura': nombre_asig,
                    'texto': txt
                })

    if len(todas_asignaturas) < 3:
        logger.warning("Muy pocas asignaturas con texto para comparar")
        return pd.DataFrame()

        # Muestrear si hay demasiadas asignaturas (O(n²) protección)
    if len(todas_asignaturas) > max_asignaturas:
        logger.warning(
            f"{len(todas_asignaturas)} asignaturas excede el límite de {max_asignaturas}, "
            f"muestreando estratificado por programa"
        )
        df_temp = pd.DataFrame(todas_asignaturas)
        muestreadas = []
        n_por_programa = max(1, max_asignaturas // len(programas))
        for prog in programas:
            sub = df_temp[df_temp['programa'] == prog]
            if len(sub) > n_por_programa:
                sub = sub.sample(n=n_por_programa, random_state=42)
            muestreadas.append(sub)
        todas_asignaturas = pd.concat(muestreadas, ignore_index=True).to_dict('records')
        logger.info(f"Muestra reducida a {len(todas_asignaturas)} asignaturas")

    df_asigs = pd.DataFrame(todas_asignaturas)

    try:
        vectorizer = TfidfVectorizer(
            max_features=300, min_df=1, max_df=0.85,
            ngram_range=(1, 2),
            stop_words=['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un',
                        'ser', 'se', 'no', 'por', 'con', 'su', 'para',
                        'como', 'del', 'las', 'los', 'al', 'una']
        )
        tfidf = vectorizer.fit_transform(df_asigs['texto'])
        sim_matrix = cosine_similarity(tfidf)
    except Exception as e:
        logger.error(f"Error vectorizando: {e}")
        return pd.DataFrame()

    pares = []
    n = len(df_asigs)
    for i in range(n):
        for j in range(i + 1, n):
            if df_asigs.iloc[i]['programa'] == df_asigs.iloc[j]['programa']:
                continue
            sim = float(sim_matrix[i, j])
            if sim >= umbral_similar:
                pares.append({
                    'programa_a': df_asigs.iloc[i]['programa'],
                    'sede_a': df_asigs.iloc[i]['sede'],
                    'asignatura_a': df_asigs.iloc[i]['asignatura'],
                    'programa_b': df_asigs.iloc[j]['programa'],
                    'sede_b': df_asigs.iloc[j]['sede'],
                    'asignatura_b': df_asigs.iloc[j]['asignatura'],
                    'similitud': round(sim, 4)
                })

    df_pares = pd.DataFrame(pares)
    if df_pares.empty:
        logger.info("No se encontraron pares similares entre programas")
        return df_pares

    df_pares['categoria'] = df_pares['similitud'].apply(
        lambda s: 'IDENTICO' if s >= umbral_identico else 'SIMILAR'
    )
    df_pares = df_pares.sort_values('similitud', ascending=False)

    logger.info(
        f"Inter-programa: {len(df_pares)} pares encontrados "
        f"({(df_pares['categoria']=='IDENTICO').sum()} idénticos, "
        f"{(df_pares['categoria']=='SIMILAR').sum()} similares)"
    )
    return df_pares


def generar_recomendaciones(df_pares: pd.DataFrame) -> pd.DataFrame:
    """
    Genera recomendaciones para cada par de asignaturas similares.

    Args:
        df_pares: DataFrame de salida de comparar_inter_programa()

    Returns:
        DataFrame con columna adicional 'recomendacion'
    """
    if df_pares.empty:
        return df_pares

    df = df_pares.copy()

    def _recomendar(row):
        sim = row['similitud']
        if sim >= 0.95:
            return 'UNIFICAR'
        elif sim >= 0.80:
            return 'HOMOLOGAR'
        else:
            return 'COORDINAR'

    df['recomendacion'] = df.apply(_recomendar, axis=1)
    return df


def detectar_asignaturas_compartidas(df: pd.DataFrame) -> Dict:
    """
    Ejecuta el pipeline completo de detección de asignaturas compartidas.

    Args:
        df: DataFrame consolidado de estrategias_micro de todos los programas
            Debe contener columnas: Programa, Sede, Codigo,
            Nombre asignatura o módulo, y las columnas de contenido

    Returns:
        Dict con estructura:
        {
            'intra_sede': DataFrame con pares intra-sede,
            'inter_programa': DataFrame con pares inter-programa + recomendaciones,
            'asignaturas_identicas': DataFrame con nombres idénticos,
            'resumen': dict con métricas globales
        }
    """
    if df.empty:
        logger.warning("DataFrame vacío, no se puede ejecutar análisis")
        return {
            'intra_sede': pd.DataFrame(),
            'inter_programa': pd.DataFrame(),
            'asignaturas_identicas': pd.DataFrame(),
            'resumen': {
                'total_programas': 0,
                'programas_multi_sede': 0,
                'pares_intra_sede': 0,
                'pares_inter_programa': 0,
                'asignaturas_identicas': 0
            }
        }

    asig_col = _buscar_columna(df, 'Nombre asignatura o módulo')
    if asig_col is None:
        logger.error("Columna 'Nombre asignatura o módulo' no encontrada")
        return {'intra_sede': pd.DataFrame(), 'inter_programa': pd.DataFrame(),
                'asignaturas_identicas': pd.DataFrame(), 'resumen': {}}

    logger.info("Iniciando detección de asignaturas compartidas")

    # PASO 1: Intra-sede
    logger.info("PASO 1: Comparación intra-sede (mismo programa, distintas sedes)")
    df_intra = comparar_intra_sede(df)

    # PASO 2: Inter-programa
    logger.info("PASO 2: Comparación inter-programa")
    df_inter = comparar_inter_programa(df)
    df_inter = generar_recomendaciones(df_inter)

    # Asignaturas idénticas
    df_identicas = detectar_asignaturas_identicas(df)

    n_programas = df['Programa'].nunique()
    programas_multi = df_intra['programa'].nunique() if not df_intra.empty else 0

    resumen = {
        'total_programas': n_programas,
        'programas_multi_sede': programas_multi,
        'pares_intra_sede': len(df_intra),
        'pares_inter_programa': len(df_inter),
        'pares_inter_identicos': len(df_inter[df_inter['categoria'] == 'IDENTICO']) if not df_inter.empty else 0,
        'asignaturas_identicas': len(df_identicas)
    }

    logger.info(f"Análisis completado: {resumen}")
    return {
        'intra_sede': df_intra,
        'inter_programa': df_inter,
        'asignaturas_identicas': df_identicas,
        'resumen': resumen
    }


if __name__ == '__main__':
    print("Módulo de Análisis de Asignaturas Compartidas e Inter-Sede")
    print("Ejecutar desde run_analysis.py para uso completo.")
