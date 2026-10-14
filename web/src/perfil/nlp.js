// Lemas y categorías gramaticales sin spaCy: un léxico forma → (lema, categoría, vacía) generado con spaCy sobre el texto
// de las matrices (web/tools/exportar_perfil.py) y un respaldo por reglas para formas que el léxico no contiene.
import { norm } from './leerMatriz.js';

const IRREGULARES = {
  promueve: 'promover', resuelve: 'resolver', demuestra: 'demostrar', sostiene: 'sostener', mantiene: 'mantener',
  obtiene: 'obtener', atiende: 'atender', entiende: 'entender', invierte: 'invertir', convierte: 'convertir',
  sugiere: 'sugerir', adquiere: 'adquirir', sirve: 'servir', mide: 'medir', sigue: 'seguir', elige: 'elegir',
  construye: 'construir', contribuye: 'contribuir', distribuye: 'distribuir', incluye: 'incluir', influye: 'influir',
  conduce: 'conducir', produce: 'producir', ofrece: 'ofrecer', reconoce: 'reconocer',
};
export const LEMAS_GENERICOS = new Set(['cualquier', 'tipo', 'especialmente', 'distinto', 'diferente', 'clave', 'forma',
  'manera', 'nivel', 'ambito', 'capaz', 'capacidad', 'grande', 'nuevo', 'propio', 'general', 'campo', 'existente',
  'emergente', 'junior', 'ser', 'estar', 'tener', 'hacer', 'poder', 'permitir', 'contar', 'realizar', 'llevar']);
const NEGACION = /\b(no|sin)\s+(animo de lucro|[a-z]+)/gi;
const CATEGORIAS_DE_CONTENIDO = new Set(['N', 'P', 'A', 'V']);

let lexico = new Map();   // forma → [lema|null, categoría, vacía]
let vacias = new Set();

/** Carga el léxico (objeto {f, stop} del JSON generado). */
export function cargarLexico(datos) {
  lexico = new Map();
  for (const [forma, v] of Object.entries(datos.f)) {
    const [lema, pos, stop] = v.split('|');
    lexico.set(forma, [lema || forma, pos, stop === '1']);
  }
  vacias = new Set(datos.stop);
}

export function tamanoLexico() {
  return lexico.size;
}

/** Análisis de respaldo para una forma que el léxico no contiene (heurística por sufijos). */
function respaldo(forma) {
  if (vacias.has(forma)) return [forma, 'O', true];
  if (/(?:ar|er|ir)$/.test(forma) && forma.length > 4) return [forma, 'V', false];
  if (/(?:ando|iendo|yendo)$/.test(forma)) return [forma.replace(/(?:ando)$/, 'ar').replace(/(?:iendo|yendo)$/, 'er'), 'V', false];
  if (/(?:cion|sion|dad|tad|miento|aje|ismo|ista|ura|ncia|encia)(?:es)?$/.test(forma)) {
    return [forma.replace(/es$/, '').replace(/(?<=[cdt]ion|ad|ura|ncia)s$/, ''), 'N', false];
  }
  if (/(?:ico|ica|ivo|iva|oso|osa|ble|nte|al|ar)(?:es|s)?$/.test(forma)) {
    return [forma.replace(/(?<=[aeiou])s$/, '').replace(/(?<=[bcdfglmnprtvz])es$/, ''), 'A', false];
  }
  let lema = forma;
  if (/[aeiou]s$/.test(forma)) lema = forma.slice(0, -1);
  else if (/[bcdfglmnrtvz]es$/.test(forma)) lema = forma.slice(0, -2);
  return [lema, 'N', false];
}

/** (lema, categoría) de las palabras de contenido; la negación se une a la palabra siguiente. */
export function tokens(texto) {
  let t = norm(texto);
  t = t.replace(NEGACION, (_, a, b) => a + '_' + b.replace(/ /g, '_'));
  const out = [];
  for (const tok of t.split(' ')) {
    if (!tok) continue;
    const conGuion = tok.includes('_');
    const [lemaLex, pos, stop] = lexico.get(tok) ?? respaldo(tok);
    let lema = conGuion ? tok : lemaLex;
    lema = (IRREGULARES[tok] ?? lema).replace(/ /g, '_');
    if ((CATEGORIAS_DE_CONTENIDO.has(pos) || conGuion) && !stop && tok.length > 2 && !LEMAS_GENERICOS.has(lema)) {
      out.push([lema, pos]);
    }
  }
  return out;
}

export function lemas(texto) {
  return new Set(tokens(texto).map(([l]) => l));
}
