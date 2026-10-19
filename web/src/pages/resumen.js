// Página «Resumen Ejecutivo»: ¿cómo está el conjunto?, ¿qué matrices requieren atención primero?, ¿qué hacer en cada una?
// Todo sale de los archivos cargados y de los filtros activos; son propuestas para validar por el comité.
import { libroResumen } from '../export/libros.js';
import { MIME_XLSX } from '../export/excelMarca.js';
import { CRITERIOS_EVALUADOS as CRITERIOS, NIVELES as NIVELES_EVIDENCIA, SEDES } from '../data/indicadores.js';
import { mediana } from '../data/estadistica.js';
import { cargarConfig, hayConfig } from '../data/tendencias.js';
import { porGrupo } from '../data/taxonomias.js';
import { aviso, botonDescarga, columnas, descargar, grafico, h, info, kpi, metrica, panel, selector, tabla, titulo } from '../ui.js';
import { actualizar } from '../store.js';
import { cargarLogo, contextoInformes, nombreArchivoPdf, pdfGeneral, pdfPrograma, programasDe, zipInformes } from '../export/informesDatos.js';
import { datosIndicadores, paginaIndicadores, tablaNiveles } from './indicadores.js';
import { taxonomiasRA } from './taxonomias.js';
import { asociacionRA, cadenaCompetencias, calcularResumen, NIVELES, recomendacionesMatriz, tipoSaberPorPrograma } from './resumenDatos.js';
import { calcularFaltantes, estadoLote, modoPerfil } from '../perfil/lote.js';
import { panelV1 } from './panelV1.js';

const ICONO = { Cumple: '🟢 Cumple', Parcial: '🟡 Parcial', 'No cumple': '🔴 No cumple', 'Sin dato': '⚪ Sin dato' };
const COLOR = { Cumple: '#1FB2DE', Parcial: '#FBAF17', 'No cumple': '#EC0677', 'Sin dato': '#8A94A0' };
const local = { pestana: 'Estado del conjunto', tipoCompetencia: 'Todas', rerender: null, matriz: null, cfgCargando: false, autoV1: false, autoVersion: -1, exig: null, exigFirma: '', exigCargando: false, programa: null, pdf: { ocupado: false, mensaje: '' } };
const fmt = v => (v === null || v === undefined ? '—' : `${v.toFixed(0)}%`);
const miles = n => n.toLocaleString('es-CO');
const PESTANAS = ['Estado del conjunto', 'Listados de revisión', 'Acciones e informes', 'Detalle por indicador'];
const MIME_PDF = 'application/pdf';

/** Índice de exigencia por matriz (de Taxonomías), para la fila descriptiva de la valoración; se carga una vez y repinta al terminar. */
function exigenciaPorMatriz(archivos, filas, todasFilas, rerender) {
  const firma = archivos.map(a => a.huella ?? a.nombre).join('|');
  if (local.exigFirma !== firma) { local.exigFirma = firma; local.exig = null; local.exigCargando = false; }
  if (!local.exig && !local.exigCargando) {
    local.exigCargando = true;
    const programaDe = new Map(todasFilas.map(f => [f.Matriz, f.Programa]));
    taxonomiasRA(archivos).then(ra => { local.exig = Object.fromEntries(porGrupo(ra.map(r => ({ ...r, Programa: programaDe.get(r.Matriz) ?? r.Programa })), 'Matriz').map(x => [x.Matriz, x['Índice de exigencia']])); })
      .catch(() => { local.exig = {}; }).finally(() => { local.exigCargando = false; rerender(); });
  }
  return local.exig ?? {};
}

/** Genera con el estado vigente y entrega la descarga; muestra «Generando…» mientras tanto. */
async function generar(args, mensaje, hacer, rerender) {
  if (local.pdf.ocupado) return;
  local.pdf = { ocupado: true, mensaje }; rerender();
  try {
    await new Promise(r => setTimeout(r, 30));
    const ctx = await contextoInformes(args);
    const logo = await cargarLogo();
    await hacer(ctx, logo);
    local.pdf = { ocupado: false, mensaje: '' };
  } catch (e) { local.pdf = { ocupado: false, mensaje: `No se pudo generar el informe: ${e?.message ?? e}` }; }
  rerender();
}

function seccionPdf(args, matrices, rerender) {
  const programas = [...new Set(args.filas.map(f => f.Programa))].sort();
  if (!programas.includes(local.programa)) local.programa = programas[0] ?? null;
  const ocupado = local.pdf.ocupado;
  const boton = (texto, alClic, clase = 'boton') => h('button', { type: 'button', class: clase, disabled: ocupado ? true : null, onclick: alClic }, texto);
  return h('div', {},
    h('h3', {}, 'Informes descargables'),
    h('p', { class: 'leyenda' }, 'Se generan al hacer clic con los archivos y filtros vigentes; no se guarda nada. Incluyen valoración V1–V5, acciones sugeridas, tipo de saber, tendencias, taxonomías y un anexo con los elementos por revisar.'),
    columnas(
      h('div', {}, h('b', {}, 'Informe general'), h('p', { class: 'leyenda' }, 'Lectura rápida, V1–V5, valoración por criterios, matrices que requieren atención, hallazgos transversales, tendencias y perfil por programa.'),
        boton('Descargar informe general (PDF)', () => generar(args, 'Generando el informe general…', async (ctx, logo) => {
          const pdf = pdfGeneral(ctx, logo);
          if (pdf) descargar('informe_general_microcurricular.pdf', pdf, MIME_PDF);
        }, rerender))),
      h('div', {}, h('b', {}, 'Informe por programa'), h('p', { class: 'leyenda' }, 'Valoración de cada sede, acciones sugeridas, tipo de saber, tendencias y anexo con los atributos, RA y estrategias a revisar.'),
        selector('Programa', programas, local.programa ?? '', v => { local.programa = v; rerender(); }),
        local.programa ? boton('Descargar informe del programa (PDF)', () => generar(args, `Generando el informe de ${local.programa}…`, async (ctx, logo) => {
          descargar(`informe_${nombreArchivoPdf(local.programa)}.pdf`, pdfPrograma(ctx, local.programa, logo), MIME_PDF);
        }, rerender)) : null)),
    h('p', {}, h('b', {}, 'Conjunto completo'), ' ',
      boton(`Descargar el informe general y ${programas.length} informes por programa (ZIP)`, () => generar(args, 'Generando los informes…', async (ctx, logo) => {
        const zip = await zipInformes(ctx, logo, (i, n, nombre) => { local.pdf.mensaje = `Generando informe ${i + 1} de ${n}: ${nombre}`; rerender(); });
        descargar('informes_microcurriculares.zip', zip, 'application/zip');
      }, rerender))),
    ocupado || local.pdf.mensaje ? aviso(ocupado ? 'info' : 'warning', local.pdf.mensaje) : null);
}

export function paginaResumen({ filas, todasFilas, archivos, archivoDe, etiqueta, seleccion, descripcionFiltros, rerender }) {
  const cab = [...titulo('Resumen Ejecutivo'),
    info('Síntesis para el comité curricular: <b>estado del conjunto</b> frente a los criterios V1–V5, <b>matrices que requieren atención primero</b> y <b>acciones sugeridas</b> por matriz. ' +
      'Se calcula con los archivos cargados y los filtros activos; es una propuesta para validación del comité.')];
  if (!hayConfig() && !local.cfgCargando) { local.cfgCargando = true; cargarConfig().then(() => { local.cfgCargando = false; rerender(); }); }
  const d = datosIndicadores({ archivos, archivoDe, rerender });
  if (!d.matrices) {
    return h('div', {}, ...cab, d.error ? aviso('error', d.error)
      : aviso('info', `Leyendo las hojas Paso 2, 3 y 4… ${d.avance ? `${d.avance[0]} de ${d.avance[1]} archivos` : ''}`));
  }

  // al entrar al Resumen, V1 se completa solo si ya se eligió el modo (con o sin modelo); la primera vez se pide la elección
  const lote = estadoLote();
  // solo cuando ya se leyó la caché: antes «faltan» todas las matrices y se arrancaría el motor sin necesidad
  // un intento por estado del lote: si tras calcular siguen «faltando» matrices (p. ej. con error), no se relanza en bucle
  if (d.v1Leido && d.faltanPerfil > 0 && modoPerfil() && !lote.corriendo && !lote.error && !lote.omitido && !local.autoV1 && local.autoVersion !== lote.version) {
    local.autoV1 = true; local.autoVersion = lote.version;
    queueMicrotask(() => calcularFaltantes(archivoDe, modoPerfil(), rerender).finally(() => { local.autoV1 = false; }));
  }

  // mientras se calcula el perfil solo se muestra el avance: redibujar tablas y gráficos en cada paso saturaría el navegador
  if (lote.corriendo) return h('div', {}, ...cab, panelV1({ archivoDe, faltan: d.faltanPerfil, rerender }));

  local.rerender = rerender;
  const exig = exigenciaPorMatriz(archivos, filas, todasFilas, rerender);
  const R = calcularResumen({ filas, todasFilas, d, etiqueta, seleccion, exigencia: exig });
  if (R.vacio) return h('div', {}, ...cab, aviso('warning', 'Ninguna matriz de la vista tiene los Pasos 2, 3 y 4 legibles.'));
  const { vista, g, ref, val, prioridades, conteo, lectura, tend, kpis, al } = R;
  const cad = cadenaCompetencias(d.matrices.filter(m => R.vis.has(m.matriz) && (!seleccion || m.matriz === seleccion)), R.filasVista, etiqueta);
  const rc = cad.resumen;
  const aso = asociacionRA(vista.ra, R.filasVista, etiqueta);
  if (rc.total) {
    lectura.push(cad.huerfanas.length
      ? `Competencias del perfil: <b>${cad.huerfanas.length} de ${rc.total}</b> combinaciones de competencia y tipo de saber no llegan a RA, a una estrategia mesocurricular con instrumento o a asignaturas (${rc.huerfanasGenericas} en genéricas y ${rc.huerfanasEspecificas} en específicas).`
      : `Competencias del perfil: las <b>${rc.competencias}</b> competencias llegan, en cada tipo de saber, a RA, estrategia mesocurricular y asignaturas.`);
  }

  const matricesVista = prioridades.map(p => p.Matriz);
  if (!matricesVista.includes(local.matriz)) local.matriz = matricesVista[0] ?? null;
  const sel = seleccion ?? local.matriz;

  const resumen = estadoConjunto({ R, d, cad, aso, etiqueta, exig });
  const listados = h('div', {},
    h('p', { class: 'leyenda' }, 'Listados completos que respaldan los hallazgos de la pestaña «Estado del conjunto». Aquí se revisan matriz por matriz.'),
    h('h3', {}, 'Valoración V1–V5 por matriz'),
    h('p', { class: 'leyenda' }, 'Matrices por estado en cada criterio. Cumple: la regla de la plantilla se cumple en todos los casos; Parcial: en algunos; No cumple: en ninguno.'),
    grafico(['Cumple', 'Parcial', 'No cumple', 'Sin dato'].map(s => ({ type: 'bar', orientation: 'h', name: s, y: conteo.map(c => c[0]), x: conteo.map(c => c[2][s]),
      text: conteo.map(c => c[2][s] || ''), textposition: 'inside', marker: { color: COLOR[s] } })),
    { height: 320, barmode: 'stack', xaxis: { title: 'Matrices' }, yaxis: { autorange: 'reversed' }, margin: { l: 250, r: 10, t: 10, b: 40 } }),
    h('h3', {}, 'Matrices que requieren atención'),
    h('p', { class: 'leyenda' }, 'Ordenadas por número de criterios en «No cumple» y luego en «Parcial».'),
    tabla(prioridades.map(p => ({ Matriz: p.Etiqueta, ...Object.fromEntries(CRITERIOS.map(([v, e]) => [`${v} ${e}`, ICONO[p[v]]])), 'No cumple': p['No cumple'], Parcial: p.Parcial })),
      ['Matriz', ...CRITERIOS.map(([v, e]) => `${v} ${e}`), 'No cumple', 'Parcial'].map(c => ({ title: c, field: c, ...(c === 'Matriz' ? { minWidth: 280, frozen: true } : {}) })),
      { height: Math.min(560, 35 * prioridades.length + 50) }),
    botonDescarga('Descargar resumen (Excel)', async () => descargar('resumen_ejecutivo.xlsx', await libroResumen({ asociacion: aso.filas, cadena: cad.filas, prioridades, lectura, val, alertas: al, tendencias: tend, etiqueta, criterios: CRITERIOS, alcance: descripcionFiltros.replace(/^Filtros: /, '') }), MIME_XLSX)),
    h('hr'),
    cadenaCompetenciasVista(cad),
    h('hr'),
    asociacionRAVista(aso),
    h('hr'),
    h('h3', {}, 'Hallazgos transversales'),
    al.length ? h('div', {}, ...al.map(a => h('details', {}, h('summary', {}, `${a.Categoría}: ${a.Hallazgo}`), h('p', {}, h('b', {}, 'Recomendación: '), a.Recomendación))))
      : aviso('success', 'No se detectaron alertas de tipo de saber ni de completitud de datos.'),
    tend ? h('details', {}, h('summary', {}, `Presencia de las ${tend.length} tendencias globales (de menor a mayor)`),
      h('p', { class: 'leyenda' }, 'No existe un mínimo institucional de cobertura, por lo que ninguna tendencia se califica como baja. La tabla las ordena para que el comité decida cuáles reforzar.'),
      tabla(tend, Object.keys(tend[0]).map(c => ({ title: c, field: c, ...(c === 'Tendencia' ? { minWidth: 240 } : { hozAlign: 'right' }) })), { height: false })) : null,
    h('hr'),
    bloqueTendencias(R.principales));
  const accionesPdf = h('div', {},
    seccionPdf({ filas, todasFilas, d, etiqueta, archivoDe, archivos, descripcionFiltros }, matricesVista, rerender),
    h('hr'),
    h('h3', {}, 'Acciones sugeridas por matriz'),
    seleccion ? null : selector('Matriz', matricesVista.map(m => etiqueta.get(m) ?? m), etiqueta.get(sel) ?? '',
      v => { local.matriz = matricesVista.find(m => (etiqueta.get(m) ?? m) === v); rerender(); }),
    sel ? vistaAcciones({ sel, vista, val, d, etiqueta }) : null);

  const detalle = local.pestana === 'Detalle por indicador'
    ? paginaIndicadores({ filas, archivos, archivoDe, etiqueta, seleccion, rerender, incrustada: true }) : null;
  const cuerpo = local.pestana === 'Acciones e informes' ? accionesPdf : local.pestana === 'Detalle por indicador' ? detalle : local.pestana === 'Listados de revisión' ? listados : resumen;
  return h('div', {}, ...cab,
    seleccion ? aviso('info', `<b>Vista de matriz:</b> ${etiqueta.get(seleccion)}. Las medianas de referencia son las de las ${ref.n} matrices cargadas.`) : h('p', { class: 'leyenda' }, descripcionFiltros),
    panelV1({ archivoDe, faltan: d.faltanPerfil, rerender }),
    ...d.errores.map(e => aviso('warning', `No se pudo evaluar <b>${e.archivo}</b>: ${e.causa}`)),
    h('div', { class: 'pestanas' }, ...PESTANAS.map(n => h('button', { type: 'button', class: n === local.pestana ? 'activa' : '', onclick: () => { local.pestana = n; rerender(); } }, n))),
    cuerpo);
}

const ir = pagina => () => { actualizar({ pagina }); window.scrollTo?.(0, 0); };
const enlace = (texto, pagina) => h('button', { type: 'button', class: 'boton secundario', onclick: ir(pagina) }, `${texto} →`);
// cada variable conserva su ícono y su color en todo el Resumen; el estado (cumple, parcial) se indica aparte con 🟢 🟡 🔴
const ICONO_V = { V1: 'person-badge', V2: 'puzzle', V3: 'clipboard-check', V4: 'link-45deg', V5: 'speedometer2' };
const COLOR_V = { V1: '#1FB2DE', V2: '#0F385A', V3: '#17B3B3', V4: '#FBAF17', V5: '#EC0677' };
const COLOR_NIVEL = { Pregrado: '#1FB2DE', Posgrado: '#0F385A', 'Sin nivel': '#8A94A0' };
const MEDALLA = { Cumple: '#1FB2DE', Parcial: '#FBAF17', 'No cumple': '#EC0677' };
const ORDEN_ESTADO = ['Cumple', 'Parcial', 'No cumple', 'Sin dato'];

/** Barras agrupadas: % de asignaturas que mencionan cada tendencia, en pregrado y en posgrado (las 8 más presentes del conjunto). */
function graficoTendencias(pt, cuantas = 8) {
  const top = pt.filas.slice(0, cuantas), orden = [...top].reverse();
  const traza = nivel => ({ type: 'bar', orientation: 'h', name: `${nivel} (${pt.n[nivel].programas} programas)`, y: orden.map(t => t.Tendencia), x: orden.map(t => +(t[nivel].pct ?? 0).toFixed(1)), marker: { color: COLOR_NIVEL[nivel] },
    text: orden.map(t => (t[nivel].pct === null ? '' : `${t[nivel].pct.toFixed(0)} %`)), textposition: 'outside', cliponaxis: false,
    customdata: orden.map(t => [t[nivel].asignaturas, t[nivel].programas]), hovertemplate: `${nivel}<br>%{y}<br>%{x:.1f} % de las asignaturas (%{customdata[0]}) · %{customdata[1]} programas<extra></extra>` });
  const max = Math.max(10, ...top.flatMap(t => NIVELES.map(n => t[n].pct ?? 0)));
  return grafico(NIVELES.filter(n => pt.n[n].asignaturas).map(traza),
    { height: 60 * top.length + 90, barmode: 'group', xaxis: { title: '% de asignaturas que mencionan la tendencia', range: [0, Math.min(100, max * 1.2)] }, legend: { orientation: 'h', y: -0.18 },
      margin: { l: 300, r: 40, t: 10, b: 80 }, yaxis: { automargin: true } });
}

function bloqueTendencias(pt) {
  if (!pt) return aviso('info', 'Las tendencias globales no están cargadas; no se pueden mostrar las principales tendencias.');
  const top = pt.filas.slice(0, 3), fmtP = v => (v === null ? '—' : `${v.toFixed(0)} %`), nT = pt.n.Total;
  const sinNivel = nT.programas - NIVELES.reduce((a, n) => a + pt.n[n].programas, 0);
  return panel({ titulo: 'Principales tendencias globales', lectura: pt.lectura,
    bajada: 'Las tendencias más presentes en las asignaturas, ordenadas por el % de asignaturas que las mencionan en el nombre o el contenido (palabras clave; no es un juicio sobre su enfoque). Pregrado y posgrado se comparan por separado.' },
  columnas(...top.map((t, i) => kpi({ icono: ['trophy', 'award', 'star'][i], etiqueta: `Tendencia n.º ${i + 1}`, valor: fmtP(t.Total.pct), color: ['#1FB2DE', '#42F2F2', '#FBAF17'][i],
    nota: `${t.Tendencia} · ${t.Total.programas} de ${nT.programas} programas · pregrado ${fmtP(t.Pregrado.pct)}, posgrado ${fmtP(t.Posgrado.pct)}` }))),
  graficoTendencias(pt),
  sinNivel > 0 ? aviso('info', `${sinNivel} programa(s) con nivel mixto o no identificado cuentan en «conjunto» pero no en pregrado ni en posgrado.`) : null,
  enlace('Ver todas las tendencias, asignaturas y palabras clave en Tendencias Globales', 'Tendencias Globales'));
}

/**
 * Pestaña «Estado del conjunto» (resumen ejecutivo): una sección por variable, V1 a V5, con el orden y las cifras que reporta el artículo (R1–R5).
 * Cada sección da la lectura en una frase, cuatro cifras y, plegado, el desglose del artículo (Tablas 8–10) y lo que hay que atender.
 */
const fp = v => (v === null || v === undefined || Number.isNaN(v) ? '—' : `${v.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`);
const pc = (a, b) => (b ? 100 * a / b : null);
const irPestana = nombre => () => { local.pestana = nombre; window.scrollTo?.(0, 0); local.rerender?.(); };
const boton = (texto, alClic) => h('button', { type: 'button', class: 'boton secundario', onclick: alClic }, `${texto} →`);
const EVIDENCIA = { N1: 'Indirecta', N2: 'Indirecta', N3: 'Directa', N4: 'Directa', N5: 'Efecto externo' };
const tablaCorta = (filas, primera = 'Matriz') => tabla(filas, Object.keys(filas[0]).map(c => ({ title: c, field: c, ...(c === primera ? {} : { hozAlign: 'center', minWidth: 110 }) })), { height: false });
const subtitulo = t => h('h4', {}, t);

function seccionVariable({ v, nombre, regla, kpis, lectura, nota, desglose = [], vinculos = [], color, abierto = false }) {
  const cuerpo = desglose.filter(Boolean);
  // la lectura va primero: es la frase que resume la variable para quien solo lee el comienzo de la sección
  return panel({ titulo: `${v} · ${nombre}`, bajada: regla },
    lectura ? h('p', { class: 'lectura', html: `<i class="bi bi-lightbulb"></i> ${lectura}` }) : null,
    columnas(...kpis.map(k => kpi({ icono: ICONO_V[v], color, clase: 'compacto', ...k }))),
    nota ? h('p', { class: 'leyenda' }, nota) : null,
    cuerpo.length ? h('details', { open: abierto ? true : null }, h('summary', {}, 'Ver desglose'), ...cuerpo) : null,
    h('div', {}, ...vinculos));
}

function estadoConjunto({ R, d, cad, aso, etiqueta, exig }) {
  const { g, vista, prioridades, conteo, kpis: alcance } = R;
  const n = prioridades.length, vars = CRITERIOS.map(([v]) => v), pm = vista.por_matriz, nom = id => etiqueta.get(id) ?? id;
  const ids = new Set(pm.map(m => m.Matriz));
  const cumple = v => conteo.find(c => c[1] === v)[2].Cumple;
  const colorDe = v => COLOR_V[v];
  const estadoDe = v => (conteo.find(c => c[1] === v)[2]['No cumple'] ? '🔴' : cumple(v) < n ? '🟡' : '🟢');
  const nombres = Object.fromEntries(CRITERIOS), reglas = Object.fromEntries(CRITERIOS.map(c => [c[0], c[2]]));
  const fuertes = conteo.filter(c => c[2].Cumple === n).map(c => c[1]), debiles = conteo.filter(c => c[2].Cumple < n);
  const veredicto = `<b>${fuertes.length} de ${conteo.length} criterios se cumplen en las ${n} matrices</b>${fuertes.length ? ` (${fuertes.join(', ')})` : ''}. ` +
    (debiles.length ? `Requieren atención: ${debiles.map(c => `<b>${c[1]}</b> (${c[2].Cumple} de ${n} matrices cumplen)`).join('; ')}.` : '');
  const resultados = { V1: g.V1, V2: g.V2_comp, V3: g.V3, V4: g.V4, V5: g.V5 };
  const semaforo = columnas(...vars.map(v => kpi({ icono: ICONO_V[v], etiqueta: `${v} · ${nombres[v]}`, valor: fp(resultados[v]), color: colorDe(v), clase: 'compacto', nota: `${estadoDe(v)} ${cumple(v)} de ${n} matrices cumplen`,
    ayuda: 'El porcentaje es sobre atributos, competencias, RA o estrategias; el conteo, sobre matrices.' })));
  const porMatriz = (filas, clave) => { const c = new Map(); filas.forEach(f => c.set(f[clave], (c.get(f[clave]) ?? 0) + 1)); return c; };

  // ── V1: correspondencia del perfil con competencias, RA y asignaturas (R1, Tabla 8) ─────────────────────────
  const pf = Object.entries(d.perfil).filter(([id, p]) => ids.has(id) && p.porPerfil).map(([, p]) => p);
  const suma = k => pf.reduce((a, p) => a.map((x, i) => x + p.porPerfil[k][i]), [0, 0, 0, 0, 0, 0]);
  const prof = suma('Profesional'), ocu = suma('Ocupacional'), tot = prof.map((x, i) => x + ocu[i]);
  const fila8 = (Perfil, x) => ({ Perfil, Atributos: miles(x[0]), Competencias: fp(pc(x[3], x[0])), RA: fp(pc(x[4], x[0])), Asignaturas: fp(pc(x[5], x[0])), 'Alguna capa (V1)': fp(pc(x[1], x[0])), 'Tres capas': fp(pc(x[2], x[0])), 'Ninguna capa': fp(pc(x[0] - x[1], x[0])) });
  const v1m = pm.filter(m => m['V1 %'] !== null && m['V1 %'] !== undefined).sort((a, b) => a['V1 %'] - b['V1 %'] || nom(a.Matriz).localeCompare(nom(b.Matriz), 'es'));
  const v1s = v1m.map(m => m['V1 %']), sinAlguna = v1m.filter(m => m['V1 %'] < 100).length;
  const seccionV1 = !tot[0] ? seccionVariable({ v: 'V1', nombre: nombres.V1, regla: reglas.V1, kpis: [], desglose: [aviso('info', 'Aún no hay datos de V1: falta calcular el perfil de egreso de las matrices.')], color: colorDe('V1') })
    : seccionVariable({
      v: 'V1', nombre: nombres.V1, regla: reglas.V1, color: colorDe('V1'),
      lectura: `<b>${miles(tot[0] - tot[1])} de ${miles(tot[0])} atributos</b> (${fp(pc(tot[0] - tot[1], tot[0]))}) del perfil no se alinean con ninguna capa; ${sinAlguna} de ${n} matrices tienen al menos uno. La más baja: ${nom(v1m[0].Matriz)} (${fp(v1m[0]['V1 %'])}).`,
      kpis: [{ etiqueta: 'Alguna capa (V1)', valor: fp(g.V1), nota: `${miles(tot[1])} de ${miles(tot[0])} atributos del perfil` },
        { etiqueta: 'Las tres capas a la vez', valor: fp(pc(tot[2], tot[0])), nota: 'competencias, RA y asignaturas' },
        { etiqueta: 'Con alguna asignatura', valor: fp(pc(tot[5], tot[0])), nota: `con alguna competencia ${fp(pc(tot[3], tot[0]))} · con algún RA ${fp(pc(tot[4], tot[0]))}` },
        { etiqueta: 'V1 por matriz (mediana)', valor: fp(mediana(v1s)), nota: `de ${fp(Math.min(...v1s))} a ${fp(Math.max(...v1s))} · ${v1m.filter(m => m['V1 %'] >= 100).length} matrices con todo alineado` }],
      nota: 'V1 se calcula con el método de asociación del perfil (léxico y modelo semántico); su acuerdo con una lectura de referencia está pendiente de validación por el comité curricular.',
      desglose: [subtitulo('Alineación por tipo de perfil y capa curricular'), tablaCorta([fila8('Profesional', prof), fila8('Ocupacional', ocu), fila8('Total', tot)], 'Perfil'),
        subtitulo('Matrices con menor V1'), tablaCorta(v1m.slice(0, 5).map(m => ({ Matriz: nom(m.Matriz), V1: fp(m['V1 %']), 'Atributos sin alineación': `${d.perfil[m.Matriz]?.nSin ?? '—'} de ${d.perfil[m.Matriz]?.n ?? '—'}` })))],
      vinculos: [boton('Ver los atributos sin alineación en Perfil de Egreso', ir('Perfil de Egreso (V1)'))] });

  // ── V2: competencias alineadas con RA y coherencia horizontal (R2) ──────────────────────────────────────────
  const rc = cad.resumen, rep = pm.filter(m => m.V2 === 'No');
  const seccionV2 = seccionVariable({ v: 'V2', nombre: nombres.V2, color: colorDe('V2'),
    regla: `${reglas.V2}. El artículo analiza además la coherencia horizontal: que las competencias específicas de un programa no repitan el verbo rector.`,
    lectura: `${g.V2_comp >= 100 ? 'Todas las' : `${fp(g.V2_comp)} de las`} ${miles(g.competencias_especificas)} competencias específicas tienen RA; ${rep.length ? `<b>${rep.length} de ${n} matrices</b> repiten un verbo entre competencias específicas` : 'ninguna matriz repite un verbo entre competencias específicas'}${rc.sinRA ? `; ${rc.sinRA} combinaciones competencia × tipo de saber no tienen RA` : ' y ninguna omite un tipo de saber'}.`,
    kpis: [{ etiqueta: 'Competencias específicas con RA', valor: fp(g.V2_comp), nota: `${miles(g.competencias_especificas)} competencias específicas` },
      { etiqueta: 'Matrices sin verbo repetido', valor: fp(pc(n - rep.length, n)), nota: `${rep.length} de ${n} repiten un verbo (coherencia horizontal)` },
      { etiqueta: 'Competencias del perfil', valor: miles(rc.competencias), nota: `${miles(rc.competencias - rc.genericas)} específicas · ${miles(rc.genericas)} genéricas (institucional)` },
      { etiqueta: 'Sin RA de un tipo de saber', valor: miles(rc.sinRA), nota: 'competencia × tipo de saber (Saber, SaberHacer, SaberSer)' }],
    desglose: [rep.length ? subtitulo('Matrices que repiten un verbo entre competencias específicas') : null,
      rep.length ? tablaCorta(rep.map(m => ({ Matriz: nom(m.Matriz), 'Verbo repetido': m['Verbos repetidos'] }))) : aviso('success', 'Ninguna matriz repite un verbo entre sus competencias específicas.')],
    vinculos: [boton('Ver el detalle de V2 a V5', irPestana('Detalle por indicador'))] });

  // ── V3: evaluabilidad de los RA (R3) y exigencia (descriptiva) ──────────────────────────────────────────────
  const noEval = vista.ra.filter(r => !r.V3), porM3 = porMatriz(noEval, 'matriz');
  const seccionV3 = seccionVariable({ v: 'V3', nombre: nombres.V3, color: colorDe('V3'),
    regla: `${reglas.V3}: el RA inicia con un verbo observable (en SaberSer se admite el verbo afectivo) y declara la finalidad del desempeño o el producto esperado.`,
    lectura: noEval.length ? `<b>${noEval.length} RA</b> no son evaluables, en ${porM3.size} matrices.` : `Los ${miles(g.ra_unicos)} RA únicos son evaluables en las ${n} matrices; V3 no distingue entre programas.`,
    kpis: [{ etiqueta: 'RA evaluables', valor: fp(g.V3), nota: `${miles(g.ra_unicos - noEval.length)} de ${miles(g.ra_unicos)} RA únicos` },
      { etiqueta: 'RA no evaluables', valor: miles(noEval.length), nota: noEval.length ? `en ${porM3.size} matrices` : 'todos cumplen ambos criterios' },
      { etiqueta: 'Matrices que cumplen', valor: `${cumple('V3')} de ${n}`, nota: 'todos sus RA evaluables' },
      { etiqueta: 'RA por matriz (mediana)', valor: miles(Math.round(mediana(pm.map(m => m['RA únicos'])) ?? 0)), nota: `de ${miles(Math.min(...pm.map(m => m['RA únicos'])))} a ${miles(Math.max(...pm.map(m => m['RA únicos'])))} RA únicos` }],
    desglose: [noEval.length ? subtitulo('Matrices con RA no evaluables') : null,
      noEval.length ? tablaCorta([...porM3].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([m, c]) => ({ Matriz: nom(m), 'RA no evaluables': c }))) : aviso('success', 'Todos los RA cumplen ambos criterios.')],
    vinculos: [boton('Ver la taxonomía y los niveles declarados de los RA', ir('Taxonomías'))] });

  // ── V4: trazabilidad de los RA hasta una estrategia con instrumento (R4, Tabla 9) ───────────────────────────
  const ras = vista.ra, delPrograma = ras.filter(r => !r.generica), genericos = ras.filter(r => r.generica);
  const c4 = a => (a.length ? `${fp(pc(a.filter(r => r.V4).length, a.length))} (${a.filter(r => r.V4).length}/${a.length})` : '—');
  const sedes = [...new Set(ras.map(r => r.sede))].sort((a, b) => (SEDES.indexOf(a) + 1 || 99) - (SEDES.indexOf(b) + 1 || 99));
  const tabla9 = [...sedes.map(s => ({ Sede: s, 'RA de programa': c4(delPrograma.filter(r => r.sede === s)), 'RA genérico': c4(genericos.filter(r => r.sede === s)), 'Todos los RA': c4(ras.filter(r => r.sede === s)) })),
    { Sede: 'Total', 'RA de programa': c4(delPrograma), 'RA genérico': c4(genericos), 'Todos los RA': c4(ras) }];
  const sinProg = porMatriz(delPrograma.filter(r => !r.V4), 'matriz'), v4s = pm.map(m => m['V4 %']).filter(x => x !== null && x !== undefined);
  const generico = g.ra_sin_estrategia - g.ra_sin_estrategia_programa, ra = aso.resumen, microMed = mediana(aso.filas.map(f => f['Asignaturas con estrategias micro (Paso 5)']));
  const seccionV4 = seccionVariable({ v: 'V4', nombre: nombres.V4, color: colorDe('V4'),
    regla: `${reglas.V4}. Se distingue el RA de programa del RA de la competencia genérica institucional.`,
    lectura: `<b>${miles(g.ra_sin_estrategia)} RA</b> no llegan a una estrategia mesocurricular con instrumento: ${miles(generico)} son el RA genérico institucional (${genericos.length ? `solo ${fp(pc(g.genericos_con_estrategia, g.ra_genericos))} lo tiene` : 'ninguna matriz lo declara'}) y ${miles(g.ra_sin_estrategia_programa)} son de programa (V4 de programa: ${fp(g.V4_programa)}).`,
    kpis: [{ etiqueta: 'RA con estrategia', valor: fp(g.V4), nota: `${miles(g.ra_unicos - g.ra_sin_estrategia)} de ${miles(g.ra_unicos)} RA únicos` },
      { etiqueta: 'RA de programa', valor: fp(g.V4_programa), nota: `${miles(delPrograma.filter(r => r.V4).length)} de ${miles(delPrograma.length)} RA` },
      { etiqueta: 'RA genérico institucional', valor: genericos.length ? fp(pc(g.genericos_con_estrategia, g.ra_genericos)) : '—', nota: `${g.genericos_con_estrategia} de ${g.ra_genericos} RA` },
      { etiqueta: 'Competencias sin estrategia', valor: miles(rc.sinEstrategia), nota: `competencia × tipo de saber · ${miles(rc.sinEstrategiaGenericas)} genéricas, ${miles(rc.sinEstrategiaEspecificas)} específicas` }],
    nota: `V4 por matriz: ${v4s.length ? `${fp(Math.min(...v4s))} a ${fp(Math.max(...v4s))}, mediana ${fp(mediana(v4s))}` : '—'}. Nivel micro: ${miles(ra.ambas + ra.micro)} de ${miles(ra.total)} RA se trabajan en asignaturas con actividades de aprendizaje, evaluación o retroalimentación (mediana: ${microMed ?? '—'} asignaturas por RA).`,
    desglose: [subtitulo('Trazabilidad por sede y clase de RA'), tablaCorta(tabla9, 'Sede'),
      sinProg.size ? subtitulo('Matrices con RA de programa sin estrategia') : null,
      sinProg.size ? tablaCorta([...sinProg].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([m, c]) => ({ Matriz: nom(m), 'RA de programa sin estrategia': c }))) : null],
    vinculos: [boton('Ver los RA y competencias sin estrategia', irPestana('Listados de revisión')), ' ', boton('Ver el detalle de V2 a V5', irPestana('Detalle por indicador'))] });

  // ── V5: indicadores de las estrategias y nivel de evidencia (R5, Tabla 10) ──────────────────────────────────
  const est = vista.estrategias, conIns = est.filter(e => e.indicadores > 0 && e.instrumento).length;
  const porNivel = k => est.filter(e => e.nivel_max?.slice(0, 2) === k).length, indNivel = k => Object.entries(g.niveles ?? {}).filter(([nv]) => nv.slice(0, 2) === k).reduce((s, [, c]) => s + c, 0);
  const valores10 = Object.fromEntries(NIVELES_EVIDENCIA.map(nv => { const k = nv.slice(0, 2); return [k, { 'Estrategias (nivel más alto)': porNivel(k), '%': fp(pc(porNivel(k), est.length)), Indicadores: miles(indNivel(k)) }]; }));
  const total10 = { 'Estrategias (nivel más alto)': est.length, '%': fp(est.length ? 100 : null), Indicadores: miles(g.indicadores) };
  const directas = porMatriz(est.filter(e => e.directa), 'matriz'), n12 = porNivel('N1') + porNivel('N2');
  const v5m = pm.filter(m => m['V5 %'] !== null && m['V5 %'] !== undefined && m['V5 %'] < 100).sort((a, b) => a['V5 %'] - b['V5 %'] || nom(a.Matriz).localeCompare(nom(b.Matriz), 'es'));
  const seccionV5 = seccionVariable({ v: 'V5', nombre: nombres.V5, color: colorDe('V5'),
    regla: `${reglas.V5}. Además se describe el nivel de evidencia de los indicadores (N1 implementación a N5 efecto externo); la plantilla no exige un nivel mínimo.`,
    lectura: `${conIns === est.length ? 'Todas las estrategias declaran indicador e instrumento' : `${miles(est.length - conIns)} estrategias no declaran indicador o instrumento`}, pero ${fp(pc(n12, est.length))} solo aportan evidencia indirecta (N1 implementación: cuántos participan; N2 percepción: qué opinan); <b>${g.estrategias_directa}</b> aportan evidencia directa del logro del estudiante (N3 aprendizaje demostrado o N4 transferencia)${directas.size ? `, en ${directas.size} matrices` : ''}.`,
    kpis: [{ etiqueta: 'Con indicador e instrumento', valor: fp(pc(conIns, est.length)), nota: `${miles(conIns)} de ${miles(est.length)} estrategias (requisito de la plantilla)` },
      { etiqueta: 'Más que implementación (V5)', valor: fp(g.V5), nota: `${miles(est.filter(e => e.V5).length)} de ${miles(est.length)} estrategias llegan a N2 o más` },
      { etiqueta: 'Evidencia directa (N3–N4)', valor: `${g.estrategias_directa} de ${miles(g.estrategias)}`, nota: `${fp(pc(g.estrategias_directa, g.estrategias))} de las estrategias` },
      { etiqueta: 'Indicadores', valor: miles(g.indicadores), nota: `${miles(indNivel('N1'))} de implementación · ${miles(indNivel('N2'))} de percepción · ${miles(indNivel('N3') + indNivel('N4') + indNivel('N5'))} de aprendizaje o más` }],
    abierto: true,
    desglose: [subtitulo('Qué significa cada nivel de evidencia y cuántos indicadores hay en cada uno'), tablaNiveles(valores10, total10),
      directas.size ? subtitulo('Matrices con estrategias de evidencia directa (N3–N4)') : null,
      directas.size ? tablaCorta([...directas].sort((a, b) => b[1] - a[1]).map(([m, c]) => ({ Matriz: nom(m), 'Estrategias con evidencia directa': c }))) : null,
      v5m.length ? subtitulo('Matrices con menor proporción de estrategias N2 o superior') : null,
      v5m.length ? tablaCorta(v5m.slice(0, 5).map(m => ({ Matriz: nom(m.Matriz), 'Estrategias N2 o superior': fp(m['V5 %']), Estrategias: m.Estrategias }))) : null],
    vinculos: [boton('Ver el detalle de V2 a V5', irPestana('Detalle por indicador'))] });

  const top = prioridades.filter(p => p['No cumple'] + p.Parcial > 0).slice(0, 5);
  return h('div', {},
    aviso('info', veredicto),
    h('p', { class: 'leyenda' }, alcance.map(([e, v]) => `${miles(v)} ${e.toLowerCase()}`).join(' · ')),
    semaforo,
    seccionV1, seccionV2, seccionV3, seccionV4, seccionV5,
    h('h3', {}, 'Dónde actuar primero'),
    h('p', { class: 'leyenda' }, 'Las cinco matrices con más criterios en «No cumple» o «Parcial». El listado completo está en la pestaña «Listados de revisión».'),
    top.length ? tabla(top.map(p => ({ Matriz: p.Etiqueta, ...Object.fromEntries(CRITERIOS.map(([v, e]) => [`${v} ${e}`, ICONO[p[v]]])) })),
      ['Matriz', ...CRITERIOS.map(([v, e]) => `${v} ${e}`)].map(c => ({ title: c, field: c, ...(c === 'Matriz' ? { minWidth: 280 } : {}) })), { height: false })
      : aviso('success', 'Todas las matrices cumplen los criterios evaluados.'));
}

/** ¿Los RA están asociados a estrategias mesocurriculares (Paso 4), micro (Paso 5), a las dos o a ninguna? */
function asociacionRAVista(aso) {
  const r = aso.resumen;
  const revisar = aso.filas.filter(f => f.Asociación !== 'Mesocurricular y micro');
  return h('div', {},
    h('h3', {}, 'Resultados de aprendizaje y estrategias'),
    h('p', { class: 'leyenda' }, 'Cada RA debería estar asociado a una <b>estrategia mesocurricular</b> con instrumento (Paso 4) y a <b>estrategias micro</b>: asignaturas del Paso 5 que lo trabajan y declaran actividades de aprendizaje, evaluación o retroalimentación.'.replace(/<\/?b>/g, '')),
    columnas(metrica('RA únicos', miles(r.total)), metrica('Mesocurricular y micro', miles(r.ambas)), metrica('Solo mesocurricular', miles(r.meso)), metrica('Solo micro', miles(r.micro), `${r.microGenericos} genéricos · ${r.microPrograma} de programa`), metrica('Ninguna', miles(r.ninguna))),
    revisar.length
      ? h('div', {}, aviso('warning', `<b>${revisar.length}</b> RA no están asociados a los dos tipos de estrategia: ${r.micro} solo tienen estrategias micro, ${r.meso} solo mesocurriculares y ${r.ninguna} ninguna.`),
        tabla(revisar.map(({ id, ...f }) => f), [{ title: 'Matriz', field: 'Matriz' }, { title: 'Resultado de aprendizaje', field: 'Resultado de aprendizaje', minWidth: 340, tooltip: true }, { title: 'Tipo', field: 'Tipo', width: 160 },
          { title: 'Meso', field: 'Estrategia mesocurricular (Paso 4)', width: 80 }, { title: 'Asig. con micro', field: 'Asignaturas con estrategias micro (Paso 5)', width: 120, hozAlign: 'right' }, { title: 'Asociación', field: 'Asociación', width: 190 }],
        { height: Math.min(420, 52 * Math.min(revisar.length, 7) + 60) }))
      : aviso('success', 'Todos los RA están asociados a estrategias mesocurriculares y micro.'));
}

/** ¿Hay competencias declaradas en el perfil que, en algún tipo de saber, no llegan a RA, estrategias mesocurriculares y asignaturas? */
function cadenaCompetenciasVista(cad) {
  const r = cad.resumen;
  const revisar = cad.filas.filter(f => f.Estado !== 'Completa' && (local.tipoCompetencia === 'Todas' || f.Tipo === local.tipoCompetencia));
  const colorEstado = c => { const v = c.getValue(); c.getElement().style.color = v === 'Parcial' ? '#8C6000' : '#EC0677'; c.getElement().style.fontWeight = 'bold'; return v; };
  return h('div', {},
    h('h3', {}, 'Competencias huérfanas'),
    h('p', { class: 'leyenda' }, 'Cada competencia específica declarada en el perfil (Paso 2) debe tener resultados de aprendizaje (Paso 3) de cada tipo de saber (Saber, SaberHacer y SaberSer); la genérica, los de los tipos de saber que declara. ' +
      'Cada uno debe llegar a una estrategia mesocurricular con instrumento (Paso 4) y a asignaturas (Paso 5). Una competencia es huérfana en un tipo de saber cuando falta alguno de esos eslabones. Se revisan las específicas y las genéricas.'),
    columnas(metrica('Competencias', miles(r.competencias), `${miles(r.competencias - r.genericas)} específicas · ${miles(r.genericas)} genéricas`),
      metrica('Sin RA de un tipo de saber', miles(r.sinRA), `${miles(r.sinRAGenericas)} en genéricas · ${miles(r.sinRAEspecificas)} en específicas`),
      metrica('Sin estrategia mesocurricular', miles(r.sinEstrategia), `${miles(r.sinEstrategiaGenericas)} en genéricas · ${miles(r.sinEstrategiaEspecificas)} en específicas`),
      metrica('Sin asignaturas', miles(r.sinAsignaturas)), metrica('Parciales', miles(r.parciales))),
    cad.huerfanas.length || r.parciales
      ? h('div', {}, aviso(r.huerfanasEspecificas ? 'warning' : 'info', `En las competencias <b>específicas</b> hay <b>${r.huerfanasEspecificas}</b> combinación(es) de competencia y tipo de saber sin llegar a todos los eslabones; en las <b>genéricas</b>, ${r.huerfanasGenericas}.`),
        selector('Mostrar competencias', ['Todas', 'Específica', 'Genérica'], local.tipoCompetencia, v => { local.tipoCompetencia = v; local.rerender?.(); }),
        revisar.length ? tabla(revisar.map(({ id, ...f }) => f), [{ title: 'Matriz', field: 'Matriz' }, { title: 'Competencia', field: 'Competencia', minWidth: 300, tooltip: true }, { title: 'Tipo', field: 'Tipo', width: 100 },
          { title: 'Tipo de saber', field: 'Tipo de saber', width: 120 }, { title: 'RA', field: 'RA', width: 60, hozAlign: 'right' }, { title: 'RA con estrategia', field: 'RA con estrategia', width: 120, hozAlign: 'right' },
          { title: 'Asignaturas', field: 'Asignaturas', width: 100, hozAlign: 'right' }, { title: 'Estado', field: 'Estado', width: 190, formatter: colorEstado }], { height: Math.min(460, 52 * Math.min(revisar.length, 8) + 60) })
          : aviso('success', 'No hay combinaciones para el tipo de competencia elegido.'))
      : aviso('success', 'Ninguna competencia queda huérfana: en cada tipo de saber llegan a RA, estrategia mesocurricular con instrumento y asignaturas.'));
}

function vistaAcciones({ sel, vista, val, d, etiqueta }) {
  const fila = vista.por_matriz.find(m => m.Matriz === sel);
  if (!fila) return null;
  const v = val[sel];
  const estados = Object.fromEntries(v.map(x => [x.Variable, x.Estado]));
  const ras = vista.ra.filter(r => r.matriz === sel);
  const noEval = ras.filter(r => !r.V3), sinEst = ras.filter(r => !r.V4);
  const incompletas = vista.estrategias.filter(e => e.matriz === sel && !(e.indicadores > 0 && e.instrumento));
  const recs = recomendacionesMatriz(estados, fila, d.perfil[sel]?.nSin ?? 0, noEval.length, incompletas.length);
  const colEstado = { formatter: cell => { const x = cell.getValue(); cell.getElement().style.color = COLOR[x] ?? '#000'; cell.getElement().style.fontWeight = 'bold'; return x; } };
  return h('div', {},
    tabla(v.map(({ Valor, ...r }) => r), ['Variable', 'Tramo', 'Resultado', 'Estado', 'Referencia (mediana)', 'Observación'].map(c => ({ title: c, field: c,
      ...(c === 'Resultado' ? { minWidth: 260, formatter: 'textarea' } : {}), ...(c === 'Estado' ? colEstado : {}) })), { height: false }),
    recs.length ? h('div', {}, h('b', {}, 'Acciones sugeridas'), h('ul', {}, ...recs.map(r => h('li', {}, r)))) : aviso('success', 'La matriz cumple todos los criterios; no hay acciones sugeridas.'),
    noEval.length ? h('details', {}, h('summary', {}, `RA no evaluables (${noEval.length})`), h('ul', {}, ...noEval.map(r => h('li', {}, `${r.ra} — ${r.motivo_V3}`)))) : null,
    sinEst.length ? h('details', {}, h('summary', {}, `RA sin estrategia (${sinEst.length})`), h('ul', {}, ...sinEst.map(r => h('li', {}, r.ra + (r.generica ? ' (RA genérico institucional)' : ''))))) : null,
    incompletas.length ? h('details', {}, h('summary', {}, `Estrategias incompletas (${incompletas.length})`),
      h('ul', {}, ...incompletas.map(e => h('li', {}, `${e.estrategia} — falta ${[e.indicadores > 0 ? null : 'indicador', e.instrumento ? null : 'instrumento'].filter(Boolean).join(' e ')}`)))) : null,
    h('p', { class: 'leyenda' }, `Matriz: ${etiqueta.get(sel) ?? sel}.`));
}
