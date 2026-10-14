"""Referencia de paridad de la separación/limpieza de núcleos: celdas reales y resultado de src/nucleos_cleaner.py.
Uso (raíz del repo): python -X utf8 web/tests/exportar_nucleos.py   → web/tests/golden_nucleos.json (no se versiona)"""
import io, json, sys, warnings
from pathlib import Path
warnings.filterwarnings('ignore')
RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))
import dashboard_tematico as dt  # noqa: E402
from src.nucleos_cleaner import es_nucleo_valido, limpiar_nucleo, tokenizar_nucleo_celda  # noqa: E402


class Archivo(io.BytesIO):
    def __init__(self, ruta):
        super().__init__(ruta.read_bytes()); self.name = ruta.name


carpeta = RAIZ / 'data' / 'raw' / '01_FormatosRA_ReformaCurricular'
df, _ = dt.procesar_archivos([Archivo(p) for p in sorted(carpeta.glob('FormatoRA*.xlsx'))])
celdas = sorted({str(c) for c in df['Nucleos tematicos'].dropna()})
casos = []
for c in celdas:
    toks = tokenizar_nucleo_celda(c)
    val = [limpiar_nucleo(t) for t in toks if es_nucleo_valido(limpiar_nucleo(t))[0]]
    casos.append({'celda': c, 'tokens': toks, 'validos': val})
(RAIZ / 'web' / 'tests' / 'golden_nucleos.json').write_text(json.dumps(casos, ensure_ascii=False), encoding='utf-8')
print(len(casos), 'celdas')
