"""
Tests de grounding numérico para resúmenes generados por el LLM.

Los tests de llamada real a la API se saltan automáticamente si no hay
ANTHROPIC_API_KEY en el entorno. Los tests de lógica de grounding
(extracción de números, verificación) corren siempre sin API key.

Ejecutar:
    pytest tests/test_llm_grounding.py -v
    pytest tests/test_llm_grounding.py -v -k "not api"   # sin llamadas reales
"""

import os
import sys
import pytest
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from src.llm_integration import (
    extraer_numeros_del_texto,
    verificar_grounding,
    generar_resumen_narrativo,
    _construir_contexto,
)

# ── Fixtures de datos de prueba ───────────────────────────────────────────────

INDICADORES_EJEMPLO = {
    'programa': 'Administración de Empresas PBOG',
    'score_calidad': 72,
    'completitud': 85.5,
    'complejidad_cognitiva_prom': 3.42,
    'balance_tipo_saber': {
        'Saber': 35.0,
        'SaberHacer': 40.0,
        'SaberSer': 25.0,
    },
}

TEMATICAS_EJEMPLO = {
    'tematicas_presentes': ['SOSTENIBILIDAD', 'INNOVACIÓN Y EMPRENDIMIENTO', 'ÉTICA Y VALORES'],
    'tematicas_ausentes': ['INTELIGENCIA ARTIFICIAL', 'ANÁLISIS DE DATOS'],
    'n_tematicas': 3,
}

COBERTURA_EJEMPLO = {
    'cobertura_global': 68.3,
    'num_brechas': 4,
    'campos_con_brecha': ['Saber', 'Valor agregado'],
}


# ── Tests de lógica (sin API key) ────────────────────────────────────────────

class TestExtraerNumeros:
    def test_extrae_enteros(self):
        nums = extraer_numeros_del_texto("El score es 72 sobre 100")
        assert 72.0 in nums
        assert 100.0 in nums

    def test_extrae_decimales_punto(self):
        nums = extraer_numeros_del_texto("Completitud: 85.5%")
        assert 85.5 in nums

    def test_extrae_decimales_coma(self):
        nums = extraer_numeros_del_texto("Cobertura de 68,3%")
        assert 68.3 in nums

    def test_texto_sin_numeros(self):
        nums = extraer_numeros_del_texto("El programa presenta brechas curriculares")
        assert len(nums) == 0

    def test_multiples_numeros(self):
        nums = extraer_numeros_del_texto("Score 72/100, completitud 85.5%, brechas: 4")
        assert 72.0 in nums
        assert 100.0 in nums
        assert 85.5 in nums
        assert 4.0 in nums


class TestVerificarGrounding:
    def test_resumen_grounded_numeros_correctos(self):
        resumen = "El programa obtuvo score 72 con completitud 85.5% y 4 brechas."
        resultado = verificar_grounding(resumen, INDICADORES_EJEMPLO, COBERTURA_EJEMPLO)
        assert resultado['grounded'] is True
        assert len(resultado['numeros_no_grounded']) == 0

    def test_resumen_no_grounded_numero_inventado(self):
        resumen = "El programa obtuvo score 95 con completitud 99.9%."
        resultado = verificar_grounding(resumen, INDICADORES_EJEMPLO, COBERTURA_EJEMPLO)
        assert resultado['grounded'] is False
        assert len(resultado['numeros_no_grounded']) > 0

    def test_resumen_sin_numeros_siempre_grounded(self):
        resumen = "El programa presenta oportunidades de mejora en varias áreas."
        resultado = verificar_grounding(resumen, INDICADORES_EJEMPLO, COBERTURA_EJEMPLO)
        assert resultado['grounded'] is True

    def test_tolerancia_redondeo(self):
        # 3.42 en datos → resumen puede decir "3.4" (diferencia < 0.6)
        resumen = "Complejidad cognitiva promedio de 3.4 en escala Bloom."
        resultado = verificar_grounding(resumen, INDICADORES_EJEMPLO, COBERTURA_EJEMPLO)
        assert resultado['grounded'] is True

    def test_porcentajes_balance_reconocidos(self):
        resumen = "SaberHacer tiene el mayor peso con 40% mientras SaberSer alcanza 25%."
        resultado = verificar_grounding(resumen, INDICADORES_EJEMPLO, COBERTURA_EJEMPLO)
        assert resultado['grounded'] is True


class TestConstruirContexto:
    def test_contexto_incluye_programa(self):
        ctx = _construir_contexto(INDICADORES_EJEMPLO, TEMATICAS_EJEMPLO, COBERTURA_EJEMPLO)
        assert 'Administración de Empresas PBOG' in ctx

    def test_contexto_incluye_score(self):
        ctx = _construir_contexto(INDICADORES_EJEMPLO, TEMATICAS_EJEMPLO, COBERTURA_EJEMPLO)
        assert '72' in ctx

    def test_contexto_incluye_tematicas(self):
        ctx = _construir_contexto(INDICADORES_EJEMPLO, TEMATICAS_EJEMPLO, COBERTURA_EJEMPLO)
        assert 'SOSTENIBILIDAD' in ctx

    def test_contexto_incluye_brechas(self):
        ctx = _construir_contexto(INDICADORES_EJEMPLO, TEMATICAS_EJEMPLO, COBERTURA_EJEMPLO)
        assert '4' in ctx


# ── Tests con API real (se saltan si no hay key) ─────────────────────────────

def _tiene_api_key() -> bool:
    return bool(os.getenv('ANTHROPIC_API_KEY'))


@pytest.mark.skipif(not _tiene_api_key(), reason="ANTHROPIC_API_KEY no configurada")
class TestResumenConAPI:
    def test_resumen_no_es_none_con_key(self, monkeypatch):
        monkeypatch.setitem(__import__('sys').modules['config'].CONFIG, 'LLM_ENABLED', True)
        resumen = generar_resumen_narrativo(INDICADORES_EJEMPLO, TEMATICAS_EJEMPLO, COBERTURA_EJEMPLO)
        assert resumen is not None
        assert isinstance(resumen, str)
        assert len(resumen) > 50

    def test_resumen_longitud_razonable(self, monkeypatch):
        monkeypatch.setitem(__import__('sys').modules['config'].CONFIG, 'LLM_ENABLED', True)
        resumen = generar_resumen_narrativo(INDICADORES_EJEMPLO, TEMATICAS_EJEMPLO, COBERTURA_EJEMPLO)
        if resumen:
            palabras = len(resumen.split())
            assert palabras <= 220, f"Resumen demasiado largo: {palabras} palabras"

    def test_resumen_grounding_con_api(self, monkeypatch):
        monkeypatch.setitem(__import__('sys').modules['config'].CONFIG, 'LLM_ENABLED', True)
        resumen = generar_resumen_narrativo(INDICADORES_EJEMPLO, TEMATICAS_EJEMPLO, COBERTURA_EJEMPLO)
        if resumen:
            resultado = verificar_grounding(resumen, INDICADORES_EJEMPLO, COBERTURA_EJEMPLO)
            no_grounded = resultado['numeros_no_grounded']
            assert len(no_grounded) == 0, (
                f"El LLM inventó números no presentes en los datos: {no_grounded}\n"
                f"Resumen: {resumen}"
            )


# ── Test de integración: LLM deshabilitado por defecto ───────────────────────

def test_llm_deshabilitado_retorna_none():
    """Con LLM_ENABLED=False (default), generar_resumen_narrativo retorna None."""
    import config
    original = config.CONFIG.get('LLM_ENABLED')
    config.CONFIG['LLM_ENABLED'] = False
    try:
        resumen = generar_resumen_narrativo(INDICADORES_EJEMPLO, TEMATICAS_EJEMPLO, COBERTURA_EJEMPLO)
        assert resumen is None
    finally:
        config.CONFIG['LLM_ENABLED'] = original
