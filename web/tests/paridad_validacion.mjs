// Paridad de la validación del perfil con src/calibracion_asociacion.py (referencia: tests/golden_validacion.json).
//   node tests/paridad_validacion.mjs [--semantica] [--calibrar]
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDe } from '../src/perfil/asociar.js';
import { cargarLexico } from '../src/perfil/nlp.js';
import { leerReferencia, validar } from '../src/perfil/calibracion.js';

const aquí = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const carpeta = resolve(join(aquí, '../../data/raw/FORMATOS RA CICLO UNO RC'));
const g = JSON.parse(readFileSync(join(aquí, 'golden_validacion.json'), 'utf-8'));
cargarLexico(JSON.parse(readFileSync(join(aquí, '../public/data/lexico_es.json'), 'utf-8')));
const cfg = configDe(JSON.parse(readFileSync(join(aquí, '../public/data/config_asociacion_perfil.json'), 'utf-8')));
const verbos = JSON.parse(readFileSync(join(aquí, '../public/data/taxonomia_verbos.json'), 'utf-8'));
let incrustar = null;
if (args.includes('--semantica')) incrustar = await (await import('../src/perfil/incrustar.js')).crearIncrustador({ nodo: true });
const fuentes = new Map(readdirSync(carpeta).filter(f => /^FormatoRA.*\.xlsx$/.test(f)).map(f => [f.replace(/^FormatoRA[_-]|\.xlsx?$/g, ''), new Uint8Array(readFileSync(join(carpeta, f)))]));
const ref = leerReferencia(readFileSync(join(aquí, '../../auditoria/referencia_asociacion_perfil.csv'), 'utf-8'));
const t0 = Date.now();
const r = await validar(ref, fuentes, { cfg, incrustar, lexicoRespaldo: verbos, recalibrar: args.includes('--calibrar') });
console.log(`calculado en ${((Date.now() - t0) / 1000).toFixed(0)} s · casos py ${g.casos} · js ${r.casos} · sin emparejar py ${g.sin_emparejar.length} · js ${r.sin_emparejar.length}`);
const f = o => `acuerdo ${(o.acuerdo * 100).toFixed(1)} % · κ ${o.kappa} · método ${o['metodo_%']} % · referencia ${o['referencia_%']} %`;
for (const capa of Object.keys(g.metricas_activas)) console.log(`activos ${capa.padEnd(12)} py: ${f(g.metricas_activas[capa])}\n${' '.repeat(22)}js: ${f(r.metricas_activas[capa])}`);
if (r.parametros_propuestos) {
  console.log('propuestos py:', JSON.stringify(g.parametros_propuestos), f(g.metricas_propuestas.Global));
  console.log('propuestos js:', JSON.stringify(r.parametros_propuestos), f(r.metricas_propuestas.Global));
}
