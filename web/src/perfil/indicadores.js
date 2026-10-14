// Indicadores de la asociación del perfil (V1) y exportación a Excel. Equivale a _indicadores_perfil y a la hoja de
// resultados de pagina_asociacion_perfil() en dashboard_tematico.py.
import { libroMarca } from '../export/excelMarca.js';

export const COLORES_ESTADO = {
  'Asociado en las tres capas': '#1fb2de',
  'Asociación parcial': '#FBAF17',
  'Sin asociación': '#ec0677',
};
export const ESTADOS = Object.keys(COLORES_ESTADO);

const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r1 = x => Math.round(x * 10) / 10;

export function mediana(xs) {
  const v = xs.filter(x => x !== null && x !== undefined && !Number.isNaN(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Porcentajes de un conjunto de ítems (solo los evaluables). */
export function indicadoresPerfil(items) {
  const ev = items.filter(i => i.evaluable);
  const n = ev.length;
  if (!n) return { Atributos: 0 };
  const cuenta = f => ev.filter(f).length;
  return {
    Atributos: n,
    '% Competencias': r1(100 * media(ev.map(i => i.Competencia))),
    '% RA': r1(100 * media(ev.map(i => i.RA))),
    '% Asignaturas': r1(100 * media(ev.map(i => i.Asignatura))),
    'V1 % (alguna capa)': r1(100 * cuenta(i => i.capas_con_respaldo >= 1) / n),
    '% Tres capas': r1(100 * cuenta(i => i.capas_con_respaldo === 3) / n),
    '% Sin asociación': r1(100 * cuenta(i => i.capas_con_respaldo === 0) / n),
    n_alguna: cuenta(i => i.capas_con_respaldo >= 1),
    n_tres: cuenta(i => i.capas_con_respaldo === 3),
    n_sin: cuenta(i => i.capas_con_respaldo === 0),
  };
}

/** Estado por componente del perfil (origen) como porcentaje de sus atributos evaluables. */
export function estadoPorComponente(items) {
  const por = new Map();
  for (const i of items.filter(x => x.evaluable)) {
    if (!por.has(i.origen)) por.set(i.origen, Object.fromEntries(ESTADOS.map(e => [e, 0])));
    por.get(i.origen)[i.estado]++;
  }
  return [...por].map(([origen, c]) => {
    const total = ESTADOS.reduce((s, e) => s + c[e], 0);
    return { origen, total, ...Object.fromEntries(ESTADOS.map(e => [e, c[e]])), ...Object.fromEntries(ESTADOS.map(e => [`% ${e}`, 100 * c[e] / total])) };
  });
}

/** Atributos sin ninguna alineación, con el contenido más cercano de la matriz (para el listado nominal). */
export function sinAsociacion(resultado, matriz) {
  const cercanos = new Map();
  for (const f of resultado.filas) {
    if (f.entidad !== 'NINGUNA') continue;
    const k = `${f.perfil}|${f.origen}|${f.item}`;
    if (!cercanos.has(k)) cercanos.set(k, []);
    cercanos.get(k).push(f);
  }
  return resultado.items.filter(i => i.evaluable && i.capas_con_respaldo === 0).map(i => {
    const c = cercanos.get(`${i.perfil}|${i.origen}|${i.item}`) ?? [];
    const mejor = [...c].sort((a, b) => ((b.cobertura ?? 0) + (b.similitud ?? 0)) - ((a.cobertura ?? 0) + (a.similitud ?? 0)))[0];
    return { Matriz: matriz, Perfil: i.perfil, Componente: i.origen, Atributo: i.item,
      'Capa más cercana': mejor?.capa ?? '', 'Contenido más cercano': mejor?.mas_cercana ?? '',
      Cobertura: mejor?.cobertura ?? null, Similitud: mejor?.similitud ?? null };
  });
}

/** Libro de Excel con las hojas Indicadores, Atributos, Evidencia y Método, con formato institucional y una hoja «Léeme». */
export async function libroExcel({ resultados, etiquetas, metodo, alcance = '' }) {
  const nombre = m => etiquetas.get(m) ?? m;
  const indicadores = [], atributos = [], evidencia = [];
  for (const [m, r] of resultados) {
    indicadores.push({ Matriz: nombre(m), ...renombrar(limpiar(indicadoresPerfil(r.items))) });
    for (const i of r.items) {
      atributos.push({ Matriz: nombre(m), Perfil: i.perfil, Componente: i.origen, Atributo: i.item, 'Evaluable': i.evaluable, 'Competencia': i.Competencia, 'RA': i.RA, 'Asignatura': i.Asignatura,
        'Capas con respaldo (0–3)': i.capas_con_respaldo, Estado: i.estado });
    }
    for (const f of r.filas) {
      if (f.entidad === 'NINGUNA') continue;
      evidencia.push({ Matriz: nombre(m), Atributo: f.item, Capa: f.capa, Respaldo: f.entidad, Nivel: f.nivel, Evidencia: f.evidencia });
    }
  }
  return libroMarca({
    titulo: 'Asociación del perfil de egreso con el currículo (V1)', alcance,
    hojas: [
      { nombre: 'Indicadores', descripcion: 'Una fila por matriz: porcentaje de atributos del perfil con respaldo en competencias, RA y asignaturas.', filas: indicadores, congelarColumnas: 1,
        columnas: Object.keys(indicadores[0] ?? { Matriz: 1 }).map(campo => ({ campo, ...({ Matriz: { ancho: 44 }, 'V1 % (alguna capa)': { ayuda: 'Porcentaje de atributos evaluables con respaldo en al menos una capa. Es el indicador V1.' },
          '% Tres capas': { ayuda: 'Porcentaje de atributos respaldados en competencias, RA y asignaturas a la vez.' }, '% Sin asociación': { ayuda: 'Porcentaje de atributos sin respaldo en ninguna capa.' } }[campo] ?? {}) })) },
      { nombre: 'Atributos', descripcion: 'Cada atributo del perfil profesional y ocupacional, con las capas que lo respaldan y su estado. 1 = hay respaldo en esa capa, 0 = no.', filas: atributos, congelarColumnas: 1,
        columnas: [{ campo: 'Matriz', ancho: 40 }, { campo: 'Perfil', ancho: 14 }, { campo: 'Componente', ancho: 24 }, { campo: 'Atributo', ancho: 70 }, { campo: 'Evaluable', ancho: 11 }, { campo: 'Competencia', ancho: 13 }, { campo: 'RA', ancho: 8 },
          { campo: 'Asignatura', ancho: 11 }, { campo: 'Capas con respaldo (0–3)', ancho: 14 }, { campo: 'Estado', ancho: 26, ayuda: 'Asociado en las tres capas, asociación parcial (una o dos capas) o sin asociación.' }] },
      { nombre: 'Evidencia', descripcion: 'El texto de la matriz que respalda cada asociación y su nivel (explícito si la cobertura de conceptos alcanza el umbral; parcial si además hay similitud semántica).', filas: evidencia, congelarColumnas: 1,
        columnas: [{ campo: 'Matriz', ancho: 40 }, { campo: 'Atributo', ancho: 60 }, { campo: 'Capa', ancho: 16 }, { campo: 'Respaldo', ancho: 44 }, { campo: 'Nivel', ancho: 12 }, { campo: 'Evidencia', ancho: 80 }] },
      { nombre: 'Método', descripcion: 'Parámetros, versión y huella de la configuración y archivos usados: permiten reproducir el cálculo.', filas: metodo.map(([Elemento, Valor]) => ({ Elemento, Valor: String(Valor) })),
        columnas: [{ campo: 'Elemento', ancho: 44 }, { campo: 'Valor', ancho: 90 }] },
    ],
  });
}

const renombrar = o => ({ ...o });

function limpiar(o) {
  const { n_alguna, n_tres, n_sin, ...resto } = o;
  void n_alguna; void n_tres; void n_sin;
  return resto;
}

/** Filas de la hoja «Método»: trazabilidad para reproducir el cálculo. */
export function filasMetodo({ cfg, huella, semantica, archivos }) {
  const f = [['Fecha de cálculo', new Date().toISOString().slice(0, 16).replace('T', ' ')],
    ['Versión de la configuración', cfg.VERSION], ['Huella SHA-256 de la configuración', huella],
    ['Modelo semántico', semantica ? cfg.MODELO_SEMANTICO : `${cfg.MODELO_SEMANTICO} (NO disponible: solo cobertura léxica)`],
    ['Umbral explícito', cfg.PARAMS.explicita], ['Umbral parcial', cfg.PARAMS.parcial],
    ['Similitud semántica mínima', cfg.PARAMS.semantica], ['Núcleo ponderado', cfg.PARAMS.nucleo],
    ['Factor de rol', cfg.FACTOR_ROL], ['Raíz (letras)', cfg.RAIZ],
    ['Umbral de vocabulario de contexto', cfg.UMBRAL_CONTEXTO], ['Peso del contexto', cfg.PESO_CONTEXTO],
    ['Entradas de sinónimos', cfg.SINONIMOS.size]];
  for (const a of archivos) f.push([`Archivo: ${a.nombre}`, a.huella ?? '']);
  return f;
}
