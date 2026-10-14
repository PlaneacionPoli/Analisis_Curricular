// Paridad de la separación y limpieza de núcleos con src/nucleos_cleaner.py (referencia: tests/golden_nucleos.json).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nucleosValidos, tokenizarCelda } from '../src/data/nucleos.js';

const casos = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'golden_nucleos.json'), 'utf-8'));
let okT = 0, okV = 0;
const fallos = [];
for (const c of casos) {
  const t = tokenizarCelda(c.celda), v = nucleosValidos(c.celda).validos;
  const a = JSON.stringify(t) === JSON.stringify(c.tokens), b = JSON.stringify(v) === JSON.stringify(c.validos);
  okT += a; okV += b;
  if (!(a && b) && fallos.length < 3) fallos.push({ celda: c.celda.slice(0, 200), py: c.tokens.slice(0, 3), js: t.slice(0, 3) });
}
console.log(`celdas: ${casos.length} · separación idéntica ${okT} · núcleos válidos idénticos ${okV}`);
if (fallos.length) console.log(JSON.stringify(fallos, null, 1));
process.exit(okT === casos.length && okV === casos.length ? 0 : 1);
