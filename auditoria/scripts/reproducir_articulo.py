"""
Paquete de reproducibilidad del artículo: regenera la evidencia y verifica cada cifra publicada contra ella.

Cada resultado del manuscrito tiene un script que lo produce y un archivo de evidencia (auditoria/evidencia_*.json o
Excel). Este script
  --verificar (por defecto): compara las cifras del manuscrito con la evidencia existente, sin recalcular;
  --ejecutar: respalda la evidencia actual en auditoria/_respaldo_<fecha>/, ejecuta los scripts en orden y verifica.
Requiere las 50 matrices en data/raw/FORMATOS RA CICLO UNO RC (no se publican; ver auditoria/REPRODUCIBILIDAD.md).

Uso: python auditoria/scripts/reproducir_articulo.py [--ejecutar]
Salida: auditoria/verificacion_reproducibilidad.json y tabla en consola.
"""
import json
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
A = Path('auditoria')

# Orden de ejecución: resultado del artículo → script que lo produce
PASOS = [
    ('Corpus (Tablas 1 y 7)', 'verificar_corpus.py'),
    ('Etapa 2: núcleos y control con reglas', 'control_reglas_nucleos.py'),
    ('Etapa 4, R1, R8.3: V1 en las 50 matrices', 'asociacion_perfil_50_matrices.py'),
    ('Etapa 4: calibración de V1', 'calibrar_asociacion_perfil.py'),
    ('R3: conformidad estructural (V3)', 'verificar_v3.py'),
    ('R4: trazabilidad (V4)', 'v4_alternativas.py'),
    ('R5: nivel de evidencia (V5)', 'verificar_v5.py'),
    ('R6 y R7', 'contrastes_r6_r7.py'),
    ('R8.1: asignaturas compartidas', 'verificar_r8.py'),
    ('R8.2: tendencias', 'tendencias_r82.py'),
    ('Revisores, comentario 1: validación de V1', 'revisores_validacion_v1.py'),
    ('Revisores, comentarios 3 y 4: V2, R6, R7', 'revisores_v2_r6_r7.py'),
    ('Revisores, comentario 3: diagnósticos de los RA', 'revisores_v3_diagnosticos.py'),
]


def j(nombre):
    return json.load(open(A / nombre, encoding='utf-8'))


def suma_corpus(campo):
    return j('evidencia_corpus.json')['resumen']['tabla_por_nivel']['Total'][campo]


def v5_n2():
    n = j('evidencia_v5.json')['nivel_maximo_por_estrategia']
    return round(100 * (sum(n.values()) - n.get('N1 Implementación', 0)) / sum(n.values()), 1)


# (resultado del manuscrito, archivo, extractor, valor publicado, tolerancia)
CHEQUEOS = [
    ('Matrices', 'evidencia_corpus.json', lambda: suma_corpus('matrices'), 50, 0),
    ('Competencias', 'evidencia_corpus.json', lambda: suma_corpus('competencias'), 222, 0),
    ('RA únicos', 'evidencia_corpus.json', lambda: suma_corpus('ra_unicos'), 338, 0),
    ('Estrategias mesocurriculares', 'evidencia_corpus.json', lambda: suma_corpus('meso_estrategias'), 391, 0),
    ('Registros de asignatura', 'evidencia_corpus.json', lambda: suma_corpus('asignaturas'), 1757, 0),
    ('Núcleos temáticos', 'evidencia_control_nucleos.json', lambda: j('evidencia_control_nucleos.json')['nucleos'], 6684, 0),
    ('Núcleos para revisión (%)', 'evidencia_control_nucleos.json', lambda: j('evidencia_control_nucleos.json')['pct_revisar'], 3.9, 0.05),
    ('Atributos del perfil', 'evidencia_asociacion_50_matrices.json',
     lambda: j('evidencia_asociacion_50_matrices.json')['totales']['Global']['Ítems'], 2574, 0),
    ('V1: sin alineación (%)', 'evidencia_asociacion_50_matrices.json',
     lambda: j('evidencia_asociacion_50_matrices.json')['totales']['Global']['% sin asociación'], 3.8, 0.05),
    ('V1: tres capas (%)', 'evidencia_asociacion_50_matrices.json',
     lambda: j('evidencia_asociacion_50_matrices.json')['totales']['Global']['% tres capas'], 65.7, 0.05),
    ('Calibración V1: acuerdo', 'evidencia_calibracion_asociacion.json',
     lambda: j('evidencia_calibracion_asociacion.json')['global']['Global']['acuerdo'], 0.801, 0.0005),
    ('Calibración V1: κ', 'evidencia_calibracion_asociacion.json',
     lambda: j('evidencia_calibracion_asociacion.json')['global']['Global']['kappa'], 0.441, 0.0005),
    ('V3: RA únicos evaluados', 'evidencia_v3.json', lambda: j('evidencia_v3.json')['ra_unicos'], 338, 0),
    ('V3 (%)', 'evidencia_v3.json', lambda: j('evidencia_v3.json')['V3_global'], 100.0, 0),
    ('V4 (%)', 'evidencia_v4_alternativas.json', lambda: j('evidencia_v4_alternativas.json')['mutuo']['global'], 87.0, 0.05),
    ('V4 sin RA genérico (%)', 'evidencia_v4_alternativas.json',
     lambda: j('evidencia_v4_alternativas.json')['mutuo']['V4_programa'], 98.0, 0.05),
    ('V4: RA sin estrategia', 'evidencia_v4_alternativas.json',
     lambda: j('evidencia_v4_alternativas.json')['mutuo']['sin_estrategia'], 44, 0),
    ('Indicadores de logro', 'evidencia_v5.json', lambda: j('evidencia_v5.json')['indicadores'], 1185, 0),
    ('V5: N2 o superior (%)', 'evidencia_v5.json', v5_n2, 95.4, 0.05),
    ('Evidencia directa N3 (estrategias)', 'evidencia_v5.json', lambda: j('evidencia_v5.json')['V5_oficial']['con_directa'], 3, 0),
    ('R7: H de V4', 'evidencia_r6_r7.json', lambda: j('evidencia_r6_r7.json')['kruskal_49']['V4'][0], 3.86, 0.005),
    ('R6: ρ V1–V4', 'evidencia_r6_r7.json', lambda: j('evidencia_r6_r7.json')['spearman_50']['V1–V4'][0], -0.17, 0.005),
    ('Denominaciones de asignatura', 'evidencia_r8.json', lambda: j('evidencia_r8.json')['denominaciones'], 709, 0),
    ('Homónimas divergentes', 'evidencia_r8.json', lambda: j('evidencia_r8.json')['homonimas']['divergentes'], 15, 0),
    ('Similitud media de homónimas', 'evidencia_r8.json', lambda: j('evidencia_r8.json')['homonimas']['media'], 0.928, 0.0005),
    ('IA: programas', 'evidencia_tendencias_r82.json', lambda: j('evidencia_tendencias_r82.json')['por_tendencia']['T01']['programas'], 30, 0),
    ('IA: asignaturas', 'evidencia_tendencias_r82.json', lambda: j('evidencia_tendencias_r82.json')['por_tendencia']['T01']['asignaturas'], 57, 0),
    ('Revisores: acuerdo fuera de la muestra', 'evidencia_revisores_v1.json',
     lambda: j('evidencia_revisores_v1.json')['lomo']['Global']['acuerdo'], 0.771, 0.0005),
    ('Revisores: κ fuera de la muestra', 'evidencia_revisores_v1.json',
     lambda: j('evidencia_revisores_v1.json')['lomo']['Global']['kappa'], 0.39, 0.005),
    ('Revisores: pares únicos de competencias', 'evidencia_revisores_r.json',
     lambda: j('evidencia_revisores_r.json')['V2_pares_unicos']['pares'], 185, 0),
    ('Revisores: coherencia nivel–verbo (%)', 'evidencia_revisores_v3.json',
     lambda: j('evidencia_revisores_v3.json')['D1_coherencia_nivel_verbo_%'], 96.4, 0.05),
    ('Revisores: RA con producto explícito', 'evidencia_revisores_v3.json',
     lambda: j('evidencia_revisores_v3.json')['D4_tipo_finalidad']['Producto explícito'], 13, 0),
]


def ejecutar():
    respaldo = A / f"_respaldo_{datetime.now():%Y%m%d_%H%M%S}"
    respaldo.mkdir()
    for f in list(A.glob('evidencia_*.json')) + list(A.glob('*.xlsx')):
        shutil.copy2(f, respaldo / f.name)
    print('Evidencia respaldada en', respaldo)
    for resultado, script in PASOS:
        t = time.time()
        r = subprocess.run([sys.executable, str(A / 'scripts' / script)], capture_output=True, text=True, encoding='utf-8')
        print(f"{'OK ' if r.returncode == 0 else 'ERR'} {time.time() - t:6.0f} s  {resultado} ({script})")
        if r.returncode:
            print(r.stderr[-800:])


def verificar():
    filas = []
    for resultado, archivo, f, esperado, tol in CHEQUEOS:
        try:
            obtenido = f()
            estado = 'OK' if abs(float(obtenido) - esperado) <= tol else 'DIFIERE'
        except FileNotFoundError:
            obtenido, estado = None, 'FALTA ARCHIVO'
        except (KeyError, TypeError, IndexError) as e:
            obtenido, estado = None, f'FALTA DATO ({e})'
        filas.append({'resultado': resultado, 'archivo': archivo, 'publicado': esperado, 'evidencia': obtenido, 'estado': estado})
    for x in filas:
        print(f"{x['estado']:<14} {x['resultado']:<45} publicado {x['publicado']!s:<8} evidencia {x['evidencia']!s:<8} ({x['archivo']})")
    ok = sum(x['estado'] == 'OK' for x in filas)
    print(f'\n{ok} de {len(filas)} cifras coinciden con la evidencia.')
    json.dump({'fecha': datetime.now().isoformat(timespec='seconds'), 'python': sys.version.split()[0], 'coinciden': ok,
               'total': len(filas), 'chequeos': filas},
              open(A / 'verificacion_reproducibilidad.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    if '--ejecutar' in sys.argv:
        ejecutar()
    verificar()
