// Paridad de «Taxonomías» con src/taxonomias_ra.py (referencia: tests/golden_taxonomias.json).
//   node tests/paridad_taxonomias.mjs [carpeta]
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarBase, contrastar, leerRA } from '../src/data/taxonomias.js';

const aquí = dirname(fileURLToPath(import.meta.url));
const carpeta = resolve(process.argv[2] ?? join(aquí, '../../data/raw/01_FormatosRA_ReformaCurricular'));
const golden = JSON.parse(readFileSync(join(aquí, 'golden_taxonomias.json'), 'utf-8'));
const base = cargarBase(JSON.parse(readFileSync(join(aquí, '../public/data/taxonomias_bd.json'), 'utf-8')));
const ra = [];
for (const f of readdirSync(carpeta).filter(x => /^FormatoRA.*\.xlsx$/.test(x)).sort()) {
  ra.push(...leerRA(new Uint8Array(readFileSync(join(carpeta, f))), f));
}
const js = contrastar(ra, base);
const campos = ['Matriz', 'Programa', 'Sede', 'RA', 'clave', 'Verbo', 'Tipo de saber', 'Taxonomía', 'Dominio declarado', 'Nivel declarado',
  'Exigencia declarada', 'Dominio(s) según la base', 'Nivel según la base', 'Diferencia de nivel (declarado − base)', 'Contraste'];
let ok = 0;
const fallos = [];
const porClave = new Map(js.map(x => [`${x.Matriz}|${x.clave}`, x]));
golden.forEach((g, i) => {
  const j = porClave.get(`${g.Matriz}|${g.clave}`);
  const mal = j ? campos.filter(c => (g[c] ?? null) !== (j[c] ?? null) && !(g[c] === '' && j[c] === '')) : campos;
  if (!mal.length) ok++; else if (fallos.length < 4) fallos.push({ i, mal: mal.map(c => [c, g[c], j?.[c]]) });
});
console.log(`RA: Python ${golden.length} · JS ${js.length} · idénticos en los ${campos.length} campos: ${ok}`);
if (fallos.length) console.log(JSON.stringify(fallos, null, 1));
process.exit(ok === golden.length && js.length === golden.length ? 0 : 1);
