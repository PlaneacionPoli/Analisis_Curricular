"""Referencia de paridad de la regla de tendencias: términos activados por fila según src/tendencias.py.
Uso (raíz del repo): python -X utf8 web/tests/exportar_tendencias.py → web/tests/golden_tendencias.json (no se versiona)"""
import io, json, sys, warnings
from pathlib import Path
warnings.filterwarnings('ignore')
RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))
import dashboard_tematico as dt  # noqa: E402
from src.tendencias import cargar_config, terminos_presentes  # noqa: E402


class Archivo(io.BytesIO):
    def __init__(self, ruta):
        super().__init__(ruta.read_bytes()); self.name = ruta.name


carpeta = RAIZ / 'data' / 'raw' / '01_FormatosRA_ReformaCurricular'
df, _ = dt.procesar_archivos([Archivo(p) for p in sorted(carpeta.glob('FormatoRA*.xlsx'))])
T, regla = cargar_config()
filas = []
for _, r in df.iterrows():
    nombre = str(r['Nombre asignatura o modulo']).strip() if str(r['Nombre asignatura o modulo']) != 'nan' else ''
    texto = str(r['Texto_Completo']).lower()
    hits = {t: k for t, i in T.items() if (k := terminos_presentes(nombre, texto, i['keywords'], regla))}
    filas.append({'nombre': nombre, 'texto': texto, 'hits': hits})
(RAIZ / 'web' / 'tests' / 'golden_tendencias.json').write_text(json.dumps(filas, ensure_ascii=False), encoding='utf-8')
print(len(filas), 'filas;', sum(1 for f in filas if f['hits']), 'con tendencias')
