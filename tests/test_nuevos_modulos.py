"""
Tests básicos para módulos del Sprint 1-4.
"""

import pandas as pd
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))


def test_nucleos_cleaner():
    from src.nucleos_cleaner import (
        tokenizar_nucleo_celda, limpiar_nucleo, es_nucleo_valido,
        calcular_score_academico, filtrar_nucleos_dataframe
    )
    items = tokenizar_nucleo_celda('1. Tema A\n2. Tema B')
    assert len(items) == 2
    assert limpiar_nucleo('1. Tema') == 'Tema'
    valido, razon = es_nucleo_valido('Analisis financiero')
    assert valido and razon == ''
    invalido, _ = es_nucleo_valido('Salgamos')
    assert not invalido
    score = calcular_score_academico('Analisis financiero de estados')
    assert 0 <= score <= 1
    df = pd.DataFrame({'Nucleos tematicos': ['1. Valido\n2. No']})
    df_filt = filtrar_nucleos_dataframe(df)
    assert 'nucleos_validos' in df_filt.columns
    assert 'nucleos_rechazados' in df_filt.columns
    print("test_nucleos_cleaner: OK")


def test_perfil_coverage():
    from src.perfil_coverage_analyzer import (
        analizar_cobertura_perfil_completa,
        _split_elementos_perfil,
        calcular_cobertura_elemento,
        construir_corpus_curriculo,
    )

    # Smart split: texto corto no se fragmenta
    partes = _split_elementos_perfil('Analisis financiero / gestion de costos')
    assert len(partes) == 1

    df_perfil = pd.DataFrame({
        'Programa': ['Test'],
        'Saber': ['Analisis financiero'],
        'SaberHacer': ['Aplica metodos cuantitativos'],
        'Areas profesionales': ['Gerencia administrativa'],
    })
    df_ra = pd.DataFrame({
        'SaberAsociado': [
            'analisis financiero de estados contables',
            'evaluacion economica de proyectos',
            'gestion de costos empresariales',
        ],
    })
    df_micro = pd.DataFrame({
        'Nombre asignatura o modulo': ['Contabilidad', 'Finanzas', 'Administracion'],
        'Indicadores de logro asignatura o modulo': [
            'aplica metodos cuantitativos en decisiones gerenciales',
            'analiza estados financieros de la empresa',
            'desarrolla gerencia administrativa organizacional',
        ],
        'Nucleos tematicos': ['finanzas', 'administracion', 'costos'],
    })

    corpus, fuentes = construir_corpus_curriculo(df_micro, df_ra)
    assert len(corpus) >= 3
    assert len(fuentes) == len(corpus)

    score, idx, asig, doc = calcular_cobertura_elemento(
        'analisis financiero', corpus, fuentes
    )
    assert 0 <= score <= 1
    if score > 0:
        assert asig or doc

    result = analizar_cobertura_perfil_completa(df_perfil, df_micro, df_ra)
    assert result['total_elementos'] > 0
    assert 0 <= result['cobertura_global'] <= 100
    assert 'cobertura_por_campo' in result
    assert isinstance(result['cobertura_por_campo'], dict)
    elem = result['elementos'][0]
    assert 'asignatura_trazable' in elem
    assert 'umbral' in elem
    assert 'doc_trazable' in elem
    print("test_perfil_coverage: OK")


def test_shared_subjects():
    from src.shared_subjects_analyzer import detectar_asignaturas_compartidas
    df = pd.DataFrame({
        'Programa': ['A', 'A', 'B'], 'Sede': ['X', 'Y', 'X'],
        'Codigo': ['P001', 'P002', 'P001'],
        'Nombre asignatura o modulo': ['Mate', 'Mate', 'Fisica'],
        'Indicadores de logro asignatura o modulo': ['a', 'a', 'b']
    })
    result = detectar_asignaturas_compartidas(df)
    assert result['resumen']['total_programas'] == 2
    print("test_shared_subjects: OK")


def test_topic_modeler():
    from src.topic_modeler import entrenar_lda
    corpus = [
        'analisis financiero de estados contables aplicacion de normas NIIF',
        'mercadeo estrategico plan de marketing investigacion de mercados',
        'gestion del talento humano desarrollo organizacional liderazgo',
        'programacion orientada a objetos desarrollo de software',
        'estadistica inferencial aplicada a la investigacion de mercados',
        'contabilidad de costos y presupuestos para la toma de decisiones',
    ]
    result = entrenar_lda(corpus, n_topics=2, n_top_words=5)
    assert len(result['topics']) == 2
    assert result['model'] is not None
    print("test_topic_modeler: OK")


def test_report_generator():
    from src.report_generator import ReportGenerator
    gen = ReportGenerator()
    assert gen is not None
    print("test_report_generator: OK")


if __name__ == '__main__':
    test_nucleos_cleaner()
    test_perfil_coverage()
    test_shared_subjects()
    test_topic_modeler()
    test_report_generator()
    print("\nAll tests passed!")
