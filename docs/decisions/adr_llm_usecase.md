# ADR-001: Uso del LLM en el Pipeline Microcurricular

**Estado:** DECIDIDO — Opción A  
**Fecha de creación:** 2026-08-10  
**Autoras:** Coordinación Académica + Investigadora principal  
**Revisión requerida por:** Coordinación Académica

---

## Contexto

`config.py` declara `LLM_ENABLED`, `LLM_PROVIDER` y `LLM_MODEL`, pero no existe
ningún módulo `src/llm_integration.py` ni llamada real a un LLM en el pipeline actual.
El sistema produce 15+ indicadores cuantitativos, detección temática y cobertura de
perfil usando únicamente métodos simbólicos y de ML clásico (TF-IDF, BM25, LDA,
Isolation Forest). El costo de una API externa (~$0.50–$2 USD por corrida completa)
y el tiempo de respuesta adicional son factores relevantes para una institución con
presupuesto restringido.

---

## Opciones evaluadas

### Opción A — Resúmenes narrativos automáticos (implementar)

El LLM genera un párrafo en lenguaje natural por programa sintetizando sus indicadores
calculados (score de calidad, temáticas presentes, brechas del perfil). Los números
vienen del pipeline; el LLM solo redacta, nunca calcula.

**Ventajas**
- Reduce trabajo manual de redacción de informes para la investigadora
- Grounded: el LLM no puede inventar cifras que no estén en el contexto
- Fácil de evaluar: cruzar cada cifra del resumen contra el Excel maestro

**Desventajas**
- Costo API por corrida
- Requiere conexión a internet (pipeline actualmente 100% offline)
- Añade un punto de falla externo al pipeline

**Implementación:** `src/llm_integration.py` + `tests/test_llm_grounding.py`

---

### Opción B — Chat/Q&A sobre el currículo (implementar)

RAG sobre los Excel procesados: la investigadora o Coordinación Académica hacen
preguntas en lenguaje natural sobre el corpus (ej. "¿qué programas tienen brecha
en pensamiento crítico?"). Requiere chunking + embeddings + vector store.

**Ventajas**
- Alto valor percibido para usuarios no técnicos
- Elimina la necesidad de navegar los Excel manualmente

**Desventajas**
- Complejidad significativamente mayor (vector store, chunking, retrieval)
- Tiempo de desarrollo estimado: 3–6 semanas adicionales
- Riesgo de alucinaciones en respuestas que mezclen programas

**Implementación:** fuera del alcance de Fase 3; requiere sprint dedicado

---

### Opción C — Descartar la integración LLM (no implementar)

Eliminar `LLM_ENABLED`, `LLM_PROVIDER`, `LLM_MODEL` de `config.py`.
El sistema permanece 100% determinístico, offline y sin costo operativo de API.

**Ventajas**
- Elimina configuración fantasma del repositorio
- Sin dependencia externa en el pipeline principal
- Sin costo adicional de operación

**Desventajas**
- Los reportes siguen siendo técnicos; la investigadora redacta los resúmenes a mano

---

## Decisión

> **[x] Opción A — Resúmenes narrativos** ← DECISIÓN TOMADA (2026-08-10)  
> **[ ] Opción B — Chat/Q&A** *(requiere sprint adicional, no Fase 3)*  
> **[ ] Opción C — Descartar**

*(Marcar la opción seleccionada y firmar abajo)*

---

## Criterios para la reunión de validación

Antes de la decisión, confirmar con Coordinación Académica:

1. ¿Existe un presupuesto aprobado para costos de API externa?
2. ¿El pipeline necesita correr offline (sin internet) en algún escenario?
3. ¿Hay una segunda persona que pueda revisar los resúmenes generados antes de
   usarlos en decisiones formales de reforma?
4. ¿La reducción de trabajo manual de redacción justifica la complejidad añadida?

---

## Consecuencias de la decisión

**Si Opción A:**
- Crear `src/llm_integration.py` con wrapper que recibe dict de indicadores y retorna
  resumen en español, máx. 200 palabras, usando el modelo configurado
- Crear `tests/test_llm_grounding.py` con 5–10 casos que verifican que cada cifra
  del resumen está presente en los indicadores de entrada (fidelidad numérica)
- `LLM_ENABLED` debe ser `False` por defecto; la corrida normal no lo activa
- Actualizar `.env.example` con `ANTHROPIC_API_KEY=<tu_key>`

**Si Opción C:**
- Eliminar de `config.py`: `LLM_ENABLED`, `LLM_PROVIDER`, `LLM_MODEL`
- Eliminar `LLM_COST_LIMIT_USD` si existe
- Registrar la eliminación en el historial de git con mensaje claro

---

## Firmas

| Rol | Nombre | Fecha | Firma |
|---|---|---|---|
| Investigadora principal | | | |
| Coordinación Académica | | | |

---

*Documento generado como parte del plan de mejora Fase 3 — Sistema de Análisis Microcurricular.*
