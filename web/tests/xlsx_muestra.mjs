// Genera el listado de una tendencia con datos de muestra (para compararlo con el de Streamlit con openpyxl).
import { writeFileSync } from 'node:fs';
import { libroListado } from '../src/export/excelListado.js';
const filas = [
  { Modalidad: 'Presencial', Nivel: 'Pregrado', Programa: 'Admón de Empresas', 'Nombre asignatura o modulo': 'Gestión de datos' },
  { Modalidad: 'Presencial', Nivel: 'Pregrado', Programa: 'Admón de Empresas', 'Nombre asignatura o modulo': 'Ética' },
  { Modalidad: 'Virtual', Nivel: 'Posgrado', Programa: 'Contaduría', 'Nombre asignatura o modulo': 'Auditoría' }];
const detalle = new Map([['M1', [{ asignatura: 'Gestión de datos', keywords: ['datos', 'analítica'], campos: ['RA', 'Nucleos'], textos: { RA: 'Analizar datos', Nucleos: 'Big data' } }]]]);
const buf = await libroListado({ filas, detalle, programaDe: new Map([['M1', 'Admón de Empresas']]), tendenciaNombre: 'Analítica de datos' });
writeFileSync(process.argv[2], Buffer.from(buf));
console.log('ok');
