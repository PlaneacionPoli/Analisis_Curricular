# Paquete de reproducibilidad del artículo

Material de apoyo a la respuesta a los revisores (comentario 5). Documenta cómo se obtiene cada cifra del
manuscrito, con qué parámetros y en qué entorno, y cómo verificarla.

## 1. Entorno

- Python 3.14.3; versiones exactas en [`requirements-lock.txt`](../requirements-lock.txt). `requirements.txt` conserva
  los mínimos para instalar el aplicativo.
- Modelo de embeddings: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, revisión
  `e8f8c211226b894fcb81acc59f3b34ba3efd5f42`. Es un modelo de representación, no generativo, con pesos fijos.
- Modelo de spaCy: `es_core_news_sm` 3.8.0.
- Contenedor: [`Dockerfile`](../Dockerfile) y [`docker-compose.yml`](../docker-compose.yml).
- Semillas: LDA con 10 semillas fijas (consenso); bootstrap, permutaciones y simulaciones con la semilla 20261103.

## 2. Datos

| Insumo | Disponibilidad |
|---|---|
| 50 matrices curriculares (`data/raw/FORMATOS RA CICLO UNO RC/`) | No se publican por ser documentos institucionales. Disponibles a solicitud con autorización de la institución |
| Taxonomías de verbos (`assets/taxonomias/`) | En el repositorio |
| Lectura de referencia de V1 (`auditoria/referencia_asociacion_perfil.csv`) | En el repositorio, con la fuente de cada decisión |
| Diccionarios y reglas (`config.py`, `config_asociacion_perfil.json`, `config_tendencias.json`) | En el repositorio |
| Evidencia derivada (`auditoria/evidencia_*.json`) | Pendiente de autorización institucional para publicarla |

## 3. Verificación

```
python auditoria/scripts/reproducir_articulo.py             # compara las cifras del manuscrito con la evidencia
python auditoria/scripts/reproducir_articulo.py --ejecutar  # respalda la evidencia, la regenera y compara
```

Estado al 2026-11-05: **32 de 32 cifras coinciden** (`auditoria/verificacion_reproducibilidad.json`). En la
verificación se detectó y corrigió una evidencia desactualizada: `verificar_v3.py` deduplicaba los RA con la regla
D4 (341) y no con la D23 vigente (338). El resultado de V3 (100 %) no cambia.

## 4. Correspondencia entre resultados, scripts y evidencia

| Resultado | Script (`auditoria/scripts/`) | Evidencia |
|---|---|---|
| Corpus (Tablas 1 y 7) | `verificar_corpus.py` | `evidencia_corpus.json` |
| Etapa 2: núcleos y control | `control_reglas_nucleos.py` | `evidencia_control_nucleos.json` |
| Etapa 4, R1, R8.3: V1 | `asociacion_perfil_50_matrices.py` | `evidencia_asociacion_50_matrices.json` |
| Etapa 4: calibración de V1 | `calibrar_asociacion_perfil.py` | `evidencia_calibracion_asociacion.json` |
| R3: conformidad estructural | `verificar_v3.py` | `evidencia_v3.json` |
| R4: V4 | `v4_alternativas.py` | `evidencia_v4_alternativas.json` |
| R5: V5 | `verificar_v5.py` | `evidencia_v5.json` |
| R6 y R7 | `contrastes_r6_r7.py` | `evidencia_r6_r7.json` |
| R8.1: asignaturas compartidas | `verificar_r8.py` | `evidencia_r8.json` |
| R8.2: tendencias | `tendencias_r82.py` | `evidencia_tendencias_r82.json` |
| Validación de V1 (comentario 1) | `revisores_validacion_v1.py` | `evidencia_revisores_v1.json` |
| V2, R6, R7 con dependencia (comentarios 3 y 4) | `revisores_v2_r6_r7.py` | `evidencia_revisores_r.json` |
| Diagnósticos de los RA (comentario 3) | `revisores_v3_diagnosticos.py` | `evidencia_revisores_v3.json` |

## 5. Parámetros y umbrales (Tabla S2)

| Etapa | Parámetro | Valor | Estado |
|---|---|---|---|
| 2 | Núcleo de extensión atípica | > Q3 + 1,5 × RIC | Regla estadística convencional (Tukey, 1977) |
| 4 (V1) | Cobertura explícita | ≥ 0,25 | Calibrado por rejilla; validación dentro y fuera de la muestra |
| 4 (V1) | Cobertura parcial y similitud semántica | ≥ 0,05 y ≥ 0,58 | Calibrado; el componente semántico no mejora a la línea base léxica |
| 4 (V1) | Factor de rol; peso del núcleo; umbral y peso de contexto; longitud de raíz | 0,5; 3,0; 0,15 y 0,25; 6 | Fijados en el desarrollo, sin calibración formal |
| R4 (V4) | Recuperación de RA reformulados | Similitud ≥ 0,80 o coincidencia mutua ≥ 0,50 | Operativo |
| 5 | Homónima divergente | Similitud media < 0,60 | Operativo; sensibilidad 0,40–0,80: entre 6 y 19 de 159 |
| 5 | Homónima idéntica; variante de nombre; candidato a homologación | ≥ 0,95; ≥ 0,85; ≥ 0,60 | Operativos |
| 6 | Número de tópicos | k = 13 (rango 5–30; NPMI y estabilidad) | Seleccionado por criterio interno; consenso de 10 semillas |
| R8.2 | Asignación de tendencia | Término en el nombre o ≥ 2 puntos en el contenido | Regla fijada (D21) |

Sensibilidad de V1 a los umbrales: con cobertura explícita entre 0,15 y 0,35 y similitud entre 0,50 y 0,66, el
porcentaje de atributos sin alineación varía entre 1,9 % y 10,8 % (`evidencia_revisores_v1.json`).

## 6. Preprocesamiento (S5)

1. **Extracción** (Etapa 1): las hojas de los Pasos 1 a 5 se localizan por nombre y los encabezados por aproximación,
   sin corrección manual.
2. **Normalización**: minúsculas y sin tildes ni signos de puntuación. Los RA se deduplican por matriz con esa
   normalización (D23: 338 RA únicos).
3. **Núcleos temáticos** (Etapa 2): se separan por su numeración; un núcleo que ocupa varias líneas o contiene comas se
   conserva como unidad. En las celdas sin numeración se toma cada línea como un núcleo (D25: 6.684 núcleos).
4. **Exclusiones**: electivas sin contenido propio (141 asignaturas), la competencia genérica institucional y su RA en
   V1, y seis ítems del perfil que son cifras o etiquetas de nivel.
5. **Lematización** (V1 y LDA): spaCy `es_core_news_sm`; familias de palabras por raíz de 6 letras; equivalencias de
   dominio de `config_asociacion_perfil.json`.
6. **LDA** (Etapa 6): un documento por asignatura con sus núcleos lematizados, una matriz por programa (1.192
   documentos).

## 7. Decisiones metodológicas y uso de IAg

- Registro de decisiones con fecha y justificación: [`DEFINICIONES.md`](DEFINICIONES.md) (suplemento S4).
- Fases de desarrollo y revisión: [`FASES_PROYECTO.md`](FASES_PROYECTO.md).
- Inventario de uso de IA generativa (U1–U13): Tabla Z de la respuesta a los revisores (suplemento S6).

## 8. Limitaciones conocidas

- Las versiones de `requirements-lock.txt` corresponden a la reproducción verificada de noviembre de 2026; no consta el
  entorno exacto de las corridas de octubre.
- No se conservaron los prompts ni el registro de lo aceptado o ajustado en la revisión de las matrices con IAg (U1).
- Sin las matrices, un tercero puede inspeccionar el código y la evidencia, pero no regenerarla.
