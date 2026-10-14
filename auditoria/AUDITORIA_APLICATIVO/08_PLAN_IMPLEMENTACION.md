# Entregable 8. Plan de implementación priorizado

**Cómo leerlo.** `H#` remite a los hallazgos del [Entregable 1](00_RESUMEN_EJECUTIVO.md). **Requiere:** *datos* = se puede con los datos y funciones actuales · *código* = modificar el aplicativo · *recálculo* = regenerar resultados · *fuentes* = nuevas fuentes · *experto* = validación de expertos curriculares. Los números de línea corresponden a `dashboard_tematico.py` en el estado auditado.

Las pruebas de aceptación se ejecutan con las 50 matrices de `data/raw/FORMATOS RA CICLO UNO RC`.

---

## Prioridad crítica

### A‑1. Contar cada asignatura una sola vez en los análisis de núcleos (H1)
- **Tipo:** metodología / calidad de datos · **Requiere:** código
- **Problema:** `_rellenar_celdas_combinadas` crea `_bloque_inicio`, pero **ningún análisis lo usa**: cada asignatura aporta sus núcleos tantas veces como filas de Tipo de Saber tiene (hasta 3).
- **Evidencia:** matriz AdmonEmpresas_PBOG: 504 núcleos contados frente a 152 por bloque. Con las 50 matrices, la página de Cobertura muestra 24.665 menciones, 3.020 únicos y 33,6 por asignatura; el Word reporta 6.684, 2.828 y 4,1 (mediana 4).
- **Cambio:** filtrar por `_bloque_inicio` y usar la unidad (Matriz, asignatura) en `analizar_cobertura` (l. 1087), la matriz de presencia (l. 2300‑2311), la densidad por asignatura y el mapa de integración (l. 2021‑2244).
- **Beneficio:** las cinco métricas de la página dejan de multiplicar por ~3,7 y coinciden con el artículo.
- **Criterio de aceptación:** `analizar_cobertura(df)` devuelve `total_menciones = 6.684` y `promedio_densidad ≈ 4,1` (o la diferencia con el Word queda explicada por escrito); para AdmonEmpresas_PBOG el recuento es 152.

### A‑2. Una sola regla de asignación de tendencias (H2)
- **Tipo:** metodología · **Requiere:** código
- **Problema:** la pestaña «Análisis por Programa» (l. 2993‑3002) usa coincidencia por **subcadena** (`k in texto`), no la regla D21 (palabra completa; nombre ≥ 1 término o contenido ≥ 2 puntos) que usa la vista global y el artículo.
- **Evidencia:** pares (programa, asignatura) que activan **Inteligencia artificial**: 42 con la regla oficial y 1.196 por subcadena (28 ×); Innovación educativa: 146 frente a 1.094.
- **Cambio:** reemplazar el bloque por `terminos_presentes(...)` (`src/tendencias.py`) o por `resultados['detalle']`.
- **Criterio de aceptación:** para todo programa, el n.º de asignaturas por tendencia en la pestaña «por programa» es igual al de la fila correspondiente del mapa de calor de la vista global.

---

## Prioridad alta

### A‑3. Alinear el alcance de los filtros (H3)
- **Tipo:** funcionalidad · **Requiere:** código
- **Problema:** `pagina_indicadores_articulo()` y `pagina_asociacion_perfil()` no reciben el DataFrame filtrado; los filtros se muestran encima y no tienen efecto.
- **Cambio:** pasar el conjunto de matrices filtrado (`set(df_filtered['Matriz'])`) como ya hacen Resumen y Taxonomías; mientras tanto, aviso visible «esta sección usa todas las matrices cargadas».
- **Criterio:** con Nivel = Posgrado, V1–V5 muestra 10 matrices.

### A‑4. Tendencias: amplitud, profundidad y núcleo común (H6)
- **Tipo:** contenido / visualización · **Requiere:** código + definir la regla del núcleo común
- **Problema:** la aplicación mide «% de asignaturas únicas por nombre (734)»; el artículo, amplitud (programas, n = 39) y profundidad (asignaturas sin electivas, n = 1.616) con y sin el núcleo común, y excluye la tendencia de formación ciudadana de la lectura.
- **Evidencia:** IA en la aplicación: 13 asignaturas únicas (1,8 %) y 30 programas; en el Word: 30/39 (76,9 %), 21 solo por el núcleo común, 57/1.616 (3,5 %).
- **Cambio:** añadir las tres medidas y la gráfica de «propias / solo núcleo común / ausente»; rotular la tendencia 15.
- **Dependencias:** formalizar el criterio del núcleo común (6 asignaturas en los 29 pregrados y en ningún posgrado).
- **Criterio:** IA = 30 programas, 21 solo por núcleo común, 57 asignaturas (3,5 %).

### A‑5. Tipo de saber con la unidad del artículo (H4, H5)
- **Tipo:** contenido / calidad de datos · **Requiere:** código
- **Problema:** la página usa filas del Paso 5 y su texto afirma que la paridad la fija la plantilla; con las 50 matrices el rango entre matrices es 19–60 % (Saber), 24–64 % (SaberHacer) y 7–42 % (SaberSer). El R2 usa RA únicos (47,6/36,4/16,0), cifra que la aplicación ya contiene pero repartida en cinco categorías por `Saberhacer`/`Saberser`.
- **Cambio:** (i) normalizar capitalización en `taxonomias_ra.leer_ra`; (ii) mostrar la distribución de RA únicos con n; (iii) rotular la medida del Paso 5 como «estrategias microcurriculares» y retirar el texto de paridad; (iv) quitar el pastel de Inicio.
- **Criterio:** la gráfica muestra 47,6 / 36,4 / 16,0 con n = 338 y la columna «Tipo de saber» tiene exactamente tres valores.

### A‑6. Retirar cifras y afirmaciones sin sustento de la landing (H9)
- **Tipo:** contenido · **Requiere:** código
- **Cambio:** eliminar «85 % COMPLETADO», «12 NUEVAS», «NIVEL: CREAR», «PROCESADO», «ALERTA BRECHAS» o calcularlos; reescribir «Inteligencia Artificial… en tiempo real» (el artículo declara que el aplicativo no usa IAg al ejecutarse); ampliar «Estructura del archivo» a Pasos 1–5.
- **Criterio:** `grep` de las cadenas anteriores en `dashboard_tematico.py` sin resultados; el texto de la landing no menciona IA ni «tiempo real».

### A‑7. Libro único de «Anexos accionables» generado por el aplicativo (H12)
- **Tipo:** exportación · **Requiere:** código + recálculo
- **Problema:** el artículo promete listados nominales; `data/output/anexos_accionables.xlsx` (2026‑08‑03) trae cifras anteriores (46 divergentes, 302 candidatos, 32 errores, 155 brechas).
- **Cambio:** botón en «Atención y listados» que genera 7 hojas con las cifras vigentes más una hoja **Léame** (versión, huella, definiciones, unidades).
- **Criterio:** hojas con n = 15 divergentes, 14 variantes, 98 atributos sin alineación, 44 RA sin estrategia (6 de programa), 159 homónimas; coherencia con el Word.

### A‑8. Familias: entregar a `shared_subjects_analyzer` el formato que espera (H7, misma causa que H1)
- **Tipo:** metodología · **Requiere:** código
- **Problema:** `consolidar_asignaturas` supone el nombre de la asignatura solo en la primera fila del bloque; el dashboard lo pasa rellenado en las 3 filas. Resultado: 5.959 «asignaturas» en vez de 1.614 y 2.467 pares en vez de 203.
- **Evidencia (ejecutada):** con `df[df['_bloque_inicio']]` → 203 pares, 159 homónimas, 15 divergentes, media 0,928, 133 idénticas: coincide con `verificar_r8.py` y con la Tabla 12 y 13 del Word.
- **Cambio:** llamar a `divergencia_homonimas` y `comparar_inter_programa` con `df[df['_bloque_inicio']]` en `_seccion_consistencia_asignaturas` (l. 5233).
- **Criterio:** la métrica «Pares candidatos a homologación» muestra 203; la tabla de homónimas muestra media 0,928.

---

## Prioridad media

| ID | Cambio | Tipo / Requiere | Criterio de aceptación |
|---|---|---|---|
| A‑9 (H8) | Unificar «asignaturas parecidas» en el método de R8.1 (núcleos + indicadores, coseno, 0,60); retirar «Similitud entre asignaturas» de Minería o redirigirla | metodología · código | Una sola tabla de pares; no existe un 2.º TF‑IDF de 50 rasgos |
| A‑10 (H10) | Mostrar el **porcentaje** junto a Cumple/Parcial/No cumple y ordenar «Matrices que requieren atención» por él; aclarar que «V5 evidencia (N2+)» y «V5 indicadores» son medidas distintas | visualización · código | Una matriz con V1 = 87 % y otra con 25 % no se ven iguales en la tabla |
| A‑11 (H11) | Añadir verbos de **competencias** (Paso 2) y verbos repetidos; la pestaña «Verbos» se rotula «de los RA» | contenido · código | Aparece *Analizar* 50 ocurrencias (40 de la genérica) |
| A‑12 | Tópicos con etiqueta interpretativa, confianza media (0,42) y aviso «tópico sin asignaturas dominantes» | contenido · experto | La tabla de tópicos reproduce la Tabla 15 del Word |
| A‑13 | Familias: añadir núcleo común, núcleos por área y distinción pregrado/posgrado; retirar el mapa de calor duplicado | contenido · código | Aparecen las 6 asignaturas del núcleo común |
| A‑14 | «Densidad temática (Top 20)» por asignatura **y matriz**, no por nombre | metodología · código | Ninguna asignatura aparece por acumular sedes |
| A‑15 | Retirar el radar de 39 polígonos y las 39 pestañas de términos por programa; usar selector | UX · código | Ninguna vista con más de 8 series superpuestas |
| A‑16 | Hoja **Léame** (definiciones, unidades, versión) en todos los Excel; diccionario para el CSV | exportación · código | Cada libro abre con su Léame |
| A‑17 | Taxonomías: rotular «coherencia verbo‑nivel» y «índice de exigencia» como exploratorios hasta validar; decidir si se reportan en el artículo | contenido · experto | Etiqueta «exploratorio» visible |
| A‑18 | Tabla del corpus (Tabla 7) y composición por nivel de formación (6 niveles) en Inicio | contenido · datos | Totales: 222 competencias, 338 RA, 391 estrategias, 1.757 asignaturas |
| A‑19 | Retirar `pagina_cobertura_perfil` (sin menú) y el código inalcanzable de `_alertas_resumen` | deuda técnica · código | `pagina_cobertura_perfil` no existe o está documentada |

## Prioridad baja

| ID | Cambio | Criterio |
|---|---|---|
| A‑20 | Quitar la duplicación de errores de carga (barra lateral y área principal) | Cada archivo fallido se lista una vez |
| A‑21 | **Prueba automática de cifras del artículo** (`tests/test_cifras_articulo.py`): V1 96,2 %, V2 90, V3 100, V4 87,0, V5 95,4, 338 RA, 164/174 Bloom/BAK, 159 homónimas y 15 divergentes, IA 30/39, 6.684 núcleos | La prueba falla si una cifra cambia sin actualizar el artículo |
| A‑22 | Marcar o eliminar los archivos obsoletos de `data/output/` | Un `LEEME` indica vigencia por archivo |

---

## Orden sugerido de ejecución

1. **A‑1, A‑2** (confiabilidad): una sesión; cambian números visibles.
2. **A‑3, A‑5, A‑6** (interpretación): sin recalcular resultados científicos.
3. **A‑4, A‑7, A‑8** (hallazgos del artículo): requieren una decisión previa (regla del núcleo común y unidad de los pares).
4. **A‑9…A‑19** (arquitectura y comunicación): tras reordenar el menú del Entregable 7.
5. **A‑21** al final de cada bloque, para blindar las cifras.

## Lo que este plan NO propone

- No altera las conclusiones científicas ni las cifras del Word (V1–V5, 338 RA, 159/15 homónimas, 30/39 con IA): **la aplicación ya las reproduce**; los cambios corrigen otras vistas.
- No agrega recomendaciones pedagógicas ni causalidad.
- No resuelve la validación pendiente de V1 (referencia con asistencia de IAg) ni la concordancia del codificador de V5: son **pendientes del artículo**, no del aplicativo.
