// Página «Indicadores V1–V5»: ruta de alineación, valoración por criterios, trazabilidad, niveles de evidencia.
// Conjunto = lo que reporta el artículo; matriz = una unidad programa-sede frente a la mediana de TODAS las matrices cargadas.
import { agregar, calcularIndicadores, CRITERIOS_EVALUADOS as CRITERIOS, ESTADOS_CRITERIO, NIVELES, referenciasConjunto, valorarMatriz } from '../data/indicadores.js';
import { mediana } from '../data/estadistica.js';
import { cmp } from '../data/util.js';
import { perfilEnCache } from '../perfil/servicio.js';
import { estadoLote } from '../perfil/lote.js';
import { panelV1 } from './panelV1.js';
import { indicadoresPerfil } from '../perfil/indicadores.js';
import { libroIndicadores } from '../export/libros.js';
import { MIME_XLSX } from '../export/excelMarca.js';
import { aviso, botonDescarga, columnas, descargar, grafico, h, info, metrica, selector, tabla, titulo } from '../ui.js';

const local = { firma: '', res: null, cargando: false, avance: null, error: null, v1: {}, perfil: {}, enCache: new Set(), versionLote: 0, v1Firma: '', matrizVal: null, leyendo: false };
const COLOR_ESTADO = { Cumple: '#1FB2DE', Parcial: '#FBAF17', 'No cumple': '#EC0677', 'Sin dato': '#8A94A0' };
const fmt = v => (v === null || v === undefined ? '—' : `${v.toFixed(0)}%`);

async function calcular(archivos, rerender) {
  local.cargando = true; local.error = null;
  try {
    local.res = await calcularIndicadores(archivos, { alAvance: (i, n, nombre) => { local.avance = [i, n, nombre]; rerender(); } });
  } catch (e) { local.error = String(e?.message ?? e); }
  local.cargando = false; local.avance = null; rerender();
}

/** V1 desde el módulo de perfil, solo de lo que ya está calculado en la caché. */
async function leerV1(archivoDe, rerender) {
  const v1 = {}, perfil = {}, enCache = new Set();
  for (const [id, archivo] of archivoDe) {
    if (!archivo) continue;
    const r = await perfilEnCache(archivo);
    if (!r) continue;
    enCache.add(id);
    const ind = indicadoresPerfil(r.items);
    if (!ind.Atributos) continue;
    v1[id] = [ind.n_alguna, ind.Atributos];
    perfil[id] = { sin: ind['% Sin asociación'], tres: ind['% Tres capas'], nSin: ind.n_sin, n: ind.Atributos };
  }
  const cambio = JSON.stringify(v1) !== JSON.stringify(local.v1) || enCache.size !== local.enCache.size;
  local.v1 = v1; local.perfil = perfil; local.enCache = enCache; local.leyendo = false;
  if (cambio) rerender();
}

/**
 * Datos de V1–V5 para otras páginas: dispara el cálculo (una vez por conjunto de archivos) y lee V1 de la caché del perfil.
 * Devuelve null mientras no estén listos; si hay error, {error}.
 */
export function datosIndicadores({ archivos, archivoDe, rerender }) {
  const firma = archivos.map(a => a.huella ?? a.nombre).join('|');
  if (local.firma !== firma) { local.firma = firma; local.res = null; local.v1 = {}; local.perfil = {}; }
  if (!local.res) {
    if (!local.cargando) calcular(archivos, rerender);
    return local.error ? { error: local.error } : { avance: local.avance };
  }
  asegurarV1(archivoDe, rerender);
  return { matrices: local.res.matrices, errores: local.res.errores, v1: local.v1, perfil: local.perfil,
    faltanPerfil: [...archivoDe].filter(([id, a]) => a && !local.enCache.has(id)).length };
}


function asegurarV1(archivoDe, rerender) {
  const lote = estadoLote();
  if (!local.leyendo && !lote.corriendo && (local.enCache.size < archivoDe.size || local.versionLote !== lote.version)) {
    local.leyendo = true; local.versionLote = lote.version; leerV1(archivoDe, rerender);
  }
}

const mediaPorMatriz = (porMatriz, campo) => mediana(porMatriz.map(m => m[campo]));

function ruta(g, ref = null) {
  const estInd = g.estrategias ? Math.round(1000 * g.estInd / g.estrategias) / 10 : null;
  const cadena = [
    ['V1 Atributo del perfil con alineación en alguna capa', g.V1, `${g.atributos_perfil} atributos`, '#1FB2DE', ref?.V1],
    ['RA vinculado a una competencia', g.RA_competencia, `${g.ra_unicos} RA únicos`, '#8A94A0', ref?.RA],
    ['V3 RA evaluable', g.V3, `${g.ra_unicos} RA únicos`, '#8A94A0', ref?.V3],
    ['V2 Competencia específica con RA', g.V2_comp, `${g.competencias_especificas} competencias`, '#1FB2DE', ref?.['V2 %']],
    ['V4 RA con estrategia mesocurricular', g.V4, `${g.ra_unicos} RA únicos`, '#1FB2DE', ref?.V4],
    ['Estrategia con indicador e instrumento', estInd, `${g.estrategias} estrategias`, '#8A94A0', ref?.IND],
  ].filter(x => x[1] !== null && x[1] !== undefined);
  const inv = [...cadena].reverse();
  return grafico([{ type: 'bar', orientation: 'h', x: inv.map(x => x[1]), y: inv.map(x => x[0]), marker: { color: inv.map(x => x[3]) },
    text: inv.map(x => `${x[1].toFixed(0)} %  (${x[2]})`), textposition: 'outside', cliponaxis: false, name: 'Valor' },
  ...(ref ? [{ type: 'scatter', mode: 'markers', x: inv.map(x => x[4] ?? null), y: inv.map(x => x[0]), name: 'Mediana del conjunto', marker: { symbol: 'diamond', size: 12, color: '#FBAF17', line: { width: 1, color: '#0F385A' } } }] : [])],
  { height: 60 * cadena.length + 80, xaxis: { range: [0, 125], ticksuffix: ' %' }, margin: { l: 10, r: 10, t: 10, b: 10 }, plot_bgcolor: 'white', showlegend: !!ref, legend: { orientation: 'h', y: -0.1 } });
}

function figValoracion(val) {
  const filas = Object.values(val).flat();
  const cuenta = {};
  filas.forEach(v => { const k = `${v.Variable} ${v.Tramo}`; cuenta[k] ??= {}; cuenta[k][v.Estado] = (cuenta[k][v.Estado] ?? 0) + 1; });
  const orden = CRITERIOS.map(([v, e]) => `${v} ${e}`);
  return grafico([...ESTADOS_CRITERIO, 'Sin dato'].map(e => ({ type: 'bar', orientation: 'h', name: e, y: orden, x: orden.map(k => cuenta[k]?.[e] ?? 0),
    text: orden.map(k => cuenta[k]?.[e] || ''), textposition: 'inside', marker: { color: COLOR_ESTADO[e] } })),
  { height: 320, barmode: 'stack', xaxis: { title: 'Matrices' }, yaxis: { autorange: 'reversed' }, margin: { l: 250, r: 10, t: 10, b: 40 } });
}

function tablaValoracion(filas) {
  return tabla(filas.map(({ Valor, ...r }) => r), ['Variable', 'Tramo', 'Criterio', 'Resultado', 'Estado', 'Referencia (mediana)', 'Observación'].map(c => ({ title: c, field: c,
    ...(c === 'Criterio' || c === 'Resultado' ? { minWidth: 280, formatter: 'textarea' } : {}),
    ...(c === 'Estado' ? { formatter: cell => { const v = cell.getValue(); cell.getElement().style.color = COLOR_ESTADO[v] ?? '#000'; cell.getElement().style.fontWeight = 'bold'; return v; } } : {}) })),
  { height: false });
}

function stripPlot(porMatriz) {
  const vars = ['V1 %', 'V3 %', 'V4 %', 'V5 %'].filter(v => porMatriz.some(m => m[v] !== null && m[v] !== undefined));
  const sedes = [...new Set(porMatriz.map(m => m.Sede))].sort(cmp);
  const PAL = ['#0F385A', '#1FB2DE', '#FBAF17', '#EC0677', '#42F2F2', '#8A94A0'];
  return grafico(sedes.map((s, i) => {
    const pts = vars.flatMap(v => porMatriz.filter(m => m.Sede === s && m[v] !== null && m[v] !== undefined).map(m => ({ v, x: m[v], n: m.Matriz })));
    return { type: 'scatter', mode: 'markers', name: s, x: pts.map(p => p.x), y: pts.map(p => p.v), text: pts.map(p => p.n), hovertemplate: '%{text}<br>%{x}%<extra></extra>',
      marker: { color: PAL[i % PAL.length], opacity: 0.7, size: 9 } };
  }), { height: 320, xaxis: { range: [-3, 103], ticksuffix: ' %', title: 'Valor por matriz' }, yaxis: { type: 'category', categoryarray: vars }, margin: { l: 60, r: 10, t: 10, b: 40 } });
}

function tablaSimple(filas, cols, altura = false) {
  return filas.length ? tabla(filas, (cols ?? Object.keys(filas[0])).map(c => ({ title: c, field: c, ...(typeof filas[0][c] === 'number' ? { hozAlign: 'right' } : {}) })), { height: altura })
    : h('p', { class: 'leyenda' }, 'Sin registros.');
}

async function excel(vista, val, etiqueta, alcance) {
  descargar('indicadores_v1_v5.xlsx', await libroIndicadores({ vista, val, etiqueta, alcance }), MIME_XLSX);
}

function metricas(g) {
  return columnas(
    metrica('Matrices / programas', `${g.matrices} / ${g.programas}`),
    metrica('V1 Perfil', fmt(g.V1), g.V1 === null ? 'Calcula el perfil en «Perfil de Egreso (V1)» para ver V1.' : `${g.atributos_perfil} atributos evaluables del perfil.`),
    metrica('V2 Competencias con RA', fmt(g.V2_comp), `${g.competencias_especificas} competencias específicas. Genérica sin estrategia mesocurricular en ${g.genericas_sin_estrategia} de ${g.genericas_declaradas} matrices.`),
    metrica('V3 Evaluabilidad', fmt(g.V3), `${g.ra_unicos} RA únicos.`),
    metrica('V4 Trazabilidad', fmt(g.V4), `Sin el RA genérico: ${fmt(g.V4_programa)}.`),
    metrica('V5 Evidencia (N2+)', fmt(g.V5), `Evidencia directa (N3–N4, descriptiva): ${g.estrategias_directa} de ${g.estrategias} estrategias (${fmt(g.evidencia_directa)}).`));
}

export function paginaIndicadores({ filas, archivos, archivoDe, etiqueta, seleccion, rerender, incrustada = false }) {
  const cab = incrustada ? [] : [...titulo('Indicadores de Coherencia y Trazabilidad (V1–V5)'),
    info('<b>V1</b> Correspondencia del perfil: atributos respaldados en competencias, RA y asignaturas. <b>V2</b> Coherencia horizontal: matriz sin verbo repetido entre competencias ' +
      'específicas (no cuenta la genérica institucional). <b>V3</b> Evaluabilidad: RA con verbo observable y finalidad de desempeño. <b>V4</b> Trazabilidad: RA únicos con estrategia ' +
      'mesocurricular que declara instrumento (Paso 4). <b>V5</b> Evidencia del logro: estrategias cuyo indicador de mayor nivel supera la mera implementación (N2 o superior). ' +
      'Todo se calcula con los archivos cargados. <b>V2, V3 y V5 salen 100 % o casi en muchas matrices porque la plantilla las exige</b>: son condiciones del instrumento más que hallazgos.')];
  const firma = archivos.map(a => a.huella ?? a.nombre).join('|');
  if (local.firma !== firma) { local.firma = firma; local.res = null; local.v1 = {}; local.perfil = {}; }
  if (!local.res) {
    if (!local.cargando) calcular(archivos, rerender);
    return h('div', {}, ...cab, local.error ? aviso('error', local.error)
      : aviso('info', `Leyendo los Pasos 2, 3 y 4… ${local.avance ? `${local.avance[0]} de ${local.avance[1]} archivos` : ''}`));
  }
  asegurarV1(archivoDe, rerender);

  if (estadoLote().corriendo) return h('div', {}, ...cab, panelV1({ archivoDe, faltan: 1, rerender }));
  const { errores, matrices } = local.res;
  const vis = new Set(filas.map(f => f.Matriz));
  const evalVista = matrices.filter(m => vis.has(m.matriz));
  const todo = agregar(matrices, local.v1);                // referencia: siempre el conjunto cargado
  const vista = agregar(seleccion ? evalVista.filter(m => m.matriz === seleccion) : evalVista, local.v1);
  const ref = referenciasConjunto(todo.por_matriz);
  const avisos = incrustada ? [] : [
    ...errores.map(e => aviso('warning', `No se pudo evaluar <b>${e.archivo}</b>: ${e.causa}`)),
    panelV1({ archivoDe, faltan: [...archivoDe].filter(([id, a]) => a && !local.enCache.has(id)).length, rerender }),
  ];
  if (!vista.globales.matrices) return h('div', {}, ...cab, ...avisos, aviso('warning', 'Ninguna matriz de la vista tiene los Pasos 2, 3 y 4 legibles.'));

  const g = vista.globales;
  g.estInd = vista.estrategias.filter(e => e.indicadores > 0 && e.instrumento).length;
  const gTodo = todo.globales; gTodo.estInd = todo.estrategias.filter(e => e.indicadores > 0 && e.instrumento).length;
  const val = Object.fromEntries(todo.por_matriz.map(m => [m.Matriz, valorarMatriz(m, { sinRespaldo: local.perfil[m.Matriz]?.sin ?? null, tresCapas: local.perfil[m.Matriz]?.tres ?? null, referencia: ref })]));

  if (seleccion) return h('div', {}, ...cab, ...avisos, vistaMatriz({ g, vista, todo, ref, val, seleccion, etiqueta, rerender, incrustada }));

  const sinEst = vista.ra.filter(r => !r.V4 && !r.generica).map(r => ({ Matriz: etiqueta.get(r.matriz) ?? r.matriz, RA: r.ra }));
  const clases = ['RA genérico institucional', 'RA de programa'].map((c, i) => {
    const d = vista.ra.filter(r => r.generica === (i === 0));
    return { Clase: c, 'Con estrategia': d.filter(r => r.V4).length, 'RA únicos': d.length, 'V4 %': d.length ? Math.round(1000 * d.filter(r => r.V4).length / d.length) / 10 : null };
  }).filter(c => c['RA únicos']);
  const niv = Object.entries(g.niveles).sort((a, b) => cmp(a[0], b[0]));
  const totalNiv = niv.reduce((s, x) => s + x[1], 0);
  const valVista = Object.fromEntries(Object.entries(val).filter(([k]) => vis.has(k)));

  return h('div', {}, ...cab, ...avisos, incrustada ? null : metricas(g),
    h('h3', {}, 'Ruta de alineación curricular'),
    h('p', { class: 'leyenda' }, 'Cada tramo se calcula sobre su propia base. Gris: condición que impone la plantilla; azul: articulación. El nivel de evidencia de los indicadores (V5) no es un tramo de la ruta y se muestra más abajo.'),
    ruta(g),
    h('h3', {}, 'Valoración por criterios'),
    h('p', { class: 'leyenda' }, 'Cada tramo se compara con la regla que exige la plantilla. Cumple: en todos los casos; Parcial: en algunos; No cumple: en ninguno. No hay puntaje compuesto ni pesos; la mediana del conjunto solo sitúa a cada matriz.'),
    incrustada ? null : figValoracion(valVista),
    selector('Ver la valoración de una matriz', Object.keys(valVista).map(k => etiqueta.get(k) ?? k), etiqueta.get(local.matrizVal) ?? etiqueta.get(Object.keys(valVista)[0]) ?? '',
      v => { local.matrizVal = Object.keys(valVista).find(k => (etiqueta.get(k) ?? k) === v); rerender(); }),
    valVista[local.matrizVal ?? Object.keys(valVista)[0]] ? tablaValoracion(valVista[local.matrizVal ?? Object.keys(valVista)[0]]) : null,
    h('h3', {}, 'Indicadores por matriz'),
    tablaSimple(vista.por_matriz.map(({ 'Indicadores por nivel': _n, ...m }) => ({ ...m, Matriz: etiqueta.get(m.Matriz) ?? m.Matriz })), null, 380),
    stripPlot(vista.por_matriz),
    columnas(
      h('div', {}, h('h3', {}, 'Trazabilidad por clase de RA (V4)'), tablaSimple(clases),
        sinEst.length ? h('details', {}, h('summary', {}, `RA de programa sin estrategia mesocurricular (${sinEst.length})`), tablaSimple(sinEst, null, 320)) : null),
      h('div', {}, h('h3', {}, 'Indicadores del Paso 4 por nivel de evidencia (V5)'),
        tablaSimple(niv.map(([Nivel, Indicadores]) => ({ Nivel, Indicadores, '%': Math.round(1000 * Indicadores / totalNiv) / 10 }))),
        h('p', { class: 'leyenda' }, 'N1 implementación · N2 percepción · N3 aprendizaje demostrado · N4 transferencia · N5 efecto externo.'))),
    h('hr'),
    botonDescarga('Descargar indicadores V1–V5 (Excel)', () => excel(vista, val, etiqueta, seleccion ? `Matriz: ${etiqueta.get(seleccion) ?? seleccion}` : 'Conjunto de las matrices de la vista')));
}

function vistaMatriz({ g, vista, todo, ref, val, seleccion, etiqueta, incrustada }) {
  const m = vista.por_matriz[0];
  const valM = val[seleccion];
  const med = {
    V1: ref['V1 %'], RA: mediaPorMatriz(todo.por_matriz, 'RA con competencia %'), V3: ref['V3 %'], V4: ref['V4 %'],
    IND: mediana(todo.por_matriz.map(x => (x.Estrategias ? 100 * x['Estrategias con indicador e instrumento'] / x.Estrategias : null)).filter(x => x !== null)),
  };
  const sinEst = vista.ra.filter(r => !r.V4).map(r => ({ Clase: r.generica ? 'RA genérico institucional' : 'RA de programa', RA: r.ra }));
  const estSin = vista.estrategias.filter(e => !(e.indicadores > 0 && e.instrumento)).map(e => ({ Estrategia: e.estrategia, Indicadores: e.indicadores, Instrumento: e.instrumento ? 'Sí' : 'No' }));
  const niv = ['N1', 'N2', 'N3', 'N4', 'N5'].map((n, i) => ({ n: NIVELES[i], v: m['Indicadores por nivel'][n] ?? 0 }));
  const pos = (v, r) => (v === null || r === null ? '—' : v > r ? 'por encima' : v < r ? 'por debajo' : 'igual a');
  const gemelas = todo.por_matriz.filter(x => x.Programa === m.Programa && x.Matriz !== m.Matriz).map(x => x.Matriz);
  return h('div', {},
    aviso('info', `<b>Vista de matriz:</b> ${etiqueta.get(seleccion)}. El rombo dorado es la mediana de las ${ref.n} matrices cargadas. Las correlaciones y las diferencias entre sedes no existen para una sola matriz: aquí se muestra su posición frente a la mediana.`),
    gemelas.length ? aviso('warning', `Misma matriz en otras sedes: ${gemelas.map(x => etiqueta.get(x) ?? x).join('; ')}. Comparten RA y núcleos casi idénticos: no se comparan como hallazgo.`) : null,
    incrustada ? null : metricas(g),
    h('p', { class: 'leyenda' }, `Frente a la mediana — V1: ${pos(m['V1 %'], ref['V1 %'])} · V3: ${pos(m['V3 %'], ref['V3 %'])} · V4: ${pos(m['V4 %'], ref['V4 %'])} · V5: ${pos(m['V5 %'], ref['V5 %'])}.`),
    h('h3', {}, 'Ruta de alineación de la matriz'), ruta(g, med),
    h('h3', {}, 'Valoración por criterios'), tablaValoracion(valM),
    columnas(
      h('div', {}, h('h3', {}, `RA sin estrategia (${sinEst.length} de ${g.ra_unicos})`),
        sinEst.length ? tablaSimple(sinEst, null, 300) : aviso('success', 'Todos los RA tienen una estrategia con instrumento.')),
      h('div', {}, h('h3', {}, `Estrategias sin indicador o instrumento (${estSin.length} de ${g.estrategias})`),
        estSin.length ? tablaSimple(estSin, null, 300) : aviso('success', 'Todas las estrategias declaran indicador e instrumento.'))),
    m['Verbos repetidos'] ? aviso('warning', `Verbo repetido entre competencias específicas: <b>${m['Verbos repetidos']}</b>.`) : null,
    h('h3', {}, 'Indicadores del Paso 4 por nivel de evidencia'),
    grafico([{ type: 'bar', x: niv.map(x => x.n), y: niv.map(x => x.v), text: niv.map(x => x.v), textposition: 'outside', marker: { color: ['#8A94A0', '#FBAF17', '#1FB2DE', '#0F385A', '#EC0677'] } }],
      { height: 300, yaxis: { title: 'Indicadores' }, margin: { l: 50, r: 10, t: 10, b: 60 } }),
    h('p', { class: 'leyenda' }, `${g.estrategias_directa} de ${g.estrategias} estrategias con aprendizaje demostrado o transferencia (N3–N4).`));
}
