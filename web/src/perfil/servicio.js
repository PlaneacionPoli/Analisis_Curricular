// Servicio del módulo de perfil en el hilo principal: arranca el worker, calcula matriz por matriz y guarda el resultado
// en la caché local (clave = huella del archivo + huella de la configuración + modo).
import { guardarPerfil, leerPerfil } from '../data/almacen.js';
import { configDe } from './asociar.js';
import { huellaConfig } from './huella.js';

const BASE = import.meta.env.BASE_URL;
let worker = null, iniciando = null;
const estado = { listo: false, semantica: false, cfg: null, huella: null, errorSemantica: null, modelo: null };
const pendientes = new Map();   // id → { ok, mal, alAvance }
let contador = 0;

async function json(ruta) {
  const r = await fetch(`${BASE}data/${ruta}`);
  if (!r.ok) throw new Error(`No se pudo cargar ${ruta} (${r.status})`);
  return r.json();
}

let configurando = null;
let datosBase = null;

/** Carga la configuración del método y su huella (sin arrancar el worker ni descargar el modelo). */
export function prepararConfig() {
  if (configurando) return configurando;
  configurando = (async () => {
    const [lexico, config, verbosRespaldo] = await Promise.all([
      json('lexico_es.json'), json('config_asociacion_perfil.json'), json('taxonomia_verbos.json')]);
    datosBase = { lexico, config, verbosRespaldo };
    estado.cfg = configDe(config);
    estado.huella = await huellaConfig(estado.cfg);
    return estado;
  })();
  return configurando;
}

/** Arranca el worker (una sola vez). `alModelo(p)` recibe el avance de la descarga del modelo semántico. */
export function iniciar({ conSemantica = true, alModelo = null } = {}) {
  if (iniciando) return iniciando;
  iniciando = (async () => {
    await prepararConfig();
    const { lexico, config, verbosRespaldo } = datosBase;
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    await new Promise((ok, mal) => {
      worker.onerror = e => mal(new Error(e.message || 'Error al iniciar el cálculo del perfil'));
      worker.onmessage = ({ data }) => {
        if (data.tipo === 'modelo') { estado.modelo = data.p; alModelo?.(data.p); }
        else if (data.tipo === 'sin-semantica') estado.errorSemantica = data.error;
        else if (data.tipo === 'listo') { estado.listo = true; estado.semantica = data.semantica; worker.onmessage = enMensaje; ok(); }
      };
      worker.postMessage({ tipo: 'iniciar', lexico, config, verbosRespaldo, conSemantica, base: new URL(BASE, document.baseURI).href });
    });
    return estado;
  })();
  return iniciando;
}

function enMensaje({ data }) {
  const p = pendientes.get(data.id);
  if (!p) return;
  if (data.tipo === 'avance') p.alAvance?.(data);
  else if (data.tipo === 'resultado') { pendientes.delete(data.id); p.ok(data); }
  else if (data.tipo === 'error') { pendientes.delete(data.id); p.mal(new Error(data.error)); }
}

export const estadoPerfil = () => estado;

/** Detiene el worker para volver a iniciarlo con otro modo (con o sin modelo semántico). */
export function reiniciar() {
  worker?.terminate();
  worker = null; iniciando = null;
  pendientes.clear();
  Object.assign(estado, { listo: false, semantica: false, errorSemantica: null, modelo: null });
}

const claveDe = (a, modo) => (a.huella ? `${a.huella}|${estado.huella}|${modo}` : null);
const clave = a => claveDe(a, estado.semantica ? 's' : 'l');

/** Resultado ya calculado de un archivo (sin calcular nada); null si no está en la caché. */
export async function perfilEnCache(archivo) {
  await prepararConfig();
  for (const modo of estado.semantica ? ['s'] : ['s', 'l']) {
    const k = claveDe(archivo, modo);
    const r = k ? await leerPerfil(k) : null;
    if (r) return { ...r, desdeCache: true };
  }
  return null;
}

/** Resultado del perfil de un archivo: de la caché si existe, o calculado. */
export async function calcularPerfil(archivo, { alAvance = null } = {}) {
  await iniciar();
  const k = clave(archivo);
  if (k) {
    const previo = await leerPerfil(k);
    if (previo) return { ...previo, desdeCache: true };
  }
  const resultado = await new Promise((ok, mal) => {
    const id = ++contador;
    pendientes.set(id, { ok, mal, alAvance });
    worker.postMessage({ tipo: 'calcular', id, buffer: archivo.buffer.slice(0) });
  });
  const salida = { items: resultado.items, filas: resultado.filas, avisos: resultado.avisos, semantica: resultado.semantica };
  if (k) await guardarPerfil(k, salida);
  return { ...salida, desdeCache: false };
}

/** Compara el método con una lectura de referencia (filas de leerReferencia) usando el worker y el modelo ya cargados. */
export async function validarConReferencia(ref, archivosPorMatriz, { recalibrar = false, alAvance = null } = {}) {
  await iniciar();
  const nombres = new Set(ref.map(r => r.Matriz));
  const fuentes = [...archivosPorMatriz].filter(([n]) => nombres.has(n)).map(([n, a]) => [n, a.buffer.slice(0)]);
  const r = await new Promise((ok, mal) => {
    const id = ++contador;
    pendientes.set(id, { ok, mal, alAvance });
    worker.postMessage({ tipo: 'validar', id, ref, fuentes, recalibrar });
  });
  return { ...r.validacion, semantica: r.semantica };
}
