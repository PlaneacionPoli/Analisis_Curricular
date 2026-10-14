// Genera los libros de Excel con datos reales de muestra (golden de indicadores) para revisarlos con openpyxl.
import { readFileSync, writeFileSync } from 'node:fs';
import { libroIndicadores, libroResumen } from '../src/export/libros.js';
const g = JSON.parse(readFileSync(new URL('./golden_indicadores.json', import.meta.url), 'utf8'));
const etiqueta = new Map(g.por_matriz.map(m => [m.Matriz, `${m.Programa} – ${m.Sede}`]));
const vista = { por_matriz: g.por_matriz, ra: g.ra, estrategias: g.estrategias, indicadores: g.indicadores };
const val = g.valoracion;
const salida = process.argv[2];
writeFileSync(`${salida}/indicadores.xlsx`, Buffer.from(await (await libroIndicadores({ vista, val, etiqueta, alcance: 'Conjunto completo' })).arrayBuffer()));
const prioridades = g.por_matriz.slice(0, 5).map(m => ({ Matriz: m.Matriz, Etiqueta: etiqueta.get(m.Matriz), V1: 'Parcial', V2: 'Descriptiva', V3: 'Cumple', V4: 'No cumple', V5: 'Cumple', 'No cumple': 1, Parcial: 1 }));
writeFileSync(`${salida}/resumen.xlsx`, Buffer.from(await (await libroResumen({ prioridades, lectura: ['<b>1 de 5</b> matrices'], val, alertas: [{ Categoría: 'Tipo de Saber', Hallazgo: 'x', Recomendación: 'y' }], tendencias: [{ Tendencia: 'IA', Asignaturas: 3, '% de asignaturas': 4.5, Programas: 2, '% de programas': 5 }],
  etiqueta, criterios: [['V1', 'Perfil alineado'], ['V2', 'Coherencia'], ['V3', 'Evaluabilidad'], ['V4', 'Trazabilidad'], ['V5', 'Indicadores']], alcance: 'Facultad: Ingeniería' })).arrayBuffer()));
console.log('ok');
