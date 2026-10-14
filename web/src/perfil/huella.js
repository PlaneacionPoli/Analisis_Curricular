// Huella SHA-256 de la configuración del método, idéntica a config_actual() de src/asociacion_perfil.py:
// sha256(json.dumps(cfg, sort_keys=True, ensure_ascii=False)) con la serialización de Python
// (separadores «, » y «: », decimales con «.0»).
const FLOTANTES = new Set(['explicita', 'parcial', 'semantica', 'FACTOR_ROL', 'PESO_NUCLEO', 'UMBRAL_CONTEXTO', 'PESO_CONTEXTO']);

function numero(n, clave) {
  if (Number.isInteger(n) && FLOTANTES.has(clave)) return n.toFixed(1);
  return String(n);
}

/** json.dumps de Python con sort_keys=True y ensure_ascii=False. */
export function dumpsPython(v, clave = '') {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return numero(v, clave);
  if (typeof v === 'string') return JSON.stringify(v).replace(/|/g, c => c);
  if (Array.isArray(v)) return '[' + v.map(x => dumpsPython(x)).join(', ') + ']';
  const claves = Object.keys(v).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return '{' + claves.map(k => `${JSON.stringify(k)}: ${dumpsPython(v[k], k)}`).join(', ') + '}';
}

export async function sha256(texto) {
  const datos = new TextEncoder().encode(texto);
  const h = await crypto.subtle.digest('SHA-256', datos);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Huella de la configuración activa (cfg = salida de configDe). */
export async function huellaConfig(cfg) {
  const sinonimos = {};
  for (const [k, v] of [...cfg.SINONIMOS].sort((a, b) => (a[0] < b[0] ? -1 : 1))) sinonimos[k] = [...v].sort();
  const agentes = {};
  for (const k of Object.keys(cfg.AGENTE_IRREGULAR).sort()) agentes[k] = [...cfg.AGENTE_IRREGULAR[k]];
  const obj = {
    PARAMS: cfg.PARAMS, FACTOR_ROL: cfg.FACTOR_ROL, PESO_NUCLEO: cfg.PESO_NUCLEO, UMBRAL_CONTEXTO: cfg.UMBRAL_CONTEXTO,
    PESO_CONTEXTO: cfg.PESO_CONTEXTO, RAIZ: cfg.RAIZ, MODELO_SEMANTICO: cfg.MODELO_SEMANTICO,
    SINONIMOS: sinonimos, AGENTE_IRREGULAR: agentes,
  };
  return sha256(dumpsPython(obj));
}
