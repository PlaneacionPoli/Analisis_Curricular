// Port de src/nucleos_cleaner.py (filtros estrictos desactivados, como en config.NUCLEOS_CONFIG).

// Numeración al inicio de línea o tras dos o más espacios (D7b)
const NUMERACION = /(?:^\s*|(?<=\S)\s{2,})(\d+(?:\.\d+)*)(?:[.)]\s*|\s*(?=[^\d\s]))(?=[^\d\s])/gm;

/** Separa el contenido de una celda en núcleos individuales (sin la numeración). */
export function tokenizarCelda(celda) {
  if (celda == null) return [];
  const texto = String(celda).trim();
  if (!texto || texto === 'nan') return [];
  const marcas = [...texto.matchAll(NUMERACION)];
  const partes = !marcas.length || marcas[0].index > 3
    ? texto.split('\n')
    : marcas.map((a, i) => texto.slice(a.index + a[0].length, marcas[i + 1] ? marcas[i + 1].index : texto.length));
  return partes.map(p => p.replace(/\s+/g, ' ').trim()).filter(s => s && s !== 'nan');
}

/** Elimina numeración inicial y viñetas. */
export function limpiarNucleo(texto) {
  let t = texto.trim();
  t = t.replace(/^\d+[.)]\s*/, '');
  t = t.replace(/^[•\-–—*]\s*/, '');
  return t.trim();
}

/** Control mínimo: [valido, razón]. */
export function esNucleoValido(texto) {
  const t = texto.trim();
  if (!t) return [false, 'Vacío'];
  if (!/\p{L}/u.test(t)) return [false, 'Solo números o caracteres especiales'];
  if (t.startsWith('[')) return [false, 'Instrucción de la plantilla'];
  return [true, ''];
}

/** Núcleos válidos y limpios de una celda (equivale a filtrar_nucleos_dataframe para una fila). */
export function nucleosValidos(celda) {
  const validos = [], rechazados = [];
  for (const it of tokenizarCelda(celda)) {
    const limpio = limpiarNucleo(it);
    const [ok, razon] = esNucleoValido(limpio);
    (ok ? validos : rechazados).push(ok ? limpio : { texto: limpio, razon });
  }
  return { validos, rechazados };
}

/** Clave sin tildes y en minúsculas (mapa de integración). */
export const claveNucleo = t => t.normalize('NFKD').toLowerCase().replace(/[^\x00-\x7f]/g, '');
