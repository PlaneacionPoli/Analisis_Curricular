"""
Diagnósticos descriptivos de la formulación de los RA (pregunta 3 de los revisores; V3 pasa a condición del
instrumento). Deterministas y sin umbrales: cada RA cumple o no una condición verificable.

Unidad: RA único por matriz (D23: texto normalizado), 338 en las 50 matrices.
  D1 Coherencia nivel–verbo: el verbo declarado (Paso 3, «Verbo RA») está en la lista del nivel declarado («Nivel
     Dominio») de la hoja «Taxonomias para RA» de la propia matriz, que alimenta sus listas desplegables. Un RA es
     coherente si lo son todas sus filas. Como referencia se informa también el contraste con la taxonomía
     institucional consolidada (data/raw/Taxonomias_MatrizBD.xlsx), cuyas listas difieren de las de las matrices.
  D2 Verbo de la redacción: la redacción del RA empieza con el verbo declarado (misma raíz: infinitivo sin -ar/-er/-ir).
  D3 Acción única: el verbo principal de la cláusula principal (antes de la primera finalidad: «para», «mediante»…)
     no tiene otro verbo coordinado (spaCy: dependencia conj con el verbo raíz). Los verbos de oraciones subordinadas
     («que apoyen») no cuentan.
  D4 Tipo de finalidad: producto evaluable explícito (regla PRODUCTO de src/indicadores_articulo.py) o solo
     finalidad verbal («para + verbo»).

Uso: python auditoria/scripts/revisores_v3_diagnosticos.py
Salida: auditoria/evidencia_revisores_v3.json y auditoria/Diagnosticos_RA_V3.xlsx
"""
import glob
import json
import logging
import os
import re
import sys
import warnings
from collections import Counter

import openpyxl
import pandas as pd

warnings.filterwarnings('ignore')
logging.disable(logging.CRITICAL)
os.environ.setdefault('HF_HUB_OFFLINE', '1')
sys.path.insert(0, '.')
sys.stdout.reconfigure(encoding='utf-8')
from src import asociacion_perfil as ap  # noqa: E402
from src import indicadores_articulo as ia  # noqa: E402

wb = openpyxl.load_workbook('data/raw/Taxonomias_MatrizBD.xlsx', read_only=True)
VERBOS_NIVEL = {}
for r in wb['Verbos'].iter_rows(min_row=2, values_only=True):
    if r[1] and r[3]:
        VERBOS_NIVEL.setdefault(ia._norm(r[3]), set()).add(ia._norm(r[1]))
TODOS = set().union(*VERBOS_NIVEL.values())


def nivel(declarado):
    n = ia._norm(declarado or '')
    n = re.sub(r'(bak|b)$', '', n).strip()
    return {'conocimientos': 'conocimiento'}.get(n, n)


CONECTOR = re.compile(r'\b(?:para|mediante|a traves de|con el fin de|con el proposito de)\b')
nlp = ap._nlp()

def listas_matriz(w):
    """Nivel declarado normalizado (p. ej. «aplicacionb») → verbos de su columna en «Taxonomias para RA»."""
    rows = list(w['Taxonomias para RA'].iter_rows(values_only=True))
    cab = next(i for i, r in enumerate(rows) if any(isinstance(x, str) and ia._norm(x) == 'conocimientob' for x in r[7:]))
    out = {}
    for j, h in enumerate(rows[cab]):
        if isinstance(h, str) and re.search(r'(b|bak)$', ia._norm(h)) and j >= 7:
            out.setdefault(ia._norm(h), set()).update(ia._norm(r[j]) for r in rows[cab + 1:] if j < len(r) and ia._ne(r[j]))
    return out


filas = {}
for f in sorted(glob.glob('data/raw/FORMATOS RA CICLO UNO RC/*.xlsx')):
    matriz = ia.nombre_matriz(os.path.basename(f))[0]
    w = openpyxl.load_workbook(f, read_only=True, data_only=True)
    LISTAS = listas_matriz(w)
    ws = next(x for x in w.worksheets if x.title.startswith('Paso 3'))
    for r in ws.iter_rows(min_row=3, values_only=True):
        if len(r) < 9 or not ia._ne(r[8]) or ia._norm(r[8]) == 'resultados aprendizaje' or str(r[8]).strip().startswith('['):
            continue
        clave = (matriz, ia._norm(r[8]))
        d = filas.setdefault(clave, {'Matriz': matriz, 'RA': str(r[8]).strip(), 'Taxonomía': r[4], 'Tipos': set(),
                                     'Niveles': set(), 'Verbos': set(), 'coherente': True, 'coherente_inst': True,
                                     'nivel_sin_lista': False, 'verbo_fuera': False})
        d['Tipos'].add(str(r[2]).strip() if r[2] else '')
        nv, vb = nivel(r[6]), ia._norm(r[7] or '')
        d['Niveles'].add(str(r[6]).strip() if r[6] else '')
        d['Verbos'].add(vb)
        lista = LISTAS.get(ia._norm(r[6] or ''))
        if lista is None:
            d['nivel_sin_lista'] = True
        if lista is None or vb not in lista:
            d['coherente'] = False
        if vb not in TODOS:
            d['verbo_fuera'] = True
        if vb not in VERBOS_NIVEL.get(nv, set()):
            d['coherente_inst'] = False
    w.close()

assert len(filas) == 338, len(filas)
out = []
for d in filas.values():
    t = ia._norm(d['RA'])
    primera = t.split()[0] if t else ''
    # raíz = infinitivo sin -ar/-er/-ir («usar» → «us» ~ «usa»; «reconocer» → «reconoc» ~ «reconoce»)
    d2 = any(primera.startswith(v[:-2] if re.search(r'(ar|er|ir)$', v) else v[:4]) for v in d['Verbos'] if v)
    principal = CONECTOR.split(d['RA'].lower(), maxsplit=1)[0]
    doc = nlp(principal)
    raiz = next((tok for tok in doc if tok.dep_ == 'ROOT'), None)
    verbos = [raiz.text] if raiz is not None else []
    verbos += [tok.text for tok in doc if raiz is not None and tok.head == raiz and tok.dep_ == 'conj' and tok.pos_ == 'VERB']
    d4 = 'Producto explícito' if ia.PRODUCTO.search(t) else ('Finalidad verbal' if ia.FINALIDAD.search(t) else 'Sin finalidad')
    out.append({'Matriz': d['Matriz'], 'RA': d['RA'], 'Taxonomía': d['Taxonomía'], 'Tipo de saber': ', '.join(sorted(d['Tipos'])),
                'Nivel declarado': ', '.join(sorted(d['Niveles'])), 'Verbo declarado': ', '.join(sorted(d['Verbos'])),
                'D1 nivel–verbo coherente': d['coherente'], 'Nivel sin lista en la matriz': d['nivel_sin_lista'],
                'D1 contra taxonomía institucional': d['coherente_inst'], 'Verbo fuera de la taxonomía': d['verbo_fuera'],
                'D2 redacción con el verbo declarado': d2, 'Verbos en la cláusula principal': len(verbos),
                'D3 acción única': len(verbos) <= 1, 'Verbos detectados': ', '.join(verbos), 'D4 tipo de finalidad': d4})
D = pd.DataFrame(out)


def pct(s):
    return round(100 * s.mean(), 1)


EV = {'RA_unicos': len(D),
      'D1_coherencia_nivel_verbo_%': pct(D['D1 nivel–verbo coherente']),
      'D1_incoherentes': int((~D['D1 nivel–verbo coherente']).sum()),
      'D1_nivel_sin_lista': int(D['Nivel sin lista en la matriz'].sum()),
      'D1_contra_taxonomia_institucional_%': pct(D['D1 contra taxonomía institucional']),
      'verbo_fuera_taxonomia': int(D['Verbo fuera de la taxonomía'].sum()),
      'verbos_fuera_taxonomia': dict(Counter(v for x in D[D['Verbo fuera de la taxonomía']]['Verbo declarado'] for v in x.split(', ')
                                             if v not in TODOS)),
      'D2_redaccion_con_verbo_%': pct(D['D2 redacción con el verbo declarado']),
      'D2_no_coinciden': int((~D['D2 redacción con el verbo declarado']).sum()),
      'D3_accion_unica_%': pct(D['D3 acción única']),
      'D3_compuestos': int((~D['D3 acción única']).sum()),
      'D4_tipo_finalidad': D['D4 tipo de finalidad'].value_counts().to_dict(),
      'por_taxonomia': {t: {'n': len(g), 'D1_%': pct(g['D1 nivel–verbo coherente']), 'D3_%': pct(g['D3 acción única']),
                            'producto_%': round(100 * (g['D4 tipo de finalidad'] == 'Producto explícito').mean(), 1)}
                        for t, g in D.groupby('Taxonomía')},
      'matrices_con_algun_incoherente_D1': int(D.groupby('Matriz')['D1 nivel–verbo coherente'].apply(lambda s: (~s).any()).sum())}
with pd.ExcelWriter('auditoria/Diagnosticos_RA_V3.xlsx') as xw:
    D.to_excel(xw, sheet_name='RA', index=False)
    pd.DataFrame([{'Diagnóstico': k, 'Valor': json.dumps(v, ensure_ascii=False) if isinstance(v, dict) else v}
                  for k, v in EV.items()]).to_excel(xw, sheet_name='Resumen', index=False)
json.dump(EV, open('auditoria/evidencia_revisores_v3.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(EV, ensure_ascii=False, indent=1))
print(D[~D['D1 nivel–verbo coherente']][['Matriz', 'Nivel declarado', 'Verbo declarado']].head(15).to_string())
print(D[~D['D3 acción única']][['RA', 'Verbos detectados']].head(8).to_string())
