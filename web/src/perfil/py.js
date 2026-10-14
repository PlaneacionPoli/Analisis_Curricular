// Helpers para portar expresiones regulares y cadenas de Python (módulo re y str) a JavaScript con el mismo resultado.

const L = '[\\p{L}\\p{N}_]';
// \b de Python es Unicode; el de JavaScript solo reconoce ASCII
const LIMITE = `(?:(?<=${L})(?!${L})|(?<!${L})(?=${L}))`;

/** Compila una expresión escrita con la sintaxis de Python (\b y \w Unicode); siempre con el modificador u. */
export function rx(src, flags = '') {
  const s = src.replace(/\\b/g, LIMITE).replace(/\\w/g, L);
  return new RegExp(s, flags.includes('u') ? flags : flags + 'u');
}

/** unicodedata.normalize('NFKD') + encode('ascii', 'ignore') + lower(): sin tildes ni caracteres no ASCII. */
export function aAscii(t) {
  return String(t).normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase();
}

/** _plano de atributos_perfil: sin tildes y en minúsculas con la MISMA longitud (índices alineados). */
export function plano(texto) {
  let out = '';
  for (const c of String(texto)) {
    if (c === 'ñ' || c === 'Ñ') { out += 'n'; continue; }
    const a = aAscii(c);
    out += a || c;
  }
  return out;
}

/** str.strip(chars) */
export function strip(s, chars) {
  const set = new Set(chars);
  let i = 0, j = s.length;
  if (chars === undefined) return s.trim();
  while (i < j && set.has(s[i])) i++;
  while (j > i && set.has(s[j - 1])) j--;
  return s.slice(i, j);
}

/** str.lstrip(chars) */
export function lstrip(s, chars) {
  const set = new Set(chars);
  let i = 0;
  while (i < s.length && set.has(s[i])) i++;
  return s.slice(i);
}

/** str.capitalize(): primera mayúscula y el resto en minúsculas */
export function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;
}

/** re.split(patron, texto, maxsplit): incluye los grupos de captura como Python. */
export function splitRe(re, texto, maxsplit = 0) {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  const out = [];
  let ultimo = 0, n = 0, m;
  while ((m = g.exec(texto)) !== null) {
    if (m[0] === '') { g.lastIndex++; continue; }
    if (maxsplit && n >= maxsplit) break;
    out.push(texto.slice(ultimo, m.index), ...m.slice(1).map(x => (x === undefined ? null : x)));
    ultimo = m.index + m[0].length;
    n++;
  }
  out.push(texto.slice(ultimo));
  return out;
}

/** re.sub con función de reemplazo o cadena (sin referencias \1; se usan funciones). */
export function sub(re, repl, texto) {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  return texto.replace(g, repl);
}

/** Coincidencias como matchAll con índices (finditer). */
export function finditer(re, texto) {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  return [...texto.matchAll(g)];
}

/** re.match: ancla al inicio */
export function match(re, texto) {
  const m = re.exec(texto);
  return m && m.index === 0 ? m : null;
}

/** re.fullmatch */
export function fullmatch(re, texto) {
  const g = new RegExp(`^(?:${re.source})$`, re.flags.replace('g', ''));
  return g.exec(texto);
}

/** Cadena sin espacios repetidos, como re.sub(r'\s+', ' ', t) */
export function colapsar(t) {
  return String(t).replace(/\s+/gu, ' ');
}

/** str.split() sin argumento */
export function palabras(t) {
  return String(t).split(/\s+/u).filter(Boolean);
}
