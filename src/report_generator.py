"""
Módulo de generación de reportes.

Genera reportes en múltiples formatos:
- HTML (individual y consolidado)
- Excel (matrices y tablas)
- PDF (requiere weasyprint)
- JSON (datos estructurados)
"""

import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import pandas as pd
import numpy as np
import json

import sys
sys.path.append(str(Path(__file__).parent.parent))

from config import OUTPUT_FOLDER, TEMPLATES_DIR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def convert_to_native_types(obj: Any) -> Any:
    """
    Convierte tipos numpy a tipos nativos de Python para serialización JSON.

    Args:
        obj: Objeto a convertir

    Returns:
        Objeto con tipos nativos de Python
    """
    if isinstance(obj, dict):
        return {k: convert_to_native_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_native_types(item) for item in obj]
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return obj


class ReportGenerator:
    """
    Generador de reportes en múltiples formatos.

    Example:
        >>> generator = ReportGenerator()
        >>> generator.generate_html_report(data, indicadores, 'reporte.html')
    """

    def __init__(self, output_folder: Optional[str] = None,
                 templates_folder: Optional[str] = None):
        """
        Inicializa el generador de reportes.

        Args:
            output_folder: Carpeta de salida para reportes
            templates_folder: Carpeta con templates HTML
        """
        self.output_folder = Path(output_folder or OUTPUT_FOLDER)
        self.templates_folder = Path(templates_folder or TEMPLATES_DIR)
        self.output_folder.mkdir(parents=True, exist_ok=True)

        logger.info(f"ReportGenerator inicializado. Output: {self.output_folder}")

    def generate_html_report(self, programa_data: Dict,
                            indicadores: Dict,
                            output_path: str,
                            cobertura_perfil: Optional[Dict] = None) -> str:
        """
        Genera reporte HTML individual por programa.

        Args:
            programa_data (Dict): Datos del programa
            indicadores (Dict): Indicadores calculados
            output_path (str): Ruta de salida del HTML

        Returns:
            str: Ruta del archivo generado
        """
        programa = programa_data['metadata']['programa']
        logger.info(f"Generando reporte HTML para {programa}")

        # Construir HTML
        html_content = f"""
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte Curricular - {programa}</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 40px;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #34495e;
            margin-top: 30px;
        }}
        .metric {{
            display: inline-block;
            background-color: #ecf0f1;
            padding: 15px 25px;
            margin: 10px;
            border-radius: 5px;
            min-width: 200px;
        }}
        .metric-value {{
            font-size: 2em;
            font-weight: bold;
            color: #3498db;
        }}
        .metric-label {{
            font-size: 0.9em;
            color: #7f8c8d;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background-color: #3498db;
            color: white;
        }}
        .progress-bar {{
            background-color: #ecf0f1;
            border-radius: 5px;
            height: 25px;
            position: relative;
            margin: 10px 0;
        }}
        .progress-fill {{
            background-color: #3498db;
            height: 100%;
            border-radius: 5px;
            display: flex;
            align-items: center;
            padding-left: 10px;
            color: white;
            font-weight: bold;
        }}
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #7f8c8d;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Reporte de Análisis Curricular</h1>
        <h2>{programa}</h2>
        <p><strong>Fecha de generación:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>

        <h2>🎯 Score General de Calidad</h2>
        <div class="metric">
            <div class="metric-value">{indicadores['score_calidad']}/100</div>
            <div class="metric-label">Score de Calidad</div>
        </div>

        <h2>📈 Resumen del Programa</h2>
        <div class="metric">
            <div class="metric-value">{indicadores['resumen']['total_competencias']}</div>
            <div class="metric-label">Competencias</div>
        </div>
        <div class="metric">
            <div class="metric-value">{indicadores['resumen']['total_ra']}</div>
            <div class="metric-label">Resultados de Aprendizaje</div>
        </div>
        <div class="metric">
            <div class="metric-value">{indicadores['resumen']['total_estrategias_micro']}</div>
            <div class="metric-label">Estrategias Microcurriculares</div>
        </div>

        <h2>📊 Balance de Tipos de Saber</h2>
        <p><strong>Saber:</strong> {indicadores['balance_tipo_saber']['Saber']}%</p>
        <div class="progress-bar">
            <div class="progress-fill" style="width: {indicadores['balance_tipo_saber']['Saber']}%">
                {indicadores['balance_tipo_saber']['Saber']}%
            </div>
        </div>

        <p><strong>SaberHacer:</strong> {indicadores['balance_tipo_saber']['SaberHacer']}%</p>
        <div class="progress-bar">
            <div class="progress-fill" style="width: {indicadores['balance_tipo_saber']['SaberHacer']}%">
                {indicadores['balance_tipo_saber']['SaberHacer']}%
            </div>
        </div>

        <p><strong>SaberSer:</strong> {indicadores['balance_tipo_saber']['SaberSer']}%</p>
        <div class="progress-bar">
            <div class="progress-fill" style="width: {indicadores['balance_tipo_saber']['SaberSer']}%">
                {indicadores['balance_tipo_saber']['SaberSer']}%
            </div>
        </div>

        <h2>🧠 Complejidad Cognitiva (Taxonomía de Bloom)</h2>
        <p><strong>Básico:</strong> {indicadores['complejidad_cognitiva']['Básico']}%</p>
        <p><strong>Intermedio:</strong> {indicadores['complejidad_cognitiva']['Intermedio']}%</p>
        <p><strong>Avanzado:</strong> {indicadores['complejidad_cognitiva']['Avanzado']}%</p>
        <p><strong>Índice de Complejidad:</strong> {indicadores['complejidad_cognitiva']['indice_complejidad']}/100</p>

        <h2>📌 Competencias del Programa</h2>
        <table>
            <thead>
                <tr>
                    <th>No.</th>
                    <th>Redacción Competencia</th>
                    <th>Tipo</th>
                </tr>
            </thead>
            <tbody>
"""
        # Agregar competencias
        for _, row in programa_data['competencias'].iterrows():
            html_content += f"""
                <tr>
                    <td>{row.get('No.', '')}</td>
                    <td>{row.get('Redacción competencia', '')}</td>
                    <td>{row.get('Tipo de competencia', '')}</td>
                </tr>
"""

        html_content += """
            </tbody>
        </table>

        <h2>📋 Cobertura del Perfil de Egreso</h2>
""" if cobertura_perfil else ''

        if cobertura_perfil:
            html_content += f"""
        <p><strong>Cobertura Global:</strong> {cobertura_perfil.get('cobertura_global', 0)}%</p>
        <p><strong>Brechas:</strong> {cobertura_perfil.get('num_brechas', 0)}</p>
        <p><strong>Corpus:</strong> {cobertura_perfil.get('corpus_size', 0)} documentos</p>
        <p><strong>Recomendaciones:</strong></p>
        <ul>
"""
            for rec in cobertura_perfil.get('recomendaciones', []):
                html_content += f'            <li>{rec}</li>\n'
            html_content += '        </ul>\n'
            elementos = cobertura_perfil.get('elementos', [])
            if elementos:
                html_content += """
        <table>
            <thead><tr>
                <th>Campo</th><th>Elemento</th><th>Score</th><th>Estado</th><th>Asignatura trazable</th>
            </tr></thead><tbody>
"""
                for e in elementos[:50]:
                    traz = e.get('asignatura_trazable', '') or '—'
                    html_content += (
                        f"            <tr><td>{e.get('campo', '')}</td>"
                        f"<td>{e.get('elemento', '')[:80]}</td>"
                        f"<td>{e.get('score', 0):.2%}</td>"
                        f"<td>{e.get('clasificacion', '')}</td>"
                        f"<td>{traz[:100]}</td></tr>\n"
                    )
                html_content += '        </tbody></table>\n'

        html_content += """
        <div class="footer">
            <p>Generado automáticamente por Sistema de Análisis Microcurricular</p>
        </div>
    </div>
</body>
</html>
"""

        # Guardar archivo
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

        logger.info(f"Reporte HTML generado: {output_path}")
        return str(output_path)

    def generate_excel_matrix(self, matriz: pd.DataFrame, output_path: str) -> str:
        """
        Genera matriz Excel de Programas × Temáticas.

        Args:
            matriz (pd.DataFrame): Matriz de temáticas
            output_path (str): Ruta de salida del Excel

        Returns:
            str: Ruta del archivo generado
        """
        logger.info("Generando matriz Excel")

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Guardar con formato
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            matriz.to_excel(writer, sheet_name='Matriz Temáticas', index=False)

            # Obtener worksheet para aplicar formato
            worksheet = writer.sheets['Matriz Temáticas']

            # Auto-ajustar anchos de columna
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except Exception:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column_letter].width = adjusted_width

        logger.info(f"Matriz Excel generada: {output_path}")
        return str(output_path)

    def generate_json_report(self, programa_data: Dict,
                            indicadores: Dict,
                            tematicas: Dict,
                            output_path: str,
                            cobertura_perfil: Optional[Dict] = None) -> str:
        """
        Genera reporte en formato JSON.

        Args:
            programa_data (Dict): Datos del programa
            indicadores (Dict): Indicadores calculados
            tematicas (Dict): Temáticas detectadas
            output_path (str): Ruta de salida del JSON

        Returns:
            str: Ruta del archivo generado
        """
        logger.info("Generando reporte JSON")

        # Construir estructura JSON
        reporte_json = {
            'programa': programa_data['metadata']['programa'],
            'fecha_generacion': datetime.now().isoformat(),
            'archivo_origen': programa_data['metadata']['archivo'],
            'indicadores': indicadores,
            'tematicas': {
                'presentes': tematicas.get('tematicas_presentes', []),
                'num_tematicas': tematicas.get('num_tematicas', 0),
                'resumen': tematicas.get('resumen', {})
            },
            'resumen': {
                'total_competencias': len(programa_data['competencias']),
                'total_ra': len(programa_data['resultados_aprendizaje']),
                'total_estrategias_micro': len(programa_data.get('estrategias_micro', []))
            }
        }

        if cobertura_perfil:
            reporte_json['cobertura_perfil'] = {
                'cobertura_global': cobertura_perfil.get('cobertura_global', 0),
                'num_brechas': cobertura_perfil.get('num_brechas', 0),
                'total_elementos': cobertura_perfil.get('total_elementos', 0),
                'recomendaciones': cobertura_perfil.get('recomendaciones', [])
            }

        # Convertir tipos numpy a tipos nativos de Python
        reporte_json = convert_to_native_types(reporte_json)

        # Guardar JSON
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(reporte_json, f, ensure_ascii=False, indent=2)

        logger.info(f"Reporte JSON generado: {output_path}")
        return str(output_path)

    def generate_consolidated_excel(self, all_reportes: List[Dict],
                                    output_path: str) -> str:
        """
        Genera Excel consolidado con todos los programas.

        Args:
            all_reportes (List[Dict]): Lista de reportes de todos los programas
            output_path (str): Ruta de salida del Excel

        Returns:
            str: Ruta del archivo generado
        """
        logger.info(f"Generando Excel consolidado con {len(all_reportes)} programas")

        # Crear DataFrame consolidado
        rows = []
        for reporte in all_reportes:
            row = {
                'Programa': reporte['programa'],
                'Score_Calidad': reporte['score_calidad'],
                'Total_Competencias': reporte['resumen']['total_competencias'],
                'Total_RA': reporte['resumen']['total_ra'],
                'Saber_%': reporte['balance_tipo_saber']['Saber'],
                'SaberHacer_%': reporte['balance_tipo_saber']['SaberHacer'],
                'SaberSer_%': reporte['balance_tipo_saber']['SaberSer'],
                'Complejidad_Basico_%': reporte['complejidad_cognitiva']['Básico'],
                'Complejidad_Intermedio_%': reporte['complejidad_cognitiva']['Intermedio'],
                'Complejidad_Avanzado_%': reporte['complejidad_cognitiva']['Avanzado'],
                'Indice_Complejidad': reporte['complejidad_cognitiva']['indice_complejidad'],
                'Completitud_%': reporte['completitud']['completitud_total']
            }
            rows.append(row)

        df_consolidado = pd.DataFrame(rows)

        # Guardar en Excel
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            df_consolidado.to_excel(writer, sheet_name='Indicadores Consolidados', index=False)

        logger.info(f"Excel consolidado generado: {output_path}")
        return str(output_path)


    def generate_excel_maestro(
        self,
        all_results: List[Dict],
        output_path: str
    ) -> str:
        """
        Genera Excel maestro consolidado con 15 hojas de análisis.

        Args:
            all_results: Lista de dicts con data, indicadores, tematicas,
                        validacion, cobertura_perfil (salida de process_single_program)
            output_path: Ruta de salida del Excel

        Returns:
            str: Ruta del archivo generado
        """
        logger.info(f"Generando Excel maestro con {len(all_results)} programas")

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # 01_Resumen_Ejecutivo
            rows_resumen = []
            for r in all_results:
                meta = r['data'].get('metadata', {})
                ind = r.get('indicadores', {})
                cob = r.get('cobertura_perfil', {})
                rows_resumen.append({
                    'Programa': meta.get('programa', ''),
                    'Sede': meta.get('sede', ''),
                    'Modalidad': meta.get('modalidad', ''),
                    'Score_Calidad': ind.get('score_calidad', 0),
                    'Cobertura_Perfil': cob.get('cobertura_global', 0),
                    'Brechas_Perfil': cob.get('num_brechas', 0),
                    'Competencias': ind.get('resumen', {}).get('total_competencias', 0),
                    'RA': ind.get('resumen', {}).get('total_ra', 0),
                    'Estrategias_Micro': ind.get('resumen', {}).get('total_estrategias_micro', 0)
                })
            pd.DataFrame(rows_resumen).to_excel(
                writer, sheet_name='01_Resumen_Ejecutivo', index=False
            )

            # 02_Competencias
            competencias_list = []
            for r in all_results:
                df = r['data'].get('competencias', pd.DataFrame())
                if not df.empty:
                    competencias_list.append(df)
            if competencias_list:
                pd.concat(competencias_list, ignore_index=True).to_excel(
                    writer, sheet_name='02_Competencias', index=False
                )

            # 03_RA_Completo
            ra_list = []
            for r in all_results:
                df = r['data'].get('resultados_aprendizaje', pd.DataFrame())
                if not df.empty:
                    ra_list.append(df)
            if ra_list:
                pd.concat(ra_list, ignore_index=True).to_excel(
                    writer, sheet_name='03_RA_Completo', index=False
                )

            # 04_Nucleos_Validos + 05_Nucleos_Rechazados
            # (se procesa una sola vez para ambas hojas)
            nucleos_cache = {}
            for r in all_results:
                meta = r['data'].get('metadata', {})
                df_micro = r['data'].get('estrategias_micro', pd.DataFrame())
                prog = meta.get('programa', '')
                if not df_micro.empty:
                    try:
                        from src.nucleos_cleaner import filtrar_nucleos_dataframe
                        df_filt = filtrar_nucleos_dataframe(df_micro)
                        nucleos_cache[prog] = df_filt
                    except Exception as e:
                        logger.warning(f"Error filtrando núcleos: {e}")

            nucleos_data = []
            rechazados_data = []
            for prog, df_filt in nucleos_cache.items():
                for _, row in df_filt.iterrows():
                    for nuc in row.get('nucleos_validos', []):
                        score = row.get('nucleos_scores', {}).get(nuc, 0)
                        nucleos_data.append({
                            'Programa': prog, 'Nucleo': nuc,
                            'Score_Academico': score
                        })
                    for rej in row.get('nucleos_rechazados', []):
                        rechazados_data.append({
                            'Programa': prog,
                            'Nucleo': rej.get('texto', ''),
                            'Razon_Rechazo': rej.get('razon', '')
                        })
            if nucleos_data:
                pd.DataFrame(nucleos_data).to_excel(
                    writer, sheet_name='04_Nucleos_Validos', index=False
                )
            if rechazados_data:
                pd.DataFrame(rechazados_data).to_excel(
                    writer, sheet_name='05_Nucleos_Rechazados', index=False
                )

            # 06_Cobertura_Perfil_Egreso
            cobertura_rows = []
            cobertura_campo_rows = []
            for r in all_results:
                cob = r.get('cobertura_perfil', {})
                for elem in cob.get('elementos', []):
                    cobertura_rows.append({
                        'Programa': cob.get('programa', ''),
                        'Campo': elem.get('campo', ''),
                        'Elemento': elem.get('elemento', ''),
                        'Score': elem.get('score', 0),
                        'Umbral': elem.get('umbral', ''),
                        'Clasificacion': elem.get('clasificacion', ''),
                        'Asignatura_Trazable': elem.get('asignatura_trazable', ''),
                        'Doc_Trazable': elem.get('doc_trazable', ''),
                    })
                for campo, pct in cob.get('cobertura_por_campo', {}).items():
                    cobertura_campo_rows.append({
                        'Programa': cob.get('programa', ''),
                        'Campo': campo,
                        'Cobertura_Campo_Pct': pct,
                    })
            if cobertura_rows:
                pd.DataFrame(cobertura_rows).to_excel(
                    writer, sheet_name='06_Cobertura_Perfil_Egreso', index=False
                )
            if cobertura_campo_rows:
                pd.DataFrame(cobertura_campo_rows).to_excel(
                    writer, sheet_name='06b_Cobertura_Por_Campo', index=False
                )

            # 07_Brechas_Perfil
            brechas_rows = []
            for r in all_results:
                cob = r.get('cobertura_perfil', {})
                for b in cob.get('brechas', []):
                    brechas_rows.append({
                        'Programa': cob.get('programa', ''),
                        'Campo': b.get('campo', ''),
                        'Elemento': b.get('elemento', ''),
                        'Score': b.get('score', 0)
                    })
            if brechas_rows:
                pd.DataFrame(brechas_rows).to_excel(
                    writer, sheet_name='07_Brechas_Perfil', index=False
                )

            # 08_Divergencia_Inter_Sede
            micro_data_list = [r['data'].get('estrategias_micro', pd.DataFrame())
                               for r in all_results]
            micro_all = pd.concat(
                [df for df in micro_data_list if not df.empty], ignore_index=True
            ) if any(not df.empty for df in micro_data_list) else pd.DataFrame()
            if not micro_all.empty:
                try:
                    from src.shared_subjects_analyzer import comparar_intra_sede
                    df_intra = comparar_intra_sede(micro_all)
                    if not df_intra.empty:
                        df_intra.to_excel(
                            writer, sheet_name='08_Divergencia_Inter_Sede', index=False
                        )
                except Exception as e:
                    logger.warning(f"Error generando divergencia inter-sede: {e}")

            # 09_Asignaturas_Identicas
            if not micro_all.empty:
                try:
                    from src.shared_subjects_analyzer import detectar_asignaturas_identicas
                    df_id = detectar_asignaturas_identicas(micro_all)
                    if not df_id.empty:
                        df_id.to_excel(
                            writer, sheet_name='09_Asignaturas_Identicas', index=False
                        )
                except Exception as e:
                    logger.warning(f"Error detectando asignaturas idénticas: {e}")

            # 10_Asignaturas_Similares
            if not micro_all.empty:
                try:
                    from src.shared_subjects_analyzer import (
                        comparar_inter_programa, generar_recomendaciones
                    )
                    df_inter = comparar_inter_programa(micro_all)
                    if not df_inter.empty:
                        df_inter_rec = generar_recomendaciones(df_inter)
                        df_inter_rec.to_excel(
                            writer, sheet_name='10_Asignaturas_Similares', index=False
                        )
                except Exception as e:
                    logger.warning(f"Error detectando asignaturas similares: {e}")

            # 11_Bloques_Curriculares
            bloques_rows = []
            for r in all_results:
                meta = r['data'].get('metadata', {})
                df_micro = r['data'].get('estrategias_micro', pd.DataFrame())
                if not df_micro.empty:
                    for col in ['B.Institucional', 'B.Disciplinar', 'B.Electivo']:
                        if col in df_micro.columns:
                            conteo = df_micro[col].apply(
                                lambda x: str(x).strip().lower() in ('x', 'si', 's', '1', 'true')
                                if pd.notna(x) else False
                            ).sum()
                            bloques_rows.append({
                                'Programa': meta.get('programa', ''),
                                'Bloque': col,
                                'Asignaturas': conteo
                            })
            if bloques_rows:
                pd.DataFrame(bloques_rows).to_excel(
                    writer, sheet_name='11_Bloques_Curriculares', index=False
                )

            # 12_Carga_Horaria
            carga_rows = []
            for r in all_results:
                meta = r['data'].get('metadata', {})
                df_micro = r['data'].get('estrategias_micro', pd.DataFrame())
                if not df_micro.empty:
                    semestre_col = None
                    htd_col = None
                    hti_col = None
                    for c in df_micro.columns:
                        cn = c.lower().replace('ó', 'o').replace('í', 'i')
                        if 'semestre' in cn:
                            semestre_col = c
                        elif 'trabajo directo' in cn:
                            htd_col = c
                        elif 'trabajo independiente' in cn:
                            hti_col = c
                    if semestre_col and (htd_col or hti_col):
                        for _, row in df_micro.iterrows():
                            sem = row.get(semestre_col, '')
                            htd = pd.to_numeric(row.get(htd_col, 0), errors='coerce') if htd_col else 0
                            hti = pd.to_numeric(row.get(hti_col, 0), errors='coerce') if hti_col else 0
                            try:
                                sem_int = int(float(sem)) if pd.notna(sem) else ''
                            except (ValueError, TypeError):
                                sem_int = ''
                            carga_rows.append({
                                'Programa': meta.get('programa', ''),
                                'Semestre': sem_int,
                                'HTD': htd if pd.notna(htd) else 0,
                                'HTI': hti if pd.notna(hti) else 0
                            })
            if carga_rows:
                pd.DataFrame(carga_rows).to_excel(
                    writer, sheet_name='12_Carga_Horaria', index=False
                )

            # 13_Bloom_Distribucion
            bloom_rows = []
            for r in all_results:
                meta = r['data'].get('metadata', {})
                ind = r.get('indicadores', {})
                bloom = ind.get('complejidad_cognitiva', {})
                bloom_rows.append({
                    'Programa': meta.get('programa', ''),
                    'Basico_%': bloom.get('Básico', 0),
                    'Intermedio_%': bloom.get('Intermedio', 0),
                    'Avanzado_%': bloom.get('Avanzado', 0),
                    'Nivel_Promedio': bloom.get('nivel_promedio', 0),
                    'Indice_Complejidad': bloom.get('indice_complejidad', 0)
                })
            if bloom_rows:
                pd.DataFrame(bloom_rows).to_excel(
                    writer, sheet_name='13_Bloom_Distribucion', index=False
                )

            # 14_Tematicas_Emergentes
            tematicas_rows = []
            for r in all_results:
                meta = r['data'].get('metadata', {})
                tem = r.get('tematicas', {})
                for t in tem.get('tematicas_presentes', []):
                    tematicas_rows.append({
                        'Programa': meta.get('programa', ''),
                        'Tematica': t
                    })
            if tematicas_rows:
                pd.DataFrame(tematicas_rows).to_excel(
                    writer, sheet_name='14_Tematicas_Emergentes', index=False
                )

            # 15_Alertas_y_Recomendaciones
            alertas_rows = []
            for r in all_results:
                meta = r['data'].get('metadata', {})
                cob = r.get('cobertura_perfil', {})
                ind = r.get('indicadores', {})
                alertas = []
                if cob.get('cobertura_global', 100) < 40:
                    alertas.append(f"Cobertura perfil crítica: {cob['cobertura_global']}%")
                if ind.get('score_calidad', 100) < 50:
                    alertas.append(f"Score calidad bajo: {ind['score_calidad']}/100")
                if cob.get('num_brechas', 0) > 5:
                    alertas.append(f"{cob['num_brechas']} brechas en perfil de egreso")
                for rec in cob.get('recomendaciones', []):
                    alertas.append(rec)
                for a in alertas:
                    alertas_rows.append({
                        'Programa': meta.get('programa', ''),
                        'Alerta': a,
                        'Tipo': 'RECOMENDACION' if 'recomendaci' in a.lower() else 'ALERTA'
                    })
            if alertas_rows:
                pd.DataFrame(alertas_rows).to_excel(
                    writer, sheet_name='15_Alertas_y_Recomendaciones', index=False
                )

        logger.info(f"Excel maestro generado: {output_path}")
        return str(output_path)


if __name__ == '__main__':
    print("╔═══════════════════════════════════════════════════════════╗")
    print("║  GENERADOR DE REPORTES                                   ║")
    print("╚═══════════════════════════════════════════════════════════╝\n")

    print("Para usar el generador:")
    print("""
from src.extractor import ExcelExtractor
from src.analyzer import CurricularAnalyzer
from src.report_generator import ReportGenerator

# Extraer y analizar
extractor = ExcelExtractor('archivo.xlsx')
data = extractor.extract_all()
analyzer = CurricularAnalyzer(data)
indicadores = analyzer.generar_reporte_indicadores()

# Generar reportes
generator = ReportGenerator()
generator.generate_html_report(data, indicadores, 'reporte.html')
generator.generate_json_report(data, indicadores, {}, 'reporte.json')
    """)
