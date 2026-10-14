// Componentes de interfaz reutilizables por todas las páginas.
import Plotly from 'plotly.js-dist-min';
import { TabulatorFull as Tabulator } from 'tabulator-tables';

export const COLORES = {
  sede: { 'Bogotá': '#0F83FF', 'Medellín': '#1565C0', Nacional: '#0FFF8B' },
  modalidad: { Presencial: '#0F83FF', Virtual: '#748BFC', 'Híbrido': '#0FFF8B' },
  nivel: { Pregrado: '#0F83FF', Posgrado: '#0FFF8B', 'No identificado': '#8c8c8c' },
  paletaAzul: ['#092196', '#1A2663', '#748BFC', '#A8B7FF', '#DBE1FF'],
  extra: ['#0F83FF', '#FF8B0F', '#FF0F83', '#0FBFFF', '#748BFC', '#0FFF8B'],
};

/** Crea un elemento: h('div', {class:'x', onclick:fn}, hijo1, 'texto', …). */
export function h(tag, attrs = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === false || v == null) continue;
    if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
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
  };
  queueMicrotask(() => Plotly.newPlot(cont, trazas, { ...base, ...layout },
    { responsive: true, displaylogo: false, ...config }));
  return cont;
}

/** Tabla Tabulator. */
export function tabla(datos, columnasDef, opciones = {}) {
  const cont = h('div', { class: 'tabla' });
  queueMicrotask(() => new Tabulator(cont, {
    data: datos, columns: columnasDef, layout: 'fitDataStretch', placeholder: 'Sin registros', ...opciones,
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
  const url = URL.createObjectURL(new Blob([contenido], { type: `${mime};charset=utf-8` }));
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
