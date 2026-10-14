// Página «Inicio»: panorama del conjunto cargado (o ficha de una matriz) con indicadores, composición y créditos por programa.
// Conjunto = lo que describe el artículo; matriz = su ficha frente a la mediana de todas las matrices cargadas.
import { resumenPorPrograma } from '../data/consolidar.js';
import { mediana } from '../data/estadistica.js';
import { cmp, contar } from '../data/util.js';
import { actualizar, obtener } from '../store.js';
import { aviso, barraSegmentada, chip, columnas, COLORES, grafico, h, icono, kpi, panel, tabla } from '../ui.js';

const ORDEN_MODALIDAD = ['Presencial', 'Virtual', 'Híbrido'];
const COLOR_MOD = { Presencial: '#0F83FF', Virtual: '#0FD98B', 'Híbrido': '#FBAF17' };
const COLOR_NIVEL = { Pregrado: '#0F385A', Posgrado: '#1FB2DE', 'No identificado': '#8A94A0' };
const COLOR_SABER = { Saber: '#092196', SaberHacer: '#748BFC', SaberSer: '#A8B7FF' };
const TIPOS = ['Saber', 'SaberHacer', 'SaberSer'];
const COLUMNAS_RESUMEN = ['Programa', 'Modalidad', 'Sede', 'Nivel', 'Asignaturas', 'Asig. Oficial', 'Semestres',
  'Cr. Total', 'B. Institucional', 'B. Disciplinar', 'B. Electivo', 'Suma bloques', 'Cr. Fundamentacion',
  'Cr. Profundizacion', 'Suma componentes', 'Diferencia'];
const TEXTO = ['Programa', 'Modalidad', 'Sede', 'Nivel'];
const COL_ASIG = 'Nombre asignatura o modulo';
const miles = n => n.toLocaleString('es-CO');

/** Matrices (programa-sede) distintas presentes en las filas. */
function unidades(filas) {
  const vistos = new Map();
  for (const f of filas) if (!vistos.has(f.Matriz)) vistos.set(f.Matriz, { Matriz: f.Matriz, Programa: f.Programa, Modalidad: f.Modalidad, Sede: f.Sede, Nivel: f.Nivel });
  return [...vistos.values()];
}

/** % de cada tipo de saber por matriz. */
function sabersPorMatriz(filas) {
  const m = new Map();
  for (const f of filas) {
    if (!TIPOS.includes(f['Tipo de Saber'])) continue;
    if (!m.has(f.Matriz)) m.set(f.Matriz, { Saber: 0, SaberHacer: 0, SaberSer: 0, n: 0 });
    const o = m.get(f.Matriz); o[f['Tipo de Saber']]++; o.n++;
  }
  for (const o of m.values()) for (const t of TIPOS) o[`${t}%`] = 100 * o[t] / o.n;
  return m;
}

function graficoModalidad(programas) {
  const conteo = contar(programas, p => `${p.Modalidad}\u0000${p.Sede}`);
  const sedes = [...new Set(programas.map(p => p.Sede))].sort(cmp);
  const mods = ORDEN_MODALIDAD.filter(m => programas.some(p => p.Modalidad === m))
    .concat([...new Set(programas.map(p => p.Modalidad))].filter(m => !ORDEN_MODALIDAD.includes(m)));
  const trazas = sedes.map((s, i) => ({
    type: 'bar', name: s, x: mods, y: mods.map(m => conteo.get(`${m}\u0000${s}`) ?? 0),
    text: mods.map(m => conteo.get(`${m}\u0000${s}`) || ''), textposition: 'inside', insidetextanchor: 'middle',
    textfont: { size: 12, color: 'white' }, hovertemplate: '%{x} · ' + s + ': %{y} matrices<extra></extra>',
    marker: { color: COLORES.sede[s] ?? COLORES.extra[i % COLORES.extra.length], line: { color: '#fff', width: 1.5 } },
  }));
  const totales = mods.map(m => programas.filter(p => p.Modalidad === m).length);
  const max = Math.max(...totales, 1);
  return grafico(trazas, {
    barmode: 'stack', height: 340, showlegend: true, legend: { orientation: 'h', y: -0.18, title: { text: '' } },
    xaxis: { title: '' }, yaxis: { title: 'Matrices', range: [0, max * 1.18] }, bargap: 0.35, margin: { l: 50, r: 10, t: 20, b: 60 },
    annotations: mods.map((m, i) => ({ x: m, y: totales[i], yshift: 12, text: `<b>${totales[i]}</b>`, showarrow: false, font: { size: 14, color: '#0F385A' } })),
  });
}

function donaSaber(filas) {
  const c = TIPOS.map(t => filas.filter(f => f['Tipo de Saber'] === t).length);
  const total = c.reduce((a, b) => a + b, 0);
  return grafico([{ type: 'pie', labels: TIPOS, values: c, hole: 0.62, sort: false, marker: { colors: TIPOS.map(t => COLOR_SABER[t]), line: { color: '#fff', width: 2 } },
    textinfo: 'percent', textfont: { color: '#fff', size: 13 }, hovertemplate: '%{label}: %{value} registros (%{percent})<extra></extra>' }],
  { height: 300, showlegend: true, legend: { orientation: 'h', y: -0.08 }, margin: { l: 10, r: 10, t: 10, b: 30 },
    annotations: [{ text: `<b>${miles(total)}</b><br><span style="font-size:11px;color:#6c7a93">registros</span>`, showarrow: false, font: { size: 20, color: '#0F385A' }, x: 0.5, y: 0.5 }] });
}

/** Créditos y diferencias por programa; cuando el Excel no trae totales oficiales se muestra «—» en vez de 0. */
function tablaResumen(filas, cols, totales) {
  const resumen = resumenPorPrograma(filas, cols, totales);
  const presentes = COLUMNAS_RESUMEN.filter(c => resumen.some(r => c in r));
  const sinOficial = resumen.filter(r => !(r['Cr. Total'] > 0) && !(r['Asig. Oficial'] > 0));
  const OFICIALES = ['Asig. Oficial', 'Cr. Total', 'B. Institucional', 'B. Disciplinar', 'B. Electivo', 'Suma bloques', 'Cr. Fundamentacion', 'Cr. Profundizacion', 'Suma componentes'];
  const defCol = c => {
    const base = { title: c, field: c, headerSort: true };
    if (c === 'Programa') return { ...base, frozen: true, minWidth: 250, formatter: cell => `<span class="celda-programa">${cell.getValue()}</span>` };
    if (c === 'Modalidad') return { ...base, formatter: cell => { const v = cell.getValue(); return `<span class="pildora ${{ Presencial: 'azul', Virtual: 'verde', 'Híbrido': 'ambar' }[v] ?? 'gris'}">${v}</span>`; } };
    if (c === 'Nivel') return { ...base, formatter: cell => { const v = cell.getValue(); return `<span class="pildora ${v === 'Posgrado' ? 'azul' : 'oscuro'}">${v}</span>`; } };
    if (TEXTO.includes(c)) return base;
    const col = { ...base, hozAlign: 'right' };
    col.formatter = cell => {
      const f = cell.getRow().getData(), v = cell.getValue() ?? 0;
      const vacia = !(f['Cr. Total'] > 0) && !(f['Asig. Oficial'] > 0);
      if (c === 'Diferencia') {
        if (vacia) return '<span class="pildora gris">sin dato</span>';
        return v === 0 ? '<span class="pildora verde">✓ coincide</span>' : `<span class="pildora rojo">${v > 0 ? '+' : ''}${v}</span>`;
      }
      if (vacia && OFICIALES.includes(c)) { cell.getElement().style.color = '#b8c2cc'; return '—'; }
      if (c === 'Cr. Total' || c === 'Asignaturas') cell.getElement().style.fontWeight = '700';
      if (v === 0 && OFICIALES.includes(c)) { cell.getElement().style.color = '#b8c2cc'; return '·'; }
      return v;
    };
    return col;
  };
  const datos = resumen.map(r => Object.fromEntries(presentes.map(c => [c, TEXTO.includes(c) ? r[c] : (r[c] ?? 0)])));
  const conDif = resumen.filter(r => (r['Cr. Total'] > 0 || r['Asig. Oficial'] > 0) && r.Diferencia !== 0).sort((a, b) => Math.abs(b.Diferencia) - Math.abs(a.Diferencia));
  return panel({ titulo: 'Créditos por programa', bajada: 'Los créditos oficiales se leen de las filas de totales al final de cada Excel. «Diferencia» compara el total oficial con la suma de los bloques: 0 coincide; otro valor pide revisar el Excel.' },
    sinOficial.length ? aviso('warning', `<b>${sinOficial.length} de ${resumen.length} matrices no traen créditos oficiales</b> en el Excel (filas «Total créditos…»): se muestran sin dato y no se comparan.`) : null,
    tabla(datos, presentes.map(defCol), { pagination: true, paginationSize: 10, height: false, nestedFieldSeparator: false }),
    conDif.length ? aviso('warning', `<b>${conDif.length} programa(s) con diferencias que deben validarse:</b> ` + conDif.slice(0, 6).map(r => `${r.Programa} (${r.Modalidad} · ${r.Sede}): ${r.Diferencia}`).join('; ') + (conDif.length > 6 ? '…' : '')) : null,
    h('p', { class: 'leyenda', html: '<b>Pregrado</b> → B. Institucional / Disciplinar / Electivo. <b>Posgrado</b> → Cr. Fundamentación / Profundización.' }));
}

function hero({ etiqueta, titulo, lead, chips }) {
  return h('section', { class: 'hero-inicio' },
    h('div', { class: 'hero-inicio-texto' },
      h('span', { class: 'hero-etiqueta' }, etiqueta), h('h1', {}, titulo), h('p', {}, lead),
      h('div', { class: 'chips' }, ...chips)));
}

function vistaConjunto(filas, datos) {
  const programas = unidades(filas);
  const nMod = m => programas.filter(p => p.Modalidad === m).length;
  const nNiv = n => programas.filter(p => p.Nivel === n).length;
  const asignaturas = new Set(filas.map(f => f[COL_ASIG]).filter(x => x != null)).size;
  const mods = ORDEN_MODALIDAD.concat([...new Set(programas.map(p => p.Modalidad))].filter(m => !ORDEN_MODALIDAD.includes(m))).filter(m => nMod(m) > 0);
  const niveles = [...new Set(programas.map(p => p.Nivel))].sort(cmp);
  const porMatriz = sabersPorMatriz(filas);
  const rango = t => { const v = [...porMatriz.values()].map(o => o[`${t}%`]); return v.length ? [Math.min(...v), Math.max(...v)] : [0, 0]; };
  const dif = Math.max(...TIPOS.map(t => rango(t)[1] - rango(t)[0]));
  const totalSaber = TIPOS.map(t => ({ etiqueta: t, valor: filas.filter(f => f['Tipo de Saber'] === t).length, color: COLOR_SABER[t] }));
  const lectura = porMatriz.size >= 3 && dif <= 10
    ? `La proporción es casi igual en las ${porMatriz.size} matrices (diferencia máxima ${dif.toFixed(0)} puntos): la fija la plantilla, no una decisión de diseño. No debe leerse como equilibrio ni como déficit.`
    : porMatriz.size >= 3 ? `SaberHacer va de ${rango('SaberHacer')[0].toFixed(0)} % a ${rango('SaberHacer')[1].toFixed(0)} % según la matriz. Compara cada una en «Tipo de Saber».` : '';

  return h('div', { class: 'inicio' },
    hero({ etiqueta: 'Resumen del conjunto', titulo: 'Análisis microcurricular',
      lead: 'Panorama de las matrices cargadas: qué se analizó y cómo se compone. Desde el menú puedes profundizar en cobertura temática, tendencias, taxonomías, indicadores y el perfil de egreso.',
      chips: [chip(`${programas.length} matrices`, 'collection'), chip(`${new Set(filas.map(f => f.Programa)).size} programas`, 'mortarboard'), chip(`${miles(asignaturas)} asignaturas`, 'journal-text'), chip(`${miles(filas.length)} registros`, 'table')] }),
    columnas(
      kpi({ icono: 'mortarboard', etiqueta: 'Programas', valor: new Set(filas.map(f => f.Programa)).size, nota: 'distintos por nombre', color: '#0F385A', ayuda: 'Un programa ofrecido en varias sedes cuenta una vez.' }),
      kpi({ icono: 'collection', etiqueta: 'Matrices', valor: programas.length, nota: 'programa · modalidad · sede', color: '#1FB2DE', ayuda: 'Unidad de análisis: cada combinación Programa + Modalidad + Sede tiene su propia matriz.' }),
      kpi({ icono: 'journal-text', etiqueta: 'Asignaturas', valor: miles(asignaturas), nota: 'nombres únicos', color: '#FBAF17' }),
      kpi({ icono: 'table', etiqueta: 'Registros', valor: miles(filas.length), nota: 'filas del Paso 5', color: '#EC0677', ayuda: 'Una fila por resultado de aprendizaje y asignatura.' })),
    columnas(
      panel({ titulo: 'Modalidad', bajada: 'Matrices por modalidad' },
        barraSegmentada(mods.map(m => ({ etiqueta: m, valor: nMod(m), color: COLOR_MOD[m] ?? '#8A94A0' })))),
      panel({ titulo: 'Nivel de formación', bajada: 'Matrices por nivel' },
        barraSegmentada(niveles.map(n => ({ etiqueta: n, valor: nNiv(n), color: COLOR_NIVEL[n] ?? '#8A94A0' })))),
      panel({ titulo: 'Tipo de saber', bajada: 'Registros por tipo de saber' }, barraSegmentada(totalSaber, { formato: miles }))),
    columnas(
      panel({ titulo: 'Matrices por modalidad y sede', bajada: 'Cada matriz es una combinación única de programa, modalidad y sede.' }, graficoModalidad(programas)),
      panel({ titulo: 'Composición por tipo de saber', bajada: 'Saber = conocimiento conceptual · SaberHacer = habilidades prácticas · SaberSer = actitudes y valores.', lectura }, donaSaber(filas))),
    tablaResumen(filas, datos.columnas, datos.totales));
}

function vistaMatriz(filas, todasFilas, seleccion, etiqueta, datos) {
  const f0 = filas[0];
  const mias = filas;
  const asignaturas = new Set(mias.map(f => f[COL_ASIG]).filter(x => x != null)).size;
  const semestres = new Set(mias.map(f => f.Semestre).filter(s => s !== null && s !== undefined && s !== '')).size;
  const ref = sabersPorMatriz(todasFilas), yo = ref.get(seleccion);
  const med = Object.fromEntries(TIPOS.map(t => [t, mediana([...ref.values()].map(o => o[`${t}%`]))]));
  const resumen = resumenPorPrograma(mias, datos.columnas, datos.totales)[0];
  const credito = resumen?.['Cr. Total'] > 0 ? resumen['Cr. Total'] : null;
  const gemelas = unidades(todasFilas).filter(u => u.Programa === f0.Programa && u.Matriz !== seleccion);
  const dSaber = yo ? TIPOS.map(t => ({ t, v: yo[`${t}%`], d: yo[`${t}%`] - med[t] })) : [];
  const lectura = yo ? `Frente a la mediana de las ${ref.size} matrices: ` + dSaber.map(x => `${x.t} ${x.v.toFixed(0)} % (${x.d >= 0 ? '+' : ''}${x.d.toFixed(0)} pts)`).join(' · ') + '.' : '';

  return h('div', { class: 'inicio' },
    hero({ etiqueta: 'Ficha de la matriz', titulo: f0.Programa, lead: `${f0.Modalidad} · ${f0.Sede} · ${f0.Nivel}. Lo que sigue describe solo esta matriz; la referencia es siempre el conjunto cargado.`,
      chips: [chip(f0.Modalidad, 'display'), chip(f0.Sede, 'geo-alt'), chip(f0.Nivel, 'mortarboard'), chip(etiqueta.get(seleccion) ?? seleccion, 'collection')] }),
    gemelas.length ? aviso('warning', `Misma matriz en otras sedes: ${gemelas.map(g => etiqueta.get(g.Matriz) ?? g.Matriz).join('; ')}. Comparten RA y núcleos casi idénticos: no se comparan como hallazgo.`) : null,
    columnas(
      kpi({ icono: 'journal-text', etiqueta: 'Asignaturas', valor: asignaturas, nota: 'nombres únicos', color: '#FBAF17' }),
      kpi({ icono: 'table', etiqueta: 'Registros', valor: miles(mias.length), nota: 'filas del Paso 5', color: '#EC0677' }),
      kpi({ icono: 'calendar3', etiqueta: 'Semestres', valor: semestres || '—', nota: 'con asignaturas', color: '#1FB2DE' }),
      kpi({ icono: 'award', etiqueta: 'Créditos oficiales', valor: credito ?? 'sin dato', nota: credito ? 'total del programa' : 'el Excel no trae totales', color: '#0F385A' })),
    columnas(
      panel({ titulo: 'Tipo de saber frente al conjunto', bajada: 'Barras = esta matriz · rombo dorado = mediana de las matrices cargadas.', lectura },
        grafico([
          { type: 'bar', orientation: 'h', name: 'Esta matriz', y: TIPOS, x: TIPOS.map(t => +yo?.[`${t}%`]?.toFixed(1)), marker: { color: TIPOS.map(t => COLOR_SABER[t]) },
            text: TIPOS.map(t => `${yo?.[`${t}%`]?.toFixed(0)} %`), textposition: 'inside', textfont: { color: '#fff' } },
          { type: 'scatter', mode: 'markers', name: 'Mediana del conjunto', y: TIPOS, x: TIPOS.map(t => +med[t]?.toFixed(1)), marker: { symbol: 'diamond', size: 13, color: '#FBAF17', line: { width: 1.5, color: '#0F385A' } } },
        ], { height: 280, xaxis: { range: [0, 100], ticksuffix: ' %' }, yaxis: { autorange: 'reversed' }, margin: { l: 90, r: 20, t: 10, b: 40 }, legend: { orientation: 'h', y: -0.2 } })),
      panel({ titulo: 'Siguiente paso', bajada: 'Profundiza en esta matriz.' },
        h('div', { class: 'accesos' }, ...[['Indicadores V1–V5', 'speedometer2'], ['Perfil de Egreso (V1)', 'person-check'], ['Resumen Ejecutivo', 'clipboard-data'], ['Cobertura Temática', 'map']].map(([n, ic]) =>
          h('button', { type: 'button', class: 'acceso', onclick: () => { actualizar({ pagina: n }); window.scrollTo(0, 0); } }, icono(ic), n, icono('arrow-right')))))),
    tablaResumen(mias, datos.columnas, datos.totales));
}

export function paginaInicio(filas, { todasFilas = filas, seleccion = null, etiqueta = new Map() } = {}) {
  const { datos } = obtener();
  if (seleccion) return vistaMatriz(todasFilas.filter(f => f.Matriz === seleccion), todasFilas, seleccion, etiqueta, datos);
  return vistaConjunto(filas, datos);
}
