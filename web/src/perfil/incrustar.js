// Similitud semántica: mismo modelo que el método de Python (paraphrase-multilingual-MiniLM-L12-v2) ejecutado en el
// navegador con transformers.js (ONNX). Los pesos se descargan una vez desde Hugging Face Hub y quedan en la caché.
import { env, pipeline } from '@huggingface/transformers';

const MODELO = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const LONGITUD_MAXIMA = 128;   // igual que sentence-transformers para este modelo
const LOTE = 32;

/**
 * Devuelve `incrustar(textos) → Promise<Float32Array[]>` con vectores normalizados (coseno = producto escalar).
 * `dtype`: 'q8' (cuantizado, ~120 MB; por defecto) o 'fp32' (pesos completos, ~470 MB; solo para comparar con Python).
 */
export async function crearIncrustador({ nodo = false, dtype = null, alProgreso = null, wasmBase = null } = {}) {
  if (!nodo) env.allowLocalModels = false;
  // motor WASM servido por el propio sitio (tools/copiar_wasm.mjs); sin esto se descarga de un CDN
  if (!nodo && wasmBase) env.backends.onnx.wasm.wasmPaths = wasmBase;
  const extractor = await pipeline('feature-extraction', MODELO, {
    dtype: dtype ?? 'q8',
    progress_callback: alProgreso ?? undefined,
  });
  extractor.tokenizer.model_max_length = LONGITUD_MAXIMA;
  const cache = new Map();

  return async function incrustar(textos) {
    const faltan = [...new Set(textos.filter(t => !cache.has(t)))];
    for (let i = 0; i < faltan.length; i += LOTE) {
      const lote = faltan.slice(i, i + LOTE);
      const t = await extractor(lote, { pooling: 'mean', normalize: true });
      const [n, d] = t.dims;
      lote.forEach((x, k) => cache.set(x, Float32Array.from(t.data.subarray(k * d, (k + 1) * d))));
      void n;
    }
    return textos.map(t => cache.get(t));
  };
}
