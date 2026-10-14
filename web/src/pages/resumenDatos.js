// Cálculo del Resumen Ejecutivo (sin interfaz): lo usan la página y los informes PDF, de modo que ambos muestren las mismas cifras.
import { agregar, CRITERIOS_EVALUADOS, referenciasConjunto, valorarMatriz } from '../data/indicadores.js';
import { cuantil, mediana } from '../data/estadistica.js';
import { aciertosPorFila, configActual, hayConfig, resumirTendencias } from '../data/tendencias.js';
import { cmp } from '../data/util.js';

export const VARS = CRITERIOS_EVALUADOS.map(c => c[0]);
export const COL_ASIG = 'Nombre asignatura o modulo';
const TIPOS = ['Saber', 'SaberHacer', 'SaberSer'];

/** Port de recomendaciones_matriz (src/informes_pdf.py). */
export function recomendacionesMatriz(estados, fila, nSinPerfil, nRaNoEval, nEstIncompletas) {
  const malo = v => ['Parcial', 'No cumple'].includes(estados[v]);
  const r = [];
  if (malo('V1')) r.push(`V1 Perfil: revisar ${nSinPerfil} atributo(s) del perfil de egreso sin alineación; incorporarlos en competencias, RA o asignaturas, o ajustar la redacción del perfil.`);
  if (malo('V3')) r.push(`V3 Evaluabilidad: reformular ${nRaNoEval} RA con verbo observable y finalidad de desempeño o producto (detalle en el anexo).`);
  if (malo('V4')) r.push(`V4 Trazabilidad: vincular ${fila['RA sin estrategia'] ?? 0} RA a una estrategia mesocurricular con instrumento en el Paso 4.`);
  if (malo('V5')) r.push(`V5 Indicadores: completar indicador e instrumento en ${nEstIncompletas} estrategia(s) del Paso 4.`);
  const niv = fila['Indicadores por nivel'] ?? {};
  if (fila.Estrategias && !((niv.N3 ?? 0) + (niv.N4 ?? 0))) r.push('Evidencia (recomendación, sin criterio en la plantilla): ninguna estrategia declara indicadores de aprendizaje demostrado (N3) o transferencia (N4); conviene incluir al menos uno por estrategia.');
  return r;
}

export function asignaturasSinNucleos(filas) {
  const s = new Set();
  for (const f of filas) {
    const a = f[COL_ASIG];
    if (a == null || String(a).trim().toLowerCase().startsWith('electiv')) continue;
    const n = f['Nucleos tematicos'];
    if (n == null || ['', 'nan'].includes(String(n).trim())) s.add(String(a));
  }
  return s;
}

export function alertas(filas, etiqueta) {
  const out = [];
  const piv = new Map();
  for (const f of filas) {
    if (!TIPOS.includes(f['Tipo de Saber'])) continue;
    if (!piv.has(f.Matriz)) piv.set(f.Matriz, { Saber: 0, SaberHacer: 0, SaberSer: 0, n: 0 });
    const o = piv.get(f.Matriz); o[f['Tipo de Saber']]++; o.n++;
  }
  if (piv.size >= 4) {
    for (const t of TIPOS) {
      const v = [...piv].map(([m, o]) => [m, 100 * o[t] / o.n]);
      const q1 = cuantil(v.map(x => x[1]), 0.25), q3 = cuantil(v.map(x => x[1]), 0.75), med = mediana(v.map(x => x[1]));
      for (const [m, p] of v) {
        if (p < q1 - 1.5 * (q3 - q1) || p > q3 + 1.5 * (q3 - q1)) {
          out.push({ Matriz: m, Categoría: 'Tipo de Saber', Hallazgo: `${etiqueta.get(m) ?? m}: ${t} ${p.toFixed(0)}% se aparta del conjunto cargado (mediana ${med.toFixed(0)}%; P25–P75 ${q1.toFixed(0)}–${q3.toFixed(0)}%)`,
            Recomendación: 'Revisar si la diferencia responde a una decisión de diseño o a un error de diligenciamiento de la matriz.' });
        }
      }
    }
  }
  const sinSem = filas.filter(f => f.Semestre == null || f.Semestre === '' || !Number.isFinite(Number(f.Semestre))).length;
  if (sinSem) out.push({ Matriz: null, Categoría: 'Completitud de datos', Hallazgo: `${sinSem} de ${filas.length} registros (${(100 * sinSem / filas.length).toFixed(0)} %) sin semestre reconocible`,
    Recomendación: 'Revisar el campo Semestre de esas asignaturas en el Paso 5 (valores vacíos o no numéricos).' });
  const sinNuc = asignaturasSinNucleos(filas).size;
  const nAsig = new Set(filas.map(f => f[COL_ASIG]).filter(x => x != null)).size;
  if (sinNuc) out.push({ Matriz: null, Categoría: 'Completitud de datos', Hallazgo: `${sinNuc} asignaturas no electivas (${(100 * sinNuc / nAsig).toFixed(0)}%) sin núcleos temáticos declarados`,
    Recomendación: 'Completar la columna «Núcleos temáticos» en el formato Excel para un análisis más preciso.' });
  return out;
}

/**
 * Todo lo que muestra el Resumen para las matrices de la vista. `seleccion` limita a una matriz; las medianas de referencia son siempre
 * las de todas las matrices cargadas. `exigencia`: {matriz: índice de exigencia} (opcional, viene de Taxonomías).
 */
export function calcularResumen({ filas, todasFilas, d, etiqueta, seleccion = null, exigencia = {} }) {
  const vis = new Set(filas.map(f => f.Matriz));
  const evalVista = d.matrices.filter(m => vis.has(m.matriz) && (!seleccion || m.matriz === seleccion));
  const todo = agregar(d.matrices, d.v1);
  const vista = agregar(evalVista, d.v1);
  const g = vista.globales;
  const ref = referenciasConjunto(todo.por_matriz, exigencia);
  const filasVista = seleccion ? filas.filter(f => f.Matriz === seleccion) : filas;
  if (!g.matrices) return { vacio: true, g, vista, vis, filasVista };

  const val = Object.fromEntries(vista.por_matriz.map(m => [m.Matriz, valorarMatriz(m, { sinRespaldo: d.perfil[m.Matriz]?.sin ?? null, tresCapas: d.perfil[m.Matriz]?.tres ?? null,
    referencia: ref, exigencia: exigencia[m.Matriz] ?? null })]));
  const prioridades = vista.por_matriz.map(m => {
    const est = Object.fromEntries(val[m.Matriz].map(v => [v.Variable, v.Estado]));
    return { Matriz: m.Matriz, Etiqueta: etiqueta.get(m.Matriz) ?? m.Matriz, ...Object.fromEntries(VARS.map(v => [v, est[v] ?? 'Sin dato'])),
      'No cumple': VARS.filter(v => est[v] === 'No cumple').length, Parcial: VARS.filter(v => est[v] === 'Parcial').length };
  }).sort((a, b) => b['No cumple'] - a['No cumple'] || b.Parcial - a.Parcial || cmp(a.Etiqueta, b.Etiqueta));
  const conteo = CRITERIOS_EVALUADOS.map(([v, e]) => [`${v} ${e}`, v, Object.fromEntries(['Cumple', 'Parcial', 'No cumple', 'Sin dato'].map(s => [s, prioridades.filter(p => p[v] === s).length]))]);

  // lectura rápida (hechos, sin umbrales)
  const lectura = [];
  if (prioridades.length) {
    const n = prioridades.length, conNC = prioridades.filter(p => p['No cumple'] > 0).length, todas = prioridades.filter(p => VARS.every(v => p[v] === 'Cumple')).length;
    lectura.push(`<b>${conNC} de ${n}</b> matrices tienen al menos un criterio en «No cumple»; <b>${todas}</b> ${todas === 1 ? 'cumple' : 'cumplen'} los ${VARS.length} criterios evaluados.`);
    const peor = [...conteo].sort((a, b) => b[2]['No cumple'] - a[2]['No cumple'])[0];
    if (peor[2]['No cumple']) lectura.push(`El criterio con más incumplimiento es <b>${peor[0]}</b> (${peor[2]['No cumple']} matrices en «No cumple», ${peor[2].Parcial} en «Parcial»).`);
    const cumplidos = conteo.filter(c => c[2].Cumple === n).map(c => c[0]);
    if (cumplidos.length) lectura.push(`Todas las matrices cumplen: <b>${cumplidos.join(', ')}</b>.`);
  }
  const nSinAl = Object.entries(d.perfil).filter(([m]) => vis.has(m) && (!seleccion || m === seleccion)).reduce((a, [, p]) => [a[0] + p.nSin, a[1] + p.n], [0, 0]);
  if (nSinAl[1]) lectura.push(`Perfil de egreso: <b>${nSinAl[0]} de ${nSinAl[1]}</b> atributos (${(100 * nSinAl[0] / nSinAl[1]).toFixed(0)} %) sin alineación en ninguna capa (competencias, RA o asignaturas).`);
  if (g.ra_unicos) lectura.push(`De <b>${g.ra_unicos}</b> RA únicos, <b>${g.ra_sin_estrategia}</b> no tienen estrategia mesocurricular con instrumento (V4) y <b>${vista.ra.filter(r => !r.V3).length}</b> no son evaluables (V3).`);
  if (g.estrategias) lectura.push(`<b>${g.estrategias_directa} de ${g.estrategias}</b> estrategias declaran indicadores de aprendizaje demostrado o transferencia (N3–N4).`);

  // tendencias globales: presencia por asignatura y por programa
  let tend = null, presencia = null;
  if (hayConfig()) {
    const T = configActual().TENDENCIAS_GLOBALES, acier = aciertosPorFila(todasFilas), r = resumirTendencias(filasVista, acier);
    const progs = new Set(filasVista.map(f => f.Programa));
    presencia = new Map(); // programa → conjunto de tendencias presentes
    for (const f of filasVista) {
      const a = acier.get(f);
      if (!a) continue;
      if (!presencia.has(f.Programa)) presencia.set(f.Programa, new Set());
      for (const t of Object.keys(T)) if (a[t]) presencia.get(f.Programa).add(t);
    }
    tend = Object.keys(T).map(t => {
      const ps = [...presencia].filter(([, s]) => s.has(t)).length;
      return { Tendencia: T[t].descripcion, Asignaturas: r.conteo[t], '% de asignaturas': +r.cobertura[t].toFixed(1), Programas: ps, '% de programas': progs.size ? +(100 * ps / progs.size).toFixed(1) : 0 };
    }).sort((a, b) => a['% de asignaturas'] - b['% de asignaturas'] || a.Programas - b.Programas);
    const ausentes = tend.filter(t => t.Asignaturas === 0).map(t => t.Tendencia);
    if (ausentes.length) lectura.push(`Tendencias globales sin presencia: ${ausentes.join(', ')}.`);
  }

  const kpis = [['Programas', new Set(filasVista.map(f => f.Programa)).size], ['Matrices', new Set(filasVista.map(f => f.Matriz)).size],
    ['Asignaturas', new Set(filasVista.map(f => f[COL_ASIG]).filter(x => x != null)).size], ['RA únicos', g.ra_unicos ?? 0], ['Estrategias (Paso 4)', g.estrategias ?? 0]];
  const al = alertas(filasVista, etiqueta).filter(a => !seleccion || !a.Matriz || a.Matriz === seleccion);
  return { vacio: false, vis, vista, todo, g, ref, filasVista, val, prioridades, conteo, lectura, tend, presencia, kpis, al };
}

/** Porcentaje de cada tipo de saber por programa y su mediana entre programas (referencia descriptiva, sin umbrales). */
export function tipoSaberPorPrograma(filas) {
  const por = new Map();
  for (const f of filas) {
    if (!TIPOS.includes(f['Tipo de Saber'])) continue;
    if (!por.has(f.Programa)) por.set(f.Programa, { Saber: 0, SaberHacer: 0, SaberSer: 0, n: 0 });
    const o = por.get(f.Programa); o[f['Tipo de Saber']]++; o.n++;
  }
  const ts = new Map([...por].map(([p, o]) => [p, Object.fromEntries(TIPOS.map(t => [t, 100 * o[t] / o.n]))]));
  const medianas = Object.fromEntries(TIPOS.map(t => [t, ts.size ? mediana([...ts.values()].map(x => x[t])) : null]));
  return { ts, medianas };
}
