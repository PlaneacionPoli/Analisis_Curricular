// Cadena competencia → RA → estrategia mesocurricular → asignaturas, con las matrices reales. Uso: node tests/competencias_huerfanas.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { evaluarMatriz, leerMatriz } from '../src/data/indicadores.js';
import { consolidar } from '../src/data/consolidar.js';
import { parseMatriz } from '../src/data/parseMatrix.js';
import { crearSim } from '../src/data/difflib.js';
import { cadenaCompetencias } from '../src/pages/resumenDatos.js';
const c = pathToFileURL((process.argv[2] ?? fileURLToPath(new URL('../../data/raw/01_FormatosRA_ReformaCurricular/', import.meta.url))).replace(/[\/]*$/, '/')), sim = crearSim();
const files = readdirSync(fileURLToPath(c)).filter(f => /^FormatoRA.*\.xlsx$/.test(f)).sort();
const { filas } = consolidar(files.map(f => parseMatriz(new Uint8Array(readFileSync(new URL(encodeURIComponent(f), c))), f)));
const ms = files.map(f => evaluarMatriz(leerMatriz(new Uint8Array(readFileSync(new URL(encodeURIComponent(f), c))), f), sim));
const r = cadenaCompetencias(ms, filas, new Map());
console.log(r.resumen);
console.log(r.filas.filter(x => x.Estado === 'Parcial').slice(0, 3));
