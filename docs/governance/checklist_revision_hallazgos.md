# Checklist de Revisión de Hallazgos — Sistema de Análisis Microcurricular

**Propósito:** Este documento debe completarse y firmarse por Coordinación Académica antes de que cualquier hallazgo del sistema se use en una decisión formal de reforma curricular. El sistema calcula indicadores — no decide. Esta revisión introduce el punto de control humano entre "el sistema calculó X" y "se tomó una decisión basada en X".

---

## Datos de la corrida

| Campo | Valor |
|---|---|
| Fecha de la corrida | |
| Versión del código (git commit) | |
| Número de archivos procesados | |
| Archivos con errores (si alguno) | |
| Carpeta de salida usada | `data/output/` |
| Revisado por | |
| Cargo | |
| Fecha de revisión | |

---

## Sección 1 — Integridad del corpus de entrada

- [ ] Se verificó que los archivos Excel de entrada corresponden al ciclo curricular correcto
- [ ] Se confirmó el número de programas incluidos en la corrida
- [ ] Se revisó el log de corrida (`logs/`) y no hay errores sin explicar
- [ ] Si hubo archivos con errores: se documentó la razón y el impacto en el análisis consolidado

**Observaciones:**
> _(Escribir aquí cualquier anomalía en los datos de entrada o en el log de corrida)_

---

## Sección 2 — Revisión de indicadores de calidad

- [ ] Se revisaron los scores de calidad general (0–100) y se identificaron programas outlier (muy alto o muy bajo)
- [ ] Los outliers identificados tienen una explicación razonable (programa nuevo, datos incompletos, etc.)
- [ ] El balance de tipos de saber (Saber/SaberHacer/SaberSer) es coherente con la naturaleza de los programas
- [ ] La distribución de niveles Bloom no tiene concentraciones anómalas sin justificación

**Programas que requieren revisión manual:**
> _(Listar aquí los programas con indicadores fuera del rango esperado)_

---

## Sección 3 — Revisión de detección temática

- [ ] Se revisaron al menos 3 programas del golden set para confirmar que las temáticas detectadas son correctas
- [ ] Las temáticas con 0% de presencia en todos los programas se evaluaron manualmente (¿ausencia real o problema de keywords?)
- [ ] Las temáticas con 100% de presencia se verificaron en al menos un programa para confirmar que no es un falso positivo

**Observaciones sobre detección temática:**
> _(Especificar si alguna temática parece sobrestimada o subestimada y el motivo)_

---

## Sección 4 — Revisión de cobertura del perfil de egreso

- [ ] Se revisaron los programas con cobertura global < 70% para confirmar que las brechas son reales
- [ ] Los elementos del perfil con score 0.00 se revisaron manualmente en al menos una muestra (ver Pendiente 10 de NOTAS_REVISION_v2.md)
- [ ] Se confirmó que los umbrales de similitud aplicados (`UMBRALES_POR_CAMPO` en `config.py`) son apropiados para el corpus actual

**Brechas de perfil que requieren decisión curricular:**
> _(Listar aquí los elementos del perfil sin cobertura que se van a llevar a la reforma)_

---

## Sección 5 — Decisión y firma

**¿Los hallazgos son suficientemente confiables para informar decisiones de reforma curricular?**

- [ ] Sí — los hallazgos se pueden presentar a directores de programa y usar en el proceso de reforma
- [ ] Con reservas — los hallazgos se presentan con las siguientes advertencias: _____________
- [ ] No — se requiere repetir la corrida con ajustes antes de usar los resultados

**Firma del revisor:**

```
Nombre: ____________________________
Cargo:  ____________________________
Fecha:  ____________________________
```

---

## Historial de revisiones

| Fecha | Corrida | Revisado por | Resultado |
|---|---|---|---|
| | | | |
