// Port de difflib.SequenceMatcher(None, a, b, autojunk=False).ratio() (Ratcliff/Obershelp, sin elementos «basura»).

function bloqueMasLargo(a, b, b2j, alo, ahi, blo, bhi) {
  let besti = alo, bestj = blo, bestsize = 0;
  let j2len = new Map();
  for (let i = alo; i < ahi; i++) {
    const nuevo = new Map();
    const idxs = b2j.get(a[i]);
    if (idxs) {
      for (const j of idxs) {
        if (j < blo) continue;
        if (j >= bhi) break;
        const k = (j2len.get(j - 1) ?? 0) + 1;
        nuevo.set(j, k);
        if (k > bestsize) { besti = i - k + 1; bestj = j - k + 1; bestsize = k; }
      }
    }
    j2len = nuevo;
  }
  return [besti, bestj, bestsize];
}

export function ratio(a, b) {
  const la = a.length, lb = b.length;
  if (la + lb === 0) return 1;
  const b2j = new Map();
  for (let j = 0; j < lb; j++) {
    const c = b[j];
    if (!b2j.has(c)) b2j.set(c, []);
    b2j.get(c).push(j);
  }
  let coincidencias = 0;
  const pila = [[0, la, 0, lb]];
  while (pila.length) {
    const [alo, ahi, blo, bhi] = pila.pop();
    const [i, j, k] = bloqueMasLargo(a, b, b2j, alo, ahi, blo, bhi);
    if (k) {
      coincidencias += k;
      if (alo < i && blo < j) pila.push([alo, i, blo, j]);
      if (i + k < ahi && j + k < bhi) pila.push([i + k, ahi, j + k, bhi]);
    }
  }
  return 2 * coincidencias / (la + lb);
}

/** ratio con memoria (las mismas parejas se comparan varias veces en V3/V4). */
export function crearSim() {
  const memo = new Map();
  return (a, b) => {
    const k = `${a}\u0000${b}`;
    let v = memo.get(k);
    if (v === undefined) { v = ratio(a, b); memo.set(k, v); }
    return v;
  };
}
