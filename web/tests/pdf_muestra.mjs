// Genera con la versión web los mismos informes que web/tools/exportar_informe_muestra.py genera con Python.
// Uso: node tests/pdf_muestra.mjs <carpeta con muestra_informe.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { informeGeneral, informePrograma } from '../src/export/informesPdf.js';

const carpeta = process.argv[2];
const { general, programa } = JSON.parse(readFileSync(`${carpeta}/muestra_informe.json`, 'utf8'));
const png = readFileSync(new URL('../public/logo_poli.png', import.meta.url));
const logo = { dataUrl: `data:image/png;base64,${png.toString('base64')}`, ancho: png.readUInt32BE(16), alto: png.readUInt32BE(20) };
writeFileSync(`${carpeta}/js_general.pdf`, informeGeneral(general, logo));
writeFileSync(`${carpeta}/js_programa.pdf`, informePrograma(programa, logo));
console.log('ok');
