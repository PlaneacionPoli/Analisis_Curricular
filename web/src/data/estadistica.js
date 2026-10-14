// Spearman y Kruskal-Wallis con valor p (equivalen a scipy.stats.spearmanr / kruskal).

function lnGamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const cj of c) ser += cj / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/** Función beta incompleta regularizada I_x(a, b). */
function betaInc(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  const fc = (x, a, b) => {
    const TINY = 1e-300;
    let c = 1, d = 1 - (a + b) * x / (a + 1);
    if (Math.abs(d) < TINY) d = TINY;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
      c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
      d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
      c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-14) break;
    }
    return h;
  };
  return x < (a + 1) / (a + b + 2) ? bt * fc(x, a, b) / a : 1 - bt * fc(1 - x, b, a) / b;
}

/** Función gamma incompleta regularizada superior Q(a, x) (supervivencia de chi-cuadrado). */
function gammaQ(a, x) {
  if (x <= 0) return 1;
  if (x < a + 1) {
    let ap = a, suma = 1 / a, del = suma;
    for (let n = 0; n < 500; n++) { ap++; del *= x / ap; suma += del; if (Math.abs(del) < Math.abs(suma) * 1e-15) break; }
    return 1 - suma * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  const TINY = 1e-300;
  let b = x + 1 - a, c = 1 / TINY, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/** Rangos promedio (empates con el rango medio). */
export function rangos(v) {
  const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(v.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const medio = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = medio;
    i = j + 1;
  }
  return r;
}

export function spearman(x, y) {
  const n = x.length, rx = rangos(x), ry = rangos(y);
  const mx = rx.reduce((a, b) => a + b, 0) / n, my = ry.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (rx[i] - mx) * (ry[i] - my); sxx += (rx[i] - mx) ** 2; syy += (ry[i] - my) ** 2; }
  const rho = sxy / Math.sqrt(sxx * syy);
  if (Math.abs(rho) >= 1) return { rho, p: 0 };
  const df = n - 2, t = rho * Math.sqrt(df / ((rho + 1) * (1 - rho)));
  return { rho, p: betaInc(df / (df + t * t), df / 2, 0.5) };
}

export function kruskal(grupos) {
  const todos = grupos.flat(), N = todos.length, r = rangos(todos);
  let pos = 0, h = 0;
  for (const g of grupos) {
    let s = 0;
    for (let i = 0; i < g.length; i++) s += r[pos + i];
    pos += g.length;
    h += s * s / g.length;
  }
  h = 12 / (N * (N + 1)) * h - 3 * (N + 1);
  const cuentas = new Map();
  todos.forEach(v => cuentas.set(v, (cuentas.get(v) ?? 0) + 1));
  let t = 0;
  for (const c of cuentas.values()) t += c ** 3 - c;
  h /= 1 - t / (N ** 3 - N);
  return { H: h, p: gammaQ((grupos.length - 1) / 2, h / 2) };
}

/** Percentil con interpolación lineal (igual que pandas.quantile). */
export function cuantil(valores, q) {
  const v = [...valores].sort((a, b) => a - b);
  if (!v.length) return 0;
  const pos = (v.length - 1) * q, i = Math.floor(pos), f = pos - i;
  return v[i] + (i + 1 < v.length ? (v[i + 1] - v[i]) * f : 0);
}

export const mediana = v => {
  const s = v.filter(x => x !== null && x !== undefined && !Number.isNaN(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

