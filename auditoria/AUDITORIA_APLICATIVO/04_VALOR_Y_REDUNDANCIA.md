# Entregable 4. Matriz de valor y redundancia

La clasificación **elemento por elemento** está en la columna «Clase» del [Entregable 2](02_INVENTARIO_SECCIONES.md) (120 elementos de pantalla, sin contar los 9 archivos de exportación, que se evalúan en el [Entregable 5](05_AUDITORIA_EXPORTACIONES.md)). Aquí se resume y se justifican las decisiones no obvias.

## 1. Resumen por sección

Clase **principal** de cada elemento (Esencial, Complementario, Operativo, Redundante, Confuso, Prescindible). La columna «con alerta» cuenta los elementos que, aunque tengan otra clase principal, llevan una marca de **Confuso**.

| Sección | Elementos | E | C | O | R | X | P | Con alerta «Confuso» |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Transversales (landing + globales) | 13 | 0 | 0 | 7 | 1 | 5 | 0 | 5 |
| Inicio | 12 | 3 | 3 | 4 | 1 | 1 | 0 | 2 |
| Resumen Ejecutivo | 14 | 6 | 4 | 2 | 1 | 0 | 1 | 3 |
| Tipo de Saber | 10 | 1 | 5 | 1 | 0 | 3 | 0 | 6 |
| **Indicadores V1–V5** | 11 | **11** | 0 | 0 | 0 | 0 | 0 | 1 |
| **Perfil de Egreso** | 13 | **8** | 1 | 3 | 0 | 0 | 1 | 0 |
| Cobertura Temática | 11 | 0 | 5 | 1 | 0 | **5** | 0 | 7 |
| Tendencias Globales | 8 | 1 | 3 | 0 | 1 | **3** | 0 | 4 |
| Minería de Texto | 7 | 1 | 3 | 1 | 1 | 0 | 1 | 3 |
| Taxonomías | 8 | 2 | 4 | 1 | 0 | 1 | 0 | 2 |
| Familias Curriculares | 6 | 2 | 2 | 0 | 1 | 1 | 0 | 1 |
| Configurar Tendencias | 4 | 0 | 1 | 2 | 0 | 1 | 0 | 1 |
| Explorar Datos | 3 | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| **Total** | **120** | **35** | **31** | **25** | **6** | **20** | **3** | **35** |

**Lectura.** El valor se concentra en **dos páginas**: Indicadores V1–V5 (11 de 11 elementos esenciales) y Perfil de Egreso (8 de 13). La mayor densidad de elementos confusos está en **Cobertura Temática, Tipo de Saber y Tendencias**, que son además las páginas donde la cifra de la aplicación se aparta del artículo. Aclaración: la fila «Transversales» agrupa 5 elementos de la landing (3 de ellos Confusos: hero con IA, «Estructura del archivo» incompleta y las tarjetas con cifras fijas) y 8 globales (2 Confusos: unidad de «asignaturas» y alcance de los filtros).

## 2. Elementos que merecen decisión explícita

| ID | Clase | Por qué | Decisión |
|---|---|---|---|
| LAN‑C1…C6 | Confuso / Prescindible | Cifras escritas a mano que parecen resultados («85 % COMPLETADO») | **Eliminar** o calcular |
| LAN‑T2 | Confuso | Promete IA y «tiempo real»; el artículo establece lo contrario | **Reescribir** |
| GLO‑X1 | Confuso | Filtros visibles que no actúan en V1–V5 ni Perfil | **Aplicar o avisar** |
| INI‑G3, TIP‑G1 | Redundante / Confuso | Misma medida (Paso 5) en dos páginas y distinta de la del artículo | **Consolidar** en una, con la unidad del artículo |
| TIP‑G2 (radar) | Confuso | Hasta 39 polígonos con 5 colores | **Retirar** |
| TIP‑T2, T3 | Confuso | El aviso de «paridad por plantilla» no aplica a los datos del Paso 5 (rango 24–64 %); las leyendas piden interpretar lo contrario | **Reescribir** |
| COB‑K1…K3, G2, G3 | Confuso | Triple conteo y agregación por nombre (H1) | **Corregir** (A‑1) |
| TEN‑T3 | Confuso | Otra regla de detección (IA: 1.196 frente a 42) | **Corregir** (A‑2) |
| TEN‑G2 | Confuso | Línea del 50 % sin criterio; el propio Resumen dice que no hay mínimo institucional | **Retirar la línea** |
| TEN‑G3 | Redundante | Mismos datos que TEN‑G2 en valores absolutos | **Fusionar** en una gráfica |
| MIN‑T2 | Redundante / Confuso | Tercer método para «asignaturas parecidas», sin el rigor del R8.1 | **Fusionar** con Familias |
| MIN‑G3 | Prescindible | 39 pestañas de términos por programa | **Selector** |
| FAM‑G1 | Redundante | Mismos datos que la tabla pivote | **Retirar** |
| FAM‑B2 (pares) | Confuso | 2.467 «pares candidatos» frente a 203 en el artículo | **Definir unidad** (A‑8) |
| TAX‑G4 | Confuso | «Verbos» de RA con el rótulo que el artículo usa para competencias | **Rotular / añadir** |
| TAX‑B4, EXP‑F5 | Confuso | `Saberhacer`/`SaberHacer` y `Saberser`/`SaberSer` | **Normalizar** |
| PER‑X1 | Prescindible | Página sin menú con la medida anterior | **Retirar** |
| RES‑X1 | Prescindible | Código después de `return` | **Retirar** |
| RES‑K6…K10 | Redundante | Repiten las tarjetas de V1–V5 | **Conservar como resumen de una línea** (la repetición sirve para resumir; la fuente es V1–V5) |

## 3. Redundancias (Fase 4)

| # | Dónde | Qué se repite | ¿Justificada? | Fuente principal | Acción |
|---|---|---|---|---|---|
| D1 | Inicio (INI‑G3), Tipo de Saber (TIP‑G1, K), PDF general «Perfil por programa» | Distribución de tipo de saber del Paso 5 | No | Tipo de Saber (rehecha con RA únicos) | Quitar de Inicio; el PDF usa la medida corregida |
| D2 | Resumen (RES‑K6…K10), V1–V5 (V15‑K2…K6), PDF, Perfil (V1) | Las cinco tarjetas V1–V5 | **Sí** (resumir) | V1–V5 | Mantener, con enlace |
| D3 | Resumen (RES‑G1, B3), V1–V5 (V15‑B1), PDF | Valoración por criterios | **Sí** (priorizar vs. detallar) | V1–V5 | Mantener; añadir % |
| D4 | Tendencias (G2, G3), Resumen (tabla) | % y n.º de asignaturas por tendencia | Parcial | Tendencias | Una gráfica con ambos rótulos |
| D5 | Minería (similitud), Familias (consistencia), Cobertura (mapa de integración) | Tres formas de decir «asignaturas parecidas», con métodos distintos | No | Familias (R8.1) | Fusionar; el mapa de integración queda como apoyo por programa |
| D6 | Familias (tabla pivote y mapa de calor) | Asignatura × programa | No | Tabla pivote | Retirar el mapa |
| D7 | Barra lateral y área principal | Lista de archivos fallidos | No | Área principal | Quitar la de la barra lateral |
| D8 | Cobertura (top núcleos), Minería (términos, n‑gramas), LDA | Cuatro vistas de «qué se enseña», con unidades distintas | Parcial | LDA + núcleos | Aclarar la unidad de cada una |
| D9 | Perfil (pestaña complementaria) y página oculta | Cobertura TF‑IDF + BM25 | No | Pestaña complementaria | Retirar la oculta |
| D10 | `data/output/` frente a la aplicación | Resultados de rondas anteriores | No | Aplicación | Marcar como obsoletos (A‑22) |

## 4. Consistencia de cifras, definiciones y universos

| Concepto | Aplicativo | Artículo vigente | Diagnóstico |
|---|---|---|---|
| Programas / matrices | 39 / 50 | 39 / 50 | ✔ consistente con la decisión de la autora |
| V1, V2, V3, V4, V5, 338 RA, 391 estrategias, R6, R7 | idénticos | — | ✔ reproducción exacta |
| Asignaturas | 734 nombres únicos; 1.614 por matriz | 1.616 sin electivas; 1.757 con electivas | Unidad distinta |
| Núcleos | 24.665 menciones; 3.020 únicos; 33,6 por asignatura | 6.684; 2.828; 4,1 | ✗ H1 |
| Tendencias (profundidad) | % de 734 nombres | % de 1.616 asignaturas (con y sin núcleo común) | ✗ H6 |
| Tendencias (regla) | 2 reglas en la misma página | D21 única | ✗ H2 |
| Tipo de saber | Paso 5, filas | RA únicos (Paso 3) | ✗ H4 |
| Homónimas / divergentes | 159 / 15 (media 0,926) | 159 / 15 (media 0,928) | ≈ (exacto con `_bloque_inicio`) |
| Pares de nombre distinto | 2.467 | 203 | ✗ H7 = H1 (exacto con `_bloque_inicio`) |
| Estado «Parcial» | 1 %–99 % | Cumple / Parcial / No cumple | Poca discriminación (H10) |
| V5 | «Evidencia N2+» = 95,4 %; criterio «indicador + instrumento» = 100 % | Ambas, descritas en la Etapa 3 | Dos medidas con la misma etiqueta |
| Filtros | No afectan V1–V5 ni Perfil | — | ✗ H3 |
| Datos faltantes | Registros sin semestre y asignaturas sin núcleos se informan con conteo ✔ | — | Buena práctica |
| Redondeos | Se muestran sin decimales (`%.0f`) en tarjetas y con 1 decimal en tablas | 1 decimal | Menor |

**No se asume que deban coincidir** el 1,8 % de la aplicación y el 3,5 % del artículo para IA: miden unidades distintas (nombres únicos frente a asignaturas por matriz). El problema es que **ninguna de las dos pantallas lo dice**.
