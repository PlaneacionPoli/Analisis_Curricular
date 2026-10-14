// Utilidades de texto equivalentes a las de dashboard_tematico.py (unicodedata + re).

const COMBINING = /[̀-ͯ]/g;

/** NFKD sin marcas diacríticas. */
export function sinTildes(s) {
  return String(s).normalize('NFKD').replace(COMBINING, '');
}

/** _normalize_column_name: sin tildes, minúsculas y sin espacios, guiones, guiones bajos ni puntos. */
export function normNombreColumna(s) {
  return sinTildes(s).toLowerCase().replace(/[\s\-_.]+/g, '');
}

/** _normalize_value: sin tildes, minúsculas y solo caracteres alfanuméricos. */
export function normValor(s) {
  return sinTildes(s).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

/** _norm de leer_totales_programa: strip + minúsculas + ASCII (descarta lo no ASCII). */
export function normAscii(s) {
  return String(s).trim().toLowerCase().normalize('NFKD').replace(/[^\x00-\x7f]/g, '');
}

/** str.title() de Python. */
export function titleCase(s) {
  return String(s).toLowerCase().replace(/(^|[^\p{L}])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}

/** Valores que pandas.read_excel convierte en NaN por defecto. */
const NA = new Set(['', '#N/A', '#N/A N/A', '#NA', '-1.#IND', '-1.#QNAN', '-NaN', '-nan', '1.#IND', '1.#QNAN',
  '<NA>', 'N/A', 'NA', 'NULL', 'NaN', 'None', 'n/a', 'nan', 'null']);

export function esNulo(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'number') return Number.isNaN(v);
  if (typeof v === 'string') return NA.has(v);
  return false;
}

/** astype(str) de pandas: NaN → 'nan'. */
export function aTexto(v) {
  return esNulo(v) ? 'nan' : String(v);
}

/** pd.to_numeric(errors='coerce'): número o null. */
export function aNumero(v) {
  if (esNulo(v)) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const t = String(v).trim();
  if (t === '' || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return null;
  return Number(t);
}

/** Marcadores de «sí» en columnas de bloque o componente. */
export const MARCADORES = new Set(['x', 'si', 's', '1', 'true', 't', 'v', 'verdadero']);

export function esMarcador(v) {
  return MARCADORES.has(normValor(aTexto(v)));
}

/** Busca una columna ignorando mayúsculas, espacios, tildes y puntuación (_find_column). */
export function buscarColumna(columnas, objetivo) {
  const t = normNombreColumna(objetivo);
  return columnas.find(c => normNombreColumna(c) === t) ?? null;
}

export function unicos(arr) {
  return [...new Set(arr)];
}

/** Orden de cadenas por punto de código, como el sort de Python. */
export function cmp(a, b) {
  const x = String(a), y = String(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

export function contar(arr, f = x => x) {
  const m = new Map();
  for (const x of arr) {
    const k = f(x);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}
