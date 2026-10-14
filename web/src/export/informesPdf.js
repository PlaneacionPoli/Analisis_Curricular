// Port de src/informes_pdf.py: informe general del conjunto e informe por programa, en PDF (A4, Helvetica, latin-1).
// No calcula indicadores: compone en un documento los resultados que le entrega la página (misma estructura que `d` en Python).
import { jsPDF } from 'jspdf';
import * as plugin from 'jspdf-autotable';

const autoTable = [plugin.default, plugin.default?.default, plugin.autoTable].find(f => typeof f === 'function');

const AZUL = [15, 56, 90], CIAN = [31, 178, 222], MAGENTA = [236, 6, 119], AMARILLO = [251, 175, 23], GRIS = [138, 148, 160], FONDO = [234, 249, 253];
const COLOR_ESTADO = { Cumple: [209, 240, 250], Parcial: [254, 239, 205], 'No cumple': [252, 214, 232], 'Sin dato': [230, 232, 235], Descriptiva: [245, 246, 248] };
const COLOR_BARRA_ESTADO = { Cumple: CIAN, Parcial: AMARILLO, 'No cumple': MAGENTA, 'Sin dato': GRIS };
const COLOR_CONTRASTE = { Coincide: CIAN, 'Nivel difiere': AMARILLO, 'Dominio difiere': MAGENTA, 'Verbo fuera de la base': GRIS };
const SUSTITUTOS = [['–', '-'], ['—', '-'], ['≥', '>='], ['≤', '<='], ['→', '->'], ['…', '...'], ['“', '"'], ['”', '"'], ['‘', "'"], ['’', "'"],
  ['κ', 'kappa'], ['²', '2'], ['·', '-'], ['•', '-'], [' ', ' '], [' ', ' '], ['−', '-']];
const PIE = 'Propuesta para validar por el comité curricular. Calculado con los archivos cargados en el dashboard.';
const MM = 0.3528; // mm por punto
const NOTA_TAXONOMIAS = 'Cada RA único declara en el Paso 3 su taxonomía (Bloom o BAK), dominio y nivel. El nivel se traduce a una escala común de 1 a 6 según su posición en la progresión de su dominio, ' +
  'y el índice de exigencia es (nivel medio - 1) / 5 x 100; es descriptivo, porque la exigencia adecuada depende del nivel de formación. El contraste compara el dominio y el nivel declarados con los que la base de ' +
  'verbos asigna al verbo del RA: «Coincide» si el dominio está entre los de la base y la diferencia de nivel es menor de 0,5; «Nivel difiere» o «Dominio difiere» piden revisión, no declaran un error, ' +
  'porque un verbo puede admitir varias lecturas.';

/** Texto apto para Helvetica (latin-1), sin marcas de negrita ni etiquetas HTML. */
export function texto(t) {
  let s = t === null || t === undefined ? '' : String(t);
  s = s.replace(/<[^>]+>/g, '').replace(/\*\*/g, '');
  for (const [a, b] of SUSTITUTOS) s = s.split(a).join(b);
  return s.replace(/[^\u0000-ÿ]/g, '?');
}

export const pct = v => (v === null || v === undefined || Number.isNaN(v) ? '-' : `${Number(v).toFixed(0)} %`.replace('.', ','));
const coma = (v, d = 1) => Number(v).toFixed(d).replace('.', ',');

class Informe {
  constructor(titulo, logo) {
    this.doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    this.titulo = texto(titulo);
    this.logo = logo;
    this.w = 210; this.h = 297; this.y = 18;
    this.doc.setFont('helvetica', 'normal');
  }

  pagina() { this.doc.addPage(); this.y = 18; }
  /** Garantiza `alto` mm libres en la página; si no, abre una nueva (margen inferior 16 mm). */
  asegurar(alto) { if (this.y + alto > this.h - 16) this.pagina(); }
  fuente(tam, estilo = 'normal', color = AZUL) { this.doc.setFont('helvetica', estilo); this.doc.setFontSize(tam); this.doc.setTextColor(...color); }
  /** Texto en una celda de alto `alto` (como cell() de fpdf: centrado vertical). */
  celda(x, y, ancho, alto, t, tam, align = 'left') {
    const base = y + alto / 2 + 0.3 * tam * MM;
    const tx = align === 'center' ? x + ancho / 2 : align === 'right' ? x + ancho : x;
    this.doc.text(texto(t), tx, base, { align });
  }
  /** Párrafo con ajuste de línea (multi_cell); parte entre páginas. */
  multilinea(x, ancho, lh, t, tam) {
    const lineas = this.doc.splitTextToSize(texto(t), ancho);
    for (const l of lineas) {
      this.asegurar(lh);
      this.doc.text(l, x, this.y + lh / 2 + 0.3 * tam * MM);
      this.y += lh;
    }
  }

  portada(titulo, subtitulo, alcance, fecha) {
    const d = this.doc;
    this.y = 0; // primera página ya existe
    d.setFillColor(...AZUL); d.rect(0, 0, this.w, 46, 'F');
    if (this.logo) {
      d.setFillColor(255, 255, 255); d.roundedRect(this.w - 57, 6, 42, 28, 2, 2, 'F');
      const alto = 38 * this.logo.alto / this.logo.ancho;
      d.addImage(this.logo.dataUrl, 'PNG', this.w - 55, 8, 38, alto);
    }
    this.fuente(9, 'normal', [255, 255, 255]);
    this.celda(15, 12, 100, 5, subtitulo, 9);
    this.fuente(17, 'bold', [255, 255, 255]);
    this.y = 17;
    this.multilinea(15, this.w - 30 - 40, 8, titulo, 17);
    this.y = 50;
    this.fuente(8.5, 'normal', AZUL);
    this.multilinea(15, 180, 4.5, `${alcance}  |  Generado el ${fecha}`, 8.5);
    this.y += 2;
  }

  seccion(titulo) {
    if (this.y > this.h - 45) this.pagina();
    this.y += 3;
    this.doc.setFillColor(...CIAN); this.doc.rect(15, this.y + 1, 1.6, 6, 'F');
    this.fuente(12, 'bold');
    this.celda(19, this.y, 150, 8, titulo, 12);
    this.y += 9;
  }

  subtitulo(titulo) {
    if (this.y > this.h - 35) this.pagina();
    this.y += 1;
    this.fuente(10, 'bold');
    this.celda(15, this.y, 180, 6, titulo, 10);
    this.y += 6;
  }

  parrafo(t, tam = 9, color = AZUL) { this.fuente(tam, 'normal', color); this.multilinea(15, 180, 4.6, t, tam); this.y += 1; }

  lista(items, tam = 9) {
    this.fuente(tam, 'normal', AZUL);
    for (const it of items) {
      this.asegurar(4.6);
      this.celda(17, this.y, 4, 4.6, '-', tam);
      this.multilinea(21, 174, 4.6, it, tam);
    }
    this.y += 1;
  }

  kpis(items) {
    const n = items.length;
    if (!n) return;
    const gap = 3, ancho = (this.w - 30 - gap * (n - 1)) / n, d = this.doc;
    this.asegurar(20);
    items.forEach(([etq, val], i) => {
      const x = 15 + i * (ancho + gap);
      d.setFillColor(...FONDO); d.setDrawColor(...CIAN); d.setLineWidth(0.2); d.rect(x, this.y, ancho, 17, 'FD');
      this.fuente(7.5, 'normal', GRIS); this.celda(x + 2.5, this.y + 2, ancho - 5, 4, etq, 7.5);
      this.fuente(14, 'bold', AZUL); this.celda(x + 2.5, this.y + 7, ancho - 5, 8, val, 14);
    });
    this.y += 20;
  }

  /** Barras horizontales 0–100 %: [etiqueta, valor, color, nota]. */
  barras(filas, anchoEtq = 70) {
    const anchoMax = this.w - 30 - anchoEtq - 42, d = this.doc;
    for (const [etq, val, color, nota] of filas) {
      if (this.y > this.h - 25) this.pagina();
      const y = this.y;
      this.fuente(8.5, 'normal', AZUL); this.celda(15, y, anchoEtq, 6, etq, 8.5);
      d.setFillColor(236, 239, 242); d.rect(15 + anchoEtq, y + 1.2, anchoMax, 3.6, 'F');
      if (val !== null && val !== undefined) { d.setFillColor(...color); d.rect(15 + anchoEtq, y + 1.2, Math.max(0.4, anchoMax * Math.min(val, 100) / 100), 3.6, 'F'); }
      this.fuente(8.5, 'bold', AZUL); this.celda(15 + anchoEtq + anchoMax + 2, y, 16, 6, pct(val), 8.5);
      this.fuente(7, 'normal', GRIS); this.celda(15 + anchoEtq + anchoMax + 18, y, 24, 6, nota, 7);
      this.y = y + 6.5;
    }
    this.y += 1;
  }

  /** Una barra por criterio con los conteos de matrices por estado: [etiqueta, {estado: n}]. */
  barrasApiladas(filas, anchoEtq = 62) {
    const anchoMax = this.w - 30 - anchoEtq - 4, d = this.doc;
    for (const [etq, conteo] of filas) {
      const total = Object.values(conteo).reduce((a, b) => a + b, 0);
      if (!total) continue;
      this.asegurar(8);
      const y = this.y;
      this.fuente(8.5, 'normal', AZUL); this.celda(15, y, anchoEtq, 7, etq, 8.5);
      let x = 15 + anchoEtq;
      for (const e of ['Cumple', 'Parcial', 'No cumple', 'Sin dato']) {
        const n = conteo[e] ?? 0;
        if (!n) continue;
        const w = anchoMax * n / total;
        d.setFillColor(...COLOR_BARRA_ESTADO[e]); d.rect(x, y + 1, w, 5, 'F');
        if (w > 5) { this.fuente(7.5, 'bold', [255, 255, 255]); this.celda(x, y + 1, w, 5, String(n), 7.5, 'center'); }
        x += w;
      }
      this.y = y + 7.5;
    }
    this.asegurar(8);
    let x = 15 + anchoEtq;
    const y = this.y + 1;
    for (const e of ['Cumple', 'Parcial', 'No cumple', 'Sin dato']) {
      d.setFillColor(...COLOR_BARRA_ESTADO[e]); d.rect(x, y + 1, 3, 3, 'F');
      this.fuente(7.5, 'normal', AZUL); this.celda(x + 4, y, 22, 5, e, 7.5);
      x += 26;
    }
    this.y = y + 7;
  }

  /** Tabla con encabezado azul; las columnas de `colEstado` se colorean según el estado. */
  tabla(columnas, filas, anchos, { colEstado = [], tam = 7.5, alinear = null } = {}) {
    if (!filas.length) return;
    const aliniar = i => { const a = Array.isArray(alinear) ? alinear[i] : alinear; return (a ?? 'LEFT').toLowerCase(); };
    const estados = new Set(colEstado);
    autoTable(this.doc, {
      startY: this.y, margin: { left: 15, right: 15, top: 18, bottom: 16 }, tableWidth: anchos.reduce((a, b) => a + b, 0),
      head: [columnas.map(texto)], body: filas.map(f => f.map(v => texto(v))),
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: tam, textColor: AZUL, cellPadding: { top: 1.4, bottom: 1.4, left: 1, right: 1 }, lineColor: [205, 214, 222], lineWidth: 0, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [246, 250, 252] },
      columnStyles: Object.fromEntries(anchos.map((w, i) => [i, { cellWidth: w, halign: aliniar(i) }])),
      didParseCell: data => {
        if (data.section === 'body' && estados.has(data.column.index) && COLOR_ESTADO[data.cell.raw]) data.cell.styles.fillColor = COLOR_ESTADO[data.cell.raw];
        if (data.section === 'head') data.cell.styles.halign = aliniar(data.column.index);
      },
      didDrawCell: data => {
        if (data.section !== 'body') return;
        const { x, y, width, height } = data.cell;
        this.doc.setDrawColor(205, 214, 222); this.doc.setLineWidth(0.1); this.doc.line(x, y + height, x + width, y + height);
      },
    });
    this.y = this.doc.lastAutoTable.finalY + 2;
  }

  barrasContraste(pctPorEstado, n) {
    this.barras(Object.keys(COLOR_CONTRASTE).map(e => [e, pctPorEstado[e] ?? null, COLOR_CONTRASTE[e], `${n} RA únicos`]), 52);
  }

  notaMetodo(criterios) {
    this.seccion('Nota metodológica');
    this.lista(criterios.map(([v, e, c]) => `${v} ${e}: ${c}.`), 8);
    this.parrafo('V2 (verbos repetidos entre competencias) se informa sin calificar: la plantilla no prohíbe repetir verbos. Estados: Cumple = la regla de la plantilla institucional se cumple en todos los casos; Parcial = en algunos; No cumple = en ninguno; Sin dato = la matriz no tiene la información para evaluarla. ' +
      'No hay puntaje compuesto ni pesos; la mediana del conjunto cargado solo sitúa a cada matriz. El nivel de evidencia de los indicadores (N1 implementación a N5 efecto externo) y la exigencia de los RA se ' +
      'describen sin calificarse, porque la plantilla no fija un criterio para ellos.', 8, GRIS);
  }

  /** Encabezado y pie de todas las páginas (el encabezado no va en la portada). */
  cerrar() {
    const d = this.doc, n = d.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      d.setPage(i);
      if (i > 1) {
        this.fuente(8, 'bold', GRIS); this.celda(15, 8, 150, 5, this.titulo, 8);
        d.setDrawColor(...CIAN); d.setLineWidth(0.2); d.line(15, 13.5, this.w - 15, 13.5);
      }
      this.fuente(7, 'normal', GRIS);
      this.celda(15, this.h - 12 - 0, 150, 5, PIE, 7);
      this.celda(15, this.h - 12, 180, 5, `Página ${i}/${n}`, 7, 'right');
    }
    return new Uint8Array(d.output('arraybuffer'));
  }
}

const ahora = () => { const f = new Date(), p = x => String(x).padStart(2, '0'); return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())} ${p(f.getHours())}:${p(f.getMinutes())}`; };

/**
 * Informe del conjunto cargado. d: alcance, kpis [[etiqueta, valor]], globales, criterios, conteo_criterios [[etiqueta, {estado: n}]],
 * lectura [str], prioridades [{Programa, Modalidad, Ciudad, V1..V5, 'No cumple', Parcial}], taxonomias {resumen, por_programa}, alertas, tendencias, programas, errores.
 */
export function informeGeneral(d, logo = null) {
  const pdf = new Informe('Informe general de análisis microcurricular', logo);
  pdf.portada('Informe general de análisis microcurricular', 'Resumen ejecutivo del conjunto cargado', d.alcance ?? '', d.fecha ?? ahora());
  pdf.kpis(d.kpis);

  if (d.lectura?.length) { pdf.seccion('Lectura rápida'); pdf.lista(d.lectura); }

  const g = d.globales ?? {};
  if (g.matrices) {
    pdf.seccion('Coherencia y trazabilidad curricular (V1-V5)');
    pdf.parrafo('Valor del conjunto, cada variable sobre su propia base.', 8, GRIS);
    pdf.barras([
      ['V1 Perfil alineado (alguna capa)', g.V1, CIAN, `${g.atributos_perfil ?? 0} atributos`],
      ['V3 RA evaluables', g.V3, CIAN, `${g.ra_unicos ?? 0} RA únicos`],
      ['V4 RA con estrategia meso', g.V4, CIAN, `${g.ra_unicos ?? 0} RA únicos`],
      ['V5 Estrategias con evidencia N2+', g.V5, CIAN, `${g.estrategias ?? 0} estrategias`],
    ]);
    pdf.subtitulo('Valoración por criterios: matrices por estado');
    pdf.barrasApiladas(d.conteo_criterios ?? []);
  }

  const pri = d.prioridades ?? [];
  if (pri.length) {
    pdf.seccion('Matrices que requieren atención');
    pdf.parrafo('Ordenadas por número de criterios en «No cumple» y luego en «Parcial». Cada programa tiene su informe individual con el detalle y las acciones sugeridas.', 8, GRIS);
    const cols = ['Programa', 'Modalidad', 'Ciudad', 'V1', 'V3', 'V4', 'V5', 'No cumple', 'Parcial'];
    pdf.tabla(cols, pri.map(p => cols.map(c => p[c] ?? '')), [56, 22, 22, 14, 14, 14, 14, 12, 12],
      { colEstado: [3, 4, 5, 6], tam: 6.8, alinear: ['LEFT', 'LEFT', 'LEFT', ...Array(6).fill('CENTER')] });
  }

  const tx = d.taxonomias;
  if (tx?.resumen?.n) {
    pdf.seccion('Taxonomías de los RA');
    pdf.parrafo(NOTA_TAXONOMIAS, 8, GRIS);
    pdf.subtitulo('Coherencia entre lo declarado y el verbo del RA');
    pdf.barrasContraste(tx.resumen.pct, tx.resumen.n);
    const cols = ['Programa', 'RA', '% Bloom', '% BAK', 'Exigencia', 'Coincide', 'Nivel difiere', 'Dominio difiere', 'Fuera'];
    pdf.tabla(cols, tx.por_programa.map(p => [p.Programa, p['RA únicos'], pct(p['% Bloom']), pct(p['% BAK']),
      p['Índice de exigencia'] === null ? '-' : coma(p['Índice de exigencia']), pct(p['% Coincide']), pct(p['% Nivel difiere']), pct(p['% Dominio difiere']), pct(p['% Verbo fuera de la base'])]),
    [50, 10, 16, 16, 16, 16, 18, 18, 14], { tam: 6.8, alinear: ['LEFT', ...Array(8).fill('CENTER')] });
  }

  if (d.alertas?.length || d.tendencias?.length) {
    pdf.seccion('Hallazgos transversales');
    for (const a of d.alertas ?? []) pdf.parrafo(`[${a['Categoría']}] ${a.Hallazgo}. Recomendación: ${a['Recomendación']}`, 8.5);
    if (d.tendencias?.length) {
      pdf.subtitulo('Presencia de las tendencias globales');
      pdf.parrafo('No existe un mínimo institucional de cobertura: la tabla ordena las tendencias de menor a mayor presencia para que el comité decida cuáles reforzar según el perfil de cada programa.', 8, GRIS);
      pdf.tabla(['Tendencia', 'Asignaturas', '% de asignaturas', 'Programas', '% de programas'],
        d.tendencias.map(t => [t.Tendencia, t.Asignaturas, pct(t['% de asignaturas']), t.Programas, pct(t['% de programas'])]), [80, 22, 26, 22, 26],
        { alinear: ['LEFT', ...Array(4).fill('CENTER')] });
    }
  }

  if (d.programas?.length) {
    pdf.seccion('Perfil por programa');
    pdf.tabla(['Programa', 'Matrices', 'Asignaturas', 'Saber', 'SaberHacer', 'SaberSer', 'Tendencias'],
      d.programas.map(p => [p.Programa, p.Matrices, p.Asignaturas, pct(p.Saber), pct(p.SaberHacer), pct(p.SaberSer), p.Tendencias]), [62, 16, 18, 18, 20, 18, 18],
      { tam: 7, alinear: ['LEFT', ...Array(6).fill('CENTER')] });
  }

  if (d.errores?.length) { pdf.seccion('Archivos no evaluados'); pdf.lista(d.errores.map(e => `${e.archivo}: ${e.causa}`), 8); }

  pdf.notaMetodo(d.criterios ?? []);
  return pdf.cerrar();
}

/**
 * Informe de un programa (todas sus matrices programa-sede). d: programa, alcance, kpis, matrices [{matriz, etiqueta, valoracion, recomendaciones, sin_alineacion,
 * ra_no_evaluables, ra_sin_estrategia, estrategias_incompletas}], tipo_saber, tendencias_presentes, tendencias_ausentes, alertas, taxonomias, criterios.
 */
export function informePrograma(d, logo = null) {
  const pdf = new Informe(`Informe del programa: ${d.programa}`, logo);
  pdf.portada(d.programa, 'Informe individual de análisis microcurricular', d.alcance ?? '', d.fecha ?? ahora());
  pdf.kpis(d.kpis);

  const resumen = d.matrices.map(m => {
    const est = m.valoracion.filter(v => v.Variable !== '—' && v.Estado !== 'Descriptiva');
    const nc = est.filter(v => v.Estado === 'No cumple').map(v => `${v.Variable} ${v.Tramo}`);
    const pa = est.filter(v => v.Estado === 'Parcial').map(v => `${v.Variable} ${v.Tramo}`);
    const ok = est.filter(v => v.Estado === 'Cumple');
    return `${m.etiqueta ?? m.matriz}: cumple ${ok.length} de ${est.length} criterios${nc.length ? `; no cumple: ${nc.join(', ')}` : ''}${pa.length ? `; parcial: ${pa.join(', ')}` : ''}.`;
  });
  if (resumen.length) { pdf.seccion('Lectura rápida'); pdf.lista([...resumen, ...(d.alertas ?? []).map(a => `Alerta: ${a}`)]); }

  for (const m of d.matrices) {
    pdf.seccion(`Valoración por criterios - ${m.etiqueta ?? m.matriz}`);
    pdf.tabla(['Criterio', 'Resultado', 'Estado', 'Mediana del conjunto'],
      m.valoracion.map(v => [v.Variable !== '—' ? `${v.Variable} ${v.Tramo}` : v.Tramo, v.Resultado, v.Estado, v['Referencia (mediana)']]), [50, 72, 20, 38], { colEstado: [2], tam: 7.3 });
    if (m.recomendaciones?.length) { pdf.subtitulo('Acciones sugeridas'); pdf.lista(m.recomendaciones, 8.5); }
  }

  if (d.tipo_saber?.length) {
    pdf.seccion('Distribución del tipo de saber');
    pdf.tabla(['Tipo de saber', 'Programa', 'Mediana del conjunto', 'Diferencia'],
      d.tipo_saber.map(t => [t.Tipo, pct(t.Programa), pct(t.Mediana), t.Programa === null || t.Mediana === null || t.Programa === undefined || t.Mediana === undefined ? '-'
        : `${t.Programa - t.Mediana >= 0 ? '+' : '-'}${coma(Math.abs(t.Programa - t.Mediana), 0)} pp`]), [60, 40, 40, 40], { alinear: ['LEFT', 'CENTER', 'CENTER', 'CENTER'] });
  }

  if (d.tendencias_presentes) {
    pdf.seccion('Tendencias globales');
    pdf.parrafo(`Presentes (${d.tendencias_presentes.length}): ${d.tendencias_presentes.join(', ') || 'ninguna'}.`, 8.5);
    pdf.parrafo(`Sin presencia (${d.tendencias_ausentes.length}): ${d.tendencias_ausentes.join(', ') || 'ninguna'}.`, 8.5);
  }

  const tx = d.taxonomias;
  if (tx?.matrices?.length) {
    pdf.seccion('Taxonomías de los RA');
    pdf.parrafo(NOTA_TAXONOMIAS, 8, GRIS);
    pdf.tabla(['Matriz', 'RA', 'Taxonomía', 'Exigencia (mediana)', 'Cognitivo / Proc. / Actit.'],
      tx.matrices.map(m => [m.etiqueta, m.ra, m.taxonomia, (m.exigencia === null ? '-' : coma(m.exigencia)) + (m.mediana === null ? '' : ` (${coma(m.mediana)})`), m.dominios]),
      [66, 12, 34, 32, 36], { tam: 7 });
    for (const m of tx.matrices) { pdf.subtitulo(`Contraste verbo-nivel - ${m.etiqueta}`); pdf.barrasContraste(m.pct, m.ra); }
    if (tx.revisar.length) {
      pdf.subtitulo(`RA para revisar (${tx.revisar.length})`);
      pdf.tabla(['Matriz', 'Verbo', 'Declarado', 'Según la base', 'Resultado'], tx.revisar, [46, 22, 40, 40, 32], { tam: 6.8 });
    }
  }

  const anexos = d.matrices.filter(m => m.sin_alineacion?.length || m.ra_no_evaluables?.length || m.ra_sin_estrategia?.length || m.estrategias_incompletas?.length);
  if (anexos.length) {
    pdf.seccion('Anexo: elementos a revisar');
    for (const m of anexos) {
      pdf.subtitulo(m.etiqueta ?? m.matriz);
      if (m.sin_alineacion?.length) { pdf.parrafo(`Atributos del perfil sin alineación en ninguna capa (${m.sin_alineacion.length})`, 8.5); pdf.tabla(['Perfil', 'Componente', 'Atributo'], m.sin_alineacion, [28, 32, 120], { tam: 7 }); }
      if (m.ra_no_evaluables?.length) { pdf.parrafo(`RA no evaluables (${m.ra_no_evaluables.length})`, 8.5); pdf.tabla(['Resultado de aprendizaje', 'Motivo'], m.ra_no_evaluables, [130, 50], { tam: 7 }); }
      if (m.ra_sin_estrategia?.length) { pdf.parrafo(`RA sin estrategia mesocurricular con instrumento (${m.ra_sin_estrategia.length})`, 8.5); pdf.tabla(['Resultado de aprendizaje'], m.ra_sin_estrategia.map(r => [r]), [180], { tam: 7 }); }
      if (m.estrategias_incompletas?.length) { pdf.parrafo(`Estrategias del Paso 4 sin indicador o sin instrumento (${m.estrategias_incompletas.length})`, 8.5); pdf.tabla(['Estrategia', 'Falta'], m.estrategias_incompletas, [140, 40], { tam: 7 }); }
    }
  }

  pdf.notaMetodo(d.criterios ?? []);
  return pdf.cerrar();
}
