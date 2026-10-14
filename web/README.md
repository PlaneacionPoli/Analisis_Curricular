# Análisis Microcurricular — versión HTML

Réplica del dashboard de Streamlit (`dashboard_tematico.py`) que corre 100 % en el navegador. Las matrices se leen
y se procesan localmente (Web Worker + IndexedDB); no se envían a ningún servidor.

## Comandos (en `web/`)

```
npm.cmd install
npm.cmd run dev      # desarrollo
npm.cmd run build    # genera dist/ (base relativa: sirve en GitHub Pages o Hugging Face static)
npm.cmd test         # paridad del consolidado con Streamlit (requiere tests/referencia.json)
node tests/paridad_perfil.mjs [--semantica]   # paridad del módulo Perfil (requiere tests/golden_perfil.json)
node tests/paridad_nucleos.mjs   # separación y limpieza de núcleos (requiere tests/golden_nucleos.json)
node tests/paridad_tendencias.mjs   # regla de asignación de tendencias (requiere tests/golden_tendencias.json)
node tests/paridad_taxonomias.mjs   # RA del Paso 3 y contraste con la base de verbos (requiere tests/golden_taxonomias.json)
node tests/paridad_nlp.mjs   # TF-IDF, n-gramas, similitud y grupos frente a scikit-learn (requiere tests/golden_nlp.json)
node tests/paridad_indicadores.mjs   # V2–V5, contrastes y valoración frente a src/indicadores_articulo.py (requiere tests/golden_indicadores.json)
node tests/paridad_validacion.mjs --semantica --calibrar   # acuerdo y calibración del perfil con auditoria/referencia_asociacion_perfil.csv (requiere tests/golden_validacion.json)
node tests/paridad_compartidas.mjs   # asignaturas compartidas, homónimas y pares frente a src/shared_subjects_analyzer.py (requiere tests/golden_compartidas.json)
```

Publicación en Hugging Face (Space estático, modelo y motor WASM): ver [HUGGING_FACE.md](HUGGING_FACE.md).

Regenerar la referencia de paridad (desde la raíz del repo): `python -X utf8 web/tests/exportar_referencia.py`.

### Módulo «Perfil de egreso»

`python -X utf8 web/tools/exportar_perfil.py` genera `public/data/` (léxico de lemas construido con spaCy, configuración del
método y verbos de respaldo) y `tests/golden_perfil.json` (resultado de referencia de `src/asociacion_perfil.py`).

El navegador no tiene spaCy: la lematización usa un **léxico forma → lema/categoría** y la similitud semántica usa el mismo
modelo (`paraphrase-multilingual-MiniLM-L12-v2`) con transformers.js. Los pesos (~120 MB cuantizados) se descargan una vez
desde Hugging Face Hub y quedan en la caché del navegador.

## Estado por fase

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Carga de matrices, limpieza, filtros globales, Inicio, Explorar Datos | Hecha (paridad verificada) |
| 2 | Tipo de Saber, Cobertura, Tendencias, Configurar Tendencias, Taxonomías y Minería de Texto (el LDA va en la fase 5) | Hecha |
| 3 | Indicadores V1–V5 (V1 se completa con el perfil ya calculado en el navegador) | Hecha |
| 4 | Perfil de Egreso (V1): lematizador y modelo semántico en el navegador | **En curso**: motor, vista de conjunto y de matriz y pruebas de paridad hechos; pestañas Resultados, Validar con referencia (acuerdo, κ y calibración de umbrales) y Método hechas; falta «Saberes y valor agregado» (complementaria, no forma parte de V1). Paridad con Python en 50 matrices: atributos 100 %, respaldo explícito 98,7 %, estado 98,0 %, V1 agregado ±0,1 pp. Con un léxico que no vio 12 matrices: atributos 100 %, respaldo explícito 96,5 % |
| 5 | Resumen Ejecutivo en pantalla y Familias Curriculares (hechos; sin LDA); pendientes: PDF formal y ZIP por programa, y el LDA de consenso | **En curso** |

## Notas

- `data/` no existe aquí: las matrices **nunca** se versionan (`.gitignore` bloquea `*.xlsx`, `*.csv`).
- Diferencia deliberada con Streamlit: se omiten los textos «85 % completado», «12 nuevas»… de las tarjetas de
  bienvenida, que en Streamlit son valores fijos y no reflejan los datos.
- Las columnas totalmente vacías y sin encabezado (`Unnamed: n`) se descartan al leer.
