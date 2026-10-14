// Extracción determinista de atributos de un perfil de egreso redactado en prosa.
// Port línea a línea de src/atributos_perfil.py (mismas reglas, mismos nombres).
import { aAscii, capitalize, colapsar, finditer, fullmatch, lstrip, match, palabras, plano, rx, splitRe, strip, sub } from './py.js';

const MARCOS = [
  '\\b(?:su|la|esta) formacion(?: integral| profesional)? (?:le|les) permite\\b',
  '\\b(?:estos|sus) (?:conocimientos|saberes) (?:le|les) permiten\\b',
  '\\bque (?:le|les) permiten?\\b',
  '\\besta (?:capacitad[oa]|preparad[oa]) para\\b',
  '\\bcuenta con (?:las|los) (?:competencias|conocimientos|habilidades)(?: necesari[oa]s)? para\\b',
  '\\b(?:es|sera|seran) capa(?:z|ces) de\\b',
  '\\b(?:esta|estara|estaran) en capacidad de\\b',
  '\\btiene la capacidad de\\b',
  '\\b(?:es un profesional |un profesional )?con (?:la )?capacidad (?:de|para)\\b',
  '\\btendra la (?:capacidad|posibilidad) (?:de|para)\\b',
  '\\bpodra[n]?\\b',
].map(s => rx(s, 'g'));

const RASGO = rx('\\bse (?:caracteriza|distingue|destaca) por\\s+');
const DISPARADORES = [
  ['Conocimiento', '\\b(?:posee|poseen|tiene|tienen|cuenta con|con)\\s+(?:altas |solidos |solidas |amplios |amplias )?' +
    '(?:conocimientos|saberes|formacion|bases(?: solidas)?)(?:\\s+(?:conceptuales|tecnicos|teoricos|' +
    'metodologicos|solidos|solidas|integral|especializad[oa]s?)[, y]*)*\\s+(?:en|sobre|de)\\s+'],
  ['Función', '\\b(?:posee|poseen|tiene|tienen|cuenta con|con)\\s+(?:las |altas |solidas |amplias )?' +
    '(?:habilidades|competencias|capacidades)(?:\\s+[a-z]+){0,2}?\\s+(?:para|en)\\s+'],
  ['Función', '\\ben (?:las )?(?:funciones|campos|areas|actividades|cargos|ambitos) (?:de|como|relacionad[oa]s con)\\s+'],
  ['Función', '\\b(?:ejercer|desempenar|ocupar) cargos (?:de|en)\\s+'],
  ['Rol', '\\bcargos tales como\\s+'],
  ['Función', '\\bactividades(?: [a-z]+){0,5}? como (?:la |el |los |las )?'],
  ['Función', '\\b(?:abarca|comprende|incluye)\\s+(?:la |el |los |las )?'],
  ['Rol', '\\b(?:desempenarse|desempenandose|desempena|vincularse|actuar|trabajar|ejercer)(?:\\s+[a-z]+){0,2}?\\s+como\\s+'],
].map(([t, s]) => [t, rx(s, 'g')]);

const EXCLUIR = new Set(['ser', 'estar', 'haber', 'tener', 'permitir', 'caracterizar', 'contar', 'poder', 'deber', 'poseer']);
const NO_VERBOS = new Set(['lugar', 'hogar', 'mujer', 'mayor', 'menor', 'nivel', 'familiar', 'similar', 'particular', 'popular',
  'escolar', 'militar', 'titular', 'regular', 'singular', 'mejor', 'peor', 'anterior', 'posterior', 'interior',
  'exterior', 'superior', 'inferior', 'bienestar', 'poder', 'deber', 'saber', 'quehacer', 'placer', 'auxiliar',
  'polar', 'solar', 'lunar', 'modular', 'nuclear', 'celular', 'molecular', 'vascular', 'muscular', 'circular',
  'rectangular', 'secular', 'tutelar', 'preescolar', 'ejemplar', 'complementar', 'interdisciplinar',
  'multidisciplinar', 'transdisciplinar', '']);

const sinTildes = aAscii;

export function formas(infinitivo) {
  let v = sinTildes(infinitivo.trim());
  v = v.endsWith('se') && v.length > 4 ? v.slice(0, -2) : v;
  const raiz = v.slice(0, -2), term = v.slice(-2);
  if (!['ar', 'er', 'ir'].includes(term)) return [v];
  const a = term === 'ar' ? 'a' : 'e';
  return [v, raiz + a, raiz + a + 'n', raiz + (term === 'ar' ? 'ando' : 'iendo')];
}

const escapar = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cachePatron = new Map();

function patronDe(lexico) {
  const clave = lexico.join('\u0000');
  if (cachePatron.has(clave)) return cachePatron.get(clave);
  const mapa = new Map();
  for (const inf of lexico) {
    if (EXCLUIR.has(sinTildes(inf))) continue;
    for (const f of formas(inf)) if (!mapa.has(f)) mapa.set(f, sinTildes(inf));
  }
  const alt = [...mapa.keys()].sort((a, b) => b.length - a.length).map(escapar).join('|') || '(?!x)x';
  const r = [rx('\\b(' + alt + ')(?:l[oa]s?|se|le|les)?\\b', 'g'), mapa];
  cachePatron.set(clave, r);
  return r;
}

function tildeNoVerbal(original) {
  const m = /[áéíóú](.)/u.exec(original.toLowerCase());
  return !!m && !'aeiou'.includes(m[1]);
}

function limpiar(seg) {
  seg = seg.replace(/^[\s,;:.\-–—•*]+|[\s,;:.\-–—•*]+$/gu, '');
  seg = seg.replace(/\s+(?:y|e|o|u|para|de|del|como|en)$/u, '');
  return strip(seg, ' ,;:.');
}

const CONTEXTO = rx('\\s+(?:en|para|de) (?:las? |los |diversos |distintos |diferentes |todo tipo de )?' +
  '(?:empresas|organizaciones|instituciones|entidades|sectores?|ambitos?|contextos?|industria)\\b.*$' +
  '|\\s*,?\\s*tanto en .*$|\\s*,?\\s*entre otros.*$');

const ADJ_FINAL = rx('^(?!(?:el|la|los|las|un|una|de|del|en)\\b)[a-záéíóúñ]+(?:ntes?|bles?|ivos?|ivas?|icos?|icas?|ales?|osos?|osas?|ados?|adas?|idos?|idas?|doras?|dores)\\b', 'i');

function dividirYFinal(parte) {
  const d = splitRe(rx('\\s+(?:y|e|o|u)\\s+'), parte, 1);
  if (d.length === 2 && ((palabras(d[0]).length === 1 && palabras(d[1]).length >= 3) || match(ADJ_FINAL, d[1].trim()))) return [parte];
  return d;
}

function enumeracion(texto) {
  texto = sub(rx('\\s+as[ií] como\\s+(?:en\\s+)?', 'i'), ', ', texto);
  const m = CONTEXTO.exec(plano(texto));
  if (m) texto = texto.slice(0, m.index);
  let partes;
  if (texto.includes(';')) partes = splitRe(/\s*;\s*/u, texto);
  else if (texto.includes(',')) {
    partes = splitRe(/\s*,\s*/u, texto);
    partes = [...partes.slice(0, -1), ...dividirYFinal(partes[partes.length - 1])];
  } else partes = [texto];
  const unidas = [];
  for (const p of partes) {
    const q = p.trim();
    const q0 = q.replace(/^(?:y|e)\s+/iu, '');
    if (unidas.length && (match(ADJ_FINAL, q0) ||
        match(rx('(?:de|del|por|para|con|basad[oa]s?|orientad[oa]s?|segun|según)\\b', 'i'), q))) {
      unidas[unidas.length - 1] = `${unidas[unidas.length - 1]}, ${q}`;
    } else unidas.push(q);
  }
  const out = [];
  for (let p of unidas) {
    p = limpiar(p.trim().replace(rx('^(?:(?:y|e|o|u|el|la|los|las|un|una|en|de|del|bien sea como|como)\\s+)+', 'i'), ''));
    if (p.length >= 4 && rx('[a-záéíóúñ]{3}', 'i').test(p)) out.push(p);
  }
  return out;
}

function bloques(texto) {
  const lineas = String(texto).split('\n').map(l => l.trim());
  const blq = [], prosa = [];
  for (const l of lineas) {
    if (!l) continue;
    if (l.endsWith(':') && prosa.length) continue;
    if (/^(?:[-–—•*]|\d+[.)])\s*/u.test(l)) blq.push(l.replace(/^(?:[-–—•*]|\d+[.)])\s*/u, ''));
    else prosa.push(l);
  }
  return prosa.length ? [prosa.join(' '), ...blq] : blq;
}

function extraerBloque(base, patron, mapa) {
  base = colapsar(base).trim();
  let pl = plano(base);
  for (const m of MARCOS) pl = pl.replace(m, x => '|' + ' '.repeat(x.length - 1));
  const usados = new Array(base.length).fill(false);
  const out = [];
  const finDeTramo = ini => {
    const m = /[.|]|;(?=\s*[a-z]+\s+(?:como|en)\b)/u.exec(pl.slice(ini));
    return m ? ini + m.index : base.length;
  };

  // Rasgos
  for (const o of finditer(/[^.]+/u, pl)) {
    const r = RASGO.exec(o[0]);
    if (r) {
      const ini = o.index + r.index + r[0].length, fin = o.index + o[0].length;
      let trozo = splitRe(rx(',\\s*(?:seg[uú]n|de acuerdo con|conforme a|para|con el cual|que)\\b|\\s+con el cual\\b'), base.slice(ini, fin))[0];
      trozo = trozo.trim().replace(rx('^(?:tener|poseer|su|sus|el|la|los|las)\\s+(?:un |una |su |sus )?'), '');
      for (let p of splitRe(rx('\\s+y\\s+(?:su\\s+|sus\\s+|un\\s+|una\\s+)?'), trozo)) {
        if (p == null) continue;
        p = limpiar(p);
        if (palabras(p).length >= 2) out.push(['Rasgo', '', p]);
      }
      for (let i = o.index + r.index; i < fin; i++) usados[i] = true;
      pl = pl.slice(0, o.index + r.index) + '|'.repeat(fin - o.index - r.index) + pl.slice(fin);
    }
  }

  // Enumeraciones nominales tras disparador
  for (const [tipo, disp] of DISPARADORES) {
    for (const m of finditer(disp, pl)) {
      if (usados[m.index]) continue;
      const ini = m.index + m[0].length;
      let fin = finDeTramo(ini);
      const v = rx(',\\s*(?=(?:[a-z]+(?:ando|iendo|yendo)|para [a-z]+(?:ar|er|ir))\\b)').exec(pl.slice(ini, fin));
      if (v) fin = ini + v.index;
      const items = enumeracion(base.slice(ini, fin));
      if (items.length >= 1) {
        for (const i of items) out.push([tipo, '', i]);
        for (let i = m.index; i < fin; i++) usados[i] = true;
      }
    }
  }

  // Acciones
  const candidatos = finditer(patron, pl).map(m => [m.index, m[1], mapa.get(m[1])]);
  const vistos = new Set(candidatos.map(c => c[0]));
  for (const m of finditer(rx('\\b([a-z]{3,}(?:ar|er|ir|ando|iendo|yendo))(?:l[oa]s?|se|le|les)?\\b'), pl)) {
    if (!vistos.has(m.index) && !NO_VERBOS.has(m[1])) {
      const inf = m[1].replace(/([aeiou])yendo$/u, '$1ir').replace(/iendo$/u, 'er').replace(/ando$/u, 'ar');
      candidatos.push([m.index, m[1], inf]);
    }
  }
  candidatos.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0)));
  const cortes = [], conVerbo = new Set();
  for (const [ini, forma, inf] of candidatos) {
    if (EXCLUIR.has(inf) || usados[ini]) continue;
    const original = base.slice(ini, ini + forma.length);
    if (!/(?:ar|er|ir|ando|iendo|yendo)$/u.test(forma) && tildeNoVerbal(original)) continue;
    const previo = pl.slice(0, ini).trimEnd();
    const nOr = (previo.match(/\./gu) || []).length;
    const trasConector = !previo || ',;:.|'.includes(previo[previo.length - 1]) || rx('\\b(?:y|e|para|o|asi como)$').test(previo);
    const enLexico = mapa.has(forma);
    const primero = enLexico && !conVerbo.has(nOr) && !/(?:ar|er|ir)$/u.test(forma);
    if ((trasConector && (enLexico || /(?:ar|er|ir|ando|iendo|yendo)$/u.test(forma))) || primero) {
      cortes.push([ini, inf]);
      conVerbo.add(nOr);
    }
  }
  const acciones = [];
  for (let k = 0; k < cortes.length; k++) {
    const [ini, verbo] = cortes[k];
    let fin = k + 1 < cortes.length ? cortes[k + 1][0] : base.length;
    fin = Math.min(fin, finDeTramo(ini));
    let u = fin;
    for (let i = ini; i < fin; i++) if (usados[i]) { u = i; break; }
    const coordinado = u === fin && k + 1 < cortes.length &&
      fullmatch(/\s*\S+\s*(?:,|y|e)?\s*/u, pl.slice(ini, cortes[k + 1][0])) !== null;
    acciones.push([verbo, limpiar(base.slice(ini, u)), coordinado]);
  }
  for (let k = 0; k < acciones.length; k++) {
    let [verbo, seg, coordinado] = acciones[k];
    if (palabras(seg).length === 1 && coordinado && acciones[k + 1][1].includes(' ')) {
      seg = `${seg} ${acciones[k + 1][1].split(' ').slice(1).join(' ')}`;
    }
    if (palabras(seg).length >= 2) out.push(['Acción', verbo, seg]);
  }
  return out;
}

const ADJ = '[a-záéíóúñ]+(?:icos?|icas?|ivos?|ivas?|ales?|arios?|arias?|osos?|osas?|ntes?|ales|eros?|eras?)';
const ADJ_COORD = rx('\\b(' + ADJ + ')((?:\\s*,\\s*' + ADJ + ')*)\\s*,?\\s+(?:y|e)\\s+(' + ADJ + ')\\b', 'i');
const RELATIVA = rx('\\s+que\\s+([a-záéíóúñ]+?)(an|en|a|e)\\s+(.+)$', 'i');
const NORMATIVO = rx('\\b(?:segun|conforme a|de acuerdo con|en cumplimiento de|acorde con|en el marco de)\\s+' +
  '((?:[a-z]+\\s+){0,6}?(?:el |la |los |las )?(?:marco (?:legal|normativo|juridico)|normatividad|normativa|' +
  'legislacion|ley(?:es)?|regulacion(?:es)?|normas?)\\b[a-z ]{0,40}?)(?=[.,;]|$)', 'g');
const COMPLEMENTO_FUENTE = '\\s+(?:seg[uú]n|alinead[oa]s?|para|de acuerdo|a partir|mediante|a trav[eé]s|que|dentro|tanto|' +
  'bajo|acorde|conforme|desde|hacia|aplicando|con (?:el|un|una) (?:prop[oó]sito|fin|enfoque|perspectiva)|' +
  'con (?:visi[oó]n|criterio|responsabilidad|enfoque)|en (?:contextos?|distintos|diversos|diferentes|' +
  'el marco|cumplimiento|entornos?|los sectores|el sector))\\b.*$|\\s*,.*$';
const COMPLEMENTO = rx(COMPLEMENTO_FUENTE, 'i');
const ENUM_OBJETO = rx('^(\\S+)\\s+((?:(?:el|la|los|las|sus?)\\s+[^,]+,\\s*){2,}(?:(?:y|e)\\s+)?(?:el|la|los|las|sus?)\\s+.+)$', 'i');
const CONTEXTO_SIN_COMA_FUENTE = COMPLEMENTO_FUENTE.slice(0, COMPLEMENTO_FUENTE.lastIndexOf('|'));
const CONTEXTO_SIN_COMA = rx(CONTEXTO_SIN_COMA_FUENTE, 'i');
const INICIO_CONTEXTO = rx(CONTEXTO_SIN_COMA_FUENTE.replace('\\b.*$', '\\b'), 'i');
const IRREGULARES = {
  promover: 'promueve', resolver: 'resuelve', mover: 'mueve', devolver: 'devuelve', demostrar: 'demuestra',
  encontrar: 'encuentra', sostener: 'sostiene', mantener: 'mantiene', obtener: 'obtiene', contener: 'contiene',
  defender: 'defiende', entender: 'entiende', atender: 'atiende', extender: 'extiende', invertir: 'invierte',
  convertir: 'convierte', advertir: 'advierte', sugerir: 'sugiere', adquirir: 'adquiere', servir: 'sirve',
  medir: 'mide', seguir: 'sigue', conseguir: 'consigue', elegir: 'elige', construir: 'construye',
  contribuir: 'contribuye', distribuir: 'distribuye', concluir: 'concluye', incluir: 'incluye', influir: 'influye',
  instruir: 'instruye', conducir: 'conduce', pensar: 'piensa', emprender: 'emprende', orientar: 'orienta',
  evaluar: 'evalúa', actuar: 'actúa', continuar: 'continúa', graduar: 'gradúa', situar: 'sitúa',
  enviar: 'envía', guiar: 'guía', ampliar: 'amplía', confiar: 'confía', diferenciar: 'diferencia',
};
const FINALIDAD = rx(',?\\s*(?:con (?:el|la) (?:prop[oó]sito|fin|finalidad|objetivo|intenci[oó]n) de|a fin de)\\s+(.+)$', 'i');
const MEDIOS = rx('\\s+(?:mediante|a trav[eé]s de|por medio de)\\s+(.+?)(?=,\\s*(?:con|para|en|seg[uú]n)\\b|$)', 'i');
const RASGO_INCRUSTADO = rx('\\bcon (?:alta |gran |plena )?((?:responsabilidad|[eé]tica|compromiso|criterio [eé]tico|sentido|' +
  'integridad|transparencia|autonom[ií]a|liderazgo)\\b[^,;]*?)(?=\\s+y con\\b|,|;|$)', 'gi');
const OBJETO_GENERICO = rx('^(?:su|sus)\\s+(?:rol|roles|funci[oó]n|funciones|labor|labores|profesi[oó]n|ejercicio(?: profesional)?|' +
  'quehacer|trabajo|actividad|actividades)$', 'i');
const INFINITIVOS = rx('\\s+(?:y|e)\\s+(?=[a-záéíóúñ]+(?:ar|er|ir)\\b)', 'i');

function expandir(a, infinitivos) {
  let [tipo, verbo, txt] = a;
  if (tipo !== 'Acción') return [a];
  const out = [];
  const f = FINALIDAD.exec(txt);
  if (f && palabras(txt.slice(0, f.index)).length >= 2) {
    for (let inf of splitRe(INFINITIVOS, f[1])) {
      inf = limpiar(inf);
      if (palabras(inf).length >= 2) out.push(['Finalidad', sinTildes(palabras(inf)[0]), inf]);
    }
    txt = limpiar(txt.slice(0, f.index));
  }
  let m = MEDIOS.exec(txt);
  if (m) for (const i of enumeracion(m[1])) if (palabras(i).length >= 2) out.push(['Función', '', i]);
  for (const r of finditer(RASGO_INCRUSTADO, txt)) {
    if (palabras(r[1]).length >= 2) out.push(['Rasgo', '', limpiar(r[1])]);
  }
  m = RELATIVA.exec(txt);
  if (m && palabras(txt.slice(0, m.index)).length >= 3) {
    const [, raiz, desin, resto] = m;
    const opciones = ['a', 'an'].includes(desin.toLowerCase()) ? [raiz + 'ar'] : [raiz + 'ar', raiz + 'er', raiz + 'ir'];
    const inf = opciones.find(o => infinitivos.has(sinTildes(o))) ?? opciones[0];
    if (!EXCLUIR.has(sinTildes(inf)) && palabras(resto).length >= 2) {
      txt = txt.slice(0, m.index);
      out.push(['Acción', sinTildes(inf), limpiar(`${inf} ${resto}`)]);
    }
  }
  const e = ENUM_OBJETO.exec(txt);
  if (e && !COMPLEMENTO.test(e[2].split(',')[0])) {
    let items = splitRe(rx('\\s*,\\s*(?:y\\s+|e\\s+)?|\\s+(?:y|e)\\s+(?=(?:el|la|los|las|sus?)\\s)'), e[2]);
    items = items.filter(i => i != null).map(i => i.trim()).filter(i => palabras(i).length >= 2);
    if (items.length >= 3) return [...items.map(i => ['Acción', verbo, `${e[1]} ${i}`]), ...out];
  }
  const corte = CONTEXTO_SIN_COMA.exec(txt);
  m = ADJ_COORD.exec(corte ? txt.slice(0, corte.index) : txt);
  if (m) {
    const lista = [m[1], ...m[2].split(',').map(x => x.trim()).filter(Boolean), m[3]];
    if (lista.length >= 2) {
      return [...lista.map(adj => ['Acción', verbo, txt.slice(0, m.index) + adj + txt.slice(m.index + m[0].length)]), ...out];
    }
  }
  return [[tipo, verbo, txt], ...out];
}

function normativos(texto) {
  const base = colapsar(texto);
  const pl = plano(base);
  const out = [];
  for (const m of finditer(NORMATIVO, pl)) {
    // índice del grupo 1 dentro de la cadena (los índices del plano coinciden con los del texto base)
    const ini = m.index + m[0].length - m[1].length;
    let frase = base.slice(ini, ini + m[1].length).replace(/^(?:\s*y\s+)/u, '').trim();
    frase = frase.replace(rx('^.*?\\b(?=(?:el|la|los|las) (?:marco|normatividad|normativa|legislaci|ley|regulaci|norma))'), '');
    out.push(['Normativo', 'actuar', limpiar('actuar conforme a ' + frase).replace(' a el ', ' al ')]);
  }
  return out;
}

/** Atributos de un perfil: lista de [tipo, verbo, atributo], sin duplicados. */
export function extraerAtributos(texto, lexico) {
  if (!texto || !String(texto).trim()) return [];
  const [patron, mapa] = patronDe([...new Set([...lexico].filter(Boolean).map(sinTildes))].sort());
  const infinitivos = new Set(mapa.values());
  let out = [];
  bloques(texto).forEach((b, k) => {
    let attrs = extraerBloque(b, patron, mapa);
    if (!attrs.length && k > 0) {
      const tipo = /como\s*:/u.test(plano(String(texto))) ? 'Rol' : 'Función';
      attrs = enumeracion(colapsar(b)).map(i => [tipo, '', i]);
    }
    out.push(...attrs);
  });
  out = out.flatMap(a => expandir(a, infinitivos));
  out.push(...normativos(String(texto)));
  const vistos = new Set(), unicos = [];
  for (const a of out) {
    const clave = sinTildes(a[2]);
    if (!vistos.has(clave)) { vistos.add(clave); unicos.push(a); }
  }
  return unicos;
}

function conjugar(inf, persona) {
  if (persona !== 'tercera' || !['ar', 'er', 'ir'].includes(inf.slice(-2))) return inf;
  if (Object.hasOwn(IRREGULARES, inf)) return IRREGULARES[inf];
  return inf.slice(0, -2) + (inf.endsWith('ar') ? 'a' : 'e');
}

function cortar(objeto) {
  const w = palabras(objeto);
  if (match(OBJETO_GENERICO, w.slice(0, 3).join(' ')) || match(OBJETO_GENERICO, w.slice(0, 2).join(' '))) {
    return splitRe(rx(',|\\s+y con\\b|;'), objeto)[0].trim();
  }
  const cortes = [...new Set([...finditer(INICIO_CONTEXTO, objeto).map(m => m.index),
    ...finditer(/\s*,/u, objeto).map(m => m.index)])].sort((a, b) => a - b);
  for (const c of cortes) {
    const resto = objeto.slice(c);
    if (resto.trimStart().startsWith(',') && !match(INICIO_CONTEXTO, ' ' + lstrip(resto, ', '))) {
      const sinComa = lstrip(resto, ', ');
      const siguiente = splitRe(/,/u, sinComa, 1)[0];
      if (rx('\\s(?:y|e|o|u)\\s').test(siguiente) || sinComa.slice(0, siguiente.length + 1).includes(',')) continue;
    }
    if (palabras(objeto.slice(0, c)).length >= 2) return objeto.slice(0, c).trim();
  }
  return objeto.trim();
}

export function formaBreve(tipo, verbo, atributo, persona = 'infinitivo') {
  if (['Acción', 'Normativo', 'Finalidad'].includes(tipo) && verbo) {
    const i = atributo.indexOf(' ');
    const primeraP = i < 0 ? atributo : atributo.slice(0, i);
    let objeto = i < 0 ? '' : atributo.slice(i + 1);
    const primera = primeraP.toLowerCase();
    objeto = objeto.replace(rx('^(?:l[oa]s?|se|le|les)\\b\\s*'), '');
    let nucleo = tipo === 'Normativo' ? objeto : (cortar(objeto) || objeto);
    if (['convertir', 'transformar'].includes(verbo) && /^(?:en|a)\s/u.test(nucleo)) {
      nucleo = atributo.toLowerCase().includes('oportunidad') ? 'oportunidades ' + nucleo : nucleo;
    }
    const sufijos = ['ar', 'er', 'ir', 'ando', 'iendo', 'arlas', 'erlas', 'irlas', 'arlos', 'irlos', 'erlos'];
    const forma = persona === 'tercera' && !sufijos.some(s => primera.endsWith(s)) ? primera : conjugar(verbo, persona);
    return capitalize(`${forma} ${nucleo}`.trim());
  }
  return capitalize(atributo.replace(/\s*,.*$/u, '').trim()) || capitalize(atributo);
}

export function extraerAtributosDetalle(texto, lexico, persona = 'infinitivo') {
  return extraerAtributos(texto, lexico).map(([tipo, verbo, atributo]) =>
    ({ tipo, verbo, atributo, breve: formaBreve(tipo, verbo, atributo, persona) }));
}
