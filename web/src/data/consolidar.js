// Consolidación de matrices: equivalente a la segunda mitad de procesar_archivos() y a los cálculos de
// créditos de pagina_inicio().
import { normalizarSemestre } from './parseMatrix.js';
import {
  aNumero, aTexto, buscarColumna, cmp, esMarcador, esNulo, normNombreColumna, sinTildes, titleCase, unicos,
} from './util.js';

/** _detectar_nivel: Pregrado/Posgrado según las columnas de bloque o componente con datos. */
export function detectarNivel(filas, columnas) {
  const tiene = alias => {
    const col = buscarColumna(columnas, alias);
    return col !== null && filas.some(f => esMarcador(f[col]));
  };
  const b = ['B.Institucional', 'Institucional', 'B.Disciplinar', 'Disciplinar', 'B.Electivo', 'Electivo'].some(tiene);
  const c = ['C.Fundamentacion', 'Fundamentacion', 'C.Profundizacion', 'Profundizacion'].some(tiene);
  if (b && !c) return 'Pregrado';
  if (c && !b) return 'Posgrado';
  if (b && c) return 'Mixto';
  return 'No identificado';
}

function normTipoSaber(valor) {
  const v = sinTildes(String(valor).trim().toLowerCase()).replace(/[^\x00-\x7f]/g, '').replace(/[\s\-_/]+/g, '');
  if (['saber', 'conocimiento', 'conceptual', 'teorico', 'conocer'].includes(v)) return 'Saber';
  if (v.includes('saberhacer') || ['hacer', 'practica', 'procedimental', 'habilidad', 'proceder'].includes(v)) return 'SaberHacer';
  if (v.includes('saberser') || ['ser', 'actitud', 'valor', 'etica', 'actitudinal', 'humano'].includes(v)) return 'SaberSer';
  return valor;
}

const TIPOS_SABER = new Set(['Saber', 'SaberHacer', 'SaberSer']);

/**
 * Concatena los resultados de parseMatriz (los ok) y aplica la limpieza global.
 * Devuelve { filas, columnas, fallidos, avisos, totales }.
 */
export function consolidar(resultados) {
  const ok = resultados.filter(r => r.ok);
  const fallidos = resultados.filter(r => !r.ok).map(r => ({ nombre: r.nombre, causa: r.causa }));
  const avisos = resultados.flatMap(r => r.avisos ?? []);
  const totales = {};
  for (const r of ok) for (const k of r.totales.claves) totales[k] = r.totales.valores;
  if (!ok.length) return { filas: [], columnas: [], fallidos, avisos, totales };

  const columnas = unicos(ok.flatMap(r => r.columnas));
  let filas = ok.flatMap(r => r.filas);

  if (columnas.includes('Semestre')) for (const f of filas) f.Semestre = normalizarSemestre(f.Semestre);

  // Nivel: columna explícita o detección por programa
  const porPrograma = new Map();
  for (const f of filas) {
    if (!porPrograma.has(f.Programa)) porPrograma.set(f.Programa, []);
    porPrograma.get(f.Programa).push(f);
  }
  if (!columnas.includes('Nivel')) {
    const niveles = new Map([...porPrograma].map(([p, g]) => [p, detectarNivel(g, columnas)]));
    for (const f of filas) f.Nivel = niveles.get(f.Programa);
    columnas.push('Nivel');
  } else {
    for (const f of filas) {
      const t = f.Nivel == null ? 'nan' : String(f.Nivel).trim();
      f.Nivel = t === 'nan' || t === '' ? 'No identificado' : titleCase(t);
    }
    const sinId = new Map();
    for (const f of filas) if (f.Nivel === 'No identificado') {
      if (!sinId.has(f.Programa)) sinId.set(f.Programa, []);
      sinId.get(f.Programa).push(f);
    }
    for (const [p, g] of sinId) {
      const n = detectarNivel(g, columnas);
      for (const f of g) f.Nivel = n;
    }
  }

  // Tipo de Saber: no vacío, normalizado y válido
  filas = filas.filter(f => !esNulo(f['Tipo de Saber']) && String(f['Tipo de Saber']).trim() !== '');
  for (const f of filas) f['Tipo de Saber'] = normTipoSaber(String(f['Tipo de Saber']).trim());
  filas = filas.filter(f => TIPOS_SABER.has(f['Tipo de Saber']));

  if (!columnas.includes('Proceso Responsable')) columnas.push('Proceso Responsable');
  const s = v => (esNulo(v) ? '' : String(v));
  for (const f of filas) {
    if (!('Proceso Responsable' in f)) f['Proceso Responsable'] = '';
    f.Texto_Completo = [f['Resultado de aprendizaje'], f['Nombre asignatura o modulo'],
      f['Indicadores de logro asignatura o modulo'], f['Nucleos tematicos'], f['Proceso Responsable']]
      .map(s).join(' ').toLowerCase().trim();
  }
  columnas.push('Texto_Completo');
  return { filas, columnas, fallidos, avisos, totales };
}

// ── Créditos ────────────────────────────────────────────────────────────────

function columnaCreditos(columnas) {
  return columnas.find(c => ['creditos', 'credito'].includes(normNombreColumna(c))) ?? null;
}

/** Créditos únicos por asignatura (primera fila de cada una) y asignaturas marcadas en una columna. */
function creditosPorAsignatura(filas, columnas) {
  const asigCol = buscarColumna(columnas, 'Nombre asignatura o modulo');
  const credCol = columnaCreditos(columnas);
  if (asigCol === null || credCol === null) return null;
  const creditos = new Map();
  const conFilas = filas.filter(f => !esNulo(f[asigCol]));
  for (const f of conFilas) {
    const k = String(f[asigCol]);
    if (!creditos.has(k)) creditos.set(k, aNumero(f[credCol]) ?? 0);
  }
  const suma = claves => [...claves].reduce((a, k) => a + creditos.get(k), 0);
  const marcadas = alias => {
    const col = buscarColumna(columnas, alias);
    if (col === null) return new Set();
    return new Set(conFilas.filter(f => esMarcador(f[col])).map(f => String(f[asigCol])));
  };
  const total = Math.trunc([...creditos.values()].filter(v => v > 0).reduce((a, v) => a + v, 0));
  return { suma, marcadas, total };
}

export function creditosPorBloque(filas, columnas) {
  const c = creditosPorAsignatura(filas, columnas);
  if (!c) return { Institucional: 0, Disciplinar: 0, Electivo: 0, Total: 0 };
  return {
    Institucional: Math.trunc(c.suma(c.marcadas('B.Institucional'))),
    Disciplinar: Math.trunc(c.suma(c.marcadas('B.Disciplinar'))),
    Electivo: Math.trunc(c.suma(c.marcadas('B.Electivo'))),
    Total: c.total,
  };
}

export function creditosPorComponente(filas, columnas) {
  const c = creditosPorAsignatura(filas, columnas);
  if (!c) return { Fundamentacion: 0, Profundizacion: 0, Total: 0 };
  // _sum_componente toma el primer alias cuya columna exista
  const primero = alias => {
    const a = alias.find(x => buscarColumna(columnas, x) !== null);
    return a ? Math.trunc(c.suma(c.marcadas(a))) : 0;
  };
  return { Fundamentacion: primero(['C.Fundamentacion', 'Fundamentacion']),
    Profundizacion: primero(['C.Profundizacion', 'Profundizacion']), Total: c.total };
}

export function contarSemestres(filas, columnas) {
  const col = buscarColumna(columnas, 'Semestre');
  if (col === null) return 0;
  const nums = filas.map(f => aNumero(f[col])).filter(v => v !== null);
  return nums.length ? Math.trunc(Math.max(...nums)) : 0;
}

/** Busca los totales oficiales de un programa: coincidencia exacta, parcial o por palabras (>3 letras). */
export function buscarTotalesOficiales(prog, totales) {
  const claves = Object.keys(totales ?? {});
  if (claves.includes(prog)) return totales[prog];
  const p = prog.toLowerCase();
  for (const k of claves) {
    const kl = k.toLowerCase();
    if (p.includes(kl) || kl.includes(p)) return totales[k];
    const kw = kl.split(/\s+/);
    if (p.split(/\s+/).some(w => w.length > 3 && kw.includes(w))) return totales[k];
  }
  return {};
}

const ORDEN_NIVEL = { Pregrado: 0, Posgrado: 1, Mixto: 2, 'No identificado': 3 };

/** «Resumen por Programa» de la página de Inicio. */
export function resumenPorPrograma(filas, columnas, totalesOficiales) {
  const grupos = new Map();
  for (const f of filas) {
    const k = JSON.stringify([f.Programa, f.Modalidad, f.Sede, f.Nivel]);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(f);
  }
  const out = [];
  for (const [k, g] of grupos) {
    const [Programa, Modalidad, Sede, Nivel] = JSON.parse(k);
    const of = buscarTotalesOficiales(Programa, totalesOficiales);
    let total = Math.trunc(of.total ?? 0);
    const asigOf = Math.trunc(of.asignaturas ?? 0);
    const base = { Programa, Modalidad, Sede, Nivel, Asignaturas: asigOf, 'Asig. Oficial': asigOf || 0,
      Semestres: contarSemestres(g, columnas) };
    if (Nivel === 'Posgrado') {
      let fund = of.fundamentacion ?? 0, prof = of.profundizacion ?? 0;
      if (total === 0) {
        const cp = creditosPorComponente(g, columnas);
        total = cp.Total; fund = cp.Fundamentacion; prof = cp.Profundizacion;
      }
      out.push({ ...base, 'Cr. Total': total, 'Cr. Fundamentacion': fund, 'Cr. Profundizacion': prof,
        'Suma componentes': fund + prof, Diferencia: total - (fund + prof) });
    } else {
      let inst = of.institucional ?? 0, disc = of.disciplinar ?? 0, elec = of.electivo ?? 0;
      if (total === 0) {
        const b = creditosPorBloque(g, columnas);
        total = b.Total; inst = b.Institucional; disc = b.Disciplinar; elec = b.Electivo;
      }
      out.push({ ...base, 'Cr. Total': total, 'B. Institucional': inst, 'B. Disciplinar': disc,
        'B. Electivo': elec, 'Suma bloques': inst + disc + elec, Diferencia: total - (inst + disc + elec) });
    }
  }
  out.sort((a, b) => (ORDEN_NIVEL[a.Nivel] ?? 4) - (ORDEN_NIVEL[b.Nivel] ?? 4) || cmp(a.Programa, b.Programa) ||
    cmp(a.Modalidad, b.Modalidad) || cmp(a.Sede, b.Sede));
  return out;
}
