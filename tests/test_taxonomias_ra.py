"""Taxonomías de los RA: contraste del Paso 3 con la base de verbos (src/taxonomias_ra.py)."""
import os

import pytest

from src import informes_pdf as ip
from src import taxonomias_ra as tx

MATRIZ = 'data/raw/FORMATOS RA CICLO UNO RC/FormatoRA_MEDSTEM_VNAL.xlsx'
BASE = {'analizar': [('Cognitivo', 'analisis')],
        'evaluar': [('Cognitivo', 'evaluacion'), ('Actitudinal', 'percepcion')],
        'aplicar': [('Cognitivo', 'aplicacion'), ('Procedimental', 'manipulacion')]}


def _ra(verbo, dominio, nivel, taxonomia='Bloom', exigencia=None):
    return {'Matriz': 'P_PBOG', 'Programa': 'P', 'Sede': 'PBOG', 'RA': f'{verbo} algo', 'clave': verbo, 'Verbo': verbo,
            'Tipo de saber': 'Saber', 'Taxonomía': taxonomia, 'Dominio declarado': dominio, 'Nivel declarado': nivel,
            'Exigencia declarada': exigencia}


def test_normalizacion_de_dominio_y_nivel():
    assert tx.dominio_de('CognitivoBAK') == 'Cognitivo' and tx.dominio_de('ProcedimentalB') == 'Procedimental'
    assert tx.dominio_de('Cognitivo()') == 'Cognitivo' and tx.dominio_de('') == ''
    assert tx.nivel_de('AnálisisBAK') == 'analisis' and tx.nivel_de('Conocimientos') == 'conocimiento'
    assert tx.nivel_de('Comprensión B') == 'comprension'


def test_contraste_cuatro_resultados():
    ra = [_ra('analizar', 'Cognitivo', 'analisis', exigencia=4.0),        # mismo dominio y nivel
          _ra('analizar', 'Cognitivo', 'comprension', exigencia=2.0),     # nivel declarado más bajo
          _ra('analizar', 'Actitudinal', 'valorar', 'BAK', 3.5),          # el dominio no es el de la base
          _ra('inventar', 'Cognitivo', 'analisis', exigencia=4.0)]        # verbo fuera de la base
    d = tx.contrastar(ra, BASE)
    assert list(d['Contraste']) == ['Coincide', 'Nivel difiere', 'Dominio difiere', 'Verbo fuera de la base']
    assert d.loc[1, 'Diferencia de nivel (declarado − base)'] == -2.0


def test_verbo_con_varias_lecturas_usa_el_dominio_declarado():
    d = tx.contrastar([_ra('evaluar', 'Cognitivo', 'evaluacion', exigencia=6.0)], BASE)
    assert d.loc[0, 'Contraste'] == 'Coincide' and d.loc[0, 'Dominio(s) según la base'] == 'Actitudinal, Cognitivo'


def test_indice_y_resumen():
    assert tx.indice_exigencia([1.0, 6.0]) == 50.0 and tx.indice_exigencia([None]) is None
    d = tx.contrastar([_ra('analizar', 'Cognitivo', 'analisis', exigencia=4.0)] * 3 +
                      [_ra('inventar', 'Cognitivo', 'analisis', exigencia=4.0)], BASE)
    r = tx.resumen_contraste(d)
    assert r['n'] == 4 and r['pct']['Coincide'] == 75.0 and r['pct']['Verbo fuera de la base'] == 25.0
    g = tx.por_grupo(d, 'Programa')
    assert g.loc[0, 'RA únicos'] == 4 and g.loc[0, '% Bloom'] == 100.0


@pytest.mark.skipif(not os.path.exists(MATRIZ) or not os.path.exists(tx.RUTA_BD), reason='sin matriz o base de verbos')
def test_matriz_real_ra_unicos_y_contraste():
    ra = tx.leer_ra([(os.path.basename(MATRIZ), MATRIZ)])
    assert len(ra) == 6                                  # RA únicos de MEDSTEM_VNAL (D4)
    d = tx.contrastar(ra, tx.cargar_base())
    assert set(d['Contraste']) <= set(tx.ESTADOS) and (d['Verbo'] != '').all()
    assert set(d['Taxonomía']) == {'BAK'}


def test_pdf_incluye_seccion_de_taxonomias():
    d = tx.contrastar([_ra('analizar', 'Cognitivo', 'analisis', exigencia=4.0)], BASE)
    resumen = tx.resumen_contraste(d)
    general = ip.informe_general({
        'alcance': 'x', 'kpis': [('RA', '1')], 'criterios': [], 'globales': {}, 'conteo_criterios': [], 'lectura': [],
        'prioridades': [], 'alertas': [], 'programas': [], 'tendencias': [],
        'taxonomias': {'resumen': resumen, 'por_programa': tx.por_grupo(d, 'Programa').to_dict('records')}})
    programa = ip.informe_programa({
        'programa': 'P', 'kpis': [('RA', '1')], 'criterios': [], 'matrices': [], 'tipo_saber': [],
        'tendencias_presentes': None, 'tendencias_ausentes': [], 'alertas': [],
        'taxonomias': {'matrices': [{'etiqueta': 'P - Presencial - Bogotá', 'ra': 1, 'taxonomia': 'Bloom 100 %',
                                     'exigencia': 60.0, 'mediana': 50.0, 'dominios': '1 / 0 / 0', 'pct': resumen['pct']}],
                       'revisar': [['P - Presencial - Bogotá', 'analizar', 'Cognitivo - analisis', 'Cognitivo - analisis',
                                    'Nivel difiere']]}})
    for pdf in (general, programa):
        assert pdf.startswith(b'%PDF') and len(pdf) > 2000
