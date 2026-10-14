// Excel del listado de una tendencia: mismo diseño que _build_listados_excel de Streamlit (hojas «Programas» y «Asignaturas»,
// bloque de título, encabezado azul, filas alternadas, separador por programa y fragmentos detectados).
const AZUL_OSCURO = 'FF0F385A', AZUL_MEDIO = 'FF1565A7', AZUL_CLARO = 'FF1FB2DE', GRIS_FILA = 'FFEBF5FB', BLANCO = 'FFFFFFFF', AMARILLO = 'FFFBAF17';
const CAMPO_LABEL = { RA: 'Resultado de aprendizaje', Nucleos: 'Núcleos temáticos', Indicadores: 'Indicadores de logro', Proceso: 'Proceso Responsable' };
const relleno = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const lado = (style, argb) => ({ style, color: { argb } });
const bordeFino = () => ({ left: lado('thin', 'FFD0D7DE'), right: lado('thin', 'FFD0D7DE'), top: lado('thin', 'FFD0D7DE'), bottom: lado('thin', 'FFD0D7DE') });
const bordeCab = () => ({ left: lado('medium', AZUL_OSCURO), right: lado('medium', AZUL_OSCURO), top: lado('medium', AZUL_OSCURO), bottom: lado('medium', AZUL_OSCURO) });
const orden = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function bloqueTitulo(ws, titulo, subtitulo, nCols, fecha) {
  ws.mergeCells(1, 1, 2, nCols);
  const t = ws.getCell(1, 1);
  t.value = titulo; t.fill = relleno(AZUL_OSCURO); t.font = { name: 'Calibri', bold: true, color: { argb: BLANCO }, size: 16 };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 34; ws.getRow(2).height = 34;
  if (nCols > 1) ws.mergeCells(3, 1, 3, nCols - 1);
  const s = ws.getCell(3, 1);
  s.value = subtitulo; s.fill = relleno(AZUL_MEDIO); s.font = { name: 'Calibri', italic: true, color: { argb: BLANCO }, size: 10 };
  s.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  const f = ws.getCell(3, nCols);
  f.value = fecha; f.fill = relleno(AZUL_MEDIO); f.font = { name: 'Calibri', color: { argb: AMARILLO }, size: 10, bold: true };
  f.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(3).height = 20;
  for (let c = 1; c <= nCols; c++) ws.getCell(4, c).fill = relleno(AZUL_CLARO);
  ws.getRow(4).height = 4;
}

function encabezado(ws, fila, etiquetas, anchos) {
  etiquetas.forEach((e, i) => {
    const c = ws.getCell(fila, i + 1);
    c.value = e; c.fill = relleno(AZUL_OSCURO); c.font = { name: 'Calibri', bold: true, color: { argb: BLANCO }, size: 11 };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; c.border = bordeCab();
    ws.getColumn(i + 1).width = anchos[i];
  });
  ws.getRow(fila).height = 28;
}

function resumen(ws, fila, nCols, texto) {
  ws.mergeCells(fila, 1, fila, nCols);
  const c = ws.getCell(fila, 1);
  c.value = texto; c.fill = relleno(AMARILLO); c.font = { name: 'Calibri', bold: true, color: { argb: AZUL_OSCURO }, size: 10 };
  c.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
  ws.getRow(fila).height = 16;
}

const fechaHoy = () => { const d = new Date(), p = x => String(x).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`; };

/**
 * @param {Array} p.filas         filas del Paso 5 que cubren la tendencia (Modalidad, Nivel, Programa, asignatura)
 * @param {Map}   p.detalle       tendencia → matriz → hallazgos [{asignatura, keywords, campos, textos}] (de resumirTendencias)
 * @param {Map}   p.programaDe    matriz → programa
 * @returns {Promise<ArrayBuffer>}
 */
export async function libroListado({ filas, detalle, programaDe, tendenciaNombre = '', colAsignatura = 'Nombre asignatura o modulo' }) {
  const ExcelJS = (await import('exceljs')).default;
  const programas = [...new Map(filas.map(f => [`${f.Modalidad}|${f.Nivel}|${f.Programa}`, [f.Modalidad, f.Nivel, f.Programa]])).values()]
    .sort((a, b) => orden(String(a[0]), String(b[0])) || orden(String(a[1]), String(b[1])) || orden(String(a[2]), String(b[2])));
  const asignaturas = [...new Map(filas.filter(f => f[colAsignatura] != null && f[colAsignatura] !== '').map(f => [`${f.Programa}|${f[colAsignatura]}`, [f.Programa, f[colAsignatura]]])).values()]
    .sort((a, b) => orden(String(a[0]), String(b[0])) || orden(String(a[1]), String(b[1])));

  // (programa, asignatura) → palabras, campos y fragmentos detectados
  const busca = new Map();
  for (const [matriz, hs] of detalle ?? []) {
    const prog = String(programaDe.get(matriz) ?? '').trim();
    for (const hz of hs) {
      const key = `${prog}|${String(hz.asignatura ?? '').trim()}`;
      if (!busca.has(key)) busca.set(key, { keywords: new Set(), campos: new Set(), textos: {} });
      const o = busca.get(key);
      (hz.keywords ?? []).forEach(k => o.keywords.add(k));
      (hz.campos ?? []).forEach(c => o.campos.add(c));
      for (const [c, t] of Object.entries(hz.textos ?? {})) {
        const previo = o.textos[c] ?? '';
        if (t && t !== previo) o.textos[c] = previo ? `${previo}\n---\n${t}` : t;
      }
    }
  }

  const fecha = fechaHoy();
  const etiqueta = tendenciaNombre ? `Tendencia: ${tendenciaNombre}` : 'Todos los programas cargados';
  const wb = new ExcelJS.Workbook();

  // Hoja 1 — Programas
  const ws1 = wb.addWorksheet('Programas', { views: [{ showGridLines: false, state: 'frozen', ySplit: 6 }] });
  bloqueTitulo(ws1, 'Listado de Programas Académicos', etiqueta, 3, fecha);
  encabezado(ws1, 5, ['Modalidad', 'Nivel', 'Programa'], [18, 18, 52]);
  resumen(ws1, 6, 3, `Total de programas: ${programas.length}`);
  programas.forEach((fila, ri) => {
    fila.forEach((v, ci) => {
      const c = ws1.getCell(7 + ri, ci + 1);
      c.value = v; c.fill = relleno(ri % 2 === 0 ? GRIS_FILA : BLANCO); c.font = { name: 'Calibri', size: 10, color: { argb: 'FF1A1A2E' } };
      c.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false }; c.border = bordeFino();
    });
    ws1.getRow(7 + ri).height = 18;
  });

  // Hoja 2 — Asignaturas (con fila separadora por programa)
  const N = 5;
  const ws2 = wb.addWorksheet('Asignaturas', { views: [{ showGridLines: false, state: 'frozen', ySplit: 6 }] });
  bloqueTitulo(ws2, 'Listado de Asignaturas por Programa', etiqueta, N, fecha);
  encabezado(ws2, 5, ['Nombre del programa', 'Nombre de asignatura', 'Keywords identificadas', 'Campos detectados', 'Campo y fragmento detectado'], [38, 42, 28, 26, 60]);
  resumen(ws2, 6, N, `Total de asignaturas únicas: ${asignaturas.length}`);
  let previo = null, fila = 7;
  asignaturas.forEach(([programa, asignatura], ri) => {
    const prog = String(programa).trim(), asig = String(asignatura).trim();
    if (prog !== previo) {
      ws2.mergeCells(fila, 1, fila, N);
      const g = ws2.getCell(fila, 1);
      g.value = prog; g.fill = relleno(AZUL_MEDIO); g.font = { name: 'Calibri', bold: true, color: { argb: BLANCO }, size: 10 };
      g.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }; g.border = bordeFino();
      ws2.getRow(fila).height = 20;
      fila++; previo = prog;
    }
    const det = busca.get(`${prog}|${asig}`) ?? { keywords: new Set(), campos: new Set(), textos: {} };
    const kw = [...det.keywords].sort().join('; ');
    const campos = [...det.campos].sort().map(c => CAMPO_LABEL[c] ?? c).join('; ');
    const frag = Object.entries(det.textos).sort((a, b) => orden(a[0], b[0])).map(([c, t]) => `${CAMPO_LABEL[c] ?? c}:\n${t}`).join('\n\n');
    [prog, asig, kw, campos, frag].forEach((v, ci) => {
      const c = ws2.getCell(fila, ci + 1);
      c.value = v; c.fill = relleno(ri % 2 === 0 ? GRIS_FILA : BLANCO); c.font = { name: 'Calibri', size: 10, color: { argb: 'FF1A1A2E' } };
      c.alignment = { horizontal: 'left', vertical: 'top', wrapText: ci >= 2 }; c.border = bordeFino();
    });
    const lineas = frag ? frag.split('\n').length : 1;
    ws2.getRow(fila).height = Math.max(18, Math.min(lineas * 15, 400));
    fila++;
  });
  return wb.xlsx.writeBuffer();
}
