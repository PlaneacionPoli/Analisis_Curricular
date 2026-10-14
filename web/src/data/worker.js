// Web Worker: lee las matrices fuera del hilo de la interfaz.
import { parseMatriz } from './parseMatrix.js';

self.onmessage = ({ data: { id, nombre, buffer } }) => {
  let resultado;
  try {
    resultado = parseMatriz(new Uint8Array(buffer), nombre);
  } catch (e) {
    resultado = { nombre, ok: false, causa: String(e.message || e).slice(0, 80), avisos: [] };
  }
  self.postMessage({ id, resultado });
};
