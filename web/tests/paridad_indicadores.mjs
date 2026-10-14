// Paridad de V1–V5 (sin V1) con src/indicadores_articulo.py (referencia: tests/golden_indicadores.json).
//   node tests/paridad_indicadores.mjs [carpeta]
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agregar, contrastes, evaluarMatriz, leerMatriz, referenciasConjunto, valorarMatriz } from '../src/data/indicadores.js';
import { crearSim } from '../src/data/difflib.js';

const aquí = dirname(fileURLToPath(import.meta.url));
const carpeta = resolve(process.argv[2] ?? join(aquí, '../../data/raw/01_FormatosRA_ReformaCurricular'));
const g = JSON.parse(readFileSync(join(aquí, 'golden_indicadores.json'), 'utf-8'));
const t0 = Date.now();
const sim = crearSim();
const ms = readdirSync(carpeta).filter(f => /^FormatoRA.*\.xlsx$/.test(f)).sort()
  .map(f => evaluarMatriz(leerMatriz(new Uint8Array(readFileSync(join(carpeta, f))), f), sim));
const js = agregar(ms);
console.log(`calculado en ${((Date.now() - t0) / 1000).toFixed(1)} s`);

const orden = a => [...a].sort((x, y) => (x.Matriz ?? x.matriz) < (y.Matriz ?? y.matriz) ? -1 : 1);
let mal = 0;
const igual = (nombre, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { mal++; console.log(`✗ ${nombre}\n   JS: ${JSON.stringify(a).slice(0, 300)}\n   Py: ${JSON.stringify(b).slice(0, 300)}`); } else console.log(`✓ ${nombre}`); };

const quitarNull = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === undefined ? null : v]));
igual('globales', quitarNull(js.globales), quitarNull(Object.fromEntries(Object.keys(js.globales).map(k => [k, g.globales[k]]))));
igual('por matriz', orden(js.por_matriz).map(quitarNull), orden(g.por_matriz).map(quitarNull));
const claveRA = r => `${r.matriz}|${r.ra}`;
const campos = ['generica', 'RA_competencia', 'V3', 'motivo_V3', 'V4', 'estrategias'];
const rj = new Map(js.ra.map(r => [claveRA(r), r]));
igual('RA (campos)', g.ra.every(r => rj.has(claveRA(r)) && campos.every(c => rj.get(claveRA(r))[c] === r[c])), true);
const ej = js.estrategias.map(e => `${e.matriz}|${e.estrategia}|${e.indicadores}|${e.instrumento}|${e.nivel_max}|${e.V5}|${e.directa}`).sort();
igual('estrategias', ej, g.estrategias.map(e => `${e.matriz}|${e.estrategia}|${e.indicadores}|${e.instrumento}|${e.nivel_max}|${e.V5}|${e.directa}`).sort());
igual('contrastes (Spearman, Kruskal, motivos)', contrastes(js.por_matriz), g.contrastes);
const ref = referenciasConjunto(js.por_matriz);
igual('referencias del conjunto', ref, Object.fromEntries(Object.keys(ref).map(k => [k, g.referencias[k]])));
const val = Object.fromEntries(js.por_matriz.map(m => [m.Matriz, valorarMatriz(m, { referencia: ref }).map(({ Valor, ...r }) => r)]));
// V2 se informa sin calificar en la web (decisión posterior a la versión de Python)
const valPy = Object.fromEntries(Object.entries(g.valoracion).map(([k, v]) => [k, v.map(x => (x.Variable === 'V2' ? { ...x, Estado: 'Descriptiva' } : x))]));
const ord = o => Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]]));
igual('valoración por criterios', ord(val), ord(valPy));
if (process.env.DEPURAR) {
  const a = ej, b = g.estrategias.map(e => `${e.matriz}|${e.estrategia}|${e.indicadores}|${e.instrumento}|${e.nivel_max}|${e.V5}|${e.directa}`).sort();
  const i = a.findIndex((x, k) => x !== b[k]); console.log(a.length, b.length, a[i], '|||', b[i]);
  for (const m of Object.keys(val)) { const k = val[m].findIndex((x, n) => JSON.stringify(x) !== JSON.stringify(valPy[m][n])); if (k >= 0) { console.log(m, val[m][k], valPy[m][k]); break; } }
}
process.exit(mal ? 1 : 0);
