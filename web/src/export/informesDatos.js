// Arma los datos de los informes PDF (general y por programa) como _datos_informe_general / _datos_informe_programa de Streamlit,
// y los entrega a informesPdf.js. Se construye al hacer clic, con los archivos y filtros vigentes; nada se guarda.
import { zipSync } from 'fflate';
import { CRITERIOS } from '../data/indicadores.js';
import { configActual, hayConfig } from '../data/tendencias.js';
import { indiceExigencia, porGrupo, resumenContraste, DOMINIOS } from '../data/taxonomias.js';
import { mediana } from '../data/estadistica.js';
import { perfilEnCache } from '../perfil/servicio.js';
import { taxonomiasRA } from '../pages/taxonomias.js';
import { asignaturasSinNucleos, calcularResumen, COL_ASIG, recomendacionesMatriz, tipoSaberPorPrograma } from '../pages/resumenDatos.js';
import { informeGeneral, informePrograma } from './informesPdf.js';

const miles = n => n.toLocaleString('es-CO');
const sinHtml = t => t.replace(/<[^>]+>/g, '');
const unicos = (filas, c) => [...new Set(filas.map(f => f[c]).filter(x => x != null && x !== ''))].map(String).sort();

export function nombreArchivoPdf(texto) {
  const base = String(texto).normalize('NFKD').replace(/[^\x00-\x7f]/g, '');
  return base.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'programa';
}

/** Logo institucional (public/logo_poli.png) como data URL con sus dimensiones; null si no se puede leer. */
export async function cargarLogo() {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}logo_poli.png`);
    if (!r.ok) return null;
    const blob = await r.blob();
    const dataUrl = await new Promise((ok, mal) => { const f = new FileReader(); f.onload = () => ok(f.result); f.onerror = mal; f.readAsDataURL(blob); });
    const dim = await new Promise(ok => { const i = new Image(); i.onload = () => ok({ ancho: i.naturalWidth, alto: i.naturalHeight }); i.onerror = () => ok(null); i.src = dataUrl; });
    return dim ? { dataUrl, ...dim } : null;
  } catch { return null; }
}

/** Reúne lo común a todos los informes (una sola vez por clic). */
export async function contextoInformes({ filas, todasFilas, d, etiqueta, archivoDe, archivos, descripcionFiltros }) {
  const programaDe = new Map(todasFilas.map(f => [f.Matriz, f.Programa]));
  const vis = new Set(filas.map(f => f.Matriz));
  let taxo = [];
  try { taxo = (await taxonomiasRA(archivos)).map(r => ({ ...r, Programa: programaDe.get(r.Matriz) ?? r.Programa })).filter(r => vis.has(r.Matriz)); } catch { /* sin Paso 3 legible */ }
  const exigencia = Object.fromEntries(porGrupo(taxo, 'Matriz').map(x => [x.Matriz, x['Índice de exigencia']]));
  const R = calcularResumen({ filas, todasFilas, d, etiqueta, seleccion: null, exigencia });
  const items = new Map();
  for (const [id, archivo] of archivoDe) {
    if (!archivo || !vis.has(id)) continue;
    const r = await perfilEnCache(archivo);
    if (r) items.set(id, r.items);
  }
  return { filas, d, etiqueta, R, taxo, items, alcance: descripcionFiltros, vis };
}

/** Informe general: kpis, V1–V5, prioridades, taxonomías, hallazgos, tendencias y perfil por programa. */
export function datosGeneral(ctx) {
  const { filas, d, etiqueta, R, taxo } = ctx;
  if (R.vacio) return null;
  const meta = new Map();
  for (const f of filas) if (!meta.has(f.Matriz)) meta.set(f.Matriz, { Programa: f.Programa, Modalidad: f.Modalidad ?? '', Ciudad: f.Sede ?? '' });
  const prioridades = R.prioridades.map(p => ({ ...p, ...meta.get(p.Matriz) }))
    .sort((a, b) => b['No cumple'] - a['No cumple'] || b.Parcial - a.Parcial || (a.Programa < b.Programa ? -1 : a.Programa > b.Programa ? 1 : 0) || (a.Matriz < b.Matriz ? -1 : 1));
  const { ts } = tipoSaberPorPrograma(filas);
  const nT = hayConfig() ? Object.keys(configActual().TENDENCIAS_GLOBALES).length : 0;
  const programas = unicos(filas, 'Programa').map(p => {
    const fp = filas.filter(f => f.Programa === p), t = ts.get(p) ?? {};
    return { Programa: p, Matrices: new Set(fp.map(f => f.Matriz)).size, Asignaturas: new Set(fp.map(f => f[COL_ASIG]).filter(x => x != null)).size,
      Saber: t.Saber ?? null, SaberHacer: t.SaberHacer ?? null, SaberSer: t.SaberSer ?? null, Tendencias: R.presencia ? `${R.presencia.get(p)?.size ?? 0}/${nT}` : '-' };
  });
  const sinV1 = R.vista.por_matriz.filter(m => m['V1 %'] === null || m['V1 %'] === undefined)
    .map(m => ({ archivo: `${m.Matriz} (V1)`, causa: d.v1[m.Matriz] === undefined && !(d.perfil[m.Matriz]) ? 'la asociación del perfil no se calculó para esta matriz o ningún atributo del perfil es evaluable' : 'ningún atributo del perfil es evaluable' }));
  return {
    alcance: ctx.alcance, kpis: R.kpis.map(([k, v]) => [k, miles(v)]), globales: R.g, criterios: CRITERIOS,
    conteo_criterios: R.conteo.map(([etq, , c]) => [etq, c]), lectura: R.lectura.map(sinHtml), prioridades,
    taxonomias: taxo.length ? { resumen: resumenContraste(taxo), por_programa: porGrupo(taxo, 'Programa') } : null,
    alertas: R.al, tendencias: R.tend ?? [], programas, errores: [...d.errores, ...sinV1], etiqueta,
  };
}

/** Informe de un programa: valoración por sede, acciones, tipo de saber, tendencias, taxonomías y anexo de elementos a revisar. */
export function datosPrograma(ctx, programa) {
  const { filas, d, etiqueta, R, taxo, items } = ctx;
  const fp = filas.filter(f => f.Programa === programa);
  const matrices = unicos(fp, 'Matriz');
  const porMatriz = new Map(R.vista.por_matriz.map(m => [m.Matriz, m]));
  const detalle = [], alertas = [];
  for (const mz of matrices) {
    const fila = porMatriz.get(mz);
    if (!fila) { alertas.push(`${mz}: la matriz no se pudo evaluar (Pasos 2, 3 o 4 ilegibles).`); continue; }
    const its = items.get(mz) ?? [];
    const sinAlin = its.filter(i => i.evaluable && i.capas_con_respaldo === 0).map(i => [String(i.perfil), String(i.origen), String(i.item)]);
    const ras = R.vista.ra.filter(x => x.matriz === mz);
    const noEval = ras.filter(x => !x.V3).map(x => [x.ra, x.motivo_V3]);
    const sinEst = ras.filter(x => !x.V4).map(x => x.ra + (x.generica ? ' (RA genérico institucional)' : ''));
    const incompletas = R.vista.estrategias.filter(e => e.matriz === mz && !(e.indicadores > 0 && e.instrumento))
      .map(e => [e.estrategia, [e.indicadores > 0 ? null : 'indicador', e.instrumento ? null : 'instrumento'].filter(Boolean).join(' e ')]);
    const valoracion = R.val[mz] ?? [];
    const estados = Object.fromEntries(valoracion.filter(v => v.Variable !== '—').map(v => [v.Variable, v.Estado]));
    detalle.push({ matriz: mz, etiqueta: etiqueta.get(mz) ?? mz, valoracion, estados, recomendaciones: recomendacionesMatriz(estados, fila, sinAlin.length, noEval.length, incompletas.length),
      sin_alineacion: sinAlin, ra_no_evaluables: noEval, ra_sin_estrategia: sinEst, estrategias_incompletas: incompletas, fila });
  }
  alertas.push(...R.al.filter(a => a.Matriz && matrices.includes(a.Matriz)).map(a => a.Hallazgo));
  const sinSem = fp.filter(f => f.Semestre == null || f.Semestre === '' || !Number.isFinite(Number(f.Semestre))).length;
  if (sinSem) alertas.push(`${sinSem} registros del Paso 5 sin semestre reconocible.`);
  const sinNuc = [...asignaturasSinNucleos(fp)].sort();
  if (sinNuc.length) alertas.push(`${sinNuc.length} asignatura(s) no electivas sin núcleos temáticos: ${sinNuc.join(', ')}.`);

  const { ts, medianas } = tipoSaberPorPrograma(filas);
  const t = ts.get(programa);
  const tipoSaber = ['Saber', 'SaberHacer', 'SaberSer'].map(k => ({ Tipo: k, Programa: t ? t[k] : null, Mediana: medianas[k] }));
  let presentes = [], ausentes = [];
  if (R.presencia) {
    const T = configActual().TENDENCIAS_GLOBALES, p = R.presencia.get(programa) ?? new Set();
    presentes = Object.keys(T).filter(k => p.has(k)).map(k => T[k].descripcion);
    ausentes = Object.keys(T).filter(k => !p.has(k)).map(k => T[k].descripcion);
  }
  const suma = (c) => detalle.reduce((a, x) => a + (x.fila[c] ?? 0), 0);
  const noCumple = detalle.reduce((a, x) => a + Object.values(x.estados).filter(e => e === 'No cumple').length, 0);
  const kpis = [['Matrices (sedes)', matrices.length], ['Asignaturas', new Set(fp.map(f => f[COL_ASIG]).filter(x => x != null)).size], ['RA únicos', suma('RA únicos')],
    ['Estrategias', suma('Estrategias')], ['Criterios en No cumple', noCumple]];

  let taxonomias = null;
  if (taxo.length) {
    const medExig = mediana(porGrupo(taxo, 'Matriz').map(x => x['Índice de exigencia']).filter(x => x !== null && x !== undefined));
    const mats = [], revisar = [];
    for (const mz of matrices) {
      const tm = taxo.filter(r => r.Matriz === mz);
      if (!tm.length) continue;
      const etq = etiqueta.get(mz) ?? mz;
      const cuenta = c => { const o = new Map(); tm.forEach(r => o.set(r[c], (o.get(r[c]) ?? 0) + 1)); return o; };
      const dom = cuenta('Dominio declarado');
      mats.push({ etiqueta: etq, ra: tm.length,
        taxonomia: [...cuenta('Taxonomía')].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / tm.length).toFixed(0)} %`).join(' / '),
        exigencia: indiceExigencia(tm.map(r => r['Exigencia declarada'])), mediana: medExig === null || Number.isNaN(medExig) ? null : Math.round(medExig * 10) / 10,
        dominios: DOMINIOS.map(k => String(dom.get(k) ?? 0)).join(' / '), pct: resumenContraste(tm).pct });
      for (const r of tm.filter(x => x.Contraste !== 'Coincide')) {
        revisar.push([etq, r.Verbo, `${r['Dominio declarado']} - ${r['Nivel declarado']}`, `${r['Dominio(s) según la base'] || '-'} - ${r['Nivel según la base'] || '-'}`, r.Contraste]);
      }
    }
    taxonomias = { matrices: mats, revisar };
  }
  return { programa, alcance: `Sedes: ${unicos(fp, 'Sede').join(', ')}  |  Nivel: ${unicos(fp, 'Nivel').join(', ')}  |  Modalidad: ${unicos(fp, 'Modalidad').join(', ')}`,
    kpis: kpis.map(([k, v]) => [k, String(v)]), matrices: detalle, tipo_saber: tipoSaber, tendencias_presentes: R.presencia ? presentes : null, tendencias_ausentes: ausentes,
    alertas, taxonomias, criterios: CRITERIOS };
}

export const programasDe = ctx => unicos(ctx.filas, 'Programa');
export function pdfGeneral(ctx, logo) { const d = datosGeneral(ctx); return d ? informeGeneral(d, logo) : null; }
export function pdfPrograma(ctx, programa, logo) { return informePrograma(datosPrograma(ctx, programa), logo); }

/** ZIP con el informe general y uno por programa (en «programas/»). `alAvance(i, n, nombre)` para mostrar el progreso. */
export async function zipInformes(ctx, logo, alAvance = null) {
  const progs = programasDe(ctx), archivos = {};
  const g = pdfGeneral(ctx, logo);
  if (g) archivos['informe_general_microcurricular.pdf'] = g;
  for (let i = 0; i < progs.length; i++) {
    alAvance?.(i, progs.length, progs[i]);
    await new Promise(r => setTimeout(r, 0));
    archivos[`programas/informe_${nombreArchivoPdf(progs[i])}.pdf`] = pdfPrograma(ctx, progs[i], logo);
  }
  return zipSync(archivos, { level: 6 });
}
