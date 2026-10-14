"""Referencia de paridad de V1–V5 (src/indicadores_articulo.py) sin V1 (que depende del módulo de perfil).
  web/tests/golden_indicadores.json   (no se versiona)
Uso (raíz del repo): python -X utf8 web/tools/exportar_indicadores.py [carpeta con los FormatoRA*.xlsx]"""
import json, sys, warnings
from pathlib import Path
warnings.filterwarnings('ignore')
RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))
from src import indicadores_articulo as ia  # noqa: E402

carpeta = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / 'data' / 'raw' / '01_FormatosRA_ReformaCurricular'
res = ia.calcular_indicadores([(p.name, str(p)) for p in sorted(carpeta.glob('FormatoRA*.xlsx'))])
res['contrastes'] = ia.contrastes(res['por_matriz'])
res['referencias'] = ia.referencias_conjunto(res['por_matriz'])
res['valoracion'] = {m['Matriz']: ia.valorar_matriz(m, None, None, res['referencias']) for m in res['por_matriz']}
(RAIZ / 'web' / 'tests' / 'golden_indicadores.json').write_text(json.dumps(res, ensure_ascii=False, default=str), encoding='utf-8')
print(len(res['por_matriz']), 'matrices;', len(res['ra']), 'RA;', len(res['estrategias']), 'estrategias;', res['contrastes'])
