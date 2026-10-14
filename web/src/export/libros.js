// Arma el contenido (hojas y columnas explicadas) de cada libro de Excel; el formato lo da excelMarca.js.
import { libroMarca } from './excelMarca.js';

const NIVELES = ['N1', 'N2', 'N3', 'N4', 'N5'];
const sino = v => (v ? 'Sí' : 'No');

/** Indicadores V1–V5: una hoja por unidad de análisis (matriz, RA, estrategia, indicador) y la valoración por criterios de cada matriz. */
export function libroIndicadores({ vista, val, etiqueta, alcance }) {
  const nombre = id => etiqueta.get(id) ?? id;
  const porMatriz = vista.por_matriz.map(m => ({
    Matriz: nombre(m.Matriz), 'Código de matriz': m.Matriz, Programa: m.Programa, Sede: m.Sede, Competencias: m.Competencias, 'RA únicos': m['RA únicos'], Estrategias: m.Estrategias,
    'V1 %': m['V1 %'], 'RA con competencia %': m['RA con competencia %'], 'V2 %': m['V2 %'], 'Competencias específicas': m['Competencias específicas'], 'Competencias específicas con RA': m['Competencias específicas con RA'], 'Observación V2': m['Observación V2'], 'V3 %': m['V3 %'], 'V4 %': m['V4 %'],
    'RA sin estrategia': m['RA sin estrategia'], 'V5 %': m['V5 %'], 'Evidencia directa %': m['Evidencia directa %'],
    'Estrategias con indicador e instrumento': m['Estrategias con indicador e instrumento'],
    ...Object.fromEntries(NIVELES.map(n => [`Indicadores ${n}`, (m['Indicadores por nivel'] ?? {})[n] ?? 0])),
  }));
  const ra = vista.ra.map(r => ({
    Matriz: nombre(r.matriz), Programa: r.programa, Sede: r.sede, 'Resultado de aprendizaje': r.ra, 'RA genérico institucional': sino(r.generica), 'Vinculado a competencia': sino(r.RA_competencia),
    'Evaluable (V3)': sino(r.V3), 'Motivo si no es evaluable': r.motivo_V3, 'Con estrategia mesocurricular (V4)': sino(r.V4), 'Estrategias vinculadas': r.estrategias,
  }));
  const estrategias = vista.estrategias.map(e => ({
    Matriz: nombre(e.matriz), Programa: e.programa, Sede: e.sede, Estrategia: e.estrategia, 'N.º de indicadores': e.indicadores, 'Declara instrumento': sino(e.instrumento),
    'Nivel máximo de evidencia': e.nivel_max, 'Cumple V5 (N2 o superior)': sino(e.V5), 'Evidencia directa (N3–N4)': sino(e.directa),
  }));
  const indicadores = vista.indicadores.map(i => ({ Matriz: nombre(i.matriz), Sede: i.sede, Estrategia: i.estrategia, Indicador: i.indicador, 'Nivel de evidencia': i.nivel }));
  const valoracion = Object.entries(val).filter(([id]) => vista.por_matriz.some(m => m.Matriz === id)).flatMap(([id, vs]) => vs.map(v => ({
    Matriz: nombre(id), Variable: v.Variable, 'Criterio evaluado': v.Tramo, 'Regla de la plantilla': v.Criterio, Resultado: v.Resultado, Estado: v.Estado, 'Mediana del conjunto': v['Referencia (mediana)'], Observación: v.Observación ?? '' })));
  return libroMarca({
    titulo: 'Indicadores de coherencia y trazabilidad (V1–V5)', alcance,
    hojas: [
      { nombre: 'Valoración por criterios', descripcion: 'Estado de cada matriz en cada criterio (Cumple, Parcial, No cumple), con el resultado que lo explica y la mediana del conjunto.', filas: valoracion,
        columnas: [{ campo: 'Matriz', ancho: 44 }, { campo: 'Variable', ancho: 10 }, { campo: 'Criterio evaluado', ancho: 34 }, { campo: 'Regla de la plantilla', ancho: 50, ayuda: 'Condición que la plantilla institucional exige para cumplir el criterio.' },
          { campo: 'Resultado', ancho: 56 }, { campo: 'Estado', ancho: 14, ayuda: 'Cumple: la regla se cumple en todos los casos; Parcial: en algunos; No cumple: en ninguno; Descriptiva: se informa sin calificar.' }, { campo: 'Mediana del conjunto', ancho: 30 }, { campo: 'Observación', ancho: 60 }], congelarColumnas: 1 },
      { nombre: 'Por matriz', descripcion: 'Una fila por matriz (programa, modalidad y sede) con los porcentajes de V1 a V5 y el conteo de indicadores por nivel de evidencia.', filas: porMatriz, congelarColumnas: 1,
        columnas: Object.keys(porMatriz[0] ?? { Matriz: 1 }).map(campo => ({ campo, ...({
          Matriz: { ancho: 44 }, 'V1 %': { ayuda: 'Porcentaje de atributos del perfil de egreso con alineación en alguna capa (competencias, RA o asignaturas).' },
          'V2 %': { ayuda: 'Porcentaje de competencias específicas con al menos un RA que las desarrolle (Paso 3). La genérica no cuenta: su novedad va en «Observación V2».' }, 'V3 %': { ayuda: 'Porcentaje de RA evaluables (verbo observable y finalidad de desempeño o producto).' },
          'V4 %': { ayuda: 'Porcentaje de RA vinculados a una estrategia mesocurricular con instrumento.' }, 'V5 %': { ayuda: 'Porcentaje de estrategias cuyo indicador de mayor nivel es N2 o superior.' },
          'Evidencia directa %': { ayuda: 'Porcentaje de estrategias con indicadores de aprendizaje demostrado o transferencia (N3–N4).' } }[campo] ?? {}) })) },
      { nombre: 'RA', descripcion: 'Cada resultado de aprendizaje único por matriz, si es evaluable (V3) y si tiene estrategia (V4).', filas: ra, congelarColumnas: 1,
        columnas: [{ campo: 'Matriz', ancho: 40 }, { campo: 'Programa', ancho: 22 }, { campo: 'Sede', ancho: 8 }, { campo: 'Resultado de aprendizaje', ancho: 80 }, { campo: 'RA genérico institucional', ancho: 14 },
          { campo: 'Vinculado a competencia', ancho: 14 }, { campo: 'Evaluable (V3)', ancho: 12 }, { campo: 'Motivo si no es evaluable', ancho: 36 }, { campo: 'Con estrategia mesocurricular (V4)', ancho: 18 }, { campo: 'Estrategias vinculadas', ancho: 12 }] },
      { nombre: 'Estrategias', descripcion: 'Cada estrategia del Paso 4 con su número de indicadores, instrumento y nivel máximo de evidencia.', filas: estrategias, congelarColumnas: 1,
        columnas: [{ campo: 'Matriz', ancho: 40 }, { campo: 'Programa', ancho: 22 }, { campo: 'Sede', ancho: 8 }, { campo: 'Estrategia', ancho: 60 }, { campo: 'N.º de indicadores', ancho: 12 }, { campo: 'Declara instrumento', ancho: 12 },
          { campo: 'Nivel máximo de evidencia', ancho: 28, ayuda: 'N1 implementación · N2 percepción · N3 aprendizaje demostrado · N4 transferencia · N5 efecto externo.' }, { campo: 'Cumple V5 (N2 o superior)', ancho: 14 }, { campo: 'Evidencia directa (N3–N4)', ancho: 14 }] },
      { nombre: 'Indicadores del Paso 4', descripcion: 'Cada indicador declarado en el Paso 4, con el nivel de evidencia que se le asignó.', filas: indicadores, congelarColumnas: 1,
        columnas: [{ campo: 'Matriz', ancho: 40 }, { campo: 'Sede', ancho: 8 }, { campo: 'Estrategia', ancho: 50 }, { campo: 'Indicador', ancho: 80 }, { campo: 'Nivel de evidencia', ancho: 28 }] },
    ],
  });
}

/** Taxonomías: contraste de cada RA con la base de verbos y resumen por programa. */
export function libroTaxonomias({ ra, grupos, etiqueta, alcance }) {
  const ETIQUETA = { Coincide: 'Coherente', 'Nivel difiere': 'Revisar nivel', 'Dominio difiere': 'Revisar dominio', 'Verbo fuera de la base': 'Verbo sin clasificar' };
  const filas = ra.map(r => ({
    Matriz: etiqueta.get(r.Matriz) ?? r.Matriz, Programa: r.Programa, Sede: r.Sede, 'Resultado de aprendizaje': r.RA, Verbo: r.Verbo, 'Tipo de saber': r['Tipo de saber'], Taxonomía: r['Taxonomía'],
    'Dominio declarado': r['Dominio declarado'], 'Nivel declarado': r['Nivel declarado'], 'Exigencia declarada (1–6)': r['Exigencia declarada'],
    'Dominio(s) según la base': r['Dominio(s) según la base'], 'Nivel según la base': r['Nivel según la base'], 'Diferencia de nivel (declarado − base)': r['Diferencia de nivel (declarado − base)'],
    Resultado: ETIQUETA[r.Contraste] ?? r.Contraste,
  }));
  const porPrograma = grupos.map(g => ({
    Programa: g.Programa, 'RA únicos': g['RA únicos'], '% Bloom': g['% Bloom'], '% BAK': g['% BAK'], 'Índice de exigencia (0–100)': g['Índice de exigencia'],
    '% Coherente': g['% Coincide'], '% Revisar nivel': g['% Nivel difiere'], '% Revisar dominio': g['% Dominio difiere'], '% Verbo sin clasificar': g['% Verbo fuera de la base'],
  }));
  return libroMarca({
    titulo: 'Taxonomías de los resultados de aprendizaje', alcance,
    hojas: [
      { nombre: 'Por programa', descripcion: 'Taxonomía usada, índice de exigencia y resultado del contraste de verbos, por programa.', filas: porPrograma, congelarColumnas: 1,
        columnas: [{ campo: 'Programa', ancho: 46 }, { campo: 'RA únicos' }, { campo: '% Bloom' }, { campo: '% BAK' },
          { campo: 'Índice de exigencia (0–100)', ancho: 16, ayuda: 'Nivel medio declarado llevado a una escala de 0 a 100 dentro de la taxonomía de cada RA. Es descriptivo: la exigencia adecuada depende del nivel de formación.' },
          { campo: '% Coherente', ayuda: 'RA cuyo dominio y nivel coinciden con los que la base institucional de verbos asigna a su verbo.' }, { campo: '% Revisar nivel' }, { campo: '% Revisar dominio' }, { campo: '% Verbo sin clasificar' }] },
      { nombre: 'Contraste por RA', descripcion: 'Cada RA único con lo que declara (dominio y nivel) y lo que indica la base de verbos. «Revisar» pide validación; no declara un error.', filas, congelarColumnas: 1,
        columnas: [{ campo: 'Matriz', ancho: 40 }, { campo: 'Programa', ancho: 24 }, { campo: 'Sede', ancho: 8 }, { campo: 'Resultado de aprendizaje', ancho: 80 }, { campo: 'Verbo', ancho: 14 }, { campo: 'Tipo de saber', ancho: 14 },
          { campo: 'Taxonomía', ancho: 11 }, { campo: 'Dominio declarado', ancho: 16 }, { campo: 'Nivel declarado', ancho: 16 }, { campo: 'Exigencia declarada (1–6)', ancho: 14 }, { campo: 'Dominio(s) según la base', ancho: 20 },
          { campo: 'Nivel según la base', ancho: 16 }, { campo: 'Diferencia de nivel (declarado − base)', ancho: 18, ayuda: 'Positiva: el RA declara un nivel más alto que el del verbo. Coincide si la diferencia es menor de 0,5.' },
          { campo: 'Resultado', ancho: 18 }] },
    ],
  });
}

/** Resumen ejecutivo: prioridades, valoración detallada de cada matriz, hallazgos y tendencias. */
export function libroResumen({ asociacion = [], cadena = [], prioridades, lectura, val, alertas, tendencias, etiqueta, criterios, alcance }) {
  const nombre = id => etiqueta.get(id) ?? id;
  const prio = prioridades.map(({ Matriz, Etiqueta, ...r }) => ({ Matriz: Etiqueta, 'Código de matriz': Matriz, ...r }));
  const valoracion = Object.entries(val).flatMap(([id, vs]) => vs.map(v => ({ Matriz: nombre(id), Variable: v.Variable, 'Criterio evaluado': v.Tramo, 'Regla de la plantilla': v.Criterio, Resultado: v.Resultado, Estado: v.Estado, 'Mediana del conjunto': v['Referencia (mediana)'], Observación: v.Observación ?? '' })));
  const hojas = [
    { nombre: 'Matrices por atender', descripcion: 'Matrices ordenadas por número de criterios en «No cumple» y luego en «Parcial».', filas: prio, congelarColumnas: 1,
      columnas: [{ campo: 'Matriz', ancho: 46 }, { campo: 'Código de matriz', ancho: 24 }, ...criterios.map(([v, e]) => ({ campo: v, titulo: `${v} ${e}`, ancho: 17 })), { campo: 'No cumple', ancho: 11 }, { campo: 'Parcial', ancho: 11 }]
        .filter(c => prio.length === 0 || c.campo in prio[0]) },
    { nombre: 'Valoración detallada', descripcion: 'Resultado y estado de cada matriz en cada criterio, con la regla de la plantilla y la mediana del conjunto.', filas: valoracion, congelarColumnas: 1,
      columnas: [{ campo: 'Matriz', ancho: 46 }, { campo: 'Variable', ancho: 10 }, { campo: 'Criterio evaluado', ancho: 34 }, { campo: 'Regla de la plantilla', ancho: 50 }, { campo: 'Resultado', ancho: 56 },
        { campo: 'Estado', ancho: 14, ayuda: 'Cumple: la regla se cumple en todos los casos; Parcial: en algunos; No cumple: en ninguno; Descriptiva: se informa sin calificar.' }, { campo: 'Mediana del conjunto', ancho: 30 }, { campo: 'Observación', ancho: 60 }] },
    { nombre: 'Lectura rápida', descripcion: 'Hechos principales del conjunto, sin umbrales.', filas: lectura.map(l => ({ 'Lectura rápida': l.replace(/<[^>]+>/g, '') })), columnas: [{ campo: 'Lectura rápida', ancho: 130 }] },
  ];
  if (cadena.length) hojas.splice(2, 0, { nombre: 'Competencias del perfil', descripcion: 'Cadena de cada competencia por tipo de saber: RA (Paso 3), estrategias mesocurriculares con instrumento (Paso 4) y asignaturas (Paso 5). Huérfana = algún eslabón falta.',
    filas: cadena.map(({ id, ...f }) => f), congelarColumnas: 1,
    columnas: [{ campo: 'Matriz', ancho: 44 }, { campo: 'Competencia', ancho: 80 }, { campo: 'Tipo', ancho: 12 }, { campo: 'Tipo de saber', ancho: 14 }, { campo: 'RA', ancho: 8 }, { campo: 'RA con estrategia', ancho: 12 }, { campo: 'Estrategias mesocurriculares', ancho: 16 },
      { campo: 'Asignaturas', ancho: 12 }, { campo: 'Semestres', ancho: 22 }, { campo: 'Estado', ancho: 28, ayuda: 'Completa, Parcial (algunos RA sin estrategia o asignatura), Sin RA, Sin estrategia mesocurricular o Sin asignaturas.' }, { campo: 'Falta', ancho: 60 }] });
  if (asociacion.length) hojas.splice(2, 0, { nombre: 'RA y estrategias', descripcion: 'Asociación de cada RA con estrategias mesocurriculares (Paso 4, con instrumento) y micro (asignaturas del Paso 5 con actividades declaradas).',
    filas: asociacion.map(({ id, ...f }) => f), congelarColumnas: 1,
    columnas: [{ campo: 'Matriz', ancho: 44 }, { campo: 'Resultado de aprendizaje', ancho: 80 }, { campo: 'Tipo', ancho: 20 }, { campo: 'Estrategia mesocurricular (Paso 4)', ancho: 18 }, { campo: 'Asignaturas con estrategias micro (Paso 5)', ancho: 18 },
      { campo: 'Asociación', ancho: 26, ayuda: 'Mesocurricular y micro, solo mesocurricular, solo micro o ninguna.' }] });
  if (alertas.length) hojas.push({ nombre: 'Hallazgos', descripcion: 'Alertas de tipo de saber y de completitud de datos con su recomendación.', filas: alertas.map(a => ({ Categoría: a.Categoría, Hallazgo: a.Hallazgo, Recomendación: a.Recomendación })),
    columnas: [{ campo: 'Categoría', ancho: 22 }, { campo: 'Hallazgo', ancho: 80 }, { campo: 'Recomendación', ancho: 70 }] });
  if (tendencias?.length) hojas.push({ nombre: 'Tendencias globales', descripcion: 'Presencia de cada tendencia en las asignaturas y programas de la vista, de menor a mayor.', filas: tendencias, congelarColumnas: 1,
    columnas: [{ campo: 'Tendencia', ancho: 50 }, { campo: 'Asignaturas' }, { campo: '% de asignaturas' }, { campo: 'Programas' }, { campo: '% de programas' }] });
  return libroMarca({ titulo: 'Resumen ejecutivo del análisis microcurricular', alcance, hojas });
}
