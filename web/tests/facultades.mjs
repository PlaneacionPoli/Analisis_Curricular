// Comprueba que todos los programas de las matrices tienen facultad. Uso: node tests/facultades.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { consolidar } from '../src/data/consolidar.js';
import { parseMatriz } from '../src/data/parseMatrix.js';
import { facultadDe, SIN_FACULTAD } from '../src/data/facultades.js';
const t = JSON.parse(readFileSync(new URL('../public/data/facultades.json', import.meta.url), 'utf8'));
const c = new URL('../../data/raw/01_FormatosRA_ReformaCurricular/', import.meta.url);
const { filas } = consolidar(readdirSync(c).filter(f => /^FormatoRA.*\.xlsx$/.test(f)).sort().map(f => parseMatriz(new Uint8Array(readFileSync(new URL(f, c))), f)));
const progs = [...new Set(filas.map(f => f.Programa))].sort();
const sin = progs.filter(p => facultadDe(p, t) === SIN_FACULTAD);
const por = {};
for (const f of filas.filter((f, i, a) => a.findIndex(x => x.Matriz === f.Matriz) === i)) por[facultadDe(f.Programa, t)] = (por[facultadDe(f.Programa, t)] ?? 0) + 1;
console.log(`programas: ${progs.length} · sin facultad: ${sin.length}`, sin);
console.log('matrices por facultad:', por);
