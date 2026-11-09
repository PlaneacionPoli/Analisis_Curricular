"""
Análisis pedidos por los revisores sobre el método de asociación del perfil (V1), Propuesta 2 de
auditoria/Respuesta_revisores_propuestas.docx. No cambia los parámetros del aplicativo.

1. Matriz de confusión y métricas por clase (acuerdo, κ, AC1 de Gwet, PABAK, sensibilidad, especificidad, F1).
2. Validación cruzada anidada dejando fuera una matriz (11 particiones): se calibra con 10 y se evalúa en la excluida.
3. IC 95 % por bootstrap en dos etapas (matrices y, dentro de ellas, atributos), que respeta la dependencia de las
   tres decisiones de un mismo atributo.
4. Ablación frente a líneas base deterministas: solo cobertura léxica, solo similitud semántica, sin sinónimos,
   sin familias de palabras y léxico simple (sin sinónimos, familias ni regla de rol). Cada variante se calibra
   con la misma rejilla y el mismo objetivo que el método.
5. Sensibilidad: acuerdo y κ en la calibración, y % de atributos sin alineación en las 50 matrices, en una rejilla
   alrededor de los parámetros vigentes.

Uso: python auditoria/scripts/revisores_validacion_v1.py
Salida: auditoria/evidencia_revisores_v1.json
"""
import glob
import json
import logging
import os
import sys
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings('ignore')
logging.disable(logging.CRITICAL)
os.environ.setdefault('HF_HUB_OFFLINE', '1')
sys.path.insert(0, '.')
sys.stdout.reconfigure(encoding='utf-8')
import src.asociacion_perfil as ap  # noqa: E402
from src.calibracion_asociacion import EXPLICITA, PARCIAL, SEMANTICA, casos_desde_referencia, leer_referencia  # noqa: E402

RAIZ = 'data/raw/FORMATOS RA CICLO UNO RC/FormatoRA_'
RNG = np.random.default_rng(20261103)
B = 2000

# Caché de embeddings: las variantes léxicas recalculan puntajes, pero los textos no cambian
_cache, _embed0 = {}, ap._embed


def _embed(textos):
    falta = [t for t in dict.fromkeys(textos) if t not in _cache]
    if falta:
        for t, v in zip(falta, _embed0(falta)):
            _cache[t] = v
    return np.array([_cache[t] for t in textos]) if textos else np.zeros((0, 384))


ap._embed = _embed
BASE_CFG = {'SINONIMOS': ap.SINONIMOS, 'RAIZ': ap.RAIZ, 'FACTOR_ROL': ap.FACTOR_ROL, 'AGENTE_IRREGULAR': ap.AGENTE_IRREGULAR}
ref = leer_referencia('auditoria/referencia_asociacion_perfil.csv')
fuentes = {m: RAIZ + m + '.xlsx' for m in ref['Matriz'].unique()}


def casos_con(**cfg):
    for k, v in {**BASE_CFG, **cfg}.items():
        setattr(ap, k, v)
    casos, faltan = casos_desde_referencia(ref, fuentes)
    for k, v in BASE_CFG.items():
        setattr(ap, k, v)
    assert not faltan, faltan
    return casos


# ---------------------------------------------------------------- predicción y calibración vectorizadas
def preparar(casos, nucleo):
    largos = [max(len(c[5]), 1) for c in casos]
    ini = np.concatenate([[0], np.cumsum(largos)[:-1]])
    pad = lambda a: a if len(a) else np.zeros(1)  # noqa: E731
    C = np.concatenate([pad(c[4] if nucleo else c[3]) for c in casos])
    S = np.concatenate([pad(c[5]) for c in casos])
    return C, S, ini


def predecir(casos, prm):
    C, S, ini = preparar(casos, prm['nucleo'])
    return np.logical_or.reduceat((C >= prm['explicita']) | ((C >= prm['parcial']) & (S >= prm['semantica'])), ini).astype(int)


def kappa(y, p):
    po = (y == p).mean()
    pe = y.mean() * p.mean() + (1 - y.mean()) * (1 - p.mean())
    return 0.0 if pe >= 1 else (po - pe) / (1 - pe)


def rejilla(regla):
    """Combinaciones (explícita, parcial, semántica) según la regla de la variante."""
    if regla == 'solo_lexico':      # sin vía semántica
        return [(e, e, 9.0) for e in EXPLICITA]
    if regla == 'solo_semantico':   # sin vía léxica: basta la similitud
        return [(9.0, -1.0, s) for s in SEMANTICA]
    return [(e, pa, s) for e in EXPLICITA for pa in PARCIAL[PARCIAL <= e] for s in SEMANTICA]


def calibrar(casos, regla='completo'):
    """Mismo objetivo que src/calibracion_asociacion.calibrar: κ promedio por enfoque, desempate por acuerdo."""
    y = np.array([c[6] for c in casos])
    enf = np.array([c[0] for c in casos])
    grupos = [np.where(enf == e)[0] for e in sorted(set(enf))]
    mejor = None
    for nucleo in (False, True):
        C, S, ini = preparar(casos, nucleo)
        for e, pa, s in rejilla(regla):
            pr = np.logical_or.reduceat((C >= e) | ((C >= pa) & (S >= s)), ini).astype(int)
            obj = (round(float(np.mean([kappa(y[g], pr[g]) for g in grupos])), 4), float((pr == y).mean()))
            if mejor is None or obj > mejor[0]:
                mejor = (obj, {'explicita': float(e), 'parcial': float(pa), 'semantica': float(s), 'nucleo': nucleo})
    return mejor[1]


def metricas(y, p):
    y, p = np.asarray(y), np.asarray(p)
    vp, fp = int(((p == 1) & (y == 1)).sum()), int(((p == 1) & (y == 0)).sum())
    fn, vn = int(((p == 0) & (y == 1)).sum()), int(((p == 0) & (y == 0)).sum())
    n = len(y)
    po = (vp + vn) / n
    q = (y.mean() + p.mean()) / 2
    pe_g = 2 * q * (1 - q)
    div = lambda a, b: a / b if b else float('nan')  # noqa: E731
    sens, esp, prec, vpn = div(vp, vp + fn), div(vn, vn + fp), div(vp, vp + fp), div(vn, vn + fn)
    return {'n': n, 'VP': vp, 'FP': fp, 'FN': fn, 'VN': vn, 'acuerdo': po, 'kappa': kappa(y, p),
            'AC1': div(po - pe_g, 1 - pe_g), 'PABAK': 2 * po - 1, 'sensibilidad': sens, 'especificidad': esp,
            'precision': prec, 'VPN': vpn, 'F1_pos': div(2 * prec * sens, prec + sens), 'F1_neg': div(2 * vpn * esp, vpn + esp),
            'exactitud_balanceada': (sens + esp) / 2, 'metodo_%': 100 * p.mean(), 'referencia_%': 100 * y.mean()}


def por_capa(casos, p):
    y = np.array([c[6] for c in casos])
    capa = np.array([c[2] for c in casos])
    out = {k: metricas(y[capa == k], p[capa == k]) for k in ap.CAPAS}
    out['Global'] = metricas(y, p)
    return out


def lomo(casos, regla='completo'):
    """Validación cruzada anidada dejando fuera una matriz: predicciones fuera de la muestra y parámetros por partición."""
    p = np.zeros(len(casos), dtype=int)
    mat = np.array([c[1] for c in casos])
    prms, por_matriz = {}, {}
    for m in sorted(set(mat)):
        dentro = [c for c, mm in zip(casos, mat) if mm != m]
        fuera = [c for c, mm in zip(casos, mat) if mm == m]
        prm = calibrar(dentro, regla)
        pf = predecir(fuera, prm)
        p[mat == m] = pf
        prms[m] = prm
        por_matriz[m] = metricas([c[6] for c in fuera], pf)
    return p, prms, por_matriz


def bootstrap(casos, p, b=B):
    """IC 95 % en dos etapas: matrices con reemplazo y, dentro de cada una, atributos con reemplazo."""
    y = np.array([c[6] for c in casos])
    mat = np.array([c[1] for c in casos])
    att = np.array([f'{c[1]}|{c[7]}' for c in casos])
    idx_att = {}
    for i, (m, a) in enumerate(zip(mat, att)):
        idx_att.setdefault(m, {}).setdefault(a, []).append(i)
    mats = sorted(idx_att)
    claves = ['acuerdo', 'kappa', 'AC1', 'sensibilidad', 'especificidad', 'F1_neg']
    res = {k: [] for k in claves}
    for _ in range(b):
        sel = []
        for m in RNG.choice(mats, len(mats)):
            atts = list(idx_att[m].values())
            for j in RNG.integers(0, len(atts), len(atts)):
                sel += atts[j]
        mt = metricas(y[sel], p[sel])
        for k in claves:
            res[k].append(mt[k])
    return {k: [float(np.nanpercentile(v, 2.5)), float(np.nanpercentile(v, 97.5))] for k, v in res.items()}


def r(x, d=3):
    if isinstance(x, dict):
        return {k: r(v, d) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [r(v, d) for v in x]
    if isinstance(x, (float, np.floating)):
        return round(float(x), d)
    return x


EV = {'semilla': 20261103, 'bootstrap_B': B}

# ---------------------------------------------------------------- 1–3: método vigente
print('Puntajes de las 11 matrices de calibración…', flush=True)
CASOS = casos_con()
PRM = dict(ap.PARAMS)
p_in = predecir(CASOS, PRM)
EV['parametros_vigentes'] = PRM
EV['dentro_muestra'] = por_capa(CASOS, p_in)
assert abs(EV['dentro_muestra']['Global']['acuerdo'] - 0.801) < 0.002, EV['dentro_muestra']['Global']
EV['dentro_muestra_IC95'] = bootstrap(CASOS, p_in)
print('Dentro de la muestra:', r(EV['dentro_muestra']['Global']), flush=True)

print('Validación cruzada dejando fuera una matriz…', flush=True)
p_out, prms_out, pm_out = lomo(CASOS)
EV['lomo'] = por_capa(CASOS, p_out)
EV['lomo_IC95'] = bootstrap(CASOS, p_out)
EV['lomo_por_matriz'] = pm_out
EV['lomo_parametros'] = prms_out
ac = [v['acuerdo'] for v in pm_out.values()]
ks = [v['kappa'] for v in pm_out.values()]
EV['lomo_dispersion'] = {'acuerdo_media': np.mean(ac), 'acuerdo_min': min(ac), 'acuerdo_max': max(ac),
                         'kappa_media': np.mean(ks), 'kappa_min': min(ks), 'kappa_max': max(ks),
                         'particiones_con_parametros_vigentes': sum(v == PRM for v in prms_out.values())}
print('Fuera de la muestra (LOMO):', r(EV['lomo']['Global']), flush=True)

# ---------------------------------------------------------------- 4: ablación
print('Ablación…', flush=True)
VARIANTES = {
    'Método completo': (CASOS, 'completo'),
    'Solo cobertura léxica (sin similitud semántica)': (CASOS, 'solo_lexico'),
    'Solo similitud semántica (sin cobertura léxica)': (CASOS, 'solo_semantico'),
    'Sin equivalencias de dominio (sinónimos)': (casos_con(SINONIMOS={}), 'completo'),
    'Sin familias de palabras': (casos_con(RAIZ=99), 'completo'),
    'Léxico simple (sin sinónimos, familias ni regla de rol)': (casos_con(SINONIMOS={}, RAIZ=99, FACTOR_ROL=1.0, AGENTE_IRREGULAR={}), 'solo_lexico'),
}
EV['ablacion'] = {}
for nombre, (cs, regla) in VARIANTES.items():
    prm = PRM if nombre == 'Método completo' else calibrar(cs, regla)
    pi = predecir(cs, prm)
    po_, _, _ = lomo(cs, regla)
    EV['ablacion'][nombre] = {'parametros': prm, 'dentro': metricas([c[6] for c in cs], pi)['kappa'],
                              'dentro_acuerdo': metricas([c[6] for c in cs], pi)['acuerdo'],
                              'lomo': metricas([c[6] for c in cs], po_)}
    print(' ', nombre, r(EV['ablacion'][nombre]['lomo']['kappa']), flush=True)

# ---------------------------------------------------------------- 5: sensibilidad
print('Sensibilidad en la calibración…', flush=True)
y = np.array([c[6] for c in CASOS])
SEM_G = [0.50, 0.54, 0.58, 0.62, 0.66]
EXP_G = [0.15, 0.20, 0.25, 0.30, 0.35]
EV['sensibilidad_calibracion'] = [{'explicita': e, 'semantica': s, **{k: metricas(y, predecir(CASOS, {**PRM, 'explicita': e, 'semantica': s}))[k]
                                   for k in ('acuerdo', 'kappa', 'especificidad')}}
                                  for e in EXP_G for s in SEM_G]

print('Puntajes de las 50 matrices…', flush=True)
TODAS = []   # (matriz, idx_item, capa, cob, cob_n, sem)
for f in sorted(glob.glob(RAIZ + '*.xlsx')):
    mz = os.path.basename(f)[len('FormatoRA_'):-5]
    m = ap.leer_matriz(f)
    items = ap.items_perfil(m)
    P = ap.puntajes(m, items)
    for i, it in enumerate(items):
        if not ap.evaluable(it['item']):
            continue
        for capa in ap.CAPAS:
            # misma deduplicación que ap.resumen_items: (perfil, origen, texto)
            TODAS.append((mz, f"{it['perfil']}|{it['origen']}|{it['item']}", capa, P[capa]['cob'][i], P[capa]['cob_n'][i], P[capa]['sem'][i]))
    print('  ok', mz, flush=True)
pseudo = [(None, t[0], t[2], t[3], t[4], t[5], 0, None, None, None) for t in TODAS]
clave_item = np.array([f'{t[0]}|{t[1]}' for t in TODAS])


def sin_alineacion(prm):
    pr = predecir(pseudo, prm)
    df = pd.DataFrame({'item': clave_item, 'p': pr, 'matriz': [t[0] for t in TODAS]}).groupby(['matriz', 'item']).p.max().reset_index()
    pm = 100 * df.groupby('matriz').p.mean()
    return {'atributos': len(df), 'sin_alineacion_%': 100 * (1 - df.p.mean()), 'V1_min': pm.min(), 'V1_mediana': pm.median()}


base50 = sin_alineacion(PRM)
EV['base_50'] = base50
assert base50['atributos'] == 2574 and abs(base50['sin_alineacion_%'] - 3.8) < 0.06, base50
EV['sensibilidad_50'] = [{'explicita': e, 'semantica': s, **sin_alineacion({**PRM, 'explicita': e, 'semantica': s})}
                         for e in EXP_G for s in SEM_G]
EV['parametros_lomo_en_50'] = {m: sin_alineacion(prm)['sin_alineacion_%'] for m, prm in prms_out.items()}

json.dump(r(EV), open('auditoria/evidencia_revisores_v1.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('Listo: auditoria/evidencia_revisores_v1.json')
