"""Programa → facultad, a partir de la oferta académica oficial (auditoria/fuentes/oferta_academica_por_facultad.csv).

Uso (desde la raíz del repo): python web/tools/exportar_facultades.py
Escribe web/public/data/facultades.json. El nombre del programa se normaliza igual que en web/src/data/facultades.js
(sin tildes ni mayúsculas, sin paréntesis ni palabras de enlace). Las matrices no traen la facultad: se asigna por el nombre.
"""
import csv
import json
import re
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
ENLACES = {'de', 'del', 'la', 'las', 'los', 'el', 'en', 'con', 'y', 'e', 'para', 'por'}
FSCC = 'Facultad de Sociedad, Cultura y Creatividad'
# la fila «Facultad de Sociedad, Cultura and Branding» viene con las columnas corridas (ver auditoria/fuentes/LEEME.md)
CORREGIR_FACULTAD = {'Facultad de Sociedad, Cultura and Branding': FSCC}
# el nombre con el que viene en la matriz y no coincide con el de la oferta
ALIAS = {'Profesional en Mercadeo y Publicidad': 'Mercadeo y Publicidad'}


def clave(texto: str) -> str:
    t = re.sub(r'\([^)]*\)', ' ', texto)
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
    return ' '.join(p for p in re.sub(r'[^a-z0-9]+', ' ', t).split() if p not in ENLACES)


programas, conflictos = {}, []
with open(RAIZ / 'auditoria/fuentes/oferta_academica_por_facultad.csv', encoding='utf-8', newline='') as f:
    for r in csv.DictReader(f):
        nombre = r['Nombre del Programa'].strip()
        facultad = CORREGIR_FACULTAD.get(r['Facultad'].strip(), r['Facultad'].strip())
        if not nombre or not facultad.startswith('Facultad'):
            continue
        programas.setdefault(clave(nombre), set()).add(facultad)
for k, v in programas.items():
    if len(v) > 1:
        conflictos.append((k, sorted(v)))
salida = {'fuente': 'auditoria/fuentes/oferta_academica_por_facultad.csv',
          'programas': {k: sorted(v)[0] for k, v in sorted(programas.items())},
          'alias': {clave(a): clave(b) for a, b in ALIAS.items()}}
destino = RAIZ / 'web/public/data/facultades.json'
destino.write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding='utf-8')
print(len(salida['programas']), 'programas;', len(set(salida['programas'].values())), 'facultades; conflictos:', conflictos)
