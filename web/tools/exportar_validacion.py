"""Referencia de paridad de la validación del perfil (src/calibracion_asociacion.py) sobre auditoria/referencia_asociacion_perfil.csv.
Uso (raíz del repo): python -X utf8 web/tools/exportar_validacion.py → web/tests/golden_validacion.json (no se versiona)"""
import json, sys, warnings
from pathlib import Path
warnings.filterwarnings('ignore')
RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))
from src import asociacion_perfil as ap  # noqa: E402
from src import calibracion_asociacion as ca  # noqa: E402

ap.aplicar_config(ap.cargar_config())
carpeta = RAIZ / 'data' / 'raw' / 'FORMATOS RA CICLO UNO RC'
fuentes = {ap._nombre_matriz(p.name) if hasattr(ap, '_nombre_matriz') else p.stem.replace('FormatoRA_', ''): str(p) for p in carpeta.glob('FormatoRA*.xlsx')}
ref = ca.leer_referencia(str(RAIZ / 'auditoria' / 'referencia_asociacion_perfil.csv'))
r = ca.validar(ref, fuentes, recalibrar=True)
r['sin_emparejar'] = [list(x) for x in r['sin_emparejar']]
(RAIZ / 'web' / 'tests' / 'golden_validacion.json').write_text(json.dumps(r, ensure_ascii=False, default=str), encoding='utf-8')
print(json.dumps({k: r[k] for k in ('casos', 'parametros_propuestos')}), r['metricas_activas']['Global'], r['metricas_propuestas']['Global'], len(r['sin_emparejar']))
