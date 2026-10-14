// Libros de Excel con la imagen institucional y el detalle necesario para leerlos sin el tablero: hoja «Léeme» (qué contiene cada hoja y cómo se calculó),
// encabezados azul marino, filas alternadas, filtros, paneles congelados, anchos ajustados, formatos numéricos y colores por estado.
// Paleta: navy 0F385A · azul 1FB2DE · azul medio 1565A7 · dorado FBAF17 (el mismo del listado de tendencias).
const NAVY = 'FF0F385A', MEDIO = 'FF1565A7', AZUL = 'FF1FB2DE', DORADO = 'FFFBAF17', BLANCO = 'FFFFFFFF', FILA = 'FFEBF5FB', TEXTO = 'FF1A1A2E';
const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PASTEL = { azul: 'FFD1F0FA', ambar: 'FFFEEFCD', magenta: 'FFFCD6E8', gris: 'FFE6E8EB', neutro: 'FFF5F6F8' };
// valor de la celda → color de relleno (coincidencia exacta)
const ESTADO = {
  Cumple: PASTEL.azul, Coherente: PASTEL.azul, Coincide: PASTEL.azul, 'Asociado en las tres capas': PASTEL.azul,
  Parcial: PASTEL.ambar, 'Asociación parcial': PASTEL.ambar, 'Revisar nivel': PASTEL.ambar, 'Nivel difiere': PASTEL.ambar,
  'No cumple': PASTEL.magenta, 'Sin asociación': PASTEL.magenta, 'Revisar dominio': PASTEL.magenta, 'Dominio difiere': PASTEL.magenta,
  'Sin dato': PASTEL.gris, 'Verbo sin clasificar': PASTEL.gris, 'Verbo fuera de la base': PASTEL.gris, Descriptiva: PASTEL.neutro,
};
const relleno = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const lado = (style, argb) => ({ style, color: { argb } });
const bordeFino = () => ({ left: lado('thin', 'FFD0D7DE'), right: lado('thin', 'FFD0D7DE'), top: lado('thin', 'FFD0D7DE'), bottom: lado('thin', 'FFD0D7DE') });
const bordeCab = () => ({ left: lado('thin', NAVY), right: lado('thin', NAVY), top: lado('medium', NAVY), bottom: lado('medium', NAVY) });
const nombreHoja = t => String(t).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
const fechaHoy = () => { const d = new Date(), p = x => String(x).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`; };

/** Valor listo para una celda: booleanos como Sí/No, objetos como texto, nulos como vacío. */
function valor(v) {
  if (v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))) return '';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (Array.isArray(v)) return v.join('; ');
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k}: ${x}`).join('; ');
  return v;
}

/** Formato numérico según el nombre de la columna: «%» con un decimal; enteros sin decimales; el resto con hasta dos. */
function formatoNumero(titulo, valores) {
  if (/%/.test(titulo)) return '0.0';
  if (valores.every(v => Number.isInteger(v))) return '#,##0';
  return '0.00';
}

function bloqueTitulo(ws, titulo, subtitulo, nCols) {
  const n = Math.max(nCols, 3);
  ws.mergeCells(1, 1, 2, n);
  const t = ws.getCell(1, 1);
  t.value = titulo; t.fill = relleno(NAVY); t.font = { name: 'Calibri', bold: true, color: { argb: BLANCO }, size: 16 };
  t.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 24; ws.getRow(2).height = 24;
  ws.mergeCells(3, 1, 3, n - 1);
  const s = ws.getCell(3, 1);
  s.value = subtitulo; s.fill = relleno(MEDIO); s.font = { name: 'Calibri', italic: true, color: { argb: BLANCO }, size: 10 };
  s.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
  const f = ws.getCell(3, n);
  f.value = fechaHoy(); f.fill = relleno(MEDIO); f.font = { name: 'Calibri', color: { argb: DORADO }, size: 10, bold: true };
  f.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(3).height = 30;
  for (let c = 1; c <= n; c++) ws.getCell(4, c).fill = relleno(AZUL);
  ws.getRow(4).height = 4;
}

/**
 * @param {string} p.titulo     título del libro (se repite en la hoja «Léeme»)
 * @param {string} p.alcance    filtros y conjunto al que se refiere (por ejemplo «Facultad: Ingeniería; Modalidad: Virtual»)
 * @param {Array}  p.hojas      [{ nombre, titulo?, descripcion, filas: [{col: valor}], columnas?: [{ campo, titulo?, ancho?, ayuda? }], anchoFijo? }]
 * @returns {Promise<Blob>}
 */
export async function libroMarca({ titulo, alcance = '', hojas }) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Análisis Microcurricular · Politécnico Grancolombiano';

  // ── Léeme ───────────────────────────────────────────────────────────────
  const lm = wb.addWorksheet('Léeme', { views: [{ showGridLines: false }] });
  lm.columns = [{ width: 30 }, { width: 70 }, { width: 14 }];
  bloqueTitulo(lm, titulo, alcance || 'Conjunto completo de matrices cargadas', 3);
  let r = 6;
  const fila = (a, b, c, estilo) => {
    [a, b, c].forEach((v, i) => {
      const cell = lm.getCell(r, i + 1);
      cell.value = v ?? ''; cell.border = bordeFino(); cell.alignment = { vertical: 'top', wrapText: true, horizontal: i === 2 ? 'right' : 'left' };
      if (estilo === 'cab') { cell.fill = relleno(NAVY); cell.font = { name: 'Calibri', bold: true, color: { argb: BLANCO }, size: 11 }; cell.border = bordeCab(); }
      else { cell.fill = relleno(estilo === 'par' ? FILA : BLANCO); cell.font = { name: 'Calibri', size: 10, color: { argb: TEXTO }, bold: i === 0 }; }
    });
    r++;
  };
  fila('Hoja', 'Qué contiene', 'Registros', 'cab');
  hojas.forEach((h, i) => fila(h.nombre, h.descripcion ?? '', h.filas.length, i % 2 ? 'par' : 'impar'));
  r++;
  const glosario = hojas.flatMap(h => (h.columnas ?? []).filter(c => c.ayuda).map(c => [`${h.nombre} · ${c.titulo ?? c.campo}`, c.ayuda]));
  if (glosario.length) {
    fila('Columna', 'Cómo se interpreta', '', 'cab');
    glosario.forEach(([a, b], i) => fila(a, b, '', i % 2 ? 'par' : 'impar'));
    r++;
  }
  lm.mergeCells(r, 1, r, 3);
  const nota = lm.getCell(r, 1);
  nota.value = 'Propuesta para validar por el comité curricular. Calculado con los archivos cargados en el tablero; los porcentajes están expresados de 0 a 100.';
  nota.font = { name: 'Calibri', italic: true, size: 9, color: { argb: 'FF6C7A93' } }; nota.alignment = { wrapText: true };

  // ── hojas de datos ─────────────────────────────────────────────────────────
  for (const hoja of hojas) {
    const filas = hoja.filas;
    const campos = (hoja.columnas ?? (filas.length ? Object.keys(filas[0]).map(campo => ({ campo })) : [{ campo: 'Sin registros' }]))
      .map(c => ({ ...c, titulo: c.titulo ?? c.campo }));
    const ws = wb.addWorksheet(nombreHoja(hoja.nombre), { views: [{ showGridLines: false, state: 'frozen', ySplit: 6 }] });
    bloqueTitulo(ws, hoja.titulo ?? hoja.nombre, hoja.descripcion ?? '', campos.length);
    // encabezados
    campos.forEach((c, i) => {
      const cell = ws.getCell(6, i + 1);
      cell.value = c.titulo; cell.fill = relleno(NAVY); cell.font = { name: 'Calibri', bold: true, color: { argb: BLANCO }, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; cell.border = bordeCab();
    });
    ws.getRow(6).height = 32;
    // fila de resumen (encima del encabezado, para que el filtro solo abarque datos)
    ws.mergeCells(5, 1, 5, Math.max(campos.length, 1));
    const res = ws.getCell(5, 1);
    res.value = `${filas.length.toLocaleString('es-CO')} registro${filas.length === 1 ? '' : 's'}`;
    res.fill = relleno(DORADO); res.font = { name: 'Calibri', bold: true, color: { argb: NAVY }, size: 10 }; res.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
    ws.getRow(5).height = 16;
    // datos
    const formatos = campos.map(c => {
      const nums = filas.map(f => f[c.campo]).filter(v => typeof v === 'number' && !Number.isNaN(v));
      return nums.length ? formatoNumero(c.titulo, nums) : null;
    });
    const largo = campos.map(c => Math.max(String(c.titulo).length, ...filas.slice(0, 400).map(f => String(valor(f[c.campo])).length)));
    filas.forEach((f, ri) => {
      campos.forEach((c, ci) => {
        const v = valor(f[c.campo]);
        const cell = ws.getCell(7 + ri, ci + 1);
        cell.value = v;
        cell.fill = relleno(ESTADO[v] ?? (ri % 2 === 0 ? FILA : BLANCO));
        cell.font = { name: 'Calibri', size: 10, color: { argb: TEXTO }, bold: Boolean(ESTADO[v]) };
        cell.border = bordeFino();
        const numerico = typeof v === 'number';
        cell.alignment = { vertical: 'top', horizontal: numerico ? 'right' : ESTADO[v] ? 'center' : 'left', wrapText: !numerico && largo[ci] > 40 };
        if (numerico && formatos[ci]) cell.numFmt = formatos[ci];
      });
    });
    campos.forEach((c, i) => { ws.getColumn(i + 1).width = c.ancho ?? Math.min(Math.max(largo[i] + 3, 11), 60); });
    if (filas.length) ws.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6 + filas.length, column: campos.length } };
    ws.views = [{ showGridLines: false, state: 'frozen', xSplit: hoja.congelarColumnas ?? 0, ySplit: 6 }];
  }
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: MIME });
}

export const MIME_XLSX = MIME;
