// Port de src/tendencias.py (regla única de asignación, D21) y del análisis de tendencias del dashboard.
// La configuración (lista de tendencias y regla) se guarda en localStorage como conveniencia del navegador.

const CLAVE = 'tendencias_config_v1';
let config = null;       // {TENDENCIAS_GLOBALES, REGLA, VERSION}
let defecto = null;
const oyentes = new Set();
export const suscribirConfig = f => { oyentes.add(f); return () => oyentes.delete(f); };

const REGLA_DEFECTO = { nombre_min_terminos: 1, contenido_min_puntos: 2, peso_termino_compuesto: 2, peso_termino_simple: 1 };

export function normalizar(texto) {
  const t = String(texto ?? '').normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase();
  return t.replace(/[^a-z0-9. ]/g, ' ').replace(/\s+/g, ' ').trim();
}

const patrones = new Map();
function patron(termino) {
  if (!patrones.has(termino)) {
    const n = normalizar(termino).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    patrones.set(termino, new RegExp(`(?<![a-z0-9])${n}(?![a-z0-9])`));
  }
  return patrones.get(termino);
}

/** Términos que activan la tendencia, o [] si no se cumple la regla. Recibe textos ya normalizados. */
export function terminosPresentes(nombreN, contenidoN, keywords, regla) {
  const r = { ...REGLA_DEFECTO, ...(regla ?? {}) };
  const enNombre = keywords.filter(k => patron(k).test(nombreN));
  const enCont = keywords.filter(k => patron(k).test(contenidoN));
  const puntos = enCont.reduce((s, k) => s + (k.trim().includes(' ') ? r.peso_termino_compuesto : r.peso_termino_simple), 0);
  if (enNombre.length >= r.nombre_min_terminos || puntos >= r.contenido_min_puntos) return [...new Set([...enNombre, ...enCont])].sort();
  return [];
}

export async function cargarConfig() {
  if (config) return config;
  const r = await fetch(`${import.meta.env.BASE_URL}data/config_tendencias.json`);
  defecto = await r.json();
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) ?? 'null');
    if (g?.TENDENCIAS_GLOBALES && Object.keys(g.TENDENCIAS_GLOBALES).length) config = { ...defecto, ...g, REGLA: { ...REGLA_DEFECTO, ...(g.REGLA ?? {}) } };
  } catch { /* sin almacenamiento */ }
  config ??= structuredClone(defecto);
  return config;
}

export const configActual = () => config;
export const hayConfig = () => !!config;

export function guardarConfig(nueva) {
  config = { ...config, ...nueva };
  try { localStorage.setItem(CLAVE, JSON.stringify(config)); } catch { /* sin almacenamiento */ }
  cache.clear();
  oyentes.forEach(f => f());
}

export function restaurarConfig() { guardarConfig(structuredClone(defecto)); }

// ── Análisis ─────────────────────────────────────────────────────────────────

const cache = new Map();   // filas → Map<fila, {tid: [kw]}>

/** Por cada fila, las tendencias que se activan y con qué términos (se calcula una vez por conjunto de filas y configuración). */
export function aciertosPorFila(filas) {
  if (cache.has(filas)) return cache.get(filas);
  const { TENDENCIAS_GLOBALES: T, REGLA } = config;
  const m = new Map();
  for (const f of filas) {
    const nombre = normalizar(f['Nombre asignatura o modulo']);
    const cont = normalizar(f.Texto_Completo);
    const o = {};
    for (const [tid, t] of Object.entries(T)) {
      const k = terminosPresentes(nombre, cont, t.keywords, REGLA);
      if (k.length) o[tid] = k;
    }
    m.set(f, o);
  }
  cache.set(filas, m);
  return m;
}

const nombreAsig = f => {
  const a = f['Nombre asignatura o modulo'];
  const s = a == null ? '' : String(a).trim();
  return s === 'nan' ? '' : s;
};

/**
 * Resumen para un subconjunto de filas. `aciertos` viene de aciertosPorFila (sobre todas las filas).
 * Cobertura = asignaturas únicas (por nombre) que abordan la tendencia / asignaturas únicas del subconjunto.
 */
export function resumirTendencias(filasSub, aciertos) {
  const T = config.TENDENCIAS_GLOBALES;
  const total = new Set(filasSub.map(nombreAsig).filter(Boolean)).size;   // nunique ignora nulos
  const asig = Object.fromEntries(Object.keys(T).map(t => [t, new Set()]));
  const porMatriz = Object.fromEntries(Object.keys(T).map(t => [t, new Map()]));
  const detalle = Object.fromEntries(Object.keys(T).map(t => [t, new Map()]));   // tid → matriz → hallazgos
  for (const f of filasSub) {
    const a = nombreAsig(f);
    const hit = aciertos.get(f) ?? {};
    for (const [tid, kws] of Object.entries(hit)) {
      if (a) { asig[tid].add(a); if (!porMatriz[tid].has(f.Matriz)) porMatriz[tid].set(f.Matriz, new Set()); porMatriz[tid].get(f.Matriz).add(a); }
      if (!detalle[tid].has(f.Matriz)) detalle[tid].set(f.Matriz, []);
      const campos = [], textos = {};
      const ctx = { RA: f['Resultado de aprendizaje'], Nucleos: f['Nucleos tematicos'], Indicadores: f['Indicadores de logro asignatura o modulo'], Proceso: f['Proceso Responsable'] };
      for (const kw of kws) for (const [c, tx] of Object.entries(ctx)) if (tx && patron(kw).test(normalizar(tx)) && !campos.includes(c)) { campos.push(c); textos[c] = String(tx); }
      detalle[tid].get(f.Matriz).push({ asignatura: a || 'Sin nombre', keywords: kws, campos, textos });
    }
  }
  const conteo = Object.fromEntries(Object.keys(T).map(t => [t, asig[t].size]));
  const cobertura = Object.fromEntries(Object.keys(T).map(t => [t, total ? conteo[t] / total * 100 : 0]));
  return { total, asig, conteo, cobertura, porMatriz, detalle, ausentes: Object.keys(T).filter(t => cobertura[t] === 0) };
}

export function validarImportacion(obj) {
  const nuevas = obj?.TENDENCIAS_GLOBALES ?? obj;
  if (!nuevas || typeof nuevas !== 'object' || Array.isArray(nuevas) || !Object.keys(nuevas).length) throw new Error('El JSON no contiene tendencias.');
  for (const [id, t] of Object.entries(nuevas)) {
    if (!t || !Array.isArray(t.keywords) || !t.keywords.length || typeof t.descripcion !== 'string') throw new Error(`La tendencia «${id}» necesita «descripcion» y «keywords».`);
  }
  return { TENDENCIAS_GLOBALES: nuevas, ...(obj?.REGLA ? { REGLA: { ...REGLA_DEFECTO, ...obj.REGLA } } : {}) };
}
