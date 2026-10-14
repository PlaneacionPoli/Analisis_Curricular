// Web Worker del módulo de perfil: carga el léxico y el modelo semántico una vez y calcula la asociación de cada matriz.
import { asociar, configDe, resumenItems } from './asociar.js';
import { crearIncrustador } from './incrustar.js';
import { validar } from './calibracion.js';
import { cargarLexico } from './nlp.js';

let cfg = null, verbos = [], incrustar = null;
let cola = Promise.resolve();

async function iniciar({ lexico, config, verbosRespaldo, conSemantica, base }) {
  cargarLexico(lexico);
  cfg = configDe(config);
  verbos = verbosRespaldo;
  incrustar = null;
  if (conSemantica) {
    try {
      incrustar = await crearIncrustador({ wasmBase: base ? `${base}ort/` : null, alProgreso: p => self.postMessage({ tipo: 'modelo', p }) });
    } catch (e) {
      self.postMessage({ tipo: 'sin-semantica', error: String(e?.message ?? e) });
    }
  }
  self.postMessage({ tipo: 'listo', semantica: incrustar !== null });
}

async function calcular({ id, buffer }) {
  try {
    const { filas, avisos } = await asociar(new Uint8Array(buffer), cfg, {
      incrustar, lexicoRespaldo: verbos,
      alProgreso: (capa, i, n) => self.postMessage({ tipo: 'avance', id, capa, i, n }),
    });
    self.postMessage({ tipo: 'resultado', id, filas, items: resumenItems(filas), avisos, semantica: incrustar !== null });
  } catch (e) {
    self.postMessage({ tipo: 'error', id, error: `${e?.name ?? 'Error'}: ${String(e?.message ?? e).slice(0, 300)}` });
  }
}

async function validarReferencia({ id, ref, fuentes, recalibrar }) {
  try {
    const mapa = new Map(fuentes.map(([n, b]) => [n, new Uint8Array(b)]));
    const r = await validar(ref, mapa, { cfg, incrustar, lexicoRespaldo: verbos, recalibrar,
      alProgreso: (i, n, nombre) => self.postMessage({ tipo: 'avance', id, capa: nombre, i, n }) });
    self.postMessage({ tipo: 'resultado', id, validacion: r, semantica: incrustar !== null });
  } catch (e) {
    self.postMessage({ tipo: 'error', id, error: `${e?.name ?? 'Error'}: ${String(e?.message ?? e).slice(0, 300)}` });
  }
}

self.onmessage = ({ data }) => {
  if (data.tipo === 'iniciar') cola = cola.then(() => iniciar(data));
  else if (data.tipo === 'calcular') cola = cola.then(() => calcular(data));
  else if (data.tipo === 'validar') cola = cola.then(() => validarReferencia(data));
};
