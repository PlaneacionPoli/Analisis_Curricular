// Cálculo del perfil de varias matrices desde cualquier página (Indicadores, Resumen Ejecutivo). Comparte con la página del Perfil
// el modo elegido (con o sin modelo semántico) y la caché de resultados, de modo que lo calculado aquí se ve allí y al revés.
import { calcularPerfil, estadoPerfil, iniciar, perfilEnCache, prepararConfig, reiniciar } from './servicio.js';

const CLAVE_MODO = 'perfil_modo';
const estado = { corriendo: false, hechas: 0, total: 0, nombre: '', modelo: null, error: null, version: 0 };

export const estadoLote = () => estado;

export function modoPerfil() {
  try { return localStorage.getItem(CLAVE_MODO); } catch { return null; }
}

export function fijarModoPerfil(modo) {
  try { localStorage.setItem(CLAVE_MODO, modo); } catch { /* sin almacenamiento */ }
}

let ultimo = 0;
const repintar = rerender => {
  const t = performance.now();
  if (t - ultimo > 500) { ultimo = t; rerender(); }
};

/** Matrices cuyo perfil ya está en la caché del navegador. */
export async function conPerfilEnCache(archivoDe) {
  await prepararConfig();
  const ids = new Set();
  for (const [id, archivo] of archivoDe) if (archivo && await perfilEnCache(archivo)) ids.add(id);
  return ids;
}

/**
 * Calcula el perfil de las matrices que faltan. `modo`: 'semantico' (descarga el modelo la primera vez) o 'lexico'.
 * Si el worker ya estaba iniciado en el otro modo, se reinicia.
 */
export async function calcularFaltantes(archivoDe, modo, rerender) {
  if (estado.corriendo) return;
  fijarModoPerfil(modo);
  Object.assign(estado, { corriendo: true, hechas: 0, total: 0, nombre: '', error: null, modelo: null });
  rerender();
  try {
    await prepararConfig();
    const pendientes = [];
    for (const [id, archivo] of archivoDe) if (archivo && !(await perfilEnCache(archivo))) pendientes.push([id, archivo]);
    estado.total = pendientes.length;
    const st = estadoPerfil();
    if (st.listo && st.semantica !== (modo === 'semantico')) reiniciar();
    await iniciar({ conSemantica: modo === 'semantico', alModelo: p => { estado.modelo = p; repintar(rerender); } });
    for (const [, archivo] of pendientes) {
      estado.nombre = archivo.nombre.replace(/^FormatoRA[_-]|\.xlsx?$/g, '');
      repintar(rerender);
      await calcularPerfil(archivo);
      estado.hechas++;
    }
  } catch (e) {
    estado.error = String(e?.message ?? e);
  }
  estado.corriendo = false;
  estado.version++;
  rerender();
}
