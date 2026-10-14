// Copia el motor WASM de onnxruntime-web a public/ort/ para servirlo desde el propio sitio (sin depender de un CDN).
// Se ejecuta antes de `dev` y `build` (scripts predev / prebuild). Los archivos copiados no se versionan.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origen = join(raiz, 'node_modules', 'onnxruntime-web', 'dist');
const destino = join(raiz, 'public', 'ort');
// transformers.js 3.0.2 pide la variante «jsep» (21 MB) aunque se ejecute en CPU; la normal queda como respaldo.
const archivos = ['ort-wasm-simd-threaded.jsep.wasm', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs'];

if (!existsSync(origen)) {
  console.warn('onnxruntime-web no está instalado: ejecuta npm install antes. El modelo semántico no podrá cargar el motor WASM.');
  process.exit(0);
}
mkdirSync(destino, { recursive: true });
for (const a of archivos) copyFileSync(join(origen, a), join(destino, a));
console.log(`motor WASM copiado a public/ort (${archivos.length} archivos)`);
