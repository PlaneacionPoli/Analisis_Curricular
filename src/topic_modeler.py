"""
Modelado de tópicos (LDA) sobre el corpus de SaberAsociado.

Descubre temáticas latentes en el corpus curricular para identificar
familias de conocimiento y agrupaciones temáticas entre programas.
"""

import logging
import re
import unicodedata
from typing import Dict, List
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

logger = logging.getLogger(__name__)

N_TOPICS_DEFAULT = 10
N_TOP_WORDS = 15
STOPWORDS = [
    'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se',
    'no', 'por', 'con', 'su', 'para', 'como', 'estar', 'tener',
    'le', 'lo', 'del', 'las', 'los', 'al', 'una', 'es', 'e', 'o',
    'pero', 'mas', 'este', 'entre', 'porque', 'cuando', 'muy',
    'sin', 'vez', 'mucho', 'saber', 'sobre', 'tambien', 'hasta',
    'hay', 'donde', 'quien', 'desde', 'todos', 'durante', 'uno',
    'les', 'ni', 'contra', 'otros', 'fueron', 'ese', 'eso', 'ante',
    'ellos', 'esto', 'mi', 'antes', 'algunos', 'unos', 'yo',
    'te', 'ti', 'nos', 'cada', 'asi',
]


def _normalizar(texto: str) -> str:
    if pd.isna(texto):
        return ''
    t = unicodedata.normalize('NFKD', str(texto))
    t = t.encode('ascii', 'ignore').decode('ascii')
    t = t.lower().strip()
    t = re.sub(r'[^a-záéíóúñü\s]', ' ', t)
    t = re.sub(r'\s+', ' ', t)
    return t.strip()


def entrenar_lda(
    corpus: List[str],
    n_topics: int = N_TOPICS_DEFAULT,
    n_top_words: int = N_TOP_WORDS
) -> Dict:
    """
    Entrena un modelo LDA sobre el corpus de SaberAsociado.

    Args:
        corpus: Lista de textos (SaberAsociado de todos los programas)
        n_topics: Número de tópicos a extraer
        n_top_words: Palabras por tópico

    Returns:
        Dict con:
        - topics: lista de dicts {topic_id, top_words, weight}
        - topic_distribution: matriz documento → tópico
        - model: modelo LDA entrenado
        - vectorizer: CountVectorizer entrenado
        - feature_names: nombres de las features
    """
    corpus_limpio = [_normalizar(t) for t in corpus if pd.notna(t) and len(str(t)) > 5]

    if len(corpus_limpio) < n_topics:
        logger.warning(
            f"Corpus demasiado pequeño ({len(corpus_limpio)} docs) "
            f"para {n_topics} tópicos, ajustando a {max(2, len(corpus_limpio) // 2)}"
        )
        n_topics = max(2, len(corpus_limpio) // 2)

    if len(corpus_limpio) < 5:
        logger.warning("Corpus insuficiente (<5 docs), no se puede entrenar LDA")
        return {
            'topics': [],
            'topic_distribution': np.array([]),
            'model': None,
            'vectorizer': None,
            'feature_names': []
        }

    vectorizer = CountVectorizer(
        max_features=500,
        min_df=2,
        max_df=0.85,
        stop_words=STOPWORDS,
        ngram_range=(1, 2)
    )

    doc_word = vectorizer.fit_transform(corpus_limpio)
    feature_names = vectorizer.get_feature_names_out()

    lda = LatentDirichletAllocation(
        n_components=n_topics,
        random_state=42,
        max_iter=100,
        learning_method='batch'
    )
    lda.fit(doc_word)

    topics = []
    for topic_idx, topic in enumerate(lda.components_):
        top_indices = topic.argsort()[:-n_top_words - 1:-1]
        top_words = [feature_names[i] for i in top_indices]
        top_weights = [float(topic[i]) for i in top_indices]
        topics.append({
            'topic_id': topic_idx,
            'top_words': top_words,
            'top_weights': top_weights,
            'weight_sum': float(topic.sum())
        })

    topic_distribution = lda.transform(doc_word)

    logger.info(
        f"LDA entrenado: {n_topics} tópicos, "
        f"{len(corpus_limpio)} documentos, "
        f"{len(feature_names)} features"
    )
    return {
        'topics': topics,
        'topic_distribution': topic_distribution,
        'model': lda,
        'vectorizer': vectorizer,
        'feature_names': list(feature_names)
    }


def asignar_topicos_a_programas(
    df_ra: pd.DataFrame,
    n_topics: int = N_TOPICS_DEFAULT
) -> Dict:
    """
    Entrena LDA sobre SaberAsociado y asigna tópicos dominantes a cada programa.

    Args:
        df_ra: DataFrame de resultados de aprendizaje (debe tener SaberAsociado y Programa)
        n_topics: Número de tópicos

    Returns:
        Dict con:
        - topics: lista de tópicos con palabras clave
        - programa_topico: DataFrame programa → tópico dominante
        - programa_dist: DataFrame programa → distribución completa de tópicos
    """
    if 'SaberAsociado' not in df_ra.columns:
        logger.error("Columna 'SaberAsociado' no encontrada")
        return {'topics': [], 'programa_topico': pd.DataFrame(), 'programa_dist': pd.DataFrame()}

    corpus = df_ra['SaberAsociado'].dropna().tolist()
    if len(corpus) < 5:
        logger.warning("Pocos documentos, no se puede entrenar LDA")
        return {'topics': [], 'programa_topico': pd.DataFrame(), 'programa_dist': pd.DataFrame()}

    resultado = entrenar_lda(corpus, n_topics=n_topics)
    if resultado['model'] is None:
        return {'topics': [], 'programa_topico': pd.DataFrame(), 'programa_dist': pd.DataFrame()}

    dist = resultado['topic_distribution']
    programas = df_ra['Programa'].values if 'Programa' in df_ra.columns else [f'Doc_{i}' for i in range(len(corpus))]

    rows_dist = []
    rows_topico = []
    for i, prog in enumerate(programas):
        if i >= dist.shape[0]:
            break
        dist_row = {'programa': prog}
        for t in range(dist.shape[1]):
            dist_row[f'topico_{t}'] = round(float(dist[i, t]), 4)
        rows_dist.append(dist_row)

        topico_dom = int(dist[i].argmax())
        confianza = float(dist[i].max())
        rows_topico.append({
            'programa': prog,
            'topico_dominante': topico_dom,
            'confianza': round(confianza, 4)
        })

    df_dist = pd.DataFrame(rows_dist) if rows_dist else pd.DataFrame()
    df_topico = pd.DataFrame(rows_topico) if rows_topico else pd.DataFrame()

    return {
        'topics': resultado['topics'],
        'programa_topico': df_topico,
        'programa_dist': df_dist
    }


def obtener_fingerprint_tfidf(df_ra: pd.DataFrame, n_terms: int = 10) -> pd.DataFrame:
    """
    Calcula el fingerprint TF-IDF de cada programa (términos únicos).

    Args:
        df_ra: DataFrame con SaberAsociado y Programa
        n_terms: Términos por programa

    Returns:
        DataFrame con programa y sus términos más distintivos
    """
    if 'SaberAsociado' not in df_ra.columns or 'Programa' not in df_ra.columns:
        return pd.DataFrame()

    from sklearn.feature_extraction.text import TfidfVectorizer

    programas = df_ra['Programa'].unique()
    corpus_por_programa = {}
    for prog in programas:
        textos = df_ra[df_ra['Programa'] == prog]['SaberAsociado'].dropna()
        texto = ' '.join([_normalizar(t) for t in textos if pd.notna(t)])
        if len(texto) > 10:
            corpus_por_programa[prog] = texto

    if len(corpus_por_programa) < 2:
        return pd.DataFrame()

    prog_names = list(corpus_por_programa.keys())
    textos = [corpus_por_programa[p] for p in prog_names]

    vectorizer = TfidfVectorizer(
        max_features=200, min_df=1, max_df=0.85,
        stop_words=STOPWORDS, ngram_range=(1, 2)
    )
    tfidf = vectorizer.fit_transform(textos)
    features = vectorizer.get_feature_names_out()

    rows = []
    for i, prog in enumerate(prog_names):
        row = tfidf[i].toarray()[0]
        top_idx = row.argsort()[-n_terms:][::-1]
        terms = [features[j] for j in top_idx if row[j] > 0]
        rows.append({'programa': prog, 'terminos_distintivos': ', '.join(terms[:n_terms])})

    return pd.DataFrame(rows)


if __name__ == '__main__':
    print("Módulo de Topic Modeling (LDA + Fingerprint TF-IDF)")
