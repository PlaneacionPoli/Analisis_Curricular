// Port de src/indicadores_articulo.py: V1–V5 del artículo, contrastes (R6, R7) y valoración por criterios (D26).
// Fuente: hojas Paso 2, Paso 3 y Paso 4 de cada matriz. Unidad de RA: RA único por matriz (D4).
import * as XLSX from 'xlsx';
import { crearSim } from './difflib.js';
import { kruskal, mediana, spearman } from './estadistica.js';
import { nombreMatriz } from './parseMatrix.js';
import { ceder } from './util.js';

export const SEDES = ['PBOG', 'PMED', 'VNAL', 'HMED', 'HBOG', 'HVAL'];
const GENERICA = 'fenomenos contemporaneos';
export const NIVELES = ['N1 Implementación', 'N2 Percepción y reacción', 'N3 Aprendizaje demostrado', 'N4 Transferencia', 'N5 Efecto externo'];

const NO_OBSERVABLES = new Set(['conocer', 'comprender', 'entender', 'reflexionar', 'valorar', 'apreciar', 'interiorizar', 'sensibilizar', 'concientizar',
  'percibir', 'aceptar', 'respetar', 'saber', 'creer', 'pensar', 'sentir', 'asumir', 'apropiar', 'apropiarse', 'familiarizarse', 'considerar']);
const FINALIDAD = /\b(?:para|mediante|a traves de|con el fin de|con el proposito de)\s+(?:(?:la|el|los|las|su|sus)\s+)?([a-z]+(?:ar|er|ir)(?:se|lo|la|los|las)?)\b/;
const PRODUCTO = /\b(?:un|una|unos|unas)\s+(?:estudio|propuesta|proyecto|informe|plan|prototipo|modelo|diagnostico|producto|documento|ensayo|articulo|programa|estrategia|solucion|analisis|disen[oa]|reporte|portafolio)\b/;
const IMPACTO = /egresados? (vinculad|emplead|contratad|ubicad)|emplea|insercion|vinculad[oa]s? laboral|laboralmente|contratad|ubicacion laboral|emprendimientos? creados?|impacto en (la|el|las|los) (comunidad|entorno|sector|region)|beneficiari|convenios? (firmad|suscrit)|transferencia/;
const LOGRO_SRC = 'puntaje|promedio|aprueb|aprobaci|desempe|nivel de (logro|dominio|desarrollo|competencia)|calificaci|\\bnota\\b|alcanzan|superan|igual o superior|superior a|por encima|mejora en|rubrica|resultados? (de|en) (las? )?prueba|saber (pro|tyt)';
const LOGRO = new RegExp(LOGRO_SRC);
const PERCEPCION = /valoraci|\bvalora\b|satisfacci|percepci|opini|apreciaci|utilidad percibida|nivel de contribuci/;
const APRENDIZAJE = new RegExp(`${LOGRO_SRC}|sustentaci|jurad|evaluad[oa]s? con (rubrica|criterios)|arbitrad|indexad`);
const TRANSFERENCIA = /(evaluaci|desempe|calificaci|valoracion del (tutor|jefe|empleador))[^.]*(practica (empresarial|profesional|laboral)|pasanti|contexto real|escenario real|en la empresa|usuarios reales)/;

// ── utilidades de Python ─────────────────────────────────────────────────────
export function norm(t, puntuacion = false) {
  let s = String(t).normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase();
  if (!puntuacion) s = s.replace(/[^a-z0-9 ]/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}
const lf = t => String(t).replace(/\r\n/g, '\n');   // openpyxl entrega LF donde SheetJS conserva CRLF
const ne = v => v !== null && v !== undefined && !['', 'nan', 'None'].includes(String(v).trim());
const noVacio = v => (v === null || v === undefined || v === 0 || v === '' ? '' : v);   // r[1] or ''

/** round(x, d) de Python (mitad hacia el par sobre el valor binario exacto). */
export function redondear(x, d = 1) {
  const f = 10 ** d, y = x * f, r = Math.round(y);
  return (Math.abs(y - Math.trunc(y)) === 0.5 ? 2 * Math.round(y / 2) : r) / f;
}
const pct = xs => (xs.length ? redondear(100 * xs.filter(Boolean).length / xs.length, 1) : null);

// ── lectura de una matriz ────────────────────────────────────────────────────
function filasDe(wb, prefijo) {
  const n = wb.SheetNames.find(s => s.trim().startsWith(prefijo) && !s.toLowerCase().includes('backup'));
  if (!n) throw new Error(`No se encontró la hoja «${prefijo}»`);
  const ws = wb.Sheets[n];
  const rg = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  rg.s.r = 0; rg.s.c = 0;
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true, range: XLSX.utils.encode_range(rg) }).slice(2);
}

export function leerMatriz(buffer, nombreArchivo) {
  const matriz = nombreMatriz(nombreArchivo);
  const partes = matriz.split('_');
  const sede = SEDES.includes(partes.at(-1)) && partes.length > 1 ? partes.pop() : 'ND';
  const programa = sede === 'ND' ? matriz : partes.join('_');
  const nombres = XLSX.read(buffer, { type: 'array', bookSheets: true }).SheetNames
    .filter(s => ['Paso 2', 'Paso 3', 'Paso 4'].some(p => s.trim().startsWith(p)) && !s.toLowerCase().includes('backup'));
  const wb = XLSX.read(buffer, { type: 'array', sheets: nombres });

  const competencias = [];
  for (const r of filasDe(wb, 'Paso 2')) {
    if (r.length > 5 && ne(r[5]) && !String(r[5]).trim().startsWith('[')) {
      if (norm(r[5]).startsWith('redaccion') || norm(noVacio(r[1])) === 'verbo competencia') continue;
      competencias.push({ verbo: ne(r[1]) ? norm(r[1]) : '', texto: norm(r[5]), generica: norm(r[5]).includes(GENERICA) });
    }
  }
  const ra = new Map();
  for (const r of filasDe(wb, 'Paso 3')) {
    if (r.length > 8 && ne(r[8]) && norm(r[8]) !== 'resultados aprendizaje') {
      const clave = norm(r[8]);
      if (!ra.has(clave)) ra.set(clave, { texto: lf(r[8]).trim(), norm: clave, verbo: noVacio(r[7]), competencias: new Set(), tipos: new Set(), actitudinal: false });
      const d = ra.get(clave);
      if (ne(r[0])) d.competencias.add(norm(r[0]));
      if (ne(r[2])) d.tipos.add(String(r[2]).trim());
      d.actitudinal ||= norm(noVacio(r[2])).includes('ser') || norm(noVacio(r[5])).includes('actitudinal');
    }
  }
  const estrategias = [], meso = [];
  let b = null;
  for (const r of filasDe(wb, 'Paso 4')) {
    if (!r || r.length < 6) continue;
    if (ne(r[1])) { b = { estrategia: lf(r[1]).trim(), indicadores: [], ins: false }; estrategias.push(b); }
    if (b === null) continue;
    if (ne(r[3])) b.indicadores.push(lf(r[3]).trim());
    b.ins ||= ne(r[5]);
    if (ne(r[0])) meso.push([norm(r[0]), b]);
  }
  return { matriz, programa, sede, competencias, ra, estrategias, meso };
}

// ── reglas ───────────────────────────────────────────────────────────────────
export function nivelIndicador(texto) {
  const t = norm(texto, true);
  if (IMPACTO.test(t)) return NIVELES[4];
  if (TRANSFERENCIA.test(t) && !t.includes('simulad')) return NIVELES[3];
  if (APRENDIZAJE.test(t)) return NIVELES[2];
  if (PERCEPCION.test(t)) return NIVELES[1];
  return NIVELES[0];
}

export function raEvaluable(verbo, texto, actitudinal) {
  const v = norm(verbo), t = norm(texto);
  const obs = !NO_OBSERVABLES.has(v) || actitudinal;
  const m = FINALIDAD.exec(t);
  let fin = m ? m[1] : null;
  if (fin && fin.length > 6) fin = fin.replace(/(se|lo|la|los|las)$/, '');
  const prod = (fin !== null && !NO_OBSERVABLES.has(fin)) || PRODUCTO.test(t);
  const motivo = obs ? [] : [`verbo no observable (${v})`];
  if (!prod) motivo.push(!m ? 'sin finalidad o producto declarado' : `finalidad no observable (para ${fin})`);
  return [obs && prod, motivo.join('; ')];
}

const maxPor = (lista, f) => { let mejor, vm = -Infinity; for (const x of lista) { const v = f(x); if (v > vm) { vm = v; mejor = x; } } return mejor; };

export function evaluarMatriz(m, sim = crearSim()) {
  const compTextos = m.competencias.map(c => c.texto);
  const especificas = new Map();
  m.competencias.filter(c => c.verbo && !c.generica).forEach(c => especificas.set(c.verbo, (especificas.get(c.verbo) ?? 0) + 1));
  const repetidos = [...especificas].filter(([, n]) => n > 1).map(x => x[0]).sort();

  const p4 = [...new Set(m.meso.map(x => x[0]))].sort();
  const raLista = [...m.ra.values()];
  const p3 = raLista.map(d => d.norm);
  const mejorP3 = new Map();
  if (p3.length) for (const x of p4) mejorP3.set(x, maxPor(p3, t => sim(t, x)));
  const mutuo = new Set();
  for (const t of p3) {
    if (!p4.length) continue;
    const x = maxPor(p4, y => sim(t, y));
    if (mejorP3.get(x) === t && sim(t, x) >= 0.5) mutuo.add(`${t}\u0000${x}`);
  }
  const ras = raLista.map(d => {
    const t = d.norm;
    const v1 = [...d.competencias].some(c => compTextos.some(ct => c === ct || sim(c, ct) >= 0.8));
    const [ok3, motivo3] = raEvaluable(d.verbo, d.texto, d.actitudinal);
    const vinc = m.meso.filter(([x]) => t === x || sim(t, x) >= 0.8 || mutuo.has(`${t}\u0000${x}`)).map(([, e]) => e);
    return { matriz: m.matriz, programa: m.programa, sede: m.sede, ra: d.texto, generica: t.includes(GENERICA), RA_competencia: v1, V3: ok3, motivo_V3: motivo3,
      V4: vinc.some(e => e.ins), estrategias: new Set(vinc).size };
  });
  const est = m.estrategias.map(e => {
    const niveles = e.indicadores.map(nivelIndicador);
    const max = niveles.length ? niveles.reduce((a, b) => (b > a ? b : a)) : null;
    return { matriz: m.matriz, programa: m.programa, sede: m.sede, estrategia: e.estrategia, indicadores: e.indicadores.length, niveles, instrumento: e.ins,
      nivel_max: max, V5: niveles.length > 0 && max.slice(0, 2) >= 'N2', directa: niveles.some(n => ['N3', 'N4'].includes(n.slice(0, 2))) };
  });
  return { matriz: m.matriz, programa: m.programa, sede: m.sede, competencias: m.competencias.length, verbos_repetidos: repetidos, V2: !repetidos.length, ras, estrategias: est,
    indicadores: m.estrategias.flatMap(e => e.indicadores.map(i => [e.estrategia, i, nivelIndicador(i)])) };
}

const cuenta = xs => { const c = {}; xs.forEach(x => { c[x] = (c[x] ?? 0) + 1; }); return c; };

/** Agrega las matrices ya evaluadas. `v1`: {matriz: [alguna_capa, evaluables]} (puede estar vacío). */
export function agregar(matrices, v1 = {}) {
  const ras = matrices.flatMap(m => m.ras), est = matrices.flatMap(m => m.estrategias);
  const inds = matrices.flatMap(m => m.indicadores.map(([s, i, n]) => ({ matriz: m.matriz, sede: m.sede, estrategia: s, indicador: i, nivel: n })));
  const porMatriz = matrices.map(m => {
    const r = m.ras, e = m.estrategias, v = v1[m.matriz];
    return { Matriz: m.matriz, Programa: m.programa, Sede: m.sede, Competencias: m.competencias, 'RA únicos': r.length, Estrategias: e.length,
      'V1 %': v && v[1] ? redondear(100 * v[0] / v[1], 1) : null, 'RA con competencia %': pct(r.map(x => x.RA_competencia)),
      V2: m.V2 ? 'Sí' : 'No', 'Verbos repetidos': m.verbos_repetidos.join(', '), 'V3 %': pct(r.map(x => x.V3)), 'V4 %': pct(r.map(x => x.V4)),
      'RA sin estrategia': r.filter(x => !x.V4).length, 'V5 %': pct(e.map(x => x.V5)), 'Evidencia directa %': pct(e.map(x => x.directa)),
      'Estrategias con indicador e instrumento': e.filter(x => x.indicadores > 0 && x.instrumento).length,
      'Indicadores por nivel': cuenta(e.flatMap(x => x.niveles.map(n => n.slice(0, 2)))) };
  });
  const conV1 = matrices.filter(m => v1[m.matriz]);
  const sumV1 = i => conV1.reduce((s, m) => s + v1[m.matriz][i], 0);
  const globales = {
    matrices: matrices.length, programas: new Set(matrices.map(m => m.programa)).size, competencias: matrices.reduce((s, m) => s + m.competencias, 0),
    ra_unicos: ras.length, estrategias: est.length, indicadores: inds.length,
    V1: matrices.some(m => (v1[m.matriz] ?? [0, 0])[1]) ? redondear(100 * sumV1(0) / sumV1(1), 1) : null, atributos_perfil: sumV1(1),
    RA_competencia: pct(ras.map(r => r.RA_competencia)), V2: pct(matrices.map(m => m.V2)), V3: pct(ras.map(r => r.V3)), V4: pct(ras.map(r => r.V4)),
    V4_programa: pct(ras.filter(r => !r.generica).map(r => r.V4)), ra_genericos: ras.filter(r => r.generica).length,
    genericos_con_estrategia: ras.filter(r => r.generica && r.V4).length, ra_sin_estrategia: ras.filter(r => !r.V4).length,
    ra_sin_estrategia_programa: ras.filter(r => !r.V4 && !r.generica).length, V5: pct(est.map(e => e.V5)),
    estrategias_directa: est.filter(e => e.directa).length, evidencia_directa: pct(est.map(e => e.directa)),
    niveles: cuenta(inds.map(i => i.nivel)), matrices_con_repeticion: matrices.filter(m => !m.V2).length,
    programas_con_repeticion: new Set(matrices.filter(m => !m.V2).map(m => m.programa)).size,
  };
  return { globales, por_matriz: porMatriz, ra: ras, estrategias: est, indicadores: inds };
}

/** Lee y evalúa todos los archivos cediendo el control entre matrices. */
export async function calcularIndicadores(archivos, { v1 = {}, alAvance = null } = {}) {
  const matrices = [], errores = [];
  for (let i = 0; i < archivos.length; i++) {
    alAvance?.(i, archivos.length, archivos[i].nombre);
    await ceder();
    try { matrices.push(evaluarMatriz(leerMatriz(new Uint8Array(archivos[i].buffer), archivos[i].nombre))); }
    catch (e) { errores.push({ archivo: archivos[i].nombre, causa: String(e?.message ?? e).slice(0, 120) }); }
  }
  return { ...agregar(matrices, v1), errores, matrices };
}

// ── contrastes ───────────────────────────────────────────────────────────────
export function contrastes(porMatriz, minN = 10) {
  const filas = porMatriz.map(m => ({ Matriz: m.Matriz, Sede: m.Sede, V1: m['V1 %'], V2: m.V2 === 'Sí' ? 100 : 0, V4: m['V4 %'], V5: m['V5 %'] }));
  const variables = ['V1', 'V2', 'V4', 'V5'].filter(v => filas.every(f => f[v] !== null && f[v] !== undefined));
  const out = { spearman: [], kruskal: [], motivos: [] };
  if (filas.length < minN) { out.motivos.push(`Hay ${filas.length} matrices; los contrastes requieren al menos ${minN}.`); return out; }
  const valores = Object.fromEntries(variables.map(v => [v, filas.map(f => f[v])]));
  const constantes = variables.filter(v => Math.max(...valores[v]) - Math.min(...valores[v]) === 0);
  if (constantes.length) out.motivos.push(`Variables constantes en el conjunto cargado (sin varianza): ${constantes.join(', ')}.`);
  const activas = variables.filter(v => !constantes.includes(v));
  for (let i = 0; i < activas.length; i++) for (let j = i + 1; j < activas.length; j++) {
    const { rho, p } = spearman(valores[activas[i]], valores[activas[j]]);
    out.spearman.push({ Par: `${activas[i]}–${activas[j]}`, rho: redondear(rho, 2), p: redondear(p, 3), n: filas.length });
  }
  const sedes = new Map();
  filas.forEach(f => { if (!sedes.has(f.Sede)) sedes.set(f.Sede, []); sedes.get(f.Sede).push(f); });
  const unitarias = [...sedes].filter(([, g]) => g.length < 2).map(x => x[0]);
  if (unitarias.length) out.motivos.push(`Sedes con una sola matriz, excluidas de Kruskal-Wallis: ${unitarias.join(', ')}.`);
  const grupos = [...sedes].filter(([, g]) => g.length >= 2);
  if (grupos.length < 2) { out.motivos.push('Se necesitan al menos dos sedes con dos o más matrices para comparar sedes.'); return out; }
  const n = grupos.reduce((s, [, g]) => s + g.length, 0), k = grupos.length;
  for (const v of activas) {
    const muestras = grupos.map(([, g]) => g.map(f => f[v]));
    if (new Set(muestras.flat()).size < 2) continue;
    const { H, p } = kruskal(muestras);
    out.kruskal.push({ Variable: v, H: redondear(H, 2), gl: k - 1, p: redondear(p, 3), 'épsilon²': redondear(Math.max(0, (H - k + 1) / (n - k)), 3), n,
      Sedes: grupos.map(([s, g]) => `${s} (${g.length})`).join(', ') });
  }
  return out;
}

// ── valoración por criterios (D26) ───────────────────────────────────────────
export const CRITERIOS = [
  ['V1', 'Perfil alineado', 'Cada atributo del perfil alineado en al menos una capa (competencias, RA o asignaturas)'],
  ['V2', 'Coherencia de competencias', 'Ningún verbo repetido entre competencias específicas'],
  ['V3', 'Evaluabilidad de los RA', 'Todo RA con verbo observable y finalidad de desempeño o producto'],
  ['V4', 'Trazabilidad de los RA', 'Todo RA vinculado a una estrategia mesocurricular con instrumento'],
  ['V5', 'Indicadores de las estrategias', 'Cada estrategia declara al menos un indicador y un instrumento (Paso 4)'],
];
export const ESTADOS_CRITERIO = ['Cumple', 'Parcial', 'No cumple'];
export const estadoCriterio = p => (p === null || p === undefined ? 'Sin dato' : p >= 100 ? 'Cumple' : p <= 0 ? 'No cumple' : 'Parcial');

export function referenciasConjunto(porMatriz) {
  const ref = {};
  for (const v of ['V1 %', 'V3 %', 'V4 %', 'V5 %']) {
    const xs = porMatriz.map(m => m[v]).filter(x => x !== null && x !== undefined);
    ref[v] = xs.length ? redondear(mediana(xs), 1) : null;
  }
  ref.V2 = porMatriz.length ? redondear(100 * porMatriz.filter(m => m.V2 === 'Sí').length / porMatriz.length, 1) : null;
  ref.n = porMatriz.length;
  return ref;
}

const fmtPct = x => (x === null || x === undefined ? '—' : `${x.toFixed(0)} %`.replace('.', ','));

export function valorarMatriz(fila, { sinRespaldo = null, tresCapas = null, referencia = {} } = {}) {
  const nRA = fila['RA únicos'] || 0, nEst = fila.Estrategias || 0;
  const resultado = {
    V1: [fila['V1 %'], `${fmtPct(fila['V1 %'])} con alguna alineación` + (sinRespaldo !== null ? `; ${fmtPct(sinRespaldo)} sin alineación` : '') + (tresCapas !== null ? `; ${fmtPct(tresCapas)} con las tres capas` : '')],
    V2: [fila.V2 === 'Sí' ? 100 : 0, fila.V2 === 'Sí' ? 'Sin verbos repetidos' : `Verbo repetido: ${fila['Verbos repetidos']}`],
    V3: [fila['V3 %'], `${fmtPct(fila['V3 %'])} de ${nRA} RA`],
    V4: [fila['V4 %'], `${fmtPct(fila['V4 %'])} de ${nRA} RA (${fila['RA sin estrategia'] ?? 0} sin estrategia)`],
    V5: [nEst ? 100 * (fila['Estrategias con indicador e instrumento'] ?? 0) / nEst : null, `${fila['Estrategias con indicador e instrumento'] ?? 0} de ${nEst} estrategias`],
  };
  const refs = { V1: fmtPct(referencia['V1 %']), V2: referencia.V2 !== null && referencia.V2 !== undefined ? `${fmtPct(referencia.V2)} de las matrices cumple` : '—',
    V3: fmtPct(referencia['V3 %']), V4: fmtPct(referencia['V4 %']), V5: '—' };
  return CRITERIOS.map(([v, tramo, criterio]) => ({ Variable: v, Tramo: tramo, Criterio: criterio, Resultado: resultado[v][1], Valor: resultado[v][0],
    Estado: estadoCriterio(resultado[v][0]), 'Referencia (mediana)': refs[v] }));
}
