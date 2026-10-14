// Paridad del módulo «Perfil de egreso» con src/asociacion_perfil.py (referencia: tests/golden_perfil.json).
//
//   node tests/paridad_perfil.mjs [--semantica] [--matriz=ContPub_PBOG] [carpeta]
//
// Etapas: A) atributos extraídos del perfil; B) respaldo EXPLÍCITO por capa (solo cobertura léxica);
//         C) estado global por atributo (con --semantica, usa el modelo multilingüe para los «Parcial»).
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { asociar, configDe, resumenItems } from '../src/perfil/asociar.js';
import { cargarLexico, tamanoLexico } from '../src/perfil/nlp.js';

const aquí = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const usarSemantica = args.includes('--semantica');
const solo = args.find(a => a.startsWith('--matriz='))?.split('=')[1];
const lista = args.find(a => a.startsWith('--solo='))?.split('=')[1]?.split(',');
const rutaLexico = args.find(a => a.startsWith('--lexico='))?.split('=')[1];
const carpeta = resolve(args.find(a => !a.startsWith('--')) ?? join(aquí, '../../data/raw/FORMATOS RA CICLO UNO RC'));

const golden = JSON.parse(readFileSync(join(aquí, 'golden_perfil.json'), 'utf-8'));
cargarLexico(JSON.parse(readFileSync(rutaLexico ? resolve(rutaLexico) : join(aquí, '../public/data/lexico_es.json'), 'utf-8')));
const cfg = configDe(JSON.parse(readFileSync(join(aquí, '../public/data/config_asociacion_perfil.json'), 'utf-8')));
const verbosRespaldo = JSON.parse(readFileSync(join(aquí, '../public/data/taxonomia_verbos.json'), 'utf-8'));
console.log(`léxico: ${tamanoLexico()} formas · configuración ${cfg.VERSION}`);

let incrustar = null;
if (usarSemantica) {
  const { crearIncrustador } = await import('../src/perfil/incrustar.js');
  incrustar = await crearIncrustador({ nodo: true, dtype: args.includes('--fp32') ? 'fp32' : 'q8' });
}

const agg = { js: { n: 0, a: 0, t: 0, s: 0 }, py: { n: 0, a: 0, t: 0, s: 0 }, difMatriz: [] };
const tot = { items: 0, itemsIguales: 0, matrices: 0, expl: 0, explOk: 0, est: 0, estOk: 0 };
const dif = [];
for (const [nombre, g] of Object.entries(golden.matrices)) {
  if (solo && !nombre.includes(solo)) continue;
  if (lista && !lista.some(x => nombre.includes(x))) continue;
  const archivo = readdirSync(carpeta).find(f => f === `FormatoRA_${nombre}.xlsx`);
  const buf = new Uint8Array(readFileSync(join(carpeta, archivo)));
  const { filas } = await asociar(buf, cfg, { incrustar, lexicoRespaldo: verbosRespaldo });
  const items = resumenItems(filas);
  const clave = i => `${i.perfil}|${i.origen}|${i.item}`;

  // A) atributos
  const refItems = g.items.map(clave), jsItems = items.map(clave);
  const igual = refItems.length === jsItems.length && refItems.every((x, k) => x === jsItems[k]);
  const sJs = new Set(jsItems);
  const comunes = refItems.filter(x => sJs.has(x)).length;
  tot.items += refItems.length; tot.itemsIguales += comunes; tot.matrices++;
  if (!igual) dif.push({ nombre, etapa: 'A', ref: refItems.length, js: jsItems.length, comunes });

  // Agregados de V1 (todos los atributos evaluables de cada lado)
  const sumar = (o, its) => { for (const i of its) if (i.evaluable) { o.n++; if (i.capas_con_respaldo >= 1) o.a++; if (i.capas_con_respaldo === 3) o.t++; if (i.capas_con_respaldo === 0) o.s++; } };
  const mj = { n: 0, a: 0, t: 0, s: 0 }, mp = { n: 0, a: 0, t: 0, s: 0 };
  sumar(mj, items); sumar(mp, g.items); sumar(agg.js, items); sumar(agg.py, g.items);
  agg.difMatriz.push([nombre, mp.n ? (100 * mp.a / mp.n) : null, mj.n ? (100 * mj.a / mj.n) : null]);

  // B) respaldo explícito y C) estado, solo sobre los atributos comunes
  const jsPorItem = new Map(items.map(i => [clave(i), i]));
  const detJs = new Map();
  for (const f of filas) {
    const k = `${f.perfil}|${f.origen}|${f.item}`;
    if (!detJs.has(k)) detJs.set(k, []);
    detJs.get(k).push([f.capa, f.entidad, f.nivel]);
  }
  for (const it of g.items) {
    const k = clave(it);
    if (!jsPorItem.has(k)) continue;
    for (const capa of ['Competencia', 'RA', 'Asignatura']) {
      const ref = new Set(it.det.filter(d => d[0] === capa && d[2] === 'Explícita').map(d => d[1]));
      const js = new Set((detJs.get(k) ?? []).filter(d => d[0] === capa && d[2] === 'Explícita').map(d => d[1]));
      tot.expl++;
      if (ref.size === js.size && [...ref].every(x => js.has(x))) tot.explOk++;
    }
    tot.est++;
    if (jsPorItem.get(k).estado === it.estado) tot.estOk++;
  }
}
const pct = (a, b) => (b ? (100 * a / b).toFixed(1) : '—') + ' %';
console.log(`\nmatrices: ${tot.matrices}`);
console.log(`A) atributos del perfil idénticos a Python: ${tot.itemsIguales} de ${tot.items} (${pct(tot.itemsIguales, tot.items)})`);
console.log(`B) respaldo explícito por capa idéntico:   ${tot.explOk} de ${tot.expl} (${pct(tot.explOk, tot.expl)})`);
console.log(`C) estado del atributo idéntico:           ${tot.estOk} de ${tot.est} (${pct(tot.estOk, tot.est)})${usarSemantica ? '' : '  [sin semántica: los «Parcial» no pueden coincidir]'}`);
const p1 = (a, n) => (n ? (100 * a / n).toFixed(1) : '—');
console.log(`
V1 agregado (atributos evaluables)   Python: ${agg.py.n} · alguna capa ${p1(agg.py.a, agg.py.n)} % · tres capas ${p1(agg.py.t, agg.py.n)} % · ninguna ${p1(agg.py.s, agg.py.n)} %`);
console.log(`                                     JS:     ${agg.js.n} · alguna capa ${p1(agg.js.a, agg.js.n)} % · tres capas ${p1(agg.js.t, agg.js.n)} % · ninguna ${p1(agg.js.s, agg.js.n)} %`);
const dv = agg.difMatriz.filter(x => x[1] !== null && x[2] !== null).map(x => Math.abs(x[1] - x[2]));
console.log(`V1 por matriz: diferencia absoluta media ${(dv.reduce((a, b) => a + b, 0) / dv.length).toFixed(2)} pp · máxima ${Math.max(...dv).toFixed(1)} pp`);
if (dif.length) {
  console.log('\nMatrices con diferencias en los atributos extraídos:');
  for (const d of dif.slice(0, 15)) console.log(`  ${d.nombre}: Python ${d.ref} · JS ${d.js} · comunes ${d.comunes}`);
}
