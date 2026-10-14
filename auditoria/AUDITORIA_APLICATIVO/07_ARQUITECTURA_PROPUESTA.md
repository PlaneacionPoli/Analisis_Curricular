# Entregable 7. Arquitectura de información propuesta

**Principio.** No se propone rediseñar: las 12 páginas aportan, y la mayoría de sus cálculos coinciden con el artículo. Se propone **ordenar por pregunta** (no por algoritmo), **mover** lo que está en la página equivocada, **fusionar** tres duplicidades y **añadir** lo que el artículo dice y la aplicación no deja ver. La secuencia narrativa sigue el esquema del encargo adaptado a los objetivos reales del artículo (asociación del perfil con competencias, RA y asignaturas).

## 1. Secuencia narrativa y menú

| # | Pregunta | Sección (nombre propuesto) | Origen | Cambio |
|---|---|---|---|---|
| 1 | ¿Qué se analizó? | **Inicio** | Inicio | Añadir tabla del corpus (matrices, competencias, RA únicos, estrategias, asignaturas por sede = Tabla 7) y composición por nivel de formación; **quitar** el pastel de tipo de saber; reescribir el aviso para nombrar V1–V5 |
| 2 | ¿Qué tan articulado está el currículo? | **Articulación curricular (V1–V5)** | Indicadores V1–V5 + mitad superior de Resumen Ejecutivo | Subir al segundo lugar. Orden interno: ruta de alineación → valoración por criterios → **condiciones del instrumento vs. articulación** → contrastes (R6/R7) con lectura en lenguaje llano |
| 3 | ¿Lo que promete el perfil se enseña? | **Perfil de egreso (V1)** | Perfil de Egreso | Mantener. Reordenar pestañas: Resultados → Detalle → Saberes y valor agregado; **mover** «Validar con referencia» y «Configuración» a «Método» |
| 4 | ¿Cómo están formulados los resultados de aprendizaje y qué evidencia declaran? | **Resultados de aprendizaje** | Taxonomías + Tipo de Saber + V5 | Fusionar **Tipo de Saber** aquí (con la unidad correcta: RA únicos, 47,6/36,4/16,0); verbos de **competencias**; niveles de evidencia N1–N5 **por estrategia** |
| 5 | ¿Qué contenido comparten los programas? | **Asignaturas compartidas** | Familias Curriculares | Añadir núcleo común institucional, núcleos por área y pregrado/posgrado; eliminar el mapa de calor duplicado; una sola vista de consistencia |
| 6 | ¿Qué se enseña y cuánto pesa cada tendencia? | **Contenido y tendencias** | Cobertura Temática + Tendencias + Minería (términos y LDA) | Una sola unidad de conteo; amplitud, profundidad y núcleo común; tópicos con etiqueta. Minería queda como pestaña «Términos y tópicos» |
| 7 | ¿Qué requiere atención y qué hago? | **Atención y listados** | Mitad inferior de Resumen Ejecutivo | Matrices que requieren atención, **anexos accionables** (7 listados), PDF, ZIP y Excel desde un solo lugar |
| 8 | ¿Cómo verifico la evidencia? | **Método y datos** | Explorar Datos + Configurar Tendencias + config. del perfil + validación | Diccionario de datos, versión y huella del método, regla de asignación de tendencias editable, calibración |

El menú pasa de 12 a **8** entradas, ninguna con descripción técnica («Minería de Texto») como rótulo principal.

## 2. Contenido de cada sección

### 1. Inicio
- **Debe comunicar:** corpus y alcance (50 matrices = 39 programas × sedes).
- **Contiene:** 7 tarjetas actuales + Tabla 7 + composición por nivel de formación + «Resumen por Programa» (créditos) **plegado** como control de calidad de la carga.
- **No contiene:** gráficas de tipo de saber; tarjetas de funcionalidad con cifras fijas.

### 2. Articulación curricular (V1–V5)
- **Debe comunicar:** I4‑I8 del catálogo (la articulación es alta, parte de lo que parece fortaleza es del instrumento, la trazabilidad tiene dos causas, la evidencia es indirecta, las variables no covarían).
- **Contiene:** KPIs V1–V5; ruta de alineación; valoración por criterios (**con % junto al estado**); «Lectura rápida»; tabla de V4 por clase de RA; **estrategias por nivel de evidencia**; contrastes con una frase interpretativa.
- **Texto fijo bajo la ruta:** «Gris = condición que impone la plantilla; no es un hallazgo sobre el diseño».
- **Filtros:** respeta los filtros globales (hoy no los respeta).

### 3. Perfil de egreso (V1)
- **Debe comunicar:** I1 e I2.
- **Contiene:** KPIs, respaldo por capa, estado por componente, indicadores por matriz, detalle con evidencia. **Añadir** el listado consolidado de los 98 atributos sin alineación (con programa, componente y contenido más cercano).
- **Nota de método visible junto a la cifra principal:** validación pendiente por el comité.

### 4. Resultados de aprendizaje
- **Debe comunicar:** I3, I11, I12, I13.
- **Contiene:** tipo de saber de **RA únicos** (con la nota «un RA de SaberSer se reutiliza en 3,4 competencias»); Bloom/BAK; dominio y nivel; verbos de competencias y verbos repetidos; exigencia (marcada como descriptiva); coherencia verbo‑nivel (marcada como **exploratoria** hasta validarla); niveles de evidencia N1–N5.
- **Se retiran:** radar de 39 polígonos; evolución por semestre del tipo de saber del Paso 5 (pasa a Explorar como filtro).

### 5. Asignaturas compartidas
- **Debe comunicar:** I5.
- **Contiene:** métrica de asignaturas compartidas con su denominador; núcleo común institucional; tres núcleos de área; consistencia (tres niveles); lista de las 15 divergentes; 14 variantes de nombre; candidatos a homologación (con la **unidad definida** que reproduzca la Tabla 13 del Word; ver H7 y A‑8).
- **Se retira:** mapa de calor asignatura × programa (repite la tabla pivote).

### 6. Contenido y tendencias
- **Debe comunicar:** I4 e I9.
- **Contiene:** tendencias con **amplitud (programas)**, **profundidad (asignaturas)** y **«solo por núcleo común»**; la 15.ª (formación ciudadana, humanística, investigativa y práctica) rotulada como «componente del currículo», como en el Word; cobertura temática con una sola cuenta por asignatura; mapa de integración **por programa**; tópicos LDA con etiqueta y confianza; términos clave como apoyo.
- **Se retiran:** gráfica de barras de n.º de asignaturas (duplica la de %), línea del 50 % sin criterio, 39 pestañas de términos por programa.

### 7. Atención y listados
- **Debe comunicar:** qué se corrige primero y quién decide.
- **Contiene:** matrices que requieren atención; «Anexos accionables» (siete hojas con las cifras vigentes) con hoja Léame; PDF general, PDF por programa y ZIP.

### 8. Método y datos
- **Contiene:** Explorar datos con diccionario; versión y huella del método del perfil; validación registrada y su limitación; configuración de tendencias **incluida la regla de asignación**; calibración con referencia; descarga de configuraciones.

## 3. Filtros

| Filtro | Alcance | Regla |
|---|---|---|
| Programa, Modalidad, Sede, Nivel | **Global** (todas las secciones, incluidas V1–V5 y Perfil) | Si una sección no admite filtro, se muestra un aviso en su encabezado |
| Matriz (programa‑sede) | Local en Perfil, Articulación y Atención | Selector con etiqueta «programa – modalidad – sede» |
| Tendencia, tópico, asignatura | Local | Navegación desde el resumen hacia el detalle |

## 4. Navegación entre agregado y detalle

Cada cifra clave debe llevar a su evidencia: V1 → atributos sin alineación → evidencia textual; V4 → RA sin estrategia; V5 → estrategias por nivel; «15 divergentes» → tabla de asignaturas; «IA 30/39» → programas y asignaturas que la activan, con su fragmento de texto (ya existe en el Excel de tendencias; llevarlo a pantalla).

## 5. Requisitos de trazabilidad y consistencia

1. **Una unidad por cifra, declarada** (asignatura = registro de matriz sin electivas = 1.616; RA = único por matriz = 338; programa = 39; matriz = 50).
2. **Una sola regla por concepto** (tendencias, similitud de asignaturas, tipo de saber).
3. **Prueba automática de cifras del artículo** (ver Entregable 8, A‑21): V1–V5, 338 RA, 6.684 núcleos, 159/15 homónimas, 30/39 programas con IA.
4. **Nota de método visible** donde la cifra depende de un umbral no calibrado (0,60 de similitud) o de una referencia no validada (V1).
5. **Sin valores escritos a mano** en tarjetas o textos.
