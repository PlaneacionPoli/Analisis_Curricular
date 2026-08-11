"""
Tests para la resolución de niveles taxonómicos (Bloom / BAK) en
CurricularAnalyzer._get_nivel_taxonomico y sus helpers de normalización.
"""

import pandas as pd
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from src.analyzer import (
    CurricularAnalyzer,
    normalizar_nivel_dominio,
    normalizar_taxonomia,
    normalizar_dominio_asociado,
)


def _make_analyzer() -> CurricularAnalyzer:
    """Crea un CurricularAnalyzer mínimo (sin datos) solo para probar el método."""
    programa_data = {
        'metadata': {'programa': 'Programa Test'},
        'competencias': pd.DataFrame(),
        'resultados_aprendizaje': pd.DataFrame(),
    }
    return CurricularAnalyzer(programa_data)


def test_normalizar_nivel_dominio_quita_tildes_y_sufijo():
    assert normalizar_nivel_dominio('AnálisisBAK') == 'analisis'
    assert normalizar_nivel_dominio('ComprensiónB') == 'comprension'
    assert normalizar_nivel_dominio('Control') == 'control'  # sin sufijo, no se toca
    assert normalizar_nivel_dominio(float('nan')) == ''
    print("test_normalizar_nivel_dominio_quita_tildes_y_sufijo: OK")


def test_normalizar_taxonomia():
    assert normalizar_taxonomia('BAK') == 'BAK'
    assert normalizar_taxonomia('Bloom') == 'BLOOM'
    assert normalizar_taxonomia('') == 'BLOOM'  # columna vacía -> asumir Bloom
    assert normalizar_taxonomia(None) == 'BLOOM'
    print("test_normalizar_taxonomia: OK")


def test_normalizar_dominio_asociado():
    assert normalizar_dominio_asociado('CognitivoBAK') == 'COGNITIVO'
    assert normalizar_dominio_asociado('ProcedimentalBAK') == 'PROCEDIMENTAL'
    assert normalizar_dominio_asociado('ActitudinalB') == 'ACTITUDINAL'
    assert normalizar_dominio_asociado('') == 'COGNITIVO'  # columna vacía -> asumir Cognitivo
    print("test_normalizar_dominio_asociado: OK")


def test_nivel_bloom_cognitivo():
    analyzer = _make_analyzer()
    # Bloom, dominio cognitivo: Conocimiento=1 ... Evaluación=6
    assert analyzer._get_nivel_taxonomico('', 'ConocimientoB', 'Bloom', 'CognitivoB') == 1.0
    assert analyzer._get_nivel_taxonomico('', 'EvaluaciónB', 'Bloom', 'CognitivoB') == 6.0
    print("test_nivel_bloom_cognitivo: OK")


def test_nivel_bloom_procedimental_y_actitudinal_misma_escala_que_cognitivo():
    analyzer = _make_analyzer()
    # Bloom usa la misma progresion de 6 niveles en los 3 dominios
    n_cog = analyzer._get_nivel_taxonomico('', 'AnálisisB', 'Bloom', 'CognitivoB')
    n_proc = analyzer._get_nivel_taxonomico('', 'AnálisisB', 'Bloom', 'ProcedimentalB')
    n_act = analyzer._get_nivel_taxonomico('', 'AnálisisB', 'Bloom', 'ActitudinalB')
    assert n_cog == n_proc == n_act == 4.0
    print("test_nivel_bloom_procedimental_y_actitudinal_misma_escala_que_cognitivo: OK")


def test_nivel_bak_cognitivo_cinco_niveles():
    analyzer = _make_analyzer()
    # BAK cognitivo: Conocimiento, Comprension, Aplicacion, Analisis, Sintesis (5 niveles)
    assert analyzer._get_nivel_taxonomico('', 'ConocimientoBAK', 'BAK', 'CognitivoBAK') == 1.0
    assert analyzer._get_nivel_taxonomico('', 'SíntesisBAK', 'BAK', 'CognitivoBAK') == 6.0
    # Analisis es el 4o de 5 niveles: 1 + 3*(5/4) = 4.75
    n_analisis = analyzer._get_nivel_taxonomico('', 'AnálisisBAK', 'BAK', 'CognitivoBAK')
    assert abs(n_analisis - 4.75) < 1e-6
    print("test_nivel_bak_cognitivo_cinco_niveles: OK")


def test_nivel_bak_procedimental_cuatro_niveles():
    analyzer = _make_analyzer()
    # BAK procedimental: Imitacion=1, Manipulacion=2.6667, Precision=4.3333, Control=6
    assert analyzer._get_nivel_taxonomico('', 'ImitaciónBAK', 'BAK', 'ProcedimentalBAK') == 1.0
    assert abs(analyzer._get_nivel_taxonomico('', 'ManipulaciónBAK', 'BAK', 'ProcedimentalBAK') - 2.6667) < 1e-3
    assert abs(analyzer._get_nivel_taxonomico('', 'PrecisiónBAK', 'BAK', 'ProcedimentalBAK') - 4.3333) < 1e-3
    assert analyzer._get_nivel_taxonomico('', 'ControlBAK', 'BAK', 'ProcedimentalBAK') == 6.0
    print("test_nivel_bak_procedimental_cuatro_niveles: OK")


def test_nivel_bak_actitudinal_cuatro_niveles():
    analyzer = _make_analyzer()
    # BAK actitudinal: Percepcion=1, Responder, Valorar, Organizar=6
    assert analyzer._get_nivel_taxonomico('', 'PercepciónBAK', 'BAK', 'ActitudinalBAK') == 1.0
    assert analyzer._get_nivel_taxonomico('', 'OrganizarBAK', 'BAK', 'ActitudinalBAK') == 6.0
    print("test_nivel_bak_actitudinal_cuatro_niveles: OK")


def test_fallback_por_verbo_cuando_nivel_dominio_vacio():
    analyzer = _make_analyzer()
    # Columna vacía (NaN o '') -> usa el verbo (taxonomía Bloom por verbos)
    assert analyzer._get_nivel_taxonomico('crear', float('nan'), 'BAK', 'CognitivoBAK') == 6.0
    assert analyzer._get_nivel_taxonomico('crear', '', 'BAK', 'CognitivoBAK') == 6.0
    print("test_fallback_por_verbo_cuando_nivel_dominio_vacio: OK")


def test_fallback_por_verbo_cuando_nivel_dominio_no_reconocido():
    # Valor real anómalo observado en el corpus: 'CaracterizarBAK' con verbo 'Evaluar'
    analyzer = _make_analyzer()
    nivel = analyzer._get_nivel_taxonomico('Evaluar', 'CaracterizarBAK', 'BAK', 'ActitudinalBAK')
    assert nivel == 5.0  # 'evaluar' esta en el nivel EVALUAR (5) de TAXONOMIA_BLOOM
    print("test_fallback_por_verbo_cuando_nivel_dominio_no_reconocido: OK")


def test_valor_por_defecto_cuando_todo_falla():
    analyzer = _make_analyzer()
    nivel = analyzer._get_nivel_taxonomico('verbo_inexistente_xyz', 'nivel_inexistente_xyz', 'BAK', 'CognitivoBAK')
    assert nivel == 2.0
    print("test_valor_por_defecto_cuando_todo_falla: OK")


def test_taxonomia_por_defecto_bloom_cuando_columna_ausente():
    # Matrices sin columna "Taxonomía": se asume Bloom (compatibilidad regla 3 de RESTRICCIONES)
    analyzer = _make_analyzer()
    nivel = analyzer._get_nivel_taxonomico('', 'EvaluaciónB', None, None)
    assert nivel == 6.0
    print("test_taxonomia_por_defecto_bloom_cuando_columna_ausente: OK")


if __name__ == '__main__':
    test_normalizar_nivel_dominio_quita_tildes_y_sufijo()
    test_normalizar_taxonomia()
    test_normalizar_dominio_asociado()
    test_nivel_bloom_cognitivo()
    test_nivel_bloom_procedimental_y_actitudinal_misma_escala_que_cognitivo()
    test_nivel_bak_cognitivo_cinco_niveles()
    test_nivel_bak_procedimental_cuatro_niveles()
    test_nivel_bak_actitudinal_cuatro_niveles()
    test_fallback_por_verbo_cuando_nivel_dominio_vacio()
    test_fallback_por_verbo_cuando_nivel_dominio_no_reconocido()
    test_valor_por_defecto_cuando_todo_falla()
    test_taxonomia_por_defecto_bloom_cuando_columna_ausente()
    print("\nAll tests passed!")
