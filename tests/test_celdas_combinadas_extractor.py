"""
Tests para el manejo de celdas combinadas (merged) en el extractor de Excel.

En las plantillas institucionales, varias hojas usan celdas combinadas
verticalmente para representar un bloque de filas relacionadas (una
asignatura con una fila por Tipo de Saber, una estrategia con una fila por
cada Resultado de Aprendizaje al que contribuye, un programa con 3 filas de
perfil de egreso). openpyxl/pandas solo devuelven el valor en la primera
celda del rango combinado y dejan NaN en el resto; sin relleno, cualquier
análisis agrupado por esas columnas pierde silenciosamente las filas
siguientes del bloque (medido: 71.4% de las filas de Estrategias Micro en
todo el corpus).

La detección de qué columnas rellenar es automática, a partir de los rangos
combinados reales de cada archivo (``_detectar_columnas_combinadas``), no de
una lista fija por hoja: el patrón varía levemente entre plantillas y
programas.

Además, 'Paso 4 Estrategias mesocurricu' tenía un bug independiente: el
header configurado (HEADER_ROWS['ESTRATEGIAS_MESO']) apuntaba a la fila de
instrucciones en vez de a la fila real de encabezados.
"""

import openpyxl
import pandas as pd
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from src.extractor import ExcelExtractor

REPO_ROOT = Path(__file__).parent.parent
ARCHIVO_REAL = REPO_ROOT / 'data/raw/FORMATOS RA CICLO UNO RC/FormatoRA_EspGerMercadeo_VNAL.xlsx'


def _make_extractor_stub():
    """Crea un ExcelExtractor sin abrir archivo, solo para probar helpers puros."""
    return ExcelExtractor.__new__(ExcelExtractor)


def _make_workbook_con_merges():
    """
    Construye en memoria una hoja con: header en fila 2 (1-indexed), un
    título combinado en fila 1 (arriba del header, no debe contar), una
    columna 'B' combinada B3:B5 (bloque de datos, sí debe contar) y una
    columna 'C' con una combinación de una sola fila (no debe contar).
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.merge_cells('A1:C1')
    ws['A1'] = 'Título del formulario'
    ws['A2'] = 'Col A'
    ws['B2'] = 'Col B combinada'
    ws['C2'] = 'Col C sin combinar'
    ws['A3'] = 'x1'
    ws['B3'] = 'valor compartido'
    ws['C3'] = 'c1'
    ws['A4'] = 'x2'
    ws['C4'] = 'c2'
    ws.merge_cells('B3:B4')
    ws.merge_cells('C6:C6')  # combinación de una sola celda: no debe contar
    return ws


def test_detectar_columnas_combinadas_ignora_titulo_y_merge_de_una_fila():
    extractor = _make_extractor_stub()
    ws = _make_workbook_con_merges()
    # header_row=1 (0-indexed, como lo usa pandas) -> fila 2 en Excel
    columnas = extractor._detectar_columnas_combinadas(ws, header_row=1)
    assert columnas == {'Col B combinada'}
    print("test_detectar_columnas_combinadas_ignora_titulo_y_merge_de_una_fila: OK")


def test_rellenar_celdas_combinadas_solo_rellena_columnas_detectadas():
    extractor = _make_extractor_stub()
    df = pd.DataFrame({
        'Tipo de Saber': ['Saber', 'SaberHacer', 'SaberSer'],
        'Resultado de aprendizaje': ['RA1', 'RA2', 'RA3'],
        'Nombre asignatura o módulo': ['Gerencia Estratégica', None, None],
        'Semestre': [1, None, None],
    })
    resultado = extractor._rellenar_celdas_combinadas(
        df, columnas_combinadas={'Nombre asignatura o módulo', 'Semestre'}
    )
    assert resultado['Nombre asignatura o módulo'].tolist() == ['Gerencia Estratégica'] * 3
    assert resultado['Semestre'].tolist() == [1, 1, 1]
    # las columnas no marcadas como combinadas conservan sus valores originales
    assert resultado['Tipo de Saber'].tolist() == ['Saber', 'SaberHacer', 'SaberSer']
    assert resultado['Resultado de aprendizaje'].tolist() == ['RA1', 'RA2', 'RA3']
    print("test_rellenar_celdas_combinadas_solo_rellena_columnas_detectadas: OK")


def test_rellenar_celdas_combinadas_bloques_independientes():
    extractor = _make_extractor_stub()
    df = pd.DataFrame({
        'Nombre asignatura o módulo': ['Asignatura A', None, 'Asignatura B', None],
    })
    resultado = extractor._rellenar_celdas_combinadas(
        df, columnas_combinadas={'Nombre asignatura o módulo'}
    )
    assert resultado['Nombre asignatura o módulo'].tolist() == [
        'Asignatura A', 'Asignatura A', 'Asignatura B', 'Asignatura B'
    ]
    print("test_rellenar_celdas_combinadas_bloques_independientes: OK")


def test_extraccion_real_estrategias_micro_gerencia_estrategica_mercadeo():
    """Regresión del caso reportado: la asignatura debe verse con sus 3
    Tipos de Saber, no solo el primero de su bloque combinado."""
    if not ARCHIVO_REAL.exists():
        print("test_extraccion_real_estrategias_micro_gerencia_estrategica_mercadeo: SKIP (archivo no disponible)")
        return

    import logging
    logging.disable(logging.CRITICAL)

    data = ExcelExtractor(str(ARCHIVO_REAL)).extract_all()
    micro = data['estrategias_micro']

    col_asig = [c for c in micro.columns if 'asignatura' in c.lower()][0]
    col_saber = [c for c in micro.columns if 'saber' in c.lower()][0]

    # ninguna fila debe quedar sin nombre de asignatura tras el relleno
    assert micro[col_asig].notna().all()

    mask = micro[col_asig].astype(str).str.contains('Gerencia Estrat', case=False, na=False)
    tipos = set(micro[mask][col_saber].astype(str).str.lower())
    assert tipos == {'saber', 'saberhacer', 'saberser'}
    print("test_extraccion_real_estrategias_micro_gerencia_estrategica_mercadeo: OK")


def test_extraccion_real_estrategias_meso_header_correcto_y_relleno():
    """Regresión del bug de HEADER_ROWS['ESTRATEGIAS_MESO']: las columnas
    deben ser los encabezados reales (no el texto de instrucciones), y
    'Estrategia del programa' debe rellenarse across su bloque de RA."""
    if not ARCHIVO_REAL.exists():
        print("test_extraccion_real_estrategias_meso_header_correcto_y_relleno: SKIP (archivo no disponible)")
        return

    import logging
    logging.disable(logging.CRITICAL)

    data = ExcelExtractor(str(ARCHIVO_REAL)).extract_all()
    meso = data['estrategias_meso']

    assert 'Resultado de aprendizaje' in meso.columns
    assert 'Estrategia del programa' in meso.columns
    assert not any(str(c).strip().startswith('[') for c in meso.columns)

    # 'Estrategia del programa' está combinada por bloque de RA: no debe
    # quedar ninguna fila sin valor tras el relleno.
    assert meso['Estrategia del programa'].notna().all()
    # 'Resultado de aprendizaje' sí varía por fila (nunca combinada): debe
    # conservar filas NaN reales dentro del bloque de una misma estrategia.
    assert meso['Resultado de aprendizaje'].isna().any()
    print("test_extraccion_real_estrategias_meso_header_correcto_y_relleno: OK")


def test_extraccion_real_perfil_egreso_relleno_sin_tocar_saber():
    """'Programa'/'Perfil profesional' están combinados a lo largo de las 3
    filas del perfil; 'Saber'/'SaberHacer'/'SaberSer' varían por fila
    (cada una aporta un fragmento del texto) y no deben rellenarse."""
    if not ARCHIVO_REAL.exists():
        print("test_extraccion_real_perfil_egreso_relleno_sin_tocar_saber: SKIP (archivo no disponible)")
        return

    import logging
    logging.disable(logging.CRITICAL)

    data = ExcelExtractor(str(ARCHIVO_REAL)).extract_all()
    perfil = data['perfil_egreso']

    assert perfil['Programa'].notna().all()
    assert perfil['Perfil profesional'].notna().all()

    col_saber = [c for c in perfil.columns if c.lower() == 'saber'][0]
    # Saber varía por fila (fragmento distinto en cada una de las 3 filas):
    # si el relleno lo hubiera tocado por error, las 3 filas serían iguales.
    assert perfil[col_saber].nunique() > 1
    print("test_extraccion_real_perfil_egreso_relleno_sin_tocar_saber: OK")


def test_extraccion_real_competencias_header_correcto():
    """Regresión: HEADER_ROWS['COMPETENCIAS'] apuntaba a la fila de
    instrucciones (fila 2) en vez de a los encabezados reales (fila 3:
    'No.', 'Verbo competencia', ...), afectando 45 de 50 archivos del
    corpus. La detección automática por archivo debe corregirlo."""
    if not ARCHIVO_REAL.exists():
        print("test_extraccion_real_competencias_header_correcto: SKIP (archivo no disponible)")
        return

    import logging
    logging.disable(logging.CRITICAL)

    data = ExcelExtractor(str(ARCHIVO_REAL)).extract_all()
    comp = data['competencias']

    assert 'No.' in comp.columns
    assert 'Verbo competencia' in comp.columns
    assert not any(str(c).strip().startswith('[') for c in comp.columns)
    # la primera fila de datos debe ser una competencia real, no el texto
    # de encabezado ('No.', 'Verbo competencia', ...) tratado como dato
    assert comp['No.'].iloc[0] != 'No.'
    print("test_extraccion_real_competencias_header_correcto: OK")


def test_deteccion_automatica_prioriza_sobre_header_row_configurado():
    """La detección automática de header (por coincidencia de columnas
    esperadas) debe tener prioridad sobre un header_row fijo pasado por el
    llamador, porque la posición del header varía entre variantes de
    plantilla (algunas tienen una fila de instrucciones extra, otras no)."""
    extractor = _make_extractor_stub()
    ws = _make_workbook_con_merges()
    # 'Col A' está realmente en la fila 2 (header_row=1, 0-indexed); la
    # detección automática debe encontrarla independientemente de qué
    # header_row fijo se hubiera configurado como respaldo.
    detectado = extractor._find_header_row(ws, ['Col A', 'Col B combinada'])
    assert detectado == 1
    print("test_deteccion_automatica_prioriza_sobre_header_row_configurado: OK")


if __name__ == '__main__':
    test_detectar_columnas_combinadas_ignora_titulo_y_merge_de_una_fila()
    test_rellenar_celdas_combinadas_solo_rellena_columnas_detectadas()
    test_rellenar_celdas_combinadas_bloques_independientes()
    test_extraccion_real_estrategias_micro_gerencia_estrategica_mercadeo()
    test_extraccion_real_estrategias_meso_header_correcto_y_relleno()
    test_extraccion_real_perfil_egreso_relleno_sin_tocar_saber()
    test_extraccion_real_competencias_header_correcto()
    test_deteccion_automatica_prioriza_sobre_header_row_configurado()
    print("\nAll tests passed!")
