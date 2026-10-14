// Port de src/shared_subjects_analyzer.py (consolidar_asignaturas, divergencia_homonimas, comparar_inter_programa).
// Contenido de una asignatura = núcleos temáticos (separados por su numeración) + indicadores de logro, comparados con coseno TF-IDF
// (unigramas y bigramas, tf sublineal, max_df 0.85, sin lista de stopwords), igual que scikit-learn.
import { tokenizarCelda } from './nucleos.js';
import { tokenizar } from './nlp.js';

export const UMBRAL_IDENTICO = 0.95;
export const UMBRAL_SIMILAR = 0.60;

const ascii = t => String(t ?? '').normalize('NFKD').replace(/[^\x00-\x7f]/g, '');
export const normalizar = t => ascii(t).toLowerCase().trim().replace(/\s+/g, ' ');
export const claveNombre = t => normalizar(t).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const lleno = v => v !== null && v !== undefined && String(v).trim() !== '' && String(v) !== 'nan';

/** Una fila por asignatura (bloque de filas) con su contenido; excluye totales y electivas. */
export function consolidarAsignaturas(filas) {
  const out = [];
  let actual = null, matrizActual;
  for (const row of filas) {
    if (row.Programa !== matrizActual) { matrizActual = row.Programa; actual = null; }
    const nombre = row['Nombre asignatura o modulo'];
    if (lleno(nombre)) {
      const n = String(nombre).trim();
      if (/^[\d.\s]+$/.test(n) || claveNombre(n).startsWith('electiva')) { actual = null; continue; }
      actual = { Programa: row.Programa, Sede: row.Sede ?? '', Matriz: row.Matriz, asignatura: n, clave: claveNombre(n), partes: [] };
      out.push(actual);
    }
    if (actual === null) continue;
    if (lleno(row['Nucleos tematicos'])) actual.partes.push(...tokenizarCelda(row['Nucleos tematicos']));
    if (lleno(row['Indicadores de logro asignatura o modulo'])) actual.partes.push(String(row['Indicadores de logro asignatura o modulo']));
  }
  for (const f of out) { f.texto = normalizar(f.partes.join(' ')); delete f.partes; }
  return out;
}

const SIN_STOP = new Set();

/** Vectores TF-IDF (Map índice→peso) de textos únicos, con df e idf calculados sobre TODAS las filas (con multiplicidad). */
function vectorizar(textos, multiplicidad) {
  const total = multiplicidad.reduce((a, b) => a + b, 0);
  const bolsas = textos.map(t => {
    const tk = tokenizar(t, SIN_STOP), c = new Map();
    for (const g of tk) c.set(g, (c.get(g) ?? 0) + 1);
    for (let i = 0; i + 1 < tk.length; i++) { const g = `${tk[i]} ${tk[i + 1]}`; c.set(g, (c.get(g) ?? 0) + 1); }
    return c;
  });
  const df = new Map();
  bolsas.forEach((c, i) => { for (const g of c.keys()) df.set(g, (df.get(g) ?? 0) + multiplicidad[i]); });
  const maxCount = 0.85 * total;
  const vocab = [...df.keys()].filter(g => df.get(g) <= maxCount).sort();
  const idx = new Map(vocab.map((g, i) => [g, i]));
  const idf = vocab.map(g => Math.log((1 + total) / (1 + df.get(g))) + 1);
  return bolsas.map(c => {
    const w = new Map();
    let s = 0;
    for (const [g, n] of c) { const i = idx.get(g); if (i === undefined) continue; const v = (1 + Math.log(n)) * idf[i]; w.set(i, v); s += v * v; }
    const norma = Math.sqrt(s) || 1;
    for (const [i, v] of w) w.set(i, v / norma);
    return w;
  });
}

/** Agrupa filas por texto idéntico: {textos, grupos: índices de fila por texto único, vectores}. */
function preparar(docs) {
  const porTexto = new Map();
  docs.forEach((d, i) => { if (!porTexto.has(d.texto)) porTexto.set(d.texto, []); porTexto.get(d.texto).push(i); });
  const textos = [...porTexto.keys()], grupos = [...porTexto.values()];
  return { textos, grupos, vectores: vectorizar(textos, grupos.map(g => g.length)) };
}

/** Índice invertido para recorrer solo los pares que comparten algún término. */
function indiceInvertido(vectores) {
  const inv = new Map();
  vectores.forEach((w, d) => { for (const [t, v] of w) { if (!inv.has(t)) inv.set(t, []); inv.get(t).push([d, v]); } });
  return inv;
}

/** Callback por cada par de textos únicos (a ≤ b) con similitud ≥ umbral (a === b se informa con su autosimilitud). */
function paresSimilares(vectores, umbral, alPar) {
  const inv = indiceInvertido(vectores);
  const n = vectores.length, acc = new Float64Array(n), tocados = [];
  for (let a = 0; a < n; a++) {
    for (const [t, va] of vectores[a]) {
      for (const [b, vb] of inv.get(t)) {
        if (b < a) continue;
        if (acc[b] === 0) tocados.push(b);
        acc[b] += va * vb;
      }
    }
    for (const b of tocados) { if (acc[b] >= umbral) alPar(a, b, acc[b]); acc[b] = 0; }
    tocados.length = 0;
  }
}

/** Pares de programas distintos con similitud ≥ umbral; `mismo_nombre` separa homónimas de nombre distinto. */
export function compararInterPrograma(asigs, umbralSimilar = UMBRAL_SIMILAR, umbralIdentico = UMBRAL_IDENTICO) {
  const docs = asigs.filter(d => d.texto.length > 5);
  if (new Set(docs.map(d => d.Programa)).size < 2) return [];
  const { grupos, vectores } = preparar(docs);
  const pares = [];
  paresSimilares(vectores, umbralSimilar, (a, b, s) => {
    const sim = Math.round(s * 1e4) / 1e4;
    const emitir = (i, j) => {
      const x = docs[i], y = docs[j];
      if (x.Programa === y.Programa) return;
      pares.push({ programa_a: x.Programa, sede_a: x.Sede, matriz_a: x.Matriz, asignatura_a: x.asignatura, programa_b: y.Programa, sede_b: y.Sede, matriz_b: y.Matriz, asignatura_b: y.asignatura,
        mismo_nombre: x.clave === y.clave, similitud: sim, categoria: s >= umbralIdentico ? 'IDENTICO' : 'SIMILAR' });
    };
    if (a === b) { const g = grupos[a]; for (let p = 0; p < g.length; p++) for (let q = p + 1; q < g.length; q++) emitir(g[p], g[q]); }
    else for (const i of grupos[a]) for (const j of grupos[b]) emitir(i, j);
  });
  return pares.sort((p, q) => q.similitud - p.similitud);
}

/** Pares únicos por (matriz, asignatura) de cada lado: el mismo par no se repite por cada fila de RA. */
export function deduplicarPares(pares) {
  const vistos = new Map();
  for (const p of pares) {
    const k = `${p.matriz_a}|${p.asignatura_a}|${p.matriz_b}|${p.asignatura_b}`;
    if (!vistos.has(k) || vistos.get(k).similitud < p.similitud) vistos.set(k, p);
  }
  return [...vistos.values()].sort((a, b) => b.similitud - a.similitud);
}

/** Similitud media entre versiones (programas distintos) de cada asignatura homónima. */
export function divergenciaHomonimas(asigs, umbral = UMBRAL_SIMILAR) {
  if (!asigs.length) return [];
  const { textos, grupos, vectores } = preparar(asigs);
  const textoDe = new Array(asigs.length);
  grupos.forEach((g, u) => g.forEach(i => { textoDe[i] = u; }));
  const dot = (a, b) => { if (a === b) return vectores[a].size ? 1 : 0; let s = 0; const [p, q] = vectores[a].size < vectores[b].size ? [vectores[a], vectores[b]] : [vectores[b], vectores[a]]; for (const [t, v] of p) { const u = q.get(t); if (u !== undefined) s += v * u; } return s; };
  void textos;
  const porClave = new Map();
  asigs.forEach((d, i) => { if (!porClave.has(d.clave)) porClave.set(d.clave, []); porClave.get(d.clave).push(i); });
  const filas = [];
  for (const idx of porClave.values()) {
    const progs = new Set(idx.map(i => asigs[i].Programa));
    if (progs.size < 2) continue;
    let suma = 0, n = 0;
    for (let p = 0; p < idx.length; p++) for (let q = p + 1; q < idx.length; q++) {
      if (asigs[idx[p]].Programa === asigs[idx[q]].Programa) continue;
      suma += dot(textoDe[idx[p]], textoDe[idx[q]]); n++;
    }
    const media = Math.round(suma / n * 1e3) / 1e3;
    filas.push({ asignatura: asigs[idx[0]].asignatura, programas: progs.size, versiones: idx.length, similitud_media: media, divergente: media < umbral });
  }
  return filas.sort((a, b) => a.similitud_media - b.similitud_media);
}
