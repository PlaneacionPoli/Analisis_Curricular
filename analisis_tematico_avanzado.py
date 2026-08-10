"""
ANALISIS TEMATICO AVANZADO - Estrategias Microcurriculares

Este script implementa 3 analisis profundos:
1. Cobertura y Densidad Tematica
2. Alineacion con Tendencias Globales (personalizable)
3. Mineria de Texto y Analisis Semantico

Autor: Sistema de Analisis Curricular
Fecha: 2026-02-10
"""

# Cuando Streamlit Cloud ejecuta este archivo como app principal,
# redirigir al dashboard interactivo real.
import sys as _sys
if any('streamlit' in _arg for _arg in _sys.argv):
    from dashboard_tematico import main as _dash_main
    _dash_main()
    _sys.exit(0)

from pathlib import Path
from datetime import datetime
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from collections import Counter
import re
import json
import unicodedata
from typing import Dict, List, Tuple
import warnings
warnings.filterwarnings('ignore')

# Para NLP
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
from scipy.cluster.hierarchy import dendrogram, linkage
from scipy.stats import entropy

# Configuracion de visualizaciones
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")
plt.rcParams['figure.dpi'] = 300
plt.rcParams['font.size'] = 9
plt.rcParams['axes.titlesize'] = 11
plt.rcParams['axes.labelsize'] = 9


# ============================================================================
# CONFIGURACION DE TENDENCIAS GLOBALES (Personalizable)
# ============================================================================

TENDENCIAS_GLOBALES = {
    "SOSTENIBILIDAD": {
        "keywords": [
            "sostenibilidad", "sostenible", "desarrollo sostenible",
            "ODS", "objetivos desarrollo", "medio ambiente", "ambiental",
            "ecologia", "verde", "cambio climatico", "huella carbono",
            "economia circular", "recursos naturales",
            "consumo responsable", "energias renovables", "eficiencia energetica",
            "movilidad sostenible", "agua", "biodiversidad",
            "innovacion social", "desarrollo comunitario", "responsabilidad social"
        ],
        "color": "#2ECC71",
        "descripcion": "Sostenibilidad y Desarrollo Sostenible (ODS)"
    },
    "INTELIGENCIA_ARTIFICIAL": {
        "keywords": [
            "inteligencia artificial", "IA", "machine learning", "aprendizaje automatico",
            "deep learning", "redes neuronales", "algoritmos", "big data",
            "data science", "ciencia datos", "analytics", "mineria datos",
            "chatbot", "NLP", "vision artificial"
        ],
        "color": "#3498DB",
        "descripcion": "Inteligencia Artificial y Tecnologias Emergentes"
    },
    "TRANSFORMACION_DIGITAL": {
        "keywords": [
            "transformacion digital", "digitalizacion", "digital",
            "industria 4.0", "automatizacion", "robotica",
            "internet cosas", "IoT", "cloud computing", "nube",
            "ciberseguridad", "blockchain", "tecnologia"
        ],
        "color": "#9B59B6",
        "descripcion": "Transformacion Digital e Industria 4.0"
    },
    "INNOVACION": {
        "keywords": [
            "innovacion", "innovar", "emprendimiento", "emprender",
            "startup", "creatividad", "disrupcion", "disruptivo",
            "Design thinking", "lean", "agil", "prototipo"
        ],
        "color": "#E74C3C",
        "descripcion": "Innovacion y Emprendimiento"
    },
    "ETICA": {
        "keywords": [
            "etica", "valores", "responsabilidad social", "RSE", "RSC",
            "deontologia", "codigo etico", "integridad",
            "transparencia", "buen gobierno", "compliance"
        ],
        "color": "#F39C12",
        "descripcion": "Etica, Valores y Responsabilidad Social"
    },
    "GLOBALIZACION": {
        "keywords": [
            "globalizacion", "global", "internacional", "glocal",
            "interculturalidad", "multicultural", "diversidad cultural",
            "comercio internacional", "exportacion", "importacion"
        ],
        "color": "#1ABC9C",
        "descripcion": "Globalizacion y Perspectiva Glocal"
    },
    "LIDERAZGO": {
        "keywords": [
            "liderazgo", "trabajo equipo", "colaborativo", "comunicacion",
            "habilidades blandas", "soft skills", "gestion personas",
            "talento humano", "coaching", "mentoring", "negociacion"
        ],
        "color": "#E67E22",
        "descripcion": "Liderazgo y Habilidades Blandas"
    },
    "ANALISIS_DATOS": {
        "keywords": [
            "analisis datos", "estadistica", "data analytics",
            "visualizacion datos", "business intelligence", "BI",
            "dashboard", "metricas", "KPI", "indicadores",
            "toma decisiones basada datos"
        ],
        "color": "#16A085",
        "descripcion": "Analisis de Datos y Business Intelligence"
    },
    "GESTION_CAMBIO": {
        "keywords": [
            "gestion cambio", "adaptabilidad", "resiliencia",
            "agilidad organizacional", "transformacion organizacional",
            "cultura organizacional", "cambio organizacional"
        ],
        "color": "#8E44AD",
        "descripcion": "Gestion del Cambio y Adaptabilidad"
    },
    "CALIDAD": {
        "keywords": [
            "calidad", "mejora continua", "excelencia",
            "ISO", "normas", "estandares", "certificacion",
            "auditoria", "procesos", "eficiencia", "productividad"
        ],
        "color": "#27AE60",
        "descripcion": "Calidad y Mejora Continua"
    }
}


# ============================================================================
# FUNCIONES DE CARGA Y PREPARACION DE DATOS
# ============================================================================

def cargar_tendencias_personalizadas(config_path: Path = None) -> Dict:
    """Carga tendencias desde archivo JSON o usa las predefinidas."""
    if config_path is None:
        config_path = Path("config_tendencias.json")

    if config_path.exists():
        print(f"[*] Cargando tendencias desde: {config_path}")
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                tendencias = config.get('TENDENCIAS_GLOBALES', TENDENCIAS_GLOBALES)
                print(f"    [OK] {len(tendencias)} tendencias cargadas desde JSON\n")
                return tendencias
        except Exception as e:
            print(f"    [!] Error al cargar JSON: {e}")
            print(f"    [*] Usando tendencias predefinidas\n")
            return TENDENCIAS_GLOBALES
    else:
        print(f"[*] Usando tendencias predefinidas ({len(TENDENCIAS_GLOBALES)} tendencias)\n")
        return TENDENCIAS_GLOBALES


def normalizar_columnas(df: pd.DataFrame) -> pd.DataFrame:
    """Normaliza nombres de columnas eliminando tildes y caracteres especiales."""
    nuevos_nombres = {}
    for col in df.columns:
        # Descomponer Unicode y eliminar acentos
        nfkd = unicodedata.normalize('NFKD', str(col))
        sin_acentos = ''.join(c for c in nfkd if not unicodedata.combining(c))
        nuevos_nombres[col] = sin_acentos
    df = df.rename(columns=nuevos_nombres)
    return df


def cargar_datos_consolidados(input_folder: Path) -> pd.DataFrame:
    """Carga y consolida datos de Paso 5 de todos los programas."""
    print("\n" + "="*70)
    print("CARGANDO DATOS DE ESTRATEGIAS MICROCURRICULARES")
    print("="*70 + "\n")

    all_data = []
    archivos = list(input_folder.glob("*.xlsx"))

    if not archivos:
        print(f"[!] No se encontraron archivos .xlsx en {input_folder}")
        return pd.DataFrame()

    print(f"Archivos encontrados: {len(archivos)}\n")

    for archivo in archivos:
        programa_nombre = archivo.stem.replace("FormatoRA_", "").replace("_PBOG", "")
        print(f"  [*] Procesando: {programa_nombre}...")

        try:
            df = pd.read_excel(archivo, sheet_name='Paso 5 Estrategias micro', header=1)
            df = normalizar_columnas(df)
            df['Programa'] = programa_nombre
            all_data.append(df)
            print(f"      Registros: {len(df)}")
        except Exception as e:
            print(f"  [X] Error: {str(e)}\n")

    # Consolidar
    df_consolidado = pd.concat(all_data, ignore_index=True)

    print("\n" + "="*70)
    print(f"TOTAL ANTES DE FILTRAR: {len(df_consolidado)} registros de {len(all_data)} programas")

    # FILTRAR: Excluir filas donde "Tipo de Saber" este vacio
    registros_antes = len(df_consolidado)
    df_consolidado = df_consolidado[df_consolidado['Tipo de Saber'].notna()]
    df_consolidado = df_consolidado[df_consolidado['Tipo de Saber'].astype(str).str.strip() != '']
    registros_despues = len(df_consolidado)
    registros_eliminados = registros_antes - registros_despues

    print(f"Registros con 'Tipo de Saber' vacio eliminados: {registros_eliminados}")

    # NORMALIZAR
    normalizacion_map = {
        'saber': 'Saber',
        'saberhacer': 'SaberHacer',
        'saberser': 'SaberSer',
        'Saber': 'Saber',
        'SaberHacer': 'SaberHacer',
        'SaberSer': 'SaberSer',
        'Saberhacer': 'SaberHacer',
        'Saberser': 'SaberSer'
    }

    df_consolidado['Tipo de Saber'] = df_consolidado['Tipo de Saber'].astype(str).str.strip().map(
        lambda x: normalizacion_map.get(x, x)
    )

    print(f"Valores normalizados en 'Tipo de Saber'")
    print(f"TOTAL DESPUES DE FILTRAR: {registros_despues} registros")
    print("="*70 + "\n")

    return df_consolidado


def preparar_textos(df: pd.DataFrame) -> pd.DataFrame:
    """Prepara campos de texto para analisis NLP."""
    print("\n[*] PREPARANDO TEXTOS PARA ANALISIS NLP...")

    # Crear campo combinado con todos los textos
    df['Texto_Completo'] = (
        df['Resultado de aprendizaje'].fillna('') + ' ' +
        df['Nombre asignatura o modulo'].fillna('') + ' ' +
        df['Indicadores de logro asignatura o modulo'].fillna('') + ' ' +
        df['Nucleos tematicos'].fillna('')
    )

    # Limpiar textos
    df['Texto_Completo'] = df['Texto_Completo'].str.lower()
    df['Texto_Completo'] = df['Texto_Completo'].str.strip()

    # Estadisticas
    total_palabras = df['Texto_Completo'].str.split().str.len().sum()
    promedio_palabras = df['Texto_Completo'].str.split().str.len().mean()

    print(f"    Total palabras: {total_palabras:,}")
    print(f"    Promedio palabras/registro: {promedio_palabras:.1f}")
    print(f"    [OK] Textos preparados\n")

    return df


# ============================================================================
# ANALISIS 1: COBERTURA Y DENSIDAD TEMATICA
# ============================================================================

def analisis_cobertura_tematica(df: pd.DataFrame) -> Dict:
    """Analiza cobertura y densidad de nucleos tematicos."""
    print("\n" + "="*70)
    print("ANALISIS 1: COBERTURA Y DENSIDAD TEMATICA")
    print("="*70 + "\n")

    resultados = {}

    # 1.1 Extraer nucleos tematicos unicos
    print("[1.1] Extrayendo nucleos tematicos...")

    nucleos_list = []
    for idx, row in df.iterrows():
        nucleos_raw = str(row['Nucleos tematicos'])
        if nucleos_raw and nucleos_raw != 'nan':
            # Separar por coma, punto y coma, salto de linea
            nucleos = re.split(r'[,;\n]+', nucleos_raw)
            nucleos = [n.strip() for n in nucleos if n.strip() and len(n.strip()) > 3]
            nucleos_list.extend(nucleos)

    # Frecuencia de nucleos
    nucleos_counter = Counter(nucleos_list)
    total_nucleos_unicos = len(nucleos_counter)
    total_menciones = sum(nucleos_counter.values())

    print(f"    Nucleos tematicos unicos: {total_nucleos_unicos}")
    print(f"    Total menciones: {total_menciones}")
    print(f"    Promedio menciones/nucleo: {total_menciones/max(total_nucleos_unicos, 1):.1f}")

    resultados['nucleos_unicos'] = total_nucleos_unicos
    resultados['total_menciones'] = total_menciones
    resultados['top_nucleos'] = dict(nucleos_counter.most_common(30))

    # 1.2 Densidad tematica por asignatura
    print("\n[1.2] Calculando densidad tematica por asignatura...")

    densidad_por_asignatura = df.groupby('Nombre asignatura o modulo')['Nucleos tematicos'].apply(
        lambda x: len(re.split(r'[,;\n]+', ' '.join(x.fillna('').astype(str))))
    ).sort_values(ascending=False)

    promedio_densidad = densidad_por_asignatura.mean()

    print(f"    Promedio nucleos/asignatura: {promedio_densidad:.1f}")
    print(f"    Asignatura mas densa: {densidad_por_asignatura.index[0]} ({densidad_por_asignatura.iloc[0]} nucleos)")
    print(f"    Asignatura menos densa: {densidad_por_asignatura.index[-1]} ({densidad_por_asignatura.iloc[-1]} nucleos)")

    resultados['densidad_por_asignatura'] = densidad_por_asignatura.to_dict()
    resultados['promedio_densidad'] = promedio_densidad

    # 1.3 Indice de diversidad tematica (Shannon entropy)
    print("\n[1.3] Calculando indice de diversidad (Shannon)...")

    frecuencias = np.array(list(nucleos_counter.values()))
    probabilidades = frecuencias / frecuencias.sum()
    shannon_entropy = entropy(probabilidades, base=2)

    # Normalizar entre 0-100
    max_entropy = np.log2(len(nucleos_counter))
    indice_diversidad = (shannon_entropy / max_entropy) * 100

    print(f"    Shannon Entropy: {shannon_entropy:.2f}")
    print(f"    Indice de Diversidad: {indice_diversidad:.1f}/100")

    resultados['shannon_entropy'] = shannon_entropy
    resultados['indice_diversidad'] = indice_diversidad

    # 1.4 Matriz Programa x Nucleo Tematico (Top 20)
    print("\n[1.4] Creando matriz Programa x Nucleo Tematico...")

    top_20_nucleos = [n for n, _ in nucleos_counter.most_common(20)]
    matriz_cobertura = pd.DataFrame(0,
                                    index=df['Programa'].unique(),
                                    columns=top_20_nucleos)

    for idx, row in df.iterrows():
        programa = row['Programa']
        nucleos_raw = str(row['Nucleos tematicos'])
        if nucleos_raw and nucleos_raw != 'nan':
            nucleos = re.split(r'[,;\n]+', nucleos_raw)
            nucleos = [n.strip() for n in nucleos if n.strip()]
            for nucleo in nucleos:
                if nucleo in top_20_nucleos:
                    matriz_cobertura.loc[programa, nucleo] += 1

    resultados['matriz_cobertura'] = matriz_cobertura

    print(f"    [OK] Matriz creada: {matriz_cobertura.shape}")

    return resultados


# ============================================================================
# ANALISIS 2: ALINEACION CON TENDENCIAS GLOBALES
# ============================================================================

def analisis_tendencias_globales(df: pd.DataFrame, tendencias: Dict = TENDENCIAS_GLOBALES) -> Dict:
    """Detecta presencia de tendencias globales en los programas."""
    print("\n" + "="*70)
    print("ANALISIS 2: ALINEACION CON TENDENCIAS GLOBALES")
    print("="*70 + "\n")

    print(f"[*] Tendencias a detectar: {len(tendencias)}\n")

    resultados = {}

    # Matriz: Programa x Tendencia
    programas = df['Programa'].unique()
    matriz_tendencias = pd.DataFrame(0, index=programas, columns=list(tendencias.keys()))

    # Detalle: Tendencia -> Programa -> campos donde aparece
    detalle_tendencias = {t: {p: [] for p in programas} for t in tendencias.keys()}

    # Buscar en cada registro
    for idx, row in df.iterrows():
        programa = row['Programa']
        texto_completo = row['Texto_Completo'].lower()

        for tendencia_id, tendencia_info in tendencias.items():
            keywords = tendencia_info['keywords']

            # Buscar keywords
            for keyword in keywords:
                if keyword.lower() in texto_completo:
                    matriz_tendencias.loc[programa, tendencia_id] += 1

                    # Identificar en que campo aparece
                    campos = []
                    if keyword.lower() in str(row['Resultado de aprendizaje']).lower():
                        campos.append('RA')
                    if keyword.lower() in str(row['Nucleos tematicos']).lower():
                        campos.append('Nucleos')
                    if keyword.lower() in str(row['Indicadores de logro asignatura o modulo']).lower():
                        campos.append('Indicadores')

                    if campos:
                        detalle_tendencias[tendencia_id][programa].append({
                            'keyword': keyword,
                            'campos': campos,
                            'asignatura': row['Nombre asignatura o modulo']
                        })
                    break  # Solo contar una vez por registro

    # Calcular % cobertura (presencia/ausencia)
    cobertura_tendencias = (matriz_tendencias > 0).sum(axis=0)
    total_programas = len(programas)

    print("[*] RESULTADOS POR TENDENCIA:\n")
    for tendencia_id, tendencia_info in tendencias.items():
        programas_con_tendencia = cobertura_tendencias[tendencia_id]
        porcentaje = (programas_con_tendencia / total_programas) * 100
        menciones = matriz_tendencias[tendencia_id].sum()

        print(f"  {tendencia_info['descripcion']}")
        print(f"    Programas: {programas_con_tendencia}/{total_programas} ({porcentaje:.1f}%)")
        print(f"    Menciones: {menciones}")
        print()

    resultados['matriz_tendencias'] = matriz_tendencias
    resultados['cobertura_porcentaje'] = (cobertura_tendencias / total_programas * 100).to_dict()
    resultados['detalle_tendencias'] = detalle_tendencias

    # Identificar brechas (tendencias ausentes)
    tendencias_ausentes = matriz_tendencias.sum(axis=0)[matriz_tendencias.sum(axis=0) == 0]

    if len(tendencias_ausentes) > 0:
        print("[!] TENDENCIAS NO DETECTADAS EN NINGUN PROGRAMA:")
        for tend in tendencias_ausentes.index:
            print(f"    - {tendencias[tend]['descripcion']}")
    else:
        print("[OK] Todas las tendencias estan presentes en al menos un programa")

    resultados['tendencias_ausentes'] = list(tendencias_ausentes.index)

    return resultados


# ============================================================================
# ANALISIS 3: MINERIA DE TEXTO Y ANALISIS SEMANTICO
# ============================================================================

def analisis_mineria_texto(df: pd.DataFrame) -> Dict:
    """Analisis semantico y mineria de texto con TF-IDF."""
    print("\n" + "="*70)
    print("ANALISIS 3: MINERIA DE TEXTO Y ANALISIS SEMANTICO")
    print("="*70 + "\n")

    resultados = {}

    # 3.1 TF-IDF Global
    print("[3.1] Calculando TF-IDF global...")

    # Stopwords en espanol
    stopwords_es = set([
        'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber',
        'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo', 'todo',
        'pero', 'mas', 'hacer', 'o', 'poder', 'decir', 'este', 'ir', 'otro', 'ese',
        'la', 'si', 'me', 'ya', 'ver', 'porque', 'dar', 'cuando', 'muy', 'sin',
        'vez', 'mucho', 'saber', 'que', 'sobre', 'tambien', 'me', 'hasta', 'hay',
        'donde', 'quien', 'desde', 'todos', 'durante', 'todos', 'uno', 'les', 'ni',
        'contra', 'otros', 'fueron', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto',
        'mi', 'antes', 'algunos', 'que', 'unos', 'yo', 'del', 'las', 'los', 'al'
    ])

    vectorizer = TfidfVectorizer(
        max_features=100,
        min_df=2,
        max_df=0.8,
        stop_words=list(stopwords_es),
        ngram_range=(1, 3)
    )

    tfidf_matrix = vectorizer.fit_transform(df['Texto_Completo'])
    feature_names = vectorizer.get_feature_names_out()

    # Top terminos globales
    tfidf_sum = tfidf_matrix.sum(axis=0).A1
    top_indices = tfidf_sum.argsort()[::-1][:30]
    top_terminos = [(feature_names[i], tfidf_sum[i]) for i in top_indices]

    print(f"    Terminos clave extraidos: {len(feature_names)}")
    print(f"    Top 10 terminos (TF-IDF):")
    for termino, score in top_terminos[:10]:
        print(f"      - {termino}: {score:.3f}")

    resultados['top_terminos_global'] = dict(top_terminos)

    # 3.2 TF-IDF por Programa
    print("\n[3.2] TF-IDF por programa...")

    top_terminos_programa = {}
    for programa in df['Programa'].unique():
        df_prog = df[df['Programa'] == programa]

        if len(df_prog) < 5:  # Skip si muy pocos registros
            continue

        tfidf_prog = vectorizer.fit_transform(df_prog['Texto_Completo'])
        tfidf_sum_prog = tfidf_prog.sum(axis=0).A1
        feature_names_prog = vectorizer.get_feature_names_out()

        top_indices_prog = tfidf_sum_prog.argsort()[::-1][:20]
        top_terms_prog = [(feature_names_prog[i], tfidf_sum_prog[i]) for i in top_indices_prog]

        top_terminos_programa[programa] = dict(top_terms_prog)

        print(f"    {programa}: {len(top_terms_prog)} terminos clave")

    resultados['top_terminos_por_programa'] = top_terminos_programa

    # 3.3 Similitud entre asignaturas
    print("\n[3.3] Calculando similitud entre asignaturas...")

    # Agrupar por asignatura
    df_por_asignatura = df.groupby('Nombre asignatura o modulo')['Texto_Completo'].apply(
        lambda x: ' '.join(x)
    ).reset_index()

    if len(df_por_asignatura) > 2:
        vectorizer_asig = TfidfVectorizer(max_features=50, stop_words=list(stopwords_es))
        tfidf_asig = vectorizer_asig.fit_transform(df_por_asignatura['Texto_Completo'])

        similitud_asignaturas = cosine_similarity(tfidf_asig)
        df_similitud = pd.DataFrame(
            similitud_asignaturas,
            index=df_por_asignatura['Nombre asignatura o modulo'],
            columns=df_por_asignatura['Nombre asignatura o modulo']
        )

        # Encontrar pares mas similares (excluir diagonal)
        np.fill_diagonal(similitud_asignaturas, 0)
        max_similitud_idx = np.unravel_index(similitud_asignaturas.argmax(), similitud_asignaturas.shape)

        asig1 = df_por_asignatura.iloc[max_similitud_idx[0]]['Nombre asignatura o modulo']
        asig2 = df_por_asignatura.iloc[max_similitud_idx[1]]['Nombre asignatura o modulo']
        max_similitud = similitud_asignaturas[max_similitud_idx]

        print(f"    Par mas similar: {asig1} <-> {asig2}")
        print(f"    Similitud: {max_similitud:.3f}")

        resultados['matriz_similitud_asignaturas'] = df_similitud
        resultados['par_mas_similar'] = {
            'asignatura1': asig1,
            'asignatura2': asig2,
            'similitud': max_similitud
        }

    # 3.4 N-gramas mas frecuentes
    print("\n[3.4] Extrayendo n-gramas frecuentes...")

    vectorizer_bigrams = CountVectorizer(
        ngram_range=(2, 3),
        max_features=30,
        stop_words=list(stopwords_es),
        min_df=3
    )

    ngrams_matrix = vectorizer_bigrams.fit_transform(df['Texto_Completo'])
    ngrams_count = ngrams_matrix.sum(axis=0).A1
    ngrams_names = vectorizer_bigrams.get_feature_names_out()

    top_ngrams = sorted(
        [(ngrams_names[i], ngrams_count[i]) for i in range(len(ngrams_names))],
        key=lambda x: x[1],
        reverse=True
    )[:20]

    print(f"    Top 10 n-gramas:")
    for ngram, count in top_ngrams[:10]:
        print(f"      - '{ngram}': {int(count)} veces")

    resultados['top_ngrams'] = dict(top_ngrams)

    return resultados


# ============================================================================
# VISUALIZACIONES
# ============================================================================

def generar_visualizaciones(resultados_cob: Dict, resultados_tend: Dict,
                           resultados_nlp: Dict, output_folder: Path):
    """Genera todas las visualizaciones."""
    print("\n" + "="*70)
    print("GENERANDO VISUALIZACIONES")
    print("="*70 + "\n")

    output_folder.mkdir(parents=True, exist_ok=True)

    # VIZ 1: Heatmap de cobertura tematica
    print("[VIZ 1] Heatmap: Programa x Nucleo Tematico...")
    fig, ax = plt.subplots(figsize=(14, 6))
    sns.heatmap(
        resultados_cob['matriz_cobertura'],
        annot=True,
        fmt='d',
        cmap='YlOrRd',
        cbar_kws={'label': 'Frecuencia'},
        ax=ax
    )
    ax.set_title('Cobertura Tematica: Programa x Nucleos Tematicos (Top 20)', fontweight='bold')
    ax.set_xlabel('Nucleos Tematicos')
    ax.set_ylabel('Programa')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.savefig(output_folder / 'viz_1_heatmap_cobertura_tematica.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("    [OK] Guardado")

    # VIZ 2: Heatmap tendencias globales
    print("\n[VIZ 2] Heatmap: Programa x Tendencias Globales...")
    fig, ax = plt.subplots(figsize=(12, 6))
    sns.heatmap(
        resultados_tend['matriz_tendencias'],
        annot=True,
        fmt='d',
        cmap='viridis',
        cbar_kws={'label': 'Menciones'},
        ax=ax
    )
    ax.set_title('Alineacion con Tendencias Globales', fontweight='bold')
    ax.set_xlabel('Tendencia')
    ax.set_ylabel('Programa')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.savefig(output_folder / 'viz_2_heatmap_tendencias_globales.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("    [OK] Guardado")

    # VIZ 3: Barras de densidad tematica
    print("\n[VIZ 3] Barras: Densidad tematica por asignatura (Top 20)...")
    densidad_top = pd.Series(resultados_cob['densidad_por_asignatura']).head(20)

    fig, ax = plt.subplots(figsize=(12, 8))
    densidad_top.plot(kind='barh', ax=ax, color='steelblue')
    ax.set_title('Densidad Tematica por Asignatura (Top 20)', fontweight='bold')
    ax.set_xlabel('Numero de Nucleos Tematicos')
    ax.set_ylabel('Asignatura')
    ax.grid(axis='x', alpha=0.3)
    plt.tight_layout()
    plt.savefig(output_folder / 'viz_3_densidad_tematica.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("    [OK] Guardado")

    # VIZ 4: Top terminos TF-IDF
    print("\n[VIZ 4] Barras: Top terminos TF-IDF...")
    top_terms = pd.Series(resultados_nlp['top_terminos_global']).head(20)

    fig, ax = plt.subplots(figsize=(12, 8))
    top_terms.plot(kind='barh', ax=ax, color='coral')
    ax.set_title('Top 20 Terminos Clave (TF-IDF Global)', fontweight='bold')
    ax.set_xlabel('Score TF-IDF')
    ax.set_ylabel('Termino')
    ax.grid(axis='x', alpha=0.3)
    plt.tight_layout()
    plt.savefig(output_folder / 'viz_4_top_terminos_tfidf.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("    [OK] Guardado")

    # VIZ 5: Cobertura de tendencias (barras)
    print("\n[VIZ 5] Barras: Cobertura de tendencias globales...")
    cobertura_pct = pd.Series(resultados_tend['cobertura_porcentaje']).sort_values(ascending=True)

    fig, ax = plt.subplots(figsize=(10, 6))
    cobertura_pct.plot(kind='barh', ax=ax, color='mediumseagreen')
    ax.set_title('Cobertura de Tendencias Globales (%)', fontweight='bold')
    ax.set_xlabel('% Programas con Tendencia')
    ax.set_ylabel('Tendencia')
    ax.axvline(x=100, color='red', linestyle='--', alpha=0.5, label='100%')
    ax.grid(axis='x', alpha=0.3)
    ax.legend()
    plt.tight_layout()
    plt.savefig(output_folder / 'viz_5_cobertura_tendencias.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("    [OK] Guardado")

    # VIZ 6: Top N-gramas
    print("\n[VIZ 6] Barras: Top N-gramas frecuentes...")
    top_ngrams = pd.Series(resultados_nlp['top_ngrams']).head(15)

    fig, ax = plt.subplots(figsize=(12, 7))
    top_ngrams.plot(kind='barh', ax=ax, color='orchid')
    ax.set_title('Top 15 N-gramas Frecuentes', fontweight='bold')
    ax.set_xlabel('Frecuencia')
    ax.set_ylabel('N-grama')
    ax.grid(axis='x', alpha=0.3)
    plt.tight_layout()
    plt.savefig(output_folder / 'viz_6_top_ngrams.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("    [OK] Guardado")

    print("\n[OK] Todas las visualizaciones generadas")


# ============================================================================
# GENERACION DE EXCEL CONSOLIDADO
# ============================================================================

def generar_excel_consolidado(resultados_cob: Dict, resultados_tend: Dict,
                              resultados_nlp: Dict, output_folder: Path):
    """Genera archivo Excel con todos los resultados."""
    print("\n" + "="*70)
    print("GENERANDO EXCEL CONSOLIDADO")
    print("="*70 + "\n")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"analisis_tematico_avanzado_{timestamp}.xlsx"
    filepath = output_folder / filename

    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        # Hoja 1: Matriz Cobertura Tematica
        print("[Hoja 1] Matriz Cobertura Tematica...")
        resultados_cob['matriz_cobertura'].to_excel(writer, sheet_name='Cobertura_Tematica')

        # Hoja 2: Top Nucleos Tematicos
        print("[Hoja 2] Top Nucleos Tematicos...")
        df_top_nucleos = pd.DataFrame(
            list(resultados_cob['top_nucleos'].items()),
            columns=['Nucleo_Tematico', 'Frecuencia']
        ).sort_values('Frecuencia', ascending=False)
        df_top_nucleos.to_excel(writer, sheet_name='Top_Nucleos', index=False)

        # Hoja 3: Matriz Tendencias Globales
        print("[Hoja 3] Matriz Tendencias Globales...")
        resultados_tend['matriz_tendencias'].to_excel(writer, sheet_name='Tendencias_Globales')

        # Hoja 4: Cobertura % Tendencias
        print("[Hoja 4] Cobertura Tendencias...")
        df_cobertura = pd.DataFrame(
            list(resultados_tend['cobertura_porcentaje'].items()),
            columns=['Tendencia', 'Cobertura_%']
        ).sort_values('Cobertura_%', ascending=False)
        df_cobertura.to_excel(writer, sheet_name='Cobertura_Tendencias', index=False)

        # Hoja 5: Top Terminos TF-IDF
        print("[Hoja 5] Top Terminos TF-IDF...")
        df_tfidf = pd.DataFrame(
            list(resultados_nlp['top_terminos_global'].items()),
            columns=['Termino', 'Score_TFIDF']
        ).sort_values('Score_TFIDF', ascending=False)
        df_tfidf.to_excel(writer, sheet_name='Top_Terminos_TFIDF', index=False)

        # Hoja 6: Top N-gramas
        print("[Hoja 6] Top N-gramas...")
        df_ngrams = pd.DataFrame(
            list(resultados_nlp['top_ngrams'].items()),
            columns=['N-grama', 'Frecuencia']
        ).sort_values('Frecuencia', ascending=False)
        df_ngrams.to_excel(writer, sheet_name='Top_Ngramas', index=False)

        # Hoja 7: Metricas Resumen
        print("[Hoja 7] Metricas Resumen...")
        metricas = {
            'Metrica': [
                'Nucleos Tematicos Unicos',
                'Total Menciones Nucleos',
                'Promedio Densidad Tematica',
                'Indice Diversidad (0-100)',
                'Tendencias Detectadas',
                'Terminos Clave Extraidos'
            ],
            'Valor': [
                resultados_cob['nucleos_unicos'],
                resultados_cob['total_menciones'],
                f"{resultados_cob['promedio_densidad']:.1f}",
                f"{resultados_cob['indice_diversidad']:.1f}",
                len(TENDENCIAS_GLOBALES) - len(resultados_tend['tendencias_ausentes']),
                len(resultados_nlp['top_terminos_global'])
            ]
        }
        df_metricas = pd.DataFrame(metricas)
        df_metricas.to_excel(writer, sheet_name='Metricas_Resumen', index=False)

    # Tamaño del archivo
    file_size = filepath.stat().st_size / 1024  # KB

    print(f"\n[OK] Excel generado: {filename}")
    print(f"    Tamano: {file_size:.1f} KB")
    print(f"    Hojas: 7")
    print(f"    Ubicacion: {filepath}")


# ============================================================================
# GENERACION DE REPORTE EJECUTIVO
# ============================================================================

def generar_reporte_ejecutivo(resultados_cob: Dict, resultados_tend: Dict,
                              resultados_nlp: Dict, output_folder: Path):
    """Genera reporte ejecutivo en Markdown."""
    print("\n" + "="*70)
    print("GENERANDO REPORTE EJECUTIVO")
    print("="*70 + "\n")

    timestamp = datetime.now().strftime("%Y-%m-%d")
    filename = "REPORTE_ANALISIS_TEMATICO.md"
    filepath = output_folder / filename

    # Top 10 nucleos
    top_10_nucleos = list(resultados_cob['top_nucleos'].items())[:10]

    # Top 5 terminos
    top_5_terminos = list(resultados_nlp['top_terminos_global'].items())[:5]

    # Tendencias con mayor cobertura
    tendencias_sorted = sorted(
        resultados_tend['cobertura_porcentaje'].items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]

    reporte = f"""# Reporte Ejecutivo - Analisis Tematico Avanzado

**Fecha:** {timestamp}
**Sistema:** Analisis Microcurricular - Estrategias de Aprendizaje

---

## RESUMEN EJECUTIVO

Este reporte presenta un analisis profundo de la **cobertura tematica**, **alineacion con tendencias globales** y **analisis semantico** de los programas academicos, basado en Resultados de Aprendizaje, Nucleos Tematicos e Indicadores de Logro.

---

## 1. COBERTURA Y DENSIDAD TEMATICA

### Metricas Clave

- **Nucleos Tematicos Unicos:** {resultados_cob['nucleos_unicos']}
- **Total Menciones:** {resultados_cob['total_menciones']:,}
- **Promedio Nucleos/Asignatura:** {resultados_cob['promedio_densidad']:.1f}
- **Indice de Diversidad:** {resultados_cob['indice_diversidad']:.1f}/100

### Top 10 Nucleos Tematicos Mas Frecuentes

| # | Nucleo Tematico | Frecuencia |
|---|----------------|------------|
"""

    for i, (nucleo, freq) in enumerate(top_10_nucleos, 1):
        reporte += f"| {i} | {nucleo} | {freq} |\n"

    reporte += f"""
### Interpretacion

- El indice de diversidad de **{resultados_cob['indice_diversidad']:.1f}/100** indica {
    'alta' if resultados_cob['indice_diversidad'] > 70 else
    'media' if resultados_cob['indice_diversidad'] > 50 else 'baja'
} variedad tematica.
- Promedio de **{resultados_cob['promedio_densidad']:.1f} nucleos por asignatura** {
    '(denso, puede requerir ajuste)' if resultados_cob['promedio_densidad'] > 8 else
    '(adecuado)' if resultados_cob['promedio_densidad'] >= 4 else
    '(bajo, considerar enriquecer contenidos)'
}

---

## 2. ALINEACION CON TENDENCIAS GLOBALES

### Tendencias Mas Presentes

| Tendencia | Cobertura % |
|-----------|-------------|
"""

    for tendencia_id, cobertura in tendencias_sorted:
        tendencia_nombre = TENDENCIAS_GLOBALES[tendencia_id]['descripcion']
        reporte += f"| {tendencia_nombre} | {cobertura:.1f}% |\n"

    if resultados_tend['tendencias_ausentes']:
        reporte += f"""
### Brechas Detectadas

Las siguientes tendencias NO fueron detectadas en ningun programa:

"""
        for tend_id in resultados_tend['tendencias_ausentes']:
            reporte += f"- {TENDENCIAS_GLOBALES[tend_id]['descripcion']}\n"

        reporte += """
**Recomendacion:** Incorporar estas tendencias en futuras actualizaciones curriculares.
"""
    else:
        reporte += """
### Fortaleza

Todas las tendencias globales estan presentes en al menos un programa.
"""

    reporte += f"""
---

## 3. MINERIA DE TEXTO Y ANALISIS SEMANTICO

### Top 5 Terminos Clave (TF-IDF)

| Termino | Score |
|---------|-------|
"""

    for termino, score in top_5_terminos:
        reporte += f"| {termino} | {score:.3f} |\n"

    if 'par_mas_similar' in resultados_nlp:
        par = resultados_nlp['par_mas_similar']
        reporte += f"""
### Asignaturas con Mayor Similitud Tematica

- **Asignatura 1:** {par['asignatura1']}
- **Asignatura 2:** {par['asignatura2']}
- **Similitud:** {par['similitud']:.1%}

**Interpretacion:** Estas asignaturas comparten alto solapamiento de contenido. Considerar:
- Diferenciacion de enfoque
- Fusion (si redundancia es excesiva)
- Coordinacion entre docentes
"""

    reporte += """
---

## 4. RECOMENDACIONES ESTRATEGICAS

### Corto Plazo (1-3 meses)

1. **Enriquecer tendencias ausentes**
   - Incorporar contenidos faltantes en asignaturas existentes
   - Capacitar docentes en tendencias emergentes

2. **Optimizar densidad tematica**
   - Revisar asignaturas sobrecargadas (>8 nucleos)
   - Enriquecer asignaturas con pocos nucleos (<3)

3. **Reducir redundancias**
   - Coordinar contenidos entre asignaturas similares
   - Evitar duplicacion innecesaria

### Mediano Plazo (3-6 meses)

4. **Actualizar nucleos tematicos**
   - Incorporar terminos detectados por TF-IDF
   - Estandarizar vocabulario entre programas

5. **Monitoreo continuo**
   - Re-ejecutar analisis semestralmente
   - Comparar con benchmarks internacionales

---

## 5. ARCHIVOS GENERADOS

### Visualizaciones (PNG 300 DPI)
- `viz_1_heatmap_cobertura_tematica.png`
- `viz_2_heatmap_tendencias_globales.png`
- `viz_3_densidad_tematica.png`
- `viz_4_top_terminos_tfidf.png`
- `viz_5_cobertura_tendencias.png`
- `viz_6_top_ngrams.png`

### Excel Consolidado
- 7 hojas con matrices y rankings completos

---

## 6. CONCLUSIONES

### Fortalezas

- Diversidad tematica adecuada
- Presencia de tendencias globales clave
- Vocabulario tecnico coherente

### Oportunidades de Mejora

- Incorporar tendencias ausentes
- Balancear densidad tematica entre asignaturas
- Reducir solapamiento de contenidos

---

**Elaborado por:** Sistema de Analisis Microcurricular
**Fecha:** {timestamp}
**Version:** 1.0

"""

    filepath.write_text(reporte, encoding='utf-8')
    print(f"[OK] Reporte generado: {filename}")
    print(f"    Ubicacion: {filepath}")


# ============================================================================
# MAIN - EJECUTAR TODOS LOS ANALISIS
# ============================================================================

def main():
    """Ejecuta todos los analisis."""
    print("\n" + "="*70)
    print("SISTEMA DE ANALISIS TEMATICO AVANZADO")
    print("Enfoque: Cobertura, Tendencias y Mineria de Texto")
    print("="*70)

    # Rutas
    input_folder = Path("data/raw")
    output_folder = Path("data/output/analisis_tematico")
    output_folder.mkdir(parents=True, exist_ok=True)

    # 0. Cargar tendencias personalizadas
    tendencias_personalizadas = cargar_tendencias_personalizadas()

    # 1. Cargar datos
    df = cargar_datos_consolidados(input_folder)

    if df.empty:
        print("[X] No se pudieron cargar datos. Terminando.")
        return

    # 2. Preparar textos
    df = preparar_textos(df)

    # 3. ANALISIS 1: Cobertura Tematica
    resultados_cobertura = analisis_cobertura_tematica(df)

    # 4. ANALISIS 2: Tendencias Globales
    resultados_tendencias = analisis_tendencias_globales(df, tendencias_personalizadas)

    # 5. ANALISIS 3: Mineria de Texto
    resultados_nlp = analisis_mineria_texto(df)

    # 6. Generar visualizaciones
    generar_visualizaciones(resultados_cobertura, resultados_tendencias,
                           resultados_nlp, output_folder)

    # 7. Generar Excel
    generar_excel_consolidado(resultados_cobertura, resultados_tendencias,
                             resultados_nlp, output_folder)

    # 8. Generar reporte
    generar_reporte_ejecutivo(resultados_cobertura, resultados_tendencias,
                             resultados_nlp, output_folder)

    print("\n" + "="*70)
    print("ANALISIS COMPLETADO EXITOSAMENTE")
    print("="*70)
    print(f"\nResultados en: {output_folder}")
    print("\n[*] PROXIMOS PASOS:")
    print("    1. Revisar visualizaciones PNG")
    print("    2. Analizar Excel consolidado")
    print("    3. Leer reporte ejecutivo")
    print("    4. Compartir con comite curricular")
    print("\n")


if __name__ == '__main__':
    main()
