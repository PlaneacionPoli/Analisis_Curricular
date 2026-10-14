# Anexo. Revisión del código que generó los resultados del artículo

**Alcance.** Se revisó el flujo que produce `Resultados_consolidado.docx` y el Excel de auditoría: `generar_word_resultados.py` (completo), `textos_articulo.py` (cifras), `verificar_r8.py`, `tendencias_integradas.py` y `tendencias_r82.py` (cabeceras y lógica), y la estructura de `generar_entregables.py` / `generar_excel.py`. **No se leyeron línea a línea** `generar_entregables.py` (1.252 líneas) ni los scripts de calibración del perfil; ver sección 6.

## 1. Cómo se produce el Word

```
matrices .xlsx ──► (lector A) scripts verificar_*.py / tendencias_*.py ──► evidencia_*.json / .xlsx
              └──► (lector B) generar_word_resultados.py (openpyxl propio) ──► Figuras 2 y 3
textos_articulo.py (cifras escritas a mano) ─┐
figuras/*.png (generadas por otros scripts) ─┼──► generar_word_resultados.py ──► Resultados_consolidado.docx
```

- **Las cifras del texto son cadenas fijas** (`textos_articulo.py`). No se generan desde la evidencia.
- **Solo dos figuras se calculan en el propio generador** (Figura 2 verbos de competencias, Figura 3 tipo de saber de RA únicos). Las demás (1, 4, 5, 6, 7) son PNG preexistentes que el generador pega sin comprobar que coincidan con el texto.
- **Hay al menos tres lectores de las matrices:** `ExcelExtractor` (src), `procesar_archivos` (dashboard) y un `openpyxl` directo en `generar_word_resultados.py`; más `pd.read_excel` sobre `Tendencias_integradas_15.xlsx` en `tendencias_r82.py`.

## 2. Verificación de las cifras del Word contra su evidencia

Se extrajeron las **323 cifras** (con decimales, miles o ≥ 3 dígitos; sin años) de `textos_articulo.py` y se buscaron entre los valores de todos los `evidencia_*.json` y de las recalculaciones de esta auditoría.

- **297 de 323 (92 %) se encuentran** en la evidencia o en el recálculo.
- De las **23 cifras distintas no halladas**, 15 son citas, DOI, páginas o el identificador del modelo. Quedan **8 cifras de resultados** (seis filas):

| Cifra del Word | Estado |
|---|---|
| 99,5 % de indicadores indirectos | ✔ derivada: (808 + 371) / 1.185 |
| 373 estrategias (95,4 % de 391) | ✔ derivada: 391 × 0,954 |
| 997 núcleos marcados por Isolation Forest (contaminación 0,15) | Prueba descrita en *Observaciones*; no verificada |
| 96,0 % del perfil ocupacional (97,4 % del profesional) | Pendiente (ver sección 4) |
| 786 atributos parciales (30,5 %) | Pendiente (ver sección 4) |
| Tópicos de 12,2 % y 2,9 % | Pendiente (ver sección 5) |

Además se comprobó **con código independiente del texto**: 222 competencias y los verbos de la Figura 2 (*Analizar* 50 con 40 genéricas, *Dominar* 26, *Aplicar* 22, *Implementar* 20, *Desarrollar* 19, *Diseñar* 19) ✔; tipo de saber 47,6 / 36,4 / 16,0 ✔; IA 57 asignaturas (3,5 %), 30 programas, 21 solo por el núcleo común, 7 integrada propia, 2 dedicada ✔ (`evidencia_tendencias_r82.json`); 98 sin alineación ✔.

> Nota: la primera búsqueda por literal sugería que «57 de 1.616» y «27,7 %» no tenían respaldo; sí lo tienen (`evidencia_tendencias_r82.json` guarda enteros y porcentajes con otro formato). El método de búsqueda inicial era demasiado estricto.

## 3. Hallazgos sobre el código de resultados

| ID | Hallazgo | Riesgo |
|---|---|---|
| R‑1 | **Cifras escritas a mano** en `textos_articulo.py`. Nada impide que el Word quede desactualizado tras un recálculo | Alto: es exactamente lo que ocurrió con `anexos_accionables.xlsx` y el `.md` anterior |
| R‑2 | **Tres lectores distintos** (ExcelExtractor, `procesar_archivos`, openpyxl directo). Las funciones compartidas asumen el formato del primero. Explica la discrepancia de las 203 parejas y el triple conteo (H1, H7) | Alto |
| R‑3 | **Figuras PNG preexistentes** pegadas sin vínculo con el texto: la nota de la Figura 6 dice «39 programas… 1.616 asignaturas» pero el generador no verifica que el PNG se haya generado con esa base | Medio |
| R‑4 | **Curaduría manual dentro del código** de `tendencias_r82.py`: `IA_SOLO_MENCION`, `IA_DEDICADA` e `IA_COMUN` son listas escritas a mano (el Word lo declara solo para IA) | Medio: justificado, pero debería documentarse como decisión (D30) |
| R‑5 | **El núcleo común se calcula** (mayor salto en el n.º de programas) y no se fija: correcto y reproducible, pero la regla **no está en la aplicación** | Bajo; resuelve la dependencia de A‑4 |
| R‑6 | La asignación de tendencias del artículo usa **nombre + núcleos + indicadores**; el dashboard usa además el texto de los **RA** y el **Proceso Responsable** | Medio: 4 de 15 tendencias difieren en un programa (T02 36 frente a 35, T07 35 frente a 34, T08 22 frente a 21, T15 34 frente a 33) |
| R‑7 | La Etapa 4 del Word menciona la lectura de referencia «asistida por IAg»; el JSON de evidencia y la configuración lo repiten, pero el Excel de auditoría (`Hallazgos`) no distingue las 40 decisiones revisadas de las 389 asistidas | Bajo |

## 4. Pendiente: perfil por tipo de perfil y atributos parciales
*(se completa abajo con el cálculo en curso)*

## 5. Pendiente: LDA con el corpus corregido
Corpus del dashboard: **5.959 documentos** (3 filas por asignatura, sin filtrar sedes) frente a **1.192** del Word. Con `_bloque_inicio` y una matriz por programa: **1.190**. La leyenda del dashboard («una matriz por programa») **no se cumple** porque el DataFrame del dashboard no trae la columna `Archivo`.
*(los porcentajes de los tópicos se completan abajo)*

## 6. Lo que sigue sin revisarse
`generar_entregables.py` (1.252 líneas: listas A, DECISIONES, PROCEDIMIENTO), `generar_excel_v5.py`, `actualizar_manuscrito.py`, y los scripts de calibración y asociación del perfil (el método se evaluó por su salida). Ya existen respaldos de salida (V1 reproducido en `v1.json`), pero no se auditó el código que calibró los parámetros.
