"""
Extracción determinista de atributos de un perfil de egreso redactado en prosa continua.

Se ejecuta al cargar las matrices (dashboard) y en la auditoría, con el mismo resultado para
cualquier programa: no usa modelos generativos. Un atributo es una unidad con sentido propio:

  Acción        verbo + objeto (+ complemento): «formula estrategias organizacionales innovadoras»
  Conocimiento  ítem de una enumeración nominal de saberes: «posee conocimientos en algoritmia, programación…»
  Función       ítem de una enumeración de funciones, campos o áreas: «desempeñarse en funciones de desarrollo
                de aplicaciones, análisis de requerimientos…»
  Rol           cargo u ocupación: «desempeñarse como asesores, analistas, investigadores…»
  Rasgo         rasgo actitudinal: «se caracteriza por su pensamiento crítico y compromiso con…»

Reglas, en orden:
  1. Bloques: cada línea con viñeta o guion es un bloque; el resto del texto, otro.
  2. Marcos introductorios («Su formación le permite», «está capacitado para», «cuenta con las
     competencias necesarias para») se convierten en separadores.
  3. Enumeraciones nominales tras un disparador (posee/cuenta con conocimientos en…, habilidades para…,
     en funciones de…, en campos de…, en áreas de…, cargos de…, como…) se dividen por comas, «y», «e», «o»,
     «así como».
  4. Acciones: corte en cada verbo que inicia predicado (léxico de verbos de la matriz o infinitivo /
     gerundio tras conector; el primer verbo conjugado de la oración). Los verbos coordinados sin objeto
     propio comparten el objeto del siguiente. Una forma con tilde en sílaba cerrada («pública») no es verbo.
  5. Rasgos tras «se caracteriza / distingue / destaca por».
  6. Adjetivos coordinados sobre un mismo nombre se expanden: «implementar planes estratégicos, tácticos y
     operativos» → tres atributos.
  7. Una relativa «que + verbo» con objeto propio se separa como acción: «convertirlas en iniciativas
     productivas que generen valor…» → «convertirlas en iniciativas productivas» y «generar valor…».
  8. Un marco normativo («según / conforme a / de acuerdo con … el marco legal, la normativa, la ley…») se
     registra como atributo Normativo «actuar conforme a …».
  9. Forma breve (extraer_atributos_detalle): verbo + núcleo del objeto, sin complementos de contexto ni artículo inicial. No se
     corta dentro de una enumeración ni deja un objeto de una sola palabra; si el objeto es genérico
     («su rol», «sus funciones»), conserva el complemento que lo especifica.
 10. Finalidad: «con el propósito / fin / objetivo de», «a fin de» + infinitivo(s) coordinados → un atributo
     Finalidad por infinitivo.
 11. Medios: «mediante / a través de / por medio de» + enumeración → un atributo Función por ítem.
 12. Rasgo incrustado: «con responsabilidad / ética / compromiso / criterio / sentido …» dentro de una acción
     → atributo Rasgo.
"""

import re
import unicodedata
from functools import lru_cache
from typing import Iterable, List, Tuple

MARCOS = [
    r'\b(?:su|la|esta) formacion(?: integral| profesional)? (?:le|les) permite\b',
    r'\b(?:estos|sus) (?:conocimientos|saberes) (?:le|les) permiten\b',
    r'\bque (?:le|les) permiten?\b',
    r'\besta (?:capacitad[oa]|preparad[oa]) para\b',
    r'\bcuenta con (?:las|los) (?:competencias|conocimientos|habilidades)(?: necesari[oa]s)? para\b',
    r'\b(?:es|sera|seran) capa(?:z|ces) de\b',
    r'\b(?:esta|estara|estaran) en capacidad de\b',
    r'\btiene la capacidad de\b',
    r'\b(?:es un profesional |un profesional )?con (?:la )?capacidad (?:de|para)\b',
    r'\btendra la (?:capacidad|posibilidad) (?:de|para)\b',
    r'\bpodra[n]?\b',
]
RASGO = re.compile(r'\bse (?:caracteriza|distingue|destaca) por\s+')
DISPARADORES = [
    ('Conocimiento', r'\b(?:posee|poseen|tiene|tienen|cuenta con|con)\s+(?:altas |solidos |solidas |amplios |amplias )?'
                     r'(?:conocimientos|saberes|formacion|bases(?: solidas)?)(?:\s+(?:conceptuales|tecnicos|teoricos|'
                     r'metodologicos|solidos|solidas|integral|especializad[oa]s?)[, y]*)*\s+(?:en|sobre|de)\s+'),
    ('Función', r'\b(?:posee|poseen|tiene|tienen|cuenta con|con)\s+(?:las |altas |solidas |amplias )?'
                r'(?:habilidades|competencias|capacidades)(?:\s+[a-z]+){0,2}?\s+(?:para|en)\s+'),
    ('Función', r'\ben (?:las )?(?:funciones|campos|areas|actividades|cargos|ambitos) (?:de|como|relacionad[oa]s con)\s+'),
    ('Función', r'\b(?:ejercer|desempenar|ocupar) cargos (?:de|en)\s+'),
    ('Rol', r'\bcargos tales como\s+'),
    ('Función', r'\bactividades(?: [a-z]+){0,5}? como (?:la |el |los |las )?'),
    ('Función', r'\b(?:abarca|comprende|incluye)\s+(?:la |el |los |las )?'),
    ('Rol', r'\b(?:desempenarse|desempenandose|desempena|vincularse|actuar|trabajar|ejercer)(?:\s+[a-z]+){0,2}?\s+como\s+'),
]
CONECTORES_ENUM = r'\s*,\s*(?:y\s+|e\s+|o\s+)?|\s+(?:y|e|o|u)\s+(?:(?=el |la |los |las |en |de )|(?!\w+ (?:de|del)\b))|;\s*|\s+asi como\s+(?:en\s+)?'
EXCLUIR = {'ser', 'estar', 'haber', 'tener', 'permitir', 'caracterizar', 'contar', 'poder', 'deber', 'poseer'}
NO_VERBOS = {'lugar', 'hogar', 'mujer', 'mayor', 'menor', 'nivel', 'familiar', 'similar', 'particular', 'popular',
             'escolar', 'militar', 'titular', 'regular', 'singular', 'mejor', 'peor', 'anterior', 'posterior', 'interior',
             'exterior', 'superior', 'inferior', 'bienestar', 'poder', 'deber', 'saber', 'quehacer', 'placer', 'auxiliar',
             'polar', 'solar', 'lunar', 'modular', 'nuclear', 'celular', 'molecular', 'vascular', 'muscular', 'circular',
             'rectangular', 'secular', 'tutelar', 'preescolar', 'ejemplar', 'complementar', 'interdisciplinar',
             'multidisciplinar', 'transdisciplinar', 'actuar' if False else '', 'cambiando' if False else ''}


def _sin_tildes(t: str) -> str:
    return unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode('ascii').lower()


def _plano(texto: str) -> str:
    """Versión sin tildes y en minúsculas con la MISMA longitud que el texto (índices alineados)."""
    return ''.join((_sin_tildes(c) or c) if c not in 'ñÑ' else 'n' for c in texto)


def formas(infinitivo: str) -> List[str]:
    """Infinitivo, presente 3.ª persona (singular y plural) y gerundio, sin tildes."""
    v = _sin_tildes(infinitivo.strip())
    v = v[:-2] if v.endswith('se') and len(v) > 4 else v
    raiz, term = v[:-2], v[-2:]
    if term not in ('ar', 'er', 'ir'):
        return [v]
    a = 'a' if term == 'ar' else 'e'
    return [v, raiz + a, raiz + a + 'n', raiz + ('ando' if term == 'ar' else 'iendo')]


@lru_cache(maxsize=16)
def _patron(lexico: Tuple[str, ...]):
    mapa = {}
    for inf in lexico:
        if _sin_tildes(inf) in EXCLUIR:
            continue
        for f in formas(inf):
            mapa.setdefault(f, _sin_tildes(inf))
    alt = '|'.join(sorted(map(re.escape, mapa), key=len, reverse=True)) or r'(?!x)x'
    return re.compile(r'\b(' + alt + r')(?:l[oa]s?|se|le|les)?\b'), mapa


def _tilde_no_verbal(original: str) -> bool:
    """«pública», «técnica»: tilde en vocal seguida de consonante → no es un presente verbal
    («actúa», «evalúa», «envía» llevan la tilde en hiato y sí lo son)."""
    m = re.search(r'[áéíóú](.)', original.lower())
    return bool(m) and m.group(1) not in 'aeiou'


def _limpiar(seg: str) -> str:
    seg = re.sub(r'^[\s,;:.\-–—•*]+|[\s,;:.\-–—•*]+$', '', seg)
    seg = re.sub(r'\s+(?:y|e|o|u|para|de|del|como|en)$', '', seg)
    return seg.strip(' ,;:.')


CONTEXTO = re.compile(r'\s+(?:en|para|de) (?:las? |los |diversos |distintos |diferentes |todo tipo de )?'
                      r'(?:empresas|organizaciones|instituciones|entidades|sectores?|ambitos?|contextos?|industria)\b.*$'
                      r'|\s*,?\s*tanto en .*$|\s*,?\s*entre otros.*$')


ADJ_FINAL = re.compile(r'^(?!(?:el|la|los|las|un|una|de|del|en)\b)[a-záéíóúñ]+(?:ntes?|bles?|ivos?|ivas?|icos?|icas?|ales?|osos?|osas?|ados?|adas?|idos?|idas?|doras?|dores)\b', re.I)


def _dividir_y_final(parte: str) -> List[str]:
    """Divide «A y B» salvo que A sea una palabra suelta y B lleve el complemento compartido
    («manejo y manipulación de materiales») o que B empiece con un adjetivo («innovadoras y eficientes…»)."""
    d = re.split(r'\s+(?:y|e|o|u)\s+', parte, maxsplit=1)
    if len(d) == 2 and ((len(d[0].split()) == 1 and len(d[1].split()) >= 3) or ADJ_FINAL.match(d[1].strip())):
        return [parte]
    return d


def _enumeracion(texto: str) -> List[str]:
    """Divide «A, B, C y D» en ítems; sin comas, la «y» se conserva dentro del ítem («negocios y comercio»)."""
    texto = re.sub(r'\s+as[ií] como\s+(?:en\s+)?', ', ', texto, flags=re.I)
    m = CONTEXTO.search(_plano(texto))
    if m:
        texto = texto[:m.start()]
    if ';' in texto:                               # lista de bloques: «campos de A; cargos de B; funciones de C»
        partes = re.split(r'\s*;\s*', texto)
    elif ',' in texto:
        partes = re.split(r'\s*,\s*', texto)
        partes = partes[:-1] + _dividir_y_final(partes[-1])
    else:
        partes = [texto]
    # una pieza que empieza con adjetivo o preposición continúa la anterior («propuestas creativas, innovadoras y sostenibles»)
    unidas = []
    for p in partes:
        q = p.strip()
        q0 = re.sub(r'^(?:y|e)\s+', '', q, flags=re.I)
        # «y de la administración…» es un elemento paralelo; «de las tendencias», «basados en…» continúan el anterior
        if unidas and (ADJ_FINAL.match(q0) or re.match(r'^(?:de|del|por|para|con|basad[oa]s?|orientad[oa]s?|segun|según)\b', q, re.I)):
            unidas[-1] = f'{unidas[-1]}, {q}'
        else:
            unidas.append(q)
    partes = unidas
    out = []
    for p in partes:
        p = _limpiar(re.sub(r'^(?:(?:y|e|o|u|el|la|los|las|un|una|en|de|del|bien sea como|como)\s+)+', '', p.strip(), flags=re.I))
        if len(p) >= 4 and re.search(r'[a-záéíóúñ]{3}', p, re.I):
            out.append(p)
    return out


def _bloques(texto: str) -> List[str]:
    lineas = [linea.strip() for linea in str(texto).split('\n')]
    bloques, prosa = [], []
    for linea in lineas:
        if not linea:
            continue
        if linea.endswith(':') and prosa:
            continue
        if re.match(r'^(?:[-–—•*]|\d+[.)])\s*', linea):
            bloques.append(re.sub(r'^(?:[-–—•*]|\d+[.)])\s*', '', linea))
        else:
            prosa.append(linea)
    return [' '.join(prosa)] + bloques if prosa else bloques


def _extraer_bloque(base: str, patron, mapa) -> List[Tuple[str, str, str]]:
    base = re.sub(r'\s+', ' ', base).strip()
    plano = _plano(base)
    for m in MARCOS:
        plano = re.sub(m, lambda x: '|' + ' ' * (len(x.group(0)) - 1), plano)
    usados = [False] * len(base)
    out = []

    def fin_de_tramo(ini):
        m = re.search(r'[.|]|;(?=\s*[a-z]+\s+(?:como|en)\b)', plano[ini:])
        return ini + m.start() if m else len(base)

    # Rasgos
    for o in re.finditer(r'[^.]+', plano):
        r = RASGO.search(o.group(0))
        if r:
            ini, fin = o.start() + r.end(), o.end()
            trozo = re.split(r',\s*(?:seg[uú]n|de acuerdo con|conforme a|para|con el cual|que)\b|\s+con el cual\b', base[ini:fin])[0]
            trozo = re.sub(r'^(?:tener|poseer|su|sus|el|la|los|las)\s+(?:un |una |su |sus )?', '', trozo.strip())
            for p in re.split(r'\s+y\s+(?:su\s+|sus\s+|un\s+|una\s+)?', trozo):
                p = _limpiar(p)
                if len(p.split()) >= 2:
                    out.append(('Rasgo', '', p))
            for i in range(o.start() + r.start(), fin):
                usados[i] = True
            plano = plano[:o.start() + r.start()] + '|' * (fin - o.start() - r.start()) + plano[fin:]

    # Enumeraciones nominales tras disparador
    for tipo, disp in DISPARADORES:
        for m in re.finditer(disp, plano):
            if usados[m.start()]:
                continue
            ini = m.end()
            fin = fin_de_tramo(ini)
            # la enumeración termina donde empieza un nuevo predicado verbal tras coma
            v = re.search(r',\s*(?=(?:[a-z]+(?:ando|iendo|yendo)|para [a-z]+(?:ar|er|ir))\b)', plano[ini:fin])
            if v:
                fin = ini + v.start()
            items = _enumeracion(base[ini:fin])
            if len(items) >= 1:
                out += [(tipo, '', i) for i in items]
                for i in range(m.start(), fin):
                    usados[i] = True

    # Acciones
    candidatos = [(m.start(), m.group(1), mapa[m.group(1)]) for m in patron.finditer(plano)]
    vistos = {i for i, _, _ in candidatos}
    for m in re.finditer(r'\b([a-z]{3,}(?:ar|er|ir|ando|iendo|yendo))(?:l[oa]s?|se|le|les)?\b', plano):
        if m.start() not in vistos and m.group(1) not in NO_VERBOS:
            inf = re.sub(r'ando$', 'ar', re.sub(r'iendo$', 'er', re.sub(r'([aeiou])yendo$', r'\1ir', m.group(1))))
            candidatos.append((m.start(), m.group(1), inf))
    cortes, con_verbo = [], set()
    for ini, forma, inf in sorted(candidatos):
        if inf in EXCLUIR or usados[ini]:
            continue
        original = base[ini:ini + len(forma)]
        if not forma.endswith(('ar', 'er', 'ir', 'ando', 'iendo', 'yendo')) and _tilde_no_verbal(original):
            continue
        previo = plano[:ini].rstrip()
        n_or = previo.count('.')
        tras_conector = not previo or previo[-1] in ',;:.|' or re.search(r'\b(?:y|e|para|o|asi como)$', previo)
        en_lexico = forma in mapa
        primero = en_lexico and n_or not in con_verbo and not forma.endswith(('ar', 'er', 'ir'))
        if (tras_conector and (en_lexico or forma.endswith(('ar', 'er', 'ir', 'ando', 'iendo', 'yendo')))) or primero:
            cortes.append((ini, inf))
            con_verbo.add(n_or)
    acciones = []
    for k, (ini, verbo) in enumerate(cortes):
        fin = cortes[k + 1][0] if k + 1 < len(cortes) else len(base)
        fin = min(fin, fin_de_tramo(ini))
        u = next((i for i in range(ini, fin) if usados[i]), fin)     # no invadir enumeraciones ya extraídas
        # verbo coordinado: entre él y el siguiente verbo solo hay «y», «e» o coma («formula y ejecuta estrategias»)
        coordinado = u == fin and k + 1 < len(cortes) and re.fullmatch(r'\s*\S+\s*(?:,|y|e)?\s*', plano[ini:cortes[k + 1][0]]) is not None
        acciones.append([verbo, _limpiar(base[ini:u]), coordinado])
    for k, (verbo, seg, coordinado) in enumerate(acciones):
        if len(seg.split()) == 1 and coordinado and ' ' in acciones[k + 1][1]:
            seg = f"{seg} {acciones[k + 1][1].split(' ', 1)[1]}"
        if len(seg.split()) >= 2:
            out.append(('Acción', verbo, seg))
    return out


def extraer_atributos(texto: str, lexico: Iterable[str]) -> List[Tuple[str, str, str]]:
    """
    Atributos de un perfil (profesional u ocupacional).

    Args:
        texto: texto del perfil (Paso 1, columna C o D).
        lexico: verbos de la matriz (hojas de taxonomía), en infinitivo.

    Returns:
        lista de (tipo, verbo en infinitivo o '', atributo), sin duplicados, en orden de aparición
        por tipo. tipo ∈ {Acción, Conocimiento, Función, Rol, Rasgo}.
    """
    if not texto or not str(texto).strip():
        return []
    patron, mapa = _patron(tuple(sorted({_sin_tildes(v) for v in lexico if v})))
    infinitivos = set(mapa.values())
    out = []
    for k, b in enumerate(_bloques(texto)):
        attrs = _extraer_bloque(b, patron, mapa)
        if not attrs and k > 0:                     # viñeta nominal: cargo, campo o función
            tipo = 'Rol' if re.search(r'como\s*:', _plano(str(texto))) else 'Función'
            attrs = [(tipo, '', i) for i in _enumeracion(re.sub(r'\s+', ' ', b))]
        out += attrs
    out = [x for a in out for x in _expandir(a, infinitivos)]
    out += _normativos(str(texto))
    vistos, unicos = set(), []
    for a in out:
        clave = _sin_tildes(a[2])
        if clave not in vistos:
            vistos.add(clave)
            unicos.append(a)
    return unicos


ADJ = r'[a-záéíóúñ]+(?:icos?|icas?|ivos?|ivas?|ales?|arios?|arias?|osos?|osas?|ntes?|ales|eros?|eras?)'
ADJ_COORD = re.compile(r'\b(' + ADJ + r')((?:\s*,\s*' + ADJ + r')*)\s*,?\s+(?:y|e)\s+(' + ADJ + r')\b', re.I)
RELATIVA = re.compile(r'\s+que\s+([a-záéíóúñ]+?)(an|en|a|e)\s+(.+)$', re.I)
NORMATIVO = re.compile(r'\b(?:segun|conforme a|de acuerdo con|en cumplimiento de|acorde con|en el marco de)\s+'
                       r'((?:[a-z]+\s+){0,6}?(?:el |la |los |las )?(?:marco (?:legal|normativo|juridico)|normatividad|normativa|'
                       r'legislacion|ley(?:es)?|regulacion(?:es)?|normas?)\b[a-z ]{0,40}?)(?=[.,;]|$)')
COMPLEMENTO = re.compile(r'\s+(?:seg[uú]n|alinead[oa]s?|para|de acuerdo|a partir|mediante|a trav[eé]s|que|dentro|tanto|'
                         r'bajo|acorde|conforme|desde|hacia|aplicando|con (?:el|un|una) (?:prop[oó]sito|fin|enfoque|perspectiva)|'
                         r'con (?:visi[oó]n|criterio|responsabilidad|enfoque)|en (?:contextos?|distintos|diversos|diferentes|'
                         r'el marco|cumplimiento|entornos?|los sectores|el sector))\b.*$|\s*,.*$', re.I)
ENUM_OBJETO = re.compile(r'^(\S+)\s+((?:(?:el|la|los|las|sus?)\s+[^,]+,\s*){2,}(?:(?:y|e)\s+)?(?:el|la|los|las|sus?)\s+.+)$', re.I)
CONTEXTO_SIN_COMA = re.compile(COMPLEMENTO.pattern.rsplit('|', 1)[0], re.I)
INICIO_CONTEXTO = re.compile(CONTEXTO_SIN_COMA.pattern.replace(r'\b.*$', r'\b'), re.I)   # sin consumir el resto
IRREGULARES = {'promover': 'promueve', 'resolver': 'resuelve', 'mover': 'mueve', 'devolver': 'devuelve', 'demostrar': 'demuestra',
               'encontrar': 'encuentra', 'sostener': 'sostiene', 'mantener': 'mantiene', 'obtener': 'obtiene', 'contener': 'contiene',
               'defender': 'defiende', 'entender': 'entiende', 'atender': 'atiende', 'extender': 'extiende', 'invertir': 'invierte',
               'convertir': 'convierte', 'advertir': 'advierte', 'sugerir': 'sugiere', 'adquirir': 'adquiere', 'servir': 'sirve',
               'medir': 'mide', 'seguir': 'sigue', 'conseguir': 'consigue', 'elegir': 'elige', 'construir': 'construye',
               'contribuir': 'contribuye', 'distribuir': 'distribuye', 'concluir': 'concluye', 'incluir': 'incluye', 'influir': 'influye',
               'instruir': 'instruye', 'conducir': 'conduce', 'pensar': 'piensa', 'emprender': 'emprende', 'orientar': 'orienta',
               'evaluar': 'evalúa', 'actuar': 'actúa', 'continuar': 'continúa', 'graduar': 'gradúa', 'situar': 'sitúa',
               'enviar': 'envía', 'guiar': 'guía', 'ampliar': 'amplía', 'confiar': 'confía', 'diferenciar': 'diferencia'}


FINALIDAD = re.compile(r',?\s*(?:con (?:el|la) (?:prop[oó]sito|fin|finalidad|objetivo|intenci[oó]n) de|a fin de)\s+(.+)$', re.I)
MEDIOS = re.compile(r'\s+(?:mediante|a trav[eé]s de|por medio de)\s+(.+?)(?=,\s*(?:con|para|en|seg[uú]n)\b|$)', re.I)
RASGO_INCRUSTADO = re.compile(r'\bcon (?:alta |gran |plena )?((?:responsabilidad|[eé]tica|compromiso|criterio [eé]tico|sentido|'
                              r'integridad|transparencia|autonom[ií]a|liderazgo)\b[^,;]*?)(?=\s+y con\b|,|;|$)', re.I)
OBJETO_GENERICO = re.compile(r'^(?:su|sus)\s+(?:rol|roles|funci[oó]n|funciones|labor|labores|profesi[oó]n|ejercicio(?: profesional)?|'
                             r'quehacer|trabajo|actividad|actividades)$', re.I)
INFINITIVOS = re.compile(r'\s+(?:y|e)\s+(?=[a-záéíóúñ]+(?:ar|er|ir)\b)', re.I)


def _expandir(a, infinitivos):
    """Reglas 6, 7, 10, 11 y 12 sobre un atributo de acción."""
    tipo, verbo, txt = a
    if tipo != 'Acción':
        return [a]
    out = []
    f = FINALIDAD.search(txt)
    if f and len(txt[:f.start()].split()) >= 2:
        for inf in INFINITIVOS.split(f.group(1)):
            inf = _limpiar(inf)
            if len(inf.split()) >= 2:
                out.append(('Finalidad', _sin_tildes(inf.split()[0]), inf))
        txt = _limpiar(txt[:f.start()])
    m = MEDIOS.search(txt)
    if m:
        out += [('Función', '', i) for i in _enumeracion(m.group(1)) if len(i.split()) >= 2]
    for r in RASGO_INCRUSTADO.finditer(txt):
        if len(r.group(1).split()) >= 2:
            out.append(('Rasgo', '', _limpiar(r.group(1))))
    m = RELATIVA.search(txt)
    if m and len(txt[:m.start()].split()) >= 3:     # el objeto principal conserva al menos dos palabras
        raiz, desin, resto = m.group(1), m.group(2).lower(), m.group(3)
        # «sustenta(n)» → -ar (indicativo); «genere(n)» → -ar (subjuntivo) o -er/-ir (indicativo): se prefiere el léxico
        opciones = [raiz + 'ar'] if desin in ('a', 'an') else [raiz + 'ar', raiz + 'er', raiz + 'ir']
        inf = next((o for o in opciones if _sin_tildes(o) in infinitivos), opciones[0])
        if _sin_tildes(inf) not in EXCLUIR and len(resto.split()) >= 2:
            txt = txt[:m.start()]
            out.append(('Acción', _sin_tildes(inf), _limpiar(f'{inf} {resto}')))
    e = ENUM_OBJETO.match(txt)
    if e and not COMPLEMENTO.search(e.group(2).split(',')[0]):
        items = re.split(r'\s*,\s*(?:y\s+|e\s+)?|\s+(?:y|e)\s+(?=(?:el|la|los|las|sus?)\s)', e.group(2))
        items = [i.strip() for i in items if len(i.split()) >= 2]
        if len(items) >= 3:
            return [('Acción', verbo, f'{e.group(1)} {i}') for i in items] + out
    corte = CONTEXTO_SIN_COMA.search(txt)
    m = ADJ_COORD.search(txt[:corte.start()] if corte else txt)
    if m:
        lista = [m.group(1)] + [x.strip() for x in m.group(2).split(',') if x.strip()] + [m.group(3)]
        if len(lista) >= 2:
            return [('Acción', verbo, txt[:m.start()] + adj + txt[m.end():]) for adj in lista] + out
    return [(tipo, verbo, txt)] + out


def _normativos(texto):
    """Regla 8."""
    base = re.sub(r'\s+', ' ', texto)
    plano = _plano(base)
    out = []
    for m in NORMATIVO.finditer(plano):
        frase = re.sub(r'^(?:\s*y\s+)', '', base[m.start(1):m.end(1)]).strip()
        frase = re.sub(r'^.*?\b(?=(?:el|la|los|las) (?:marco|normatividad|normativa|legislaci|ley|regulaci|norma))', '', frase)
        out.append(('Normativo', 'actuar', _limpiar('actuar conforme a ' + frase).replace(' a el ', ' al ')))
    return out


def _conjugar(inf: str, persona: str) -> str:
    if persona != 'tercera' or inf[-2:] not in ('ar', 'er', 'ir'):
        return inf
    if inf in IRREGULARES:
        return IRREGULARES[inf]
    return inf[:-2] + ('a' if inf.endswith('ar') else 'e')


def _cortar(objeto: str) -> str:
    """Núcleo del objeto: corta en el primer complemento de contexto (o coma que no sea de enumeración)
    que deje al menos dos palabras; un objeto genérico conserva su complemento hasta la coma o «y con»."""
    if OBJETO_GENERICO.match(' '.join(objeto.split()[:3])) or OBJETO_GENERICO.match(' '.join(objeto.split()[:2])):
        return re.split(r',|\s+y con\b|;', objeto)[0].strip()
    cortes = sorted({m.start() for m in INICIO_CONTEXTO.finditer(objeto)} |
                    {m.start() for m in re.finditer(r'\s*,', objeto)})
    for c in cortes:
        resto = objeto[c:]
        if resto.lstrip().startswith(',') and not INICIO_CONTEXTO.match(' ' + resto.lstrip(', ')):
            siguiente = re.split(r',', resto.lstrip(', '), maxsplit=1)[0]
            if re.search(r'\s(?:y|e|o|u)\s', siguiente) or ',' in resto.lstrip(', ')[:len(siguiente) + 1]:
                continue                                   # coma de enumeración («naturales, jurídicas y …»)
        if len(objeto[:c].split()) >= 2:
            return objeto[:c].strip()
    return objeto.strip()


def forma_breve(tipo: str, verbo: str, atributo: str, persona: str = 'infinitivo') -> str:
    """Verbo + núcleo del objeto, sin complementos de contexto («Formula estrategias organizacionales innovadoras»).
    persona: 'infinitivo' (perfil ocupacional) o 'tercera' (perfil profesional)."""
    if tipo in ('Acción', 'Normativo', 'Finalidad') and verbo:
        partes = atributo.split(' ', 1)
        objeto = partes[1] if len(partes) > 1 else ''
        primera = partes[0].lower()
        objeto = re.sub(r'^(?:l[oa]s?|se|le|les)\b\s*', '', objeto)
        nucleo = objeto if tipo == 'Normativo' else (_cortar(objeto) or objeto)
        if verbo in ('convertir', 'transformar') and re.match(r'^(?:en|a)\s', nucleo):
            nucleo = 'oportunidades ' + nucleo if 'oportunidad' in atributo.lower() else nucleo
        forma = primera if persona == 'tercera' and not primera.endswith(('ar', 'er', 'ir', 'ando', 'iendo', 'arlas', 'erlas', 'irlas', 'arlos', 'irlos', 'erlos')) else _conjugar(verbo, persona)
        return f'{forma} {nucleo}'.strip().capitalize()
    return re.sub(r'\s*,.*$', '', atributo).strip().capitalize() or atributo.capitalize()


def extraer_atributos_detalle(texto: str, lexico: Iterable[str], persona: str = 'infinitivo') -> List[dict]:
    """Como extraer_atributos, con la forma breve de cada atributo."""
    return [{'tipo': t, 'verbo': v, 'atributo': a, 'breve': forma_breve(t, v, a, persona)}
            for t, v, a in extraer_atributos(texto, lexico)]


def lexico_de_matriz(wb) -> set:
    """Verbos en infinitivo de las hojas de taxonomía de un libro openpyxl."""
    lex = set()
    for s in wb.sheetnames:
        if _sin_tildes(s).startswith('taxonom'):
            for r in wb[s].iter_rows(values_only=True):
                for x in r:
                    if isinstance(x, str) and re.fullmatch(r'[A-Za-zÁÉÍÓÚáéíóúñ]+(?:ar|er|ir)(?:se)?', x.strip()):
                        lex.add(x.strip().lower())
    return lex
