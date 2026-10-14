// Página «Perfil de egreso (V1)»: asociación del perfil con competencias, RA y asignaturas de la PROPIA matriz.
// Vista del conjunto (lo que reporta el artículo) y vista de una matriz (con la mediana del conjunto como referencia).
import {
  COLORES_ESTADO, ESTADOS, estadoPorComponente, filasMetodo, indicadoresPerfil, libroExcel, mediana, sinAsociacion,
} from '../perfil/indicadores.js';
import { leerReferencia } from '../perfil/calibracion.js';
import { estadoLote } from '../perfil/lote.js';
import { calcularPerfil, estadoPerfil, iniciar, perfilEnCache, prepararConfig, reiniciar, validarConReferencia } from '../perfil/servicio.js';
import { aCsv, aviso, botonDescarga, columnas, descargar, grafico, h, info, metrica, selector, tabla, titulo } from '../ui.js';

const memoria = {
  resultados: new Map(),   // id de matriz → resultado del perfil
  errores: new Map(),
  enCurso: new Set(),
  consultadaCache: false,
  lote: null,              // { hechas, total, nombre } mientras se calculan varias matrices
  avance: null,            // avance de la matriz que se está calculando
  modelo: null,            // avance de la descarga del modelo semántico
  pestana: 'Resultados',
  perfilSel: 'Todos',
  config: null,
  versionLote: 0,
  modo: leerModo(),         // 'semantico' | 'lexico' | null (aún no elegido)
};

function leerModo() {
  try { return localStorage.getItem('perfil_modo'); } catch { return null; }
}

function fijarModo(modo) {
  memoria.modo = modo;
  try { localStorage.setItem('perfil_modo', modo); } catch { /* sin almacenamiento */ }
}

/** Cambia el modo y descarta lo calculado en el modo anterior para que se recalcule. */
function cambiarModo(modo, rerender) {
  fijarModo(modo);
  reiniciar();
  memoria.resultados.clear();
  memoria.errores.clear();
  memoria.consultadaCache = false;
  rerender();
}

function panelModo(rerender) {
  return h('div', { class: 'aviso info' },
    h('p', { html: '<b>¿Cómo quieres calcular el perfil?</b> El método usa un modelo de similitud semántica (paraphrase-multilingual-MiniLM, <b>≈120 MB</b>). ' +
      'Se descarga desde Hugging Face una sola vez y queda en la caché de este navegador; tus matrices no se envían a ningún servidor.' }),
    h('p', { html: '<b>Con modelo (recomendado):</b> reproduce el método del artículo, incluidas las asociaciones «parciales». <b>Solo léxico:</b> sin descarga y más rápido, ' +
      'pero no detecta asociaciones parciales (acuerdo con el método completo ≈66 % por atributo) y las cifras de V1 serán menores.' }),
    h('button', { type: 'button', class: 'boton', onclick: () => cambiarModo('semantico', rerender) }, 'Calcular con el modelo semántico'), ' ',
    h('button', { type: 'button', class: 'boton secundario', onclick: () => cambiarModo('lexico', rerender) }, 'Calcular solo con léxico'));
}

const pct = v => (v === null || v === undefined ? '—' : `${Math.round(v)} %`);

function textoValidacion(cfg) {
  const v = cfg.VALIDACION ?? {};
  if (!v.acuerdo) return 'Esta configuración no registra validación contra una lectura de referencia.';
  const rango = v.acuerdo_por_enfoque_excluido;
  const extra = rango ? `; entre ${Math.round(100 * rango[0])} % y ${Math.round(100 * rango[1])} % al excluir cada enfoque` : '';
  return `Calibración registrada: acuerdo <b>${Math.round(100 * v.acuerdo)} %</b> (κ = ${Number(v.kappa).toFixed(2)}) en ` +
    `${v.decisiones ?? '?'} decisiones${extra}. Referencia: ${v.referencia ?? 'no descrita'}.`;
}

/** Consulta la caché para todas las matrices (una vez) y pide repintar. */
async function consultarCache(matrices, rerender) {
  if (memoria.consultadaCache) return;
  memoria.consultadaCache = true;
  await prepararConfig();
  for (const m of matrices) {
    if (memoria.resultados.has(m.id) || !m.archivo) continue;
    const r = await perfilEnCache(m.archivo);
    if (r) memoria.resultados.set(m.id, r);
  }
  rerender();
}

/** El modelo emite ~1000 eventos de avance al descargarse: se repinta a lo sumo 2 veces por segundo. */
let ultimoPintado = 0;
function repintarModelo(rerender) {
  const ahora = performance.now();
  if (ahora - ultimoPintado < 500) return;
  ultimoPintado = ahora;
  rerender();
}

async function calcular(m, rerender, { silencioso = false } = {}) {
  if (!memoria.modo) { rerender(); return; }
  if (memoria.enCurso.has(m.id) || memoria.resultados.has(m.id)) return;
  memoria.enCurso.add(m.id);
  memoria.errores.delete(m.id);
  if (!silencioso) rerender();
  try {
    await iniciar({ conSemantica: memoria.modo === 'semantico', alModelo: p => { memoria.modelo = p; repintarModelo(rerender); } });
    const r = await calcularPerfil(m.archivo, { alAvance: a => { memoria.avance = a; } });
    memoria.resultados.set(m.id, r);
  } catch (e) {
    memoria.errores.set(m.id, String(e.message ?? e));
  } finally {
    memoria.enCurso.delete(m.id);
    memoria.avance = null;
    rerender();
  }
}

async function calcularLote(ms, rerender) {
  if (!memoria.modo) { rerender(); return; }
  const pendientes = ms.filter(m => !memoria.resultados.has(m.id));
  memoria.lote = { hechas: 0, total: pendientes.length, nombre: '' };
  for (const m of pendientes) {
    memoria.lote.nombre = m.etiqueta;
    rerender();
    await calcular(m, rerender, { silencioso: true });
    memoria.lote.hechas++;
  }
  memoria.lote = null;
  rerender();
}

// ── Componentes ──────────────────────────────────────────────────────────────

function graficoCapas(ind, referencia = null) {
  const capas = ['Competencias', 'Resultados de aprendizaje', 'Asignaturas'];
  const valores = [ind['% Competencias'], ind['% RA'], ind['% Asignaturas']];
  const trazas = [{
    type: 'bar', orientation: 'h', y: capas, x: valores, text: valores.map(v => `${Math.round(v)}%`), textposition: 'outside',
    marker: { color: ['#0F385A', '#1fb2de', '#42F2F2'] }, name: 'Esta matriz', showlegend: !!referencia,
  }];
  if (referencia) {
    trazas.push({ type: 'scatter', mode: 'markers', y: capas, x: referencia, name: 'Mediana del conjunto',
      marker: { symbol: 'diamond', size: 13, color: '#FBAF17', line: { color: '#0F385A', width: 1 } } });
  }
  return grafico(trazas, { height: 300, yaxis: { autorange: 'reversed' }, xaxis: { range: [0, 110], title: '% de atributos con respaldo' },
    legend: { orientation: 'h', y: -0.25 }, margin: { l: 170, r: 30, t: 20, b: 60 } });
}

function graficoEstado(items) {
  const datos = estadoPorComponente(items);
  const trazas = ESTADOS.map(e => ({
    type: 'bar', orientation: 'h', name: e, y: datos.map(d => d.origen), x: datos.map(d => d[`% ${e}`]),
    marker: { color: COLORES_ESTADO[e] }, customdata: datos.map(d => d[e]),
    hovertemplate: '%{y}<br>' + e + ': %{x:.0f} % (%{customdata} atributos)<extra></extra>',
  }));
  return grafico(trazas, { barmode: 'stack', height: 300, xaxis: { title: '% de atributos', range: [0, 100] },
    yaxis: { autorange: 'reversed' }, legend: { orientation: 'h', y: -0.3 }, margin: { l: 170, r: 30, t: 20, b: 70 } });
}

function marcaCapa(v) {
  return v ? '●' : '·';
}

function tablaAtributos(items) {
  return tabla(items.filter(i => i.evaluable).map(i => ({
    Perfil: i.perfil, Componente: i.origen, Atributo: i.item, Competencia: i.Competencia, RA: i.RA, Asignatura: i.Asignatura, Estado: i.estado,
  })), [
    { title: 'Perfil', field: 'Perfil', width: 130 },
    { title: 'Componente', field: 'Componente', width: 160 },
    { title: 'Atributo', field: 'Atributo', minWidth: 320, tooltip: true },
    ...['Competencia', 'RA', 'Asignatura'].map(c => ({ title: c, field: c, hozAlign: 'center', width: 110,
      formatter: cell => { const v = cell.getValue(); cell.getElement().style.color = v ? '#1fb2de' : '#b8c2cc'; return marcaCapa(v); } })),
    { title: 'Estado', field: 'Estado', width: 200,
      formatter: cell => { const el = cell.getElement(); el.style.color = COLORES_ESTADO[cell.getValue()] ?? '#6b7280'; el.style.fontWeight = '600'; return cell.getValue(); } },
  ], { height: '480px', layout: 'fitColumns' });
}

function tablaMatrices(filas) {
  return tabla(filas, [
    { title: 'Matriz', field: 'Matriz', minWidth: 260, frozen: true },
    { title: 'Atributos', field: 'Atributos', hozAlign: 'right', width: 100 },
    ...['% Competencias', '% RA', '% Asignaturas', 'V1 % (alguna capa)', '% Tres capas', '% Sin asociación'].map(c => ({
      title: c, field: c, hozAlign: 'right', width: 130, formatter: cell => `${Math.round(cell.getValue())}%` })),
  ], { height: '420px', layout: 'fitData', initialSort: [{ column: '% Sin asociación', dir: 'desc' }] });
}

function estadoCarga(m, rerender) {
  if (memoria.enCurso.has(m.id)) {
    const a = memoria.avance;
    const mod = memoria.modelo;
    return aviso('info', 'Calculando la asociación del perfil de esta matriz… ' +
      (mod?.status === 'progress' ? `Descargando el modelo semántico (${Math.round(mod.progress ?? 0)} %; solo la primera vez). ` : '') +
      (a ? `Capa ${a.capa}: ${a.i} de ${a.n} atributos.` : ''));
  }
  if (memoria.errores.has(m.id)) {
    return aviso('error', `No se pudo calcular la matriz: ${memoria.errores.get(m.id)} ` +
      `<button class="enlace" id="reintentar">Reintentar</button>`);
  }
  return null;
}

// ── Vista de matriz ──────────────────────────────────────────────────────────

function vistaMatriz(m, todas, rerender) {
  const r = memoria.resultados.get(m.id);
  const cargando = estadoCarga(m, rerender);
  if (!r) {
    if (!memoria.modo) return h('div', {}, panelModo(rerender));
    if (!cargando) queueMicrotask(() => calcular(m, rerender));
    return h('div', {}, cargando ?? aviso('info', 'Preparando el cálculo…'));
  }
  const ind = indicadoresPerfil(r.items);
  if (!ind.Atributos) return h('div', {}, aviso('warning', 'Esta matriz no tiene atributos evaluables del perfil.'),
    ...r.avisos.map(a => aviso('warning', a)));

  // Referencia: mediana del conjunto completo (R-B: no se reduce al filtro)
  const ref = [...todas].map(id => memoria.resultados.get(id)).filter(Boolean).map(x => indicadoresPerfil(x.items)).filter(x => x.Atributos);
  const med = c => (ref.length >= 3 ? mediana(ref.map(x => x[c])) : null);
  const refTxt = c => (med(c) === null ? 'Calcula el conjunto para ver la referencia' : `Mediana del conjunto (${ref.length} matrices): ${pct(med(c))}`);
  const perfiles = ['Todos', ...new Set(r.items.map(i => i.perfil))];
  const vista = memoria.perfilSel === 'Todos' ? r.items : r.items.filter(i => i.perfil === memoria.perfilSel);
  const sin = sinAsociacion(r, m.etiqueta);

  return h('div', {},
    ...r.avisos.map(a => aviso('warning', a)),
    !r.semantica ? h('div', { class: 'aviso warning' }, h('span', { html: 'Se calculó <b>sin similitud semántica</b>: solo hay respaldo explícito y no hay asociaciones «parciales». Las cifras serán menores que las del artículo. ' }),
      h('button', { type: 'button', class: 'boton secundario', onclick: () => cambiarModo('semantico', rerender) }, 'Recalcular con el modelo semántico (≈120 MB)')) : null,
    columnas(
      metrica('Atributos evaluados', ind.Atributos, 'Funciones del texto narrativo y componentes del perfil ocupacional.'),
      metrica('V1 · alineación en alguna capa', `${pct(ind['V1 % (alguna capa)'])}`, `${ind.n_alguna} de ${ind.Atributos} atributos. ${refTxt('V1 % (alguna capa)')}`),
      metrica('Alineación en las tres capas', `${pct(ind['% Tres capas'])}`, `${ind.n_tres} de ${ind.Atributos}. ${refTxt('% Tres capas')}`),
      metrica('Sin alineación en ninguna capa', `${ind.n_sin} de ${ind.Atributos}`, `${pct(ind['% Sin asociación'])}. ${refTxt('% Sin asociación')}`)),
    h('hr'),
    columnas(
      h('div', {}, h('h3', {}, 'Respaldo por capa'),
        h('p', { class: 'leyenda' }, 'Porcentaje de los atributos de esta matriz respaldados por alguna competencia, RA o asignatura. El rombo es la mediana de las 50 matrices.'),
        graficoCapas(ind, ref.length >= 3 ? [med('% Competencias'), med('% RA'), med('% Asignaturas')] : null)),
      h('div', {}, h('h3', {}, 'Estado por componente del perfil'),
        h('p', { class: 'leyenda' }, 'Cada barra es 100 % de los atributos del componente en esta matriz.'),
        graficoEstado(r.items))),
    h('hr'),
    h('h3', {}, 'Atributos del perfil y su respaldo'),
    h('p', { class: 'leyenda' }, '● = hay respaldo en esa capa (explícito o parcial). Los atributos son una propuesta para validar por el comité curricular.'),
    selector('Perfil', perfiles, memoria.perfilSel, v => { memoria.perfilSel = v; rerender(); }),
    tablaAtributos(vista),
    sin.length ? h('div', {}, h('h3', {}, `Atributos sin alineación (${sin.length} de ${ind.Atributos})`),
      h('p', { class: 'leyenda' }, 'Lo que el perfil promete y esta matriz no desarrolla de forma identificable. Parte de estos casos puede deberse al emparejamiento automático: requieren validación experta.'),
      tabla(sin, [
        { title: 'Atributo', field: 'Atributo', minWidth: 260, tooltip: true }, { title: 'Componente', field: 'Componente', width: 160 },
        { title: 'Capa más cercana', field: 'Capa más cercana', width: 150 }, { title: 'Contenido más cercano', field: 'Contenido más cercano', minWidth: 280, tooltip: true },
        { title: 'Cobertura', field: 'Cobertura', width: 100, hozAlign: 'right' }, { title: 'Similitud', field: 'Similitud', width: 100, hozAlign: 'right' },
      ], { layout: 'fitColumns' }),
      botonDescarga('Descargar atributos sin alineación (CSV)', () => descargar(`sin_alineacion_${m.id}.csv`, aCsv(sin, Object.keys(sin[0])), 'text/csv'))) : null,
    h('hr'),
    h('h3', {}, 'Evidencia de las asociaciones'),
    h('p', { class: 'leyenda' }, 'Texto de la matriz que respalda cada asociación y su nivel (explícito si la cobertura de conceptos alcanza el umbral; parcial si además hay similitud semántica).'),
    tabla(r.filas.filter(f => f.entidad !== 'NINGUNA').map(f => ({ Atributo: f.item, Capa: f.capa, Respaldo: f.entidad, Nivel: f.nivel, Evidencia: f.evidencia })), [
      { title: 'Atributo', field: 'Atributo', minWidth: 240, tooltip: true }, { title: 'Capa', field: 'Capa', width: 120 },
      { title: 'Respaldo', field: 'Respaldo', width: 160, tooltip: true }, { title: 'Nivel', field: 'Nivel', width: 100 },
      { title: 'Evidencia', field: 'Evidencia', minWidth: 320, tooltip: true }], { height: '380px', layout: 'fitColumns' }),
    h('p', {}, botonDescarga('Descargar resultados de esta matriz (Excel)', () => descargarExcel([[m.id, r]], new Map([[m.id, m.etiqueta]]), [m.archivo]))));
}

// ── Vista del conjunto ───────────────────────────────────────────────────────

function vistaConjunto(visibles, todas, rerender) {
  const calculadas = visibles.filter(m => memoria.resultados.has(m.id));
  const faltan = visibles.length - calculadas.length;
  const bloques = [];
  if (memoria.lote) {
    // durante el cálculo solo se muestra el avance: reconstruir tablas y gráficos en cada matriz congelaría la página
    const { hechas, total, nombre } = memoria.lote, mod = memoria.modelo;
    return h('div', {}, aviso('info', `Calculando el perfil: <b>${hechas} de ${total}</b> matrices` + (nombre ? ` · ${nombre}` : '') +
      '. Cada matriz tarda unos segundos; el resultado queda guardado en este navegador.' +
      (mod?.status === 'progress' && hechas === 0 ? ` Descargando el modelo semántico (${Math.round(mod.progress ?? 0)} %; solo la primera vez).` : '')),
      h('div', { class: 'barra-avance' }, h('div', { style: { width: `${100 * hechas / Math.max(total, 1)}%` } })));
  } else if (faltan && !memoria.modo) {
    bloques.push(panelModo(rerender));
  } else if (faltan) {
    bloques.push(aviso('warning', `Hay ${faltan} de ${visibles.length} matrices sin calcular. ` +
      (memoria.modo === 'semantico' ? 'La primera vez el cálculo descarga el modelo semántico (~120 MB, solo una vez) y tarda unos segundos por matriz. ' : 'Modo solo léxico: sin descarga del modelo. ') +
      '<button class="boton secundario" id="calcular-todas">Calcular las que faltan</button>'));
  }
  if (!calculadas.length) return h('div', {}, ...bloques);

  const porMatriz = calculadas.map(m => ({ m, r: memoria.resultados.get(m.id), ind: indicadoresPerfil(memoria.resultados.get(m.id).items) }))
    .filter(x => x.ind.Atributos);
  const todosItems = porMatriz.flatMap(x => x.r.items);
  const tot = indicadoresPerfil(todosItems);
  const incompletas = calculadas.filter(m => memoria.resultados.get(m.id).avisos.length && !indicadoresPerfil(memoria.resultados.get(m.id).items).Atributos);
  const sinSemantica = calculadas.some(m => !memoria.resultados.get(m.id).semantica);
  const filas = porMatriz.map(({ m, ind }) => ({ Matriz: m.etiqueta, ...ind }));
  const sinTodas = porMatriz.flatMap(({ m, r }) => sinAsociacion(r, m.etiqueta));

  return h('div', {},
    ...bloques,
    sinSemantica ? aviso('warning', 'Algunas matrices se calcularon <b>sin similitud semántica</b>: sus cifras no son comparables con las del artículo.') : null,
    incompletas.length ? aviso('warning', `${incompletas.length} matriz(ces) sin atributos evaluables o con capas sin contenido.`) : null,
    columnas(
      metrica('Matrices', porMatriz.length, faltan ? `${faltan} sin calcular` : 'Todas las del conjunto'),
      metrica('Atributos evaluados', tot.Atributos.toLocaleString('es-CO')),
      metrica('V1 · alineación en alguna capa', pct(tot['V1 % (alguna capa)']), `Alineación con las tres capas a la vez: ${pct(tot['% Tres capas'])}`),
      metrica('Sin alineación en ninguna capa', pct(tot['% Sin asociación']), `${tot.n_sin} de ${tot.Atributos} atributos`)),
    h('hr'),
    columnas(
      h('div', {}, h('h3', {}, 'Respaldo por capa'), graficoCapas(tot)),
      h('div', {}, h('h3', {}, 'Estado por componente del perfil'), graficoEstado(todosItems))),
    h('h3', {}, 'Indicadores por matriz'),
    h('p', { class: 'leyenda' }, 'Ordenadas de mayor a menor proporción de atributos sin alineación. Para ver una matriz, elígela en el selector «Matriz» de la barra lateral.'),
    tablaMatrices(filas),
    porMatriz.length >= 2 ? grafico([{
      type: 'bar', orientation: 'h', y: filas.map(f => f.Matriz), x: filas.map(f => f['V1 % (alguna capa)']),
      marker: { color: filas.map(f => f['% Tres capas']), colorscale: [[0, '#ec0677'], [0.5, '#FBAF17'], [1, '#1fb2de']], showscale: true,
        colorbar: { title: '% tres capas' } },
      hovertemplate: '%{y}<br>V1: %{x:.0f} %<extra></extra>',
    }], { height: Math.max(320, 24 * filas.length + 120), xaxis: { title: 'V1: atributos con alineación en alguna capa (%)', range: [0, 105] },
      yaxis: { autorange: 'reversed', automargin: true }, margin: { l: 260, r: 20, t: 20, b: 50 } }) : null,
    h('hr'),
    h('h3', {}, `Atributos sin alineación en el conjunto (${sinTodas.length})`),
    h('p', { class: 'leyenda' }, 'Listado nominal para la revisión del comité.'),
    tabla(sinTodas, [
      { title: 'Matriz', field: 'Matriz', minWidth: 240 }, { title: 'Componente', field: 'Componente', width: 160 },
      { title: 'Atributo', field: 'Atributo', minWidth: 260, tooltip: true }, { title: 'Contenido más cercano', field: 'Contenido más cercano', minWidth: 260, tooltip: true },
    ], { height: '420px', layout: 'fitColumns' }),
    h('p', {},
      botonDescarga('Descargar listado (CSV)', () => descargar('atributos_sin_alineacion.csv', aCsv(sinTodas, sinTodas.length ? Object.keys(sinTodas[0]) : []), 'text/csv')), ' ',
      botonDescarga('Descargar resultados (Excel, con hoja «Método»)', () => descargarExcel(
        calculadas.map(m => [m.id, memoria.resultados.get(m.id)]), new Map(calculadas.map(m => [m.id, m.etiqueta])),
        calculadas.map(m => m.archivo)))));
}

function descargarExcel(resultados, etiquetas, archivos) {
  const st = estadoPerfil();
  const blob = libroExcel({ resultados, etiquetas,
    metodo: filasMetodo({ cfg: st.cfg, huella: st.huella, semantica: resultados.every(([, r]) => r.semantica), archivos: archivos.filter(Boolean) }) });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: 'asociacion_perfil.xlsx' });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Método ───────────────────────────────────────────────────────────────────

function vistaMetodo() {
  const st = estadoPerfil();
  if (!st.cfg) { prepararConfig().then(() => memoria.rerender?.()); return aviso('info', 'Cargando la configuración…'); }
  const c = st.cfg;
  return h('div', {},
    h('p', {}, h('b', {}, 'Versión: '), c.VERSION, ' · ', h('b', {}, 'Huella SHA-256: '), h('code', {}, st.huella)),
    aviso('info', textoValidacion(c)),
    h('p', { class: 'leyenda' }, 'La huella es idéntica a la que calcula la versión de Python: la misma configuración produce el mismo método en ambas.'),
    h('h3', {}, 'Parámetros'),
    tabla([
      ['Umbral de cobertura explícita', c.PARAMS.explicita], ['Umbral de cobertura parcial', c.PARAMS.parcial],
      ['Similitud semántica mínima (parcial)', c.PARAMS.semantica], ['Núcleo ponderado', String(c.PARAMS.nucleo)],
      ['Factor de rol', c.FACTOR_ROL], ['Raíz (letras)', c.RAIZ], ['Umbral de vocabulario de contexto', c.UMBRAL_CONTEXTO],
      ['Peso del contexto', c.PESO_CONTEXTO], ['Modelo semántico', c.MODELO_SEMANTICO],
      ['Similitud semántica', st.listo ? (st.semantica ? 'activa' : `no disponible (${st.errorSemantica ?? 'sin modelo'})`) : 'se activa al calcular'],
    ].map(([Parámetro, Valor]) => ({ Parámetro, Valor })), [
      { title: 'Parámetro', field: 'Parámetro', width: 320 }, { title: 'Valor', field: 'Valor' }], { layout: 'fitColumns' }),
    h('h3', {}, `Sinónimos de dominio (${c.SINONIMOS.size})`),
    tabla([...c.SINONIMOS].map(([k, v]) => ({ Término: k, 'Equivale a': [...v].join(', ') })), [
      { title: 'Término', field: 'Término', width: 200 }, { title: 'Equivale a', field: 'Equivale a' }], { height: '300px', layout: 'fitColumns' }),
    h('p', {}, botonDescarga('Exportar configuración (JSON)', () => descargar('config_asociacion_perfil.json', JSON.stringify(
      { VERSION: c.VERSION, PARAMS: c.PARAMS, FACTOR_ROL: c.FACTOR_ROL, PESO_NUCLEO: c.PESO_NUCLEO, UMBRAL_CONTEXTO: c.UMBRAL_CONTEXTO,
        PESO_CONTEXTO: c.PESO_CONTEXTO, RAIZ: c.RAIZ, MODELO_SEMANTICO: c.MODELO_SEMANTICO,
        SINONIMOS: Object.fromEntries([...c.SINONIMOS].map(([k, v]) => [k, [...v]])), AGENTE_IRREGULAR: c.AGENTE_IRREGULAR, VALIDACION: c.VALIDACION },
      null, 1), 'application/json'))));
}

// ── Validar con referencia ───────────────────────────────────────────────────

const validacion = { texto: null, nombre: '', recalibrar: false, corriendo: false, avance: null, resultado: null, error: null };

function vistaValidar(matrices, rerender) {
  const archivo = h('input', { type: 'file', accept: '.csv,text/csv', onchange: async e => {
    const f = e.target.files[0];
    validacion.texto = f ? await f.text() : null; validacion.nombre = f?.name ?? ''; validacion.resultado = null; validacion.error = null;
    rerender();
  } });
  const casilla = h('input', { type: 'checkbox', checked: validacion.recalibrar, onchange: e => { validacion.recalibrar = e.target.checked; } });
  const correr = async () => {
    validacion.error = null; validacion.resultado = null;
    try {
      const ref = leerReferencia(validacion.texto);
      validacion.corriendo = true; rerender();
      validacion.resultado = await validarConReferencia(ref, new Map(matrices.filter(x => x.archivo).map(x => [x.id, x.archivo])),
        { recalibrar: validacion.recalibrar, alAvance: a => { validacion.avance = a; } });
    } catch (e) { validacion.error = String(e?.message ?? e); }
    validacion.corriendo = false; validacion.avance = null; rerender();
  };
  const r = validacion.resultado;
  const fila = (capa, o) => ({ Capa: capa, ...o });
  const colsM = ['Capa', 'n', 'acuerdo', 'kappa', 'metodo_%', 'referencia_%'].map(c => ({ title: c, field: c, ...(c === 'Capa' ? {} : { hozAlign: 'right' }) }));
  return h('div', {},
    h('p', {}, 'Sube una ', h('b', {}, 'lectura de referencia'), ' (CSV separado por «;») con las columnas ', h('b', {}, 'Matriz; Enfoque; Inicio_item; Competencia; RA; Asignatura'),
      ' (1 = respaldo explícito o parcial). ', h('i', {}, 'Matriz'), ' es el nombre del archivo sin «FormatoRA_» ni extensión; solo se usan las matrices cargadas. ' +
      'El archivo se procesa en este navegador.'),
    h('div', { class: 'campo' }, h('label', {}, 'Lectura de referencia (CSV)'), archivo),
    h('label', {}, casilla, ' Proponer parámetros calibrados con esta referencia'),
    h('p', {}, h('button', { type: 'button', class: 'boton', disabled: !validacion.texto || validacion.corriendo || null, onclick: correr }, 'Validar el método')),
    validacion.corriendo ? aviso('info', 'Comparando el método con la referencia… ' + (validacion.avance ? `${validacion.avance.capa ?? ''} (${validacion.avance.i + 1}/${validacion.avance.n})` : '')) : null,
    validacion.error ? aviso('error', validacion.error) : null,
    r && !r.casos ? aviso('warning', 'Ninguna matriz de la referencia está cargada, o sus atributos no coinciden.') : null,
    r && r.casos ? h('div', {},
      r.semantica ? null : aviso('warning', 'El modelo semántico no estaba disponible: el acuerdo se calculó solo con cobertura léxica y puede ser menor.'),
      columnas(metrica('Decisiones comparadas', r.metricas_activas.Global.n), metrica('Acuerdo', `${(100 * r.metricas_activas.Global.acuerdo).toFixed(0)}%`),
        metrica('Kappa de Cohen', r.metricas_activas.Global.kappa.toFixed(2))),
      tabla(Object.entries(r.metricas_activas).map(([k, v]) => fila(k, v)), colsM, { height: false }),
      r.sin_emparejar.length ? h('p', { class: 'leyenda' }, `${r.sin_emparejar.length} ítem(s) de la referencia sin emparejar (matriz no cargada o atributo no encontrado).`) : null,
      r.parametros_propuestos ? h('div', {}, h('p', {}, h('b', {}, 'Parámetros propuestos: '), JSON.stringify(r.parametros_propuestos),
        ` — acuerdo ${(100 * r.metricas_propuestas.Global.acuerdo).toFixed(0)}%, κ ${r.metricas_propuestas.Global.kappa.toFixed(2)}. Para adoptarlos, edítalos en la configuración del método.`)) : null,
      h('p', { class: 'leyenda' }, 'La referencia de la institución es una lectura asistida por IA, no validada por el comité: el acuerdo mide coincidencia con esa lectura, no exactitud.')) : null);
}

// ── Página ───────────────────────────────────────────────────────────────────

/**
 * @param {{matrices: {id,etiqueta,archivo}[], visibles: {id,etiqueta,archivo}[], seleccion: string|null, rerender: Function}} ctx
 *   matrices = todas las cargadas (referencia); visibles = las que pasan los filtros globales.
 */
export function paginaPerfil({ matrices, visibles, seleccion, rerender }) {
  memoria.rerender = rerender;
  // lo calculado desde Indicadores o el Resumen Ejecutivo comparte caché y modo con esta página
  memoria.modo = leerModo();
  if (memoria.versionLote !== estadoLote().version) { memoria.versionLote = estadoLote().version; memoria.consultadaCache = false; }
  consultarCache(matrices, rerender);
  const cfg = estadoPerfil().cfg;
  const m = seleccion ? matrices.find(x => x.id === seleccion) : null;

  const cuerpo = h('div', {});
  const pestanas = ['Resultados', 'Validar con referencia', 'Método'];
  const barra = h('div', { class: 'pestanas' }, ...pestanas.map(p => h('button', {
    type: 'button', class: p === memoria.pestana ? 'activa' : '', onclick: () => { memoria.pestana = p; rerender(); } }, p)));
  if (memoria.pestana === 'Método') cuerpo.append(vistaMetodo());
  else if (memoria.pestana === 'Validar con referencia') cuerpo.append(vistaValidar(matrices, rerender));
  else cuerpo.append(m ? vistaMatriz(m, matrices.map(x => x.id), rerender) : vistaConjunto(visibles, matrices.map(x => x.id), rerender));

  const raiz = h('div', {},
    ...titulo('Perfil de egreso: asociación con el currículo (V1)'),
    info('<b>¿Qué mide esta sección?</b> Divide el perfil profesional y el ocupacional en atributos (funciones del texto, áreas, tareas y ' +
      'poblaciones) y busca, <b>solo en la matriz del propio programa</b>, si cada atributo está respaldado por alguna <b>competencia</b>, ' +
      'algún <b>resultado de aprendizaje</b> y alguna <b>asignatura</b> (indicadores y núcleos temáticos). <b>V1</b> es la proporción de atributos ' +
      'alineados en al menos una capa; se informa además la alineación con las tres capas a la vez. El método es determinista: la misma matriz con la ' +
      `misma configuración${cfg ? ` (versión <b>${cfg.VERSION}</b>)` : ''} produce el mismo resultado. ` +
      (cfg ? textoValidacion(cfg) : '') + ' Los resultados son una <b>propuesta para validar</b> por el comité curricular.'),
    h('div', { class: 'vista-actual' }, m ? h('span', {}, 'Vista de matriz: ', h('b', {}, m.etiqueta)) :
      h('span', {}, `Vista del conjunto (${visibles.length} matrices)`)),
    barra, cuerpo);

  // Acciones de los botones creados con HTML
  queueMicrotask(() => {
    raiz.querySelector('#calcular-todas')?.addEventListener('click', () => calcularLote(visibles.filter(x => x.archivo), rerender));
    raiz.querySelector('#reintentar')?.addEventListener('click', () => { if (m) { memoria.errores.delete(m.id); rerender(); } });
  });
  return raiz;
}

/** Olvida los resultados en memoria (al cambiar de archivos). */
export function reiniciarPerfil() {
  memoria.resultados.clear();
  memoria.errores.clear();
  memoria.enCurso.clear();
  memoria.consultadaCache = false;
  memoria.lote = null;
}
