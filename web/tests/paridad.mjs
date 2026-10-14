// Paridad con el dashboard de Streamlit: lee las mismas matrices con la capa JS y compara con referencia.json
// (generado por exportar_referencia.py a partir de las funciones reales de dashboard_tematico.py).
//
// Uso: node tests/paridad.mjs [carpeta_con_matrices]
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMatriz } from '../src/data/parseMatrix.js';
import { consolidar, resumenPorPrograma } from '../src/data/consolidar.js';

const aquí = dirname(fileURLToPath(import.meta.url));
const ref = JSON.parse(readFileSync(join(aquí, 'referencia.json'), 'utf-8'));
const carpeta = resolve(process.argv[2] ?? join(aquí, '../../data/raw', ref.carpeta));

const resultados = readdirSync(carpeta).filter(f => /^FormatoRA.*\.xlsx$/.test(f)).sort()
  .map(f => parseMatriz(new Uint8Array(readFileSync(join(carpeta, f))), f));
const { filas, columnas, fallidos, totales } = consolidar(resultados);
const resumen = resumenPorPrograma(filas, columnas, totales);

let errores = 0;
const igual = (nombre, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { errores++; console.log(`✗ ${nombre}\n    JS:     ${JSON.stringify(a)}\n    Python: ${JSON.stringify(b)}`); }
  else console.log(`✓ ${nombre}`);
};

igual('archivos leídos', resultados.length, ref.archivos.length);
igual('archivos fallidos', fallidos.length, ref.fallidos.length);
igual('registros', filas.length, ref.registros);
igual('programas distintos', new Set(filas.map(f => f.Programa)).size, ref.programas);
igual('asignaturas únicas', new Set(filas.map(f => f['Nombre asignatura o modulo']).filter(v => v != null)).size, ref.asignaturas_unicas);

const sem = {};
for (const f of filas) { const k = f.Semestre == null ? 'nan' : String(f.Semestre); sem[k] = (sem[k] || 0) + 1; }
igual('distribución de semestres', Object.fromEntries(Object.entries(sem).sort()), Object.fromEntries(Object.entries(ref.semestres).sort()));

const palabras = filas.reduce((a, f) => a + f.Texto_Completo.split(/\s+/).filter(Boolean).length, 0);
igual('palabras en Texto_Completo', palabras, ref.texto_palabras);

const tipo = {};
for (const f of filas) { const k = `${f.Matriz}|${f['Tipo de Saber']}`; tipo[k] = (tipo[k] || 0) + 1; }
const tipoRef = Object.fromEntries(ref.por_matriz_tipo.map(r => [`${r.Matriz}|${r['Tipo de Saber']}`, r.n]));
const ordenar = o => Object.fromEntries(Object.entries(o).sort());
igual('registros por matriz y tipo de saber', ordenar(tipo), ordenar(tipoRef));

const niv = new Map(filas.map(f => [f.Matriz, `${f.Programa}|${f.Modalidad}|${f.Sede}|${f.Nivel}`]));
const nivRef = new Map(ref.niveles.map(r => [r.Matriz, `${r.Programa}|${r.Modalidad}|${r.Sede}|${r.Nivel}`]));
igual('programa/modalidad/sede/nivel por matriz', ordenar(Object.fromEntries(niv)), ordenar(Object.fromEntries(nivRef)));

igual('totales oficiales leídos', ordenar(Object.fromEntries(Object.entries(totales).map(([k, v]) => [k, ordenar(v)]))),
  ordenar(Object.fromEntries(Object.entries(ref.totales).map(([k, v]) => [k, ordenar(v)]))));

const llave = r => `${r.Programa}|${r.Modalidad}|${r.Sede}|${r.Nivel}`;
const rJs = new Map(resumen.map(r => [llave(r), r]));
const rRef = new Map(ref.resumen.map(r => [llave(r), r]));
igual('filas del resumen por programa', resumen.length, ref.resumen.length);
let malas = 0;
for (const [k, esperado] of rRef) {
  const obtenido = rJs.get(k);
  for (const [c, v] of Object.entries(esperado)) {
    if (c === 'Asig. Oficial') continue;
    if (!obtenido || obtenido[c] !== v) {
      if (malas++ < 8) console.log(`    ${k} · ${c}: JS=${obtenido?.[c]} Python=${v}`);
    }
  }
}
igual('valores del resumen (créditos, semestres, diferencias)', malas, 0);

console.log(errores ? `\n${errores} comprobación(es) con diferencias.` : '\nParidad completa.');
process.exit(errores ? 1 : 0);
