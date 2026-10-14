"""Prepara los datos que necesita el módulo «Perfil de egreso» de la versión HTML.

Genera:
  web/public/data/lexico_es.json            léxico forma → (lema, categoría, vacía) construido con spaCy sobre el
                                            texto de las matrices (spaCy no existe en el navegador)
  web/public/data/config_asociacion_perfil.json   configuración del método (parámetros y sinónimos)
  web/public/data/taxonomia_verbos.json     verbos de respaldo (Taxonomias.xlsx)
  web/tests/golden_perfil.json              resultado de REFERENCIA de src/asociacion_perfil.py por matriz (no se
                                            versiona: las matrices son datos institucionales)

Uso (desde la raíz del repo):  python -X utf8 web/tools/exportar_perfil.py [--sin-golden]
"""
import glob
import json
import re
import sys
import warnings
from collections import Counter, defaultdict
from pathlib import Path

warnings.filterwarnings('ignore')
RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))

import pandas as pd  # noqa: E402

from src import asociacion_perfil as ap  # noqa: E402

SALIDA = RAIZ / 'web' / 'public' / 'data'
SALIDA.mkdir(parents=True, exist_ok=True)
CODIGO_POS = {'NOUN': 'N', 'PROPN': 'P', 'ADJ': 'A', 'VERB': 'V'}
CARPETAS = [RAIZ / 'data' / 'raw' / 'FORMATOS RA CICLO UNO RC', RAIZ / 'data' / 'raw' / '01_FormatosRA_ReformaCurricular']
CORPUS = sorted((RAIZ / 'data' / 'raw' / 'FORMATOS RA CICLO UNO RC').glob('FormatoRA*.xlsx'))


def tokens_detalle(texto: str):
    """Igual que ap._tokens pero conserva todos los tokens con su análisis completo."""
    t = ap._norm(texto)
    t = ap.NEGACION.sub(lambda m: m.group(1) + '_' + m.group(2).replace(' ', '_'), t)
    return [(tok.text, ap.IRREGULARES.get(tok.text, ap._norm(tok.lemma_) if '_' not in tok.text else tok.text)
             .replace(' ', '_'), tok.pos_, bool(tok.is_stop)) for tok in ap._nlp()(t)]


def textos_de(matriz: Path):
    m = ap.leer_matriz(str(matriz))
    items = ap.items_perfil(m)
    textos = [i['item'] for i in items]
    for capa in ap.CAPAS:
        for e in m['entidades'][capa]:
            textos += e['unidades']
    textos += [t for _, t in m['componentes']] + [v for v in m['perfil'].values() if v]
    return m, items, textos


def construir_lexico(salida=None, excluir=(), solo_corpus=False):
    visto = defaultdict(Counter)
    n = 0
    fuentes = CORPUS if solo_corpus else sorted({p for c in CARPETAS for p in c.glob('FormatoRA*.xlsx')}, key=lambda p: p.name)
    for f in [p for p in fuentes if not any(x in p.name for x in excluir)]:
        try:
            _, _, textos = textos_de(f)
        except Exception as e:  # noqa: BLE001
            print('  omitida', f.name, e)
            continue
        for tx in textos:
            for forma, lema, pos, stop in tokens_detalle(tx):
                visto[forma][(lema, CODIGO_POS.get(pos, 'O'), int(stop))] += 1
                n += 1
    lex = {}
    for forma, c in visto.items():
        (lema, pos, stop), _ = c.most_common(1)[0]
        lex[forma] = f'{lema}|{pos}|{stop}' if lema != forma else f'|{pos}|{stop}'
    stop = sorted({ap._norm(w) for w in ap._nlp().Defaults.stop_words})
    (Path(salida) if salida else SALIDA / 'lexico_es.json').write_text(json.dumps({'v': 1, 'stop': stop, 'f': lex}, ensure_ascii=False,
                                                       separators=(',', ':')), encoding='utf-8')
    print(f'léxico: {len(lex)} formas de {n} tokens → lexico_es.json')


def exportar_config():
    cfg = json.loads(Path(ap.CONFIG_DEFECTO).read_text(encoding='utf-8'))
    (SALIDA / 'config_asociacion_perfil.json').write_text(json.dumps(cfg, ensure_ascii=False, indent=1), encoding='utf-8')
    (SALIDA / 'taxonomia_verbos.json').write_text(
        json.dumps(sorted(ap._lexico_respaldo()), ensure_ascii=False), encoding='utf-8')
    print('config y verbos de respaldo exportados')


def golden():
    cfg = ap.cargar_config()
    ap.aplicar_config(cfg)
    salida = {'huella': ap.config_actual()['HUELLA'], 'matrices': {}}
    for f in CORPUS:
        avisos = []
        filas = ap.asociar(str(f), avisos=avisos)
        items = pd.DataFrame(ap.resumen_items(filas))
        det = defaultdict(list)
        for r in filas:
            det[(r['perfil'], r['origen'], r['item'])].append(
                [r['capa'], r['entidad'], r['nivel'], r['cobertura'], r['similitud']])
        salida['matrices'][ap._nombre_matriz(f.name) if hasattr(ap, '_nombre_matriz') else re.sub(r'^FormatoRA[_-]|\.xlsx?$', '', f.name)] = {
            'avisos': avisos,
            'items': [{**{k: (v if not hasattr(v, 'item') else v.item()) for k, v in it.items()},
                       'det': det[(it['perfil'], it['origen'], it['item'])]} for it in items.to_dict('records')]}
        print('  golden', f.name, len(items))
    (RAIZ / 'web' / 'tests' / 'golden_perfil.json').write_text(
        json.dumps(salida, ensure_ascii=False, separators=(',', ':'), default=str), encoding='utf-8')


if __name__ == '__main__':
    if '--generalizacion' in sys.argv:
        # léxico SIN las matrices indicadas (y solo con el corpus): mide cuánto se degrada con matrices nuevas
        excl = [a.split('=')[1] for a in sys.argv if a.startswith('--excluir=')][0].split(',')
        construir_lexico(salida=RAIZ / 'web' / 'tests' / 'lexico_sin_heldout.json', excluir=excl, solo_corpus=True)
        sys.exit()
    exportar_config()
    construir_lexico()
    if '--sin-golden' not in sys.argv:
        golden()
