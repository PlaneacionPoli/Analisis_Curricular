// Cálculo del Resumen Ejecutivo (sin interfaz): lo usan la página y los informes PDF, de modo que ambos muestren las mismas cifras.
import { agregar, CRITERIOS_EVALUADOS, norm, referenciasConjunto, valorarMatriz } from '../data/indicadores.js';
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
  if (malo('V2')) r.push(`V2 Competencias: vincular ${(fila['Competencias específicas'] ?? 0) - (fila['Competencias específicas con RA'] ?? 0)} competencia(s) específica(s) a al menos un RA en el Paso 3.`);
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

/** Pregrado y posgrado se comparan por separado: sus mallas distribuyen distinto el tipo de saber. «Mixto» y «No identificado» no tienen grupo de referencia. */
export const NIVELES = ['Pregrado', 'Posgrado'];
export const MIN_GRUPO = 4;
export const nivelDeFila = f => (NIVELES.includes(f.Nivel) ? f.Nivel : null);

/** Porcentaje de cada tipo de saber por unidad (clave de la fila) y el nivel de esa unidad. */
function pivotSaber(filas, clave) {
  const piv = new Map();
  for (const f of filas) {
    if (!TIPOS.includes(f['Tipo de Saber'])) continue;
    const k = f[clave];
    if (!piv.has(k)) piv.set(k, { Saber: 0, SaberHacer: 0, SaberSer: 0, n: 0, nivel: nivelDeFila(f) });
    const o = piv.get(k); o[f['Tipo de Saber']]++; o.n++;
  }
  return piv;
}

/** Hallazgos de Tipo de Saber: cada matriz de la vista se compara con las matrices de su mismo nivel (mediana y rango intercuartílico). `filasRef`: todo lo cargado. */
function alertasTipoSaber(filas, etiqueta, filasRef) {
  const out = [], visibles = new Set(filas.map(f => f.Matriz));
  const piv = pivotSaber(filasRef, 'Matriz');
  for (const nivel of NIVELES) {
    const grupo = [...piv].filter(([, o]) => o.nivel === nivel);
    if (grupo.length < MIN_GRUPO) continue;
    for (const t of TIPOS) {
      const v = grupo.map(([m, o]) => [m, 100 * o[t] / o.n]);
      const q1 = cuantil(v.map(x => x[1]), 0.25), q3 = cuantil(v.map(x => x[1]), 0.75), med = mediana(v.map(x => x[1]));
      for (const [m, p] of v) {
        if (!visibles.has(m)) continue;
        if (p < q1 - 1.5 * (q3 - q1) || p > q3 + 1.5 * (q3 - q1)) {
          out.push({ Matriz: m, Categoría: 'Tipo de Saber', Nivel: nivel, Hallazgo: `${etiqueta.get(m) ?? m}: ${t} ${p.toFixed(0)}% se aparta de las ${grupo.length} matrices de ${nivel.toLowerCase()} cargadas (mediana ${med.toFixed(0)}%; P25–P75 ${q1.toFixed(0)}–${q3.toFixed(0)}%)`,
            Recomendación: 'Revisar si la diferencia responde a una decisión de diseño o a un error de diligenciamiento de la matriz.' });
        }
      }
    }
  }
  return out;
}

export function alertas(filas, etiqueta, filasRef = filas) {
  const out = alertasTipoSaber(filas, etiqueta, filasRef);
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
    lectura.push(conNC ? `<b>${conNC} de ${n}</b> matrices incumplen por completo al menos un criterio («No cumple»).` : `Ninguna de las <b>${n}</b> matrices incumple por completo un criterio.`);
    lectura.push(`<b>${todas} de ${n}</b> matrices cumplen los ${VARS.length} criterios evaluados.`);
    const peor = [...conteo].sort((a, b) => b[2]['No cumple'] - a[2]['No cumple'])[0];
    if (peor[2]['No cumple']) lectura.push(`El criterio con más incumplimiento es <b>${peor[0]}</b>: ${peor[2]['No cumple']} matrices en «No cumple» y ${peor[2].Parcial} en «Parcial».`);
    const cumplidos = conteo.filter(c => c[2].Cumple === n).map(c => c[0]);
    if (cumplidos.length) lectura.push(`Cumplen en todas las matrices: <b>${cumplidos.join(', ')}</b>.`);
  }
  const nSinAl = Object.entries(d.perfil).filter(([m]) => vis.has(m) && (!seleccion || m === seleccion)).reduce((a, [, p]) => [a[0] + p.nSin, a[1] + p.n], [0, 0]);
  if (nSinAl[1]) lectura.push(`Perfil de egreso: <b>${nSinAl[0].toLocaleString('es-CO')} de ${nSinAl[1].toLocaleString('es-CO')}</b> atributos (${(100 * nSinAl[0] / nSinAl[1]).toFixed(0)} %) no tienen alineación en competencias, RA ni asignaturas.`);
  if (g.ra_unicos) lectura.push(`De <b>${g.ra_unicos}</b> RA únicos, <b>${g.ra_sin_estrategia}</b> no se vinculan a una estrategia mesocurricular con instrumento (V4) y <b>${vista.ra.filter(r => !r.V3).length}</b> no son evaluables (V3).`);
  if (g.estrategias) lectura.push(`<b>${g.estrategias_directa} de ${g.estrategias}</b> estrategias declaran indicadores de aprendizaje demostrado o de transferencia (N3–N4).`);

  // tendencias globales: presencia por asignatura y por programa
  let tend = null, presencia = null, principales = null;
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
    principales = principalesTendencias(filasVista, acier, T); principales.lectura = lecturaTendencias(principales);
    const ausentes = tend.filter(t => t.Asignaturas === 0).map(t => t.Tendencia);
    if (ausentes.length) lectura.push(`Tendencias globales sin presencia: ${ausentes.join(', ')}.`);
  }

  const kpis = [['Programas', new Set(filasVista.map(f => f.Programa)).size], ['Matrices', new Set(filasVista.map(f => f.Matriz)).size],
    ['Asignaturas', new Set(filasVista.map(f => f[COL_ASIG]).filter(x => x != null)).size], ['RA únicos', g.ra_unicos ?? 0], ['Estrategias (Paso 4)', g.estrategias ?? 0]];
  const al = alertas(filasVista, etiqueta, todasFilas).filter(a => !seleccion || !a.Matriz || a.Matriz === seleccion);
  return { vacio: false, vis, vista, todo, g, ref, filasVista, val, prioridades, conteo, lectura, tend, presencia, principales, kpis, al, perfilSin: { sin: nSinAl[0], total: nSinAl[1] } };
}

/**
 * Porcentaje de cada tipo de saber por programa y su mediana entre programas del MISMO nivel (pregrado y posgrado por separado; referencia descriptiva, sin umbrales).
 * `medianas[nivel][tipo]` es null si el nivel no tiene programas; `nivel` dice a qué grupo pertenece cada programa (null si es mixto o no se identificó).
 */
export function tipoSaberPorPrograma(filas) {
  const piv = pivotSaber(filas, 'Programa');
  const ts = new Map([...piv].map(([p, o]) => [p, Object.fromEntries(TIPOS.map(t => [t, 100 * o[t] / o.n]))]));
  const nivel = new Map([...piv].map(([p, o]) => [p, o.nivel]));
  const nProgramas = Object.fromEntries(NIVELES.map(n => [n, [...nivel.values()].filter(x => x === n).length]));
  const medianas = Object.fromEntries(NIVELES.map(n => [n, Object.fromEntries(TIPOS.map(t => {
    const v = [...ts].filter(([p]) => nivel.get(p) === n).map(([, x]) => x[t]);
    return [t, v.length ? mediana(v) : null];
  }))]));
  return { ts, nivel, medianas, nProgramas };
}

const nombreAsignatura = f => { const a = f[COL_ASIG]; const t = a == null ? '' : String(a).trim(); return t === 'nan' ? '' : t; };

/**
 * Principales tendencias globales: presencia de cada una (asignaturas únicas por nombre que la mencionan, y programas con al menos una), en el conjunto y por nivel
 * (pregrado y posgrado por separado). `acier` viene de aciertosPorFila y `T` es TENDENCIAS_GLOBALES. Orden: de mayor a menor % de asignaturas del conjunto.
 * Cuenta menciones por palabras clave en el nombre o el contenido; no juzga el enfoque de la asignatura.
 */
export function principalesTendencias(filas, acier, T) {
  const grupos = { Total: filas, ...Object.fromEntries(NIVELES.map(n => [n, filas.filter(f => nivelDeFila(f) === n)])) };
  const calcular = sub => {
    const asig = new Set(), progs = new Set(), porT = Object.fromEntries(Object.keys(T).map(t => [t, { asig: new Set(), progs: new Set() }]));
    for (const f of sub) {
      const a = nombreAsignatura(f);
      progs.add(f.Programa);
      if (a) asig.add(a);
      for (const t of Object.keys(acier.get(f) ?? {})) { if (a) porT[t].asig.add(a); porT[t].progs.add(f.Programa); }
    }
    return { asignaturas: asig.size, programas: progs.size, porT };
  };
  const calc = Object.fromEntries(Object.entries(grupos).map(([k, sub]) => [k, calcular(sub)]));
  const celda = (k, t) => { const c = calc[k], x = c.porT[t]; return { pct: c.asignaturas ? 100 * x.asig.size / c.asignaturas : null, asignaturas: x.asig.size, programas: x.progs.size, pctProgramas: c.programas ? 100 * x.progs.size / c.programas : null }; };
  const filasT = Object.keys(T).map(tid => ({ tid, Tendencia: T[tid].descripcion, ...Object.fromEntries(Object.keys(grupos).map(k => [k, celda(k, tid)])) }))
    .sort((x, y) => (y.Total.pct ?? 0) - (x.Total.pct ?? 0) || y.Total.programas - x.Total.programas || x.Tendencia.localeCompare(y.Tendencia, 'es'));
  return { filas: filasT, n: Object.fromEntries(Object.entries(calc).map(([k, c]) => [k, { asignaturas: c.asignaturas, programas: c.programas }])) };
}

/** Frase de lectura de las principales tendencias (HTML). */
export function lecturaTendencias(r, cuantas = 3) {
  const top = r.filas.slice(0, cuantas);
  if (!top.length || !r.n.Total.asignaturas) return '';
  const fmtP = v => (v === null ? '—' : `${v.toFixed(0)} %`);
  return `Las más presentes: ${top.map(t => `<b>${t.Tendencia}</b> (${fmtP(t.Total.pct)} de las asignaturas; ${t.Total.programas} de ${r.n.Total.programas} programas)`).join('; ')}.`;
}

const SABERES = ['Saber', 'SaberHacer', 'SaberSer'];

/**
 * Cadena de cada competencia del perfil (Paso 2) por tipo de saber: cada competencia específica debe tener resultados de aprendizaje (Paso 3) de Saber, SaberHacer y SaberSer
 * (la genérica, los de los tipos de saber que declara), y cada uno debe llegar a estrategias mesocurriculares con instrumento (Paso 4) y a asignaturas (Paso 5). Una fila por competencia × tipo de saber;
 * «huérfana» si algún eslabón falta.
 * @param {Array} matrices  matrices evaluadas (con `cadena`), ya limitadas a la vista
 * @param {Array} filas     filas del Paso 5 de esas matrices
 */
export function cadenaCompetencias(matrices, filas, etiqueta) {
  const porMatriz = new Map();
  for (const f of filas) {
    const k = norm(f['Resultado de aprendizaje']);
    if (!porMatriz.has(f.Matriz)) porMatriz.set(f.Matriz, new Map());
    const m = porMatriz.get(f.Matriz);
    if (!m.has(k)) m.set(k, { asig: new Set(), sem: new Set() });
    const o = m.get(k);
    if (f[COL_ASIG] != null) o.asig.add(String(f[COL_ASIG]).trim());
    if (f.Semestre !== '' && f.Semestre != null && Number.isFinite(Number(f.Semestre))) o.sem.add(Number(f.Semestre));
  }
  const filasOut = [];
  for (const m of matrices) {
    const p5 = porMatriz.get(m.matriz) ?? new Map();
    for (const c of m.cadena ?? []) {
      // las específicas deben tener RA de los tres tipos de saber; la genérica se revisa en los tipos de saber que declara (hoy, Saber)
      const exigidos = c.generica ? SABERES.filter(x => c.porSaber[x].ras.length) : SABERES;
      for (const saber of exigidos.length ? exigidos : ['Saber']) {
        const s = c.porSaber[saber];
        const asig = new Set(), sem = new Set();
        let enP5 = 0;
        for (const ra of s.ras) { const o = p5.get(ra); if (o) { enP5++; o.asig.forEach(a => asig.add(a)); o.sem.forEach(x => sem.add(x)); } }
        const nRA = s.ras.length;
        let estado = 'Completa', falta = '';
        if (!nRA) { estado = 'Sin RA'; falta = `la competencia no tiene un RA de ${saber}`; }
        else if (!s.rasConMeso.length) { estado = 'Sin estrategia mesocurricular'; falta = 'ningún RA se vincula a una estrategia del Paso 4 con instrumento'; }
        else if (!enP5) { estado = 'Sin asignaturas'; falta = 'ningún RA aparece en el Paso 5'; }
        else if (s.rasConMeso.length < nRA || enP5 < nRA) { estado = 'Parcial'; falta = `${nRA - s.rasConMeso.length} RA sin estrategia mesocurricular; ${nRA - enP5} RA sin asignatura`; }
        filasOut.push({ Matriz: etiqueta.get(m.matriz) ?? m.matriz, id: m.matriz, Competencia: c.competencia, Tipo: c.generica ? 'Genérica' : 'Específica', 'Tipo de saber': saber, RA: nRA,
          'RA con estrategia': s.rasConMeso.length, 'Estrategias mesocurriculares': s.estrategiasMeso.length, Asignaturas: asig.size, Semestres: [...sem].sort((a, b) => a - b).join(', ') || '—', Estado: estado, Falta: falta });
      }
    }
  }
  const huerfanas = filasOut.filter(r => r.Estado !== 'Completa' && r.Estado !== 'Parcial');
  const cuenta = (e, t = null) => filasOut.filter(r => r.Estado === e && (!t || r.Tipo === t)).length;
  const ncomp = new Set(filasOut.map(r => `${r.id}|${r.Competencia}`)).size;
  const sinSaber = filasOut.filter(r => r.Estado === 'Sin RA');
  return { filas: filasOut, huerfanas, resumen: { competencias: ncomp, total: filasOut.length, completas: cuenta('Completa'), parciales: cuenta('Parcial'), sinRA: sinSaber.length,
    sinEstrategia: cuenta('Sin estrategia mesocurricular'), sinAsignaturas: cuenta('Sin asignaturas'),
    genericas: new Set(filasOut.filter(r => r.Tipo === 'Genérica').map(r => `${r.id}|${r.Competencia}`)).size,
    sinRAGenericas: cuenta('Sin RA', 'Genérica'), sinRAEspecificas: cuenta('Sin RA', 'Específica'), sinEstrategiaGenericas: cuenta('Sin estrategia mesocurricular', 'Genérica'),
    sinEstrategiaEspecificas: cuenta('Sin estrategia mesocurricular', 'Específica'), huerfanasGenericas: huerfanas.filter(r => r.Tipo === 'Genérica').length,
    huerfanasEspecificas: huerfanas.filter(r => r.Tipo === 'Específica').length } };
}

const lleno = v => v != null && String(v).trim() !== '' && String(v).trim().toLowerCase() !== 'nan';
const ASOCIACION = { ambas: 'Mesocurricular y micro', meso: 'Solo mesocurricular', micro: 'Solo micro', ninguna: 'Ninguna' };

/**
 * ¿Con qué estrategias se asocia cada RA? Mesocurriculares: estrategia del Paso 4 con instrumento (regla de V4). Micro: asignaturas del Paso 5 que trabajan el RA
 * y declaran actividades de aprendizaje, de evaluación o de retroalimentación.
 * @param {Array} ras     RA evaluados (de agregar(): matriz, ra, generica, V4, estrategias)
 * @param {Array} filas   filas del Paso 5 de las mismas matrices
 */
export function asociacionRA(ras, filas, etiqueta) {
  const porMatriz = new Map();
  for (const f of filas) {
    const k = norm(f['Resultado de aprendizaje']);
    if (!porMatriz.has(f.Matriz)) porMatriz.set(f.Matriz, new Map());
    const m = porMatriz.get(f.Matriz);
    if (!m.has(k)) m.set(k, { asig: new Set(), conActividades: new Set() });
    const o = m.get(k), a = String(f[COL_ASIG] ?? '').trim();
    o.asig.add(a);
    if (['Actividades de aprendizaje', 'Actividades de evaluacion', 'Acciones de retroalimentacion', 'Actividades evaluativas'].some(c => lleno(f[c]))) o.conActividades.add(a);
  }
  const out = ras.map(r => {
    const p5 = porMatriz.get(r.matriz)?.get(norm(r.ra));
    const micro = (p5?.conActividades.size ?? 0) > 0, meso = Boolean(r.V4);
    return { Matriz: etiqueta.get(r.matriz) ?? r.matriz, id: r.matriz, 'Resultado de aprendizaje': r.ra, Tipo: r.generica ? 'Genérico institucional' : 'De programa',
      'Estrategia mesocurricular (Paso 4)': meso ? 'Sí' : 'No', 'Asignaturas con estrategias micro (Paso 5)': p5?.conActividades.size ?? 0,
      Asociación: meso && micro ? ASOCIACION.ambas : meso ? ASOCIACION.meso : micro ? ASOCIACION.micro : ASOCIACION.ninguna };
  });
  const n = k => out.filter(r => r.Asociación === ASOCIACION[k]).length;
  return { filas: out, resumen: { total: out.length, ambas: n('ambas'), meso: n('meso'), micro: n('micro'), ninguna: n('ninguna'),
    microGenericos: out.filter(r => r.Asociación === ASOCIACION.micro && r.Tipo !== 'De programa').length, microPrograma: out.filter(r => r.Asociación === ASOCIACION.micro && r.Tipo === 'De programa').length } };
}
