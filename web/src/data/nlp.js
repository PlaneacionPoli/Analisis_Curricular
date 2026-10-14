// Minería de texto: réplica de TfidfVectorizer / CountVectorizer de scikit-learn (configuración del dashboard),
// similitud coseno entre asignaturas y agrupamiento aglomerativo (enlace promedio).

let stopCache = null;
export async function stopwords() {
  if (!stopCache) stopCache = new Set(await (await fetch(`${import.meta.env.BASE_URL}data/stopwords_es.json`)).json());
  return stopCache;
}

const TOKEN = /[\p{L}\p{N}_]{2,}/gu;   // (?u)\b\w\w+\b
export const tokenizar = (texto, stop) => (String(texto ?? '').toLowerCase().match(TOKEN) ?? []).filter(t => !stop.has(t));

function ngramas(tokens, [a, b]) {
  if (a === 1 && b === 1) return tokens;
  const out = a === 1 ? [...tokens] : [];
  for (let n = Math.max(a, 2); n <= Math.min(b, tokens.length); n++)
    for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n).join(' '));
  return out;
}

/**
 * Ajusta el vocabulario y devuelve {features, tf: Map[] (por documento: índice → conteo), df, n}.
 * Equivale a CountVectorizer(ngram_range, max_features, min_df, max_df, stop_words).fit_transform.
 */
export function contar(docs, stop, { ngram = [1, 1], maxFeatures = null, minDf = 1, maxDf = 1.0 } = {}) {
  const porDoc = docs.map(d => { const c = new Map(); for (const g of ngramas(tokenizar(d, stop), ngram)) c.set(g, (c.get(g) ?? 0) + 1); return c; });
  const df = new Map(), tot = new Map();
  for (const c of porDoc) for (const [g, n] of c) { df.set(g, (df.get(g) ?? 0) + 1); tot.set(g, (tot.get(g) ?? 0) + n); }
  const maxCount = maxDf <= 1 ? maxDf * docs.length : maxDf;
  let vocab = [...df.keys()].sort().filter(g => df.get(g) >= minDf && df.get(g) <= maxCount);
  if (maxFeatures && vocab.length > maxFeatures) {
    const orden = vocab.map((g, i) => [g, i]).sort((a, b) => tot.get(b[0]) - tot.get(a[0]) || a[1] - b[1]).slice(0, maxFeatures).map(x => x[0]);
    vocab = orden.sort();
  }
  const idx = new Map(vocab.map((g, i) => [g, i]));
  const tf = porDoc.map(c => { const m = new Map(); for (const [g, n] of c) if (idx.has(g)) m.set(idx.get(g), n); return m; });
  return { features: vocab, tf, df: vocab.map(g => df.get(g)), total: vocab.map(g => tot.get(g)), n: docs.length };
}

/** TF-IDF con idf suavizado y normas L2 (valores por documento como Map índice → peso). */
export function tfidf(ajuste) {
  const idf = ajuste.df.map(d => Math.log((1 + ajuste.n) / (1 + d)) + 1);
  return ajuste.tf.map(m => {
    const w = new Map();
    let s = 0;
    for (const [i, n] of m) { const v = n * idf[i]; w.set(i, v); s += v * v; }
    const norma = Math.sqrt(s) || 1;
    for (const [i, v] of w) w.set(i, v / norma);
    return w;
  });
}

/** argsort()[::-1][:n] de numpy con desempate estable: mayor valor primero y, a igual valor, mayor índice primero. */
export function topPorSuma(features, filas, n) {
  const suma = new Float64Array(features.length);
  for (const w of filas) for (const [i, v] of w) suma[i] += v;
  return [...suma.keys()].sort((a, b) => suma[b] - suma[a] || b - a).slice(0, n).map(i => [features[i], suma[i]]);
}

export function topNgramas(docs, stop, n = 20) {
  const a = contar(docs, stop, { ngram: [2, 3], maxFeatures: 30, minDf: 2 });
  return a.features.map((g, i) => [g, a.total[i]]).sort((x, y) => y[1] - x[1]).slice(0, n);
}

export function topTerminos(docs, stop, { max = 100, n = 30, ngram = [1, 3], minDf = 2, maxDf = 0.8 } = {}) {
  if (!docs.length) return [];
  const a = contar(docs, stop, { ngram, maxFeatures: max, minDf, maxDf });
  return topPorSuma(a.features, tfidf(a), n);
}

/** Similitud coseno entre asignaturas: un documento por nombre de asignatura (TF-IDF de 50 términos). */
export function similitudAsignaturas(filas, stop) {
  const g = new Map();
  for (const f of filas) {
    const a = f['Nombre asignatura o modulo'];
    if (a == null || String(a).trim() === '' || String(a) === 'nan') continue;
    if (!g.has(a)) g.set(a, []);
    g.get(a).push(f.Texto_Completo);
  }
  const nombres = [...g.keys()].sort();
  if (nombres.length < 3) return { nombres, sim: null, par: null, n: nombres.length };
  const m = tfidf(contar(nombres.map(a => g.get(a).join(' ')), stop, { maxFeatures: 50 }));
  const n = nombres.length;
  const sim = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    sim[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      let s = 0;
      const [pequeno, grande] = m[i].size < m[j].size ? [m[i], m[j]] : [m[j], m[i]];
      for (const [k, v] of pequeno) { const u = grande.get(k); if (u !== undefined) s += v * u; }
      sim[i][j] = sim[j][i] = s;
    }
  }
  let mx = -1, par = null;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && sim[i][j] > mx + 1e-12) { mx = sim[i][j]; par = [i, j]; }
  return { nombres, sim, par: { asig1: nombres[par[0]], asig2: nombres[par[1]], similitud: mx }, n };
}

/** Agrupamiento aglomerativo con enlace promedio sobre la distancia 1 − similitud. Devuelve k listas de índices. */
export function agrupar(sim, k) {
  const n = sim.length;
  const D = sim.map(f => Float64Array.from(f, v => 1 - Math.min(Math.max(v, 0), 1)));
  for (let i = 0; i < n; i++) D[i][i] = 0;
  const miembros = Array.from({ length: n }, (_, i) => [i]);
  const vivo = new Array(n).fill(true);
  let restantes = n;
  while (restantes > k) {
    let mejor = Infinity, a = -1, b = -1;
    for (let i = 0; i < n; i++) {
      if (!vivo[i]) continue;
      const fila = D[i];
      for (let j = i + 1; j < n; j++) if (vivo[j] && fila[j] < mejor) { mejor = fila[j]; a = i; b = j; }
    }
    const na = miembros[a].length, nb = miembros[b].length;
    for (let c = 0; c < n; c++) {
      if (!vivo[c] || c === a || c === b) continue;
      D[a][c] = D[c][a] = (na * D[a][c] + nb * D[b][c]) / (na + nb);
    }
    miembros[a] = miembros[a].concat(miembros[b]);
    vivo[b] = false;
    restantes--;
  }
  return miembros.filter((_, i) => vivo[i]);
}
