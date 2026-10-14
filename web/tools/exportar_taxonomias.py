"""Prepara los datos de «Taxonomías» para la versión HTML.
  web/public/data/taxonomias_bd.json   base de verbos (assets/taxonomias/Taxonomias_MatrizBD.xlsx, hoja «Verbos»)
  web/tests/golden_taxonomias.json     resultado de REFERENCIA de src/taxonomias_ra.py por matriz (no se versiona)
Uso (raíz del repo): python -X utf8 web/tools/exportar_taxonomias.py"""
import json, sys, warnings
from pathlib import Path
warnings.filterwarnings('ignore')
RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))
import pandas as pd  # noqa: E402
from src import taxonomias_ra as tx  # noqa: E402

d = pd.read_excel(tx.RUTA_BD, sheet_name='Verbos', engine='openpyxl')
d.columns = [tx._k(c) for c in d.columns]
filas = [[str(v), str(s), str(m)] for v, s, m in zip(d['verbo'], d['nombresubcategoria'], d['nombredominio'])]
(RAIZ / 'web' / 'public' / 'data' / 'taxonomias_bd.json').write_text(json.dumps(filas, ensure_ascii=False), encoding='utf-8')
print(len(filas), 'verbos')

carpeta = RAIZ / 'data' / 'raw' / '01_FormatosRA_ReformaCurricular'
ra = tx.contrastar(tx.leer_ra([(p.name, str(p)) for p in sorted(carpeta.glob('FormatoRA*.xlsx'))]), tx.cargar_base())
ra = ra.astype(object).where(ra.notna(), None)
(RAIZ / 'web' / 'tests' / 'golden_taxonomias.json').write_text(json.dumps(ra.to_dict('records'), ensure_ascii=False, default=str), encoding='utf-8')
print(len(ra), 'RA únicos')
