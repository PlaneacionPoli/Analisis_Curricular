# Publicar en Hugging Face (Space estático)

La versión HTML es un sitio estático: no necesita servidor. Va en un **Space propio de tipo `static`**, distinto del Space de Streamlit (el `Dockerfile` de la raíz).

## 1. Crear el Space

1. En Hugging Face: *New Space* → SDK **Static**.
2. El repositorio del Space debe tener el **contenido de `web/` en su raíz** (con `package.json` y `package-lock.json`). Por ejemplo, desde la raíz de este repo:
   `git subtree push --prefix web <url-del-space> main`
3. El `README.md` del Space lleva este encabezado (el `README.md` de `web/` no lo tiene para no alterar su vista en GitHub):

```yaml
---
title: Análisis Microcurricular
emoji: 🎓
colorFrom: blue
colorTo: indigo
sdk: static
app_build_command: npm ci && npm run build
app_file: dist/index.html
pinned: false
---
```

`app_build_command` y `app_file` son los parámetros documentados para Spaces estáticos: Hugging Face ejecuta el comando en cada actualización y sirve `dist/`. **Verificar en el primer despliegue** que el entorno de compilación instala las dependencias (por eso el comando incluye `npm ci`).

No agregar `custom_headers` de aislamiento (COOP/COEP): bloquearía la descarga del modelo desde el Hub si ese servidor no envía las cabeceras de recursos que exige. Sin aislamiento el modelo corre con un solo hilo; está medido más abajo.

## 2. Qué se sirve y qué se descarga

| Elemento | Origen | Tamaño |
|---|---|---|
| Aplicación (JS, CSS, datos) | el propio Space | ≈ 7,6 MB |
| Motor WASM de onnxruntime (`public/ort/`) | el propio Space; lo copia `scripts/copiar_wasm.mjs` antes de `dev` y `build` | 21,6 MB, solo si se usa el modelo |
| Modelo `Xenova/paraphrase-multilingual-MiniLM-L12-v2` (cuantizado) | Hugging Face Hub, una vez por navegador | ≈ 120 MB |

Las matrices **no** se envían a ningún servidor: se leen y se procesan en el navegador.

## 3. Modo del perfil

Antes de descargar nada, el Perfil de egreso pregunta cómo calcular:

- **Con el modelo semántico** (recomendado): reproduce el método del artículo, incluidas las asociaciones «parciales».
- **Solo léxico**: sin descarga y más rápido, pero sin asociaciones parciales; coincide con el método completo en ≈ 66 % de los atributos. La elección se recuerda en el navegador y se puede cambiar (hay un botón de recálculo en las matrices calculadas sin modelo).

## 4. Medición en navegador (Chrome, un solo hilo, sin aislamiento)

- Carga del modelo con el motor WASM propio: ≈ 5 s con los archivos del modelo ya en caché del navegador (la primera descarga de 120 MB depende de la conexión y no se midió).
- Cálculo del perfil de una matriz con modelo: del orden de 1 a 3 s por matriz (matrices de 37 y 75 atributos). Indicativo: no es un promedio de las 50 matrices.

## 5. Antes de publicar

- Probar el Space dentro de su iframe en `huggingface.co/spaces/...` y también en la URL directa `*.hf.space`: el almacenamiento local y las descargas pueden comportarse distinto (Safari).
- Revisar que el repositorio del Space solo tenga el código de `web/`. Los repositorios de GitHub son públicos y el de la raíz ya rastrea otros archivos institucionales (versiones del artículo, CSV de `auditoria/`, hojas de `assets/taxonomias/`).
- `public/data/lexico_es.json` es un léxico de palabras sueltas extraído de las matrices; conviene que quien administra los datos lo apruebe.
