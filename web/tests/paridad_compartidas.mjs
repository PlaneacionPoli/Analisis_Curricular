// Paridad de «Familias Curriculares» con src/shared_subjects_analyzer.py (referencia: tests/golden_compartidas.json).
//   node tests/paridad_compartidas.mjs [carpeta]
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { consolidar } from '../src/data/consolidar.js';
import { parseMatriz } from '../src/data/parseMatrix.js';
import { compararInterPrograma, consolidarAsignaturas, divergenciaHomonimas } from '../src/data/compartidas.js';

const aquí = dirname(fileURLToPath(import.meta.url));
const carpeta = resolve(process.argv[2] ?? join(aquí, '../../data/raw/01_FormatosRA_ReformaCurricular'));
const g = JSON.parse(readFileSync(join(aquí, 'golden_compartidas.json'), 'utf-8'));
const { filas } = consolidar(readdirSync(carpeta).filter(f => /^FormatoRA.*\.xlsx$/.test(f)).sort()
  .map(f => parseMatriz(new Uint8Array(readFileSync(join(carpeta, f))), f)));
const sinCR = f => ({ ...f, 'Nombre asignatura o modulo': f['Nombre asignatura o modulo']?.split(String.fromCharCode(13, 10)).join(String.fromCharCode(10)) });
const t0 = Date.now();
const asigs = consolidarAsignaturas(filas.map(sinCR));
const homo = divergenciaHomonimas(asigs);
const pares = compararInterPrograma(asigs);
console.log(`calculado en ${((Date.now() - t0) / 1000).toFixed(1)} s`);

const ok = (n, c, extra = '') => console.log(`${c ? '✓' : '✗'} ${n}${extra}`);
ok('asignaturas consolidadas', asigs.length === g.n_asignaturas, ` (py ${g.n_asignaturas} · js ${asigs.length})`);
ok('textos de las primeras 40', JSON.stringify(asigs.slice(0, 40).map(a => a.texto)) === JSON.stringify(g.textos));
const hp = new Map(g.homonimas.map(h => [h.asignatura, h]));
const igualesH = homo.filter(h => { const p = hp.get(h.asignatura); return p && p.programas === h.programas && p.versiones === h.versiones && Math.abs(p.similitud_media - h.similitud_media) < 0.002 && p.divergente === h.divergente; }).length;
ok('homónimas', homo.length === g.homonimas.length && igualesH === g.homonimas.length, ` (py ${g.homonimas.length} · js ${homo.length} · iguales ${igualesH})`);
ok('divergentes', homo.filter(h => h.divergente).length === g.homonimas.filter(h => h.divergente).length);
ok('pares entre programas', pares.length === g.n_pares, ` (py ${g.n_pares} · js ${pares.length})`);
ok('pares de nombre distinto', pares.filter(p => !p.mismo_nombre).length === g.n_pares_distintos, ` (py ${g.n_pares_distintos} · js ${pares.filter(p => !p.mismo_nombre).length})`);
ok('pares idénticos (≥ 0,95)', pares.filter(p => p.categoria === 'IDENTICO').length === g.n_identicos);
const mal = pares.map(p => p.similitud).slice(0, g.sims_ordenadas.length).filter((s, i) => Math.abs(s - g.sims_ordenadas[i]) > 0.0002).length;
ok('similitudes ordenadas', mal === 0, ` (diferencias > 0,0002: ${mal})`);
