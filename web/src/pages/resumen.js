// Página «Resumen Ejecutivo»: ¿cómo está el conjunto?, ¿qué matrices requieren atención primero?, ¿qué hacer en cada una?
// Todo sale de los archivos cargados y de los filtros activos; son propuestas para validar por el comité.
import * as XLSX from 'xlsx';
import { agregar, CRITERIOS, referenciasConjunto, valorarMatriz } from '../data/indicadores.js';
import { cuantil, mediana } from '../data/estadistica.js';
import { aciertosPorFila, cargarConfig, configActual, hayConfig, resumirTendencias } from '../data/tendencias.js';
import { cmp } from '../data/util.js';
import { aviso, botonDescarga, columnas, descargar, grafico, h, info, metrica, selector, tabla, titulo } from '../ui.js';
import { datosIndicadores } from './indicadores.js';

const VARS = CRITERIOS.map(c => c[0]);
const ICONO = { Cumple: '🟢 Cumple', Parcial: '🟡 Parcial', 'No cumple': '🔴 No cumple', 'Sin dato': '⚪ Sin dato' };
const COLOR = { Cumple: '#1FB2DE', Parcial: '#FBAF17', 'No cumple': '#EC0677', 'Sin dato': '#8A94A0' };
const local = { matriz: null, cfgCargando: false };
const fmt = v => (v === null || v === undefined ? '—' : `${v.toFixed(0)}%`);
const miles = n => n.toLocaleString('es-CO');
const COL_ASIG = 'Nombre asignatura o modulo';

/** Port de recomendaciones_matriz (src/informes_pdf.py). */
export function recomendacionesMatriz(estados, fila, nSinPerfil, nRaNoEval, nEstIncompletas) {
  const malo = v => ['Parcial', 'No cumple'].includes(estados[v]);
  const r = [];
  if (malo('V1')) r.push(`V1 Perfil: revisar ${nSinPerfil} atributo(s) del perfil de egreso sin alineación; incorporarlos en competencias, RA o asignaturas, o ajustar la redacción del perfil.`);
  if (malo('V2')) r.push(`V2 Coherencia: diferenciar el verbo repetido entre competencias específicas (${fila['Verbos repetidos'] || 'ver Paso 2'}).`);
  if (malo('V3')) r.push(`V3 Evaluabilidad: reformular ${nRaNoEval} RA con verbo observable y finalidad de desempeño o producto.`);
  if (malo('V4')) r.push(`V4 Trazabilidad: vincular ${fila['RA sin estrategia'] ?? 0} RA a una estrategia mesocurricular con instrumento en el Paso 4.`);
  if (malo('V5')) r.push(`V5 Indicadores: completar indicador e instrumento en ${nEstIncompletas} estrategia(s) del Paso 4.`);
  const niv = fila['Indicadores por nivel'] ?? {};
  if (fila.Estrategias && !((niv.N3 ?? 0) + (niv.N4 ?? 0))) r.push('Evidencia (recomendación, sin criterio en la plantilla): ninguna estrategia declara indicadores de aprendizaje demostrado (N3) o transferencia (N4); conviene incluir al menos uno por estrategia.');
  return r;
}

function asignaturasSinNucleos(filas) {
  const s = new Set();
  for (const f of filas) {
    const a = f[COL_ASIG];
    if (a == null || String(a).trim().toLowerCase().startsWith('electiv')) continue;
    const n = f['Nucleos tematicos'];
    if (n == null || ['', 'nan'].includes(String(n).trim())) s.add(String(a));
  }
  return s;
}

function alertas(filas, etiqueta) {
  const out = [];
  const piv = new Map();
  for (const f of filas) {
    if (!['Saber', 'SaberHacer', 'SaberSer'].includes(f['Tipo de Saber'])) continue;
    if (!piv.has(f.Matriz)) piv.set(f.Matriz, { Saber: 0, SaberHacer: 0, SaberSer: 0, n: 0 });
    const o = piv.get(f.Matriz); o[f['Tipo de Saber']]++; o.n++;
  }
  if (piv.size >= 4) {
    for (const t of ['Saber', 'SaberHacer', 'SaberSer']) {
      const v = [...piv].map(([m, o]) => [m, 100 * o[t] / o.n]);
      const q1 = cuantil(v.map(x => x[1]), 0.25), q3 = cuantil(v.map(x => x[1]), 0.75), med = mediana(v.map(x => x[1]));
      for (const [m, p] of v) {
        if (p < q1 - 1.5 * (q3 - q1) || p > q3 + 1.5 * (q3 - q1)) {
          out.push({ Matriz: m, Categoría: 'Tipo de Saber', Hallazgo: `${etiqueta.get(m) ?? m}: ${t} ${p.toFixed(0)}% se aparta del conjunto cargado (mediana ${med.toFixed(0)}%; P25–P75 ${q1.toFixed(0)}–${q3.toFixed(0)}%)`,
            Recomendación: 'Revisar si la diferencia responde a una decisión de diseño o a un error de diligenciamiento de la matriz.' });
        }
      }
    }
  }
  const sinSem = filas.filter(f => f.Semestre == null || f.Semestre === '' || !Number.isFinite(Number(f.Semestre))).length;
  if (sinSem) out.push({ Matriz: null, Categoría: 'Completitud de datos', Hallazgo: `${sinSem} de ${filas.length} registros (${(100 * sinSem / filas.length).toFixed(0)} %) sin semestre reconocible`,
    Recomendación: 'Revisar el campo Semestre de esas asignaturas en el Paso 5 (valores vacíos o no numéricos).' });
  const sinNuc = asignaturasSinNucleos(filas).size;
  const nAsig = new Set(filas.map(f => f[COL_ASIG]).filter(x => x != null)).size;
  if (sinNuc) out.push({ Matriz: null, Categoría: 'Completitud de datos', Hallazgo: `${sinNuc} asignaturas no electivas (${(100 * sinNuc / nAsig).toFixed(0)}%) sin núcleos temáticos declarados`,
    Recomendación: 'Completar la columna «Núcleos temáticos» en el formato Excel para un análisis más preciso.' });
  return out;
}

export function paginaResumen({ filas, todasFilas, archivos, archivoDe, etiqueta, seleccion, descripcionFiltros, rerender }) {
  const cab = [...titulo('Resumen Ejecutivo'),
    info('Responde tres preguntas para el comité curricular: <b>¿cómo está el conjunto?</b> (V1–V5 y valoración por criterios), <b>¿qué matrices requieren atención primero?</b> y ' +
      '<b>¿qué hacer en cada matriz?</b> (acciones sugeridas y elementos a revisar). Todo se calcula con los archivos cargados y los filtros activos; los resultados son una propuesta para validar por el comité.')];
  if (!hayConfig() && !local.cfgCargando) { local.cfgCargando = true; cargarConfig().then(() => { local.cfgCargando = false; rerender(); }); }
  const d = datosIndicadores({ archivos, archivoDe, rerender });
  if (!d.matrices) {
    return h('div', {}, ...cab, d.error ? aviso('error', d.error)
      : aviso('info', `Preparando el resumen (Pasos 2, 3 y 4)… ${d.avance ? `${d.avance[0]} de ${d.avance[1]} archivos` : ''}`));
  }

  const vis = new Set(filas.map(f => f.Matriz));
  const evalVista = d.matrices.filter(m => vis.has(m.matriz) && (!seleccion || m.matriz === seleccion));
  const todo = agregar(d.matrices, d.v1);
  const vista = agregar(evalVista, d.v1);
  const g = vista.globales;
  const ref = referenciasConjunto(todo.por_matriz);
  const filasVista = seleccion ? filas.filter(f => f.Matriz === seleccion) : filas;
  const sinV1 = !Object.keys(d.v1).length;
  if (!g.matrices) return h('div', {}, ...cab, aviso('warning', 'Ninguna matriz de la vista tiene los Pasos 2, 3 y 4 legibles.'));

  const val = Object.fromEntries(vista.por_matriz.map(m => [m.Matriz, valorarMatriz(m, { sinRespaldo: d.perfil[m.Matriz]?.sin ?? null, tresCapas: d.perfil[m.Matriz]?.tres ?? null, referencia: ref })]));
  const prioridades = vista.por_matriz.map(m => {
    const est = Object.fromEntries(val[m.Matriz].map(v => [v.Variable, v.Estado]));
    return { Matriz: m.Matriz, Etiqueta: etiqueta.get(m.Matriz) ?? m.Matriz, ...Object.fromEntries(VARS.map(v => [v, est[v] ?? 'Sin dato'])),
      'No cumple': VARS.filter(v => est[v] === 'No cumple').length, Parcial: VARS.filter(v => est[v] === 'Parcial').length };
  }).sort((a, b) => b['No cumple'] - a['No cumple'] || b.Parcial - a.Parcial || cmp(a.Etiqueta, b.Etiqueta));
  const conteo = CRITERIOS.map(([v, e]) => [`${v} ${e}`, v, Object.fromEntries(['Cumple', 'Parcial', 'No cumple', 'Sin dato'].map(s => [s, prioridades.filter(p => p[v] === s).length]))]);

  // lectura rápida (hechos, sin umbrales)
  const lectura = [];
  if (prioridades.length) {
    const n = prioridades.length, conNC = prioridades.filter(p => p['No cumple'] > 0).length, todas = prioridades.filter(p => VARS.every(v => p[v] === 'Cumple')).length;
    lectura.push(`<b>${conNC} de ${n}</b> matrices tienen al menos un criterio en «No cumple»; <b>${todas}</b> ${todas === 1 ? 'cumple' : 'cumplen'} los cinco criterios.`);
    const peor = [...conteo].sort((a, b) => b[2]['No cumple'] - a[2]['No cumple'])[0];
    if (peor[2]['No cumple']) lectura.push(`El criterio con más incumplimiento es <b>${peor[0]}</b> (${peor[2]['No cumple']} matrices en «No cumple», ${peor[2].Parcial} en «Parcial»).`);
    const cumplidos = conteo.filter(c => c[2].Cumple === n).map(c => c[0]);
    if (cumplidos.length) lectura.push(`Todas las matrices cumplen: <b>${cumplidos.join(', ')}</b>.`);
  }
  const nSinAl = Object.entries(d.perfil).filter(([m]) => vis.has(m) && (!seleccion || m === seleccion)).reduce((a, [, p]) => [a[0] + p.nSin, a[1] + p.n], [0, 0]);
  if (nSinAl[1]) lectura.push(`Perfil de egreso: <b>${nSinAl[0]} de ${nSinAl[1]}</b> atributos (${(100 * nSinAl[0] / nSinAl[1]).toFixed(0)} %) sin alineación en ninguna capa (competencias, RA o asignaturas).`);
  if (g.ra_unicos) lectura.push(`De <b>${g.ra_unicos}</b> RA únicos, <b>${g.ra_sin_estrategia}</b> no tienen estrategia mesocurricular con instrumento (V4) y <b>${vista.ra.filter(r => !r.V3).length}</b> no son evaluables (V3).`);
  if (g.estrategias) lectura.push(`<b>${g.estrategias_directa} de ${g.estrategias}</b> estrategias declaran indicadores de aprendizaje demostrado o transferencia (N3–N4).`);

  // tendencias
  let tend = null;
  if (hayConfig()) {
    const T = configActual().TENDENCIAS_GLOBALES, acier = aciertosPorFila(todasFilas), r = resumirTendencias(filasVista, acier);
    const progs = new Set(filasVista.map(f => f.Programa));
    tend = Object.keys(T).map(t => {
      const ps = new Set(filasVista.filter(f => acier.get(f)?.[t]).map(f => f.Programa));
      return { Tendencia: T[t].descripcion, Asignaturas: r.conteo[t], '% de asignaturas': +r.cobertura[t].toFixed(1), Programas: ps.size, '% de programas': progs.size ? +(100 * ps.size / progs.size).toFixed(1) : 0 };
    }).sort((a, b) => a['% de asignaturas'] - b['% de asignaturas'] || a.Programas - b.Programas);
    const ausentes = tend.filter(t => t.Asignaturas === 0).map(t => t.Tendencia);
    if (ausentes.length) lectura.push(`Tendencias globales sin presencia: ${ausentes.join(', ')}.`);
  }

  const kpis = [['Programas', new Set(filasVista.map(f => f.Programa)).size], ['Matrices', new Set(filasVista.map(f => f.Matriz)).size],
    ['Asignaturas', new Set(filasVista.map(f => f[COL_ASIG]).filter(x => x != null)).size], ['RA únicos', g.ra_unicos ?? 0], ['Estrategias (Paso 4)', g.estrategias ?? 0]];
  const al = alertas(filasVista, etiqueta).filter(a => !seleccion || !a.Matriz || a.Matriz === seleccion);

  const matricesVista = prioridades.map(p => p.Matriz);
  if (!matricesVista.includes(local.matriz)) local.matriz = matricesVista[0] ?? null;
  const sel = seleccion ?? local.matriz;

  return h('div', {}, ...cab,
    seleccion ? aviso('info', `<b>Vista de matriz:</b> ${etiqueta.get(seleccion)}. Las medianas de referencia son las de las ${ref.n} matrices cargadas.`) : h('p', { class: 'leyenda' }, descripcionFiltros),
    sinV1 ? aviso('info', 'V1 usa el cálculo del perfil, que aún no está en este navegador. Calcula las matrices en «Perfil de Egreso (V1)» y vuelve: V1 se completa solo.') : null,
    ...d.errores.map(e => aviso('warning', `❌ <b>${e.archivo}</b>: ${e.causa}`)),
    columnas(...kpis.map(([e, v]) => metrica(e, miles(v)))),
    lectura.length ? h('div', {}, h('h3', {}, '🔎 Lectura rápida'), h('ul', {}, ...lectura.map(l => h('li', { html: l })))) : null,
    h('hr'),
    h('h3', {}, '📐 Coherencia y trazabilidad curricular (V1–V5)'),
    columnas(metrica('V1 Perfil', fmt(g.V1), `${g.atributos_perfil} atributos evaluables del perfil.`), metrica('V2 Coherencia', fmt(g.V2), `${g.matrices_con_repeticion} matriz(ces) con verbo repetido.`),
      metrica('V3 Evaluabilidad', fmt(g.V3), `${g.ra_unicos} RA únicos.`), metrica('V4 Trazabilidad', fmt(g.V4), `Sin el RA genérico: ${fmt(g.V4_programa)}.`),
      metrica('V5 Evidencia (N2+)', fmt(g.V5), `${g.estrategias} estrategias.`)),
    h('p', { class: 'leyenda' }, 'Valoración por criterios: número de matrices en cada estado. Cumple = la regla de la plantilla se cumple en todos los casos; Parcial = en algunos; No cumple = en ninguno.'),
    grafico(['Cumple', 'Parcial', 'No cumple', 'Sin dato'].map(s => ({ type: 'bar', orientation: 'h', name: s, y: conteo.map(c => c[0]), x: conteo.map(c => c[2][s]),
      text: conteo.map(c => c[2][s] || ''), textposition: 'inside', marker: { color: COLOR[s] } })),
    { height: 320, barmode: 'stack', xaxis: { title: 'Matrices' }, yaxis: { autorange: 'reversed' }, margin: { l: 250, r: 10, t: 10, b: 40 } }),
    h('hr'),
    h('h3', {}, '🚦 Matrices que requieren atención'),
    h('p', { class: 'leyenda' }, 'Ordenadas por número de criterios en «No cumple» y luego en «Parcial».'),
    tabla(prioridades.map(p => ({ Matriz: p.Etiqueta, ...Object.fromEntries(CRITERIOS.map(([v, e]) => [`${v} ${e}`, ICONO[p[v]]])), 'No cumple': p['No cumple'], Parcial: p.Parcial })),
      ['Matriz', ...CRITERIOS.map(([v, e]) => `${v} ${e}`), 'No cumple', 'Parcial'].map(c => ({ title: c, field: c, ...(c === 'Matriz' ? { minWidth: 280, frozen: true } : {}) })),
      { height: Math.min(560, 35 * prioridades.length + 50) }),
    botonDescarga('Descargar prioridades (Excel)', () => {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prioridades.map(({ Matriz, Etiqueta, ...r }) => ({ Matriz: Etiqueta, ...r }))), 'Prioridades');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lectura.map(l => ({ 'Lectura rápida': l.replace(/<[^>]+>/g, '') }))), 'Lectura');
      descargar('resumen_ejecutivo.xlsx', XLSX.write(wb, { bookType: 'xlsx', type: 'array' }), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }), ' ',
    botonDescarga('Imprimir o guardar como PDF', () => window.print()),
    h('hr'),
    h('h3', {}, '⚠️ Hallazgos transversales'),
    al.length ? h('div', {}, ...al.map(a => h('details', {}, h('summary', {}, `🟡 ${a.Categoría}: ${a.Hallazgo}`), h('p', {}, h('b', {}, '💡 Recomendación: '), a.Recomendación))))
      : aviso('success', '✅ Sin alertas de tipo de saber ni de completitud de datos.'),
    tend ? h('details', {}, h('summary', {}, `💡 Presencia de las ${tend.length} tendencias globales, de menor a mayor`),
      h('p', { class: 'leyenda' }, 'No existe un mínimo institucional de cobertura, por lo que ninguna tendencia se califica como baja. La tabla las ordena para que el comité decida cuáles reforzar.'),
      tabla(tend, Object.keys(tend[0]).map(c => ({ title: c, field: c, ...(c === 'Tendencia' ? { minWidth: 240 } : { hozAlign: 'right' }) })), { height: false })) : null,
    h('hr'),
    h('h3', {}, '🛠️ Qué hacer en cada matriz'),
    seleccion ? null : selector('Matriz', matricesVista.map(m => etiqueta.get(m) ?? m), etiqueta.get(sel) ?? '',
      v => { local.matriz = matricesVista.find(m => (etiqueta.get(m) ?? m) === v); rerender(); }),
    sel ? vistaAcciones({ sel, vista, val, d, etiqueta }) : null);
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
    tabla(v.map(({ Valor, ...r }) => r), ['Variable', 'Tramo', 'Resultado', 'Estado', 'Referencia (mediana)'].map(c => ({ title: c, field: c,
      ...(c === 'Resultado' ? { minWidth: 260, formatter: 'textarea' } : {}), ...(c === 'Estado' ? colEstado : {}) })), { height: false }),
    recs.length ? h('div', {}, h('b', {}, 'Acciones sugeridas'), h('ul', {}, ...recs.map(r => h('li', {}, r)))) : aviso('success', 'La matriz cumple todos los criterios; no hay acciones sugeridas.'),
    noEval.length ? h('details', {}, h('summary', {}, `RA no evaluables (${noEval.length})`), h('ul', {}, ...noEval.map(r => h('li', {}, `${r.ra} — ${r.motivo_V3}`)))) : null,
    sinEst.length ? h('details', {}, h('summary', {}, `RA sin estrategia (${sinEst.length})`), h('ul', {}, ...sinEst.map(r => h('li', {}, r.ra + (r.generica ? ' (RA genérico institucional)' : ''))))) : null,
    incompletas.length ? h('details', {}, h('summary', {}, `Estrategias incompletas (${incompletas.length})`),
      h('ul', {}, ...incompletas.map(e => h('li', {}, `${e.estrategia} — falta ${[e.indicadores > 0 ? null : 'indicador', e.instrumento ? null : 'instrumento'].filter(Boolean).join(' e ')}`)))) : null,
    h('p', { class: 'leyenda' }, `Matriz: ${etiqueta.get(sel) ?? sel}.`));
}
