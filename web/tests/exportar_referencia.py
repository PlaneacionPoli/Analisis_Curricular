"""Genera la referencia de paridad: ejecuta las funciones REALES de dashboard_tematico.py sobre las matrices
y guarda el consolidado y el resumen por programa en web/tests/referencia.json.

Uso (desde la raíz del repo):
    python web/tests/exportar_referencia.py [carpeta_con_matrices]
"""
import io
import json
import sys
import warnings
from pathlib import Path

warnings.filterwarnings('ignore')
RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))

import pandas as pd  # noqa: E402

import dashboard_tematico as dt  # noqa: E402


class Archivo(io.BytesIO):
    """Imita el UploadedFile de Streamlit (name + seek/read)."""

    def __init__(self, ruta: Path):
        super().__init__(ruta.read_bytes())
        self.name = ruta.name


def resumen(df, totales):
    """Misma lógica que el «Resumen por Programa» de pagina_inicio (sin la parte de Streamlit)."""
    filas = []
    for _, r in df[['Programa', 'Modalidad', 'Sede', 'Nivel']].drop_duplicates().iterrows():
        prog, mod, sede, nivel = r['Programa'], r['Modalidad'], r['Sede'], r['Nivel']
        g = df[(df['Programa'] == prog) & (df['Modalidad'] == mod) & (df['Sede'] == sede) & (df['Nivel'] == nivel)]
        of, claves = None, list(totales)
        if prog in claves:
            of = totales[prog]
        else:
            for k in claves:
                if prog.lower() in k.lower() or k.lower() in prog.lower():
                    of = totales[k]
                    break
                if any(w in k.lower().split() for w in prog.lower().split() if len(w) > 3):
                    of = totales[k]
                    break
        of = of or {}
        total, asig = int(of.get('total', 0)), int(of.get('asignaturas', 0))
        if nivel == 'Posgrado':
            fund, prof = of.get('fundamentacion', 0), of.get('profundizacion', 0)
            if total == 0:
                cp = dt._creditos_por_componente(g)
                total, fund, prof = cp['Total'], cp['Fundamentacion'], cp['Profundizacion']
            fila = {'Cr. Fundamentacion': fund, 'Cr. Profundizacion': prof, 'Suma componentes': fund + prof,
                    'Diferencia': total - (fund + prof)}
        else:
            ins, dis, ele = of.get('institucional', 0), of.get('disciplinar', 0), of.get('electivo', 0)
            if total == 0:
                bl = dt._creditos_por_bloque(g)
                total, ins, dis, ele = bl['Total'], bl['Institucional'], bl['Disciplinar'], bl['Electivo']
            fila = {'B. Institucional': ins, 'B. Disciplinar': dis, 'B. Electivo': ele,
                    'Suma bloques': ins + dis + ele, 'Diferencia': total - (ins + dis + ele)}
        filas.append({'Programa': prog, 'Modalidad': mod, 'Sede': sede, 'Nivel': nivel, 'Asignaturas': asig,
                      'Semestres': dt._contar_semestres_validos(g), 'Cr. Total': total, **{k: int(v) for k, v in fila.items()}})
    return filas


def main():
    carpeta = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / 'data' / 'raw' / '01_FormatosRA_ReformaCurricular'
    archivos = [Archivo(p) for p in sorted(carpeta.glob('FormatoRA*.xlsx'))]
    df, fallidos = dt.procesar_archivos(archivos)
    for a in archivos:
        a.seek(0)
    totales = dt.leer_totales_programa(archivos)
    por_registro = df.groupby(['Matriz', 'Tipo de Saber']).size().reset_index(name='n')
    salida = {
        'carpeta': str(carpeta.name),
        'archivos': [a.name for a in archivos],
        'fallidos': fallidos,
        'registros': int(len(df)),
        'asignaturas_unicas': int(df['Nombre asignatura o modulo'].nunique()),
        'programas': int(df['Programa'].nunique()),
        'por_matriz_tipo': por_registro.to_dict('records'),
        'niveles': df[['Matriz', 'Programa', 'Modalidad', 'Sede', 'Nivel']].drop_duplicates().to_dict('records'),
        'semestres': {str(k): int(v) for k, v in df['Semestre'].value_counts(dropna=False).items()},
        'texto_palabras': int(df['Texto_Completo'].str.split().str.len().sum()),
        'totales': totales,
        'resumen': resumen(df, totales),
    }
    destino = Path(__file__).with_name('referencia.json')
    destino.write_text(json.dumps(salida, ensure_ascii=False, indent=1, default=str), encoding='utf-8')
    print(f'{len(archivos)} archivos, {len(df)} registros, {len(fallidos)} fallidos -> {destino}')


if __name__ == '__main__':
    main()
