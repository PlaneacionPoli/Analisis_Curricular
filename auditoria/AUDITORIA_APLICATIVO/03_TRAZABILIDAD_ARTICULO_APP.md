# Entregable 3. Matriz de trazabilidad artículo ↔ aplicativo

**Fuente del artículo:** `auditoria/Resultados_consolidado.docx` (vigente). El `articulo_curricular_IA.md` es anterior a D23–D30 y **no** se usó como referencia de cifras; sus diferencias se anotan al final.

**Cómo se verificó.** Las funciones reales del aplicativo (`procesar_archivos`, `analizar_*`, `src.indicadores_articulo`, `src.asociacion_perfil`, `src.taxonomias_ra`, `src.shared_subjects_analyzer`) se ejecutaron sobre las **50 matrices de `data/raw/FORMATOS RA CICLO UNO RC`** (50 archivos, 0 fallidos, 39 programas). ✔ = coincide con el Word; ✗ = no coincide; ≈ = coincide con diferencia explicada.

**Estados:** **A** Representado adecuadamente · **P** Parcialmente · **N** No representado · **S** Representado sin sustento visible suficiente · **I** Inconsistente.

---

## 1. Resultados (R1–R8)

| # | Hallazgo del artículo | Evidencia (Word) | Sección y elementos del aplicativo | Verificación con el código | Estado | Observación |
|---|---|---|---|---|:-:|---|
| 1 | Corpus: 50 matrices, 39 programas, 222 competencias, 338 RA únicos, 391 estrategias, 1.757 asignaturas | Tabla 7 | Inicio (INI-K1, K2, G1); Resumen (RES-K) | ✔ 50 / 39 / 222 / 338 / 391. Asignaturas: la app cuenta **734 nombres únicos** o 1.614 bloques (≈ 1.616 sin electivas) | **P** | No hay tabla por sede con competencias, RA, estrategias y asignaturas; la unidad «asignatura» difiere (H6, GLO‑K1) |
| 2 | **V1 = 96,2 %** de 2.574 atributos con alineación en ≥ 1 capa; 65,7 % en las tres; 3,8 % (98) sin alineación | R1, Tabla 8 | Perfil de Egreso (PER‑K, G1, G2, B1); Indicadores V1–V5 (V15‑K2) | ✔ 2.574 / 96,2 / 65,7 / 3,8 (98); competencias 75,6 · RA 72,4 · asignaturas 95,2 | **A** | La referencia de calibración (asistida por IAg, no validada) **se declara** en PER‑T1 |
| 3 | V1 por matriz: 87,2–100 %, mediana 97,3 %, 12 matrices al 100 % | R1 | PER‑B1; V15‑B2 | ✔ 87,2 / 100 / 97,3 / 12 | **A** | |
| 4 | Perfil profesional 97,4 % y ocupacional 96,0 % (Tabla 8 por perfil) | Tabla 8 | PER‑B2 permite filtrar por perfil, no hay tabla agregada | no recalculado | **P** | |
| 5 | La competencia de referencia de cada RA está en 338/338 RA (instrumento) | R1 | Ruta de alineación (V15‑G1, tramo gris) | ✔ 100 % | **A** | La caption explica «gris = condición de la plantilla» |
| 6 | **V2 = 90 %**: 5 matrices de 3 programas repiten verbo | R2 | V15‑K3; columna «Verbos repetidos» | ✔ 90,0 / 5 / 3 | **A** | |
| 7 | Verbos de competencias: *Analizar* 50 (40 en la genérica); *Dominar* 26, *Aplicar* 22 | R2, Figura 2 | Ninguna (la pestaña «Verbos» de Taxonomías usa verbos de **RA**, Paso 3) | — | **N** | H11 |
| 8 | Tipo de saber de **RA únicos**: 47,6 / 36,4 / 16,0 %; SaberSer se reutiliza 3,4 veces | R2, Figura 3 | Taxonomías (dominio) reproduce la cifra pero sin rótulo «tipo de saber»; la página **Tipo de Saber** muestra otra cosa | ✔ 47,6 / 36,4 (20,4 + 16,0) / 16,0 con la columna partida por mayúsculas; Paso 5 (app): 42,5 / 40,3 / 17,2 | **I** | H4, H5: dos medidas con el mismo nombre; la del artículo no está rotulada |
| 9 | **V3 = 100 %** (estructural; no distingue entre programas) | R3 | V15‑K4 + ruta | ✔ 100 | **A** | El Resumen muestra «100 %» sin la aclaración |
| 10 | **V4 = 87,0 %** (294/338); 98,0 % RA de programa; 5,0 % genérico; 44 sin estrategia (38 genérica, 6 programa) | R4, Tabla 9 | V15‑K5, B3, expander de 6 RA | ✔ 87,0 / 98,0 / 40 genéricos con 2 estrategias / 44 / 6 | **A** | Falta la distribución por sede de la Tabla 9 |
| 11 | RA del Paso 4 emparejados por similitud ≥ 0,80; con coincidencia exacta V4 = 81,7 % | R4 | Ninguna | — | **N** | Información de método |
| 12 | **V5**: 100 % cumplen requisito (391 estrategias, 1.185 indicadores); **95,4 %** con N2 o superior; **0,8 %** (3) evidencia directa | R5 | V15‑K6, B4; PER ninguna | ✔ 95,4 / 3 de 391 / 0,8 / 1.185 | **A / P** | La app muestra **indicadores** por nivel (808 / 371 / 5 / 0 / 1 ✔), no **estrategias** por nivel (Tabla 10: 18 / 369 / 3 / 0 / 1); el 0,8 % solo aparece en la ayuda de la tarjeta |
| 13 | 99,5 % de los indicadores es evidencia indirecta (Discusión 4.2) | D2 | V15‑B4 | ✔ (808 + 371) / 1.185 | **A** | |
| 14 | **R6**: seis correlaciones de Spearman no significativas | R6 | V15‑B5 | ✔ las seis ρ y p coinciden (p. ej. V1–V4 ρ = −0,17; p = 0,240) | **A** | Sin lectura en lenguaje llano |
| 15 | **R7**: Kruskal‑Wallis sin diferencias entre sedes (n = 49) | R7 | V15‑B6 | ✔ H y p coinciden (V1 0,84 / 0,841; V2 2,64 / 0,451; V4 3,86 / 0,277; V5 1,57 / 0,667) | **A** | Falta Tabla 11 (mediana y rango por sede) |
| 16 | 159 denominaciones (22,4 %) en > 1 programa; 937/1.616 asignaturas (58,0 %) | R8.1 | Familias (FAM‑K1) | ≈ 158 de 734 nombres (21,5 %); no calcula el 58,0 % | **P** | Diferencia de 1 por normalización de nombres (el `.md` anterior ya mostraba 158/726) |
| 17 | **Núcleo común institucional:** 6 asignaturas en 29 pregrados y en ningún posgrado | R8.1 | Ninguna | — | **N** | |
| 18 | Homónimas: 159; 133 idénticas; 11 alta; **15 divergentes**; media 0,928 | R8.1, Tabla 12 | Familias → Homónimas (FAM‑B2) | ✔ 159 / 15 divergentes. Tal como está: media 0,926 e idénticas 134; con `_bloque_inicio`: **0,928 y 133 (exacto)** | **A** | La pequeña diferencia viene del mismo defecto (H1) |
| 19 | **203** pares de nombre distinto y contenido similar; 14 variantes; 189 candidatos | R8.1, Tabla 13 | Familias → «Nombre distinto…» | ✗ la app muestra **2.467**. Con `df[df['_bloque_inicio']]` da **203** (idéntico al Word y a `verificar_r8.py`) | **I** | H7 = H1: el dashboard no pasa el DataFrame en el formato que espera `consolidar_asignaturas` |
| 20 | Núcleos de área (Tabla 14): ingeniería y computación, administración‑economía‑finanzas, diseño | R8.1 | Ninguna | — | **N** | |
| 21 | **LDA k = 13**; 1.192 asignaturas; tópico 1 en 27,7 % (Tabla 15) | R8.2 | Minería de Texto → LDA (MIN‑B1) | no recalculado (tarda minutos); `CONSENSO_LDA` k = 13, 10 semillas ✔ | **P / S** | Sin etiquetas interpretativas ni aviso de confianza media 0,42 |
| 22 | **IA en 30 de 39 programas (76,9 %)**; sostenibilidad 31 (79,5 %); innovación educativa 33,3 %; talento humano y operaciones 41,0 % | R8.2 | Resumen → expander de tendencias (columna «Programas») | ✔ 30 / 31 / 13 (33,3 %) / 16 (41,0 %) / 16 (41,0 %); formación ciudadana: app 34 frente a 33 del Word | **A / P** | La amplitud sí coincide; la **profundidad** usa otro denominador (H6) |
| 23 | IA: 21 programas **solo por el núcleo común**; 9 en asignaturas propias; 57/1.616 asignaturas (3,5 %) | R8.2 | Ninguna | app: 13 asignaturas únicas (1,8 %) | **N / I** | Es el hallazgo central de R8.2 y no se puede descubrir (H6) |
| 24 | Tendencias con mayor profundidad: marketing 16,1 %, transformación digital y datos 15,8 %… | R8.2 | Tendencias → «Cobertura por tendencia» | app: marketing 28,6 %, transformación digital 22,9 % | **I** | Mismo nombre («cobertura/profundidad»), denominador distinto (734 nombres) |
| 25 | Densidad declarativa: **4,1 núcleos por asignatura** (mediana 4); 6.684 núcleos (2.828 únicos) | Etapa 2, R8.2 | Cobertura Temática (COB‑K1…K3) | ✗ app: 33,6 por asignatura; 24.665 menciones; 3.020 únicos | **I** | H1: triple conteo y agregación por nombre |
| 26 | 98 atributos sin alineación (3,8 %); 786 parciales (30,5 %); poblaciones de actuación 10,9 %; 12 matrices al 100 % | R8.3, Tabla 16 | Perfil: PER‑G2, PER‑B1, expanders | ✔ 98 y 12; parciales y 10,9 % no recalculados | **A / P** | No existe el listado **consolidado** de los 98 (solo por matriz) |
| 27 | Tres tipos de vacío (docencia, dirección, poblaciones vulnerables) y escenarios (casinos, cruceros) | R8.3 | Se infieren leyendo el detalle por matriz | — | **S** | Es una lectura cualitativa del autor; la app entrega la evidencia pero no la síntesis |
| 28 | Taxonomías: Bloom 48,5 % (164) / BAK 51,5 % (174); 26 matrices mixtas | Etapa 3, Tabla 4 | Taxonomías (TAX‑K2, K3, G1) | ✔ 164 / 174 / 26 | **A** | |
| 29 | Índice de exigencia 49,8 y coherencia verbo‑nivel 67,8 % | **No reportado** en Resultados | Taxonomías (TAX‑K4, K5, G3) | ✔ 49,8 / 229 coinciden de 338 (67,8 %) | **—** | Resultado de la app **sin explicación** en el artículo |
| 30 | Valoración por criterios sin puntaje compuesto (Cumple / Parcial / No cumple) | Etapa 3 | Resumen (RES‑G1, B1); V15‑B1 | por código ✔ (regla 100 % / 0 % / intermedio) | **A / X** | «Parcial» abarca de 1 % a 99 % (H10) |
| 31 | Medida complementaria: saberes y valor agregado con TF‑IDF + BM25, umbrales 0,35 / 0,32 / 0,30 | Etapa 4 | Perfil → pestaña complementaria (PER‑T3) | umbrales ✔ por código | **A** | Coherente con la advertencia «no forma parte de V1» |
| 32 | Listados nominales como producto útil (Discusión 4.4): 15 divergentes, 14 variantes, 98 sin alineación | D4 | Tablas dispersas; `anexos_accionables.xlsx` con cifras anteriores | ✔ 15; ✔ 98; 14 no verificable (H7) | **P** | No hay exportación consolidada vigente (H12) |

## 2. Discusión y riesgos (4.5)

| # | Planteamiento | En el aplicativo | Estado |
|---|---|---|:-:|
| 33 | El puntaje académico de los núcleos no es neutral por campo y debe eliminarse | No se muestra en pantalla ✔; permanece en `nucleos_cleaner` | **A** |
| 34 | Celdas combinadas descartaban 2 de cada 3 registros → se propaga el valor | Se propaga ✔, **pero** no se distingue el bloque original (`_bloque_inicio` sin uso) y reaparece el triple conteo | **I** (H1) |
| 35 | Semestres en romanos (59 asignaturas) | Normalizados ✔ | **A** |
| 36 | Control humano efectivo: 189 candidatos exigen tiempo experto | La app muestra 2.467 filas sin priorizar | **I** (H7) |
| 37 | La lista de tendencias participa en configurar el currículo y debe deliberarse | Se puede editar (CFG), pero la **regla de asignación** no se muestra | **P** |

## 3. Resultados de la aplicación sin explicación en el artículo

Índice de exigencia y coherencia verbo‑nivel (Taxonomías) · distribución de tipo de saber del Paso 5, radar y evolución por semestre · términos clave, n‑gramas, «grupos temáticos» y «par más similar» de asignaturas · mapa de integración y matriz de núcleos compartidos · diversidad de Shannon (95,9).

## 4. Diferencias con el `articulo_curricular_IA.md` anterior

El `.md` (V1 = 100 % «saturada», 77,8 % de V5, 93,4/100 de diversidad y 9,8 núcleos por asignatura, 289 elementos del perfil sin respaldo) **no corresponde a lo que calcula hoy el aplicativo** ni al Word vigente. Si alguien consulta ese archivo creerá que la aplicación «no coincide»; conviene archivarlo o marcarlo.

## 5. Cobertura

De las 32 filas de la sección 1 (se cuenta el primer estado cuando hay dos): **16 A** (50 %), **5 P**, **5 N**, **4 I**, **1 S** y 1 sin clasificar (fila 29: resultado de la aplicación que el artículo no reporta). Las cuatro inconsistencias (filas 8, 19, 24, 25) y la mayoría de las ausencias (verbos de competencias, núcleo común, núcleos de área, amplitud/profundidad con núcleo común) se concentran en el **contenido declarado (R8)** y en el **tipo de saber**; las variables **V1–V5, R6 y R7 se reproducen exactamente**.
