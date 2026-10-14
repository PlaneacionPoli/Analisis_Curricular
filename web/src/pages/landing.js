// Pantalla de bienvenida y carga de matrices (equivale al hero con st.file_uploader).
import { aviso, h, icono } from '../ui.js';
import { actualizar, obtener } from '../store.js';

const TARJETAS = [
  ['Resumen Ejecutivo', 'Visión general del estado de la Matriz de RA y cumplimiento de metas institucionales.', '#0077C8', 'clipboard-data'],
  ['Tendencias Globales', 'Comparativa con estándares internacionales y temáticas emergentes en la industria.', '#1fb2de', 'graph-up-arrow'],
  ['Taxonomías', 'Niveles taxonómicos detectados en las competencias y resultados de aprendizaje.', '#7c3aed', 'diagram-3'],
  ['Minería de Texto', 'Descubrimiento de patrones y términos clave en el contenido curricular.', '#059669', 'search'],
  ['Tipo de Saber', 'Análisis de la balanza entre saber, saber hacer y saber ser en los programas.', '#d97706', 'bar-chart'],
  ['Cobertura Temática', 'Detección de redundancias o vacíos temáticos en la malla curricular institucional.', '#dc2626', 'map'],
];

export function paginaLanding(alSeleccionar) {
  const { progreso, mensaje } = obtener();
  const entrada = h('input', { type: 'file', accept: '.xlsx', multiple: true, hidden: true,
    onchange: e => { alSeleccionar(e.target.files); e.target.value = ''; } });
  const carpeta = h('input', { type: 'file', multiple: true, hidden: true, webkitdirectory: true,
    onchange: e => { alSeleccionar(e.target.files); e.target.value = ''; } });

  const zona = h('div', { class: 'zona-carga', tabindex: 0,
    ondragover: e => { e.preventDefault(); zona.classList.add('sobre'); },
    ondragleave: () => zona.classList.remove('sobre'),
    ondrop: e => { e.preventDefault(); zona.classList.remove('sobre'); alSeleccionar(e.dataTransfer.files); } },
  h('div', { class: 'icono-carga' }, icono('cloud-arrow-up')),
  h('h4', {}, 'Selecciona tus archivos'),
  h('span', {}, '200MB por archivo · XLSX · Múltiples archivos'),
  h('p', { class: 'ayuda-carga' }, 'Arrastra aquí las matrices o usa los botones.'),
  progreso
    ? h('div', { class: 'progreso' }, h('div', { class: 'barra' }, h('div', { style: { width: `${100 * (progreso.i + 1) / progreso.n}%` } })),
      h('small', {}, `Leyendo ${progreso.i + 1} de ${progreso.n}: ${progreso.nombre}`))
    : h('div', { class: 'botones-carga' },
      h('button', { type: 'button', class: 'boton primario', onclick: () => entrada.click() }, 'Seleccionar archivos'),
      h('button', { type: 'button', class: 'boton claro', onclick: () => carpeta.click() }, 'Seleccionar carpeta')));

  const estructura = h('div', { class: 'estructura-card', hidden: true, html: `
    <h5>Estructura del archivo Excel</h5>
    <ul><li><b>Hoja:</b> Paso 5 Estrategias micro</li><li><b>Encabezados:</b> fila 2</li><li><b>Formato:</b> .xlsx</li></ul>
    <table><thead><tr><th>Campo</th><th>Ejemplo</th></tr></thead><tbody>
      <tr><td>Tipo de Saber</td><td>Saber / SaberHacer / SaberSer</td></tr>
      <tr><td>Resultado de aprendizaje</td><td>Analiza los fundamentos...</td></tr>
      <tr><td>Nucleos tematicos</td><td>Derivadas, Integrales</td></tr>
      <tr><td>Semestre</td><td>1, 2, 3...</td></tr></tbody></table>` });

  return h('div', { class: 'landing' },
    h('div', { class: 'encabezado' }, h('h1', {}, 'Análisis Microcurricular Basado en Datos')),
    mensaje ? aviso(mensaje.tipo, mensaje.texto) : null,
    h('section', { class: 'hero' },
      h('div', { class: 'hero-texto' },
        h('div', { class: 'hero-barra' }),
        h('span', { class: 'hero-etiqueta' }, 'Sistema de Análisis Microcurricular'),
        h('p', {}, 'Optimice los procesos de diseño, actualización y evaluación curricular mediante el uso de analítica avanzada e Inteligencia Artificial.'),
        h('p', { class: 'hero-apoyo' }, 'Permite identificar brechas, tendencias, niveles de alineación y oportunidades de mejora en tiempo real para fortalecer la toma de decisiones académicas y la calidad educativa.'),
        h('p', { class: 'hero-apoyo' }, icono('shield-lock'), ' Las matrices se procesan en tu navegador: no se envían a ningún servidor.')),
      h('div', { class: 'hero-tarjeta' }, zona, entrada, carpeta,
        h('button', { type: 'button', class: 'boton claro ancho',
          onclick: () => { estructura.hidden = !estructura.hidden; } }, 'Estructura del archivo'),
        estructura)),
    h('div', { class: 'tarjetas' }, ...TARJETAS.map(([t, d, c, i]) =>
      h('div', { class: 'tarjeta', style: { '--c': c } },
        h('div', { class: 'tarjeta-icono' }, icono(i)), h('h3', {}, t), h('p', {}, d)))));
}
