// Paridad de «Minería de Texto» con scikit-learn (referencia: tests/golden_nlp.json).
//   node tests/paridad_nlp.mjs [carpeta]
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agrupar, contar, similitudAsignaturas, topNgramas, topTerminos } from '../src/data/nlp.js';
import { consolidar } from '../src/data/consolidar.js';
import { parseMatriz } from '../src/data/parseMatrix.js';

const aquí = dirname(fileURLToPath(import.meta.url));
const carpeta = resolve(process.argv[2] ?? join(aquí, '../../data/raw/01_FormatosRA_ReformaCurricular'));
const g = JSON.parse(readFileSync(join(aquí, 'golden_nlp.json'), 'utf-8'));
const stop = new Set(JSON.parse(readFileSync(join(aquí, '../public/data/stopwords_es.json'), 'utf-8')));
const { filas } = consolidar(readdirSync(carpeta).filter(f => /^FormatoRA.*\.xlsx$/.test(f)).sort()
  .map(f => parseMatriz(new Uint8Array(readFileSync(join(carpeta, f))), f)));
const docs = filas.map(f => f.Texto_Completo);

const igualLista = (a, b, tol = 1e-9) => a.length === b.length && a.every((x, i) => x[0] === b[i][0] && Math.abs(x[1] - b[i][1]) < tol);
const mostrar = (a, b) => { const i = a.findIndex((x, k) => !b[k] || x[0] !== b[k][0]); return i < 0 ? 'valores' : `pos ${i}: py=${a[i]?.[0]} js=${b[i]?.[0]}`; };

const t = topTerminos(docs, stop);
console.log(`TF-IDF global (30): ${igualLista(g.terminos, t) ? 'IDÉNTICO' : 'difiere → ' + mostrar(g.terminos, t)}`);
const n = topNgramas(docs, stop);
console.log(`N-gramas (20): ${igualLista(g.ngramas, n, 0) ? 'IDÉNTICO' : 'difiere → ' + mostrar(g.ngramas, n)}`);
let ok = 0, tot = 0, imposibles = 0;
for (const [p, ref] of Object.entries(g.programas)) {
  const d = filas.filter(f => f.Programa === p).map(f => f.Texto_Completo);
  tot++;
  if (igualLista(ref, topTerminos(d, stop, { max: 50, n: 20, ngram: [1, 2], maxDf: 0.85 }))) ok++;
  // los demás difieren solo por el desempate de numpy en el corte de max_features: ningún término de Python debe quedar fuera
  const a = contar(d, stop, { ngram: [1, 2], minDf: 2, maxDf: 0.85 });
  const corte = [...a.total].sort((x, y) => y - x)[49];
  if (ref.some(([w]) => { const i = a.features.indexOf(w); return i < 0 || a.total[i] < corte; })) imposibles++;
}
console.log(`TF-IDF por programa: ${ok} de ${tot} idénticos; términos de Python inalcanzables para JS: ${imposibles} programas (las diferencias restantes son empates en el corte de 50 términos)`);
const sinCR = t => (t == null ? t : t.split(String.fromCharCode(13, 10)).join(String.fromCharCode(10)));
const s = similitudAsignaturas(filas.map(f => ({ ...f, 'Nombre asignatura o modulo': sinCR(f['Nombre asignatura o modulo']) })), stop);
console.log(`asignaturas: py ${g.n_asig} · js ${s.n} · mismos nombres ${JSON.stringify(s.nombres) === JSON.stringify(g.nombres)}`);
console.log(`par más similar: py ${g.par.asig1} ↔ ${g.par.asig2} (${g.par.similitud.toFixed(4)}) · js ${s.par.asig1} ↔ ${s.par.asig2} (${s.par.similitud.toFixed(4)})`);
const maxDif = Math.max(...g.sim_muestra.flatMap((f, i) => f.map((v, j) => Math.abs(v - s.sim[i][j]))));
console.log(`similitud (muestra 6×6): diferencia máxima ${maxDif.toExponential(2)}`);
for (const k of [3, 5]) {
  const js = agrupar(s.sim, k).map(gr => gr.map(i => s.nombres[i]).sort()).sort((a, b) => a[0] < b[0] ? -1 : 1);
  const py = g.grupos[k].map(x => [...x].sort()).sort((a, b) => a[0] < b[0] ? -1 : 1);
  console.log(`grupos k=${k}: ${JSON.stringify(js) === JSON.stringify(py) ? 'IDÉNTICOS' : 'difieren (tamaños py ' + py.map(x => x.length) + ' · js ' + js.map(x => x.length) + ')'}`);
}
{
  const a = contar(docs, stop, { ngram: [2, 3], minDf: 2 });
  const corte = [...a.total].sort((x, y) => y - x)[29];
  const fuera = g.ngramas.filter(([w, c]) => { const i = a.features.indexOf(w); return i < 0 || a.total[i] < corte || a.total[i] !== c; });
  console.log(`n-gramas: términos o conteos de Python inalcanzables para JS: ${fuera.length}`);
}
