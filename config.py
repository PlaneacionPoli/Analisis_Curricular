"""
Configuración global del proyecto de análisis microcurricular.

Este archivo contiene todas las configuraciones centralizadas para:
- Rutas de archivos y carpetas
- Parámetros de procesamiento
- Configuración de logging
- Integración con LLM
- Exportación de resultados
"""

import os
from pathlib import Path
from typing import Dict, List

# ============================================================================
# RUTAS DEL PROYECTO
# ============================================================================

# Directorio base del proyecto
BASE_DIR = Path(__file__).parent.absolute()

# Directorios de datos
DATA_DIR = BASE_DIR / "data"
INPUT_FOLDER = DATA_DIR / "raw"  # Archivos Excel de entrada
PROCESSED_FOLDER = DATA_DIR / "processed"
OUTPUT_FOLDER = DATA_DIR / "output"

# Directorios de código
SRC_DIR = BASE_DIR / "src"
DASHBOARD_DIR = BASE_DIR / "dashboard"
TEMPLATES_DIR = BASE_DIR / "templates"
TESTS_DIR = BASE_DIR / "tests"
DOCS_DIR = BASE_DIR / "docs"

# Archivo de base de datos (opcional)
DB_PATH = DATA_DIR / "microcurricular.db"

# Crear directorios si no existen
for directory in [INPUT_FOLDER, PROCESSED_FOLDER, OUTPUT_FOLDER]:
    directory.mkdir(parents=True, exist_ok=True)

# ============================================================================
# ESTRUCTURA DE ARCHIVOS EXCEL
# ============================================================================

# Nombres de las hojas en los archivos Excel
EXCEL_SHEETS = {
    'PERFIL_EGRESO': 'Paso1 Analisis perfil egreso',
    'COMPETENCIAS': 'Paso 2 Redacción competen',
    'RESULTADOS_APRENDIZAJE': 'Paso 3 Redacción RA',
    'ESTRATEGIAS_MESO': 'Paso 4 Estrategias mesocurricu',
    'ESTRATEGIAS_MICRO': 'Paso 5 Estrategias micro',
    'TAXONOMIA_COMPETENCIAS': 'Taxonomía para competencias',
    'TAXONOMIA_RA': 'Taxonomias para RA'
}

# Fila donde empiezan los headers en cada hoja (0-indexed)
HEADER_ROWS = {
    'COMPETENCIAS': 2,  # Header en fila 3 (índice 2) - la fila 2 tiene instrucciones
    'RESULTADOS_APRENDIZAJE': 1,  # Header en fila 2 (índice 1) - la fila 1 tiene instrucciones
    'ESTRATEGIAS_MESO': 1,  # Header en fila 2 (índice 1) - la fila 1 tiene instrucciones
    'ESTRATEGIAS_MICRO': 1,  # Header en fila 2 (índice 1)
    'PERFIL_EGRESO': 1  # Header en fila 2 (índice 1); fila 1 tiene placeholders
}

# Columnas esperadas por hoja
EXPECTED_COLUMNS = {
    'COMPETENCIAS': [
        'No.',
        'Verbo competencia',
        'Objeto conceptual',
        'Finalidad',
        'Condición de contexto o referencia',
        'Redacción competencia',
        'Tipo de competencia'
    ],
    'RESULTADOS_APRENDIZAJE': [
        'Competencia por desarrollar',
        'Número de resultado',
        'TipoSaber',
        'SaberAsociado',
        'Taxonomía',
        'Dominio Asociado',
        'Nivel Dominio',
        'Verbo RA',
        'Resultados Aprendizaje'
    ],
    'ESTRATEGIAS_MESO': [
        'Resultado de aprendizaje',
        'Estrategia del programa',
        'Descripción',
        'Indicador de Impacto de la Estrategia',
        'Acciones de retroalimentación para los estudiantes',
        'Instrumentos de medición'
    ],
    'ESTRATEGIAS_MICRO': [
        'Tipo de Saber',
        'Resultado de aprendizaje',
        'Semestre',
        'Nombre asignatura o módulo',
        'Indicadores de logro asignatura o módulo',
        'Tipología',
        'B.Institucional', 'B.Disciplinar', 'B.Electivo',
        'Créditos',
        'Número de horas trabajo directo',
        'Número de horas trabajo independiente',
        'Total de horas',
        'Núcleos temáticos',
        'Actividades de aprendizaje',
        'Actividades de evaluación',
        'Acciones de retroalimentación'
    ],
    'PERFIL_EGRESO': [
        'Programa', 'Modalidad', 'Perfil profesional', 'Perfil ocupacional',
        'Saber', 'SaberHacer', 'SaberSer',
        'Áreas profesionales', 'Tareas profesionales',
        'Poblaciones actuación', 'Valor agregado'
    ]
}

# ============================================================================
# DETECCIÓN DE TEMÁTICAS
# ============================================================================

TEMATICAS = {
    'SOSTENIBILIDAD': {
        'keywords': [
            'sostenibilidad', 'sostenible', 'sustentabilidad', 'sustentable',
            'ambiental', 'medio ambiente', 'ecológico', 'ecología',
            'cambio climático', 'responsabilidad ambiental',
            'desarrollo sostenible', 'ods', 'objetivos de desarrollo sostenible',
            'huella de carbono', 'economía circular', 'verde', 'green',
            'consumo responsable', 'energías renovables', 'eficiencia energética',
            'movilidad sostenible', 'agua', 'biodiversidad',
            'innovación social', 'desarrollo comunitario', 'responsabilidad social'
        ],
        'contexto_keywords': [
            'dimensiones económicas, ambientales y sociales',
            'triple línea de base',
            'stakeholders',
            'responsabilidad social'
        ]
    },
    'INTELIGENCIA ARTIFICIAL': {
        'keywords': [
            'inteligencia artificial', 'ia', 'ai', 'machine learning',
            'aprendizaje automático', 'deep learning', 'aprendizaje profundo',
            'redes neuronales', 'algoritmos', 'big data', 'ciencia de datos',
            'data science', 'minería de datos', 'nlp', 'procesamiento de lenguaje natural',
            'visión por computador', 'chatbot', 'gpt', 'llm'
        ],
        'contexto_keywords': [
            'modelos predictivos',
            'automatización',
            'análisis de datos'
        ]
    },
    'RESPONSABILIDAD SOCIAL EMPRESARIAL': {
        'keywords': [
            'responsabilidad social empresarial', 'rse', 'rsc',
            'responsabilidad corporativa', 'ética empresarial',
            'gobierno corporativo', 'stakeholders', 'grupos de interés',
            'valor compartido', 'impacto social', 'filantropía',
            'pacto global', 'triple resultado'
        ],
        'contexto_keywords': []
    },
    'TRANSFORMACIÓN DIGITAL': {
        'keywords': [
            'transformación digital', 'digitalización', 'industria 4.0',
            'internet of things', 'iot', 'blockchain', 'cloud computing',
            'nube', 'big data', 'analítica', 'ciberseguridad',
            'automatización', 'robotización', 'erp', 'crm',
            'e-commerce', 'comercio electrónico', 'fintech'
        ],
        'contexto_keywords': [
            'disrupción digital',
            'tecnologías emergentes'
        ]
    },
    'INNOVACIÓN Y EMPRENDIMIENTO': {
        'keywords': [
            'innovación', 'emprendimiento', 'emprendedor', 'startup',
            'modelo de negocio', 'canvas', 'design thinking', 'lean startup',
            'prototipado', 'mvp', 'producto mínimo viable', 'pitch',
            'escalabilidad', 'disrupción', 'creatividad', 'ideación'
        ],
        'contexto_keywords': [
            'mentalidad emprendedora',
            'oportunidades de negocio'
        ]
    },
    'GLOBALIZACIÓN Y PERSPECTIVA GLOCAL': {
        'keywords': [
            'globalización', 'glocal', 'global', 'internacional',
            'internacionalización', 'comercio internacional',
            'mercados globales', 'multiculturalidad', 'interculturalidad',
            'exportación', 'importación', 'tratados comerciales',
            'competitividad global', 'cadena de valor global'
        ],
        'contexto_keywords': [
            'pensamiento global',
            'acción local'
        ]
    },
    'ÉTICA Y VALORES': {
        'keywords': [
            'ética', 'ético', 'valores', 'moral', 'integridad',
            'transparencia', 'honestidad', 'responsabilidad',
            'código de ética', 'dilema ético', 'deontología',
            'bioética', 'justicia', 'equidad', 'respeto'
        ],
        'contexto_keywords': [
            'toma de decisiones éticas',
            'comportamiento profesional'
        ]
    },
    'LIDERAZGO Y HABILIDADES BLANDAS': {
        'keywords': [
            'liderazgo', 'líder', 'trabajo en equipo', 'comunicación',
            'soft skills', 'habilidades blandas', 'inteligencia emocional',
            'empatía', 'negociación', 'resolución de conflictos',
            'pensamiento crítico', 'creatividad', 'adaptabilidad',
            'resiliencia', 'colaboración', 'asertividad'
        ],
        'contexto_keywords': [
            'gestión de equipos',
            'competencias socioemocionales'
        ]
    },
    'ANÁLISIS DE DATOS': {
        'keywords': [
            'análisis de datos', 'analítica', 'data analytics',
            'estadística', 'visualización de datos', 'dashboard',
            'kpi', 'indicadores', 'métricas', 'business intelligence',
            'bi', 'tablero de control', 'python', 'r', 'sql',
            'excel avanzado', 'power bi', 'tableau'
        ],
        'contexto_keywords': [
            'toma de decisiones basada en datos',
            'data-driven'
        ]
    },
    'GESTIÓN DEL CAMBIO': {
        'keywords': [
            'gestión del cambio', 'cambio organizacional',
            'transformación organizacional', 'resistencia al cambio',
            'cultura organizacional', 'desarrollo organizacional',
            'agilidad', 'adaptación', 'flexibilidad', 'scrum', 'agile'
        ],
        'contexto_keywords': [
            'procesos de cambio',
            'adaptación al entorno'
        ]
    }
}

# ============================================================================
# TAXONOMÍAS Y NIVELES COGNITIVOS
# ============================================================================

# Taxonomía de Bloom - Verbos por nivel
TAXONOMIA_BLOOM = {
    'RECORDAR': {
        'nivel': 1,
        'verbos': ['definir', 'listar', 'recordar', 'identificar', 'nombrar',
                   'reconocer', 'reproducir', 'seleccionar', 'enumerar']
    },
    'COMPRENDER': {
        'nivel': 2,
        'verbos': ['explicar', 'describir', 'interpretar', 'resumir', 'clasificar',
                   'comparar', 'ejemplificar', 'parafrasear', 'ilustrar']
    },
    'APLICAR': {
        'nivel': 3,
        'verbos': ['aplicar', 'ejecutar', 'implementar', 'usar', 'utilizar',
                   'demostrar', 'resolver', 'calcular', 'operar']
    },
    'ANALIZAR': {
        'nivel': 4,
        'verbos': ['analizar', 'diferenciar', 'organizar', 'atribuir', 'comparar',
                   'contrastar', 'examinar', 'investigar', 'categorizar']
    },
    'EVALUAR': {
        'nivel': 5,
        'verbos': ['evaluar', 'criticar', 'juzgar', 'verificar', 'validar',
                   'argumentar', 'defender', 'apoyar', 'justificar']
    },
    'CREAR': {
        'nivel': 6,
        'verbos': ['crear', 'diseñar', 'construir', 'planificar', 'producir',
                   'generar', 'desarrollar', 'formular', 'proponer']
    }
}

# Tipos de saber
TIPOS_SABER = ['Saber', 'SaberHacer', 'SaberSer']

# ============================================================================
# SISTEMAS TAXONÓMICOS DECLARADOS (columnas "Taxonomía" / "Dominio Asociado")
# ============================================================================
# Las matrices institucionales declaran, por resultado de aprendizaje, el
# sistema taxonómico usado (columna "Taxonomía": 'Bloom' o 'BAK') y el
# dominio (columna "Dominio Asociado": Cognitivo/Procedimental/Actitudinal,
# con sufijo 'B' o 'BAK' según el sistema, p.ej. 'CognitivoBAK').
#
# Bloom aplica la misma progresión de 6 niveles a los tres dominios. BAK
# (Bloom adaptada con aportes de Krathwohl) usa progresiones propias y más
# cortas para los dominios procedimental y actitudinal, y una progresión de
# 5 niveles (sin 'Evaluación') para el cognitivo.
#
# Criterio de equivalencia (ADR pendiente de numerar): cada progresión se
# normaliza de forma independiente a la escala común 1-6 — el nivel más
# bajo de la progresión propia del dominio equivale a 1, el más alto a 6, y
# los niveles intermedios se distribuyen proporcionalmente entre ambos
# extremos. Esto permite comparar la complejidad cognitiva entre programas
# que declaran sistemas distintos, aunque el número de niveles de cada
# progresión no coincida. Ejemplo (BAK procedimental, 4 niveles):
# Imitación=1, Manipulación=2.6667, Precisión=4.3333, Control=6.

TAXONOMIA_DEFAULT = 'BLOOM'
DOMINIO_DEFAULT = 'COGNITIVO'

# Progresiones ordenadas de menor a mayor complejidad (nombres normalizados:
# sin tildes, minúsculas, sin sufijo de sistema)
PROGRESIONES_TAXONOMICAS = {
    'BLOOM': {
        'COGNITIVO': ['conocimiento', 'comprension', 'aplicacion', 'analisis', 'sintesis', 'evaluacion'],
        'PROCEDIMENTAL': ['conocimiento', 'comprension', 'aplicacion', 'analisis', 'sintesis', 'evaluacion'],
        'ACTITUDINAL': ['conocimiento', 'comprension', 'aplicacion', 'analisis', 'sintesis', 'evaluacion'],
    },
    'BAK': {
        'COGNITIVO': ['conocimiento', 'comprension', 'aplicacion', 'analisis', 'sintesis'],
        'PROCEDIMENTAL': ['imitacion', 'manipulacion', 'precision', 'control'],
        'ACTITUDINAL': ['percepcion', 'responder', 'valorar', 'organizar'],
    },
}


def _progresion_a_niveles(progresion: List[str]) -> Dict[str, float]:
    """Normaliza una progresión (de menor a mayor complejidad) a escala 1-6.

    El primer elemento equivale a 1, el último a 6, y los intermedios se
    distribuyen proporcionalmente entre ambos extremos.
    """
    n = len(progresion)
    if n == 1:
        return {progresion[0]: 1.0}
    paso = 5.0 / (n - 1)
    return {nombre: round(1 + i * paso, 4) for i, nombre in enumerate(progresion)}


# Mapa final: {taxonomia: {dominio: {nombre_nivel_normalizado: nivel_1_a_6}}}
NIVEL_TAXONOMICO_MAP = {
    taxonomia: {
        dominio: _progresion_a_niveles(progresion)
        for dominio, progresion in dominios.items()
    }
    for taxonomia, dominios in PROGRESIONES_TAXONOMICAS.items()
}

# ============================================================================
# INDICADORES Y MÉTRICAS
# ============================================================================

# Pesos para el cálculo del score de calidad (deben sumar 1.0)
QUALITY_WEIGHTS = {
    'completitud': 0.25,
    'complejidad_cognitiva': 0.20,
    'balance_tipo_saber': 0.15,
    'diversidad_metodologica': 0.15,
    'cobertura_competencias': 0.15,
    'calidad_redaccion': 0.10
}

# Umbrales para clasificación de complejidad cognitiva
COMPLEJIDAD_THRESHOLDS = {
    'BASICO': (1, 2),  # Recordar, Comprender
    'INTERMEDIO': (3, 4),  # Aplicar, Analizar
    'AVANZADO': (5, 6)  # Evaluar, Crear
}

# Balance ideal de tipos de saber (%)
BALANCE_IDEAL_SABER = {
    'Saber': 33.3,
    'SaberHacer': 33.3,
    'SaberSer': 33.4
}

# ============================================================================
# NÚCLEOS TEMÁTICOS — CONFIGURACIÓN DE FILTRADO
# ============================================================================

NUCLEOS_CONFIG = {
    'MIN_LONGITUD': 4,
    'MAX_LONGITUD': 150,
    'MIN_PALABRAS': 2,
    'CONTAMINATION_IF': 0.15,
    'UMBRAL_SCORE_ACADEMICO': 0.5,
    'USE_SPACY': False,
    'SPACY_MODEL': 'es_core_news_sm',
}

# ============================================================================
# COBERTURA DEL PERFIL DE EGRESO
# ============================================================================

# Umbral de similitud TF-IDF para clasificar cobertura (fallback)
UMBRAL_COBERTURA = 0.35

# Umbrales diferenciados por campo del perfil de egreso
UMBRALES_POR_CAMPO = {
    'Perfil profesional': 0.28,
    'Perfil ocupacional': 0.28,
    'Saber': 0.35,
    'SaberHacer': 0.35,
    'SaberSer': 0.32,
    'Áreas profesionales': 0.38,
    'Tareas profesionales': 0.38,
    'Poblaciones actuación': 0.32,
    'Valor agregado': 0.30,
}

# Columnas del perfil de egreso que se analizan (todos los campos del perfil)
COLUMNAS_PERFIL = [
    'Perfil profesional', 'Perfil ocupacional',
    'Saber', 'SaberHacer', 'SaberSer',
    'Áreas profesionales', 'Tareas profesionales',
    'Poblaciones actuación', 'Valor agregado'
]

# ============================================================================
# CONFIGURACIÓN DE PROCESAMIENTO
# ============================================================================

CONFIG = {
    # Rutas
    'INPUT_FOLDER': str(INPUT_FOLDER),
    'OUTPUT_FOLDER': str(OUTPUT_FOLDER),
    'PROCESSED_FOLDER': str(PROCESSED_FOLDER),
    'DB_PATH': str(DB_PATH),

    # Logging
    'LOG_LEVEL': 'INFO',  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    'LOG_FILE': str(BASE_DIR / 'logs' / 'analisis_microcurricular.log'),

    # Procesamiento paralelo
    'PARALLEL_PROCESSING': True,
    'MAX_WORKERS': 4,  # Número de procesos paralelos

    # Exportación
    'EXPORT_FORMATS': ['html', 'pdf', 'excel', 'json'],

    # LLM Integration (opcional)
    'LLM_ENABLED': False,
    'LLM_PROVIDER': 'anthropic',  # 'anthropic' o 'openai'
    'LLM_API_KEY': os.getenv('ANTHROPIC_API_KEY') or os.getenv('OPENAI_API_KEY'),
    'LLM_MODEL': 'claude-3-5-sonnet-20241022',  # o 'gpt-4-turbo'
    'LLM_MAX_TOKENS': 4096,

    # Cache
    'ENABLE_CACHE': True,
    'CACHE_DIR': str(DATA_DIR / 'cache'),

    # Validación
    'MIN_COMPETENCIAS': 3,  # Mínimo de competencias esperadas por programa
    'MIN_RA_POR_COMPETENCIA': 2,  # Mínimo de RA por competencia
    'MIN_COMPLETITUD': 70.0,  # % mínimo de completitud para aprobar validación

    # Dashboard
    'DASHBOARD_PORT': 8501,
    'DASHBOARD_THEME': 'light',  # 'light' o 'dark'

    # Reportes
    'REPORTE_LOGO_PATH': str(BASE_DIR / 'assets' / 'logo_institucion.png'),
    'REPORTE_FOOTER': 'Generado automáticamente por Sistema de Análisis Microcurricular',
}

# ============================================================================
# MENSAJES Y TEXTOS
# ============================================================================

MESSAGES = {
    'BIENVENIDA': """
    ===============================================================
       SISTEMA DE ANALISIS MICROCURRICULAR
       Analisis automatizado de disenos curriculares
    ===============================================================
    """,
    'ERROR_ARCHIVO_NO_ENCONTRADO': 'El archivo {filename} no fue encontrado.',
    'ERROR_ESTRUCTURA_INVALIDA': 'El archivo {filename} no tiene la estructura esperada.',
    'EXITO_EXTRACCION': 'Datos extraídos exitosamente de {filename}.',
    'PROCESANDO_PROGRAMA': 'Procesando programa: {programa}...',
    'ANALISIS_COMPLETO': 'Análisis completado. Resultados guardados en {output_path}.'
}

# ============================================================================
# CONFIGURACIÓN DE GRÁFICOS
# ============================================================================

PLOT_CONFIG = {
    'color_palette': ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
                      '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
    'figure_size': (12, 6),
    'font_size': 12,
    'title_font_size': 16,
    'dpi': 300
}

# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

def get_config(key: str, default=None):
    """Obtiene un valor de configuración."""
    return CONFIG.get(key, default)

def update_config(updates: Dict):
    """Actualiza la configuración con nuevos valores."""
    CONFIG.update(updates)

def get_tematicas_list() -> List[str]:
    """Retorna lista de nombres de temáticas."""
    return list(TEMATICAS.keys())

def get_keywords_for_tematica(tematica: str) -> List[str]:
    """Retorna keywords de una temática específica."""
    return TEMATICAS.get(tematica, {}).get('keywords', [])

# ============================================================================
# VALIDACIÓN DE CONFIGURACIÓN
# ============================================================================

def validate_config():
    """Valida que la configuración sea correcta."""
    errors = []

    # Validar que los pesos sumen 1.0
    total_weight = sum(QUALITY_WEIGHTS.values())
    if abs(total_weight - 1.0) > 0.01:
        errors.append(f"Los pesos de QUALITY_WEIGHTS deben sumar 1.0 (actual: {total_weight})")

    # Validar que existan los directorios
    required_dirs = [INPUT_FOLDER, OUTPUT_FOLDER, PROCESSED_FOLDER]
    for dir_path in required_dirs:
        if not dir_path.exists():
            errors.append(f"Directorio no encontrado: {dir_path}")

    if errors:
        raise ValueError("Errores en configuración:\n" + "\n".join(errors))

    return True

# Ejecutar validación al importar
try:
    validate_config()
except ValueError as e:
    print(f"ADVERTENCIA: {e}")

if __name__ == '__main__':
    print("Configuración del proyecto:")
    print(f"BASE_DIR: {BASE_DIR}")
    print(f"INPUT_FOLDER: {INPUT_FOLDER}")
    print(f"OUTPUT_FOLDER: {OUTPUT_FOLDER}")
    print(f"\nTemáticas configuradas: {len(TEMATICAS)}")
    for tematica in TEMATICAS.keys():
        print(f"  - {tematica}")
