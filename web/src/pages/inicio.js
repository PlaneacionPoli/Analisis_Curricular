// Página «Inicio»: métricas generales, gráficos de composición y resumen de créditos por programa.
import { resumenPorPrograma } from '../data/consolidar.js';
import { cmp, contar } from '../data/util.js';
import { obtener } from '../store.js';
import { aviso, columnas, COLORES, grafico, h, info, metrica, tabla, titulo } from '../ui.js';

const ORDEN_MODALIDAD = ['Presencial', 'Virtual', 'Híbrido'];
const COLUMNAS_RESUMEN = ['Programa', 'Modalidad', 'Sede', 'Nivel', 'Asignaturas', 'Asig. Oficial', 'Semestres',
  'Cr. Total', 'B. Institucional', 'B. Disciplinar', 'B. Electivo', 'Suma bloques', 'Cr. Fundamentacion',
  'Cr. Profundizacion', 'Suma componentes', 'Diferencia'];
const TEXTO = ['Programa', 'Modalidad', 'Sede', 'Nivel'];

function graficoModalidad(programas) {
  const conteo = contar(programas, p => `${p.Modalidad}\u0000${p.Sede}`);
  const sedes = [...new Set(programas.map(p => p.Sede))].sort(cmp);
  const mods = ORDEN_MODALIDAD.filter(m => programas.some(p => p.Modalidad === m))
    .concat([...new Set(programas.map(p => p.Modalidad))].filter(m => !ORDEN_MODALIDAD.includes(m)));
  const trazas = sedes.map((s, i) => ({
    type: 'bar', name: s, x: mods, y: mods.map(m => conteo.get(`${m}\u0000${s}`) ?? 0),
    text: mods.map(m => conteo.get(`${m}\u0000${s}`) ?? ''), textposition: 'inside', insidetextanchor: 'middle',
    textfont: { size: 11, color: 'white' }, textangle: 0,
    marker: { color: COLORES.sede[s] ?? COLORES.extra[i % COLORES.extra.length] },
  }));
  const totales = mods.map(m => programas.filter(p => p.Modalidad === m).length);
  const max = Math.max(...totales, 1);
  return grafico(trazas, {
    barmode: 'stack', height: 320, showlegend: true, legend: { title: { text: 'Sede' } },
    xaxis: { title: 'Modalidad' }, yaxis: { title: 'N° de programas' },
    annotations: mods.map((m, i) => ({ x: m, y: totales[i] + max * 0.1, text: `<b>${totales[i]}</b>`,
      showarrow: false, font: { size: 14, color: '#0F83FF' } })),
  });
}

function graficoNivel(programas) {
  const conteo = [...contar(programas, p => p.Nivel)].sort((a, b) => b[1] - a[1]);
  const max = Math.max(...conteo.map(c => c[1]), 1);
  return grafico([{
    type: 'bar', x: conteo.map(c => c[0]), y: conteo.map(c => c[1]), text: conteo.map(c => c[1]),
    textposition: 'outside', marker: { color: conteo.map(c => COLORES.nivel[c[0]] ?? '#8c8c8c') },
  }], { height: 320, showlegend: false, yaxis: { title: 'N° de programas', range: [0, max * 1.3] } });
}

function graficoTipoSaber(filas) {
  const conteo = [...contar(filas, f => f['Tipo de Saber'])].sort((a, b) => b[1] - a[1]);
  return grafico([{
    type: 'pie', labels: conteo.map(c => c[0]), values: conteo.map(c => c[1]),
    marker: { colors: COLORES.paletaAzul }, textinfo: 'percent', sort: false,
  }], { height: 320, margin: { l: 10, r: 10, t: 10, b: 10 } });
}

function seccionResumen(filas, cols, totales) {
  const resumen = resumenPorPrograma(filas, cols, totales);
  const presentes = COLUMNAS_RESUMEN.filter(c => resumen.some(r => c in r));
  const defCol = c => {
    const base = { title: c, field: c, headerSort: true };
    if (c === 'Programa') return { ...base, frozen: true, minWidth: 220 };
    if (TEXTO.includes(c)) return base;
    const col = { ...base, hozAlign: 'right', formatter: cell => cell.getValue() ?? 0 };
    if (c === 'Diferencia') {
      col.formatter = cell => {
        const v = cell.getValue() ?? 0;
        const el = cell.getElement();
        el.style.background = v === 0 ? '#d4edda' : '#f8d7da';
        el.style.color = v === 0 ? '#155724' : '#721c24';
        return v;
      };
    }
    return col;
  };
  const datos = resumen.map(r => Object.fromEntries(presentes.map(c => [c, TEXTO.includes(c) ? r[c] : (r[c] ?? 0)])));
  const conDif = resumen.filter(r => r.Diferencia !== 0).sort((a, b) => Math.abs(b.Diferencia) - Math.abs(a.Diferencia));
  return [
    h('h3', {}, 'Resumen por Programa'),
    h('p', { class: 'leyenda' }, 'Los créditos oficiales se leen directamente desde las filas de totales declaradas al final de ' +
      "cada Excel ('Total créditos programa', 'Total créditos bloque...'). La columna ", h('b', {}, 'Diferencia'),
      ' compara el total oficial con la suma de los tres bloques.'),
    tabla(datos, presentes.map(defCol), { pagination: true, paginationSize: 10, height: false }),
    conDif.length ? aviso('warning', `<b>${conDif.length} programa(s) con diferencias que deben validarse:</b>`) : null,
    ...conDif.map(r => h('p', { class: 'leyenda' }, `• ${r.Programa} (${r.Modalidad} - ${r.Sede}): Diferencia = ${r.Diferencia}`)),
    h('p', { class: 'leyenda', html: '<b>Pregrado</b> → columnas B. Institucional / Disciplinar / Electivo. ' +
      '<b>Posgrado</b> → columnas Cr. Fundamentacion / Profundizacion. <b>Diferencia = 0</b> coincide | <b>≠ 0</b> revisar el Excel.' }),
  ];
}

export function paginaInicio(filas) {
  const { datos } = obtener();
  const vistos = new Set();
  const programas = [];
  for (const f of filas) {
    const k = `${f.Programa}\u0000${f.Modalidad}\u0000${f.Sede}\u0000${f.Nivel}`;
    if (!vistos.has(k)) { vistos.add(k); programas.push({ Programa: f.Programa, Modalidad: f.Modalidad, Sede: f.Sede, Nivel: f.Nivel }); }
  }
  const nMod = m => programas.filter(p => p.Modalidad === m).length;
  const nNiv = n => programas.filter(p => p.Nivel === n).length;

  return h('div', {},
    ...titulo('Análisis Temático Microcurricular'),
    info('<b>Bienvenido/a.</b> Este dashboard analiza los microcurrículos de los programas académicos en tres dimensiones ' +
      'principales: <b>cobertura temática</b> (qué temas se trabajan y con qué profundidad), <b>tendencias globales</b> ' +
      '(alineación con retos del mundo actual) y <b>análisis de texto</b> (conceptos clave, similitudes y redundancias). ' +
      'Navega por las secciones del menú lateral para explorar cada dimensión.'),
    columnas(
      metrica('Programas', new Set(filas.map(f => f.Programa)).size, 'Programas distintos por nombre. Un programa ofrecido en varias sedes cuenta una vez.'),
      metrica('Matrices (programa-sede)', programas.length, 'Unidades de análisis: cada combinación Programa + Modalidad + Sede tiene su propia matriz.'),
      metrica('Presenciales', nMod('Presencial'), 'Matrices en modalidad presencial.'),
      metrica('Virtuales', nMod('Virtual'), 'Matrices en modalidad virtual.'),
      metrica('Híbridos', nMod('Híbrido'), 'Matrices en modalidad híbrida.')),
    columnas(
      metrica('Pregrado', nNiv('Pregrado'), 'Matrices de nivel Pregrado.'),
      metrica('Posgrado', nNiv('Posgrado'), 'Matrices de nivel Posgrado.')),
    h('hr'),
    columnas(
      h('div', {}, h('h3', {}, 'Programas por modalidad'),
        h('p', { class: 'leyenda' }, 'Cantidad de programas distintos por modalidad y sede. Cada programa es una combinación única de Programa + Modalidad + Sede.'),
        graficoModalidad(programas)),
      h('div', {}, h('h3', {}, 'Programas por Nivel'),
        h('p', { class: 'leyenda' }, 'Distribución de programas por nivel académico.'),
        graficoNivel(programas)),
      h('div', {}, h('h3', {}, 'Distribución Tipo de Saber (todos los programas)'),
        h('p', { class: 'leyenda', html: '<b>Saber</b> = conocimiento teórico/conceptual. <b>SaberHacer</b> = habilidades prácticas y ' +
          'procedimentales. <b>SaberSer</b> = actitudes, valores y dimensión ética. Un currículo equilibrado debería contemplar los tres tipos.' }),
        graficoTipoSaber(filas))),
    h('hr'),
    ...seccionResumen(filas, datos.columnas, datos.totales));
}
