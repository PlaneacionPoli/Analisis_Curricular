// Port de src/calibracion_asociacion.py: acuerdo del método con una lectura de referencia y calibración de umbrales.
// Referencia (CSV, separador «;»): Matriz;Enfoque;Inicio_item;Competencia;RA;Asignatura[;Fuente]
import { ceder } from '../data/util.js';
import { puntajes } from './asociar.js';
import { CAPAS, itemsPerfil, leerMatriz, norm } from './leerMatriz.js';

export const COLUMNAS_REFERENCIA = ['Matriz', 'Enfoque', 'Inicio_item', 'Competencia', 'RA', 'Asignatura'];
const rango = (ini, n, paso) => Array.from({ length: n }, (_, i) => Math.round((ini + i * paso) * 100) / 100);
export const EXPLICITA = rango(0.15, 14, 0.05);
export const PARCIAL = rango(0.05, 8, 0.05);
export const SEMANTICA = rango(0.30, 14, 0.04);

function redondear(x, d) {
  const f = 10 ** d, y = x * f, r = Math.round(y);
  return (Math.abs(y - Math.trunc(y)) === 0.5 ? 2 * Math.round(y / 2) : r) / f;
}

/** Divide una línea CSV con «;» respetando comillas dobles. */
function partirLinea(l) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (q) { if (c === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ';') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

export function leerReferencia(texto) {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  const cab = partirLinea(lineas[0]).map(c => c.trim());
  const faltan = COLUMNAS_REFERENCIA.filter(c => !cab.includes(c));
  if (faltan.length) throw new Error(`La referencia no tiene las columnas: ${faltan.join(', ')}`);
  return lineas.slice(1).map(l => {
    const v = partirLinea(l), o = Object.fromEntries(cab.map((c, i) => [c, (v[i] ?? '').trim()]));
    for (const capa of CAPAS) {
      const n = Number(o[capa]);
      if (!Number.isInteger(n)) throw new Error(`Valor no entero en «${capa}»: ${o[capa]}`);
      o[capa] = n;
    }
    return o;
  });
}

/** Casos {enfoque, matriz, capa, cob, cobN, sem, y, item} de las matrices de la referencia que están disponibles. */
export async function casosDesdeReferencia(ref, fuentes, { cfg, incrustar = null, lexicoRespaldo = [], alProgreso = null }) {
  const casos = [], faltan = [];
  const porMatriz = new Map();
  for (const r of ref) { if (!porMatriz.has(r.Matriz)) porMatriz.set(r.Matriz, []); porMatriz.get(r.Matriz).push(r); }
  let n = 0;
  for (const [matriz, filas] of [...porMatriz].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    alProgreso?.(n++, porMatriz.size, matriz);
    if (!fuentes.has(matriz)) { filas.forEach(r => faltan.push([matriz, r.Inicio_item])); continue; }
    const m = leerMatriz(fuentes.get(matriz), lexicoRespaldo);
    const items = itemsPerfil(m);
    const P = await puntajes(m, items, cfg, incrustar);
    const normas = items.map(it => norm(it.item));
    for (const r of filas) {
      const i = normas.findIndex(x => x.startsWith(r.Inicio_item));
      if (i < 0) { faltan.push([matriz, r.Inicio_item]); continue; }
      for (const capa of CAPAS) casos.push({ enfoque: r.Enfoque, matriz, capa, cob: P[capa].cob[i], cobN: P[capa].cob_n?.[i] ?? P[capa].cobN?.[i], sem: P[capa].sem[i], y: r[capa], item: items[i].item });
    }
  }
  return { casos, faltan };
}

export function pred(caso, p) {
  const c = p.nucleo ? caso.cobN : caso.cob;
  for (let k = 0; k < c.length; k++) if (c[k] >= p.explicita || (c[k] >= p.parcial && caso.sem[k] >= p.semantica)) return 1;
  return 0;
}

export function kappa(y, p) {
  const n = y.length;
  let ig = 0, sy = 0, sp = 0;
  for (let i = 0; i < n; i++) { ig += y[i] === p[i] ? 1 : 0; sy += y[i]; sp += p[i]; }
  const po = ig / n, my = sy / n, mp = sp / n, pe = my * mp + (1 - my) * (1 - mp);
  return pe < 1 ? redondear((po - pe) / (1 - pe), 3) : NaN;
}

export function metricas(casos, p) {
  const out = {};
  for (const capa of [...CAPAS, 'Global']) {
    const cs = casos.filter(c => capa === 'Global' || c.capa === capa);
    if (!cs.length) continue;
    const y = cs.map(c => c.y), pr = cs.map(c => pred(c, p));
    out[capa] = { n: cs.length, acuerdo: redondear(y.filter((v, i) => v === pr[i]).length / cs.length, 3), kappa: kappa(y, pr),
      'metodo_%': redondear(100 * pr.reduce((a, b) => a + b, 0) / cs.length, 1), 'referencia_%': redondear(100 * y.reduce((a, b) => a + b, 0) / cs.length, 1) };
  }
  return out;
}

/** Parámetros que maximizan el kappa PROMEDIO por enfoque (desempate por acuerdo). */
export async function calibrar(casos, alProgreso = null) {
  const y = casos.map(c => c.y), enf = casos.map(c => c.enfoque);
  const grupos = [...new Set(enf)].sort().map(e => enf.map((x, i) => (x === e ? i : -1)).filter(i => i >= 0));
  let mejor = null, hecho = 0;
  for (const nucleo of [false, true]) {
    // vectores aplanados por caso (como np.concatenate + reduceat)
    const largos = casos.map(c => Math.max(c.sem.length, 1));
    const inicios = largos.reduce((a, l, i) => { a.push(i ? a[i - 1] + largos[i - 1] : 0); return a; }, []);
    const total = largos.reduce((a, b) => a + b, 0);
    const C = new Float64Array(total), S = new Float64Array(total);
    casos.forEach((c, i) => { const v = nucleo ? c.cobN : c.cob; for (let k = 0; k < c.sem.length; k++) { C[inicios[i] + k] = v[k]; S[inicios[i] + k] = c.sem[k]; } });
    for (const e of EXPLICITA) {
      alProgreso?.(hecho++, EXPLICITA.length * 2);
      await ceder();
      for (const pa of PARCIAL.filter(v => v <= e)) {
        for (const se of SEMANTICA) {
          const pr = new Array(casos.length).fill(0);
          for (let i = 0; i < casos.length; i++) {
            const fin = inicios[i] + largos[i];
            for (let k = inicios[i]; k < fin; k++) if (C[k] >= e || (C[k] >= pa && S[k] >= se)) { pr[i] = 1; break; }
          }
          const ks = grupos.map(g => kappa(g.map(i => y[i]), g.map(i => pr[i])));
          const mediaK = redondear(ks.reduce((a, k) => a + (Number.isNaN(k) ? 0 : k), 0) / ks.length, 4);
          const ac = pr.filter((v, i) => v === y[i]).length / casos.length;
          if (!mejor || mediaK > mejor.obj[0] || (mediaK === mejor.obj[0] && ac > mejor.obj[1])) mejor = { obj: [mediaK, ac], prm: { explicita: e, parcial: pa, semantica: se, nucleo } };
        }
      }
    }
  }
  return mejor.prm;
}

export async function validar(ref, fuentes, { cfg, incrustar = null, lexicoRespaldo = [], recalibrar = false, alProgreso = null }) {
  const { casos, faltan } = await casosDesdeReferencia(ref, fuentes, { cfg, incrustar, lexicoRespaldo, alProgreso });
  if (!casos.length) return { casos: 0, sin_emparejar: faltan };
  const activos = cfg.PARAMS;
  const out = { casos: casos.length, sin_emparejar: faltan, parametros_activos: { ...activos }, metricas_activas: metricas(casos, activos) };
  if (recalibrar) {
    const prm = await calibrar(casos, alProgreso ? (i, n) => alProgreso(-1, n, `calibrando ${i + 1}/${n}`) : null);
    out.parametros_propuestos = prm;
    out.metricas_propuestas = metricas(casos, prm);
  }
  return out;
}
