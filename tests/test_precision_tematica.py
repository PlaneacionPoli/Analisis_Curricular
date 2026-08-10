"""
Tests de precisión para detección temática vs. golden set.

Estos tests requieren que groundtruth.json tenga al menos un programa
con campo 'etiquetado: true'. Hasta que la investigadora complete las
etiquetas manuales, los tests se marcan como skip automáticamente.

Ejecutar:
    pytest tests/test_precision_tematica.py -v
"""

import json
import sys
import pytest
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

GOLDEN_SET_PATH = Path(__file__).parent / "fixtures" / "golden_set" / "groundtruth.json"
RAW_DATA_PATH = Path(__file__).parent.parent / "data" / "raw" / "FORMATOS RA CICLO UNO RC"

PRECISION_TARGET = 0.80  # Meta: 80% de coincidencia con etiquetas humanas


def load_groundtruth():
    with open(GOLDEN_SET_PATH, encoding="utf-8") as f:
        return json.load(f)


def labeled_programs():
    data = load_groundtruth()
    return [p for p in data["programas"] if p.get("etiquetado") is True]


def requires_labeled_data(func):
    """Decorator: skip si no hay programas etiquetados en groundtruth.json."""
    def wrapper(*args, **kwargs):
        if not labeled_programs():
            pytest.skip(
                "No hay programas etiquetados en groundtruth.json. "
                "Completa las etiquetas manuales para activar estos tests."
            )
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper


@requires_labeled_data
def test_precision_deteccion_tematica():
    """Mide la precision de ThematicDetector contra etiquetas humanas.

    Un resultado se considera correcto si coincide en presencia/ausencia
    (true/false) para cada tematica en cada programa etiquetado.

    La precision global debe ser >= PRECISION_TARGET (80%).
    """
    from src.extractor import ExcelExtractor
    from src.thematic_detector import ThematicDetector

    detector = ThematicDetector()
    programs = labeled_programs()

    total_checks = 0
    correct_checks = 0
    mismatches = []

    for prog in programs:
        archivo = RAW_DATA_PATH / prog["archivo"]
        if not archivo.exists():
            pytest.skip(f"Archivo no encontrado: {archivo}")

        extractor = ExcelExtractor(str(archivo))
        data = extractor.extract_all()
        resultado = detector.analyze_programa(data)
        tematicas_detectadas = set(resultado.get("tematicas_presentes", []))

        for tematica, valor_humano in prog["tematicas_humanas"].items():
            if valor_humano is None:
                continue  # etiqueta pendiente, no contar

            tematica_key = tematica.replace(" ", " ")  # normalización futura
            detectado = tematica_key in tematicas_detectadas

            total_checks += 1
            if detectado == valor_humano:
                correct_checks += 1
            else:
                mismatches.append({
                    "programa": prog["programa"],
                    "tematica": tematica,
                    "humano": valor_humano,
                    "sistema": detectado,
                })

    if total_checks == 0:
        pytest.skip("No hay etiquetas completas en los programas marcados como etiquetados.")

    precision = correct_checks / total_checks

    if mismatches:
        detalle = "\n".join(
            f"  {m['programa']} | {m['tematica']}: humano={m['humano']}, sistema={m['sistema']}"
            for m in mismatches
        )
        print(f"\nDesajustes ({len(mismatches)}/{total_checks}):\n{detalle}")

    assert precision >= PRECISION_TARGET, (
        f"Precision de deteccion tematica: {precision:.1%} "
        f"(requerido >= {PRECISION_TARGET:.0%}). "
        f"Desajustes: {len(mismatches)}/{total_checks}"
    )

    print(f"\nPrecision tematica: {precision:.1%} ({correct_checks}/{total_checks} correctos)")


@requires_labeled_data
def test_precision_cobertura_perfil():
    """Mide la precision de cobertura de perfil vs. estimacion humana.

    Un resultado se considera correcto si |sistema - humano| <= 0.15.
    La precision global debe ser >= PRECISION_TARGET (80%).
    """
    from src.extractor import ExcelExtractor
    from src.perfil_coverage_analyzer import analizar_cobertura_perfil_completa

    TOLERANCIA = 0.15
    programs = [p for p in labeled_programs() if p.get("cobertura_perfil_humana") is not None]

    if not programs:
        pytest.skip("Ningún programa etiquetado tiene cobertura_perfil_humana.")

    total = 0
    correctos = 0
    desajustes = []

    for prog in programs:
        archivo = RAW_DATA_PATH / prog["archivo"]
        if not archivo.exists():
            continue

        extractor = ExcelExtractor(str(archivo))
        data = extractor.extract_all()

        df_perfil = data.get("perfil_egreso")
        df_micro = data.get("estrategias_micro")
        df_ra = data.get("resultados_aprendizaje")

        if df_perfil is None or df_perfil.empty:
            continue

        resultado = analizar_cobertura_perfil_completa(df_perfil, df_micro, df_ra)
        cobertura_sistema = resultado.get("cobertura_global", 0) / 100.0
        cobertura_humana = float(prog["cobertura_perfil_humana"])

        total += 1
        diferencia = abs(cobertura_sistema - cobertura_humana)
        if diferencia <= TOLERANCIA:
            correctos += 1
        else:
            desajustes.append({
                "programa": prog["programa"],
                "humano": f"{cobertura_humana:.2f}",
                "sistema": f"{cobertura_sistema:.2f}",
                "diferencia": f"{diferencia:.2f}",
            })

    if total == 0:
        pytest.skip("No hay programas con cobertura de perfil etiquetada y archivo disponible.")

    precision = correctos / total

    if desajustes:
        detalle = "\n".join(
            f"  {d['programa']}: humano={d['humano']}, sistema={d['sistema']}, diff={d['diferencia']}"
            for d in desajustes
        )
        print(f"\nDesajustes ({len(desajustes)}/{total}):\n{detalle}")

    assert precision >= PRECISION_TARGET, (
        f"Precision de cobertura de perfil: {precision:.1%} "
        f"(requerido >= {PRECISION_TARGET:.0%}, tolerancia ±{TOLERANCIA:.0%}). "
        f"Desajustes: {len(desajustes)}/{total}"
    )

    print(f"\nPrecision cobertura perfil: {precision:.1%} ({correctos}/{total} dentro de tolerancia)")
