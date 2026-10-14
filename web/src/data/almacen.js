// Caché local (IndexedDB): matrices cargadas y resultados calculados por matriz.
// Todo queda en el navegador de quien usa la herramienta; nada se envía a ningún servidor.
const BD = 'microcurricular';
const TABLAS = { archivos: 'nombre', perfil: 'clave' };

function abrir() {
  return new Promise((ok, mal) => {
    const rq = indexedDB.open(BD, 2);
    rq.onupgradeneeded = () => {
      for (const [t, k] of Object.entries(TABLAS)) {
        if (!rq.result.objectStoreNames.contains(t)) rq.result.createObjectStore(t, { keyPath: k });
      }
    };
    rq.onsuccess = () => ok(rq.result);
    rq.onerror = () => mal(rq.error);
  });
}

async function transaccion(tabla, modo, fn) {
  const bd = await abrir();
  return new Promise((ok, mal) => {
    const tx = bd.transaction(tabla, modo);
    const r = fn(tx.objectStore(tabla));
    tx.oncomplete = () => { bd.close(); ok(r?.result); };
    tx.onerror = tx.onabort = () => { bd.close(); mal(tx.error); };
  });
}

/** SHA-256 del contenido (hex); null si el contexto no es seguro (p. ej. file://). */
export async function huella(buffer) {
  if (!globalThis.crypto?.subtle) return null;
  const h = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Devuelve false si el navegador no permite guardar (modo privado, iframe aislado…). */
export async function guardar(archivos) {
  try {
    await transaccion('archivos', 'readwrite', s => { s.clear(); for (const a of archivos) s.put(a); });
    return true;
  } catch { return false; }
}

export async function recuperar() {
  try { return (await transaccion('archivos', 'readonly', s => s.getAll())) ?? []; } catch { return []; }
}

export async function vaciar() {
  try {
    await transaccion('archivos', 'readwrite', s => s.clear());
    await transaccion('perfil', 'readwrite', s => s.clear());
  } catch { /* sin caché disponible */ }
}

/** Resultado del perfil de una matriz, por huella del archivo y de la configuración. */
export async function leerPerfil(clave) {
  try { return (await transaccion('perfil', 'readonly', s => s.get(clave))) ?? null; } catch { return null; }
}

export async function guardarPerfil(clave, valor) {
  try { await transaccion('perfil', 'readwrite', s => s.put({ clave, ...valor })); return true; } catch { return false; }
}
