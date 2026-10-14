"""Datos de muestra de los informes PDF y los PDF que genera Python (referencia para comparar con la versión web).

Uso (desde la raíz del repo): python web/tools/exportar_informe_muestra.py <carpeta_salida>
Escribe muestra_informe.json (entrada común) y py_general.pdf / py_programa.pdf.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from src import indicadores_articulo as ia  # noqa: E402
from src import informes_pdf as ip  # noqa: E402

salida = Path(sys.argv[1])
salida.mkdir(parents=True, exist_ok=True)

FILA = {'Matriz': 'Prog_PBOG', 'Programa': 'Prog', 'Sede': 'PBOG', 'Competencias': 4, 'RA únicos': 10, 'Estrategias': 3,
        'V1 %': 80.0, 'RA con competencia %': 100.0, 'V2': 'No', 'Verbos repetidos': 'analizar', 'V3 %': 90.0, 'V4 %': 70.0,
        'RA sin estrategia': 3, 'V5 %': 100.0, 'Evidencia directa %': 0.0, 'Estrategias con indicador e instrumento': 2,
        'Indicadores por nivel': {'N1': 2, 'N2': 3}}
ref = ia.referencias_conjunto([FILA], {'Prog_PBOG': 45.0})
val = ia.valorar_matriz(FILA, 20.0, 45.0, ref, 30.0)
estados = {v['Variable']: v['Estado'] for v in val if v['Variable'] != '—'}
ESTADOS = ['Cumple', 'Parcial', 'No cumple', 'Sin dato']
prior = []
for i in range(34):
    e = {v: ESTADOS[(i + k) % 4] for k, v in enumerate(['V1', 'V2', 'V3', 'V4', 'V5'])}
    prior.append({'Matriz': f'P{i}_PBOG', 'Programa': f'Administración de Empresas con énfasis {i}', 'Modalidad': 'Presencial',
                  'Ciudad': 'Bogotá', **e, 'No cumple': sum(x == 'No cumple' for x in e.values()),
                  'Parcial': sum(x == 'Parcial' for x in e.values())})
general = {
    'alcance': 'Filtros: ninguno (conjunto completo)', 'kpis': [('Programas', '39'), ('Matrices', '50'), ('Asignaturas', '1.800'),
                                                                 ('RA únicos', '338'), ('Estrategias (Paso 4)', '412')],
    'criterios': [list(c) for c in ia.CRITERIOS],
    'globales': {'matrices': 50, 'V1': 96.2, 'V2': 90.0, 'V3': 100.0, 'V4': 87.0, 'V5': 95.0, 'atributos_perfil': 600, 'ra_unicos': 338, 'estrategias': 412},
    'conteo_criterios': [[f'{v} {e}', {'Cumple': 20, 'Parcial': 15, 'No cumple': 10, 'Sin dato': 5}] for v, e, _ in ia.CRITERIOS],
    'lectura': ['**30 de 50** matrices tienen al menos un criterio en «No cumple»; **2** cumplen los cinco criterios.',
                'Perfil de egreso: **10 de 600** atributos (2 %) sin alineación en ninguna capa – κ ≥ 0,4.'],
    'prioridades': prior, 'alertas': [{'Categoría': 'Tipo de Saber', 'Hallazgo': 'Programa X: SaberSer 5 % se aparta', 'Recomendación': 'Revisar.'}],
    'tendencias': [{'Tendencia': f'Tendencia {i}', 'Asignaturas': i, '% de asignaturas': i * 1.5, 'Programas': i, '% de programas': i * 2.0} for i in range(8)],
    'programas': [{'Programa': f'Programa {i}', 'Matrices': 1 + i % 3, 'Asignaturas': 40 + i, 'Saber': 40.0, 'SaberHacer': 35.5, 'SaberSer': 24.5,
                   'Tendencias': '9/12'} for i in range(25)],
    'errores': [{'archivo': 'X (V1)', 'causa': 'ningún atributo evaluable'}],
    'taxonomias': {'resumen': {'n': 338, 'pct': {'Coincide': 60.0, 'Nivel difiere': 20.0, 'Dominio difiere': 10.0, 'Verbo fuera de la base': 10.0}},
                   'por_programa': [{'Programa': f'Programa {i}', 'RA únicos': 9, '% Bloom': 80.0, '% BAK': 20.0, 'Índice de exigencia': 35.5,
                                     '% Coincide': 60.0, '% Nivel difiere': 20.0, '% Dominio difiere': 10.0, '% Verbo fuera de la base': 10.0} for i in range(6)]},
    'fecha': '2026-01-01 10:00'}
programa = {
    'programa': 'Programa – prueba de nombre largo para la portada', 'alcance': 'Sedes: PBOG, VNAL  |  Nivel: Pregrado  |  Modalidad: Presencial',
    'kpis': [('Matrices (sedes)', '2'), ('Asignaturas', '60'), ('RA únicos', '10'), ('Estrategias', '3'), ('Criterios en No cumple', '1')],
    'criterios': [list(c) for c in ia.CRITERIOS],
    'matrices': [{'matriz': 'Prog_PBOG', 'etiqueta': 'Programa - Presencial - Bogotá', 'sede': 'PBOG', 'valoracion': val,
                  'recomendaciones': ip.recomendaciones_matriz(estados, FILA, 2, 1, 1),
                  'sin_alineacion': [['Profesional', 'Funciones', 'Gestionar proyectos de largo aliento con enfoque territorial']],
                  'ra_no_evaluables': [['Comprender la teoría', 'verbo no observable']], 'ra_sin_estrategia': ['Diseñar planes'],
                  'estrategias_incompletas': [['Proyecto', 'instrumento']]}],
    'tipo_saber': [{'Tipo': 'Saber', 'Programa': 40.0, 'Mediana': 33.3}, {'Tipo': 'SaberHacer', 'Programa': None, 'Mediana': None}],
    'tendencias_presentes': ['IA', 'Sostenibilidad'], 'tendencias_ausentes': ['Blockchain'], 'alertas': ['3 registros sin semestre.'],
    'taxonomias': {'matrices': [{'etiqueta': 'Programa - Presencial - Bogotá', 'ra': 10, 'taxonomia': 'Bloom 80 % / BAK 20 %', 'exigencia': 35.5, 'mediana': 33.0,
                                 'dominios': '6 / 3 / 1', 'pct': {'Coincide': 60.0, 'Nivel difiere': 20.0, 'Dominio difiere': 10.0, 'Verbo fuera de la base': 10.0}}],
                   'revisar': [['Programa - Presencial - Bogotá', 'Analizar', 'Cognitivo - Aplicación', 'Cognitivo - Análisis', 'Nivel difiere']]},
    'fecha': '2026-01-01 10:00'}
(salida / 'muestra_informe.json').write_text(json.dumps({'general': general, 'programa': programa}, ensure_ascii=False), encoding='utf-8')
(salida / 'py_general.pdf').write_bytes(ip.informe_general(general))
(salida / 'py_programa.pdf').write_bytes(ip.informe_programa(programa))
print('ok', salida)
