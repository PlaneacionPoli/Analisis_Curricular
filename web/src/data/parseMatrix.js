// Lectura de UNA matriz (.xlsx): equivalente por archivo a procesar_archivos() y leer_totales_programa().
// Puro (sin DOM): corre en un Web Worker y en Node (pruebas de paridad).
import * as XLSX from 'xlsx';
import {
  aNumero, aTexto, buscarColumna, esNulo, normAscii, normNombreColumna, sinTildes, titleCase,
} from './util.js';

export const HOJA_ESTRATEGIAS = 'Paso 5 Estrategias micro';
export const HOJA_PERFIL = 'Paso1 Analisis perfil egreso';

export const COLUMNAS_CANONICAS = ['Tipo de Saber', 'Resultado de aprendizaje', 'Semestre',
  'Nombre asignatura o modulo', 'Indicadores de logro asignatura o modulo', 'Creditos', 'Nucleos tematicos',
  'Tipologia', 'Actividades de aprendizaje', 'Actividades de evaluacion', 'Acciones de retroalimentacion'];

// Columnas que Excel guarda como celdas combinadas: el valor solo está en la primera fila del bloque.
export const COLUMNAS_CELDA_COMBINADA = ['Semestre', 'Nombre asignatura o modulo',
  'Indicadores de logro asignatura o modulo', 'Presencial', 'Virtual', 'Tipologia',
  'B.Institucional', 'B.Disciplinar', 'B.Electivo', 'Creditos', 'Numero de horas trabajo directo',
  'Numero de horas trabajo independiente', 'Total de horas', 'Nucleos tematicos', 'Actividades de aprendizaje',
  'Actividades de evaluacion', 'Acciones de retroalimentacion'];

const SEDES = { PBOG: 'Bogotá', PMED: 'Medellín', VNAL: 'Nacional', HBOG: 'Bogotá', HMED: 'Medellín', HVAL: 'Virtual' };
const MODALIDADES = { P: 'Presencial', V: 'Virtual', H: 'Híbrido' };

/** extract_modality_sede */
export function modalidadSede(nombre) {
  const base = nombre.replace('.xlsx', '').replace('.xls', '');
  const codigo = base.length >= 4 ? base.slice(-4) : '';
  const modalidad = MODALIDADES[codigo[0]] ?? 'No identificado';
  const sede = SEDES[codigo] ?? (codigo || 'No identificado');
  return { modalidad, sede, codigo };
}

/** Nombre del programa derivado del archivo. */
export function programaDeArchivo(nombre) {
  return nombre
    .replace('FormatoRA_', '').replace('FormatoRA-', '')
    .replace('_PBOG', '').replace('_VNAL', '').replace('_PMED', '')
    .replace('_HBOG', '').replace('_HMED', '').replace('_HVAL', '')
    .replace('.xlsx', '').replace('.xls', '')
    .trim();
}

/** _nombre_matriz: unidad programa-sede. */
export function nombreMatriz(nombre) {
  return nombre.replace(/^FormatoRA[_-]|\.xlsx?$/g, '');
}

function filasDeHoja(ws) {
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true });
}

function nombresUnicos(cabecera) {
  const vistos = new Map();
  return cabecera.map((c, i) => {
    let n = esNulo(c) ? `Unnamed: ${i}` : String(c);
    const k = vistos.get(n) ?? 0;
    vistos.set(n, k + 1);
    return k ? `${n}.${k}` : n;
  });
}

/** normalizar_columnas: sin tildes y, en las columnas del análisis, con su nombre canónico. */
export function normalizarColumnas(columnas) {
  const canon = new Map(COLUMNAS_CANONICAS.map(c => [normNombreColumna(c), c]));
  return columnas.map(c => {
    const sin = sinTildes(c);
    return canon.get(normNombreColumna(sin)) ?? sin;
  });
}

const ROMANOS = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };

/** _normalizar_semestre: entero desde 3, '3', '3.0' o romanos; lo no reconocible queda intacto. */
export function normalizarSemestre(v) {
  if (esNulo(v)) return v;
  const t = String(v).trim().toUpperCase();
  if (/^\d+(\.0+)?$/.test(t)) return Math.trunc(Number(t));
  return ROMANOS[t] ?? v;
}

function leerNombrePrograma(wb) {
  const ws = wb.Sheets[HOJA_PERFIL];
  if (!ws) return null;
  const filas = filasDeHoja(ws);
  const v = filas[2]?.[0];
  return v !== null && v !== undefined && String(v).trim() ? String(v).trim() : null;
}

/** leer_totales_programa para una matriz: totales oficiales declarados al final de la hoja del Paso 5. */
export function leerTotales(ws) {
  const raw = filasDeHoja(ws);
  const ncols = raw.reduce((m, r) => Math.max(m, r.length), 0);
  const cab = raw[1] ?? [];
  let credIdx = cab.findIndex(v => !esNulo(v) && normAscii(v).includes('dito'));
  if (credIdx < 0) credIdx = 9;

  const aEntero = v => {
    if (esNulo(v)) return 0;
    const n = typeof v === 'number' ? v : Number(String(v).trim());
    return Number.isFinite(n) && String(v).trim() !== '' ? Math.trunc(n) : 0;
  };
  const pt = {};
  for (let r = 0; r < raw.length; r++) {
    for (let c = 0; c < ncols; c++) {
      const cell = raw[r][c];
      if (esNulo(cell)) continue;
      const cn = normAscii(cell);
      if (!('asignaturas' in pt) &&
          (cn.includes('total modulos') || cn.includes('total asignaturas del programa') ||
           (cn.includes('total materias') && cn.includes('asignatura')))) {
        if (c + 1 < ncols) {
          const val = aEntero(raw[r][c + 1]);
          if (val > 0) pt.asignaturas = val;
        }
      }
      const val = credIdx < ncols ? aEntero(raw[r][credIdx]) : 0;
      if (cn.includes('total creditos programa') || cn.includes('total creditos del programa')) pt.total = val;
      else if (cn.includes('bloque inst')) pt.institucional = val;
      else if (cn.includes('bloque disc')) pt.disciplinar = val;
      else if (cn.includes('bloque elec')) pt.electivo = val;
      else if (cn.includes('componente fund') || cn.includes('fundamentacion')) pt.fundamentacion = val;
      else if (cn.includes('componente prof') || cn.includes('profundizacion')) pt.profundizacion = val;
    }
  }
  return pt;
}

/**
 * Lee una matriz. Devuelve { nombre, ok, causa?, avisos, programa, matriz, ...meta, columnas, filas, totales }.
 * `filas` son objetos {columna: valor}; las celdas combinadas ya están rellenadas y `_bloque_inicio` marca
 * la fila que traía el valor original.
 */
export function parseMatriz(buffer, nombre) {
  const meta = modalidadSede(nombre);
  const res = { nombre, ok: false, avisos: [], matriz: nombreMatriz(nombre), ...meta };
  const progArchivo = programaDeArchivo(nombre);
  let wb;
  try {
    wb = XLSX.read(buffer, { type: buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer) ? 'array' : 'buffer' });
  } catch (e) {
    return { ...res, causa: `No se pudo abrir el archivo: ${String(e.message || e).slice(0, 80)}`, programa: progArchivo };
  }

  let programa = progArchivo;
  try { programa = leerNombrePrograma(wb) ?? progArchivo; } catch { /* se mantiene el nombre del archivo */ }
  res.programa = programa;

  const ws = wb.Sheets[HOJA_ESTRATEGIAS];
  if (!ws) return { ...res, causa: 'Hoja no encontrada o formato inválido' };

  const raw = filasDeHoja(ws);
  const cabecera = raw[1] ?? [];
  const datos = raw.slice(2);
  if (!datos.length) return { ...res, causa: 'Archivo vacío' };

  const nombres = normalizarColumnas(nombresUnicos(cabecera));
  const util = nombres.map((n, j) => !n.startsWith('Unnamed: ') || datos.some(r => !esNulo(r[j])));
  const columnas = nombres.filter((_, j) => util[j]);
  const filas = datos.map(r => {
    const o = {};
    nombres.forEach((n, j) => { if (util[j]) o[n] = esNulo(r[j]) ? null : r[j]; });
    return o;
  });

  // Rellenar hacia abajo las celdas combinadas (ffill), marcando antes el inicio de cada bloque.
  const tieneAsig = columnas.includes('Nombre asignatura o modulo');
  for (const f of filas) f._bloque_inicio = tieneAsig ? f['Nombre asignatura o modulo'] !== null : true;
  for (const col of COLUMNAS_CELDA_COMBINADA) {
    if (!columnas.includes(col)) continue;
    let previo = null;
    for (const f of filas) {
      if (f[col] === null) f[col] = previo; else previo = f[col];
    }
  }

  const nivelCol = buscarColumna(columnas, 'Nivel');
  if (nivelCol !== null) {
    for (const f of filas) {
      const t = aTexto(f[nivelCol]).trim();
      f.Nivel = titleCase(t === 'nan' || t === '' ? 'No identificado' : t);
    }
    if (!columnas.includes('Nivel')) columnas.push('Nivel');
  }
  const compCol = buscarColumna(columnas, 'Componente academico');
  if (compCol !== null) {
    for (const f of filas) {
      const t = aTexto(f[compCol]).trim();
      f['Componente academico'] = t === 'nan' || t === '' ? 'No identificado' : t;
    }
    if (!columnas.includes('Componente academico')) columnas.push('Componente academico');
  }

  const requeridas = ['Tipo de Saber', 'Resultado de aprendizaje', 'Nombre asignatura o modulo',
    'Indicadores de logro asignatura o modulo', 'Creditos', 'Semestre'];
  const faltan = requeridas.filter(c => buscarColumna(columnas, c) === null);
  if (faltan.length) res.avisos.push(`${nombre}: Faltan columnas requeridas - ${faltan.join(', ')}`);

  for (const f of filas) {
    f.Programa = programa;
    f.Matriz = res.matriz;
    f.Modalidad = meta.modalidad;
    f.Sede = meta.sede;
    f.Codigo = meta.codigo;
  }
  columnas.push('_bloque_inicio', 'Programa', 'Matriz', 'Modalidad', 'Sede', 'Codigo');

  let pt = {};
  try { pt = leerTotales(ws); } catch { /* sin totales oficiales */ }
  const claves = [...new Set([progArchivo, programa])];

  return { ...res, ok: true, columnas, filas, totales: { claves, valores: pt } };
}
