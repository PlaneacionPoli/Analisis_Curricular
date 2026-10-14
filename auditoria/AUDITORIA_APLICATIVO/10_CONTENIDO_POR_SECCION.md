# Contenido de cada sección de la propuesta: visuales, respuestas e insights

**Escrito para:** la autora del artículo y quien implemente el dashboard. Complementa el [Entregable 7](07_ARQUITECTURA_PROPUESTA.md) (qué secciones) con el detalle de **qué muestra cada una** y los insights de [Entregable 6](06_CATALOGO_INSIGHTS.md) (`I#`).

> **Aviso:** los textos entre comillas con cifras de una matriz («22 de 25 RA», «41 % de núcleo común», «exigencia 56»…) son **ejemplos de redacción**, no resultados reales de ninguna matriz.

## 0. Principio rector: el artículo es global, el dashboard se lee por matriz

El artículo reporta el **conjunto** (50 matrices = 39 programas × sedes). El dashboard debe permitir lo contrario: abrir **una matriz** y ver qué le pasa, **sin perder la referencia institucional**. Esto implica cuatro reglas:

| Regla | Qué significa |
|---|---|
| **R‑A. Dos vistas en cada sección** | **Conjunto** (lo que dice el artículo) y **Matriz** (una unidad programa‑sede elegida en un selector global «programa – modalidad – sede») |
| **R‑B. La referencia no se encoge** | Al elegir una matriz, la mediana y el rango de comparación **siguen siendo los de las 50 matrices** (o los del nivel de formación elegido), nunca los de la matriz sola. Hoy, con filtro por programa, la «mediana de los programas cargados» pasa a ser el propio programa |
| **R‑C. Siempre «x de n»** | Cada porcentaje de matriz va con su conteo (p. ej. «22 de 25 RA»). HBOG tiene 6 RA; un porcentaje solo sería engañoso |
| **R‑D. Lo inferencial solo en el conjunto** | Correlaciones (R6), Kruskal‑Wallis entre sedes (R7) y pregrado‑posgrado no existen para una matriz: en la vista de matriz se sustituyen por «posición frente al conjunto» y se avisa por qué |

**Cuidados propios de la unidad matriz**
- **Matrices gemelas:** 19 matrices pertenecen a 8 programas multisede con RA idénticos y 89–100 % de núcleos compartidos. Cada vista de matriz muestra un enlace «misma matriz en otras sedes» y **no** presenta la comparación entre gemelas como hallazgo.
- **Techo:** cuando la mayoría de las matrices está en 100 % (V3, V5), el valor de la matriz se acompaña de «idéntico en N de 50 matrices» en lugar de un ranking.
- **Sin puntaje compuesto:** la posición es «por debajo / igual / por encima de la mediana», no un índice (decisión D26 del artículo).

---

## 1. Inicio

**Pregunta:** ¿Qué se analizó y qué matriz estoy mirando?

| | Vista del conjunto | Vista de la matriz («Ficha») |
|---|---|---|
| **Visuales** | Tabla del corpus por sede (matrices, competencias, RA únicos, estrategias, asignaturas = Tabla 7); barras apiladas matrices por modalidad × sede; barras por nivel de formación (6 niveles) | **Tarjeta de identidad:** programa, sede, modalidad, nivel de formación, créditos oficiales por bloque, semestres. Contadores propios: competencias, RA únicos, estrategias, asignaturas (sin electivas). Estado de lectura (hojas Paso 1–5 leídas / avisos) |
| **Tablas** | «Resumen por Programa» (créditos, plegado como control de calidad de la carga) | Fila de la matriz en esa tabla + diferencia de créditos |
| **Respuesta** | 50 matrices, 39 programas, 222 competencias, 338 RA, 391 estrategias, 1.757 asignaturas | «Esta matriz tiene 25 RA, 24 estrategias y 132 asignaturas; su hoja Paso 4 se leyó sin avisos» |
| **Insights** | **I10** (corpus) | Semáforo de 5 puntos V1–V5 con enlace a la sección 2 |
| **Se retira** | Pastel de tipo de saber | — |

---

## 2. Articulación curricular (V1–V5)

**Pregunta:** ¿Qué tan articulado está el currículo del perfil a la evidencia, y qué parte de eso es solo el formato?

| | Conjunto | Matriz |
|---|---|---|
| **Visuales** | **Ruta de alineación** (6 tramos, azul = articulación, gris = condición de la plantilla). **Valoración por criterios** (barras apiladas: n.º de matrices en Cumple / Parcial / No cumple por V1–V5). Strip plot de cada variable por matriz coloreado por sede (el punto de la matriz elegida se resalta). Niveles de evidencia N1–N5 **por estrategia** (barras apiladas) | **Ruta de alineación de la matriz** (mismos 6 tramos, con el valor de la matriz y una marca en la mediana del conjunto). **Tabla de criterios** con resultado, estado y «x de n»: «V4: 87,5 % (21 de 24 RA; 3 sin estrategia)». Barras de N1–N5 de sus estrategias |
| **Tablas** | Trazabilidad por clase de RA (programa / genérico) por sede; Spearman y Kruskal‑Wallis con una frase interpretativa | RA sin estrategia (con la clase: genérico o de programa); estrategias sin indicador o instrumento; verbo repetido entre competencias (si lo hay) |
| **Respuestas** | «¿Qué es hallazgo y qué es instrumento?», «¿cuánto cumple el conjunto cada criterio?», «¿las variables se mueven juntas?» | «¿Cumple esta matriz cada criterio?», «¿qué RA y estrategias le faltan?», «¿cuánto de su evidencia es directa?» |
| **Insights** | **I6** (lo que sale 100 % es del instrumento), **I7** (trazabilidad con dos causas), **I3** (evidencia indirecta), **I8** (sin palanca única; sin diferencias por sede), V2 = 90 % | **I7 en la matriz:** «de 3 RA sin estrategia, 1 es el genérico institucional y 2 son de programa». **I3 en la matriz:** «2 de 24 estrategias con aprendizaje demostrado (N3)» |
| **R‑D** | Aquí viven R6 y R7 | Se sustituyen por «esta matriz está por encima / igual / por debajo de la mediana en V1, V4, V5» |

---

## 3. Perfil de egreso (V1)

**Pregunta:** ¿Lo que promete el perfil se enseña, se formula y se evalúa?

| | Conjunto | Matriz |
|---|---|---|
| **Visuales** | Barras «Respaldo por capa» (competencias 75,6 · RA 72,4 · asignaturas 95,2 %); barras apiladas «Estado por componente» (tres capas / parcial / sin alineación); V1 por matriz ordenado, color = % en tres capas | Las mismas dos barras con **solo los atributos de la matriz** y la mediana del conjunto como línea de referencia. **Matriz de atributos × capa** (celdas verde / ámbar / rojo) |
| **Tablas** | **Listado consolidado de los 98 atributos sin alineación** (matriz, componente, atributo, contenido más cercano); indicadores por matriz | Atributos de la matriz con competencia, RA y asignatura que los respaldan; **atributos sin alineación con su evidencia más cercana**; evidencia textual de cada asociación (expander) |
| **Respuestas** | «¿Dónde se concentran los vacíos del perfil?» | «¿Qué promete el perfil de esta matriz que su plan no desarrolla?» |
| **Insights** | **I1** (se enseña más de lo que se formula), **I2** (vacíos en poblaciones y escenarios) | «12 de 47 atributos con alineación solo parcial; 5 sin alineación (casinos, cruceros…)»; el tipo de vacío (docencia, dirección, poblaciones) se anota por atributo |
| **Aviso fijo** | «Referencia de calibración asistida por IAg, no validada por el comité (acuerdo 80,1 %, κ = 0,44)» **junto a la cifra**, no solo en un aviso inicial | Igual |
| **Mover a «Método»** | Validar con referencia y configuración del método | — |

---

## 4. Resultados de aprendizaje

**Pregunta:** ¿Cómo están formulados los RA y qué evidencia de logro declaran?

| | Conjunto | Matriz |
|---|---|---|
| **Visuales** | **Tipo de saber de RA únicos** (dona 47,6 / 36,4 / 16,0 % con n = 338 y nota «SaberSer se reutiliza en 3,4 competencias»); **verbos de competencias** (barras apiladas específica / genérica); Bloom frente a BAK; dominio y nivel; índice de exigencia por matriz (marcado «descriptivo») | **Dona de tipo de saber de los RA de la matriz** con n; **verbos de sus competencias** (¿repite alguno?); Bloom/BAK que usa; distribución de niveles por dominio; **exigencia frente a la mediana y al rango del conjunto**; progresión por semestre (solo si ≥ 8 RA vinculados) |
| **Tablas** | Contraste verbo‑nivel por programa (**rotulado exploratorio**) | RA de la matriz con verbo, dominio, nivel declarado y lectura de la base; **RA a revisar** (nivel o dominio difiere) |
| **Respuestas** | «¿Qué taxonomías usa la institución y qué tan exigente es?» | «¿Qué piden los RA de esta matriz y están bien clasificados?» |
| **Insights** | **I11** (47,6 / 36,4 / 16,0), **I12** (Bloom 48,5 % / BAK 51,5 %; 26 matrices mixtas), **I13** (verbos de competencias: *Analizar* por la genérica), **I14** (V2 = 90 %), **I3** (completa con N1–N5) | «Esta matriz usa solo BAK; exigencia 56 (mediana del conjunto 50); 3 RA para revisar» |
| **Cuidado** | La exigencia depende del nivel de formación: **comparar con matrices del mismo nivel**, no con las 50 | Selector «comparar con: todas / mismo nivel» |

---

## 5. Asignaturas compartidas

**Pregunta:** ¿Qué contenido comparte la institución, es el mismo contenido y qué hago con los casos distintos?

| | Conjunto | Matriz |
|---|---|---|
| **Visuales** | Barras «asignaturas por n.º de programas»; **núcleo común** (6 asignaturas × 29 pregrados / 0 posgrados); **tres núcleos de área** (Tabla 14); barras de consistencia (idénticas 133 / alta 11 / divergentes 15) | **Anillo «propias vs compartidas»** de las asignaturas de la matriz (núcleo común / compartida con otros programas / propia). **Lista de sus asignaturas homónimas con la similitud** y los programas con los que comparte |
| **Tablas** | 15 homónimas divergentes; 14 variantes de nombre; candidatos a homologación (con la unidad que reproduce las 203) | **Las divergentes que afectan a esta matriz** («Prácticas: 0,035 frente a 3 programas»); variantes de nombre propias (corrección inmediata); candidatos a homologación donde la matriz es parte |
| **Respuestas** | «¿Cuánto del catálogo es compartido?» | «¿Qué parte de esta matriz es común, qué parte es propia y cuál se parece poco a su homónima?» |
| **Insights** | **I5** (22,4 % de las denominaciones reúne 58 % de las asignaturas; 15 divergentes; 14 variantes; 189 candidatos) | «El 41 % de las asignaturas de esta matriz es núcleo común; 2 son divergentes» |
| **Cuidado** | Falsos positivos léxicos: aviso fijo en candidatos | Las sedes gemelas aparecen como «misma matriz», no como par |

---

## 6. Contenido y tendencias

**Pregunta:** ¿Qué se enseña y cuánto pesan las tendencias, más allá de que «aparezcan»?

| | Conjunto | Matriz |
|---|---|---|
| **Visuales** | **Tendencias: amplitud (programas) y profundidad (asignaturas)** con la barra apilada «en asignaturas propias / solo por el núcleo común / ausente» (Figura 6); la tendencia 15 rotulada «componente del currículo»; tópicos LDA con **etiqueta y confianza**; núcleos más frecuentes (con una sola cuenta por asignatura) | **Qué tendencias tiene la matriz y de dónde vienen** (barras por tendencia: asignaturas propias frente a núcleo común); **mezcla de tópicos de la matriz** (barras apiladas frente a la del conjunto); densidad de núcleos por asignatura (histograma con mediana del conjunto); mapa de integración **solo de esa matriz** |
| **Tablas** | Tendencia × programa; término‑clave por tendencia | Asignaturas que activan cada tendencia **con el fragmento de texto** (la evidencia ya existe en el Excel de tendencias) |
| **Respuestas** | «¿La IA y la sostenibilidad son profundas o amplias?» | «¿Esta matriz incorpora la IA en asignaturas propias o solo en la común?» |
| **Insights** | **I4** (IA 30/39; 21 solo por el núcleo común; 57 asignaturas = 3,5 %), **I9** (tópicos) | «IA: solo vía Análisis y Visualización de Datos»; «Sostenibilidad: 3 asignaturas propias» |
| **Cuidado** | Presencia declarativa por palabras clave, no calidad; la lista de tendencias es una decisión institucional | La densidad usa asignatura‑matriz (no nombre agregado) |

---

## 7. Atención y listados

**Pregunta:** ¿Qué corrijo primero y quién decide?

| | Conjunto | Matriz |
|---|---|---|
| **Visuales** | Semáforo matriz × criterio (V1–V5) ordenado por **porcentaje**, no solo por estado; conteo de acciones por tipo (perfil, RA, trazabilidad, indicadores, nombres, homologación) | **Plan de acción de la matriz:** lista corta ordenada, cada ítem con enlace a su evidencia (sección 2 a 6) |
| **Tablas** | **Libro «Anexos accionables» (7 hojas)** con cifras vigentes y hoja Léame | La misma lista filtrada a la matriz |
| **Descargas** | PDF general, ZIP de PDF, libro de anexos | **PDF de la matriz** (hoy es por programa) y Excel de la matriz |
| **Respuestas** | «¿Qué matrices necesitan más atención?» | «¿Qué le pido al equipo de este programa y con qué evidencia?» |
| **Insights** | **I2, I3, I5, I7** convertidos en listas nominales | Acciones **diferenciadas por causa** (p. ej. RA genérico frente a RA de programa) |

---

## 8. Método y datos

**Pregunta:** ¿Cómo verifico y reproduzco lo que veo?

- **Visuales:** ninguno; es la sección de verificación.
- **Contenido:** Explorar datos (filtro por matriz, tabla, CSV con **diccionario de datos**); versión y huella del método del perfil; validación registrada y su limitación; configuración de tendencias **con la regla de asignación** (nombre ≥ 1 término o contenido ≥ 2 puntos, sobre núcleos e indicadores); regla del núcleo común (mayor salto en el n.º de programas); calibración con referencia; lista de archivos y avisos de lectura.
- **Respuestas:** «¿Con qué parámetros se calculó?», «¿puedo reproducir esta cifra?».
- **Vista de matriz:** huella SHA‑256 del archivo, hojas leídas y filas descartadas.

---

## 9. Cómo se articulan las vistas (flujo de una pregunta)

1. Quien llega por el artículo abre **Conjunto** y encuentra sus cifras (I1…I14).
2. Quien llega por su programa elige la matriz en el **selector global** y recorre las secciones 1 → 7 con el mismo marco: *valor de la matriz · mediana del conjunto · «x de n» · lista nominal*.
3. De toda cifra de matriz se baja a su evidencia (un clic) y de toda lista se sube al conjunto («este caso es 1 de 98»).

## 10. Qué insights NO existen en la vista de matriz

| Insight | Por qué solo en conjunto |
|---|---|
| I8 Sin asociación entre variables; sin diferencias entre sedes | Requiere n ≥ 10 y varias matrices |
| Pregrado frente a posgrado | Compara grupos |
| I9 (pesos de tópicos del conjunto) | En la matriz se muestra su mezcla, no el peso institucional |
| I10 Corpus | Es una descripción del conjunto |

## 11. Impacto en el plan de implementación

La vista de matriz exige **tres cambios técnicos** que no están en el [Entregable 8](08_PLAN_IMPLEMENTACION.md):

1. **Selector global de matriz** y un contexto `referencia = conjunto completo` independiente del filtro (A‑3 lo cubre solo a medias).
2. **Calcular todo por unidad (matriz, asignatura)** y no por nombre o fila (A‑1 y A‑8).
3. **Persistir el cálculo por matriz** (V1–V5, perfil, exigencia, tendencias) para comparar sin recalcular. El perfil ya lo hace por huella de archivo; el resto no.

Para la versión HTML (`web/`) el mismo contrato aplica: el selector de matriz es el filtro principal y el conjunto, el valor por defecto.
