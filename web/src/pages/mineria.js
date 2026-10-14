// Página «Minería de Texto»: términos clave (TF-IDF), frases frecuentes (n-gramas), similitud entre asignaturas y búsqueda.
// El modelo de tópicos (LDA) llega con «Familias Curriculares» (fase 5).
import { agrupar, similitudAsignaturas, stopwords, topNgramas, topTerminos } from '../data/nlp.js';
import { cmp } from '../data/util.js';
import { aviso, columnas, grafico, h, info, multiselect, selector, tabla, titulo } from '../ui.js';

const local = { terminos: 20, frases: 15, programa: null, matrices: null, maxHeat: 40, grupos: 5, pestana: 'Grupos temáticos', busqueda: '', stop: null, cargando: false };
const memo = new Map();
const una = (clave, f) => { if (!memo.has(clave)) { if (memo.size > 12) memo.clear(); memo.set(clave, f()); } return memo.get(clave); };

function barras(items, { colorscale, titulo: t, h: alto = 400, etiqueta }) {
  const d = [...items].reverse();
  return grafico([{ type: 'bar', orientation: 'h', x: d.map(x => x[1]), y: d.map(x => x[0]), marker: { color: d.map(x => x[1]), colorscale }, hovertemplate: '%{y}<br>%{x:.2f}<extra></extra>' }],
    { height: alto, title: t ? { text: t } : undefined, xaxis: { title: etiqueta }, margin: { l: 160, r: 10, t: t ? 40 : 10, b: 40 }, yaxis: { automargin: true } });
}

const rango = (min, max, valor, alCambiar) => {
  const salida = h('b', {}, valor);
  const r = h('input', { type: 'range', min, max, value: valor, oninput: e => { salida.textContent = e.target.value; }, onchange: e => alCambiar(Number(e.target.value)) });
  return h('div', { class: 'campo' }, r, ' ', salida);
};

export function paginaMineria({ filas, etiqueta, seleccion, rerender }) {
  const cab = titulo('Minería de Texto y Análisis Semántico');
  if (!local.stop) {
    if (!local.cargando) { local.cargando = true; stopwords().then(s => { local.stop = s; rerender(); }); }
    return h('div', {}, ...cab, aviso('info', 'Cargando el vocabulario…'));
  }
  const stop = local.stop;
  const vista = seleccion ? filas.filter(f => f.Matriz === seleccion) : filas;
  const firma = `${vista.length}|${seleccion ?? ''}|${vista[0]?.Matriz}|${vista.at(-1)?.Matriz}`;
  const docs = vista.map(f => f.Texto_Completo);

  const terminos = una(`t|${firma}`, () => topTerminos(docs, stop));
  const frases = una(`n|${firma}`, () => topNgramas(docs, stop));

  // términos por programa (conjunto) o de la matriz elegida
  const progs = [...new Set(vista.map(f => f.Programa))].sort(cmp).filter(p => vista.filter(f => f.Programa === p).length >= 5);
  if (!progs.includes(local.programa)) local.programa = progs[0];
  const opciones = { max: 50, n: 20, ngram: [1, 2], maxDf: 0.85 };
  const deGrupo = seleccion ? una(`pm|${firma}`, () => (vista.length >= 5 ? topTerminos(docs, stop, opciones) : []))
    : una(`pp|${firma}|${local.programa}`, () => topTerminos(vista.filter(f => f.Programa === local.programa).map(f => f.Texto_Completo), stop, opciones));

  const ids = [...new Set(vista.map(f => f.Matriz))].sort((a, b) => cmp(etiqueta.get(a), etiqueta.get(b)));
  if (!local.matrices || local.matrices.some(m => !ids.includes(m)) || seleccion) local.matrices = ids;
  const filasSim = vista.filter(f => local.matrices.includes(f.Matriz));

  return h('div', {}, ...cab,
    info('<b>¿Qué es esto?</b> Aplica técnicas de procesamiento de lenguaje natural a los textos (RA, asignatura, indicadores, núcleos y proceso) para identificar los conceptos más relevantes, ' +
      'las frases repetidas y qué tan parecidas son las asignaturas entre sí.'),
    seleccion ? aviso('info', `<b>Vista de matriz:</b> ${etiqueta.get(seleccion)}. El vocabulario de referencia se calcula solo con los registros de la matriz.`) : null,
    columnas(
      h('div', {}, h('h3', {}, 'Términos clave globales (TF-IDF)'),
        h('p', { class: 'leyenda' }, 'TF-IDF mide la importancia de un término: alta frecuencia en el documento pero baja en todos los demás. Revela los conceptos más distintivos.'),
        rango(10, 30, local.terminos, v => { local.terminos = v; rerender(); }),
        barras(terminos.slice(0, local.terminos), { colorscale: 'Portland', etiqueta: 'Relevancia TF-IDF', h: Math.max(400, local.terminos * 25) })),
      h('div', {}, h('h3', {}, 'Frases frecuentes (n-gramas)'),
        h('p', { class: 'leyenda' }, 'Combinaciones de 2 o 3 palabras que aparecen juntas con frecuencia: conceptos compuestos y enfoques recurrentes.'),
        rango(5, 20, local.frases, v => { local.frases = v; rerender(); }),
        barras(frases.slice(0, local.frases), { colorscale: 'YlOrRd', etiqueta: 'Veces que aparece', h: Math.max(400, local.frases * 25) }))),
    h('hr'),
    h('h3', {}, seleccion ? 'Términos clave de la matriz' : 'Términos clave por programa'),
    h('p', { class: 'leyenda' }, 'Qué conceptos son más relevantes y distintivos en cada programa (programas con al menos 5 registros).'),
    seleccion ? null : selector('Programa:', progs, local.programa, v => { local.programa = v; rerender(); }),
    deGrupo.length ? barras(deGrupo.slice(0, 15), { colorscale: 'Teal', etiqueta: 'Relevancia TF-IDF', h: 450, titulo: `Términos más relevantes — ${seleccion ? etiqueta.get(seleccion) : local.programa}` })
      : aviso('info', 'No hay registros suficientes (mínimo 5) para calcular los términos.'),
    h('hr'),
    ...similitud(filasSim, ids, etiqueta, seleccion, stop, rerender),
    h('hr'),
    h('h3', {}, 'Buscar términos en los datos'),
    h('p', { class: 'leyenda' }, 'Escribe un concepto o frase para encontrar en qué asignaturas aparece.'),
    ...busqueda(vista, etiqueta, rerender),
    h('hr'),
    aviso('info', '<b>Tópicos del contenido (LDA de consenso):</b> se portan con «Familias Curriculares» (fase 5); mientras tanto siguen disponibles en el dashboard de Streamlit.'));
}

function busqueda(vista, etiqueta, rerender) {
  const caja = h('input', { type: 'text', value: local.busqueda, placeholder: 'Término o frase a buscar',
    onkeydown: e => { if (e.key === 'Enter') { local.busqueda = e.target.value; rerender(); } } });
  const salida = [h('div', { class: 'campo' }, caja), h('button', { type: 'button', class: 'boton secundario', onclick: () => { local.busqueda = caja.value; rerender(); } }, 'Buscar')];
  const q = local.busqueda.trim().toLowerCase();
  if (!q) return salida;
  const vistos = new Set(), res = [];
  for (const f of vista) {
    if (!f.Texto_Completo.includes(q)) continue;
    const r = { Matriz: etiqueta.get(f.Matriz) ?? f.Matriz, Asignatura: f['Nombre asignatura o modulo'], 'Tipo de Saber': f['Tipo de Saber'], Semestre: f.Semestre };
    const k = JSON.stringify(r);
    if (!vistos.has(k)) { vistos.add(k); res.push(r); }
  }
  salida.push(h('p', {}, h('b', {}, `${res.length} registros encontrados`), ` para «${local.busqueda}»`),
    tabla(res, ['Matriz', 'Asignatura', 'Tipo de Saber', 'Semestre'].map(c => ({ title: c, field: c })), { height: 360 }));
  return salida;
}

function similitud(filasSim, ids, etiqueta, seleccion, stop, rerender) {
  const cab = [h('h3', {}, 'Similitud entre asignaturas'),
    info('<b>¿Para qué sirve?</b> Detecta asignaturas con contenidos muy similares, lo que puede indicar redundancia o falta de diferenciación. Una similitud superior al 80 % merece revisión.')];
  if (!seleccion) {
    cab.push(multiselect('Matrices a comparar:', ids.map(i => etiqueta.get(i)), local.matrices.map(i => etiqueta.get(i)),
      v => { local.matrices = ids.filter(i => v.includes(etiqueta.get(i))); }),
    h('button', { type: 'button', class: 'boton secundario', onclick: rerender }, 'Actualizar similitud'));
  }
  if (!filasSim.length) return [...cab, aviso('warning', 'Selecciona al menos una matriz.')];
  const firma = `s|${filasSim.length}|${local.matrices.join(',')}`;
  const r = una(firma, () => similitudAsignaturas(filasSim, stop));
  if (!r.sim) return [...cab, aviso('warning', 'Se necesitan al menos 3 asignaturas en la selección.')];
  const n = r.n, nMax = Math.min(10, Math.max(2, n >> 1)), k = Math.min(local.grupos, nMax);
  const partes = [...cab, aviso('info', `<b>Par más similar:</b> ${r.par.asig1.trim()} ↔ ${r.par.asig2.trim()} (similitud: ${(r.par.similitud * 100).toFixed(0)}%)`),
    h('div', { class: 'pestanas' }, ...['Grupos temáticos', 'Pares más similares', 'Mapa de calor'].map(p =>
      h('button', { type: 'button', class: p === local.pestana ? 'activa' : '', onclick: () => { local.pestana = p; rerender(); } }, p)))];

  if (local.pestana === 'Grupos temáticos') {
    const grupos = una(`g|${firma}|${k}`, () => agrupar(r.sim, k)).map(g => ({ g, sub: g.map(i => r.nombres[i]).sort() })).sort((a, b) => b.g.length - a.g.length);
    partes.push(h('p', { class: 'leyenda' }, 'Las asignaturas se agrupan por similitud de contenido (enlace promedio) y los grupos se ordenan por tamaño. Cohesión alta = asignaturas muy parecidas entre sí (posible redundancia).'),
      h('div', { class: 'campo' }, h('label', {}, 'Número de grupos:'), rango(2, nMax, k, v => { local.grupos = v; rerender(); })));
    grupos.forEach(({ g, sub }, i) => {
      let c = 1;
      if (g.length > 1) { let s = 0; for (const a of g) for (const b of g) if (a !== b) s += r.sim[a][b]; c = s / (g.length * (g.length - 1)); }
      partes.push(h('details', {}, h('summary', {}, `Grupo ${i + 1} — ${sub.length} asignaturas (cohesión ${(c * 100).toFixed(0)}%)`),
        h('ul', {}, ...sub.map(s => h('li', {}, s.trim())))));
    });
  } else if (local.pestana === 'Pares más similares') {
    const pares = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pares.push({ 'Asignatura 1': r.nombres[i].trim(), 'Asignatura 2': r.nombres[j].trim(), Similitud: Math.round(r.sim[i][j] * 1e4) / 1e4 });
    pares.sort((a, b) => b.Similitud - a.Similitud);
    const colorear = c => {
      const v = c.getValue(), e = c.getElement();
      if (v >= 0.8) { e.style.background = '#FEE5F2'; e.style.color = '#EC0677'; e.style.fontWeight = 'bold'; }
      else if (v >= 0.6) { e.style.background = '#FFFBEA'; e.style.color = '#8C6000'; }
      return v;
    };
    partes.push(tabla(pares.slice(0, 40), [{ title: 'Asignatura 1', field: 'Asignatura 1', minWidth: 260 }, { title: 'Asignatura 2', field: 'Asignatura 2', minWidth: 260 },
      { title: 'Similitud', field: 'Similitud', hozAlign: 'right', formatter: colorear }], { height: false }),
    h('p', { class: 'leyenda' }, '≥ 0,80 = posible redundancia · 0,60–0,79 = revisar diferenciación'));
  } else {
    const tope = Math.min(n, local.maxHeat);
    const prom = r.nombres.map((_, i) => { let s = 0; for (let j = 0; j < n; j++) if (j !== i) s += r.sim[i][j]; return s / n; });
    const top = [...prom.keys()].sort((a, b) => prom[b] - prom[a]).slice(0, tope).sort((a, b) => a - b);
    const nombre = i => r.nombres[i].trim().slice(0, 30);
    partes.push(h('div', { class: 'campo' }, h('label', {}, 'Máx. asignaturas en el mapa:'), rango(5, Math.min(80, Math.max(5, n)), tope, v => { local.maxHeat = v; rerender(); })),
      n > tope ? h('p', { class: 'leyenda' }, `Mostrando las ${tope} asignaturas con mayor similitud promedio (de ${n}).`) : null,
      grafico([{ type: 'heatmap', z: top.map(i => top.map(j => r.sim[i][j])), x: top.map(nombre), y: top.map(nombre), colorscale: 'Blues', zmin: 0, zmax: 1,
        colorbar: { title: { text: 'Similitud' } } }],
      { height: Math.max(420, tope * 16 + 200), xaxis: { tickangle: 45, tickfont: { size: 9 } }, yaxis: { tickfont: { size: 9 }, autorange: 'reversed' }, margin: { l: 220, b: 220, t: 20, r: 20 } }));
  }
  return partes;
}
