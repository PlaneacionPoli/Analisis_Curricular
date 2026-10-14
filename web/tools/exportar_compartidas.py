"""Referencia de paridad de «Familias Curriculares» (src/shared_subjects_analyzer.py) sobre el consolidado del dashboard.
Uso (raíz del repo): python -X utf8 web/tools/exportar_compartidas.py → web/tests/golden_compartidas.json (no se versiona)"""
import io, json, sys, warnings
from pathlib import Path
warnings.filterwarnings('ignore')
RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))
import dashboard_tematico as dt  # noqa: E402
from src import shared_subjects_analyzer as ssa  # noqa: E402


class Archivo(io.BytesIO):
    def __init__(self, ruta):
        super().__init__(ruta.read_bytes()); self.name = ruta.name


df, _ = dt.procesar_archivos([Archivo(p) for p in sorted((RAIZ / 'data' / 'raw' / '01_FormatosRA_ReformaCurricular').glob('FormatoRA*.xlsx'))])
asigs = ssa.consolidar_asignaturas(df)
homo = ssa.divergencia_homonimas(df)
pares = ssa.comparar_inter_programa(df)
distintos = pares[~pares['mismo_nombre']]
salida = {
    'n_asignaturas': len(asigs), 'claves': int(asigs['clave'].nunique()),
    'textos': [t for t in asigs['texto'].head(40)],
    'homonimas': homo.to_dict('records'),
    'n_pares': len(pares), 'n_pares_distintos': len(distintos), 'n_identicos': int((pares['categoria'] == 'IDENTICO').sum()),
    'pares_distintos_top': distintos.head(60)[['programa_a', 'sede_a', 'asignatura_a', 'programa_b', 'sede_b', 'asignatura_b', 'similitud']].to_dict('records'),
    'sims_ordenadas': [round(float(x), 4) for x in pares['similitud'].tolist()],
}
(RAIZ / 'web' / 'tests' / 'golden_compartidas.json').write_text(json.dumps(salida, ensure_ascii=False, default=str), encoding='utf-8')
print(salida['n_asignaturas'], salida['n_pares'], salida['n_pares_distintos'], len(salida['homonimas']))
