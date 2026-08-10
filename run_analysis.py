"""
Script principal para ejecutar análisis completo de todos los programas.

Uso:
    python run_analysis.py

Cada corrida genera su salida en una subcarpeta con timestamp:
    data/output/YYYYMMDD_HHMMSS/
"""

import os
import sys
os.environ.setdefault('PYTHONIOENCODING', 'utf-8')
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import time
import pandas as pd
import logging
from pathlib import Path
from datetime import datetime

# Agregar src al path
sys.path.append(str(Path(__file__).parent))

from src.extractor import ExcelExtractor
from src.analyzer import CurricularAnalyzer
from src.thematic_detector import ThematicDetector
from src.validator import QualityValidator
from src.report_generator import ReportGenerator
from src.perfil_coverage_analyzer import analizar_cobertura_perfil_completa
from src.shared_subjects_analyzer import detectar_asignaturas_compartidas
from src.topic_modeler import asignar_topicos_a_programas
from src.run_tracker import RunTracker
from config import INPUT_FOLDER, OUTPUT_FOLDER, MESSAGES

# ── Logging ─────────────────────────────────────────────────────────────────
_log_dir = Path(__file__).parent / 'logs'
_log_dir.mkdir(parents=True, exist_ok=True)
_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(_log_dir / f'analisis_{_ts}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def _crear_carpeta_corrida() -> Path:
    """Crea y retorna la carpeta versionada para esta corrida."""
    run_dir = Path(OUTPUT_FOLDER) / _ts
    (run_dir / 'reportes').mkdir(parents=True, exist_ok=True)
    (run_dir / 'matrices').mkdir(parents=True, exist_ok=True)
    (run_dir / 'consolidado').mkdir(parents=True, exist_ok=True)
    logger.info(f"Carpeta de corrida: {run_dir}")
    return run_dir


def print_header():
    """Imprime encabezado del script."""
    print(MESSAGES['BIENVENIDA'])
    print(f"Fecha y hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")


def process_single_program(
    file_path: Path,
    detector: ThematicDetector,
    generator: ReportGenerator,
    run_dir: Path,
) -> dict:
    """
    Procesa un programa individual.

    Args:
        file_path: Ruta al archivo Excel
        detector: Detector de temáticas
        generator: Generador de reportes
        run_dir: Carpeta versionada de esta corrida

    Returns:
        dict con resultados del programa, o None si hubo error
    """
    try:
        logger.info(f"Procesando: {file_path.name}")
        print(f"  [DIR] {file_path.name}...")

        extractor = ExcelExtractor(str(file_path))
        data = extractor.extract_all()

        validation = extractor.validate_structure()
        if not validation['valid']:
            logger.warning(f"Archivo con errores: {file_path.name} — {validation['errors']}")
            print("    [!]  Advertencia: Archivo con errores estructurales")

        analyzer = CurricularAnalyzer(data)
        indicadores = analyzer.generar_reporte_indicadores()

        tematicas = detector.analyze_programa(data)

        validator = QualityValidator()
        validacion = validator.validate_programa_completo(data)

        df_perfil = data.get('perfil_egreso', pd.DataFrame())
        df_micro = data.get('estrategias_micro', pd.DataFrame())
        df_ra = data.get('resultados_aprendizaje', pd.DataFrame())
        cobertura_perfil = analizar_cobertura_perfil_completa(df_perfil, df_micro, df_ra)

        programa_nombre = data['metadata']['programa']
        html_path = run_dir / 'reportes' / f'reporte_{programa_nombre}.html'
        generator.generate_html_report(data, indicadores, str(html_path))
        json_path = run_dir / 'reportes' / f'reporte_{programa_nombre}.json'
        generator.generate_json_report(data, indicadores, tematicas, str(json_path))

        print(f"    [OK] Completado - Score: {indicadores['score_calidad']}/100")
        print(f"       Temáticas: {len(tematicas['tematicas_presentes'])}")
        print(
            f"       Cobertura Perfil: {cobertura_perfil['cobertura_global']}% "
            f"({cobertura_perfil['num_brechas']} brechas)"
        )

        return {
            'data': data,
            'indicadores': indicadores,
            'tematicas': tematicas,
            'validacion': validacion,
            'cobertura_perfil': cobertura_perfil,
        }

    except Exception as e:
        logger.error(f"Error procesando {file_path.name}: {str(e)}", exc_info=True)
        print(f"    [X] Error: {str(e)}")
        return None


def main():
    """Función principal."""
    t_inicio = time.time()
    print_header()

    run_dir = _crear_carpeta_corrida()

    input_folder = Path(INPUT_FOLDER)
    excel_files = list(input_folder.rglob('*.xlsx'))

    if not excel_files:
        print(f"[X] No se encontraron archivos Excel en: {input_folder}")
        return

    print(f"[FOLDER] Encontrados {len(excel_files)} archivos para procesar\n")

    tracker = RunTracker()
    run_id = tracker.iniciar_corrida(str(run_dir), len(excel_files))

    detector = ThematicDetector()
    generator = ReportGenerator()

    print("="*60)
    print("PROCESANDO PROGRAMAS")
    print("="*60 + "\n")

    all_results = []
    errors = 0

    for idx, file_path in enumerate(excel_files, 1):
        print(f"[{idx}/{len(excel_files)}]", end=" ")
        result = process_single_program(file_path, detector, generator, run_dir)
        if result:
            all_results.append(result)
        else:
            errors += 1
        print()

    print("="*60)
    print("GENERANDO REPORTES CONSOLIDADOS")
    print("="*60 + "\n")

    if all_results:
        print("[DATA] Generando matriz de temáticas...")
        all_tematicas = [r['tematicas'] for r in all_results]
        matriz = detector.generate_thematic_matrix(all_tematicas)
        matriz_path = run_dir / 'matrices' / 'matriz_tematicas.xlsx'
        generator.generate_excel_matrix(matriz, str(matriz_path))
        print(f"   [OK] Guardado en: {matriz_path}\n")

        print("[DATA] Generando Excel consolidado de indicadores...")
        all_indicadores = [r['indicadores'] for r in all_results]
        consolidado_path = run_dir / 'consolidado' / 'indicadores_consolidados.xlsx'
        generator.generate_consolidated_excel(all_indicadores, str(consolidado_path))
        print(f"   [OK] Guardado en: {consolidado_path}\n")

        print("[LIST] Generando reporte de temáticas...")
        resumen_tematicas = detector.generate_summary_report(matriz)
        print(resumen_tematicas)

        print("[DATA] Generando Excel maestro...")
        maestro_path = run_dir / 'consolidado' / 'excel_maestro.xlsx'
        generator.generate_excel_maestro(all_results, str(maestro_path))
        print(f"   [OK] Guardado en: {maestro_path}\n")

        print("[LIST] Analizando asignaturas compartidas...")
        micro_all = pd.concat(
            [r['data'].get('estrategias_micro', pd.DataFrame()) for r in all_results],
            ignore_index=True
        )
        if not micro_all.empty and 'Sede' in micro_all.columns and micro_all['Sede'].nunique() > 0:
            shared_result = detectar_asignaturas_compartidas(micro_all)
            r = shared_result['resumen']
            print(
                f"   [OK] {r['total_programas']} programas, "
                f"{r['pares_intra_sede']} pares intra-sede, "
                f"{r['pares_inter_programa']} pares inter-programa\n"
            )
        else:
            print("   [!]  Datos insuficientes para análisis de asignaturas\n")

        print("[ML] Entrenando modelo de tópicos (LDA)...")
        ra_all = pd.concat(
            [r['data'].get('resultados_aprendizaje', pd.DataFrame()) for r in all_results],
            ignore_index=True
        )
        if not ra_all.empty and 'SaberAsociado' in ra_all.columns:
            topicos = asignar_topicos_a_programas(ra_all, n_topics=10)
            if topicos.get('model') is not None:
                print(
                    f"   [OK] {len(topicos['topics'])} tópicos extraídos, "
                    f"{topicos.get('corpus_size', 0)} documentos\n"
                )
            else:
                print("   [!]  Corpus insuficiente para LDA (mín. 5 docs)\n")
        else:
            print("   [!]  No hay datos de SaberAsociado para topic modeling\n")

    duracion = time.time() - t_inicio
    scores = [r['indicadores']['score_calidad'] for r in all_results] if all_results else []
    score_prom = sum(scores) / len(scores) if scores else 0.0

    tracker.finalizar_corrida(run_id, len(all_results), errors, score_prom, duracion)

    print("="*60)
    print("RESUMEN FINAL")
    print("="*60)
    print(f"\n[OK] Programas procesados exitosamente: {len(all_results)}")
    print(f"[X] Programas con errores: {errors}")
    print(f"[DATA] Total de archivos: {len(excel_files)}")
    print(f"\n[FOLDER] Resultados guardados en: {run_dir}")
    print(f"   - Reportes individuales: {run_dir / 'reportes'}")
    print(f"   - Matrices consolidadas: {run_dir / 'matrices'}")
    print(f"   - Datos consolidados: {run_dir / 'consolidado'}")
    if all_results:
        print(f"   - Excel maestro: {run_dir / 'consolidado' / 'excel_maestro.xlsx'}")

    if scores:
        sorted_results = sorted(all_results, key=lambda x: x['indicadores']['score_calidad'], reverse=True)
        print("\n[CHART] ESTADÍSTICAS GENERALES:")
        print(f"   - Score promedio: {score_prom:.1f}/100")
        print(f"   - Score máximo: {max(scores):.1f}/100")
        print(f"   - Score mínimo: {min(scores):.1f}/100")
        print("\n[TOP] TOP 5 PROGRAMAS (por Score de Calidad):")
        for i, res in enumerate(sorted_results[:5], 1):
            prog = res['data']['metadata']['programa']
            sc = res['indicadores']['score_calidad']
            print(f"   {i}. {prog}: {sc}/100")

    print(f"\n[CLOCK] Duración total: {duracion:.0f}s")
    print(f"[*] Análisis completado — corrida ID={run_id}")
    print(f"[LOG] Log guardado en: logs/analisis_{_ts}.log")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[!]  Proceso interrumpido por el usuario")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error fatal: {str(e)}", exc_info=True)
        print(f"\n[X] Error fatal: {str(e)}")
        sys.exit(1)
