// Orquesta la carga: lee archivos, calcula su huella, los procesa en el worker y consolida.
import { consolidar } from './consolidar.js';
import { guardar, huella, recuperar, vaciar } from './almacen.js';

const MAX_BYTES = 200 * 1024 * 1024;

function procesarEnWorker(archivos, alProgreso) {
  return new Promise(resolver => {
    const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    const resultados = [];
    let i = 0;
    const siguiente = () => {
      if (i >= archivos.length) { worker.terminate(); resolver(resultados); return; }
      const a = archivos[i];
      alProgreso?.(i, archivos.length, a.nombre);
      worker.postMessage({ id: i, nombre: a.nombre, buffer: a.buffer.slice(0) });
    };
    worker.onmessage = ({ data }) => { resultados[data.id] = data.resultado; i++; siguiente(); };
    worker.onerror = e => {
      resultados[i] = { nombre: archivos[i].nombre, ok: false, causa: String(e.message || 'Error al leer').slice(0, 80), avisos: [] };
      i++; siguiente();
    };
    siguiente();
  });
}

/** Lee File[] del navegador. Descarta lo que no sea .xlsx y los archivos de más de 200 MB. */
export async function leerArchivos(files) {
  const lista = [...files];
  const validos = [], rechazados = [];
  for (const f of lista) {
    if (!/\.xlsx$/i.test(f.name)) rechazados.push({ nombre: f.name, causa: 'Solo se admiten archivos .xlsx' });
    else if (f.size > MAX_BYTES) rechazados.push({ nombre: f.name, causa: 'Supera 200 MB' });
    else validos.push(f);
  }
  const porNombre = new Map();   // un nombre repetido reemplaza al anterior
  for (const f of validos) {
    const buffer = await f.arrayBuffer();
    porNombre.set(f.name, { nombre: f.name, buffer, tamano: f.size, huella: await huella(buffer) });
  }
  return { archivos: [...porNombre.values()], rechazados };
}

/** Procesa y consolida; guarda las matrices en la caché local. */
export async function cargar(archivos, alProgreso) {
  const resultados = await procesarEnWorker(archivos, alProgreso);
  const guardado = await guardar(archivos);
  return { ...consolidar(resultados), resultados, guardado };
}

export async function restaurar() {
  return recuperar();
}

export async function olvidar() {
  await vaciar();
}
