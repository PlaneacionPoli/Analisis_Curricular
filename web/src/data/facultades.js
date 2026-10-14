// Facultad de cada programa. Las matrices no la traen: se asigna por el nombre del programa con la oferta académica oficial
// (public/data/facultades.json, generado por tools/exportar_facultades.py).
export const SIN_FACULTAD = 'Sin facultad asignada';
const ENLACES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'en', 'con', 'y', 'e', 'para', 'por']);

/** Misma normalización que clave() de tools/exportar_facultades.py. */
export function clave(texto) {
  const t = String(texto ?? '').replace(/\([^)]*\)/g, ' ').normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase();
  return t.replace(/[^a-z0-9]+/g, ' ').split(' ').filter(p => p && !ENLACES.has(p)).join(' ');
}

let tabla = null;
async function cargarTabla() {
  if (!tabla) {
    try { tabla = await (await fetch(`${import.meta.env.BASE_URL}data/facultades.json`)).json(); } catch { tabla = { programas: {}, alias: {} }; }
  }
  return tabla;
}

export function facultadDe(programa, t) {
  const k = clave(programa);
  return t.programas[k] ?? t.programas[t.alias?.[k]] ?? SIN_FACULTAD;
}

/** Agrega la columna «Facultad» a las filas consolidadas (se modifica en el lugar). */
export async function asignarFacultades(filas) {
  const t = await cargarTabla();
  const memo = new Map();
  for (const f of filas) {
    if (!memo.has(f.Programa)) memo.set(f.Programa, facultadDe(f.Programa, t));
    f.Facultad = memo.get(f.Programa);
  }
  return filas;
}
