"""
Módulo de validación de calidad curricular.

Valida estructura y redacción de:
- Competencias
- Resultados de Aprendizaje
- Coherencia taxonómica
- Mensurabilidad
"""

import logging
from typing import Dict, List
import pandas as pd

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from config import TAXONOMIA_BLOOM

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class QualityValidator:
    """
    Valida calidad de redacción y estructura curricular.

    Example:
        >>> validator = QualityValidator()
        >>> result = validator.validate_competencia_structure(competencia_text)
        >>> print(f"Válida: {result['valid']}")
    """

    def __init__(self):
        """Inicializa el validador."""
        self.verbos_taxonomicos = self._build_verbos_list()
        logger.info("QualityValidator inicializado")

    def _build_verbos_list(self) -> List[str]:
        """Construye lista de todos los verbos taxonómicos."""
        verbos = []
        for config in TAXONOMIA_BLOOM.values():
            verbos.extend([v.lower() for v in config['verbos']])
        return verbos

    def validate_competencia_structure(self, competencia: str) -> Dict:
        """
        Valida estructura de una competencia.

        Estructura esperada: Verbo + Objeto + Finalidad + Condición

        Args:
            competencia (str): Texto de la competencia

        Returns:
            Dict con:
            {
                'valid': bool,
                'issues': List[str],
                'suggestions': List[str],
                'componentes': {
                    'tiene_verbo': bool,
                    'tiene_objeto': bool,
                    'tiene_finalidad': bool,
                    'tiene_condicion': bool
                }
            }
        """
        if pd.isna(competencia) or not competencia:
            return {
                'valid': False,
                'issues': ['Competencia vacía'],
                'suggestions': [],
                'componentes': {
                    'tiene_verbo': False,
                    'tiene_objeto': False,
                    'tiene_finalidad': False,
                    'tiene_condicion': False
                }
            }

        competencia_lower = competencia.lower()
        issues = []
        suggestions = []
        componentes = {}

        # 1. Verificar verbo taxonómico
        tiene_verbo = any(verbo in competencia_lower for verbo in self.verbos_taxonomicos)
        componentes['tiene_verbo'] = tiene_verbo

        if not tiene_verbo:
            issues.append("No se detectó verbo taxonómico válido")
            suggestions.append("Iniciar con verbo de Taxonomía de Bloom (analizar, evaluar, crear...)")

        # 2. Verificar longitud mínima (debe tener objeto conceptual)
        palabras = competencia.split()
        componentes['tiene_objeto'] = len(palabras) >= 5

        if len(palabras) < 5:
            issues.append("Competencia muy corta, posible falta de objeto conceptual")

        # 3. Verificar finalidad (palabras como "para", "con el fin de")
        finalidad_keywords = ['para', 'con el fin de', 'con el propósito de', 'a fin de']
        tiene_finalidad = any(kw in competencia_lower for kw in finalidad_keywords)
        componentes['tiene_finalidad'] = tiene_finalidad

        if not tiene_finalidad:
            issues.append("No se detectó finalidad explícita")
            suggestions.append("Agregar finalidad con 'para...', 'con el fin de...'")

        # 4. Verificar condición de contexto
        condicion_keywords = ['en contexto', 'en el contexto', 'considerando', 'teniendo en cuenta']
        tiene_condicion = any(kw in competencia_lower for kw in condicion_keywords)
        componentes['tiene_condicion'] = tiene_condicion

        # 5. Verificar que no sea demasiado larga
        if len(palabras) > 50:
            issues.append("Competencia muy extensa, podría ser difícil de evaluar")
            suggestions.append("Simplificar o dividir en competencias más específicas")

        valid = len(issues) <= 1  # Permitir 1 issue menor

        return {
            'valid': valid,
            'issues': issues,
            'suggestions': suggestions,
            'componentes': componentes,
            'longitud_palabras': len(palabras)
        }

    def validate_verbo_taxonomico(self, verbo: str, nivel: str) -> Dict:
        """
        Verifica coherencia entre verbo y nivel taxonómico.

        Args:
            verbo (str): Verbo del RA
            nivel (str): Nivel declarado

        Returns:
            Dict con:
            {
                'coherente': bool,
                'nivel_esperado': str,
                'nivel_declarado': str,
                'mensaje': str
            }
        """
        if pd.isna(verbo) or pd.isna(nivel):
            return {
                'coherente': False,
                'nivel_esperado': 'Desconocido',
                'nivel_declarado': str(nivel),
                'mensaje': 'Verbo o nivel no proporcionado'
            }

        verbo_lower = str(verbo).lower().strip()
        nivel_str = str(nivel).lower()

        # Buscar nivel del verbo
        nivel_verbo = None
        for nivel_nombre, config in TAXONOMIA_BLOOM.items():
            verbos = [v.lower() for v in config['verbos']]
            if verbo_lower in verbos:
                nivel_verbo = nivel_nombre
                break

        # Extraer nivel del nivel_dominio
        nivel_declarado = None
        if 'analisis' in nivel_str or 'analiz' in nivel_str:
            nivel_declarado = 'ANALIZAR'
        elif 'evalua' in nivel_str:
            nivel_declarado = 'EVALUAR'
        elif 'crea' in nivel_str or 'diseñ' in nivel_str:
            nivel_declarado = 'CREAR'
        elif 'aplic' in nivel_str:
            nivel_declarado = 'APLICAR'
        elif 'comprend' in nivel_str:
            nivel_declarado = 'COMPRENDER'
        elif 'record' in nivel_str:
            nivel_declarado = 'RECORDAR'

        coherente = (nivel_verbo == nivel_declarado) if (nivel_verbo and nivel_declarado) else False

        mensaje = ""
        if not coherente and nivel_verbo and nivel_declarado:
            mensaje = f"Inconsistencia: verbo '{verbo}' corresponde a {nivel_verbo}, pero está declarado como {nivel_declarado}"
        elif not nivel_verbo:
            mensaje = f"Verbo '{verbo}' no encontrado en taxonomía"

        return {
            'coherente': coherente,
            'nivel_esperado': nivel_verbo or 'Desconocido',
            'nivel_declarado': nivel_declarado or 'Desconocido',
            'mensaje': mensaje
        }

    def validate_ra_measurable(self, ra: str) -> Dict:
        """
        Verifica que el RA sea medible y observable.

        Args:
            ra (str): Texto del resultado de aprendizaje

        Returns:
            Dict con:
            {
                'medible': bool,
                'observable': bool,
                'issues': List[str]
            }
        """
        if pd.isna(ra) or not ra:
            return {
                'medible': False,
                'observable': False,
                'issues': ['RA vacío']
            }

        ra_lower = ra.lower()
        issues = []

        # Verificar verbos observables
        verbos_observables = self.verbos_taxonomicos
        tiene_verbo_observable = any(verbo in ra_lower for verbo in verbos_observables)

        # Verbos no observables (evitar)
        verbos_no_observables = ['saber', 'conocer', 'entender', 'aprender', 'comprender']
        tiene_verbo_no_observable = any(verbo in ra_lower.split()[0:3] for verbo in verbos_no_observables)

        observable = tiene_verbo_observable and not tiene_verbo_no_observable

        if not observable:
            issues.append("Usar verbos observables (evitar 'conocer', 'entender', 'saber')")

        # Verificar especificidad
        palabras = ra.split()
        if len(palabras) < 5:
            issues.append("RA muy general, falta especificidad")

        medible = observable and len(issues) == 0

        return {
            'medible': medible,
            'observable': observable,
            'issues': issues
        }

    def validate_programa_completo(self, programa_data: Dict) -> Dict:
        """
        Validación completa del programa.

        Args:
            programa_data (Dict): Datos del programa

        Returns:
            Dict con reporte de calidad:
            {
                'programa': str,
                'score': float (0-100),
                'competencias': {...},
                'resultados_aprendizaje': {...},
                'resumen': {...}
            }
        """
        programa = programa_data['metadata']['programa']
        logger.info(f"Validando programa: {programa}")

        # Validar competencias
        comp_results = []
        for _, row in programa_data['competencias'].iterrows():
            comp_text = row.get('Redacción competencia', '')
            result = self.validate_competencia_structure(comp_text)
            comp_results.append(result)

        comp_validas = sum(1 for r in comp_results if r['valid'])
        comp_total = len(comp_results)
        comp_score = (comp_validas / comp_total * 100) if comp_total > 0 else 0

        # Validar RA
        ra_results = []
        for _, row in programa_data['resultados_aprendizaje'].iterrows():
            ra_text = row.get('Resultados Aprendizaje', '')
            verbo = row.get('Verbo RA', '')
            nivel = row.get('Nivel Dominio', '')

            ra_medible = self.validate_ra_measurable(ra_text)
            verbo_coherente = self.validate_verbo_taxonomico(verbo, nivel)

            ra_results.append({
                'medible': ra_medible,
                'verbo_coherente': verbo_coherente
            })

        ra_medibles = sum(1 for r in ra_results if r['medible']['medible'])
        ra_coherentes = sum(1 for r in ra_results if r['verbo_coherente']['coherente'])
        ra_total = len(ra_results)

        ra_score = ((ra_medibles + ra_coherentes) / (ra_total * 2) * 100) if ra_total > 0 else 0

        # Score total
        score_total = (comp_score * 0.5 + ra_score * 0.5)

        return {
            'programa': programa,
            'score': round(score_total, 1),
            'competencias': {
                'total': comp_total,
                'validas': comp_validas,
                'score': round(comp_score, 1),
                'resultados': comp_results
            },
            'resultados_aprendizaje': {
                'total': ra_total,
                'medibles': ra_medibles,
                'coherentes': ra_coherentes,
                'score': round(ra_score, 1),
                'resultados': ra_results
            },
            'resumen': {
                'errores': sum(len(r['issues']) for r in comp_results),
                'sugerencias': sum(len(r['suggestions']) for r in comp_results)
            }
        }


if __name__ == '__main__':
    print("╔═══════════════════════════════════════════════════════════╗")
    print("║  VALIDADOR DE CALIDAD CURRICULAR                         ║")
    print("╚═══════════════════════════════════════════════════════════╝\n")

    validator = QualityValidator()

    # Ejemplo
    comp_ejemplo = "Analizar estados financieros para tomar decisiones empresariales considerando el contexto económico"
    resultado = validator.validate_competencia_structure(comp_ejemplo)

    print(f"Competencia: {comp_ejemplo}\n")
    print(f"Válida: {'✅' if resultado['valid'] else '❌'}")
    if resultado['issues']:
        print(f"Issues: {resultado['issues']}")
    if resultado['suggestions']:
        print(f"Sugerencias: {resultado['suggestions']}")
