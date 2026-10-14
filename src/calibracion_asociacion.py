"""
Validación y calibración de src/asociacion_perfil.py contra una lectura de referencia de la institución.

Referencia (CSV, separador «;»): Matriz;Enfoque;Inicio_item;Competencia;RA;Asignatura[;Fuente]
  Matriz       nombre de la matriz sin «FormatoRA_» ni extensión (p. ej., AdmonEmpresas_PBOG).
  Inicio_item  comienzo del atributo, sin tildes ni mayúsculas, suficiente para identificarlo.
  Competencia, RA, Asignatura: 1 = respaldo explícito o parcial en esa capa; 0 = no.

La calibración recorre una rejilla de umbrales y elige la combinación que maximiza el kappa promedio por enfoque
(cada tipo de programa pesa lo mismo; desempate por acuerdo). Lo usan el aplicativo y
auditoria/scripts/calibrar_asociacion_perfil.py.
"""
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

from src import asociacion_perfil as ap

EXPLICITA = np.round(np.arange(0.15, 0.81, 0.05), 2)
PARCIAL = np.round(np.arange(0.05, 0.41, 0.05), 2)
SEMANTICA = np.round(np.arange(0.30, 0.86, 0.04), 2)
COLUMNAS_REFERENCIA = ('Matriz', 'Enfoque', 'Inicio_item', 'Competencia', 'RA', 'Asignatura')


def leer_referencia(fuente) -> pd.DataFrame:
    ref = pd.read_csv(fuente, sep=';', dtype=str)
    faltan = [c for c in COLUMNAS_REFERENCIA if c not in ref.columns]
    if faltan:
        raise ValueError(f'La referencia no tiene las columnas: {", ".join(faltan)}')
    for c in ap.CAPAS:
        ref[c] = ref[c].astype(int)
    return ref


def casos_desde_referencia(ref: pd.DataFrame, fuentes: Dict[str, object]) -> Tuple[List[tuple], List[tuple]]:
    """Casos (enfoque, matriz, capa, cob, cob_n, sem, y, item, cob_d, cob_nd) de las matrices de la referencia
    disponibles en `fuentes` (nombre de matriz → ruta o archivo). Devuelve también los ítems sin emparejar."""
    casos, faltan = [], []
    for (matriz, enfoque), g in ref.groupby(['Matriz', 'Enfoque']):
        if matriz not in fuentes:
            faltan += [(matriz, i) for i in g['Inicio_item']]
            continue
        m = ap.leer_matriz(fuentes[matriz])
        items = ap.items_perfil(m)
        P = ap.puntajes(m, items)
        norm = [ap._norm(it['item']) for it in items]
        for _, r in g.iterrows():
            i = next((i for i, n in enumerate(norm) if n.startswith(r['Inicio_item'])), None)
            if i is None:
                faltan.append((matriz, r['Inicio_item']))
                continue
            for capa in ap.CAPAS:
                casos.append((enfoque, matriz, capa, P[capa]['cob'][i], P[capa]['cob_n'][i], P[capa]['sem'][i], r[capa],
                              items[i]['item'], P[capa]['cob_d'][i], P[capa]['cob_nd'][i]))
    return casos, faltan


def pred(caso, prm) -> int:
    _, _, capa, cob, cob_n, sem, _, _, cob_d, cob_nd = caso
    c = cob_n if prm['nucleo'] else cob
    return int(((c >= prm['explicita']) | ((c >= prm['parcial']) & (sem >= prm['semantica']))).any())


def kappa(y, p) -> float:
    y, p = np.array(y), np.array(p)
    po, pe = (y == p).mean(), y.mean() * p.mean() + (1 - y.mean()) * (1 - p.mean())
    return round(float((po - pe) / (1 - pe)), 3) if pe < 1 else float('nan')


def calibrar(casos) -> Dict:
    """Parámetros que maximizan el kappa PROMEDIO por enfoque (desempate por acuerdo). Evaluación vectorizada."""
    y = np.array([c[6] for c in casos])
    enf = np.array([c[0] for c in casos])
    grupos = [np.where(enf == e)[0] for e in sorted(set(enf))]
    largos = [max(len(c[5]), 1) for c in casos]
    inicios = np.concatenate([[0], np.cumsum(largos)[:-1]])
    pad = lambda a: a if len(a) else np.zeros(1)  # noqa: E731
    S = np.concatenate([pad(c[5]) for c in casos])
    mejor = None
    for nucleo in (False, True):
        C = np.concatenate([pad(c[4] if nucleo else c[3]) for c in casos])
        for e in EXPLICITA:
            ce = C >= e
            for pa in PARCIAL[PARCIAL <= e]:
                cp = C >= pa
                for se in SEMANTICA:
                    pr = np.logical_or.reduceat(ce | (cp & (S >= se)), inicios).astype(int)
                    ks = [kappa(y[g], pr[g]) for g in grupos]
                    obj = (round(float(np.mean([0.0 if np.isnan(k) else k for k in ks])), 4), float(np.mean(pr == y)))
                    if mejor is None or obj > mejor[0]:
                        mejor = (obj, {'explicita': float(e), 'parcial': float(pa), 'semantica': float(se), 'nucleo': nucleo})
    return mejor[1]


def metricas(casos, prm) -> Dict:
    out = {}
    for capa in ap.CAPAS + ('Global',):
        cs = [c for c in casos if capa == 'Global' or c[2] == capa]
        if not cs:
            continue
        y, p = [c[6] for c in cs], [pred(c, prm) for c in cs]
        out[capa] = {'n': len(cs), 'acuerdo': round(float(np.mean(np.array(y) == np.array(p))), 3), 'kappa': kappa(y, p),
                     'metodo_%': round(100 * float(np.mean(p)), 1), 'referencia_%': round(100 * float(np.mean(y)), 1)}
    return out


def validar(ref: pd.DataFrame, fuentes: Dict[str, object], recalibrar: bool = False) -> Dict:
    """Acuerdo del método con la referencia: con los parámetros activos y, si se pide, con los recalibrados."""
    casos, faltan = casos_desde_referencia(ref, fuentes)
    if not casos:
        return {'casos': 0, 'sin_emparejar': faltan}
    out = {'casos': len(casos), 'sin_emparejar': faltan, 'parametros_activos': dict(ap.PARAMS),
           'metricas_activas': metricas(casos, ap.PARAMS)}
    if recalibrar:
        prm = calibrar(casos)
        out.update({'parametros_propuestos': prm, 'metricas_propuestas': metricas(casos, prm)})
    return out
