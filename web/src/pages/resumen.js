// Página «Resumen Ejecutivo»: ¿cómo está el conjunto?, ¿qué matrices requieren atención primero?, ¿qué hacer en cada una?
// Todo sale de los archivos cargados y de los filtros activos; son propuestas para validar por el comité.
import { libroResumen } from '../export/libros.js';
import { MIME_XLSX } from '../export/excelMarca.js';
import { CRITERIOS_EVALUADOS as CRITERIOS } from '../data/indicadores.js';
import { cargarConfig, hayConfig } from '../data/tendencias.js';
import { porGrupo } from '../data/taxonomias.js';
import { aviso, botonDescarga, columnas, descargar, grafico, h, info, metrica, selector, tabla, titulo } from '../ui.js';
import { cargarLogo, contextoInformes, nombreArchivoPdf, pdfGeneral, pdfPrograma, programasDe, zipInformes } from '../export/informesDatos.js';
import { datosIndicadores, paginaIndicadores } from './indicadores.js';
import { taxonomiasRA } from './taxonomias.js';
import { asociacionRA, cadenaCompetencias, calcularResumen, recomendacionesMatriz } from './resumenDatos.js';
import { calcularFaltantes, estadoLote, modoPerfil } from '../perfil/lote.js';
import { panelV1 } from './panelV1.js';

const ICONO = { Cumple: '🟢 Cumple', Parcial: '🟡 Parcial', 'No cumple': '🔴 No cumple', 'Sin dato': '⚪ Sin dato' };
const COLOR = { Cumple: '#1FB2DE', Parcial: '#FBAF17', 'No cumple': '#EC0677', 'Sin dato': '#8A94A0' };
const local = { pestana: 'Estado del conjunto', tipoCompetencia: 'Todas', rerender: null, matriz: null, cfgCargando: false, autoV1: false, exig: null, exigFirma: '', exigCargando: false, programa: null, pdf: { ocupado: false, mensaje: '' } };
const fmt = v => (v === null || v === undefined ? '—' : `${v.toFixed(0)}%`);
const miles = n => n.toLocaleString('es-CO');
const PESTANAS = ['Estado del conjunto', 'Acciones e informes', 'Detalle por indicador'];
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
  if (d.faltanPerfil > 0 && modoPerfil() && !lote.corriendo && !lote.error && !local.autoV1) {
    local.autoV1 = true;
    queueMicrotask(() => calcularFaltantes(archivoDe, modoPerfil(), rerender).finally(() => { local.autoV1 = false; }));
  }

  // mientras se calcula el perfil solo se muestra el avance: redibujar tablas y gráficos en cada paso saturaría el navegador
  if (lote.corriendo) return h('div', {}, ...cab, panelV1({ archivoDe, faltan: d.faltanPerfil, rerender }));

  local.rerender = rerender;
  const R = calcularResumen({ filas, todasFilas, d, etiqueta, seleccion, exigencia: exigenciaPorMatriz(archivos, filas, todasFilas, rerender) });
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

  const resumen = h('div', {},
    columnas(...kpis.map(([e, v]) => metrica(e, miles(v)))),
    lectura.length ? h('div', {}, h('h3', {}, 'Lectura rápida'), h('ul', {}, ...lectura.map(l => h('li', { html: l })))) : null,
    h('hr'),
    h('h3', {}, 'Coherencia y trazabilidad curricular (V1–V5)'),
    columnas(metrica('V1 · Perfil alineado', fmt(g.V1), `${miles(g.atributos_perfil)} atributos evaluables del perfil`), metrica('V2 · Competencias con RA', fmt(g.V2_comp), `${miles(g.competencias_especificas)} específicas · genérica sin estrategia en ${g.genericas_sin_estrategia} de ${g.genericas_declaradas} matrices`),
      metrica('V3 · RA evaluables', fmt(g.V3), `${miles(g.ra_unicos)} RA únicos`), metrica('V4 · RA con estrategia', fmt(g.V4), `Sin el RA genérico: ${fmt(g.V4_programa)}`),
      metrica('V5 · Evidencia (N2 o más)', fmt(g.V5), `${miles(g.estrategias)} estrategias`)),
    h('p', { class: 'leyenda' }, 'Matrices por estado en cada criterio. Cumple: la regla de la plantilla se cumple en todos los casos; Parcial: en algunos; No cumple: en ninguno.'),
    grafico(['Cumple', 'Parcial', 'No cumple', 'Sin dato'].map(s => ({ type: 'bar', orientation: 'h', name: s, y: conteo.map(c => c[0]), x: conteo.map(c => c[2][s]),
      text: conteo.map(c => c[2][s] || ''), textposition: 'inside', marker: { color: COLOR[s] } })),
    { height: 320, barmode: 'stack', xaxis: { title: 'Matrices' }, yaxis: { autorange: 'reversed' }, margin: { l: 250, r: 10, t: 10, b: 40 } }),
    h('hr'),
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
      tabla(tend, Object.keys(tend[0]).map(c => ({ title: c, field: c, ...(c === 'Tendencia' ? { minWidth: 240 } : { hozAlign: 'right' }) })), { height: false })) : null);
  const accionesPdf = h('div', {},
    seccionPdf({ filas, todasFilas, d, etiqueta, archivoDe, archivos, descripcionFiltros }, matricesVista, rerender),
    h('hr'),
    h('h3', {}, 'Acciones sugeridas por matriz'),
    seleccion ? null : selector('Matriz', matricesVista.map(m => etiqueta.get(m) ?? m), etiqueta.get(sel) ?? '',
      v => { local.matriz = matricesVista.find(m => (etiqueta.get(m) ?? m) === v); rerender(); }),
    sel ? vistaAcciones({ sel, vista, val, d, etiqueta }) : null);

  const detalle = local.pestana === 'Detalle por indicador'
    ? paginaIndicadores({ filas, archivos, archivoDe, etiqueta, seleccion, rerender, incrustada: true }) : null;
  const cuerpo = local.pestana === 'Acciones e informes' ? accionesPdf : local.pestana === 'Detalle por indicador' ? detalle : resumen;
  return h('div', {}, ...cab,
    seleccion ? aviso('info', `<b>Vista de matriz:</b> ${etiqueta.get(seleccion)}. Las medianas de referencia son las de las ${ref.n} matrices cargadas.`) : h('p', { class: 'leyenda' }, descripcionFiltros),
    panelV1({ archivoDe, faltan: d.faltanPerfil, rerender }),
    ...d.errores.map(e => aviso('warning', `No se pudo evaluar <b>${e.archivo}</b>: ${e.causa}`)),
    h('div', { class: 'pestanas' }, ...PESTANAS.map(n => h('button', { type: 'button', class: n === local.pestana ? 'activa' : '', onclick: () => { local.pestana = n; rerender(); } }, n))),
    cuerpo);
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
