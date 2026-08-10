# Política de Retención de Datos — Sistema de Análisis Microcurricular

**Versión:** 1.0  
**Fecha:** 2026-08-10  
**Responsable:** Investigadora principal

---

## 1. Datos de entrada (`data/raw/`)

| Tipo | Retención | Acción al vencimiento |
|---|---|---|
| Archivos Excel de programas (`.xlsx`) | Permanente mientras el programa esté vigente | Mover a `data/archivo/` al retirar el programa |
| Taxonomías (`Taxonomias.xlsx`, `Taxonomias_MatrizBD.xlsx`) | Permanente | Actualizar en repositorio al cambiar taxonomía |

Los archivos `.xlsx` de programas **no se commitean al repositorio** (listados en `.gitignore`) por contener información curricular institucional. Se almacenan en el equipo de la investigadora y en la carpeta compartida de Coordinación Académica.

---

## 2. Datos de salida (`data/output/`)

Cada corrida de `run_analysis.py` genera una subcarpeta con timestamp:

```
data/output/
  20260810_143022/    ← corrida más reciente
  20260801_090015/
  20260715_161200/
  ...
```

**Regla de retención:**

| Antigüedad | Acción |
|---|---|
| Últimas 5 corridas | Conservar siempre |
| Corridas entre 5 y 10 | Conservar si están marcadas como `completada=1` en SQLite |
| Corridas > 10 | Eliminar manualmente; solo conservar si tienen un reporte firmado por Coordinación Académica |
| Corridas con `completada=0` (interrumpidas) | Eliminar tras 7 días |

**Procedimiento de limpieza** (ejecutar mensualmente):

```python
# Listar corridas desde el tracker
from src.run_tracker import RunTracker
tracker = RunTracker()
corridas = tracker.listar_corridas(limite=50)
for c in corridas:
    print(c['id'], c['timestamp'], c['output_dir'], c['completada'])

# Eliminar carpeta de corrida antigua (Windows)
# rmdir /s /q data\output\20260715_161200
```

---

## 3. Base de datos de corridas (`data/microcurricular.db`)

- Retención: indefinida (archivo SQLite de <1 MB, crece ~1 KB por corrida)
- El archivo **no se commitea** (excluido por `.gitignore` — `*.db`)
- Incluir en el backup de `data/` junto con los Excel

---

## 4. Logs (`logs/`)

| Tipo | Retención |
|---|---|
| `logs/analisis_*.log` | 30 días |
| Logs de corridas con error | 90 días |

Los logs no contienen datos personales ni información curricular sensible — solo metadatos de ejecución (nombres de archivos, tiempos, scores).

---

## 5. Datos procesados (`data/processed/`)

Actualmente no se generan archivos en esta carpeta. Si se implementa en el futuro (cache de embeddings, modelos LDA serializados), aplicar retención de 90 días o la duración del proyecto de reforma curricular, lo que sea menor.

---

## 6. Datos de Docker

- Las imágenes Docker **no deben incluir** archivos de `data/raw/` (los `*.xlsx` están en `.dockerignore`)
- Los volúmenes montados en `docker-compose.yml` persisten los datos en el host — aplicar las mismas reglas de retención del punto 2

---

## 7. Revisión de esta política

Esta política se revisa anualmente o cuando cambie el volumen de corridas. Próxima revisión: **agosto 2027**.
