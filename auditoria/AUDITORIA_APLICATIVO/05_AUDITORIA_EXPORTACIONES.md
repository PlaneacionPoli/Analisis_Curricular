# Entregable 5. Auditoría de exportaciones

**Limitación.** Los PDF y Excel se auditaron por su código (`src/informes_pdf.py`, bloques `pd.ExcelWriter` y `openpyxl` de `dashboard_tematico.py`) y, para los archivos de `data/output/`, abriéndolos. **No se generó ni se inspeccionó visualmente ningún PDF del aplicativo**: su construcción depende de la sesión de Streamlit y del cálculo completo del perfil (varios minutos). Lo que se dice de legibilidad es, por tanto, inferido del código.

Se distinguen cuatro categorías: **fuente** (matrices .xlsx), **intermedio** (`data/processed/`), **resultado procesado** (`data/output/`) y **exportado al usuario** (botones de descarga).

---

## 1. Archivos exportados desde el aplicativo

### EXP-F1. `informe_general_microcurricular.pdf`

| Aspecto | Hallazgo |
|---|---|
| Finalidad | Resumen para el comité del conjunto cargado y filtrado |
| Estructura | Portada (logo, título, **alcance de filtros**, fecha) · 5 KPIs · Lectura rápida · Coherencia V1–V5 (5 barras + barras apiladas de la valoración) · Matrices que requieren atención (tabla de 10 columnas con semáforo) · Taxonomías de los RA (barras de contraste + tabla por programa) · Hallazgos transversales · Presencia de tendencias (tabla) · Perfil por programa (Saber/SaberHacer/SaberSer y n.º de tendencias) · Archivos no evaluados · Nota metodológica |
| Gráficos | Solo barras dibujadas con primitivas de fpdf2; **ninguna figura del artículo** (ruta de alineación, radar, tendencias) |
| Fortalezas | Narrativa en orden de decisión; separa resultado, estado y nota de método; declara el alcance de los filtros; pie «Propuesta para validar por el comité» |
| Redundancia con la pantalla | Alta: repite KPIs, V1–V5, valoración, tabla de atención y tendencias del Resumen Ejecutivo (es su propósito) |
| Información que **no** está en pantalla | Tabla de taxonomías por programa en una sola vista; archivos no evaluados con causa |
| Problemas | (a) «Perfil por programa» usa tipo de saber del Paso 5 (H4). (b) No incluye ningún hallazgo del bloque R8 (homónimas divergentes, pares de homologación, tópicos, amplitud/profundidad de tendencias). (c) Sin versión ni huella de la configuración del método del perfil, aunque V1 depende de ella. (d) Helvetica latin‑1: se sustituyen caracteres (κ→«kappa», «≥»→«>=») |
| Utilidad | **Alta** para el comité curricular; **limitada** para alguien que busque los hallazgos del artículo |

### EXP-F2. `informe_{programa}.pdf` (×39) y ZIP

| Aspecto | Hallazgo |
|---|---|
| Estructura | Portada + KPIs · Lectura rápida por matriz (cumple N de M criterios) · Valoración por criterios por matriz (tabla Criterio/Resultado/Estado/Mediana) · **Acciones sugeridas** por criterio no cumplido · Distribución del tipo de saber (programa vs mediana, diferencia en pp) · Tendencias presentes/sin presencia (listas) · Taxonomías (tabla por matriz, barras de contraste, RA a revisar) · **Anexo: elementos a revisar** (atributos sin alineación, RA no evaluables, RA sin estrategia, estrategias incompletas) |
| Fortalezas | Es el entregable más **accionable**: convierte indicadores en listas nominales y recomendaciones concretas; cada matriz se identifica con «programa – modalidad – sede». Coincide con la tesis del artículo («el producto útil no es el indicador agregado, sino el listado nominal») |
| Problemas | (a) Las «acciones sugeridas» son genéricas por criterio (plantillas de `recomendaciones_matriz`): no reconocen causas distintas (p. ej. el RA genérico institucional explica 38 de los 44 RA sin estrategia; una acción por matriz no lo distingue de un RA de programa). (b) El tipo de saber sigue siendo del Paso 5. (c) Sin las asignaturas homónimas divergentes o los pares de homologación **de ese programa**, que son el otro listado accionable del artículo |
| Utilidad | **Alta** |

### EXP-F3. `indicadores_v1_v5.xlsx`

| Hoja | Granularidad | Observación |
|---|---|---|
| Por_matriz | 50 filas × 17 columnas | V1 %, V2, verbos repetidos, V3, V4, RA sin estrategia, V5, evidencia directa, niveles |
| RA | 1 fila por RA único (338) | clase genérica/programa, V3, motivo, V4, estrategias vinculadas |
| Estrategias | 1 fila por estrategia (391) | indicadores, instrumento, nivel máximo, V5 |
| Indicadores_P4 | 1 fila por indicador (1.185) | texto y nivel |
| Spearman / Kruskal | pares y variables | base de R6 y R7 |

Fortalezas: distingue registros individuales de resultados derivados (cada hoja con una sola granularidad) y conserva identificadores (`matriz`). **Falta:** hoja de definiciones de campos y unidades; versión de código y huella de la configuración (la de perfil sí la lleva en EXP-F4); la hoja `Estrategias` descarta la columna `niveles`. Coincide con el Word en V2–V5. Utilidad **alta** para verificar y reutilizar.

### EXP-F4. `asociacion_perfil.xlsx`

Hojas: Indicadores (por matriz), Atributos (2.574), Evidencia (detalle atributo × capa con texto de respaldo) y **Método** (versión, huella SHA‑256 de la configuración, parámetros y huella de cada archivo cargado). Es el **mejor ejemplo de trazabilidad** del aplicativo y debería replicarse en los demás Excel. Utilidad **alta**.

### EXP-F5. `taxonomias_contraste.xlsx`

Hojas: Contraste (338 RA con taxonomía, dominio, nivel, verbo, lectura de la base y estado) y Por programa. Problemas: (a) la columna «Tipo de saber» hereda la capitalización inconsistente (`SaberHacer`/`Saberhacer`, `SaberSer`/`Saberser`; H5), que dividiría una tabla dinámica en cinco categorías; (b) sin hoja de método (versión de la base de verbos de 646 entradas). Utilidad **media**; el contraste no está reportado en el artículo (se recomienda validarlo antes de difundirlo).

### EXP-F6. `listado_{tendencia}.xlsx`

Informe con formato (portada azul, filas separadoras por programa, altura de fila según el fragmento) con hojas Programas y Asignaturas (programa, asignatura, keywords, campos y **fragmento de texto** que activó la tendencia). Fortaleza: la evidencia textual está a un clic. Limitaciones: un archivo por tendencia; filas combinadas e insertadas (no son datos tabulares para filtrar); respeta los filtros globales pero no lo declara en el archivo; no distingue asignatura propia de **núcleo común institucional** (la distinción central de R8.2). Utilidad **alta** para el comité, **baja** para analizar.

### EXP-F7. `datos_filtrados.csv`

Todas las columnas del consolidado (incluye `_bloque_inicio`, `Texto_Completo`, `Matriz`). Sin diccionario de datos. Utilidad: operativa. Riesgo: quien cuente filas obtiene 5.959 «registros» (3 por asignatura por construcción) y no los 1.616 del artículo.

### EXP-F8. `config_asociacion_perfil.json`, `config_tendencias.json`

Configuración reproducible del método del perfil (parámetros, 103 sinónimos, validación) y de las 15 tendencias (la **regla de asignación no se exporta con la interfaz**, solo vive en el archivo base). Utilidad **alta** para la reproducibilidad (P6 del artículo).

---

## 2. Archivos de `data/output/` (no los genera el aplicativo)

| Archivo | Contenido | Fecha | Estado frente al Word vigente |
|---|---|---|---|
| `consolidado/excel_maestro.xlsx` | 15 hojas (resumen, competencias, RA, núcleos válidos/rechazados, cobertura de perfil con TF‑IDF+BM25, divergencia inter‑sede, bloques, carga horaria, Bloom, temáticas, alertas) | 2026‑06‑01 | **Obsoleto**: usa núcleos rechazados y cobertura TF‑IDF, métodos que el artículo reemplazó |
| `consolidado/indicadores_consolidados.xlsx` | 1 hoja | 2026‑06‑01 | Obsoleto |
| `anexos_accionables.xlsx` | 7 hojas (divergentes 46, homologación 302, errores de denominación 32, brechas del perfil 155, tendencias, tópicos LDA de 10, compartidas 168) | 2026‑08‑03 | **Obsoleto**: el Word reporta 15 divergentes, 189 candidatos, 14 variantes y 98 atributos sin alineación |
| `recalculo_2026.xlsx` | Variables V1–V5, consistencia, tendencias, tópicos, brechas | 2026‑08‑10 | Obsoleto (V1 constante) |
| `fig1…fig12_*.png` | 12 figuras del manuscrito anterior | jun–ago 2026 | Parcialmente reemplazadas por `auditoria/figuras/` |
| `reportes/reporte_{programa}.html/.json` (94 archivos) | Informe navegable por programa | 2026‑05‑31 | Obsoleto: sin valoración por criterios (D26) |

**Riesgo de interpretación:** la carpeta `data/output/` convive con resultados vigentes y nadie puede distinguir a simple vista cuáles lo son. Los siete listados que el artículo promete como anexo (Discusión 4.4) **no se generan hoy desde el aplicativo ni desde un script que coincida con las cifras vigentes**.

---

## 3. Distribución funcional recomendada (pantalla · PDF · Excel)

| Información | Pantalla | PDF | Excel |
|---|:---:|:---:|:---:|
| Perfil institucional V1–V5 en una vista, con rutas y condiciones del instrumento | **Sí** | Resumen de 1 página | Por_matriz |
| Valoración por criterios por matriz | Sí (semáforo) | **Sí (informe por programa)** | Por_matriz |
| Evidencia textual de cada asociación del perfil | Detalle bajo demanda | Solo los atributos **sin** alineación | **Sí (Evidencia)** |
| Listados nominales (homónimas divergentes, pares, variantes de nombre, atributos sin alineación, RA sin estrategia) | Tabla filtrable | Anexo por programa | **Un libro único «Anexos accionables» generado por el aplicativo** |
| Tendencias: amplitud, profundidad y distinción núcleo común / propio | Gráfica + tabla | Tabla | Matriz tendencia × programa × asignatura |
| Tópicos LDA con etiqueta interpretativa | Tabla | Párrafo | Hoja con asignaturas por tópico |
| Método, versión, huella, definiciones de campos | Nota breve | Nota metodológica (ya existe) | **Hoja «Léame» en todos los libros** |

**Criterio:** la pantalla comunica el hallazgo y permite navegar; el PDF narra y se cita; el Excel permite verificar y reutilizar. Ningún libro debe mezclar resultados agregados con registros sin una hoja que lo explique.
