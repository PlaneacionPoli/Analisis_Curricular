// Componentes de interfaz reutilizables por todas las páginas.
import Plotly from 'plotly.js-dist-min';
import { TabulatorFull as Tabulator } from 'tabulator-tables';

export const COLORES = {
  sede: { 'Bogotá': '#0F385A', 'Medellín': '#1FB2DE', Nacional: '#FBAF17' },
  modalidad: { Presencial: '#1FB2DE', Virtual: '#0F385A', 'Híbrido': '#FBAF17' },
  nivel: { Pregrado: '#1FB2DE', Posgrado: '#0F385A', 'No identificado': '#8A94A0' },
  paletaAzul: ['#0F385A', '#1565A7', '#1FB2DE', '#42F2F2', '#C8E6F5'],
  extra: ['#1FB2DE', '#FBAF17', '#EC0677', '#0F385A', '#42F2F2', '#8A94A0'],
};

/** Crea un elemento: h('div', {class:'x', onclick:fn}, hijo1, 'texto', …). */
export function h(tag, attrs = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === false || v == null) continue;
    if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') {
      // las variables CSS (--n) solo se aplican con setProperty; Object.assign las ignora
      for (const [p, x] of Object.entries(v)) (p.startsWith('--') ? e.style.setProperty(p, x) : (e.style[p] = x));
    }
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat()) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}

export const icono = nombre => h('i', { class: `bi bi-${nombre}` });

export function titulo(texto) {
  return [h('h1', { class: 'titulo' }, texto), h('hr')];
}

export function info(html) {
  return h('div', { class: 'aviso info', html });
}

export function aviso(tipo, html) {
  return h('div', { class: `aviso ${tipo}`, html });
}

export function metrica(etiqueta, valor, ayuda) {
  return h('div', { class: 'metrica', title: ayuda ?? '' },
    h('div', { class: 'metrica-etiqueta' }, etiqueta, ayuda ? h('span', { class: 'ayuda' }, '?') : null),
    h('div', { class: 'metrica-valor' }, valor));
}

/** Indicador destacado: icono, cifra grande, etiqueta y una nota de contexto. */
export function kpi({ icono: ic, etiqueta, valor, nota = '', color = '#1fb2de', ayuda = '', clase = '' }) {
  return h('div', { class: `kpi ${clase}`.trim(), title: ayuda, style: { '--c': color } },
    h('div', { class: 'kpi-icono' }, icono(ic)),
    h('div', { class: 'kpi-cuerpo' },
      h('div', { class: 'kpi-etiqueta' }, etiqueta),
      h('div', { class: 'kpi-valor' }, valor),
      nota ? h('div', { class: 'kpi-nota' }, nota) : null));
}

/** Panel con título, bajada y contenido (agrupa un gráfico o tabla con su lectura). */
export function panel({ titulo: t, bajada = '', lectura = '' }, ...contenido) {
  return h('section', { class: 'panel' },
    h('header', {}, h('h3', {}, t), bajada ? h('p', { class: 'leyenda' }, bajada) : null),
    ...contenido,
    lectura ? h('p', { class: 'lectura', html: `<i class="bi bi-lightbulb"></i> ${lectura}` }) : null);
}

/** Barra horizontal segmentada (composición 100 %) con leyenda. partes: [{etiqueta, valor, color}] */
export function barraSegmentada(partes, { formato = v => v } = {}) {
  const total = partes.reduce((s, p) => s + p.valor, 0) || 1;
  return h('div', { class: 'segmentada' },
    h('div', { class: 'seg-barra' }, ...partes.filter(p => p.valor > 0).map(p =>
      h('span', { style: { width: `${100 * p.valor / total}%`, background: p.color }, title: `${p.etiqueta}: ${formato(p.valor)} (${(100 * p.valor / total).toFixed(0)} %)` }))),
    h('ul', { class: 'seg-leyenda' }, ...partes.map(p =>
      h('li', {}, h('i', { style: { background: p.color } }), h('b', {}, formato(p.valor)), ` ${p.etiqueta}`, h('small', {}, ` ${(100 * p.valor / total).toFixed(0)} %`)))));
}

/** Etiqueta breve (dato de contexto). */
export const chip = (texto, ic = null) => h('span', { class: 'chip' }, ic ? icono(ic) : null, texto);

export function columnas(...hijos) {
  return h('div', { class: 'columnas', style: { '--n': hijos.length } }, ...hijos);
}

/** Gráfico Plotly con el diseño base del dashboard. */
export function grafico(trazas, layout = {}, config = {}) {
  const cont = h('div', { class: 'grafico' });
  const base = {
    font: { family: 'Inter, "Segoe UI", system-ui, sans-serif', color: '#0F385A', size: 12 },
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { l: 50, r: 20, t: 30, b: 50 }, autosize: true,
    colorway: ['#1FB2DE', '#0F385A', '#FBAF17', '#EC0677', '#42F2F2', '#8A94A0'],
    hoverlabel: { bgcolor: '#0F385A', font: { color: '#fff', size: 12 }, bordercolor: '#0F385A' },
    xaxis: { gridcolor: '#EEF3F8', zerolinecolor: '#DBE7F0', linecolor: '#DBE7F0' },
    yaxis: { gridcolor: '#EEF3F8', zerolinecolor: '#DBE7F0', linecolor: '#DBE7F0' },
  };
  // los ejes que pasa cada gráfico se combinan con el estilo base (no lo reemplazan)
  const unir = (a, b) => ({ ...a, ...b });
  const final = { ...base, ...layout, xaxis: unir(base.xaxis, layout.xaxis), yaxis: unir(base.yaxis, layout.yaxis) };
  queueMicrotask(() => Plotly.newPlot(cont, trazas, final,
    { responsive: true, displaylogo: false, displayModeBar: 'hover', modeBarButtonsToRemove: ['lasso2d', 'select2d'], ...config }));
  return cont;
}

/** Parte un texto largo en varias líneas (<br>) para las etiquetas de los ejes: se leen completas en vez de recortarse con «…». */
export function envolver(texto, ancho = 34) {
  const lineas = [];
  let actual = '';
  for (const palabra of String(texto).split(/\s+/)) {
    if (actual && `${actual} ${palabra}`.length > ancho) { lineas.push(actual); actual = palabra; } else actual = actual ? `${actual} ${palabra}` : palabra;
  }
  if (actual) lineas.push(actual);
  return lineas.join('<br>');
}

/** Tabla Tabulator. */
// Columnas que identifican un programa o una matriz: ancho fijo y el nombre se parte en varias líneas en vez de estirar la tabla.
const COLUMNAS_ETIQUETA = new Set(['Matriz', 'Programa', 'Nombre del programa', 'Etiqueta', 'Matriz / programa']);

function ajustarColumnas(cols) {
  return cols.map(c => {
    if (c.columns) return { ...c, columns: ajustarColumnas(c.columns) };
    if (COLUMNAS_ETIQUETA.has(c.field)) {
      const { minWidth, ...resto } = c; void minWidth;
      return { ...resto, width: c.width ?? 240, minWidth: 180, widthGrow: 0, cssClass: [c.cssClass, 'celda-etiqueta'].filter(Boolean).join(' ') };
    }
    if (c.width) return { ...c, cssClass: [c.cssClass, 'celda-etiqueta'].filter(Boolean).join(' ') }; // columnas de ancho fijo: el texto largo se parte
    return c;
  });
}

export function tabla(datos, columnasDef, opciones = {}) {
  const cont = h('div', { class: 'tabla' });
  queueMicrotask(() => new Tabulator(cont, {
    // sin rutas anidadas: varias columnas llevan punto en el nombre («Cr. Total», «B.Institucional») y Tabulator las leería como objetos
    data: datos, columns: ajustarColumnas(columnasDef), layout: 'fitDataStretch', placeholder: 'Sin registros', nestedFieldSeparator: false, ...opciones,
  }));
  return cont;
}

/** Selector con casillas (equivale a st.multiselect). */
export function multiselect(etiqueta, opciones, seleccion, alCambiar) {
  const sel = new Set(seleccion);
  const resumen = h('summary', {}, `${sel.size} de ${opciones.length} seleccionados`);
  const lista = h('div', { class: 'ms-lista' });
  const actualizar = () => { resumen.textContent = `${sel.size} de ${opciones.length} seleccionados`; alCambiar([...sel]); };
  const casillas = opciones.map(o => {
    const c = h('input', { type: 'checkbox', checked: sel.has(o) });
    c.addEventListener('change', () => { c.checked ? sel.add(o) : sel.delete(o); actualizar(); });
    return { c, o, fila: h('label', { class: 'ms-op' }, c, ' ', String(o)) };
  });
  const todos = (v) => () => { casillas.forEach(({ c, o }) => { c.checked = v; v ? sel.add(o) : sel.delete(o); }); actualizar(); };
  lista.append(h('div', { class: 'ms-acciones' },
    h('button', { type: 'button', class: 'enlace', onclick: todos(true) }, 'Todos'),
    h('button', { type: 'button', class: 'enlace', onclick: todos(false) }, 'Ninguno')),
    ...casillas.map(x => x.fila));
  return h('div', { class: 'campo' }, h('label', {}, etiqueta), h('details', { class: 'ms' }, resumen, lista));
}

export function selector(etiqueta, opciones, valor, alCambiar, clase = '') {
  const s = h('select', { onchange: e => alCambiar(e.target.value) },
    ...opciones.map(o => h('option', { value: o, selected: o === valor }, o)));
  return h('div', { class: `campo ${clase}` }, h('label', {}, etiqueta), s);
}

/** Descarga de un texto como archivo. */
export function descargar(nombre, contenido, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([contenido], { type: mime.startsWith('text/') ? `${mime};charset=utf-8` : mime }));
  const a = h('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** CSV con BOM UTF-8 (to_csv(encoding='utf-8-sig')). */
export function aCsv(filas, cols) {
  const esc = v => {
    if (v == null) return '';
    const t = typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v);
    return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return '﻿' + [cols.join(','), ...filas.map(f => cols.map(c => esc(f[c])).join(','))].join('\n');
}

export function botonDescarga(texto, alClic) {
  return h('button', { type: 'button', class: 'boton secundario', onclick: alClic }, icono('download'), ' ', texto);
}
