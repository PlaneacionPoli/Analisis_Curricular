// Asociación del perfil de egreso con SU PROPIA matriz (V1). Port de src/asociacion_perfil.py:
// cobertura de lemas ponderada por IDF + similitud semántica opcional (embeddings multilingües).
import { CAPAS, evaluable, itemsPerfil, leerMatriz, norm } from './leerMatriz.js';
import { lemas, tokens } from './nlp.js';

const SUSTANTIVOS_LIGEROS = new Set(['gestion', 'sector', 'area', 'organizacion', 'empresa', 'proceso', 'actividad', 'campo',
  'funcion', 'entidad', 'grupo', 'conjunto', 'parte', 'ambito', 'contexto', 'escenario', 'aspecto']);

/** Configuración activa: se construye desde config_asociacion_perfil.json (misma estructura que en Python). */
export function configDe(json) {
  return {
    VERSION: json.VERSION ?? 'sin versión',
    PARAMS: { ...json.PARAMS },
    FACTOR_ROL: Number(json.FACTOR_ROL),
    PESO_NUCLEO: Number(json.PESO_NUCLEO),
    UMBRAL_CONTEXTO: Number(json.UMBRAL_CONTEXTO),
    PESO_CONTEXTO: Number(json.PESO_CONTEXTO),
    RAIZ: Number(json.RAIZ),
    SINONIMOS: new Map(Object.entries(json.SINONIMOS).map(([k, v]) => [k, new Set(v)])),
    AGENTE_IRREGULAR: json.AGENTE_IRREGULAR ?? {},
    VALIDACION: json.VALIDACION ?? {},
    MODELO_SEMANTICO: json.MODELO_SEMANTICO ?? 'paraphrase-multilingual-MiniLM-L12-v2',
  };
}

function nucleoItem(texto, cfg, contexto) {
  const raiz = l => l.slice(0, cfg.RAIZ);
  const toks = tokens(texto);
  const libre = l => !SUSTANTIVOS_LIGEROS.has(l) && !contexto.has(raiz(l));
  for (const pos of [['N', 'P'], ['A']]) {
    const j = toks.findIndex(([l, p]) => pos.includes(p) && libre(l));
    if (j >= 0) {
      const out = [toks[j][0]];
      if (pos[0] === 'N' && j + 1 < toks.length && toks[j + 1][1] === 'A' && libre(toks[j + 1][0])) out.push(toks[j + 1][0]);
      return out;
    }
  }
  const j = (toks.find(([, p]) => ['N', 'P'].includes(p)) ?? toks[0] ?? [''])[0];
  return j ? [j] : [];
}

function actividadDeRol(texto, cfg) {
  const toks = tokens(texto);
  if (!toks.length) return [];
  let l = toks[0][0];
  if (/(dor|tor|sor)a$/.test(l)) l = l.replace(/a$/, '');
  if (Object.hasOwn(cfg.AGENTE_IRREGULAR, l)) return cfg.AGENTE_IRREGULAR[l];
  const m = /^([a-z]+?)(ador|edor|idor)$/.exec(l);
  if (m) {
    const v = m[1] + { ador: 'ar', edor: 'er', idor: 'ir' }[m[2]];
    return [v, m[2] === 'ador' ? m[1] + 'acion' : m[1] + 'cion'];
  }
  return [];
}

/** Unidades de cada capa: [(índice de entidad, texto)] y su tipo (nombre / núcleo / indicador). */
function unidadesDe(m) {
  const u = {}, tipos = {};
  for (const capa of CAPAS) {
    u[capa] = [];
    tipos[capa] = [];
    m.entidades[capa].forEach((e, k) => {
      e.unidades.forEach((x, idx) => {
        u[capa].push([k, x]);
        tipos[capa].push(e.tipos ? e.tipos[idx] : 'indicador');
      });
    });
  }
  return { u, tipos };
}

const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

/**
 * Cobertura y similitud por capa. `incrustar(textos)` devuelve vectores normalizados (Array<Float32Array>) o es null
 * (solo cobertura léxica: la similitud queda en 0 y no hay asociaciones «Parcial»).
 */
export async function puntajes(m, items, cfg, incrustar = null, alProgreso = null) {
  const raiz = l => l.slice(0, cfg.RAIZ);
  const { u: unidades, tipos: tipoU } = unidadesDe(m);
  const Lu = {};
  for (const capa of CAPAS) Lu[capa] = unidades[capa].map(([, x]) => new Set([...lemas(x)].map(raiz)));
  const todas = CAPAS.flatMap(c => Lu[c]);
  const n = Math.max(todas.length, 1);
  const df = new Map();
  for (const ls of todas) for (const l of ls) df.set(l, (df.get(l) ?? 0) + 1);
  const contexto = new Set([...df].filter(([, c]) => c / n > cfg.UMBRAL_CONTEXTO).map(([l]) => l));
  const idf = l => (Math.log((n + 1) / ((df.get(raiz(l)) ?? 0) + 1)) + 1) * (contexto.has(raiz(l)) ? cfg.PESO_CONTEXTO : 1.0);

  const lemasItem = items.map(it => lemas(it.item));
  const E_items = incrustar ? await incrustar(items.map(i => i.item)) : null;
  const out = {};
  for (const capa of CAPAS) {
    const ents = m.entidades[capa];
    const U = incrustar && unidades[capa].length ? await incrustar(unidades[capa].map(([, x]) => x)) : [];
    const z = () => items.map(() => new Float64Array(ents.length));
    const cob = z(), cobN = z(), cobD = z(), cobND = z(), sem = z();
    const evid = items.map(() => new Array(ents.length).fill(null));
    items.forEach((it, i) => {
      if (alProgreso && i % 50 === 0) alProgreso(capa, i, items.length);
      const actividad = it.origen !== 'Texto narrativo' ? actividadDeRol(it.item, cfg) : [];
      const rol = new Set();
      for (const a of actividad) for (const x of [a, ...(cfg.SINONIMOS.get(a) ?? [])]) rol.add(raiz(x));
      const grupos = [...lemasItem[i]].sort().map(l => {
        const g = new Set([l, ...(cfg.SINONIMOS.get(l) ?? [])].map(raiz));
        const esAgente = /(dor|tor|sor)$/.test(l) || Object.hasOwn(cfg.AGENTE_IRREGULAR, l);
        return [l, esAgente ? new Set([...g, ...rol]) : g];
      });
      const total = grupos.reduce((s, [l]) => s + idf(l), 0) || 1.0;
      const nucleo = nucleoItem(it.item, cfg, contexto).map(t => new Set([t, ...(cfg.SINONIMOS.get(t) ?? [])].map(raiz)));
      const raicesN = new Set(nucleo.flatMap(g => [...g]));
      const wN = new Map(grupos.map(([l, g]) => [l, idf(l) * ([...g].some(x => raicesN.has(x)) ? cfg.PESO_NUCLEO : 1.0)]));
      const totalN = [...wN.values()].reduce((s, v) => s + v, 0) || 1.0;
      const mejor = new Map(), mejorN = new Map(), dC = new Map(), dN = new Map();
      const mayor = (c, s, previo) => !previo || c > previo[0] || (c === previo[0] && s > previo[1]);
      unidades[capa].forEach(([k, u], j) => {
        const lu = Lu[capa][j];
        const inter = g => { for (const x of g) if (lu.has(x)) return true; return false; };
        let c = grupos.reduce((s, [l, g]) => s + (inter(g) ? idf(l) : 0), 0) / total;
        const rolOk = rol.size === 0 || [...rol].some(x => lu.has(x));
        if (rol.size && !rolOk) c *= cfg.FACTOR_ROL;
        const s_ = incrustar ? dot(E_items[i], U[j]) : 0;
        if (mayor(c, s_, mejor.get(k))) mejor.set(k, [c, s_, u]);
        let cN = grupos.reduce((s, [l, g]) => s + (inter(g) ? wN.get(l) : 0), 0) / totalN;
        if (rol.size && !rolOk) cN *= cfg.FACTOR_ROL;
        if (mayor(cN, s_, mejorN.get(k))) mejorN.set(k, [cN, s_, u]);
        if (tipoU[capa][j] === 'indicador') {
          dC.set(k, Math.max(dC.get(k) ?? 0, c));
          dN.set(k, Math.max(dN.get(k) ?? 0, cN));
        }
        sem[i][k] = Math.max(sem[i][k], s_);
      });
      for (const [k, [c, , u]] of mejor) { cob[i][k] = c; evid[i][k] = u; }
      for (const [k, [c]] of mejorN) cobN[i][k] = c;
      for (const [k, v] of dC) cobD[i][k] = v;
      for (const [k, v] of dN) cobND[i][k] = v;
    });
    out[capa] = { cob, cob_n: cobN, cob_d: cobD, cob_nd: cobND, sem, evidencia: evid };
  }
  return out;
}

export function decidir(cob, sem, p) {
  if (cob >= p.explicita) return 'Explícita';
  if (cob >= p.parcial && sem >= p.semantica) return 'Parcial';
  return 'No asociada';
}

const redondear = (x, d) => Math.round(x * 10 ** d) / 10 ** d;

/** Filas largas ítem × capa × entidad respaldada (o NINGUNA), como asociar() de Python. */
export async function asociar(buffer, cfg, { incrustar = null, lexicoRespaldo = [], alProgreso = null } = {}) {
  const m = leerMatriz(buffer, lexicoRespaldo);
  const items = itemsPerfil(m);
  const P = await puntajes(m, items, cfg, incrustar, alProgreso);
  const prm = cfg.PARAMS;
  const filas = [];
  items.forEach((it, i) => {
    for (const capa of CAPAS) {
      const ents = m.entidades[capa];
      let clave = prm.nucleo ? 'cob_n' : 'cob';
      if (capa === 'Asignatura' && prm.desarrollo) clave = prm.nucleo ? 'cob_nd' : 'cob_d';
      const C = P[capa][clave];
      const hits = [];
      for (let k = 0; k < ents.length; k++) {
        const nivel = decidir(C[i][k], P[capa].sem[i][k], prm);
        if (nivel !== 'No asociada') hits.push([k, nivel]);
      }
      if (!hits.length) {
        let k = null;
        if (ents.length) {
          let mx = -Infinity;
          for (let j = 0; j < ents.length; j++) {
            const v = P[capa].cob[i][j] + P[capa].sem[i][j];
            if (v > mx) { mx = v; k = j; }
          }
        }
        filas.push({ ...it, capa, entidad: 'NINGUNA', nivel: 'No asociada', evidencia: '',
          mas_cercana: k !== null ? ents[k].nombre.slice(0, 150) : '',
          cobertura: k !== null ? redondear(P[capa].cob[i][k], 3) : null,
          similitud: k !== null ? redondear(P[capa].sem[i][k], 3) : null });
      }
      for (const [k, nivel] of hits) {
        filas.push({ ...it, capa, entidad: capa !== 'Asignatura' ? ents[k].id : ents[k].nombre, nivel,
          evidencia: P[capa].evidencia[i][k], mas_cercana: '',
          cobertura: redondear(P[capa].cob[i][k], 3), similitud: redondear(P[capa].sem[i][k], 3) });
      }
    }
  });
  return { filas, avisos: m.avisos, m };
}

/** Una fila por ítem: capas con respaldo y estado global. */
export function resumenItems(filas) {
  const por = new Map();
  for (const f of filas) {
    const clave = JSON.stringify([f.perfil, f.origen, f.item]);
    if (!por.has(clave)) por.set(clave, { perfil: f.perfil, origen: f.origen, tipo: f.tipo, item: f.item, Competencia: 0, RA: 0, Asignatura: 0 });
    if (f.entidad !== 'NINGUNA') por.get(clave)[f.capa] = 1;
  }
  return [...por.values()].map(d => {
    const n = CAPAS.reduce((s, c) => s + d[c], 0);
    d.capas_con_respaldo = n;
    d.evaluable = evaluable(d.item);
    d.estado = !d.evaluable ? 'No evaluable' : n === 0 ? 'Sin asociación' : n === CAPAS.length ? 'Asociado en las tres capas' : 'Asociación parcial';
    return d;
  });
}

void norm;
