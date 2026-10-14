"""Datos y referencia de paridad de «Minería de Texto».
  web/public/data/stopwords_es.json   STOPWORDS_ES del dashboard
  web/tests/golden_nlp.json           resultados de analizar_nlp / calcular_similitud_asignaturas (no se versiona)
Uso (raíz del repo): python -X utf8 web/tools/exportar_nlp.py"""
import io, json, sys, warnings
from pathlib import Path
warnings.filterwarnings('ignore')
RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))
import numpy as np  # noqa: E402
from sklearn.cluster import AgglomerativeClustering  # noqa: E402
import dashboard_tematico as dt  # noqa: E402


class Archivo(io.BytesIO):
    def __init__(self, ruta):
        super().__init__(ruta.read_bytes()); self.name = ruta.name


(RAIZ / 'web' / 'public' / 'data' / 'stopwords_es.json').write_text(json.dumps(sorted(dt.STOPWORDS_ES), ensure_ascii=False), encoding='utf-8')
carpeta = RAIZ / 'data' / 'raw' / '01_FormatosRA_ReformaCurricular'
df, _ = dt.procesar_archivos([Archivo(p) for p in sorted(carpeta.glob('FormatoRA*.xlsx'))])
r = dt.analizar_nlp(df)
sim = dt.calcular_similitud_asignaturas(df)
sdf = sim['similitud_df']
dist = 1.0 - sdf.values.clip(0, 1); np.fill_diagonal(dist, 0.0)
grupos = {}
for k in (3, 5):
    lab = AgglomerativeClustering(n_clusters=k, metric='precomputed', linkage='average').fit_predict(dist)
    grupos[k] = [sorted(sdf.index[i] for i in range(len(lab)) if lab[i] == c) for c in range(k)]
prog = next(iter(r['top_por_programa']))
salida = {'stop': len(dt.STOPWORDS_ES), 'terminos': list(r['top_terminos'].items()), 'ngramas': list(r['top_ngrams'].items()),
          'programas': {p: list(v.items()) for p, v in r['top_por_programa'].items()}, 'par': sim['par_similar'], 'n_asig': sim['n_asignaturas'],
          'sim_muestra': sdf.iloc[:6, :6].round(6).values.tolist(), 'nombres': list(sdf.index), 'grupos': grupos}
(RAIZ / 'web' / 'tests' / 'golden_nlp.json').write_text(json.dumps(salida, ensure_ascii=False, default=str), encoding='utf-8')
print(len(r['top_por_programa']), 'programas;', sim['n_asignaturas'], 'asignaturas;', prog)
