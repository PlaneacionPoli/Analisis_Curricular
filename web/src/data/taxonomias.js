// Port de src/taxonomias_ra.py y de nivel_exigencia (src/indicadores_articulo.py): lo que declara el Paso 3 de cada
// matriz (taxonomía, dominio, nivel) frente a la base de verbos. Unidad: RA único por matriz (D4).
import * as XLSX from 'xlsx';
import { nombreMatriz } from './parseMatrix.js';

export const DOMINIOS = ['Cognitivo', 'Procedimental', 'Actitudinal'];
export const ESTADOS = ['Coincide', 'Nivel difiere', 'Dominio difiere', 'Verbo fuera de la base'];
export const SEDES = ['PBOG', 'PMED', 'VNAL', 'HBOG', 'HMED', 'HVAL'];

const PROGRESIONES = {
  bloom: ['conocimiento', 'comprension', 'aplicacion', 'analisis', 'sintesis', 'evaluacion'],
  'bak|cognitivo': ['conocimiento', 'comprension', 'aplicacion', 'analisis', 'sintesis', 'evaluacion'],
  'bak|procedimental': ['imitacion', 'manipulacion', 'precision', 'control'],
  'bak|actitudinal': ['percepcion', 'responder', 'valorar', 'organizar', 'caracterizar'],
};

const ascii = t => String(t).normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase();
export const k = t => ascii(t).replace(/[^a-z]/g, '');
const norm = t => ascii(t).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const ne = v => v !== null && v !== undefined && !['', 'nan', 'None'].includes(String(v).trim());
const redondear = (x, d) => { const f = 10 ** d; const y = x * f, r = Math.round(y); return (Math.abs(y % 1) === 0.5 ? 2 * Math.round(y / 2) : r) / f; };

export function dominioDe(texto) { const x = k(texto); return DOMINIOS.find(d => x.startsWith(k(d))) ?? ''; }
export function nivelDe(texto) {
  const x = k(texto).replace(/(bak|b)$/, '');
  return x.startsWith('conocimiento') ? 'conocimiento' : x;
}

export function nivelExigencia(taxonomia, dominio, nivel) {
  const tax = k(taxonomia).includes('bak') ? 'bak' : 'bloom';
  const dom = ['cognitivo', 'procedimental', 'actitudinal'].find(d => k(dominio).includes(d));
  const prog = PROGRESIONES[tax === 'bloom' ? 'bloom' : `bak|${dom}`];
  if (!prog) return null;
  let base = k(nivel).replace(/(bak|b)$/, '');
  if (base.startsWith('conocimiento')) base = 'conocimiento';
  const i = prog.indexOf(base);
  return i < 0 ? null : redondear(1 + i * 5 / (prog.length - 1), 2);
}

/** {verbo normalizado: [[dominio, subcategoría], …]} desde [[verbo, subcategoría, dominio], …] */
export function cargarBase(filas) {
  const base = new Map();
  for (const [verbo, sub, dom] of filas) {
    const v = k(verbo), s = nivelDe(sub), d = dominioDe(dom);
    if (v.length >= 3 && s && d) {
      if (!base.has(v)) base.set(v, []);
      if (!base.get(v).some(([a, b]) => a === d && b === s)) base.get(v).push([d, s]);
    }
  }
  return base;
}

let baseCache = null;
export async function baseVerbos() {
  if (!baseCache) {
    const r = await fetch(`${import.meta.env.BASE_URL}data/taxonomias_bd.json`);
    baseCache = cargarBase(await r.json());
  }
  return baseCache;
}

/** RA únicos de una matriz (hoja «Paso 3») con lo que declaran. */
export function leerRA(buffer, nombreArchivo) {
  const matriz = nombreMatriz(nombreArchivo);
  const partes = matriz.split('_');
  const sede = SEDES.includes(partes.at(-1)) ? partes.pop() : 'ND';
  const programa = sede === 'ND' ? matriz : partes.join('_');
  const nombres = XLSX.read(buffer, { type: 'array', bookSheets: true }).SheetNames;
  const hoja = nombres.find(s => s.trim().startsWith('Paso 3') && !s.toLowerCase().includes('backup'));
  const vistos = new Map();
  if (hoja) {
    const ws = XLSX.read(buffer, { type: 'array', sheets: hoja }).Sheets[hoja];
    const rg = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
    rg.s.r = 0; rg.s.c = 0;
    const filas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true, range: XLSX.utils.encode_range(rg) });
    for (const r of filas.slice(2)) {
      if (r.length > 8 && ne(r[8]) && norm(r[8]) !== 'resultados aprendizaje' && !vistos.has(norm(r[8]))) vistos.set(norm(r[8]), r);
    }
  }
  return [...vistos.values()].map(r => ({
    Matriz: matriz, Programa: programa, Sede: sede, RA: String(r[8]).trim(), clave: norm(r[8]),
    Verbo: ne(r[7]) ? String(r[7]).trim() : '', 'Tipo de saber': ne(r[2]) ? String(r[2]).trim() : '',
    'Taxonomía': k(r[4]).includes('bak') ? 'BAK' : (ne(r[4]) ? 'Bloom' : ''),
    'Dominio declarado': dominioDe(r[5]), 'Nivel declarado': ne(r[6]) ? nivelDe(r[6]) : '',
    'Exigencia declarada': nivelExigencia(r[4], r[5], r[6]),
  }));
}

const escala = (d, s) => nivelExigencia(d !== 'Cognitivo' ? 'bak' : 'bloom', d, s);

export function contrastar(ra, base) {
  return ra.map(x => {
    const cands = base.get(k(x.Verbo)) ?? [];
    const doms = [...new Set(cands.map(c => c[0]))].sort();
    const mismos = cands.filter(([d]) => d === x['Dominio declarado']);
    let baseNivel = '', dif = null, estado;
    if (!cands.length) estado = 'Verbo fuera de la base';
    else if (!mismos.length) estado = 'Dominio difiere';
    else {
      const decl = x['Exigencia declarada'];
      const esc = mismos.map(([d, s]) => [decl !== null && escala(d, s) !== null ? Math.abs(escala(d, s) - decl) : 99, d, s]);
      esc.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
      const [dist, d, s] = esc[0];
      baseNivel = s;
      if (decl === null || dist === 99) estado = 'Nivel difiere';
      else { dif = redondear(decl - escala(d, s), 1); estado = Math.abs(dif) < 0.5 ? 'Coincide' : 'Nivel difiere'; }
    }
    return { ...x, 'Dominio(s) según la base': doms.join(', '), 'Nivel según la base': baseNivel, 'Diferencia de nivel (declarado − base)': dif, Contraste: estado };
  });
}

export function indiceExigencia(valores) {
  const v = valores.filter(x => x !== null && x !== undefined && !Number.isNaN(x));
  return v.length ? redondear((v.reduce((a, b) => a + b, 0) / v.length - 1) / 5 * 100, 1) : null;
}

export function resumenContraste(ra) {
  const n = ra.length;
  const estados = Object.fromEntries(ESTADOS.map(e => [e, ra.filter(r => r.Contraste === e).length]));
  return { n, estados, pct: Object.fromEntries(ESTADOS.map(e => [e, n ? redondear(100 * estados[e] / n, 1) : null])) };
}

export function porGrupo(ra, columna) {
  const grupos = new Map();
  for (const r of ra) { if (!grupos.has(r[columna])) grupos.set(r[columna], []); grupos.get(r[columna]).push(r); }
  return [...grupos].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([g, d]) => {
    const n = d.length, p = f => redondear(100 * d.filter(f).length / n, 1);
    return { [columna]: g, 'RA únicos': n, '% Bloom': p(r => r['Taxonomía'] === 'Bloom'), '% BAK': p(r => r['Taxonomía'] === 'BAK'),
      'Índice de exigencia': indiceExigencia(d.map(r => r['Exigencia declarada'])), ...Object.fromEntries(ESTADOS.map(e => [`% ${e}`, p(r => r.Contraste === e)])) };
  });
}
