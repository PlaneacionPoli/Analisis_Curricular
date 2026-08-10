"""
Integración LLM — Opción A: resúmenes narrativos grounded.

Genera un párrafo en español por programa sintetizando los indicadores
calculados por el pipeline. El LLM solo redacta; los números provienen
exclusivamente de los datos calculados (no puede inventar cifras).

Activar:
    Establecer LLM_ENABLED = True en config.py  (False por defecto)
    Definir ANTHROPIC_API_KEY en .env o variable de entorno

Uso:
    from src.llm_integration import generar_resumen_narrativo
    resumen = generar_resumen_narrativo(indicadores, tematicas, cobertura_perfil)
    # resumen es str con el párrafo, o None si LLM_ENABLED=False o hay error
"""

import logging
import re
import sys
from pathlib import Path
from typing import Optional

sys.path.append(str(Path(__file__).parent.parent))
from config import CONFIG

logger = logging.getLogger(__name__)

_MAX_WORDS = 200
_TIMEOUT_S = 30


def _esta_habilitado() -> bool:
    return bool(CONFIG.get('LLM_ENABLED', False))


def _construir_contexto(
    indicadores: dict,
    tematicas: dict,
    cobertura_perfil: dict,
) -> str:
    """Construye el bloque de datos que se pasa como contexto al LLM."""
    programa = indicadores.get('programa', 'Desconocido')
    score = indicadores.get('score_calidad', 0)
    completitud = indicadores.get('completitud', 0)
    complejidad = indicadores.get('complejidad_cognitiva_prom', 0)
    balance = indicadores.get('balance_tipo_saber', {})
    cobertura_global = cobertura_perfil.get('cobertura_global', 0)
    num_brechas = cobertura_perfil.get('num_brechas', 0)
    tematicas_presentes = tematicas.get('tematicas_presentes', [])
    n_tematicas = len(tematicas_presentes)

    saber = balance.get('Saber', 0)
    saber_hacer = balance.get('SaberHacer', 0)
    saber_ser = balance.get('SaberSer', 0)

    return f"""DATOS DEL PROGRAMA (solo usa estos números en el resumen):
Programa: {programa}
Score de calidad: {score}/100
Completitud del diseño: {completitud:.1f}%
Complejidad cognitiva promedio: {complejidad:.2f} (escala Bloom 1–6)
Balance tipos de saber — Saber: {saber:.1f}%, SaberHacer: {saber_hacer:.1f}%, SaberSer: {saber_ser:.1f}%
Cobertura del perfil de egreso: {cobertura_global:.1f}%
Brechas identificadas en el perfil: {num_brechas}
Temáticas presentes ({n_tematicas}): {', '.join(tematicas_presentes) if tematicas_presentes else 'Ninguna detectada'}"""


def _construir_prompt(contexto: str) -> str:
    return f"""Eres un analista curricular del Politécnico Grancolombiano.
Redacta un párrafo de máximo {_MAX_WORDS} palabras en español que sintetice
el estado del diseño curricular del programa. El párrafo debe:
- Mencionar el score de calidad y la completitud
- Señalar la complejidad cognitiva y el balance de saberes
- Indicar la cobertura del perfil y las brechas
- Mencionar las temáticas presentes más relevantes
- Usar un tono profesional y técnico, apto para un informe académico
- SOLO usar los números del bloque de datos — no inventar ni estimar cifras

{contexto}

Resumen narrativo:"""


def generar_resumen_narrativo(
    indicadores: dict,
    tematicas: dict,
    cobertura_perfil: dict,
) -> Optional[str]:
    """
    Genera un párrafo narrativo en español sobre el programa usando un LLM.

    Retorna None si:
    - LLM_ENABLED es False en config.py
    - No hay API key configurada
    - El proveedor no es 'anthropic'
    - Ocurre cualquier error (el pipeline no se interrumpe)

    Args:
        indicadores: dict de indicadores calculados por CurricularAnalyzer
        tematicas: dict de ThematicDetector (debe tener 'tematicas_presentes')
        cobertura_perfil: dict de analizar_cobertura_perfil_completa

    Returns:
        str con el resumen narrativo (≤200 palabras), o None
    """
    if not _esta_habilitado():
        logger.debug("LLM deshabilitado (LLM_ENABLED=False en config)")
        return None

    api_key = CONFIG.get('LLM_API_KEY')
    if not api_key:
        logger.warning("LLM habilitado pero sin ANTHROPIC_API_KEY — omitiendo resumen")
        return None

    proveedor = CONFIG.get('LLM_PROVIDER', 'anthropic')
    if proveedor != 'anthropic':
        logger.warning(f"Proveedor '{proveedor}' no implementado — solo 'anthropic'")
        return None

    modelo = CONFIG.get('LLM_MODEL', 'claude-sonnet-4-6')
    max_tokens = min(int(CONFIG.get('LLM_MAX_TOKENS', 512)), 512)

    contexto = _construir_contexto(indicadores, tematicas, cobertura_perfil)
    prompt = _construir_prompt(contexto)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key, timeout=_TIMEOUT_S)
        response = client.messages.create(
            model=modelo,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        resumen = response.content[0].text.strip()
        logger.info(
            f"Resumen generado para '{indicadores.get('programa', '?')}' "
            f"({len(resumen.split())} palabras, "
            f"tokens_in={response.usage.input_tokens}, "
            f"tokens_out={response.usage.output_tokens})"
        )
        return resumen

    except ImportError:
        logger.error("Paquete 'anthropic' no instalado — ejecuta: pip install anthropic")
        return None
    except Exception as e:
        logger.error(f"Error llamando al LLM: {e}")
        return None


def extraer_numeros_del_texto(texto: str) -> set:
    """Extrae todos los números (enteros y decimales) que aparecen en un texto."""
    return {float(m) for m in re.findall(r'\b\d+(?:[.,]\d+)?\b', texto.replace(',', '.'))}


def verificar_grounding(resumen: str, indicadores: dict, cobertura_perfil: dict) -> dict:
    """
    Verifica que los números del resumen estén presentes en los indicadores.

    Retorna un dict con:
    - grounded: bool (True si todos los números del resumen están en los datos)
    - numeros_resumen: set de números encontrados en el resumen
    - numeros_datos: set de números presentes en los datos
    - numeros_no_grounded: set de números del resumen que no están en los datos
    """
    numeros_resumen = extraer_numeros_del_texto(resumen)

    valores_datos = set()
    for v in indicadores.values():
        if isinstance(v, (int, float)):
            valores_datos.add(float(round(v, 1)))
            valores_datos.add(float(round(v, 0)))
            valores_datos.add(float(v))
    for v in cobertura_perfil.values():
        if isinstance(v, (int, float)):
            valores_datos.add(float(round(v, 1)))
            valores_datos.add(float(v))

    # Añadir valores derivados del balance de saberes
    balance = indicadores.get('balance_tipo_saber', {})
    for v in balance.values():
        if isinstance(v, (int, float)):
            valores_datos.add(float(round(v, 1)))

    no_grounded = set()
    for num in numeros_resumen:
        if not any(abs(num - d) < 0.6 for d in valores_datos):
            no_grounded.add(num)

    return {
        'grounded': len(no_grounded) == 0,
        'numeros_resumen': numeros_resumen,
        'numeros_datos': valores_datos,
        'numeros_no_grounded': no_grounded,
    }
