// Paridad de la regla de asignación de tendencias con src/tendencias.py (referencia: tests/golden_tendencias.json).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizar, terminosPresentes } from '../src/data/tendencias.js';

const aquí = dirname(fileURLToPath(import.meta.url));
const filas = JSON.parse(readFileSync(join(aquí, 'golden_tendencias.json'), 'utf-8'));
const cfg = JSON.parse(readFileSync(join(aquí, '../public/data/config_tendencias.json'), 'utf-8'));
let ok = 0;
const fallos = [];
for (const f of filas) {
  const js = {};
  for (const [t, i] of Object.entries(cfg.TENDENCIAS_GLOBALES)) {
    const k = terminosPresentes(normalizar(f.nombre), normalizar(f.texto), i.keywords, cfg.REGLA);
    if (k.length) js[t] = k;
  }
  if (JSON.stringify(js) === JSON.stringify(f.hits)) ok++; else if (fallos.length < 3) fallos.push({ nombre: f.nombre, py: f.hits, js });
}
console.log(`filas: ${filas.length} · idénticas ${ok}`);
if (fallos.length) console.log(JSON.stringify(fallos, null, 1));
process.exit(ok === filas.length ? 0 : 1);
