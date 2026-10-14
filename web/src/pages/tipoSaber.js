// Página «Tipo de Saber». La unidad de análisis es la matriz (programa-sede). La referencia (mediana y P25–P75) es
// siempre la del conjunto cargado, aunque se elija una matriz o se filtre (regla R-B de la auditoría).
import { cmp } from '../data/util.js';
import { aviso, columnas, COLORES, grafico, h, info, multiselect, selector, tabla, titulo } from '../ui.js';

const TIPOS = ['Saber', 'SaberHacer', 'SaberSer'];
const COLOR = { Saber: '#092196', SaberHacer: '#748BFC', SaberSer: '#A8B7FF' };
const PALETA = ['#0F83FF', '#FF8B0F', '#FF0F83', '#0FBFFF', '#748BFC', '#0FFF8B', '#092196', '#A8B7FF'];

// estado propio de la página (selección de la evolución por semestre y de la asignatura)
const local = { programas: null, asignatura: null };

/** Percentil con interpolación lineal (igual que pandas.quantile). */
function cuantil(valores, q) {
  const v = [...valores].sort((a, b) => a - b);
  if (!v.length) return 0;
  const pos = (v.length - 1) * q, i = Math.floor(pos), f = pos - i;
  return v[i] + (i + 1 < v.length ? (v[i + 1] - v[i]) * f : 0);
}

const redondear = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

/** {id → {Saber, SaberHacer, SaberSer (% redondeado a 1 decimal), n}} */
function porcentajesPorMatriz(filas) {
  const m = new Map();
  for (const f of filas) {
    const t = f['Tipo de Saber'];
    if (!m.has(f.Matriz)) m.set(f.Matriz, { Saber: 0, SaberHacer: 0, SaberSer: 0, n: 0 });
    const o = m.get(f.Matriz);
    o[t]++; o.n++;
  }
  for (const o of m.values()) for (const t of TIPOS) o[`${t}_n`] = o[t], o[t] = redondear(o[t] / o.n * 100);
  return m;
}

function diagnostico(filasVista, refs) {
  const total = filasVista.length;
  return h('div', {},
    h('b', {}, 'Posición frente al conjunto cargado'),
    h('p', { class: 'leyenda' }, `Mediana y rango intercuartílico (P25–P75) de las ${refs.nMatrices} matrices cargadas`),
    ...TIPOS.map(t => {
      const n = filasVista.filter(f => f['Tipo de Saber'] === t).length;
      const pct = total ? n / total * 100 : 0;
      const [p25, med, p75] = refs[t];
      return h('div', { style: { margin: '10px 0', padding: '10px 14px', borderRadius: '8px', background: '#F5FDFF', borderLeft: `4px solid ${COLOR[t]}` },
        html: `<b style="color:${COLOR[t]}">${t}</b> <span style="float:right;font-weight:700">● ${pct.toFixed(0)}%</span><br>` +
          `<div style="background:#E0F0F8;border-radius:4px;height:8px;margin:6px 0"><div style="background:${COLOR[t]};width:${Math.min(pct, 100)}%;height:8px;border-radius:4px"></div></div>` +
          `<small style="color:#666">Mediana de las matrices: ${med.toFixed(0)}% (P25–P75: ${p25.toFixed(0)}–${p75.toFixed(0)}%) &nbsp;|&nbsp; ${n} de ${total} registros</small>` });
    }));
}

function donut(filasVista) {
  const c = TIPOS.map(t => filasVista.filter(f => f['Tipo de Saber'] === t).length);
  return grafico([{ type: 'pie', labels: TIPOS, values: c, hole: 0.45, sort: false, marker: { colors: TIPOS.map(t => COLOR[t]) },
    texttemplate: '%{label}<br><b>%{percent:.0%}</b>', textfont: { size: 12 } }],
  { height: 380, showlegend: false, margin: { t: 50, b: 10, l: 10, r: 10 }, title: { text: 'Composición de los registros' } });
}

function radar(pct, refs, etiqueta, seleccion) {
  const ids = seleccion ? [seleccion] : [...pct.keys()];
  const cerrar = a => [...a, a[0]], teta = cerrar(TIPOS);
  const trazas = ids.map((id, i) => {
    const color = PALETA[i % PALETA.length];
    return { type: 'scatterpolar', r: cerrar(TIPOS.map(t => pct.get(id)[t])), theta: teta, fill: 'toself', name: etiqueta.get(id),
      line: { color, width: 2 }, fillcolor: color + '26' };
  });
  trazas.push({ type: 'scatterpolar', r: cerrar(TIPOS.map(t => refs[t][1])), theta: teta, fill: 'toself', fillcolor: 'rgba(251,175,23,0.07)',
    line: { color: '#FBAF17', width: 2, dash: 'dot' }, name: 'Mediana de las matrices cargadas' });
  return grafico(trazas, { polar: { radialaxis: { visible: true, range: [0, 100], tickfont: { size: 10 }, ticksuffix: '%' } },
    height: 450, showlegend: !seleccion || true, legend: { orientation: 'h', y: -0.15 } });
}

function comparativo(pct, refs, etiqueta, seleccion) {
  const ids = (seleccion ? [seleccion] : [...pct.keys()]).sort((a, b) => cmp(etiqueta.get(b), etiqueta.get(a)));
  const y = ids.map(i => etiqueta.get(i));
  const trazas = TIPOS.map(t => ({ type: 'bar', orientation: 'h', name: t, x: ids.map(i => pct.get(i)[t]), y, marker: { color: COLOR[t] },
    text: ids.map(i => `${pct.get(i)[t].toFixed(0)}%`), textposition: 'outside' }));
  const lineas = TIPOS.map(t => ({ type: 'line', xref: 'x', yref: 'paper', x0: refs[t][1], x1: refs[t][1], y0: 0, y1: 1,
    line: { color: COLOR[t], dash: 'dot', width: 1 }, opacity: 0.6 }));
  return grafico(trazas, { barmode: 'group', height: Math.max(300, ids.length * 80), xaxis: { range: [0, 110], title: '% de registros' },
    shapes: lineas, margin: { l: 280, r: 20, t: 30, b: 50 }, legend: { orientation: 'h', y: 1.05 } });
}

function evolucion(filas) {
  const num = f => { const n = Number(f.Semestre); return Number.isFinite(n) && f.Semestre !== '' && f.Semestre != null ? Math.trunc(n) : null; };
  const validas = filas.filter(f => num(f) !== null);
  if (!validas.length) return aviso('info', 'No hay datos de semestres numéricos para la selección.');
  const sems = [...new Set(validas.map(num))].sort((a, b) => a - b);
  const trazas = TIPOS.map(t => ({ type: 'scatter', mode: 'lines+markers', name: t, x: sems.map(String), marker: { color: COLOR[t] },
    line: { color: COLOR[t] },
    y: sems.map(s => { const fs = validas.filter(f => num(f) === s); return redondear(fs.filter(f => f['Tipo de Saber'] === t).length / fs.length * 100); }) }));
  return grafico(trazas, { height: 400, yaxis: { range: [0, 100], title: '%' }, xaxis: { title: 'Semestre', type: 'category' },
    title: { text: 'Evolución del Tipo de Saber por semestre' } });
}

function porAsignatura(filas) {
  const m = new Map();
  for (const f of filas) {
    const a = f['Nombre asignatura o modulo'];
    if (!m.has(a)) m.set(a, { Asignatura: a, Saber: 0, SaberHacer: 0, SaberSer: 0, n: 0 });
    const o = m.get(a); o[f['Tipo de Saber']]++; o.n++;
  }
  const datos = [...m.values()].map(o => ({ Asignatura: o.Asignatura, ...Object.fromEntries(TIPOS.map(t => [t, redondear(o[t] / o.n * 100)])), Registros: o.n }));
  datos.sort((a, b) => b.SaberHacer - a.SaberHacer);
  const col = t => ({ title: t, field: t, hozAlign: 'right', formatter: c => `${Math.round(c.getValue())}%`, sorter: 'number' });
  return tabla(datos, [{ title: 'Asignatura', field: 'Asignatura', minWidth: 280 }, ...TIPOS.map(col),
    { title: 'Registros', field: 'Registros', hozAlign: 'right' }], { height: Math.min(600, datos.length * 35 + 60) });
}

/**
 * @param {object} p
 * @param {Array} p.todas      todas las filas cargadas (referencia: no cambia con los filtros)
 * @param {Array} p.filas      filas tras los filtros globales
 * @param {Map}   p.etiqueta   id de matriz → «Programa – Modalidad – Sede»
 * @param {string|null} p.seleccion  matriz elegida (null = conjunto)
 */
export function paginaTipoSaber({ todas, filas, etiqueta, seleccion, rerender }) {
  const valida = f => TIPOS.includes(f['Tipo de Saber']);
  const base = todas.filter(valida), vista = filas.filter(valida);
  const pctRef = porcentajesPorMatriz(base);
  const refs = { nMatrices: pctRef.size };
  for (const t of TIPOS) { const v = [...pctRef.values()].map(o => o[t]); refs[t] = [cuantil(v, 0.25), cuantil(v, 0.5), cuantil(v, 0.75)]; }

  const filasVista = seleccion ? vista.filter(f => f.Matriz === seleccion) : vista;
  const pct = porcentajesPorMatriz(vista);
  const rangos = TIPOS.map(t => { const v = [...pctRef.values()].map(o => o[t]); return Math.max(...v) - Math.min(...v); });
  const paridad = !seleccion && pctRef.size >= 3 && Math.max(...rangos) <= 10;

  // evolución por semestre: en la vista del conjunto se puede acotar a ciertas matrices
  const ids = [...pct.keys()].sort((a, b) => cmp(etiqueta.get(a), etiqueta.get(b)));
  if (!local.programas || local.programas.some(x => !pct.has(x)) || seleccion) local.programas = ids;
  const filasSem = seleccion ? filasVista : vista.filter(f => local.programas.includes(f.Matriz));
  const idAsig = seleccion ?? (ids.includes(local.asignatura) ? local.asignatura : ids[0]);

  return h('div', {},
    ...titulo('Análisis de Tipo de Saber'),
    info('El <b>Tipo de Saber</b> clasifica cada estrategia microcurricular según la dimensión del aprendizaje que desarrolla:<br>' +
      '• <b>Saber</b> (conocimiento): comprensión conceptual, teórica y declarativa.<br>' +
      '• <b>SaberHacer</b> (habilidad): competencias procedimentales y prácticas.<br>' +
      '• <b>SaberSer</b> (actitud): valores, ética, ciudadanía y dimensión humana.<br><br>' +
      '<b>Comparación:</b> cada matriz se compara con la <b>mediana de las matrices cargadas</b>. No se usan rangos «ideales» externos: ' +
      'la plantilla descompone cada competencia en un resultado de aprendizaje por tipo de saber, así que la proporción depende del ' +
      'instrumento más que del diseño del programa.'),
    seleccion ? aviso('info', `<b>Vista de matriz:</b> ${etiqueta.get(seleccion)}. La mediana y el rango siguen siendo los de las ${refs.nMatrices} matrices cargadas.`) : null,
    h('hr'),
    h('h3', {}, 'Distribución global de Tipo de Saber'),
    paridad ? aviso('warning', `La distribución por tipo de saber es casi igual en todas las matrices cargadas (diferencia máxima entre matrices: ` +
      `${Math.max(...rangos).toFixed(0)} puntos). Esta paridad la fija la plantilla, no una decisión de diseño: no debe leerse como equilibrio ni como déficit.`) : null,
    columnas(donut(filasVista), diagnostico(filasVista, refs)),
    h('hr'),
    h('h3', {}, 'Perfil de competencias por matriz'),
    h('p', { class: 'leyenda' }, 'Radar: compara los 3 tipos de saber; la línea dorada es la mediana de las matrices cargadas. ' +
      'Comparativo: las líneas punteadas marcan esa mediana por tipo de saber.'),
    pestañas([
      ['Radar de competencias', () => radar(pct, refs, etiqueta, seleccion)],
      ['Comparativo detallado', () => comparativo(pct, refs, etiqueta, seleccion)],
    ]),
    h('hr'),
    h('h3', {}, 'Evolución de Tipo de Saber por semestre'),
    h('p', { class: 'leyenda' }, '¿Cómo cambia el enfoque del aprendizaje a lo largo de la carrera? Se espera que los semestres avanzados ' +
      'tengan mayor proporción de SaberHacer y SaberSer.'),
    seleccion ? null : multiselect('Seleccionar matrices:', ids.map(i => etiqueta.get(i)), local.programas.map(i => etiqueta.get(i)),
      v => { local.programas = ids.filter(i => v.includes(etiqueta.get(i))); }),
    seleccion ? null : h('button', { type: 'button', class: 'boton secundario', onclick: rerender }, 'Actualizar gráfico'),
    evolucion(filasSem),
    h('p', { class: 'leyenda' }, 'Si SaberSer es muy bajo en todos los semestres, el programa puede estar descuidando la formación en valores y ciudadanía.'),
    h('hr'),
    h('h3', {}, 'Tipo de Saber predominante por asignatura'),
    h('p', { class: 'leyenda' }, 'Distribución porcentual de cada tipo de saber por asignatura, ordenadas de mayor a menor SaberHacer.'),
    seleccion ? null : selector('Seleccionar matriz:', ids.map(i => etiqueta.get(i)), etiqueta.get(idAsig),
      v => { local.asignatura = ids.find(i => etiqueta.get(i) === v); rerender(); }),
    porAsignatura(vista.filter(f => f.Matriz === idAsig)));
}

function pestañas(defs) {
  const cuerpo = h('div', {});
  const botones = defs.map(([n, fn], i) => h('button', { type: 'button', class: '', onclick: () => abrir(i) }, n));
  const abrir = i => {
    botones.forEach((b, k) => b.classList.toggle('activa', k === i));
    cuerpo.replaceChildren(defs[i][1]());
  };
  abrir(0);
  return h('div', {}, h('div', { class: 'pestanas' }, ...botones), cuerpo);
}
