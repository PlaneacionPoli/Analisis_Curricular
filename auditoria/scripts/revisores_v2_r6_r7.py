"""
Análisis pedidos por los revisores (Propuesta 2 de auditoria/Respuesta_revisores_propuestas.docx) sobre V2, R6, R7 y
el umbral de la Etapa 5. No cambia los resultados publicados; los complementa.

1. V2 léxico-semántica: similitud (modelo paraphrase-multilingual-MiniLM-L12-v2) entre competencias específicas de la
   misma matriz, sin el verbo rector. Se ubica cada par con verbo repetido en la distribución de todos los pares
   intra-matriz (percentil), y se cuentan los pares con verbo distinto por encima del P95, que la regla léxica no ve.
2. R6: IC 95 % de ρ de Spearman por bootstrap de conglomerados (programas completos).
3. R7: Kruskal-Wallis con p por permutación; submuestreo repetido de una matriz por programa; ε² con IC bootstrap
   por conglomerados; prueba exacta (Monte Carlo) de independencia sede × V2; diferencia mínima detectable (potencia 0,80)
   por simulación.
4. Etapa 5: número de asignaturas homónimas divergentes según el umbral (0,40–0,80).

Uso: python auditoria/scripts/revisores_v2_r6_r7.py
Salida: auditoria/evidencia_revisores_r.json
"""
import glob
import json
import os
import sys
import warnings
from itertools import combinations

import numpy as np
import pandas as pd
from scipy.stats import chi2_contingency, kruskal, spearmanr

warnings.filterwarnings('ignore')
os.environ.setdefault('HF_HUB_OFFLINE', '1')
sys.path.insert(0, '.')
sys.stdout.reconfigure(encoding='utf-8')
from src import indicadores_articulo as ia  # noqa: E402

RNG = np.random.default_rng(20261103)
EV = {'semilla': 20261103}

# ---------------------------------------------------------------- datos por matriz (mismo armado que contrastes_r6_r7.py)
v1 = pd.read_excel('auditoria/Asociacion_perfil_50_matrices.xlsx', sheet_name='Resumen')
d = pd.DataFrame({'matriz': v1['Matriz'], 'V1': 100 - v1['% sin asociación']})
v4 = pd.DataFrame(json.load(open('auditoria/evidencia_v4_alternativas.json', encoding='utf-8'))['por_matriz'])[['matriz', 'V4']]
d = d.merge(v4, on='matriz')
REP = {'Derecho_HMED', 'Derecho_VNAL', 'Ing.Telecomunicaciones_PBOG', 'IngSistemas_PBOG', 'IngSistemas_PMED'}
d['V2'] = d['matriz'].map(lambda m: 0.0 if m in REP else 100.0)
MAT = {}
for f in sorted(glob.glob('data/raw/FORMATOS RA CICLO UNO RC/*.xlsx')):
    m = ia._leer_matriz(os.path.basename(f), f)
    ev = ia._evaluar_matriz(m)
    niv = [e['nivel_max'][:2] if e['nivel_max'] else 'N0' for e in ev['estrategias']]
    MAT[ev['matriz']] = {'programa': ev['programa'], 'competencias': m['competencias'],
                         'V5': 100 * sum(x >= 'N2' for x in niv) / len(niv) if niv else 0.0}
d['V5'] = d['matriz'].map(lambda x: MAT[x]['V5'])
d['programa'] = d['matriz'].map(lambda x: MAT[x]['programa'])
d['sede'] = d['matriz'].str.rsplit('_', n=1).str[1]
assert len(d) == 50

# ---------------------------------------------------------------- 1. V2 léxico-semántica
from sentence_transformers import SentenceTransformer  # noqa: E402

modelo = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')


def sin_verbo(texto):
    partes = texto.split(maxsplit=1)
    return partes[1] if len(partes) > 1 else texto


pares = []
for mz, info in MAT.items():
    esp = [c for c in info['competencias'] if c['verbo'] and not c['generica']]
    if len(esp) < 2:
        continue
    E = modelo.encode([sin_verbo(c['texto']) for c in esp], normalize_embeddings=True, show_progress_bar=False)
    for i, j in combinations(range(len(esp)), 2):
        pares.append({'matriz': mz, 'mismo_verbo': esp[i]['verbo'] == esp[j]['verbo'], 'verbo_a': esp[i]['verbo'],
                      'verbo_b': esp[j]['verbo'], 'sim': float(E[i] @ E[j]),
                      'a': esp[i]['texto'][:160], 'b': esp[j]['texto'][:160]})
P = pd.DataFrame(pares)
assert set(P[P.mismo_verbo].matriz) == REP, set(P[P.mismo_verbo].matriz)
p50, p90, p95 = np.percentile(P.sim, [50, 90, 95])
P['percentil'] = P.sim.rank(pct=True) * 100
rep = P[P.mismo_verbo].sort_values('sim', ascending=False)
alto_dist = P[(~P.mismo_verbo) & (P.sim >= p95)]
EV['V2'] = {'pares_intra_matriz': len(P), 'matrices_con_pares': P.matriz.nunique(),
            'sim_P50': p50, 'sim_P90': p90, 'sim_P95': p95,
            'pares_mismo_verbo': rep[['matriz', 'verbo_a', 'sim', 'percentil', 'a', 'b']].to_dict('records'),
            'pares_mismo_verbo_sobre_P95': int((rep.sim >= p95).sum()),
            'pares_mismo_verbo_bajo_P50': int((rep.sim < p50).sum()),
            'pares_verbo_distinto_sobre_P95': len(alto_dist),
            'matrices_verbo_distinto_sobre_P95': alto_dist.matriz.nunique(),
            'ejemplos_verbo_distinto_sobre_P95': alto_dist.sort_values('sim', ascending=False).head(8)
            [['matriz', 'verbo_a', 'verbo_b', 'sim', 'a', 'b']].to_dict('records'),
            'matrices_alerta_regla_combinada_P95': sorted(set(P[P.sim >= p95].matriz))}
# Las matrices multisede repiten competencias: misma lectura con cada par de textos contado una vez
U = P.assign(clave=[tuple(sorted(t)) for t in zip(P.a, P.b)]).drop_duplicates('clave')
u50, u95 = np.percentile(U.sim, [50, 95])
EV['V2_pares_unicos'] = {'pares': len(U), 'mismo_verbo': int(U.mismo_verbo.sum()), 'sim_P50': u50, 'sim_P95': u95,
                         'mismo_verbo_sobre_P95': int((U.mismo_verbo & (U.sim >= u95)).sum()),
                         'mismo_verbo_bajo_P50': int((U.mismo_verbo & (U.sim < u50)).sum()),
                         'verbo_distinto_sobre_P95': int((~U.mismo_verbo & (U.sim >= u95)).sum())}
# Verbo declarado en el Paso 2 distinto del verbo con que empieza la redacción
EV['V2_verbo_inconsistente'] = sorted({(mz, c['verbo'], c['texto'].split()[0]) for mz, info in MAT.items()
                                       for c in info['competencias'] if c['verbo'] and not c['generica']
                                       and not c['texto'].startswith(c['verbo'][:4])})
print('V2:', {k: v for k, v in EV['V2'].items() if not isinstance(v, list)}, EV['V2_pares_unicos'], flush=True)

# ---------------------------------------------------------------- 2. R6: IC de Spearman por conglomerados
progs = d.programa.unique()
idx_prog = {p: d.index[d.programa == p].tolist() for p in progs}


def remuestra():
    return d.loc[[i for p in RNG.choice(progs, len(progs)) for i in idx_prog[p]]]


VAR = ['V1', 'V2', 'V4', 'V5']
boot = {f'{a}–{b}': [] for a, b in combinations(VAR, 2)}
for _ in range(5000):
    s = remuestra()
    for a, b in combinations(VAR, 2):
        rr = spearmanr(s[a], s[b])[0]
        if not np.isnan(rr):
            boot[f'{a}–{b}'].append(rr)
EV['R6'] = {k: {'rho': float(spearmanr(d[k.split('–')[0]], d[k.split('–')[1]])[0]),
                'IC95': [float(np.percentile(v, 2.5)), float(np.percentile(v, 97.5))]} for k, v in boot.items()}
print('R6:', EV['R6'], flush=True)

# ---------------------------------------------------------------- 3. R7
d49 = d[d.sede != 'HBOG'].reset_index(drop=True)
SEDES = sorted(d49.sede.unique())


def kw(df, v):
    g = [df.loc[df.sede == s, v].values for s in SEDES if (df.sede == s).sum() > 0]
    if len(g) < 2 or len(set(df[v])) < 2:
        return 0.0, 1.0, 0.0
    h, p = kruskal(*g)
    n, k = sum(map(len, g)), len(g)
    return h, p, max(0.0, (h - k + 1) / (n - k))


R7 = {'tamanos': d49.sede.value_counts().to_dict()}
for v in ['V1', 'V4', 'V5']:
    h0, p0, e0 = kw(d49, v)
    perm = np.array([kw(d49.assign(sede=RNG.permutation(d49.sede.values)), v)[0] for _ in range(10000)])
    sub = []
    for _ in range(1000):   # una matriz al azar por programa
        s = d49.groupby('programa', group_keys=False).apply(lambda g: g.sample(1, random_state=int(RNG.integers(1e9))))
        sub.append(kw(s, v)[1])
    eb = []
    for _ in range(2000):
        s = remuestra()
        s = s[s.sede != 'HBOG']
        if s.sede.nunique() == 4 and s.sede.value_counts().min() >= 2:
            eb.append(kw(s, v)[2])
    R7[v] = {'H': h0, 'p_asintotica': p0, 'p_permutacion': float((perm >= h0).mean()), 'epsilon2': e0,
             'epsilon2_IC95': [float(np.percentile(eb, 2.5)), float(np.percentile(eb, 97.5))],
             'submuestreo_p_mediana': float(np.median(sub)), 'submuestreo_prop_p<0,05': float(np.mean(np.array(sub) < 0.05))}
    print('R7', v, R7[v], flush=True)

# V2 dicotómica: prueba exacta de independencia sede × repetición (Monte Carlo del estadístico χ²)
tab = pd.crosstab(d49.sede, d49.V2 == 0)
chi0 = chi2_contingency(tab, correction=False)[0]
codigo = pd.Categorical(d49.sede, categories=SEDES).codes
rep_v = (d49.V2.values == 0).astype(int)
n_s = np.bincount(codigo, minlength=len(SEDES))
esperado = n_s * rep_v.mean()


def chi2_rep(x):
    obs = np.bincount(codigo, weights=x, minlength=len(SEDES))
    return float((((obs - esperado) ** 2) / esperado).sum() + (((n_s - obs) - (n_s - esperado)) ** 2 / (n_s - esperado)).sum())


assert abs(chi2_rep(rep_v) - chi0) < 1e-6
sims = [chi2_rep(RNG.permutation(rep_v)) for _ in range(100000)]
R7['V2'] = {'tabla': {s: {'con_repeticion': int(tab.loc[s, True]) if True in tab.columns else 0, 'n': int(tab.loc[s].sum())} for s in tab.index},
            'chi2': chi0, 'p_exacta_MonteCarlo': float((np.array(sims) >= chi0 - 1e-9).mean()), 'simulaciones': 100000}
print('R7 V2:', R7['V2'], flush=True)

# Diferencia mínima detectable (potencia 0,80; α = 0,05): valores remuestreados del conjunto, una sede desplazada hacia abajo
tam = d49.sede.value_counts()
mde = {}
for v in ['V1', 'V4']:
    pool = d49[v].values
    mde[v] = {}
    for s in SEDES:
        enc = None
        for delta in np.arange(0, 41, 1.0):
            pot = 0
            for _ in range(400):
                g = {x: RNG.choice(pool, tam[x]) for x in SEDES}
                g[s] = np.clip(g[s] - delta, 0, 100)
                pot += kruskal(*g.values())[1] < 0.05 if len({y for a in g.values() for y in a}) > 1 else 0
            if pot / 400 >= 0.80:
                enc = float(delta)
                break
        mde[v][s] = enc
    print('MDE', v, mde[v], flush=True)
R7['MDE_pp_potencia_0,80'] = mde
R7['desviacion_estandar'] = {v: float(d49[v].std()) for v in ['V1', 'V4', 'V5']}
EV['R7'] = R7

# ---------------------------------------------------------------- 4. Etapa 5: sensibilidad del umbral de divergencia
hom = json.load(open('auditoria/evidencia_asignaturas_compartidas.json', encoding='utf-8'))
sim = np.array([h['sim'] for h in hom])
EV['etapa5_homonimas'] = {'n': len(sim), 'por_umbral': {f'{u:.2f}': int((sim < u).sum()) for u in np.arange(0.40, 0.81, 0.05)},
                          'valores_entre_0,40_y_0,80': sorted(float(x) for x in sim if 0.40 <= x < 0.80)}


def r(x, nd=3):
    if isinstance(x, dict):
        return {str(k): r(v, nd) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [r(v, nd) for v in x]
    if isinstance(x, (float, np.floating)):
        return round(float(x), nd)
    if isinstance(x, (np.integer,)):
        return int(x)
    if isinstance(x, (np.bool_,)):
        return bool(x)
    return x


json.dump(r(EV), open('auditoria/evidencia_revisores_r.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('Listo: auditoria/evidencia_revisores_r.json')
