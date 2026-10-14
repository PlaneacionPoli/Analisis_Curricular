// Página «Explorar Datos»: registros crudos con filtros por programa, tipo de saber y semestre.
import { cmp } from '../data/util.js';
import { aCsv, botonDescarga, columnas, descargar, h, multiselect, tabla, titulo } from '../ui.js';
import { obtener } from '../store.js';

const MOSTRAR = ['Programa', 'Tipo de Saber', 'Semestre', 'Nombre asignatura o modulo', 'Resultado de aprendizaje',
  'Indicadores de logro asignatura o modulo', 'Nucleos tematicos'];

// La selección sobrevive a los re-renderizados; null = todo seleccionado
const seleccion = { programa: null, tipo: null, semestre: null };

export function paginaDatos(filas, rerender) {
  const { datos } = obtener();
  const unicos = col => [...new Set(filas.map(f => f[col]))];
  const programas = unicos('Programa').filter(v => v != null).sort(cmp);
  const tipos = unicos('Tipo de Saber').filter(v => v != null);
  const semestres = unicos('Semestre').filter(v => v != null).sort((a, b) => cmp(String(a), String(b)));

  const activo = (clave, opciones) => (seleccion[clave] ?? opciones).filter(o => opciones.includes(o));
  const sp = new Set(activo('programa', programas));
  const st = new Set(activo('tipo', tipos));
  const ss = new Set(activo('semestre', semestres));
  const visibles = filas.filter(f => sp.has(f.Programa) && st.has(f['Tipo de Saber']) && ss.has(f.Semestre));

  const cambia = clave => v => { seleccion[clave] = v; rerender(); };
  const cols = MOSTRAR.filter(c => datos.columnas.includes(c));
  return h('div', {},
    ...titulo('Explorar Datos'),
    columnas(
      multiselect('Programa:', programas, [...sp], cambia('programa')),
      multiselect('Tipo de Saber:', tipos, [...st], cambia('tipo')),
      multiselect('Semestre:', semestres, [...ss], cambia('semestre'))),
    h('p', {}, h('b', {}, 'Registros filtrados:'), ` ${visibles.length.toLocaleString('es-CO')}`),
    tabla(visibles, cols.map(c => ({ title: c, field: c, headerSort: true, tooltip: true,
      width: c === 'Semestre' ? 90 : c === 'Tipo de Saber' ? 130 : 240 })),
    { height: '560px', layout: 'fitDataFill' }),
    h('p', {}, botonDescarga('Descargar datos filtrados (CSV)',
      () => descargar('datos_filtrados.csv', aCsv(visibles, datos.columnas), 'text/csv'))));
}
