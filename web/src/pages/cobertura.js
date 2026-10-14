// Página «Cobertura Temática»: diversidad y densidad de núcleos, mapa de presencia y mapa de integración.
// Unidad de análisis: la matriz. La referencia (mediana de las matrices) se calcula siempre sobre todo lo cargado.
import { claveNucleo, nucleosValidos, tokenizarCelda } from '../data/nucleos.js';
import { cmp } from '../data/util.js';
import { aviso, botonDescarga, columnas, descargar, aCsv, grafico, h, info, metrica, multiselect, selector, tabla, titulo } from '../ui.js';

const local = { excluidos: [], programaSel: null, matricesMapa: null };
const COL_NUC = 'Nucleos tematicos', COL_ASIG = 'Nombre asignatura o modulo';
const corto = (t, n) => (t.length > n ? t.slice(0, n) + '…' : t);
const mediana = v => { const s = [...v].sort((a, b) => a - b); if (!s.length) return 0; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const memo = new WeakMap();
/** Núcleos válidos por fila (se calcula una vez por conjunto de datos). */
function nucleosPorFila(filas) {
  if (!memo.has(filas)) memo.set(filas, filas.map(f => nucleosValidos(f[COL_NUC]).validos));
  return memo.get(filas);
}

function contador(filas, excluidos) {
  const nucs = nucleosPorFila(filas);
  const c = new Map();
  nucs.forEach(l => l.forEach(n => { if (!excluidos.has(n)) c.set(n, (c.get(n) ?? 0) + 1); }));
  return c;
}

/** Entropía de Shannon normalizada (0–100). */
function diversidad(c) {
  const v = [...c.values()];
  if (v.length < 2) return 0;
  const t = v.reduce((a, b) => a + b, 0);
  const H = -v.reduce((s, x) => s + (x / t) * Math.log2(x / t), 0);
  return H / Math.log2(v.length) * 100;
}

/** Núcleos declarados por asignatura (sin validar, igual que Streamlit). */
function densidadPorAsignatura(filas, clave) {
  const m = new Map();
  for (const f of filas) {
    const k = clave(f);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + tokenizarCelda(f[COL_NUC]).length);
  }
  return [...m].sort((a, b) => b[1] - a[1]);
}

function metricasMatriz(filasMatriz) {
  const c = contador(filasMatriz, new Set());
  const d = densidadPorAsignatura(filasMatriz, f => f[COL_ASIG]);
  return { unicos: c.size, menciones: [...c.values()].reduce((a, b) => a + b, 0), densidad: d.length ? d.reduce((s, x) => s + x[1], 0) / d.length : 0, diversidad: diversidad(c) };
}

function barrasH(titulos, valores, completos, opciones = {}) {
  return grafico([{ type: 'bar', orientation: 'h', x: valores, y: titulos, customdata: completos,
    hovertemplate: '<b>%{customdata}</b><br>%{x}<extra></extra>', marker: { color: valores, colorscale: 'Blues', showscale: false } }],
  { height: 600, yaxis: { autorange: 'reversed' }, margin: { l: 280, r: 20, t: 20, b: 50 }, xaxis: { title: opciones.etiqueta }, ...opciones.layout });
}

function mapaPresencia(filas, etiqueta, counter, excluidos) {
  const top = [...counter].sort((a, b) => b[1] - a[1]).slice(0, 20).map(x => x[0]);
  const nucs = nucleosPorFila(filas);
  const ids = [...new Set(filas.map(f => f.Matriz))].sort((a, b) => cmp(etiqueta.get(a), etiqueta.get(b)));
  const z = new Map(ids.map(i => [i, Object.fromEntries(top.map(n => [n, 0]))]));
  filas.forEach((f, i) => nucs[i].forEach(n => { if (n in z.get(f.Matriz) && !excluidos.has(n)) z.get(f.Matriz)[n]++; }));
  const matriz = ids.map(i => top.map(n => z.get(i)[n]));
  return [
    grafico([{ type: 'heatmap', z: matriz, x: top.map(n => corto(n, 35)), y: ids.map(i => etiqueta.get(i)), colorscale: 'Blues',
      text: matriz, texttemplate: '%{text}', customdata: ids.map(() => top), hovertemplate: '%{y}<br>%{customdata}<br>Menciones: %{z}<extra></extra>',
      colorbar: { title: { text: 'Menciones' } } }],
    { height: Math.max(300, ids.length * 40 + 220), xaxis: { tickangle: 45, title: 'Núcleo temático (top 20 más frecuentes)' }, margin: { l: 260, r: 20, t: 20, b: 220 } }),
    h('details', {}, h('summary', {}, 'Ver nombres completos de los núcleos (referencia)'),
      top.some(n => n.length > 35)
        ? tabla(top.filter(n => n.length > 35).map(n => ({ Abreviado: corto(n, 35), 'Nombre completo': n })),
          [{ title: 'Abreviado', field: 'Abreviado' }, { title: 'Nombre completo', field: 'Nombre completo' }], { height: false })
        : h('p', { class: 'leyenda' }, 'Todos los nombres son cortos y se muestran completos.')),
  ];
}

function mapaIntegracion(filas, etiqueta, seleccion, rerender) {
  const ids = [...new Set(filas.map(f => f.Matriz))].sort((a, b) => cmp(etiqueta.get(a), etiqueta.get(b)));
  if (!local.matricesMapa || local.matricesMapa.some(x => !ids.includes(x)) || seleccion) local.matricesMapa = ids;
  const vista = filas.filter(f => local.matricesMapa.includes(f.Matriz));
  const nucs = nucleosPorFila(filas);
  const indice = new Map(filas.map((f, i) => [f, i]));
  const dic = new Map(), prog = new Map();
  for (const f of vista) {
    const a = String(f[COL_ASIG] ?? '').trim();
    if (!a || a === 'nan') continue;
    if (!dic.has(a)) { dic.set(a, new Set()); prog.set(a, f.Programa); }
    nucs[indice.get(f)].forEach(n => dic.get(a).add(claveNucleo(n)));
  }
  const sujetos = [...dic.keys()].sort();
  const cabecera = [h('h3', {}, 'Mapa de integración entre asignaturas'),
    h('p', { class: 'leyenda' }, 'Visualiza qué asignaturas comparten núcleos temáticos. Un nodo = una asignatura; una línea = al menos un núcleo en común; ' +
      'el grosor indica cuántos. Útil para detectar redundancias, solapamientos u oportunidades de articulación curricular.'),
    seleccion ? null : multiselect('Filtrar por matriz:', ids.map(i => etiqueta.get(i)), local.matricesMapa.map(i => etiqueta.get(i)),
      v => { local.matricesMapa = ids.filter(i => v.includes(etiqueta.get(i))); }),
    seleccion ? null : h('button', { type: 'button', class: 'boton secundario', onclick: rerender }, 'Actualizar mapa')];
  if (sujetos.length < 2) return [...cabecera, aviso('warning', 'Se necesitan al menos 2 asignaturas con núcleos temáticos para construir el mapa.')];

  // pares mediante índice invertido núcleo → asignaturas
  const inv = new Map();
  sujetos.forEach((s, i) => dic.get(s).forEach(n => { if (!inv.has(n)) inv.set(n, []); inv.get(n).push(i); }));
  const pares = new Map(), temas = new Map();
  for (const [n, lista] of inv) {
    for (let a = 0; a < lista.length; a++) for (let b = a + 1; b < lista.length; b++) {
      const k = lista[a] * sujetos.length + lista[b];
      pares.set(k, (pares.get(k) ?? 0) + 1);
      if (!temas.has(k)) temas.set(k, []);
      temas.get(k).push(n);
    }
  }
  const df = [...pares].map(([k, v]) => {
    const s1 = sujetos[Math.floor(k / sujetos.length)], s2 = sujetos[k % sujetos.length], t = temas.get(k).sort();
    return { 'Asignatura 1': s1, 'Asignatura 2': s2, 'Programa 1': prog.get(s1), 'Programa 2': prog.get(s2), 'Núcleos compartidos': v,
      'Temas compartidos': t.slice(0, 5).join(', ') + (t.length > 5 ? '…' : '') };
  });
  if (!df.length) return [...cabecera, aviso('info', 'No se encontraron núcleos temáticos compartidos entre las asignaturas seleccionadas.')];

  const grado = new Map();
  df.forEach(r => { for (const s of [r['Asignatura 1'], r['Asignatura 2']]) grado.set(s, (grado.get(s) ?? 0) + r['Núcleos compartidos']); });
  const aisladas = sujetos.filter(s => !grado.has(s));
  const MAX = 40;
  const top = sujetos.length > MAX ? [...grado].sort((a, b) => b[1] - a[1]).slice(0, MAX).map(x => x[0]) : sujetos;
  const pos = new Map(top.map((s, i) => [s, [Math.cos(2 * Math.PI * i / top.length), Math.sin(2 * Math.PI * i / top.length)]]));
  const maxComp = Math.max(...df.map(r => r['Núcleos compartidos']));
  const PAL = ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3', '#b3e2cd', '#fdcdac', '#cbd5e8', '#f4cae4'];
  const progs = [...new Set(top.map(s => prog.get(s)))].sort(cmp);
  const aristas = df.filter(r => pos.has(r['Asignatura 1']) && pos.has(r['Asignatura 2'])).map(r => {
    const [x1, y1] = pos.get(r['Asignatura 1']), [x2, y2] = pos.get(r['Asignatura 2']), n = r['Núcleos compartidos'];
    return { type: 'scatter', mode: 'lines', x: [x1, x2], y: [y1, y2], hoverinfo: 'none', showlegend: false,
      line: { width: Math.max(1, Math.min(8, n / maxComp * 8)), color: `rgba(100,100,100,${(0.15 + n / maxComp * 0.65).toFixed(2)})` } };
  });
  const nodos = progs.map((p, i) => {
    const ss = top.filter(s => prog.get(s) === p);
    return { type: 'scatter', mode: 'markers+text', name: corto(p ?? '', 35), x: ss.map(s => pos.get(s)[0]), y: ss.map(s => pos.get(s)[1]),
      text: ss.map(s => corto(s, 22)), textposition: 'top center', textfont: { size: 8 }, hoverinfo: 'text',
      hovertext: ss.map(s => `<b>${s}</b><br>Programa: ${prog.get(s)}<br>Peso de conexiones: ${grado.get(s) ?? 0}<br>Núcleos únicos: ${dic.get(s).size}`),
      marker: { size: ss.map(s => 10 + Math.min(grado.get(s) ?? 0, 25)), color: PAL[i % PAL.length], line: { width: 1, color: 'white' } } };
  });
  const ocultos = { showgrid: false, zeroline: false, showticklabels: false };
  const bloques = [...cabecera,
    columnas(metrica('Asignaturas en el mapa', sujetos.length), metrica('Pares con núcleos compartidos', df.length),
      metrica('Asignaturas sin conexiones', aisladas.length)),
    h('hr'), h('h3', {}, 'Red de integración temática'),
    sujetos.length > MAX ? aviso('info', `Hay <b>${sujetos.length}</b> asignaturas. Mostrando las <b>${MAX}</b> con mayor conectividad temática.`) : null,
    grafico([...aristas, ...nodos], { height: 660, showlegend: true, legend: { title: { text: 'Programa' }, x: 1.01, font: { size: 10 } },
      xaxis: ocultos, yaxis: ocultos, plot_bgcolor: 'white', margin: { t: 20, b: 20, l: 20, r: 20 } }),
    h('p', { class: 'leyenda' }, 'Lectura: el tamaño del nodo refleja el peso total de conexiones temáticas. Los nodos muy grandes son asignaturas ' +
      'articuladoras; los aislados pueden indicar falta de integración con otras.')];

  if (sujetos.length <= 35) {
    const z = sujetos.map(() => sujetos.map(() => 0));
    df.forEach(r => { const i = sujetos.indexOf(r['Asignatura 1']), j = sujetos.indexOf(r['Asignatura 2']); z[i][j] = z[j][i] = r['Núcleos compartidos']; });
    bloques.push(h('hr'), h('h3', {}, 'Matriz de integración (núcleos compartidos)'),
      h('p', { class: 'leyenda' }, 'Cada celda muestra cuántos núcleos comparten dos asignaturas. Valores altos indican integración alta o posible redundancia.'),
      grafico([{ type: 'heatmap', z, x: sujetos.map(s => corto(s, 30)), y: sujetos.map(s => corto(s, 30)), colorscale: 'Blues',
        colorbar: { title: { text: 'Núcleos comunes' } } }],
      { height: Math.max(400, sujetos.length * 18), xaxis: { tickangle: 45, tickfont: { size: 9 } }, yaxis: { tickfont: { size: 9 }, autorange: 'reversed' }, margin: { l: 200, b: 200, t: 20, r: 20 } }));
  }
  const topPares = df.sort((a, b) => b['Núcleos compartidos'] - a['Núcleos compartidos']).slice(0, 20);
  bloques.push(h('hr'), h('h3', {}, 'Pares con mayor integración temática'),
    h('p', { class: 'leyenda' }, 'Asignaturas que comparten más núcleos: candidatas a articulación explícita o revisión de solapamiento.'),
    tabla(topPares, Object.keys(topPares[0]).map(k => ({ title: k, field: k, ...(k === 'Núcleos compartidos' ? { hozAlign: 'right' } : {}) })), { height: false }),
    aisladas.length ? h('details', {}, h('summary', {}, `Asignaturas sin integración temática (${aisladas.length})`),
      h('p', { class: 'leyenda' }, 'No comparten ningún núcleo con otras. Pueden ser especializadas (normal) o indicar falta de articulación.'),
      h('ul', {}, ...aisladas.map(s => h('li', {}, h('b', {}, s), ` — Programa: ${prog.get(s) ?? 'N/A'}`)))) : null);
  return bloques;
}

/**
 * @param {Array} p.todas  todas las filas cargadas (referencia)
 * @param {Array} p.filas  filas tras los filtros globales
 */
export function paginaCobertura({ todas, filas, etiqueta, seleccion, rerender }) {
  const vista = seleccion ? filas.filter(f => f.Matriz === seleccion) : filas;
  const excluidos = new Set(local.excluidos);
  const contBruto = contador(vista, new Set());
  const cont = contador(vista, excluidos);
  const menciones = [...cont.values()].reduce((a, b) => a + b, 0);
  const dens = densidadPorAsignatura(vista, seleccion ? f => f[COL_ASIG] : f => f[COL_ASIG]);
  const promDens = dens.length ? dens.reduce((s, x) => s + x[1], 0) / dens.length : 0;
  const div = diversidad(cont);

  // referencia: mediana de las matrices cargadas
  const porMatriz = new Map();
  todas.forEach(f => { if (!porMatriz.has(f.Matriz)) porMatriz.set(f.Matriz, []); porMatriz.get(f.Matriz).push(f); });
  const ref = [...porMatriz.values()].map(metricasMatriz);
  const med = k => mediana(ref.map(r => r[k]));
  const nota = (k, fmt) => seleccion ? ` · mediana de las ${ref.length} matrices: ${fmt(med(k))}` : '';

  const topN = [...cont].sort((a, b) => b[1] - a[1]).slice(0, 20);
  const topD = dens.slice(0, 20);
  const programas = [...new Set(vista.map(f => f.Matriz))].sort((a, b) => cmp(etiqueta.get(a), etiqueta.get(b)));
  const sel = seleccion ?? (programas.includes(local.programaSel) ? local.programaSel : programas[0]);
  const contSel = contador(vista.filter(f => f.Matriz === sel), excluidos);
  const top15 = [...contSel].sort((a, b) => b[1] - a[1]).slice(0, 15);

  return h('div', {},
    ...titulo('Cobertura y Densidad Temática'),
    info('<b>¿Qué mide esta sección?</b> Analiza los <b>núcleos temáticos</b> declarados en los microcurrículos: qué temas se trabajan, con qué ' +
      'frecuencia y qué tan distribuidos están entre asignaturas. Un currículo con alta <b>diversidad</b> temática cubre más áreas del conocimiento.'),
    seleccion ? aviso('info', `<b>Vista de matriz:</b> ${etiqueta.get(seleccion)}. Las medianas de referencia son las de las ${ref.length} matrices cargadas.`) : null,
    h('details', {}, h('summary', {}, 'Revisar y depurar núcleos detectados'),
      h('p', { class: 'leyenda' }, 'Si algún núcleo no es válido (fragmentos, errores de formato…), exclúyelo del análisis y pulsa «Aplicar exclusiones».'),
      tabla([...contBruto].sort((a, b) => b[1] - a[1]).map(([n, c]) => ({ Núcleo: n, Menciones: c })),
        [{ title: 'Núcleo', field: 'Núcleo', minWidth: 400 }, { title: 'Menciones', field: 'Menciones', hozAlign: 'right' }], { height: 250 }),
      multiselect('Núcleos a excluir:', [...contBruto.keys()], local.excluidos.filter(n => contBruto.has(n)), v => { local.excluidos = v; }),
      h('button', { type: 'button', class: 'boton secundario', onclick: rerender }, 'Aplicar exclusiones'),
      excluidos.size ? aviso('warning', `<b>${excluidos.size}</b> núcleo(s) excluido(s) del análisis.`) : aviso('success', 'Todos los núcleos detectados están incluidos en el análisis.')),
    h('hr'),
    columnas(
      metrica('Núcleos únicos', cont.size, 'Número de temas o núcleos diferentes identificados' + nota('unicos', x => x.toFixed(0))),
      metrica('Total menciones', menciones.toLocaleString('es-CO'), 'Cuántas veces aparecen núcleos (pueden repetirse entre asignaturas)'),
      metrica('Promedio por asignatura', promDens.toFixed(1), 'Promedio de núcleos declarados por asignatura' + nota('densidad', x => x.toFixed(1))),
      metrica('Diversidad temática', `${div.toFixed(1)}/100`, 'Entropía de Shannon normalizada. 100 = todos los temas con igual peso; 0 = un solo tema domina' + nota('diversidad', x => x.toFixed(1)))),
    seleccion ? h('p', { class: 'leyenda' }, `Mediana de las ${ref.length} matrices — núcleos únicos: ${med('unicos').toFixed(0)} · promedio por asignatura: ${med('densidad').toFixed(1)} · diversidad: ${med('diversidad').toFixed(1)}`) : null,
    h('hr'),
    h('h3', {}, seleccion ? 'Presencia de núcleos temáticos (top 20)' : 'Presencia de núcleos temáticos por matriz (top 20)'),
    h('p', { class: 'leyenda' }, 'Cada celda muestra cuántas veces aparece el núcleo en las filas de la matriz. Los más frecuentes (términos cortos) pueden provenir de asignaturas del bloque institucional compartido.'),
    ...mapaPresencia(vista, etiqueta, cont, excluidos),
    h('hr'),
    columnas(
      h('div', {}, h('h3', {}, 'Top 20 núcleos temáticos'),
        h('p', { class: 'leyenda' }, 'Frecuencia = cuántas veces aparece el núcleo en todos los registros. Los muy cortos suelen ser temas generales del bloque institucional.'),
        barrasH(topN.map(x => corto(x[0], 45)), topN.map(x => x[1]), topN.map(x => x[0]), { etiqueta: 'Menciones' })),
      h('div', {}, h('h3', {}, 'Densidad temática (top 20 asignaturas)'),
        h('p', { class: 'leyenda' }, 'Asignaturas con más núcleos declarados. Alta densidad = mayor explicitación; las muy densas pueden tener temas duplicados.'),
        barrasH(topD.map(x => corto(x[0], 40)), topD.map(x => x[1]), topD.map(x => x[0]), { etiqueta: 'N.º de núcleos' }))),
    h('hr'),
    h('h3', {}, 'Explorar núcleos por matriz'),
    seleccion ? null : selector('Seleccionar matriz:', programas.map(i => etiqueta.get(i)), etiqueta.get(sel),
      v => { local.programaSel = programas.find(i => etiqueta.get(i) === v); rerender(); }),
    top15.length ? grafico([{ type: 'bar', x: top15.map(x => corto(x[0], 50)), y: top15.map(x => x[1]), customdata: top15.map(x => x[0]),
      hovertemplate: '<b>%{customdata}</b><br>%{y}<extra></extra>', marker: { color: top15.map(x => x[1]), colorscale: 'Viridis', showscale: false } }],
    { height: 450, xaxis: { tickangle: 45 }, yaxis: { title: 'Menciones' }, margin: { b: 200, t: 40, l: 50, r: 20 }, title: { text: `Top 15 núcleos temáticos — ${etiqueta.get(sel)}` } })
      : aviso('info', `No se encontraron núcleos temáticos para ${etiqueta.get(sel)}.`),
    botonDescarga('Descargar núcleos (CSV)', () => descargar('nucleos_frecuencia.csv',
      aCsv([...cont].sort((a, b) => b[1] - a[1]).map(([n, c]) => ({ Núcleo: n, Menciones: c })), ['Núcleo', 'Menciones']), 'text/csv')),
    h('hr'),
    ...mapaIntegracion(vista, etiqueta, seleccion, rerender));
}
