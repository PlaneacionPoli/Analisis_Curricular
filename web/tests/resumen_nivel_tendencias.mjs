// Mediana de tipo de saber por nivel (pregrado y posgrado por separado) y principales tendencias en el Resumen Ejecutivo.
// Uso: node tests/resumen_nivel_ia.mjs
import assert from 'node:assert/strict';
import { alertas, lecturaTendencias, principalesTendencias, tipoSaberPorPrograma } from '../src/pages/resumenDatos.js';

const COL = 'Nombre asignatura o modulo';
const fila = (Programa, Nivel, saber, asig, Semestre = 1) => ({ Programa, Matriz: `${Programa}-M`, Nivel, 'Tipo de Saber': saber, [COL]: asig, Semestre });

// pregrado: 4 programas con 50 % Saber; posgrado: 4 programas con 10 % Saber, uno de ellos atípico (90 %)
const filas = [];
for (const p of ['A', 'B', 'C', 'D']) for (let i = 0; i < 10; i++) filas.push(fila(p, 'Pregrado', i < 5 ? 'Saber' : 'SaberHacer', `${p}${i}`));
for (const p of ['W', 'X', 'Y']) for (let i = 0; i < 10; i++) filas.push(fila(p, 'Posgrado', i < 1 ? 'Saber' : 'SaberHacer', `${p}${i}`));
for (let i = 0; i < 10; i++) filas.push(fila('Z', 'Posgrado', i < 9 ? 'Saber' : 'SaberHacer', `Z${i}`));
for (let i = 0; i < 10; i++) filas.push(fila('M', 'Mixto', 'Saber', `M${i}`));

// 1. medianas separadas por nivel
const { medianas, nivel, nProgramas } = tipoSaberPorPrograma(filas);
assert.equal(nProgramas.Pregrado, 4); assert.equal(nProgramas.Posgrado, 4);
assert.equal(medianas.Pregrado.Saber, 50);
assert.equal(medianas.Posgrado.Saber, 10);               // sin mezclar: mezclando saldría 50
assert.equal(nivel.get('M'), null);                        // «Mixto» no entra en ninguna mediana

// 2. los atípicos se juzgan dentro del propio nivel
const etiqueta = new Map();
const al = alertas(filas, etiqueta).filter(a => a['Categoría'] === 'Tipo de Saber');
assert.ok(al.some(a => a.Matriz === 'Z-M' && a.Nivel === 'Posgrado' && /posgrado/.test(a.Hallazgo)), 'Z debe salir atípico frente a posgrado');
assert.ok(!al.some(a => a.Nivel === 'Pregrado'), 'ningún pregrado es atípico');
assert.ok(!al.some(a => a.Matriz === 'M-M'), 'el nivel mixto no se compara');

// la referencia es todo lo cargado, aunque la vista esté filtrada
const soloZ = filas.filter(f => f.Programa === 'Z');
assert.ok(alertas(soloZ, etiqueta, filas).some(a => a.Matriz === 'Z-M' && a['Categoría'] === 'Tipo de Saber'));

// un grupo con menos de 4 unidades no califica a nadie
assert.equal(alertas(filas.filter(f => f.Nivel !== 'Posgrado' || f.Programa !== 'Y'), etiqueta).filter(a => a.Nivel === 'Posgrado').length, 0);

// 3. principales tendencias, por nivel y en el conjunto
const T = { T01: { descripcion: 'Inteligencia artificial' }, T02: { descripcion: 'Sostenibilidad' } };
const acier = new Map(filas.map(f => [f, { ...(/^(A[0-2]|B0|W[0-1]|Z0)$/.test(f[COL]) ? { T01: ['ia'] } : {}), ...(/^(A0|M[0-9])$/.test(f[COL]) ? { T02: ['sost'] } : {}) }]));
const pt = principalesTendencias(filas, acier, T);
const ti = pt.filas.find(t => t.tid === 'T01');
assert.equal(ti.Pregrado.asignaturas, 4);                  // A0, A1, A2, B0
assert.equal(ti.Pregrado.programas, 2);
assert.equal(ti.Pregrado.pct, 10);                         // 4 de 40 asignaturas de pregrado
assert.equal(ti.Posgrado.asignaturas, 3);                  // W0, W1, Z0
assert.equal(ti.Posgrado.pct, 3 / 40 * 100);
assert.equal(ti.Total.asignaturas, 7); assert.equal(ti.Total.programas, 4);
assert.deepEqual(pt.n.Pregrado, { asignaturas: 40, programas: 4 });
assert.deepEqual(pt.n.Total, { asignaturas: 90, programas: 9 });
const ts2 = pt.filas.find(t => t.tid === 'T02');
assert.equal(ts2.Pregrado.asignaturas, 1); assert.equal(ts2.Posgrado.asignaturas, 0); assert.equal(ts2.Total.asignaturas, 11);   // el mixto cuenta solo en el conjunto
assert.deepEqual(pt.filas.map(t => t.tid), ['T02', 'T01']);   // orden por % del conjunto: 11/90 > 7/90
assert.ok(lecturaTendencias(pt).includes('Sostenibilidad'));
console.log('resumen_nivel_ia: OK');
