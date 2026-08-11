# Mapeo 360° — Sistema de Análisis Microcurricular
### DevOps / MLOps / LLMOps — Diagnóstico integral y hoja de ruta

**Fecha:** 2026-08-10
**Alcance del análisis:** repositorio `Analisis_Curricular` en su estado actual (rama `claude/mapeo-mlops-devops-llmops-fe1c04`), incluyendo la documentación previa en `docs/` (architecture, devops, backend, database, deployment, frontend, security, testing, ux, analytics, apis, recommendations).

> **Nota metodológica.** Este documento aplica el framework de mapeo 360° (Enterprise/MLOps/LLMOps/DevOps/Cloud/Data/AI-Governance) al proyecto real encontrado en el repositorio. El proyecto es una herramienta académica desarrollada por una sola persona, no una plataforma empresarial. Por eso: (a) algunas categorías del framework original (Team Topology multi-equipo, FinOps de GPU/tokens, SLA formales de SRE) se marcan explícitamente como **no aplicables en el estado actual** en vez de inventarse, y (b) el documento prioriza simplicidad y honestidad sobre exhaustividad decorativa, conforme a las reglas de análisis del framework (no asumir información no suministrada; declarar supuestos).

---

## A. Executive Summary

El **Sistema de Análisis Microcurricular** es una herramienta Python que automatiza el análisis de calidad de **99+ diseños curriculares** (archivos Excel `FormatoRA_*`) de una institución de educación superior colombiana, para apoyar procesos de **reforma curricular**. Calcula indicadores de calidad, detecta temáticas emergentes (IA, sostenibilidad, etc.), mide cobertura del perfil de egreso, detecta asignaturas compartidas entre sedes/programas y aplica modelado de tópicos (LDA). Expone los resultados vía un dashboard Streamlit y reportes Excel/PDF/HTML.

**Clasificación real del proyecto:** es mayoritariamente un proyecto de **analítica de datos con NLP clásico (DataOps + ML clásico)**, no un proyecto DevOps/MLOps/LLMOps maduro. Tiene un *flag* de integración LLM (Anthropic Claude) **declarado pero no implementado** — el módulo referenciado en el README (`src/llm_integration.py`) no existe en el código.

**Hallazgo principal:** el sistema **funciona y entrega valor analítico real** (indicadores, detección temática, matriz de cobertura), pero opera con **madurez operacional nivel 1-2 de 5** en casi todas las dimensiones: sin CI/CD, sin contenedores, sin versionado de modelos/datos, sin monitoreo, con un entorno virtual commiteado al repositorio y dos dashboards paralelos (deuda técnica activa). El riesgo dominante no es de IA ni de infraestructura — es de **reproducibilidad y continuidad**: todo el conocimiento operativo vive en un único autor/mantenedor y en scripts ejecutados manualmente.

**Recomendación central:** antes de invertir en MLOps/LLMOps formal (que este proyecto no necesita en su forma actual), cerrar la brecha de **higiene DevOps básica** (tests, CI, `.gitignore` del venv, un solo dashboard) y **decidir explícitamente** si la integración LLM es necesaria o si el NLP clásico ya resuelve el caso de uso — no construirla "porque está en el README".

---

## B. Diagnóstico 360° — Identificación del proyecto

| Campo | Valor |
|---|---|
| Nombre | Sistema de Análisis Microcurricular (`Analisis_Curricular`) |
| Tipo de proyecto | **DataOps + Analítica/ML clásico**, con intención declarada (no implementada) de LLMOps. No es DevOps de producto de software tradicional ni MLOps de modelos en producción continua. |
| Problema que resuelve | Analizar manualmente 99+ diseños curriculares en Excel es lento, inconsistente entre evaluadores y no escala; no hay forma sistemática de medir cobertura del perfil de egreso, balance pedagógico o temáticas emergentes en el currículo. |
| Objetivo estratégico | Apoyar la **Reforma Curricular** institucional con evidencia cuantitativa y comparable entre programas/sedes. |
| Objetivos operativos | Automatizar extracción de datos curriculares; calcular 15+ indicadores; detectar 10 temáticas emergentes; medir cobertura perfil-currículo; detectar duplicidad de asignaturas entre sedes; generar reportes consolidados. |
| Usuarios | Coordinación Académica institucional; decanos/directores de programa (consumidores de reportes); un(a) desarrollador(a)/analista de datos (mantenedor). |
| Stakeholders | Vicerrectoría Académica (asumido — no confirmado en el repo), Coordinación Académica, directores de programa de las sedes PBOG/VNAL/PMED. **Supuesto declarado**: no hay documento en el repo que nombre stakeholders formales; se infiere de la estructura de carpetas y README. |
| Áreas involucradas | Coordinación Académica, Programas académicos (todas las sedes), posible área de TI/Datos (no confirmado). |
| Sistemas impactados | Ninguno externo integrado — el sistema es autocontenido, opera sobre archivos Excel entregados manualmente. No hay integración con SIS/ERP académico. |
| Procesos impactados | Proceso de reforma/actualización curricular; evaluación de calidad de programas académicos. |
| Nivel de criticidad | **Medio.** No es sistema transaccional ni de misión crítica en tiempo real; su valor es analítico/consultivo para decisiones periódicas (no diarias). Un fallo no detiene operación institucional, pero sí puede sesgar decisiones de reforma si los indicadores son incorrectos y nadie los audita. |
| Alcance | Análisis de diseños microcurriculares ya elaborados en el formato Excel estándar (`FormatoRA_*`), generación de indicadores, reportes y dashboard. |
| Fuera de alcance | Captura/edición de la información curricular (se asume ya elaborada en Excel por otro proceso); integración con sistemas académicos institucionales; generación automática de currículo; evaluación pedagógica cualitativa humana. |
| Dependencias | Formato Excel estable con hojas fijas (`Paso1..Paso5`); disponibilidad de `es_core_news_sm` de spaCy; disponibilidad de los 99 archivos fuente. |
| Restricciones | Proyecto de un solo desarrollador; sin presupuesto de infraestructura cloud evidenciado; datos sensibles institucionales (curricular, no personal) versionados dentro del propio repo Git. |
| Supuestos | (1) La institución es colombiana (sedes con nombres de ciudades colombianas). (2) No hay SLA formal porque no se identificó documento de acuerdo de servicio. (3) El "cliente" del dashboard es interno, no público. |
| Horizonte temporal | Iterativo/continuo — coincide con ciclos de reforma curricular (activo desde 2026-02, sin fecha de cierre visible). |
| Madurez actual | **1.5 / 5** (Inicial-Repetible) en promedio ponderado — ver sección S. |
| Madurez objetivo | **3 / 5** (Definido) es una meta realista a 12 meses dado el tamaño del equipo (1 persona); **no** se recomienda apuntar a 4-5 sin crecer el equipo. |

---

## C. Mapa end-to-end

```
Diseño curricular (Excel, elaborado fuera del sistema)
        ↓
Ingesta manual → data/raw/*.xlsx (99 archivos, 2 subcarpetas de reforma)
        ↓
Validación estructural (validate_files.py, src/validator.py)
        ↓
Extracción (src/extractor.py → ExcelExtractor) — perfil egreso, competencias, RA, estrategias meso/micro
        ↓
Cálculo de indicadores (src/analyzer.py) — 15+ indicadores de calidad curricular
        ↓
Detección temática (src/thematic_detector.py) — matching de keywords, 10 temáticas
        ↓
Cobertura perfil-currículo (src/perfil_coverage_analyzer.py) — TF-IDF + coseno + BM25
        ↓
Asignaturas compartidas (src/shared_subjects_analyzer.py) — Jaccard + coseno entre sedes/programas
        ↓
Modelado de tópicos (src/topic_modeler.py) — LDA, 10 tópicos
        ↓
Generación de reportes (src/report_generator.py) — individual (PDF/HTML/JSON) + Excel maestro 15 hojas
        ↓
data/output/ (no versionado en git, se regenera en cada corrida)
        ↓
Consumo vía Dashboard Streamlit (dashboard/app.py o dashboard_tematico.py — dos rutas paralelas)
        ↓
Coordinación Académica interpreta indicadores → informa decisiones de Reforma Curricular
```

**Puntos de intervención humana identificados (regla 18 del framework):**
1. Elaboración del Excel curricular original (100% humano, fuera del sistema).
2. Validación de que el archivo cumple el formato esperado antes de correr el pipeline (semi-automática, `validate_files.py`, pero sin gate obligatorio en CI).
3. Interpretación final de indicadores y temáticas por Coordinación Académica — el sistema **no decide**, informa.
4. No hay revisión humana de las salidas del LDA/TF-IDF antes de publicarse en el dashboard — **gap**: un topic model sin curaduría puede producir tópicos poco interpretables y llegar así al usuario final.

**Puntos de fallo identificados (regla 19):**
- Cambio de formato en un Excel de origen (fuera de control del sistema) → falla silenciosa o parcial en extracción si no hay validación estricta.
- `data/processed/` y `data/output/` no son persistentes (no versionadas) → si se pierde la máquina local, se pierde el historial de corridas, no solo el código.
- Dependencia de un único mantenedor: no hay bus factor > 1 evidenciado.

---

## D. Arquitectura actual (AS-IS)

**Capa Business:** Coordinación Académica define la necesidad (reforma curricular); no hay caso de negocio formal documentado ni KPIs de negocio ligados a ROI/TCO — el valor es cualitativo (mejor evidencia para decisiones).

**Capa Application:** Monolito de scripts Python + un dashboard Streamlit. **No hay API**, no hay microservicios, no hay separación backend/frontend real — el "backend" es el propio módulo `src/` importado directamente por el dashboard. Existen **dos dashboards paralelos** (`dashboard/app.py` de 69 KB y `dashboard_tematico.py` de 238 KB con un `.bak2` de 184 KB) — deuda técnica confirmada, no está claro cuál es el vigente.

**Capa Data:** Archivos Excel como única fuente de datos (no hay data lake, no hay warehouse, no hay feature store). Hay un `DB_PATH` a SQLite (`microcurricular.db`) declarado en `config.py` pero sin evidencia de uso activo — **posible funcionalidad fantasma** (documentada/configurada, no implementada, igual que el LLM).

**Capa AI/ML:** TF-IDF, coseno, BM25, LDA — todo entrenado *on-the-fly* en cada corrida de `run_analysis.py`, sin registro de versión de modelo, sin comparación entre corridas, sin dataset de validación separado del de producción (el "dataset" y el "currículo real" son el mismo conjunto de 99 archivos).

**Capa LLM:** flag `LLM_ENABLED: False`, proveedor configurado (`anthropic`, `claude-3-5-sonnet-20241022`), pero módulo de integración inexistente. **No hay RAG, no hay prompt management, no hay embeddings vectoriales, no hay guardrails** — todo esto es prematuro mientras el flag esté apagado.

**Capa Platform:** Sin cloud, sin Kubernetes, sin contenedores. Único entorno productivo conocido: `.devcontainer` (Codespaces) que auto-arranca Streamlit en el puerto 8501 — es un entorno de *desarrollo*, no de producción.

**Capa DevOps:** Git básico (GitHub, un remoto, un autor, 172 commits, sin tags ni branches protegidas). **Sin CI/CD.** Historial reciente muestra iteración de tipo "debug/ajuste" repetida — indicio de que no hay tests automatizados que den confianza antes de cada cambio.

**Capa Observability:** Inexistente. No hay logs estructurados, métricas, trazas ni alertas más allá de los `print()`/salidas de consola del pipeline.

**Capa Security:** Sin gestión de secretos formal más allá de variables de entorno (`ANTHROPIC_API_KEY`/`OPENAI_API_KEY`, hoy sin uso real). Datos curriculares institucionales versionados directamente en Git (no son datos personales sensibles, pero sí información institucional interna) — riesgo si el repo pasa a ser público sin sanitizar.

**Capa Governance:** No hay comité, no hay aprobaciones formales, no hay política de cambios — coherente con un proyecto de un solo desarrollador, pero es un riesgo si el sistema empieza a alimentar decisiones institucionales de mayor peso.

---

## E. Arquitectura objetivo (TO-BE) — propuesta realista a 12 meses

No se propone una arquitectura enterprise (microservicios, K8s, vector DB) porque **no hay evidencia de necesidad de esa escala** (99 archivos, cargas por lotes periódicas, un usuario concurrente típico). La regla 20 del framework ("priorizar simplicidad cuando dos alternativas satisfacen el mismo requerimiento") aplica directamente aquí.

Arquitectura objetivo recomendada — **evolución, no reescritura**:

1. **Un solo dashboard** (elegir `dashboard/app.py` con estructura modular `pages/`/`components/` ya prevista en el README, retirar `dashboard_tematico.py` tras migrar lo que sirva).
2. **Contenerización simple** (un `Dockerfile` + `docker-compose.yml`, no K8s) para reproducibilidad y para facilitar que otra persona además del autor pueda ejecutar el sistema.
3. **CI mínimo** (GitHub Actions): lint + tests en cada push/PR, sin necesidad de CD automático a un entorno productivo (el "despliegue" sigue siendo ejecución local/Codespaces por ahora).
4. **Versionado de datos de salida**: mover `data/output/` a artefactos versionados por corrida (timestamp o hash), no solo el último resultado sobreescrito.
5. **Decisión explícita sobre LLM**: si se mantiene, implementar `src/llm_integration.py` con un caso de uso concreto (p.ej. resumir automáticamente los hallazgos temáticos en lenguaje natural para el reporte) evaluando **RAG sobre los propios Excel/reportes antes que fine-tuning** (regla 7 del framework) — el conocimiento es documental y cambia por corrida, no requiere entrenar un modelo propio. Si no hay caso de uso concreto en 90 días, retirar el flag y la configuración para no mantener código muerto.
6. **SQLite real o descartar el `DB_PATH`**: hoy es configuración fantasma; o se implementa para persistir histórico de corridas, o se elimina de `config.py`.

Esta arquitectura target puede alcanzarse **sin cambiar de stack** (sigue siendo Python + Streamlit + pandas/sklearn).

---

## F. Mapa de componentes / tecnologías

| Componente | Qué es | Para qué sirve | Tecnología actual | Alternativas evaluadas | Recomendación |
|---|---|---|---|---|---|
| Extracción de datos | Lee Excel y estructura la información | Habilitar el resto del pipeline | `openpyxl` + `pandas` vía `src/extractor.py` | `polars` (más rápido, no necesario a este volumen) | Mantener — el volumen (99 archivos) no justifica cambiar |
| Indicadores de calidad | Cálculo de métricas curriculares | Medir balance/complejidad del currículo | `pandas`/`numpy` a medida | Ninguna alternativa de mercado (lógica de negocio propia) | Mantener, agregar tests unitarios (hoy insuficientes) |
| Cobertura perfil-currículo | Similitud semántica perfil vs. currículo | Detectar vacíos de cobertura | TF-IDF + coseno + BM25 (`scikit-learn`, `rank-bm25`) | Embeddings semánticos (sentence-transformers) | Evaluar embeddings solo si TF-IDF muestra falsos negativos por sinonimia — no cambiar sin evidencia de problema |
| Modelado de tópicos | Descubre temas latentes en el texto curricular | Detectar patrones no anticipados | LDA (`scikit-learn`) | BERTopic, NMF | Mantener LDA por simplicidad/interpretabilidad; BERTopic solo si se requiere mejor coherencia y hay presupuesto de cómputo |
| Dashboard | Visualización interactiva | Consumo por Coordinación Académica | Streamlit | Dash, un frontend React+API propia | Mantener Streamlit — coincide con el perfil de equipo (1 dev, sin frontend engineer) |
| Integración LLM (no activa) | Generación de lenguaje natural sobre hallazgos | Resúmenes narrativos automáticos | Config apunta a Claude 3.5 Sonnet vía API Anthropic | GPT-4o, modelo open-source local (Llama) | Si se activa: usar API gestionada (Anthropic/OpenAI) vía RAG, no modelo local — no hay volumen que justifique costo de servir un LLM propio |
| Control de versiones | Git/GitHub | Trazabilidad de cambios de código | GitHub, repo único | GitLab (no aplica, ya hay decisión tomada) | Mantener, pero dejar de versionar datos binarios pesados (venv, backups .bak2) junto al código |
| CI/CD | — | Validación automática antes de merge | **No existe** | GitHub Actions (gratis para repos, se integra nativo con GitHub ya en uso) | **Adoptar GitHub Actions** — es la opción de menor fricción dado que el repo ya vive en GitHub |
| Contenedores | — | Reproducibilidad de entorno | **No existe** | Docker | Adoptar Docker simple, sin orquestador |

---

## G. Mapa de datos

**Ciclo de vida:**

```
Source (Excel elaborado por programas académicos, formato FormatoRA_*)
   → Ingestion (copia manual a data/raw/, sin proceso de subida controlado)
   → Storage (filesystem del repo Git — datos versionados junto al código, antipatrón)
   → Transformation (extracción a estructuras pandas en memoria)
   → Quality (validate_files.py — validación de estructura, no de valores semánticos)
   → Feature (TF-IDF vectors, embeddings LDA — no persistidos entre corridas)
   → Output (Excel maestro 15 hojas, reportes individuales, matrices)
   → Monitoring (ninguno)
   → Retention/Deletion (indefinida — no hay política)
```

| Aspecto | Estado |
|---|---|
| Fuentes | 99 archivos Excel `FormatoRA_*` + taxonomías |
| Propietario del dato | Coordinación Académica / programas (asumido, no confirmado por documento) |
| Clasificación/sensibilidad | Información curricular institucional interna — **no** son datos personales (sin PII evidenciada), pero sí propiedad intelectual/institucional |
| Calidad | Dependiente de la disciplina de quien llena el Excel; sin data contract formal entre "quien produce el Excel" y "el sistema que lo consume" |
| Volumen | Bajo (99 archivos, tamaño típico de hoja de cálculo) — no hay problema de escala de datos |
| Frecuencia | Por lotes, ligada a ciclos de reforma curricular (no near-real-time) |
| Linaje | No instrumentado — no hay forma de saber, dado un número en el Excel maestro, de qué celda de qué archivo salió, más allá de leer el código |
| Retención | Indefinida por defecto (todo vive en Git) — **riesgo**: los archivos Excel de datos reales están commiteados directamente en el repositorio de código |
| Versionamiento del dato | Implícito vía Git (cada commit que toca un `.xlsx` es una "versión"), no hay versionado semántico ni changelog de datos |
| Dataset de entrenamiento/validación/test | No aplica en sentido MLOps clásico — LDA/TF-IDF se entrenan sobre el 100% del corpus disponible en cada corrida, sin holdout, porque el objetivo es describir el corpus, no predecir sobre datos nuevos |
| Golden dataset / ground truth | No existe — no hay etiquetas humanas de referencia contra las que validar la detección temática o la cobertura calculada (**gap de calidad relevante**: no hay forma de saber si el LDA/TF-IDF "acierta" salvo revisión manual esporádica) |

---

## H. Mapa MLOps

El sistema usa ML clásico (TF-IDF, LDA, similitud) pero **no practica MLOps** en ningún sentido formal:

| Práctica MLOps | Estado | Impacto del gap |
|---|---|---|
| Experimentación con tracking (MLflow, W&B) | No existe — no hay notebooks ni logs de experimentos | No se puede comparar si un cambio de parámetros de LDA mejoró o empeoró la coherencia de tópicos |
| Registro de modelos (Model Registry) | No existe — el "modelo" LDA se reentrena en cada corrida y se descarta | Sin reproducibilidad exacta entre una corrida y otra si cambian ligeramente los datos de entrada |
| Versionado de datasets | No existe (más allá de Git sobre los .xlsx) | No hay snapshot inmutable del corpus usado para generar un reporte específico |
| Validación pre-despliegue | Parcial (`validate_files.py` valida estructura del Excel, no calidad de las salidas del modelo) | Un LDA con tópicos incoherentes puede llegar al dashboard sin alerta |
| Despliegue de modelo | No aplica — el "modelo" no se sirve como servicio, se ejecuta embebido en el script batch | Correcto para el volumen actual; no es un gap real dado el caso de uso |
| Monitoreo de drift | No existe — pero es de **bajo riesgo real** porque el corpus cambia solo cuando hay nueva reforma curricular, no continuamente | No priorizar esta inversión |

**Conclusión de la sección:** invertir en MLOps formal (MLflow, registry, etc.) sería **sobre-ingeniería** para el volumen y la cadencia de este proyecto (regla 5: no todo proyecto de IA requiere MLOps). Lo único que vale la pena adoptar de esta lista es **versionado ligero de las salidas** (para poder comparar corridas) y **un pequeño set de validación humana** (10-15 documentos con etiquetas manuales de temática/cobertura) para poder medir precisión real del TF-IDF/LDA al menos una vez.

---

## I. Mapa LLMOps

**Estado actual: no implementado.** El flag `LLM_ENABLED=False`, sin módulo de integración, sin prompts versionados, sin evaluación.

**Antes de construir esto**, siguiendo la regla 6-7 del framework ("no asumir que todo proyecto con LLM requiere fine-tuning" / "evaluar RAG antes que fine-tuning cuando el problema es de conocimiento"):

1. **¿Cuál sería el caso de uso real?** No está documentado con precisión más allá de "está configurado". Hipótesis razonable a partir del contexto: generar **resúmenes narrativos automáticos** de los hallazgos cuantitativos (p.ej. convertir "el programa X tiene 40% de cobertura del perfil de egreso, bajo en el eje de pensamiento crítico" en texto para el reporte). **Esto es un supuesto — debe confirmarse con el usuario antes de construir nada.**
2. Si ese es el caso: es un problema de **generación de lenguaje sobre datos estructurados ya calculados**, no de conocimiento externo — **no requiere RAG ni fine-tuning**, solo prompt engineering simple sobre los indicadores ya calculados por el pipeline NLP clásico existente.
3. Si en cambio el caso de uso fuera "responder preguntas libres sobre el currículo" (chat), ahí sí aplicaría RAG sobre los Excel/reportes (nunca fine-tuning, dado que el corpus cambia por reforma).

**Si se decide implementar**, el mapeo mínimo sería:

```
Indicadores calculados (ya existen) → prompt template versionado → API Anthropic (ya configurada)
   → respuesta en texto → inserción en reporte individual/Excel maestro
```
Con: prompt versionado en un archivo (no hardcoded), un set de 5-10 casos de prueba para evaluar fidelidad del resumen al dato real (evitar alucinación de cifras), límite de costo mensual (FinOps) dado que son 99 reportes por corrida × tokens por resumen.

**Riesgo específico a vigilar si se activa:** alucinación de cifras — un LLM resumiendo un indicador numérico puede inventar o redondear mal un dato que después se cita en un documento institucional de reforma curricular. Requiere validación de que el texto generado sea trazable al número exacto calculado (grounding), no libre.

---

## J. DevOps y CI/CD

**Pipeline actual:** Plan → Code → *(nada más automatizado)* → ejecución manual de `run_analysis.py`.

| Etapa | Estado |
|---|---|
| Git strategy | Un solo branch de trabajo, sin protección, sin PRs (autor único) |
| Build | No aplica (no hay empaquetado ni artefacto binario) — existe `setup.py` para instalación editable |
| Test | 3 archivos de test formales en `tests/` + ~12 scripts `test_*.py` sueltos en la raíz (deuda de organización) — **no corren automáticamente** |
| Security scan | No existe (sin SAST/dependency scanning) |
| Package | `pip install -e .` local únicamente |
| Deploy | Manual, vía Codespaces/devcontainer |
| Rollback | Implícito por Git (`git revert`), sin proceso formal |

**Recomendación mínima viable (no sobre-construir):**
1. Mover los `test_*.py` sueltos de la raíz a `tests/`.
2. GitHub Actions: un workflow que corra `pytest` + `ruff`/`flake8` en cada push — bloquea nada todavía (autor único), pero da señal temprana.
3. Excluir `Scripts/` (el venv embebido) del repositorio — hoy incrementa el tamaño del repo sin aportar valor y puede generar conflictos entre entornos (Windows vs Codespaces Linux, evidenciado por `python.exe`/`pip.exe` en el repo).

---

## K. Seguridad (threat modeling ligero)

| Amenaza | Vulnerabilidad | Impacto | Probabilidad | Control actual | Recomendación |
|---|---|---|---|---|---|
| Exposición de datos institucionales | Excel de datos reales versionados en un repo Git que podría hacerse público accidentalmente | Medio (info institucional interna, no PII) | Media | Ninguno evidenciado | Confirmar visibilidad del repo (privado); si es privado, mantener; documentar la política explícitamente |
| Fuga de credenciales LLM | `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` esperadas por variable de entorno | Bajo mientras `LLM_ENABLED=False` | Baja | `.gitignore` debería excluir `.env` (verificar) | Confirmar que no hay ninguna key hardcodeada en `config.py` u otro archivo versionado |
| Prompt injection | No aplica hoy (no hay LLM activo); aplicaría si se activa RAG sobre contenido de terceros | N/A hoy | N/A | N/A | Diseñarlo desde el inicio si se activa (regla 10: seguridad desde el diseño) |
| Dependencias desactualizadas | Sin dependency scanning ni Dependabot visible | Medio | Media | Ninguno | Activar Dependabot (gratis en GitHub) |
| Acceso no autorizado al dashboard | Streamlit sin autenticación evidenciada, expuesto en Codespaces con el puerto 8501 | Medio si se expone fuera del entorno de desarrollo | Baja hoy (solo dev) | Ninguno | Antes de cualquier despliegue más allá de desarrollo, añadir autenticación (Streamlit no la trae nativa) |

No se identifican amenazas de tipo "model theft", "data poisoning" o "jailbreaking" como relevantes hoy — son riesgos de sistemas con modelos productivos o LLM activos, ninguno de los cuales aplica en el estado actual (regla 17: no crear componentes/controles sin necesidad real).

---

## L. Gobierno

No existe gobierno formal — coherente con un proyecto de un solo desarrollador, pero **insuficiente si el sistema empieza a informar decisiones institucionales de reforma curricular con peso real**. Recomendación mínima, no burocracia enterprise:

- Un **CHANGELOG** por corrida de datos (qué archivos entraron, qué versión de código los procesó) — hoy no existe evidencia de esto más allá del historial de commits.
- Una persona de Coordinación Académica que **revise y firme** (aunque sea por correo) los hallazgos antes de que se usen para reforma curricular — introduce el "human-in-the-loop" que hoy falta entre "el sistema calculó X" y "se tomó una decisión basada en X".
- No se recomienda comité formal, RACI multi-área ni gates de aprobación — sería sobredimensionado para el tamaño actual del equipo.

---

## M. Observabilidad

**Estado: inexistente.** No hay logs estructurados, métricas ni alertas. Dado el perfil batch/manual del sistema, la prioridad no es observabilidad tipo APM (no aplica a un script que corre esporádicamente), sino:

1. **Logging mínimo estructurado** en `run_analysis.py` (hoy usa `print`) — para poder diagnosticar por qué falló una corrida sin tener que releer el código.
2. **Reporte de calidad de la corrida** (cuántos de los 99 archivos se procesaron correctamente, cuántos fallaron validación y por qué) — hoy no está claro si esto se resume en algún lugar o solo se ve en consola.

No se recomienda invertir en dashboards de observabilidad tipo Grafana/Datadog — sería desproporcionado para un pipeline batch de baja frecuencia.

---

## N. FinOps

No hay costo de infraestructura cloud evidenciado (todo corre local/Codespaces). El único costo variable futuro relevante sería el de **tokens del LLM si se activa** la integración con Anthropic/OpenAI.

**Estimación de costo LLM (si se activa), supuestos declarados explícitamente:**
- 99 reportes por corrida × un resumen narrativo de ~500 tokens de salida cada uno ≈ 50.000 tokens de salida por corrida completa, más el contexto de entrada (indicadores, ~300-800 tokens por reporte).
- Con Claude 3.5 Sonnet (el modelo ya configurado), esto representa un costo bajo (unos pocos dólares por corrida completa de los 99 reportes), dado que el sistema corre por lotes esporádicos (ciclos de reforma), no continuamente.
- **Recomendación:** fijar un límite de gasto/alerta en la consola de Anthropic antes de activar el flag, dado que hoy no hay ningún control de costo en el código.

No aplica el resto del framework FinOps (GPU, vector database, licencias) — no hay esos componentes en este proyecto.

---

## O. SRE / Operación

**No aplica en su forma clásica** (no hay servicio siempre-activo con SLA de disponibilidad). El "servicio" es la ejecución del dashboard durante sesiones de trabajo puntuales. No se recomienda definir SLO/SLA/error budget formales — sería teatro de proceso sin sistema que los consuma. Lo único operacionalmente relevante:

- **RTO/RPO informal**: si se pierde el entorno de desarrollo, ¿cuánto se tarda en reconstruir el pipeline y sus salidas? Hoy: alto, porque `data/output/` no está versionado ni respaldado fuera del repo — un solo punto de fallo.

---

## P. Matriz de riesgos (priorizada)

| Riesgo | Categoría | Probabilidad | Impacto | Riesgo neto | Mitigación |
|---|---|---|---|---|---|
| Bus factor = 1 (un solo mantenedor conoce todo el sistema) | Operacional | Alta | Alto | **Crítico** | Documentar (ya hay buena base en `docs/`), sumar un segundo colaborador aunque sea parcial |
| Falta de tests automatizados | Técnico | Alta | Alto | **Crítico** | Adoptar CI mínimo (sección J) |
| Datos institucionales versionados en Git sin política de visibilidad clara | Seguridad/Regulatorio | Media | Medio | Alto | Confirmar repo privado; documentar clasificación de datos |
| Dos dashboards paralelos (código legado sin retirar) | Técnico | Alta (ya está pasando) | Medio | Alto | Consolidar en uno solo (sección E) |
| Ausencia de ground truth para validar TF-IDF/LDA | IA/Calidad | Media | Medio-Alto | Alto | Crear golden set de 10-15 casos con etiqueta humana |
| Activar LLM sin caso de uso validado ("feature porque está en el README") | IA/Producto | Media | Medio | Medio | Confirmar caso de uso con el usuario final antes de implementar `llm_integration.py` |
| Entorno virtual (`Scripts/`) versionado en Git | Técnico | Alta (ya está pasando) | Bajo | Medio | Excluir vía `.gitignore`, limpiar historial si aplica |
| Alucinación de cifras si se activa LLM sin grounding | IA/Reputacional | Baja hoy (LLM inactivo) | Alto si se activa | Medio (condicional) | Diseñar validación de fidelidad numérica antes de activar |
| Cambio de formato del Excel de origen rompe el pipeline | Datos | Media | Medio | Medio | Fortalecer `validate_files.py` con mensajes de error claros y tolerancia a variantes menores |

---

## Q. Matriz de dependencias

| Componente | Depende de | Tipo | Criticidad | Impacto de falla | Alternativa |
|---|---|---|---|---|---|
| Extracción de datos | Formato exacto de hojas Excel (`Paso1`...`Paso5`) | Data dependency (hard) | Alta | Pipeline completo falla o produce datos incorrectos | Ninguna sin rediseñar el formato de origen |
| Análisis de cobertura/tópicos | `spacy` + modelo `es_core_news_sm` instalado | Runtime dependency (hard) | Media | Falla en lematización, degrada calidad de indicadores en español | Fallback a stemming simple si spaCy no está disponible |
| Integración LLM (si se activa) | Disponibilidad y cuota de API Anthropic/OpenAI | Vendor dependency (hard, condicional) | Baja hoy / Media si se activa | Reportes sin resumen narrativo, resto del pipeline no se afecta (es aditivo) | Diseñar como opcional/desacoplable, nunca bloqueante del pipeline principal |
| Dashboard | Streamlit y su servidor local | Infrastructure dependency (soft) | Media | Solo afecta visualización, no el cálculo de indicadores (que puede correr headless) | Ya existe desacople parcial (pipeline vs. dashboard son ejecutables distintos) |

---

## R. Matriz de trazabilidad (light)

No existen requisitos formales documentados (historias de usuario, RFCs) para trazar de extremo a extremo — es un gap del proceso, no solo del código. Trazabilidad **inferida** desde el código hasta la salida:

| "Requisito" inferido | Componente | Código | Evidencia de salida |
|---|---|---|---|
| Calcular indicadores de calidad curricular | `src/analyzer.py` | Módulo completo | Hoja de indicadores en Excel maestro |
| Detectar temáticas emergentes | `src/thematic_detector.py` | Módulo completo | Matriz de temáticas |
| Medir cobertura del perfil de egreso | `src/perfil_coverage_analyzer.py` | Módulo completo | Hoja de cobertura |
| Detectar asignaturas compartidas | `src/shared_subjects_analyzer.py` | Módulo completo | Reporte de cruce de asignaturas |
| Modelado de tópicos | `src/topic_modeler.py` | Módulo completo | Hoja de tópicos LDA |

**Recomendación:** formalizar un backlog mínimo (sección V) para que futuros cambios sí queden trazables desde una necesidad documentada.

---

## S. Madurez (1-5) por dimensión

| Dimensión | Actual | Objetivo (12 meses) | Gap | Prioridad | Acción |
|---|---:|---:|---:|---|---|
| DevOps | 1 | 3 | 2 | Alta | CI mínimo, consolidar dashboards, limpiar repo |
| MLOps | 1 | 2 | 1 | Baja | Solo versionado ligero de salidas + golden set — no más |
| LLMOps | 0 (no implementado) | 1-2 (si se decide activar) | 1-2 | Media (condicional a decisión de negocio) | Confirmar caso de uso antes de construir |
| DataOps | 2 | 3 | 1 | Media | Data contract informal + validación reforzada |
| Cloud | N/A (no usa cloud) | N/A | — | — | No aplica — no forzar adopción cloud sin necesidad |
| Security | 1 | 2 | 1 | Media | Confirmar visibilidad del repo, Dependabot |
| Governance | 1 | 2 | 1 | Baja-Media | Human-in-the-loop simple antes de usar hallazgos en decisiones formales |
| Observability | 1 | 2 | 1 | Baja | Logging estructurado mínimo |
| FinOps | N/A hoy | 1 (si se activa LLM) | — | Baja | Solo relevante si se activa LLM |
| SRE | N/A (no aplica a este tipo de sistema) | N/A | — | — | No forzar SLO/SLA donde no hay servicio continuo |

**Promedio ponderado actual (dimensiones aplicables): ~1.4/5.** Es coherente con un proyecto funcional pero operado artesanalmente por una persona — no es un diagnóstico alarmante, es el punto de partida esperable.

---

## T. GAP Analysis (AS-IS vs TO-BE) — los 5 gaps que más importan

| Gap | AS-IS | TO-BE | Impacto | Prioridad | Complejidad |
|---|---|---|---|---|---|
| Sin tests automatizados en pipeline | Tests existen pero no corren en CI | CI ejecuta pytest en cada push | Reduce regresiones silenciosas | Alta | Baja |
| Dos dashboards paralelos | `dashboard/app.py` y `dashboard_tematico.py` compiten | Un solo dashboard mantenido | Reduce confusión y deuda técnica | Alta | Media |
| Venv commiteado al repo | `Scripts/` versionado | `.gitignore` lo excluye | Repo más liviano, sin conflictos de entorno | Media | Baja |
| LLM configurado pero no implementado ni validado como necesidad | Flag apagado, módulo ausente | Decisión explícita: implementar con caso de uso confirmado, o retirar configuración | Evita construir sobre un supuesto no validado | Media | Media (depende de la decisión) |
| Sin ground truth para validar NLP clásico | Indicadores/temáticas sin contraste humano | Golden set de 10-15 documentos etiquetados manualmente | Da confianza real en los indicadores que informan reforma curricular | Alta | Media |

---

## U. Roadmap

**0-30 días — Higiene básica (no requiere decisiones de producto):**
- Sacar `Scripts/` (venv) del repo.
- Mover los `test_*.py` sueltos a `tests/`.
- Confirmar visibilidad/privacidad del repositorio dado que contiene datos institucionales reales.
- GitHub Actions: lint + pytest en cada push.

**31-90 días — Consolidación:**
- Decidir y ejecutar cuál dashboard se retira (`dashboard/app.py` vs `dashboard_tematico.py`).
- Construir golden set (10-15 documentos) para validar TF-IDF/cobertura/LDA contra criterio humano.
- Formalizar el "human-in-the-loop" antes de usar hallazgos en decisiones de reforma (checklist simple, no comité).

**91-180 días — Decisión LLM y versionado de datos:**
- Confirmar con Coordinación Académica el caso de uso real para el LLM (o descartarlo formalmente).
- Si se confirma: implementar `src/llm_integration.py` acotado (resumen narrativo grounded en indicadores ya calculados), con set de prueba de fidelidad numérica y límite de gasto configurado.
- Versionado ligero de `data/output/` por corrida (carpeta con timestamp o hash de commit de datos usado).

**181-365 días — Escalamiento controlado:**
- Contenerizar (`Dockerfile`) para que el sistema pueda ejecutarse fuera del entorno personal del autor.
- Evaluar si vale la pena una API mínima (FastAPI) si surge un segundo consumidor del pipeline (p.ej. otra área quiere invocar los indicadores programáticamente) — **no construir esto de forma preventiva sin ese consumidor real** (regla 17).

---

## V. Backlog técnico priorizado

| ID | Épica | Actividad | Prioridad | Esfuerzo | Fase |
|---|---|---|---|---|---|
| B-01 | Higiene de repo | Excluir `Scripts/` del control de versiones | Must Have | S | 0-30d |
| B-02 | Calidad | Mover tests sueltos a `tests/`, configurar CI (pytest+lint) | Must Have | M | 0-30d |
| B-03 | Seguridad | Confirmar privacidad del repo, activar Dependabot | Must Have | S | 0-30d |
| B-04 | Deuda técnica | Consolidar en un solo dashboard | Must Have | L | 31-90d |
| B-05 | Calidad de IA | Construir golden set y medir precisión real de TF-IDF/LDA | Should Have | M | 31-90d |
| B-06 | Gobierno | Checklist de revisión humana antes de usar hallazgos en reforma curricular | Should Have | S | 31-90d |
| B-07 | Producto/LLM | Validar con usuario el caso de uso del LLM (o descartarlo) | Should Have | S | 91-180d |
| B-08 | LLMOps | Implementar integración LLM acotada con grounding y control de costo (condicional a B-07) | Could Have | L | 91-180d |
| B-09 | Datos | Versionado por corrida de `data/output/` | Could Have | M | 91-180d |
| B-10 | Plataforma | Dockerizar el sistema | Could Have | M | 181-365d |
| B-11 | Plataforma | API mínima si aparece un segundo consumidor real | Won't Have (por ahora) | L | Condicional |

*(S=días, M=1-2 semanas, L=varias semanas — estimación cualitativa, no hay velocity histórica del equipo para calcular en horas con precisión.)*

---

## W. KPIs

| Nombre | Objetivo | Fórmula | Meta | Frecuencia | Responsable |
|---|---|---|---|---|---|
| Cobertura de tests | Confianza en cambios sin romper el pipeline | % líneas cubiertas por pytest | ≥ 60% en módulos `src/` a 90 días | Por PR/CI | Mantenedor |
| Tasa de éxito de validación de archivos | Calidad de datos de entrada | % de los 99 Excel que pasan `validate_files.py` sin error | 100% antes de cada corrida oficial | Por corrida | Mantenedor / Coordinación Académica |
| Precisión de detección temática (vs. golden set) | Confianza en los hallazgos de IA | % de coincidencia con etiquetas humanas | ≥ 80% en golden set | Trimestral | Mantenedor |
| Tiempo de ejecución del pipeline completo | Viabilidad operativa | Minutos desde `run_analysis.py` inicio a fin | Sin degradación >20% entre corridas | Por corrida | Mantenedor |
| Costo por corrida LLM (si se activa) | Control FinOps | USD gastados en API / corrida completa (99 reportes) | Definir techo antes de activar (p.ej. < $10/corrida) | Por corrida | Mantenedor |

---

## X. Recomendación ejecutiva

**Qué hacer:** cerrar primero la higiene DevOps básica (tests en CI, un solo dashboard, repo limpio) — es lo que más reduce riesgo real hoy, y es barato.

**Qué no hacer:** no construir MLOps formal (MLflow, model registry) ni infraestructura cloud/K8s — el volumen y la cadencia del proyecto no lo justifican; sería sobre-ingeniería activa violando la regla de simplicidad del propio framework.

**Qué priorizar:** el golden set de validación humana para el NLP clásico — es lo que da legitimidad real a los indicadores que van a alimentar decisiones de reforma curricular institucional; hoy nadie puede decir con evidencia qué tan preciso es el sistema.

**Qué automatizar:** validación de estructura de Excel, tests, lint — todo lo mecánico y repetitivo.

**Qué comprar:** nada — no hay componente donde un SaaS/managed service reduzca costo o riesgo de forma clara a este tamaño (Streamlit Community Cloud podría considerarse solo si se necesita exponer el dashboard fuera del entorno de desarrollo, pero eso no está solicitado hoy).

**Qué construir:** la integración LLM, **solo si** se confirma el caso de uso — no antes.

**Qué riesgos aceptar:** ausencia de SRE/SLA formal (no aplica al tipo de sistema); ausencia de observabilidad tipo APM (desproporcionada para un batch esporádico).

**Qué riesgos mitigar:** bus factor = 1, ausencia de tests automatizados, datos institucionales sin política de visibilidad clara, LLM configurado sin validación de necesidad.

**Qué arquitectura adoptar:** la misma que existe hoy (Python + Streamlit + pandas/sklearn), evolucionada con CI, un dashboard único y contenedores simples — no un rediseño desde cero.

**Cuál debería ser el siguiente paso:** ejecutar el roadmap 0-30 días (higiene de repo y CI) esta misma semana, dado que son cambios de bajo esfuerzo y alto impacto en reducción de riesgo, y en paralelo iniciar la conversación con Coordinación Académica sobre el caso de uso real del LLM antes de que nadie lo implemente "porque ya está en la configuración".

---

## 10 decisiones arquitectónicas más importantes

1. **No adoptar MLOps/LLMOps formal todavía** — el volumen y la cadencia del proyecto no lo justifican; revisar esta decisión solo si el número de programas/sedes crece en un orden de magnitud o si el sistema pasa a correr continuamente.
2. **Consolidar en un único dashboard** entre `dashboard/app.py` y `dashboard_tematico.py` — mantener ambos es la fuente #1 de confusión y esfuerzo duplicado hoy.
3. **RAG, no fine-tuning**, si se activa el LLM — el conocimiento es documental y cambia por ciclo de reforma, fine-tuning quedaría obsoleto en cada ciclo.
4. **Mantener TF-IDF/LDA en vez de migrar a embeddings/BERTopic** hasta tener evidencia concreta (vía golden set) de que la calidad actual es insuficiente.
5. **Sacar el entorno virtual del control de versiones** — decisión de higiene de bajo costo y alto beneficio inmediato.
6. **No dockerizar con Kubernetes** — un `docker-compose` simple es suficiente para el patrón de uso actual (ejecución por lotes, un usuario).
7. **Mantener los datos curriculares dentro del mismo repositorio (por ahora)**, pero **confirmar explícitamente su nivel de privacidad** — mover a almacenamiento separado solo si el repo necesita hacerse público o compartirse externamente.
8. **CI sin CD** — validar automáticamente (tests/lint) pero no automatizar el despliegue, porque hoy no hay un entorno productivo real al cual desplegar.
9. **No versionar modelos ML en un registry formal** — versionar únicamente las *salidas* (reportes) por corrida es suficiente dado que los modelos se reentrenan completos cada vez sobre el corpus completo.
10. **Introducir un punto de revisión humana explícito** entre "el sistema calculó un indicador" y "ese indicador se usa en una decisión de reforma curricular" — es la salvaguarda más barata y más importante dado que no hay ground truth automatizado todavía.

## 10 riesgos que podrían hacer fracasar el proyecto

1. **Bus factor = 1**: si el único mantenedor se aleja del proyecto, no hay evidencia de que alguien más pueda operarlo (mitigado parcialmente por la documentación ya existente en `docs/`).
2. **Indicadores no validados usados para decisiones reales**: sin golden set, un error sistemático en TF-IDF/LDA podría sesgar una reforma curricular sin que nadie lo detecte.
3. **Cambio de formato en los Excel de origen** rompe silenciosamente la extracción si la validación no es lo suficientemente estricta.
4. **Confusión operativa por los dos dashboards paralelos**, llevando a que se presenten cifras del dashboard "equivocado" en una reunión institucional.
5. **Pérdida de `data/output/`** al no estar versionado ni respaldado — se pierde el historial de corridas si falla la máquina local.
6. **Exposición accidental de datos institucionales** si el repositorio cambia de privado a público sin sanitizar los `.xlsx`.
7. **Construir la integración LLM sin validar el caso de uso**, invirtiendo esfuerzo en una funcionalidad que nadie termina usando.
8. **Alucinación de cifras por el LLM** (si se activa sin grounding), dañando la credibilidad del sistema completo ante Coordinación Académica.
9. **Ausencia de tests automatizados** permitiendo que un cambio de código rompa un indicador sin que se note hasta que alguien lo usa en producción de reportes.
10. **Fatiga del mantenedor único** por deuda técnica acumulada (dos dashboards, backups `.bak2`, scripts sueltos) que hace cada cambio más costoso de lo necesario, ralentizando la entrega de valor al proceso de reforma curricular.

---

## Mapa 360° resumido

```
ESTRATEGIA               Apoyar la Reforma Curricular institucional con evidencia cuantitativa
        ↓
CASO DE NEGOCIO           Automatizar el análisis de 99+ diseños curriculares imposible de hacer
                          manualmente de forma consistente
        ↓
PROCESOS                  Ingesta Excel → validación → extracción → indicadores → temáticas →
                          cobertura → asignaturas compartidas → tópicos → reportes
        ↓
DATOS                     99 archivos Excel institucionales (sin PII), sin data lake/warehouse,
                          versionados junto al código (a revisar)
        ↓
APLICACIONES              Monolito Python + Streamlit; dos dashboards paralelos (deuda a resolver)
        ↓
DEVOPS                    Git básico, sin CI/CD, sin Docker — nivel de madurez 1/5
        ↓
MLOPS / LLMOPS             ML clásico (TF-IDF/LDA) sin prácticas MLOps formales (no crítico al
                          volumen actual); LLM configurado pero NO implementado ni validado
        ↓
INFRAESTRUCTURA            Local / Codespaces únicamente, sin cloud productivo
        ↓
SEGURIDAD                  Sin gestión de secretos formal; datos institucionales en repo Git
                          (confirmar visibilidad)
        ↓
GOBIERNO                   Inexistente formalmente; falta punto de revisión humana antes de usar
                          hallazgos en decisiones de reforma
        ↓
OBSERVABILIDAD             Inexistente (aceptable dado el patrón batch/esporádico)
        ↓
SRE                        No aplica en forma clásica (no hay servicio continuo)
        ↓
FINOPS                     Sin costo cloud hoy; costo LLM condicional y bajo si se activa con control
        ↓
OPERACIÓN                  Manual, un solo operador/mantenedor — riesgo de bus factor
        ↓
MEJORA CONTINUA             Golden set de validación + CI + consolidación de dashboards son las
                          palancas de mayor impacto a corto plazo
        ↓
VALOR DE NEGOCIO            Evidencia cuantitativa y comparable entre programas/sedes para una
                          reforma curricular mejor informada — hoy entregado, pero sin validación
                          formal de precisión ni continuidad operativa garantizada
```
