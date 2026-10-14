# Auditoría integral del aplicativo de análisis microcurricular

**Entregable 1. Resumen ejecutivo.** Fecha de la auditoría: 2026‑10‑13. Aplicativo: `dashboard_tematico.py` (Streamlit). Artículo de referencia: `auditoria/Resultados_consolidado.docx` (vigente).

| Entregable | Archivo |
|---|---|
| 1 Resumen ejecutivo | este documento |
| 2 Inventario por sección (120 elementos clasificados) | [02_INVENTARIO_SECCIONES.md](02_INVENTARIO_SECCIONES.md) |
| 3 Trazabilidad artículo ↔ aplicativo | [03_TRAZABILIDAD_ARTICULO_APP.md](03_TRAZABILIDAD_ARTICULO_APP.md) |
| 4 Valor y redundancia | [04_VALOR_Y_REDUNDANCIA.md](04_VALOR_Y_REDUNDANCIA.md) |
| 5 Exportaciones | [05_AUDITORIA_EXPORTACIONES.md](05_AUDITORIA_EXPORTACIONES.md) |
| 6 Catálogo de insights | [06_CATALOGO_INSIGHTS.md](06_CATALOGO_INSIGHTS.md) |
| 7 Arquitectura propuesta | [07_ARQUITECTURA_PROPUESTA.md](07_ARQUITECTURA_PROPUESTA.md) |
| 8 Plan de implementación | [08_PLAN_IMPLEMENTACION.md](08_PLAN_IMPLEMENTACION.md) |
| Contenido por sección (visuales, respuestas, insights; vista por matriz) | [10_CONTENIDO_POR_SECCION.md](10_CONTENIDO_POR_SECCION.md) |
| Anexo: revisión del código de resultados (parcial) | [09_REVISION_CODIGO_RESULTADOS.md](09_REVISION_CODIGO_RESULTADOS.md) |

## 1. Estado general

**El núcleo científico del aplicativo es confiable y coincide con el artículo; las vistas secundarias no.**

Se ejecutaron las funciones reales del aplicativo sobre las 50 matrices del corpus (50 leídas, 0 fallidas, 39 programas) y se compararon con el Word vigente:

| Se reproduce **exactamente** | Cifra |
|---|---|
| V1 (2.574 atributos) | 96,2 % alguna capa · 65,7 % tres capas · 3,8 % (98) sin alineación · capas 75,6 / 72,4 / 95,2 % |
| V1 por matriz | 87,2–100 %, mediana 97,3 %, 12 matrices al 100 % |
| V2 · V3 · V4 · V5 | 90 % · 100 % · 87,0 % (98,0 % sin el RA genérico) · 95,4 % (0,8 % evidencia directa) |
| Corpus | 222 competencias · 338 RA únicos · 391 estrategias · 1.185 indicadores · 44 RA sin estrategia (38 genéricos / 6 de programa) |
| Taxonomías | Bloom 164 (48,5 %) / BAK 174 (51,5 %) · 26 matrices mixtas |
| R6 y R7 | las seis correlaciones de Spearman y los cuatro Kruskal‑Wallis (H y p) |
| Homónimas | 159, de ellas 15 divergentes |
| Amplitud de tendencias | IA en 30 de 39 programas, sostenibilidad 31, etc. |

Las **diferencias** aparecen en el bloque de **contenido declarado (R8)** y en el **tipo de saber**: ver H1–H7.

## 2. Fortalezas

1. **Trazabilidad del método de perfil**: versión, huella SHA‑256, parámetros y huella de cada archivo viajan en el Excel; la limitación de la referencia (asistida por IAg, no validada) se declara en pantalla.
2. **Honestidad metodológica**: la valoración por criterios evita puntajes sin base; la ruta de alineación distingue lo que impone la plantilla de lo que es articulación; los contrastes se describen como exploratorios.
3. **Informe PDF por programa**: convierte indicadores en listas nominales y acciones, lo que el artículo postula como el producto útil.
4. **Datos faltantes informados con conteo** (semestres, núcleos), no ocultados.
5. **Paridad verificable**: las variables del artículo se pueden recalcular desde el aplicativo.

## 3. Problemas más relevantes

| ID | Gravedad | Hallazgo | Evidencia |
|---|---|---|---|
| **H1** | Crítica | **Los núcleos se cuentan hasta tres veces** (`_bloque_inicio` existe pero ningún análisis lo usa) y la densidad agrega por nombre de asignatura entre programas | 24.665 menciones y 33,6 núcleos por asignatura frente a 6.684 y 4,1 del Word. Una matriz: 504 contados frente a 152 |
| **H2** | Alta | **Dos reglas de detección de tendencias** en la misma página (la pestaña «por programa» usa subcadena, no la regla D21) | IA: 42 asignaturas (programa × asignatura) con la regla oficial y 1.196 por subcadena |
| **H3** | Alta | Los **filtros globales no afectan** a V1–V5 ni a Perfil | `pagina_indicadores_articulo()` y `pagina_asociacion_perfil()` no reciben datos filtrados |
| **H4** | Alta | **Tipo de saber** mide el Paso 5 (filas) y el artículo mide RA únicos (Paso 3); el texto de «paridad por plantilla» no aplica a los datos | Paso 5: 42,5 / 40,3 / 17,2 % con rangos de 24 a 64 % entre matrices; artículo: 47,6 / 36,4 / 16,0 % |
| H5 | Media | La columna «Tipo de saber» de Taxonomías mezcla `Saberhacer`/`SaberHacer` y `Saberser`/`SaberSer` | 5 categorías en vez de 3, también en el Excel |
| **H6** | Alta | **Tendencias: otra unidad y sin núcleo común.** La aplicación mide % de 734 nombres únicos; el artículo, amplitud (39 programas) y profundidad (1.616 asignaturas) con y sin núcleo común | IA: 1,8 % frente a 3,5 %; «21 de 30 programas solo por el núcleo común» no se puede descubrir |
| **H7** | Alta | **«Pares candidatos a homologación»**: 2.467 en la aplicación frente a 203 en el Word. **Misma causa que H1**: `consolidar_asignaturas` espera el nombre solo en la primera fila del bloque y el dashboard se lo entrega rellenado hacia abajo (5.959 «asignaturas» en vez de 1.614) | Filtrando por `_bloque_inicio` la aplicación da 203 pares, 159 homónimas, 15 divergentes, media 0,928 y 133 idénticas: **exacto al Word** |
| H8 | Media | Tres métodos distintos de «asignaturas parecidas» | Minería, Familias, Cobertura |
| H9 | Alta | **Textos y cifras sin sustento en la landing**: «85 % COMPLETADO», «12 NUEVAS»… escritos a mano; hero promete IA «en tiempo real» (el artículo establece lo contrario); «Estructura del archivo» omite los Pasos 1–4 | `dashboard_tematico.py` l. 5810‑5850 |
| H10 | Media | «Parcial» cubre de 1 % a 99 %; «V5» tiene dos significados (95,4 % y 100 %) | Tabla de matrices que requieren atención |
| H11 | Media | La pestaña «Verbos» usa verbos de **RA**; el artículo reporta los de **competencias** | Figura 2 sin equivalente |
| H12 | Media | Los listados nominales que promete el artículo no se generan con las cifras vigentes; `data/output/` conserva resultados de junio‑agosto | `anexos_accionables.xlsx` (2026‑08‑03): 46 divergentes, 302 candidatos |

## 4. Hallazgos del artículo: mejor y peor comunicados

| Mejor comunicados (A) | Peor comunicados (N / I) |
|---|---|
| V1 y su lectura por capa y componente | Núcleo común institucional (6 asignaturas) y núcleos por área |
| V2–V5 y la ruta de alineación | **IA «amplia pero apoyada en una asignatura común»** (el hallazgo central de R8.2) |
| Trazabilidad por clase de RA (V4) | Verbos de las competencias (Figura 2) |
| Contrastes R6 y R7 | Tipo de saber de RA únicos (Figura 3) |
| Taxonomías (Bloom/BAK) | Densidad declarativa (4,1 núcleos por asignatura) |
| Homónimas divergentes | Pares de nombre distinto (203) |

Cobertura de los 32 hallazgos con equivalente: 16 adecuados, 5 parciales, 5 no representados, 4 inconsistentes, 1 sin sustento visible.

## 5. Riesgos de interpretación

1. Un usuario que lea **Cobertura Temática** concluirá que cada asignatura declara 33 núcleos; el artículo dice 4.
2. Quien lea **Tendencias** verá IA en 1,8 % de las asignaturas y en 76,9 % de los programas sin saber por qué; quien use la pestaña «por programa» verá cifras 28 veces mayores.
3. La landing sugiere un avance del 85 % que no existe.
4. Quien filtre por «Posgrado» pensará que V1–V5 se calculó solo para posgrado.
5. La página de Perfil declara que la referencia de V1 no está validada; **el Resumen y el PDF muestran V1 solo con el pie genérico «propuesta para validar por el comité»**, sin esa limitación específica.

## 6. Mejoras prioritarias (ver Entregable 8)

1. **A‑1, A‑2**: corregir el conteo de núcleos y unificar la regla de tendencias (confiabilidad).
2. **A‑3, A‑5, A‑6**: alcance de los filtros, tipo de saber con la unidad del artículo y retiro de cifras fijas (interpretación).
3. **A‑4, A‑7, A‑8**: amplitud/profundidad/núcleo común, libro único de anexos accionables y unidad de los pares de homologación (hallazgos del artículo).
4. **A‑21**: prueba automática de las cifras del artículo para que no se pierdan de nuevo.

## 7. Limitaciones de la auditoría

- **No se inspeccionó la interfaz renderizada**; el análisis de textos, gráficos y tablas proviene del código y de la ejecución de sus funciones.
- **No se generó ni abrió ningún PDF** del aplicativo.
- **No se recalcularon** el LDA (tarda minutos), el 58,0 % de asignaturas compartidas, los 786 atributos parciales ni el 10,9 % de poblaciones de actuación; se marcan como no verificados.
- **Código de resultados del artículo:** solo se revisó `auditoria/scripts/verificar_r8.py` (origen de las 203 parejas) y se comprobó que las cifras clave de `textos_articulo.py` (texto fijo) tienen JSON de evidencia. **No se revisaron** `generar_excel*.py`, `generar_word_resultados.py`, `generar_entregables.py` ni los otros ~55 scripts; ver [09_REVISION_CODIGO_RESULTADOS.md](09_REVISION_CODIGO_RESULTADOS.md).
- La Etapa 3 del Word describe una **referencia de V1 elaborada con asistencia de IAg y no validada por el comité**: se heredó sin evaluarla, y toda cifra de V1 debe leerse con esa condición.
- El `articulo_curricular_IA.md` es **anterior** a las decisiones D23–D30; sus cifras no se usaron como referencia.
- Las corridas se hicieron con la carpeta `FORMATOS RA CICLO UNO RC`; se asume que es el corpus del artículo porque coincide en 50 matrices, 39 programas y en todas las cifras V1–V5.

## 8. Decisiones que solo puede tomar la autora

1. ¿Se reportan en el artículo el índice de exigencia y la coherencia verbo‑nivel, o se rotulan como exploratorios? (A‑17)
2. ¿Cómo se define formalmente el **núcleo común institucional**? (A‑4)
3. ¿Qué se hace con el `.md` anterior del artículo y con `data/output/`? (A‑22)
