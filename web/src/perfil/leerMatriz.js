// Lectura del perfil y de las tres capas (competencias, RA, asignaturas) de UNA matriz.
// Port de leer_matriz / items_perfil de src/asociacion_perfil.py y de tokenizar_nucleo_celda de src/nucleos_cleaner.py.
import * as XLSX from 'xlsx';
import { aAscii, colapsar, fullmatch, palabras, rx, splitRe, strip } from './py.js';
import { extraerAtributosDetalle } from './atributos.js';

export const CAPAS = ['Competencia', 'RA', 'Asignatura'];
const GENERICA = 'fenomenos contemporaneos';
const VERBO = /^[A-Za-zÁÉÍÓÚáéíóúñ]+(?:ar|er|ir)(?:se)?$/u;

/** _norm de asociacion_perfil: ASCII, minúsculas, solo [a-z0-9 ] */
export function norm(t) {
  return colapsar(aAscii(t).replace(/[^a-z0-9 ]/g, ' ')).trim();
}

export function ne(v) {
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  return !['', 'nan', 'None'].includes(s) && !s.startsWith('[');
}

/** Hoja cuyo nombre empieza por `pref` (sin hojas de respaldo) o undefined. */
function hoja(wb, pref) {
  const n = wb.SheetNames.find(s => s.trim().startsWith(pref) && !s.toLowerCase().includes('backup'));
  return n ? wb.Sheets[n] : undefined;
}

/** Filas con índice ABSOLUTO (la fila 1 de Excel es la posición 0), como iter_rows(min_row=…) de openpyxl. */
function filas(ws) {
  const ref = ws['!ref'];
  if (!ref) return [];
  const rg = XLSX.utils.decode_range(ref);
  rg.s.r = 0;
  rg.s.c = 0;
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true, range: XLSX.utils.encode_range(rg) });
}

// ── nucleos_cleaner ───────────────────────────────────────────────────────────
const NUMERACION = /(?:^\s*|(?<=\S)\s{2,})(\d+(?:\.\d+)*)(?:[.)]\s*|\s*(?=[^\d\s]))(?=[^\d\s])/gmu;

export function tokenizarNucleoCelda(celda) {
  if (celda === null || celda === undefined || !String(celda).trim()) return [];
  const texto = String(celda).trim();
  const marcas = [...texto.matchAll(NUMERACION)];
  let partes;
  if (!marcas.length || marcas[0].index > 3) partes = texto.split('\n');
  else {
    partes = marcas.map((a, i) => {
      const fin = marcas[i + 1] ? marcas[i + 1].index : texto.length;
      return texto.slice(a.index + a[0].length, fin);
    });
  }
  const out = [];
  for (const p of partes) {
    const s = colapsar(p).trim();
    if (s && s !== 'nan') out.push(s);
  }
  return out;
}

/** es_nucleo_valido con FILTROS_ESTRICTOS desactivado (control mínimo). */
export function esNucleoValido(texto) {
  const t = texto.trim();
  if (!t) return false;
  if (/^[\W\d_]+$/u.test(t)) return false;
  if (t.startsWith('[')) return false;
  return true;
}

// ── Paso 1: componentes del perfil ocupacional ─────────────────────────────────
const ETIQUETA = /^\s*(?:\d+[.)]\s*)?([^:/\n]{3,90}):\s+(?=\S)/u;

export function itemsComponente(celda) {
  const out = [];
  for (let linea of String(celda).split(/\n+/u)) {
    linea = linea.trim().replace(ETIQUETA, '');
    linea = linea.replace(rx('\\by\\s*/\\s*o\\b', 'g'), 'y o');
    linea = linea.replace(rx('(\\w)\\s*/\\s*(as?|os?)\\b', 'g'), '$1');
    for (let p of linea.split(/\/|;|•/u)) {
      p = strip(p.replace(/^\s*(?:\d+[.)]|[-–—*])\s*/u, ''), ' .,:-\t');
      if ((p.match(/\(/g) || []).length !== (p.match(/\)/g) || []).length) {
        p = strip(p.replace(/[()]/g, ''), ' .,:-\t');
      }
      if (p.length > 3 && /[A-Za-zÁÉÍÓÚáéíóúñ]{3}/u.test(p)) out.push(p);
    }
  }
  return out;
}

function oraciones(texto) {
  return String(texto).split(/(?<=[.;])\s+|\n+/u).map(o => o.trim()).filter(o => palabras(o).length >= 2);
}

function clausulas(texto) {
  const t = String(texto);
  const partes = splitRe(rx(',?\\s+(?:para|que|considerando|seg[uú]n|as[ií] como|mediante|teniendo en cuenta)\\s+|;\\s*'), t)
    .filter(p => p != null);
  return [t, ...partes].map(p => strip(p.trim(), ' ,.')).filter(p => palabras(p).length >= 2);
}

/** Verbos en infinitivo de las hojas de taxonomía del libro. */
export function lexicoDeMatriz(wb) {
  const lex = new Set();
  for (const s of wb.SheetNames) {
    if (aAscii(s).startsWith('taxonom')) {
      for (const r of filas(wb.Sheets[s])) {
        for (const x of r) if (typeof x === 'string' && VERBO.test(x.trim())) lex.add(x.trim().toLowerCase());
      }
    }
  }
  return lex;
}

/**
 * Lee una matriz. `lexicoRespaldo` son los verbos de Taxonomias.xlsx para matrices sin hojas de taxonomía.
 * Devuelve { lexico, perfil, componentes, avisos, entidades }.
 */
export function leerMatriz(buffer, lexicoRespaldo = []) {
  const wb = XLSX.read(buffer, { type: buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer) ? 'array' : 'buffer' });
  const avisos = [];
  let lex = lexicoDeMatriz(wb);
  if (!lex.size) {
    lex = new Set(lexicoRespaldo);
    avisos.push('La matriz no tiene hojas de taxonomía: se usa el léxico de verbos institucional (Taxonomias.xlsx).');
  }
  const filasDe = (pref, capa) => {
    const h = hoja(wb, pref);
    if (!h) { avisos.push(`Falta la hoja «${pref}…»: ${capa} no se evalúa.`); return []; }
    return filas(h).slice(2);
  };
  const rellenar = (r, n) => [...r, ...new Array(n).fill(null)];

  const p1 = filasDe('Paso1', 'el perfil').map(r => rellenar(r, 12));
  if (!p1.length || !(ne(p1[0][2]) || ne(p1[0][3]) || p1.some(r => [7, 8, 9].some(j => ne(r[j]))))) {
    avisos.push('El Paso 1 no tiene perfil profesional, perfil ocupacional ni componentes: no hay atributos que evaluar.');
  }
  const perfil = { 'Perfil profesional': p1.length ? p1[0][2] : '', 'Perfil ocupacional': p1.length ? p1[0][3] : '' };
  const componentes = [];
  for (const [j, campo] of [[7, 'Áreas profesionales'], [8, 'Tareas profesionales'], [9, 'Poblaciones actuación']]) {
    for (const r of p1) if (ne(r[j])) for (const it of itemsComponente(r[j])) componentes.push([campo, it]);
  }

  const competencias = [];
  for (let r of filasDe('Paso 2', 'la capa de competencias')) {
    r = rellenar(r, 8);
    if (ne(r[5]) && !norm(r[5]).startsWith('redaccion') && !norm(r[5]).includes(GENERICA)) {
      const partes = [String(r[5]).trim(), ...[r[2], r[3], r[4]].filter(ne).map(x => String(x).trim())];
      if (ne(r[1]) && ne(r[2])) partes.push(`${r[1]} ${r[2]}`);
      competencias.push({ id: `C${competencias.length + 1}`, nombre: String(r[5]).trim(), unidades: partes });
    }
  }

  const ras = [], vistos = new Set();
  for (let r of filasDe('Paso 3', 'la capa de RA')) {
    r = rellenar(r, 10);
    if (ne(r[8]) && norm(r[8]) !== 'resultados aprendizaje' && !norm(r[0] ?? '').includes(GENERICA) && !vistos.has(norm(r[8]))) {
      vistos.add(norm(r[8]));
      ras.push({ id: `RA${ras.length + 1}`, nombre: String(r[8]).trim(), unidades: clausulas(r[8]) });
    }
  }

  const asignaturas = new Map();
  let actual = null, colNuc = 13, colInst = null, filas5 = [];
  const h5 = hoja(wb, 'Paso 5');
  if (!h5) avisos.push('Falta la hoja «Paso 5…»: la capa de asignaturas no se evalúa.');
  else {
    const todas = filas(h5);
    const enc = (todas[1] ?? []).map(v => norm(v ?? ''));
    colNuc = enc.findIndex(v => v.startsWith('nucleos'));
    colInst = enc.findIndex(v => v.includes('institucional'));
    if (colInst < 0) colInst = null;
    if (colNuc < 0) { colNuc = 13; avisos.push('El Paso 5 no tiene encabezado «Núcleos temáticos»: se usa la columna 13 de la plantilla.'); }
    filas5 = todas.slice(2);
  }
  for (let r of filas5) {
    r = rellenar(r, 18);
    if (ne(r[3])) actual = String(r[3]).trim();
    if (!actual || norm(actual).startsWith('electiva') || /^[\d\s.]+$/u.test(actual)) continue;
    if (!asignaturas.has(actual)) {
      asignaturas.set(actual, { id: actual, nombre: actual, unidades: [actual], tipos: ['nombre'], institucional: false });
    }
    const d = asignaturas.get(actual);
    if (colInst !== null && ne(r[3]) && ne(r[colInst])) d.institucional = true;
    const nuevas = [];
    if (ne(r[4])) nuevas.push(...oraciones(r[4]).map(o => [o, 'indicador']));
    if (ne(r[colNuc])) nuevas.push(...tokenizarNucleoCelda(r[colNuc]).filter(esNucleoValido).map(n => [n, 'nucleo']));
    for (const [u, t] of nuevas) {
      if (!d.unidades.includes(u)) { d.unidades.push(u); d.tipos.push(t); }
    }
  }
  const capas = { competencias, RA: ras, asignaturas: [...asignaturas.values()] };
  for (const [capa, ents] of Object.entries(capas)) {
    if (!ents.length && !avisos.some(a => a.includes(capa))) {
      avisos.push(`No se encontraron ${capa} con contenido: esa capa queda sin respaldo para todos los atributos.`);
    }
  }
  return { lexico: lex, perfil, componentes, avisos,
    entidades: { Competencia: competencias, RA: ras, Asignatura: [...asignaturas.values()] } };
}

// ── Ítems del perfil ─────────────────────────────────────────────────────────
const CIFRA_ENCUESTA = /\(\s*\d+\s*\)\s*$/u;
const NO_ATRIBUTO = /^(operativo|tactico|estrategico)$/;

export function evaluable(item) {
  return !(CIFRA_ENCUESTA.test(String(item)) || NO_ATRIBUTO.test(norm(item)));
}

export function itemsPerfil(m) {
  let items = [];
  for (const [perfil, texto] of Object.entries(m.perfil)) {
    const persona = perfil === 'Perfil profesional' ? 'tercera' : 'infinitivo';
    for (const a of extraerAtributosDetalle(texto || '', m.lexico, persona)) {
      items.push({ perfil, origen: 'Texto narrativo', tipo: a.tipo, item: a.breve });
    }
  }
  const vistos = new Set(m.componentes.map(([, t]) => norm(t)));
  items = items.filter(i => !(i.perfil === 'Perfil ocupacional' && vistos.has(norm(i.item))));
  for (const [campo, texto] of m.componentes) {
    items.push({ perfil: 'Perfil ocupacional', origen: campo, tipo: 'Componente', item: texto });
  }
  return items;
}

void fullmatch;
