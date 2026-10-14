# Entregable 2. Inventario completo por sección

**Alcance.** Aplicativo `dashboard_tematico.py` (Streamlit, 12 páginas de menú + 1 página sin menú). Fuente: lectura línea a línea del código y ejecución de sus funciones reales sobre las 50 matrices de `data/raw/FORMATOS RA CICLO UNO RC` (el corpus del artículo). **No se auditó la interfaz renderizada** (sin capturas ni sesión de Streamlit): lo que se afirma sobre texto, gráficos y tablas proviene del código.

**Clase de valor** (Fase 3 del encargo): **E** Esencial · **C** Complementario · **O** Operativo · **R** Redundante · **X** Confuso · **P** Prescindible · **V** Pendiente de validación. Cuando hay una observación crítica se remite al hallazgo `H#` del [Entregable 1](00_RESUMEN_EJECUTIVO.md).

**Convención de IDs:** `SEC-Tn` texto, `K` indicador/tarjeta, `G` gráfica, `B` tabla, `I` interacción, `F` archivo generado.

---

## A. Elementos transversales (antes y después de cargar)

| ID | Elemento | Contenido y cálculo | Clase |
|---|---|---|---|
| LAN-T1 | Encabezado «Análisis Microcurricular Basado en Datos» | Título de la landing | O |
| LAN-T2 | Texto del hero | «Optimice… mediante analítica avanzada e Inteligencia Artificial… en tiempo real». El artículo declara que el aplicativo **no invoca IAg en su ejecución** (`LLM_ENABLED: False`; P5) | **X** (H9) |
| LAN-I1 | Cargador de archivos | `.xlsx`, múltiples, 200 MB. Lee la hoja `Paso 5 Estrategias micro` (encabezado fila 2) y, para otras páginas, las hojas Paso 1–4 | O |
| LAN-I2 | Botón «Estructura del archivo» | Tarjeta: hoja Paso 5, encabezados fila 2, 4 campos de ejemplo. **Omite los Pasos 1–4**, necesarios para V1–V5, Perfil y Taxonomías | X (H9) |
| LAN-C1…C6 | Seis tarjetas de funcionalidades | Resumen Ejecutivo «85 % COMPLETADO», Tendencias «12 NUEVAS», Taxonomías «NIVEL: CREAR», Minería «PROCESADO», Tipo de Saber «—», Cobertura «ALERTA BRECHAS». **Valores escritos a mano en el código**, no calculados | **X / P** (H9) |
| GLO-T1 | Barra «N archivos cargados correctamente» | n subidos − n fallidos | O |
| GLO-I1 | Botón «Cambiar archivos» | Vacía caché y vuelve a la landing | O |
| GLO-T2 | Lista de archivos fallidos | Causa por archivo; se muestra **dos veces** (barra lateral y área principal) | R |
| GLO-K1 | Cuadro lateral «N asignaturas / N registros procesados» | Asignaturas = nombres únicos (734); registros = filas del Paso 5 (5.959). Ninguna de las dos cifras aparece en el artículo (1.757 / 1.616 asignaturas por matriz) | X |
| GLO-I2 | Selector «Programa» (barra lateral) | Filtra por nombre del programa (39) | O |
| GLO-I3…I5 | Filtros Modalidad, Sede, Nivel (área principal) | Valores del consolidado; «Nivel» se **infiere** por columnas `B.*`/`C.*` (solo Pre/Posgrado) | O |
| GLO-I6 | Menú de 12 páginas con descripción | Orden técnico, no narrativo | O |
| GLO-X1 | **Alcance real de los filtros** | Afectan Inicio, Resumen, Tipo de Saber, Taxonomías, Cobertura, Tendencias, Minería, Familias y Explorar. **No afectan Indicadores V1–V5 ni Perfil de Egreso** (reciben todos los archivos) aunque los filtros se ven encima | **X** (H3) |

---

## B. Inicio

| ID | Elemento | Contenido y cálculo | Clase |
|---|---|---|---|
| INI-T1 | Título «Análisis Temático Microcurricular» | | O |
| INI-T2 | Aviso «Bienvenido/a» | Presenta 3 dimensiones: cobertura temática, tendencias globales, análisis de texto. **No menciona V1–V5, perfil de egreso ni taxonomías**, que son el eje del artículo | X |
| INI-K1 | Programas | `nunique(Programa)` = 39 | E |
| INI-K2 | Matrices (programa-sede) | Combinaciones únicas Programa+Modalidad+Sede+Nivel = 50 | E |
| INI-K3…K5 | Presenciales, Virtuales, Híbridos | Conteo de matrices por modalidad | C |
| INI-K6, K7 | Pregrado, Posgrado | Conteo de matrices; el artículo usa **seis** niveles de formación (Tabla de composición del corpus) | C |
| INI-G1 | Barras apiladas «Programas por modalidad» (modalidad × sede, total anotado) | Matrices por modalidad y sede. Equivale a la columna «Matrices» de la Tabla 7 | E |
| INI-G2 | Barras «Programas por Nivel» | Pregrado/Posgrado/No identificado | C |
| INI-G3 | Pastel «Distribución Tipo de Saber (todos los programas)» | **Filas** del Paso 5 por tipo de saber. Distinto del R2 del artículo (RA únicos del Paso 3); repite TIP-G1 | **R / X** (H4) |
| INI-B1 | Tabla «Resumen por Programa» (paginada de 10 en 10) | Por Programa+Modalidad+Sede+Nivel: Asignaturas y Cr. Total **leídos de las filas de totales del Excel**; B. Institucional/Disciplinar/Electivo o Fundamentación/Profundización; Semestres (máx.); Diferencia (verde=0, rojo≠0) | O |
| INI-T3 | Aviso y lista de programas con diferencias | Ordenados por |Diferencia| | O |
| INI-T4 | Leyendas explicativas (Pregrado/Posgrado, Diferencia) | | O |

---

## C. Resumen Ejecutivo

| ID | Elemento | Contenido y cálculo | Clase |
|---|---|---|---|
| RES-T1 | Aviso introductorio | Tres preguntas para el comité: ¿cómo está el conjunto?, ¿qué matrices primero?, ¿qué hacer por programa? | C |
| RES-K1…K5 | Programas, Matrices, Asignaturas, RA únicos, Estrategias (Paso 4) | Sobre el conjunto filtrado; «Asignaturas» = nombres únicos (no la unidad del artículo) | C / X (GLO-K1) |
| RES-T2 | «Lectura rápida» (viñetas automáticas) | Matrices con ≥1 «No cumple», criterio con más incumplimiento, criterios cumplidos por todas, perfil sin alineación, RA sin estrategia/no evaluables, estrategias con N3–N4, tendencias ausentes | **E** |
| RES-K6…K10 | V1 Perfil, V2 Coherencia, V3 Evaluabilidad, V4 Trazabilidad, V5 Evidencia (N2+) | Mismas cifras que la página V1–V5 (verificado: V2 90 %, V3 100 %, V4 87,0 %, V5 95,4 %) | **R** (duplica V15-K) |
| RES-T3 | Aviso «V1 sin dato en N matrices» + botón «Reintentar» | Causa por matriz (capa faltante, error de lectura, etc.) | O |
| RES-G1 | Barras apiladas «Valoración por criterios» | Matrices por estado (Cumple/Parcial/No cumple) y criterio V1–V5 | E |
| RES-B1 | Tabla «Matrices que requieren atención» | Semáforo por criterio; orden: #No cumple, luego #Parcial | E / X (H10) |
| RES-T4 | «Hallazgos transversales» (expanders) | Alertas: programas atípicos en tipo de saber (regla IQR, ≥4 programas), registros sin semestre, asignaturas sin núcleos; cada una con recomendación | C |
| RES-B2 | Expander «Presencia de las 15 tendencias» | Asignaturas, % asignaturas, Programas, % programas (orden creciente) | C / X (H6) |
| RES-F1 | PDF «Informe general» | Ver sección N (EXP-F1) | E |
| RES-I1 | Selector de programa + PDF «Informe de {programa}» | Ver EXP-F2 | E |
| RES-B3 | Vista previa por matriz (expander) | Tabla Variable/Tramo/Resultado/Estado/Referencia (mediana) + acciones sugeridas + alertas | E |
| RES-F2 | ZIP «general + N informes por programa» | PDF general + 39 PDF | O |
| RES-X1 | Código inalcanzable | En `_alertas_resumen` hay ~8 líneas después de `return` (bloque de alertas por prioridad) | P (deuda técnica) |

---

## D. Tipo de Saber

| ID | Elemento | Contenido y cálculo | Clase |
|---|---|---|---|
| TIP-T1 | Aviso con definiciones | Saber/SaberHacer/SaberSer con ejemplos; «cada programa se compara con la mediana de los programas cargados… la plantilla descompone cada competencia en un RA por tipo de saber, de modo que la proporción depende del instrumento» | E / X (H4) |
| TIP-T2 | Advertencia condicional | Aparece solo si la diferencia máxima entre programas ≤ 10 puntos. **Con las 50 matrices no aparece** (rango entre matrices: Saber 19–60 %, SaberHacer 24–64 %, SaberSer 7–42 %) | X (H4) |
| TIP-G1 | Dona «Composición global» | Filas del Paso 5: Saber 42,5 %, SaberHacer 40,3 %, SaberSer 17,2 % | C / X (H4) |
| TIP-K1…K3 | Tarjetas HTML «Posición frente a los programas cargados» | % global del tipo, mediana y P25–P75 de los programas, n registros | C |
| TIP-G2 | Radar por programa + mediana (pestaña «Radar») | Hasta 39 polígonos superpuestos con 5 colores que se repiten | **X** (ilegible) |
| TIP-G3 | Barras agrupadas por programa con líneas de mediana (pestaña «Comparativo») | % por tipo y programa | C |
| TIP-G4 | Líneas «Evolución por semestre» | % de tipo de saber por semestre numérico; texto: «se espera mayor SaberHacer y SaberSer en semestres avanzados» (expectativa no sustentada en el artículo) | C / X |
| TIP-I1 | Multiselect de programas (semestre) y selector de programa (asignatura) | | O |
| TIP-B1 | Tabla semáforo «Tipo de saber por asignatura» | % por asignatura, orden por SaberHacer | C |
| TIP-T3 | Leyendas con consejos («si SaberSer es muy bajo… se descuida la formación en valores») | Interpretación normativa que contradice el aviso inicial | X |

---

## E. Indicadores V1–V5

| ID | Elemento | Contenido y cálculo | Clase |
|---|---|---|---|
| V15-T1 | Aviso con las definiciones de V1–V5 | Coinciden con la Etapa 3 y Tabla del Word | **E** |
| V15-K1 | Matrices / programas | 50 / 39 | E |
| V15-K2…K6 | V1…V5 con ayuda (n atributos, RA únicos, sin RA genérico, estrategias N3–N4) | Verificado V2–V5 contra el Word; V1 ver `v1.json` en el Entregable 3 | **E** |
| V15-G1 | Barras «Ruta de alineación curricular» (6 tramos, azul/gris) | Equivale a la Figura 1 del Word | **E** |
| V15-B1 | Tabla «Valoración por criterios» + selector de matriz + barras apiladas | Estado = Cumple si 100 %, No cumple si 0 %, Parcial en cualquier valor intermedio | E / X (H10) |
| V15-B2 | Tabla «Indicadores por matriz» (17 columnas) | V1 %, V2, verbos repetidos, V3, V4, RA sin estrategia, V5, evidencia directa, etc. | E |
| V15-G2 | Strip plot por variable y sede | Equivale a la Figura 5 del Word | E |
| V15-B3 | «Trazabilidad por clase de RA (V4)» + expander de RA de programa sin estrategia | Equivale a la Tabla 9 y Figura 4 | E |
| V15-B4 | «Indicadores del Paso 4 por nivel de evidencia» | N1–N5 (indicadores y %). El Word reporta además estrategias por nivel (Tabla 10) | E |
| V15-B5, B6 | Spearman y Kruskal-Wallis | Equivale a R6 y R7 | E |
| V15-F1 | Excel `indicadores_v1_v5.xlsx` | 6 hojas (ver EXP-F3) | E |

---

## F. Perfil de Egreso (V1)

| ID | Elemento | Contenido y cálculo | Clase |
|---|---|---|---|
| PER-T1 | Aviso metodológico | Qué mide, método determinista, versión y huella de la configuración, validación registrada, «propuesta para validar por el comité» | **E** |
| PER-T2 | Errores y avisos por matriz; matrices excluidas | Matrices sin alguna capa se excluyen de los indicadores | O |
| PER-K1…K4 | Matrices, Atributos evaluados, V1 (alguna capa), Sin alineación | | **E** |
| PER-G1 | Barras «Respaldo por capa» | Competencias, RA, Asignaturas (Tabla 8 del Word) | E |
| PER-G2 | Barras apiladas «Estado por componente del perfil» | Tres capas / parcial / sin asociación (Tabla 16 del Word) | E |
| PER-B1 | Tabla «Indicadores por matriz» + barras V1 por matriz | Orden por % sin asociación | E |
| PER-B2 | Detalle por matriz (selector, radio de perfil, tabla de atributos coloreada) | Atributo → Competencia/RA/Asignatura | **E** |
| PER-B3 | Expanders «Atributos sin asociación» y «Evidencia de las asociaciones» | Contenido más cercano, cobertura, similitud, evidencia textual | **E** (verificación) |
| PER-F1 | Excel `asociacion_perfil.xlsx` | Hojas Indicadores, Atributos, Evidencia, Método | E |
| PER-T3 | Pestaña «Saberes y valor agregado (complementario)» | Advertencia «no forma parte de V1»; 3 métricas; barras % con alerta por campo; tabla; recomendaciones | C (el Word la describe como exploratoria) |
| PER-T4 | Pestaña «Validar con referencia» | Carga de CSV; acuerdo y κ por capa; parámetros propuestos | O (herramienta de calibración) |
| PER-T5 | Pestaña «Configuración del método» | Parámetros, 100+ sinónimos, exportar/importar/restaurar JSON | O |
| PER-X1 | Pantalla sin menú `pagina_cobertura_perfil` | Heatmap/barras TF-IDF+BM25 de la medida anterior; sigue en el código | P |

---

## G. Cobertura Temática

| ID | Elemento | Contenido y cálculo | Clase |
|---|---|---|---|
| COB-T1 | Aviso «¿Qué mide?» | Núcleos temáticos, frecuencia y distribución | C |
| COB-I1 | Expander «Revisar y depurar núcleos» + multiselect de exclusión | Tabla núcleo/menciones; las exclusiones recalculan toda la página | O |
| COB-K1 | Núcleos únicos | 3.020 (Word: 2.828) | **X** (H1) |
| COB-K2 | Total menciones | 24.665 (Word: 6.684) | **X** (H1) |
| COB-K3 | Promedio por asignatura | 33,6 (Word: 4,1; mediana 4) | **X** (H1) |
| COB-K4 | Diversidad temática (Shannon normalizada) | 95,9/100; el Word ya no la reporta | C |
| COB-G1 | Mapa de calor núcleos (top 20) × programa | Menciones por programa; +tabla de nombres completos | C / X (H1) |
| COB-G2 | Barras «Top 20 núcleos» | Frecuencia ×3 | X (H1) |
| COB-G3 | Barras «Densidad (Top 20 asignaturas)» | Agrega por **nombre** de asignatura entre programas y triplica filas: gana la asignatura más compartida, no la más densa | **X** (H1) |
| COB-I2, G4 | Selector de programa + barras top 15 núcleos | | C |
| COB-T2 | Subsección «Mapa de Integración entre Asignaturas»: 3 métricas, red circular (máx. 40 nodos), matriz (≤35), tabla top 20 pares, lista de aisladas | Nodos por nombre; programa = el primero que aparece | C / X (H1, H7) |

---

## H. Tendencias Globales

| ID | Elemento | Contenido y cálculo | Clase |
|---|---|---|---|
| TEN-T1 | Aviso «¿Qué mide?» | Cobertura = % de asignaturas (sobre 734) | X (H6) |
| TEN-K1…K4 | Evaluadas (15), Detectadas, Ausentes, Total asignaturas | 734 = nombres únicos | C / X |
| TEN-G1 | Mapa de calor tendencia × programa (nº asignaturas) | Pestaña «Vista global» | C |
| TEN-G2 | Barras «Cobertura por tendencia (% de asignaturas)» + línea al 50 % | Línea de 50 % sin sustento (el propio Resumen dice que no hay mínimo institucional) | X |
| TEN-G3 | Barras «N° de asignaturas por tendencia» | Duplica TEN-G2 en valor absoluto | R |
| TEN-T2 | «Brechas curriculares detectadas» | Tendencias con 0 asignaturas | C (con la config. oficial no hay ninguna) |
| TEN-I1, F1 | Selector de tendencia + Excel `listado_{T}.xlsx` + expanders por programa | Excel con 2 hojas (Programas; Asignaturas con keywords y fragmento) | **E** |
| TEN-T3 | Pestaña «Por programa»: 3 métricas, barras, selector, lista | **Usa otra regla** (coincidencia por subcadena) | **X** (H2) |

---

## I. Minería de Texto

| ID | Elemento | Contenido y cálculo | Clase |
|---|---|---|---|
| MIN-T1 | Aviso «¿Qué es esto?» | Define PLN, términos, frases, similitud | C |
| MIN-G1 | Barras «Términos clave globales (TF-IDF)» + slider | 100 rasgos, 1–3-gramas, por **fila** (cada asignatura ×3) con RA, nombre, indicadores, núcleos y proceso | C / X |
| MIN-G2 | Barras «Frases frecuentes (N-gramas)» + slider | Frecuencias ×3 | C |
| MIN-G3 | Pestañas «Términos por programa» (una pestaña por programa, hasta 39) | | P / X (39 pestañas) |
| MIN-T2 | «Similitud entre asignaturas»: multiselect, número máx. heatmap, «par más similar», pestañas Grupos (clustering aglomerativo, slider de grupos, cohesión) y Pares (top 40 con semáforo 0,6/0,8) | TF-IDF de 50 rasgos sobre texto concatenado **por nombre** entre programas; método distinto del R8.1 | R / X (H8) |
| MIN-I1 | «Buscar términos en los datos» | Búsqueda por subcadena en el texto completo | O |
| MIN-B1 | «Tópicos del contenido (LDA de consenso)»: slider k (13), botón (minutos), tabla con 8 términos, asignaturas y % | Equivale a la Tabla 15 del Word, **sin las etiquetas temáticas** | E / V |

---

## J. Taxonomías

| ID | Elemento | Contenido y cálculo | Clase |
|---|---|---|---|
| TAX-T1 | Aviso | Base de 646 verbos, contraste «propuesta para revisar» | C |
| TAX-K1…K5 | RA únicos (338), Bloom 48,5 %, BAK 51,5 %, Índice de exigencia (49,8), Coherentes con el verbo (67,8 %) | Verificado: 338 / 164 / 174 coinciden con el Word | E |
| TAX-G1, B1 | Pestaña Resumen: barras de exigencia por matriz + tabla | Descriptivo | C |
| TAX-G2 | Pestaña «Dominio y nivel»: pastel de dominio, barras nivel×dominio, barras de composición por programa | El dominio coincide con el tipo de saber (47,6/36,4/16,0 %) y reproduce la Figura 3 del Word **sin decirlo** | E |
| TAX-G3, B2, F1 | Pestaña «Coherencia verbo–nivel»: 4 métricas (Coincide 229, Nivel difiere 72, Dominio difiere 28, Fuera de base 9), barras por programa, tabla de RA a revisar, Excel | Resultado no reportado en el Word | C / V |
| TAX-G4, B3 | Pestaña «Verbos»: barras top 20 verbos de **RA** (Paso 3) + tabla | El Word (Figura 2) usa verbos de **competencias** (Paso 2) | X (H11) |
| TAX-G5 | Pestaña «Progresión»: exigencia y dominio por semestre | | C |
| TAX-B4 | Pestaña «Explorar RAs» | Columna «Tipo de saber» con **capitalización inconsistente** (`SaberHacer`/`Saberhacer`, `SaberSer`/`Saberser`) | O / X (H5) |

---

## K. Familias Curriculares

| ID | Elemento | Contenido y cálculo | Clase |
|---|---|---|---|
| FAM-T1 | Aviso «¿Qué son las Familias Curriculares?» | «Conjuntos de programas que comparten asignaturas»; el artículo aclara que **no** hay clustering de programas | X |
| FAM-K1 | Asignaturas compartidas | 158 de 734 nombres (Word: 159 de 709, nombres normalizados) | E |
| FAM-B1 | Tabla pivote asignatura × programa («X») | 158 filas × 39 columnas | C |
| FAM-G1 | Mapa de calor asignatura × programa | Duplica FAM-B1 | R |
| FAM-G2 | Barras «Asignaturas por cantidad de programas» | | C |
| FAM-B2 | «Consistencia de contenido»: pestañas Homónimas (3 métricas + tabla) y «Nombre distinto, contenido similar» (métrica + tabla) | Método de R8.1; cifras por confirmar en el Entregable 3 | **E** |
| FAM-X1 | **Ausentes** | Núcleo común institucional (6 asignaturas), núcleos por área (Tabla 14 del Word) y distinción pregrado/posgrado | — |

---

## L. Configurar Tendencias y Explorar Datos

| ID | Elemento | Contenido y cálculo | Clase |
|---|---|---|---|
| CFG-I1 | Importar JSON / descargar `config_tendencias.json` | | O |
| CFG-B1 | Lista de 15 tendencias con keywords (expanders) | | C |
| CFG-I2 | Agregar, eliminar y restaurar tendencias | | O |
| CFG-X1 | La regla de asignación (nombre ≥1 término o contenido ≥2 puntos) **no se muestra ni se edita** aquí | | X |
| DAT-I1 | 3 multiselect (Programa, Tipo de Saber, Semestre) | | O |
| DAT-B1 | Tabla con 7 columnas y recuento | | O |
| DAT-F1 | CSV `datos_filtrados.csv` | Todas las columnas internas (incluye `_bloque_inicio` y `Texto_Completo`) sin diccionario | O |

---

## M. Archivos generados (detalle en el [Entregable 5](05_AUDITORIA_EXPORTACIONES.md))

| ID | Archivo | Origen |
|---|---|---|
| EXP-F1 | `informe_general_microcurricular.pdf` | Resumen Ejecutivo |
| EXP-F2 | `informe_{programa}.pdf` (×39) y ZIP | Resumen Ejecutivo |
| EXP-F3 | `indicadores_v1_v5.xlsx` (6 hojas) | Indicadores V1–V5 |
| EXP-F4 | `asociacion_perfil.xlsx` (4 hojas) | Perfil de Egreso |
| EXP-F5 | `taxonomias_contraste.xlsx` (2 hojas) | Taxonomías |
| EXP-F6 | `listado_{tendencia}.xlsx` (2 hojas) | Tendencias Globales |
| EXP-F7 | `datos_filtrados.csv` | Explorar Datos |
| EXP-F8 | `config_asociacion_perfil.json`, `config_tendencias.json` | Perfil / Configurar |
| EXP-F9 | **Fuera del aplicativo:** `data/output/` (excel_maestro 15 hojas, indicadores_consolidados.xlsx, anexos_accionables.xlsx 7 hojas, 12 figuras PNG, reportes HTML/JSON por programa) | `run_analysis.py` y scripts de `auditoria/` |
