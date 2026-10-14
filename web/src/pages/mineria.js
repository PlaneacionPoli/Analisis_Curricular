// Página «Minería de Texto»: usa el texto de las matrices para responder preguntas curriculares: ¿dónde puede haber redundancia entre asignaturas?,
// y ¿dónde se trabaja un tema concreto?
import { similitudAsignaturas, stopwords } from '../data/nlp.js';
import { aCsv, aviso, botonDescarga, columnas, descargar, h, info, metrica, tabla, titulo } from '../ui.js';

const PESTANAS = ['Redundancias a revisar', 'Dónde se trabaja un tema'];
const local = { umbral: 95, pestana: PESTANAS[0], busqueda: '', stop: null, cargando: false };
const memo = new Map();
const una = (clave, f) => { if (!memo.has(clave)) { if (memo.size > 12) memo.clear(); memo.set(clave, f()); } return memo.get(clave); };

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

  const cuerpo = {
    'Redundancias a revisar': () => redundancias(vista, firma, etiqueta, stop, rerender),
    'Dónde se trabaja un tema': () => busqueda(vista, etiqueta, rerender),
  }[local.pestana]();

  return h('div', {}, ...cab,
    info('Lee el texto de las matrices (RA, indicadores, núcleos y proceso) para apoyar dos decisiones: <b>qué asignaturas de una matriz tienen contenido muy parecido</b> y conviene revisar, ' +
      'y <b>dónde se trabaja un tema</b> concreto. Los resultados orientan la revisión; no sustituyen el criterio del comité.'),
    seleccion ? aviso('info', `<b>Vista de matriz:</b> ${etiqueta.get(seleccion)}. El análisis usa solo los registros de esta matriz.`) : null,
    h('div', { class: 'pestanas' }, ...PESTANAS.map(p => h('button', { type: 'button', class: p === local.pestana ? 'activa' : '', onclick: () => { local.pestana = p; rerender(); } }, p))),
    ...cuerpo);
}

/** Nombre sin su sufijo de secuencia («Cálculo I», «Cálculo II» → «Cálculo»), para separar secuencias de redundancias. */
const baseNombre = n => String(n).trim().replace(/\s+(?:[IVX]{1,4}|\d{1,2}|[A-Z])$/, '').trim().toLowerCase();

function colorSimilitud(c) {
  const v = c.getValue(), e = c.getElement();
  if (v >= 90) { e.style.background = '#FEE5F2'; e.style.color = '#EC0677'; e.style.fontWeight = 'bold'; }
  else if (v >= 80) { e.style.background = '#FFFBEA'; e.style.color = '#8C6000'; }
  return v;
}

function redundancias(vista, firma, etiqueta, stop, rerender) {
  const umbral = local.umbral / 100;
  const pares = una(`red|${firma}`, () => {
    const out = [];
    for (const id of [...new Set(vista.map(f => f.Matriz))]) {
      const fm = vista.filter(f => f.Matriz === id);
      const r = similitudAsignaturas(fm, stop);
      if (!r.sim) continue;
      const sem = new Map();
      for (const f of fm) {
        const a = f['Nombre asignatura o modulo'];
        if (!sem.has(a)) sem.set(a, new Set());
        if (f.Semestre != null && f.Semestre !== '') sem.get(a).add(Number(f.Semestre));
      }
      const semDe = a => [...(sem.get(a) ?? [])].sort((x, y) => x - y).join(', ') || '—';
      for (let i = 0; i < r.n; i++) {
        for (let j = i + 1; j < r.n; j++) {
          if (r.sim[i][j] < 0.6) continue;
          out.push({ id, a1: r.nombres[i].trim(), s1: semDe(r.nombres[i]), a2: r.nombres[j].trim(), s2: semDe(r.nombres[j]), sim: r.sim[i][j],
            secuencia: baseNombre(r.nombres[i]) === baseNombre(r.nombres[j]) });
        }
      }
    }
    return out;
  });
  const revisar = pares.filter(p => !p.secuencia && p.sim >= umbral).sort((a, b) => b.sim - a.sim);
  const secuencias = pares.filter(p => p.secuencia && p.sim >= umbral).length;
  const matrices = new Set(revisar.map(p => p.id));
  const nMatrices = new Set(vista.map(f => f.Matriz)).size;
  const porMatriz = [...matrices].map(id => [id, revisar.filter(p => p.id === id).length]).sort((a, b) => b[1] - a[1]);
  const filasTabla = revisar.map(p => ({ Matriz: etiqueta.get(p.id) ?? p.id, 'Asignatura 1': p.a1, 'Sem. 1': p.s1, 'Asignatura 2': p.a2, 'Sem. 2': p.s2, 'Similitud (%)': Math.round(p.sim * 100) }));

  return [
    h('h3', {}, 'Asignaturas con contenido muy parecido dentro de una misma matriz'),
    h('p', { class: 'leyenda' }, 'Se compara el texto de cada asignatura (RA, indicadores, núcleos y proceso) con el de las demás de su matriz. Una similitud alta puede indicar solapamiento de contenidos ' +
      'o falta de diferenciación; conviene revisarlo con el responsable del programa. Las secuencias con el mismo nombre (por ejemplo «Cálculo I» y «Cálculo II») no se cuentan.'),
    h('div', { class: 'campo' }, h('label', {}, 'Similitud mínima (%):'), rango(80, 100, local.umbral, v => { local.umbral = v; rerender(); })),
    columnas(metrica('Pares por revisar', revisar.length, `similitud de ${local.umbral} % o más`),
      metrica('Matrices con pares', `${matrices.size} de ${nMatrices}`), metrica('Secuencias excluidas', secuencias, 'mismo nombre base')),
    revisar.length ? h('div', {},
      porMatriz.length > 1 ? h('p', { class: 'leyenda' }, `Matrices con más pares: ${porMatriz.slice(0, 3).map(([id, n]) => `${etiqueta.get(id) ?? id} (${n})`).join('; ')}.`) : null,
      tabla(filasTabla, [{ title: 'Matriz', field: 'Matriz' }, { title: 'Asignatura 1', field: 'Asignatura 1', width: 230 }, { title: 'Sem.', field: 'Sem. 1', width: 70, hozAlign: 'center' },
        { title: 'Asignatura 2', field: 'Asignatura 2', width: 230 }, { title: 'Sem.', field: 'Sem. 2', width: 70, hozAlign: 'center' },
        { title: 'Similitud (%)', field: 'Similitud (%)', hozAlign: 'right', formatter: colorSimilitud }],
      { height: Math.min(520, 52 * Math.min(filasTabla.length, 10) + 60) }),
      botonDescarga('Descargar listado (CSV)', () => descargar('asignaturas_a_revisar.csv', aCsv(filasTabla, Object.keys(filasTabla[0])), 'text/csv')))
      : aviso('success', `No hay asignaturas con una similitud de ${local.umbral} % o más dentro de una misma matriz.`),
  ];
}

function busqueda(vista, etiqueta, rerender) {
  const caja = h('input', { type: 'text', value: local.busqueda, placeholder: 'Por ejemplo: inteligencia artificial, sostenibilidad, ética',
    onkeydown: e => { if (e.key === 'Enter') { local.busqueda = e.target.value; rerender(); } } });
  const salida = [h('h3', {}, 'Dónde se trabaja un tema'),
    h('p', { class: 'leyenda' }, 'Escribe un concepto o una frase para ver en qué matrices y asignaturas aparece, y en qué semestre.'),
    h('div', { class: 'campo' }, caja), h('button', { type: 'button', class: 'boton secundario', onclick: () => { local.busqueda = caja.value; rerender(); } }, 'Buscar')];
  const q = local.busqueda.trim().toLowerCase();
  if (!q) return salida;
  const vistos = new Set(), res = [];
  for (const f of vista) {
    if (!f.Texto_Completo.includes(q)) continue;
    const r = { Matriz: etiqueta.get(f.Matriz) ?? f.Matriz, Asignatura: f['Nombre asignatura o modulo'], 'Tipo de Saber': f['Tipo de Saber'], Semestre: f.Semestre };
    const k = JSON.stringify(r);
    if (!vistos.has(k)) { vistos.add(k); res.push(r); }
  }
  if (!res.length) return [...salida, aviso('info', `No se encontró «${local.busqueda}» en los textos de las matrices de la vista.`)];
  const matrices = new Set(res.map(r => r.Matriz)).size, asig = new Set(res.map(r => r.Asignatura)).size;
  const total = new Set(vista.map(f => f.Matriz)).size;
  salida.push(columnas(metrica('Matrices', `${matrices} de ${total}`), metrica('Asignaturas', asig), metrica('Registros', res.length)),
    tabla(res, ['Matriz', 'Asignatura', 'Tipo de Saber', 'Semestre'].map(c => ({ title: c, field: c })), { height: 360 }));
  return salida;
}
