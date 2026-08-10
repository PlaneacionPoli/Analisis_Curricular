"""
Módulo de detección de temáticas en textos curriculares.

Detecta presencia de temáticas específicas (Sostenibilidad, IA, Innovación, etc.)
en competencias, resultados de aprendizaje y estrategias pedagógicas mediante
análisis de keywords y contexto.
"""

import logging
import re
from typing import Dict, List, Optional
import pandas as pd

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from config import TEMATICAS

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ThematicDetector:
    """
    Detecta presencia de temáticas específicas en textos curriculares.

    Utiliza diccionarios de keywords y análisis de contexto para identificar
    temáticas emergentes en competencias, RA y estrategias pedagógicas.

    Attributes:
        tematicas_config (Dict): Configuración de temáticas y keywords
        context_window (int): Número de caracteres de contexto a extraer

    Example:
        >>> detector = ThematicDetector()
        >>> resultado = detector.detect_in_text("Desarrollo sostenible...")
        >>> print(resultado['SOSTENIBILIDAD']['presente'])
        True
    """

    def __init__(self, tematicas_config: Optional[Dict] = None,
                 context_window: int = 100):
        """
        Inicializa el detector de temáticas.

        Args:
            tematicas_config (Optional[Dict]): Configuración personalizada de temáticas.
                                              Si es None, usa la configuración por defecto.
            context_window (int): Número de caracteres de contexto alrededor de keywords
        """
        self.tematicas_config = tematicas_config or TEMATICAS
        self.context_window = context_window
        logger.info(f"ThematicDetector inicializado con {len(self.tematicas_config)} temáticas")

    def _normalize_text(self, text: str) -> str:
        """
        Normaliza texto para búsqueda.

        - Convierte a minúsculas
        - Remueve tildes
        - Remueve caracteres especiales innecesarios

        Args:
            text (str): Texto original

        Returns:
            str: Texto normalizado
        """
        if pd.isna(text) or not isinstance(text, str):
            return ""

        # Convertir a minúsculas
        text = text.lower()

        # Remover tildes
        replacements = {
            'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
            'ñ': 'n', 'ü': 'u'
        }
        for old, new in replacements.items():
            text = text.replace(old, new)

        return text

    def _extract_context(self, text: str, keyword: str, window: int = 100) -> str:
        """
        Extrae contexto alrededor de una keyword.

        Args:
            text (str): Texto completo
            keyword (str): Keyword encontrada
            window (int): Tamaño de ventana (caracteres antes y después)

        Returns:
            str: Fragmento de texto con contexto
        """
        text_normalized = self._normalize_text(text)
        keyword_normalized = self._normalize_text(keyword)

        # Buscar todas las posiciones de la keyword
        positions = [m.start() for m in re.finditer(re.escape(keyword_normalized),
                                                     text_normalized)]

        if not positions:
            return ""

        # Usar primera ocurrencia
        pos = positions[0]

        # Extraer contexto
        start = max(0, pos - window)
        end = min(len(text), pos + len(keyword) + window)

        context = text[start:end]

        # Agregar indicadores de truncamiento
        if start > 0:
            context = "..." + context
        if end < len(text):
            context = context + "..."

        return context.strip()

    def detect_in_text(self, text: str, extract_context: bool = True) -> Dict[str, Dict]:
        """
        Detecta temáticas en un texto individual.

        Args:
            text (str): Texto a analizar
            extract_context (bool): Si se debe extraer contexto de keywords

        Returns:
            Dict con estructura:
            {
                'SOSTENIBILIDAD': {
                    'presente': True,
                    'num_coincidencias': 3,
                    'keywords_encontradas': ['sostenible', 'ambiental'],
                    'contexto': 'fragmento de texto...' (si extract_context=True)
                },
                ...
            }

        Example:
            >>> texto = "Analizar dimensiones sostenibles en proyectos..."
            >>> resultado = detector.detect_in_text(texto)
            >>> print(resultado['SOSTENIBILIDAD']['keywords_encontradas'])
            ['sostenibles']
        """
        if pd.isna(text) or not text:
            return {tematica: {
                'presente': False,
                'num_coincidencias': 0,
                'keywords_encontradas': [],
                'contexto': ''
            } for tematica in self.tematicas_config.keys()}

        text_normalized = self._normalize_text(text)
        resultados = {}

        for tematica, config in self.tematicas_config.items():
            keywords = config.get('keywords', [])
            keywords_encontradas = []
            contextos = []

            # Buscar cada keyword
            for keyword in keywords:
                keyword_normalized = self._normalize_text(keyword)

                # Buscar keyword como palabra completa o parte de palabra
                pattern = r'\b' + re.escape(keyword_normalized) + r'\w*'
                matches = re.findall(pattern, text_normalized)

                if matches:
                    keywords_encontradas.extend(matches)

                    # Extraer contexto de la primera ocurrencia
                    if extract_context and not contextos:
                        ctx = self._extract_context(
                            text,
                            keyword,
                            self.context_window
                        )
                        if ctx:
                            contextos.append(ctx)

            # Remover duplicados y contar
            keywords_encontradas = list(set(keywords_encontradas))
            num_coincidencias = len(keywords_encontradas)

            resultados[tematica] = {
                'presente': num_coincidencias > 0,
                'num_coincidencias': num_coincidencias,
                'keywords_encontradas': sorted(keywords_encontradas),
                'contexto': contextos[0] if contextos else ''
            }

        return resultados

    def detect_in_dataframe(self, df: pd.DataFrame,
                           text_columns: List[str]) -> pd.DataFrame:
        """
        Detecta temáticas en un DataFrame concatenando múltiples columnas de texto.

        Args:
            df (pd.DataFrame): DataFrame con textos
            text_columns (List[str]): Nombres de columnas a analizar

        Returns:
            pd.DataFrame: DataFrame original con columnas adicionales:
                         - {TEMATICA}_presente (bool)
                         - {TEMATICA}_coincidencias (int)

        Example:
            >>> df_comp = extractor.extract_competencias()
            >>> df_comp = detector.detect_in_dataframe(
            ...     df_comp,
            ...     ['Redacción competencia']
            ... )
            >>> print(df_comp['SOSTENIBILIDAD_presente'].sum())
            5
        """
        logger.info(f"Detectando temáticas en DataFrame ({len(df)} filas)")

        # Concatenar columnas de texto
        def concat_texts(row):
            texts = []
            for col in text_columns:
                if col in row.index and not pd.isna(row[col]):
                    texts.append(str(row[col]))
            return " ".join(texts)

        df['_texto_completo'] = df.apply(concat_texts, axis=1)

        # Detectar temáticas en cada fila
        for tematica in self.tematicas_config.keys():
            df[f'{tematica}_presente'] = False
            df[f'{tematica}_coincidencias'] = 0

        for idx, row in df.iterrows():
            deteccion = self.detect_in_text(row['_texto_completo'],
                                           extract_context=False)

            for tematica, resultado in deteccion.items():
                df.at[idx, f'{tematica}_presente'] = resultado['presente']
                df.at[idx, f'{tematica}_coincidencias'] = resultado['num_coincidencias']

        # Remover columna temporal
        df = df.drop(columns=['_texto_completo'])

        logger.info("Detección de temáticas completada")
        return df

    def analyze_programa(self, programa_data: Dict) -> Dict:
        """
        Analiza todas las competencias, RA y estrategias micro de un programa completo.

        Args:
            programa_data (Dict): Datos extraídos con ExcelExtractor.extract_all()

        Returns:
            Dict con estructura:
            {
                'programa': str,
                'tematicas_presentes': List[str],
                'resumen': {
                    'SOSTENIBILIDAD': {
                        'presente': True,
                        'frecuencia_competencias': 3,
                        'frecuencia_ra': 5,
                        'frecuencia_estrategias': 8,
                        'asignaturas_con_tematica': 5,
                        'total_coincidencias': 16,
                        'por_creditos': 0.5,
                        'keywords_mas_frecuentes': ['sostenible', 'ambiental']
                    },
                    ...
                },
                'detalle': {
                    'competencias': DataFrame,
                    'resultados_aprendizaje': DataFrame,
                    'estrategias_micro': DataFrame
                }
            }

        Example:
            >>> data = extractor.extract_all()
            >>> analisis = detector.analyze_programa(data)
            >>> print(f"Temáticas: {analisis['tematicas_presentes']}")
        """
        programa = programa_data['metadata']['programa']
        logger.info(f"Analizando programa: {programa}")

        # DataFrames
        df_comp = programa_data['competencias']
        df_ra = programa_data['resultados_aprendizaje']
        df_estrategias = programa_data.get('estrategias_micro', pd.DataFrame())

        # Detectar en competencias
        if not df_comp.empty:
            df_comp = self.detect_in_dataframe(df_comp, ['Redacción competencia'])

        # Detectar en RA
        if not df_ra.empty:
            df_ra = self.detect_in_dataframe(df_ra, ['Resultados Aprendizaje'])

        # Detectar en estrategias micro
        if not df_estrategias.empty:
            text_cols_estrategias = [
                'Actividades de aprendizaje',
                'Actividades de evaluación',
                'Núcleos temáticos',
                'Resultado de aprendizaje'
            ]
            df_estrategias = self.detect_in_dataframe(df_estrategias, text_cols_estrategias)

        # Calcular créditos totales (suma de créditos únicos por asignatura)
        creditos_totales = 0
        nombre_asignatura_col = None
        semestre_col = None
        if not df_estrategias.empty:
            # Buscar columna de nombre de asignatura
            for col in df_estrategias.columns:
                if 'Nombre' in col and 'asignatura' in col.lower():
                    nombre_asignatura_col = col
                if 'Semestre' in col:
                    semestre_col = col

            if nombre_asignatura_col and 'Créditos' in df_estrategias.columns:
                # Obtener créditos por asignatura (primera fila de cada asignatura)
                df_estrategias['_creditos_num'] = pd.to_numeric(df_estrategias['Créditos'], errors='coerce')

                # Filtrar filas válidas:
                # 1. Excluir filas donde Semestre contenga "Total" o sea nulo
                # 2. Excluir filas donde el nombre de asignatura sea nulo o contenga solo números
                if semestre_col:
                    df_estrategias['_es_fila_valida'] = ~(
                        df_estrategias[semestre_col].astype(str).str.contains('Total', na=False) |
                        df_estrategias[semestre_col].isna()
                    )
                else:
                    df_estrategias['_es_fila_valida'] = True

                # Filtrar también por créditos válidos (<=30)
                df_estrategias['_es_fila_valida'] = df_estrategias['_es_fila_valida'] & (
                    (df_estrategias['_creditos_num'].notna()) &
                    (df_estrategias['_creditos_num'] <= 30)
                )

                # Agrupar por asignatura y tomar el primer valor de créditos válido
                df_validas = df_estrategias[df_estrategias['_es_fila_valida']]
                asignaturas_creditos = df_validas.groupby(nombre_asignatura_col)['_creditos_num'].first()

                # Filtrar valores válidos
                creditos_totales = float(asignaturas_creditos.sum()) if len(asignaturas_creditos) > 0 else 0.0
                logger.info(f"Créditos totales calculados: {creditos_totales}")

        # Construir resumen
        resumen = {}
        tematicas_presentes = []

        for tematica in self.tematicas_config.keys():
            # Contar en competencias
            freq_comp = 0
            if not df_comp.empty and f'{tematica}_presente' in df_comp.columns:
                freq_comp = df_comp[f'{tematica}_presente'].sum()

            # Contar en RA
            freq_ra = 0
            if not df_ra.empty and f'{tematica}_presente' in df_ra.columns:
                freq_ra = df_ra[f'{tematica}_presente'].sum()

            # Contar en estrategias micro - UNA SOLA VEZ POR ASIGNATURA
            freq_estrategias = 0
            asignaturas_con_tematica = 0
            if not df_estrategias.empty and f'{tematica}_presente' in df_estrategias.columns and nombre_asignatura_col:
                # Agrupar por asignatura y verificar si al menos una fila de esa asignatura tiene la temática
                estrategias_tematica = df_estrategias[df_estrategias[f'{tematica}_presente']]
                if not estrategias_tematica.empty:
                    # Contar asignaturas únicas que tienen esta temática
                    asignaturas_con_tematica = estrategias_tematica[nombre_asignatura_col].nunique()
                    freq_estrategias = asignaturas_con_tematica

            total = freq_comp + freq_ra + freq_estrategias

            # Normalizar por créditos (por cada 10 créditos)
            por_creditos = (total / creditos_totales * 10) if creditos_totales > 0 else 0

            presente = total > 0

            if presente:
                tematicas_presentes.append(tematica)

            resumen[tematica] = {
                'presente': presente,
                'frecuencia_competencias': int(freq_comp),
                'frecuencia_ra': int(freq_ra),
                'frecuencia_estrategias': int(freq_estrategias),
                'asignaturas_con_tematica': int(asignaturas_con_tematica),
                'total_coincidencias': int(total),
                'por_creditos': round(por_creditos, 2)
            }

        return {
            'programa': programa,
            'tematicas_presentes': tematicas_presentes,
            'num_tematicas': len(tematicas_presentes),
            'creditos_totales': creditos_totales,
            'resumen': resumen,
            'detalle': {
                'competencias': df_comp,
                'resultados_aprendizaje': df_ra,
                'estrategias_micro': df_estrategias
            }
        }

    def generate_thematic_matrix(self, all_programas: List[Dict]) -> pd.DataFrame:
        """
        Genera matriz consolidada Programas × Temáticas.

        Args:
            all_programas (List[Dict]): Lista de análisis de programas
                                       (salida de ThematicDetector.analyze_programa())

        Returns:
            pd.DataFrame: Matriz con estructura:
                Columnas: Programa, Competencias, RA, Estrategias, Créditos, [TEMATICAS...]
                Valores en temáticas: frecuencia de coincidencias Y normalizado por créditos

        Example:
            >>> all_data = [detector.analyze_programa(data1), detector.analyze_programa(data2)]
            >>> matriz = detector.generate_thematic_matrix(all_data)
            >>> matriz.to_excel('matriz_tematicas.xlsx', index=False)
        """
        logger.info(f"Generando matriz de temáticas para {len(all_programas)} programas")

        rows = []

        for analisis in all_programas:
            # analisis ya es el resultado de analyze_programa
            row = {
                'Programa': analisis['programa'],
                'Creditos': analisis.get('creditos_totales', 0)
            }

            # Agregar frecuencias de temáticas
            for tematica, data in analisis['resumen'].items():
                row[tematica] = data['total_coincidencias']
                row[f'{tematica}_x10cred'] = data.get('por_creditos', 0)

            rows.append(row)

        # Crear DataFrame
        df_matriz = pd.DataFrame(rows)

        # Ordenar por programa
        df_matriz = df_matriz.sort_values('Programa')

        # Agregar fila de totales
        totales = {
            'Programa': 'TOTAL',
            'Creditos': df_matriz['Creditos'].sum()
        }

        for tematica in self.tematicas_config.keys():
            if tematica in df_matriz.columns:
                totales[tematica] = df_matriz[tematica].sum()
            if f'{tematica}_x10cred' in df_matriz.columns:
                totales[f'{tematica}_x10cred'] = df_matriz[f'{tematica}_x10cred'].mean()

        # Concatenar totales
        df_totales = pd.DataFrame([totales])
        df_matriz = pd.concat([df_matriz, df_totales], ignore_index=True)

        logger.info("Matriz de temáticas generada")
        return df_matriz

    def get_programs_by_thematic(self, matriz: pd.DataFrame,
                                 tematica: str,
                                 min_coincidencias: int = 1) -> pd.DataFrame:
        """
        Obtiene programas que abordan una temática específica.

        Args:
            matriz (pd.DataFrame): Matriz generada con generate_thematic_matrix()
            tematica (str): Nombre de la temática
            min_coincidencias (int): Mínimo de coincidencias para incluir

        Returns:
            pd.DataFrame: Programas filtrados y ordenados por frecuencia

        Example:
            >>> matriz = detector.generate_thematic_matrix(all_data)
            >>> prog_ia = detector.get_programs_by_thematic(
            ...     matriz,
            ...     'INTELIGENCIA ARTIFICIAL',
            ...     min_coincidencias=2
            ... )
        """
        if tematica not in matriz.columns:
            logger.warning(f"Temática '{tematica}' no encontrada en matriz")
            return pd.DataFrame()

        # Filtrar programas con temática
        df_filtered = matriz[
            (matriz[tematica] >= min_coincidencias) &
            (matriz['Programa'] != 'TOTAL')
        ].copy()

        # Ordenar por frecuencia descendente
        df_filtered = df_filtered.sort_values(tematica, ascending=False)

        return df_filtered[['Programa', 'Competencias', 'Resultados_Aprendizaje', tematica]]

    def generate_summary_report(self, matriz: pd.DataFrame) -> str:
        """
        Genera reporte textual resumen de temáticas.

        Args:
            matriz (pd.DataFrame): Matriz de temáticas

        Returns:
            str: Reporte formateado
        """
        total_programas = len(matriz) - 1  # Excluir fila TOTAL

        report = f"""
╔═══════════════════════════════════════════════════════════════╗
║  REPORTE DE TEMÁTICAS EMERGENTES                             ║
╚═══════════════════════════════════════════════════════════════╝

Total de Programas Analizados: {total_programas}

COBERTURA DE TEMÁTICAS:
"""

        # Calcular cobertura de cada temática
        tematicas_cols = [col for col in matriz.columns
                         if col not in ['Programa', 'Competencias', 'Resultados_Aprendizaje']]

        cobertura_data = []
        for tematica in tematicas_cols:
            programas_con_tematica = (matriz[matriz['Programa'] != 'TOTAL'][tematica] > 0).sum()
            porcentaje = (programas_con_tematica / total_programas) * 100
            total_coincidencias = matriz[matriz['Programa'] == 'TOTAL'][tematica].values[0]

            cobertura_data.append({
                'tematica': tematica,
                'programas': programas_con_tematica,
                'porcentaje': porcentaje,
                'total_coincidencias': total_coincidencias
            })

        # Ordenar por porcentaje descendente
        cobertura_data.sort(key=lambda x: x['porcentaje'], reverse=True)

        for item in cobertura_data:
            bar_length = int(item['porcentaje'] / 5)  # Escala a 20 caracteres
            bar = '█' * bar_length + '░' * (20 - bar_length)

            report += f"\n  {item['tematica'][:35]:35} {bar} "
            report += f"{item['programas']:2}/{total_programas} ({item['porcentaje']:5.1f}%) "
            report += f"[{item['total_coincidencias']} coincidencias]"

        report += "\n\n"
        return report


# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

def detect_thematic_in_text(text: str, tematica: str) -> bool:
    """
    Función rápida para detectar una temática en un texto.

    Args:
        text (str): Texto a analizar
        tematica (str): Nombre de la temática

    Returns:
        bool: True si la temática está presente
    """
    detector = ThematicDetector()
    resultado = detector.detect_in_text(text)
    return resultado.get(tematica, {}).get('presente', False)


# ============================================================================
# EJEMPLO DE USO
# ============================================================================

if __name__ == '__main__':
    print("╔═══════════════════════════════════════════════════════════╗")
    print("║  DETECTOR DE TEMÁTICAS                                   ║")
    print("╚═══════════════════════════════════════════════════════════╝\n")

    # Crear detector
    detector = ThematicDetector()

    # Ejemplo 1: Detectar en un texto
    print("EJEMPLO 1: Detección en texto individual\n")

    texto_ejemplo = """
    Analizar las dimensiones económicas, ambientales y sociales de proyectos
    empresariales para promover el desarrollo sostenible y la responsabilidad
    social empresarial en contextos globales.
    """

    resultado = detector.detect_in_text(texto_ejemplo)

    print(f"Texto analizado: {texto_ejemplo.strip()}\n")

    tematicas_detectadas = [t for t, r in resultado.items() if r['presente']]
    print(f"Temáticas detectadas: {', '.join(tematicas_detectadas)}\n")

    for tematica, data in resultado.items():
        if data['presente']:
            print(f"✅ {tematica}:")
            print(f"   Keywords encontradas: {', '.join(data['keywords_encontradas'])}")
            print(f"   Contexto: {data['contexto'][:100]}...")
            print()

    # Ejemplo 2: Análisis de programa (requiere datos reales)
    print("\nEJEMPLO 2: Para analizar un programa completo:")
    print("""
    from src.extractor import ExcelExtractor

    extractor = ExcelExtractor('archivo.xlsx')
    data = extractor.extract_all()

    analisis = detector.analyze_programa(data)
    print(f"Temáticas: {analisis['tematicas_presentes']}")
    """)
