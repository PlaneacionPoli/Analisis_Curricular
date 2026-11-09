# Fases del proyecto: reconstrucción documental

Revisión del 2026-11-04 para responder a la pregunta 1 de los revisores (validación del modelo analítico).
Fuentes: historial de git (237 commits), carpetas de datos (`data/backup`, `data/raw/*`), documentos del
proyecto y presentación a la Vicerrectoría Académica. Las comparaciones de matrices se hicieron por nombre
normalizado (sin tildes ni prefijo «Formato RA_») y por hash MD5 del archivo.

## Línea de tiempo

| Fase | Periodo | Matrices | Evidencia | Qué se hizo |
|---|---|---|---|---|
| 1. Preliminar | feb.–abr. 2026 | 3: Administración de Empresas PBOG, Derecho VNAL, Ingeniería Industrial PMED | `data/backup/` (3 archivos, 2026-04-21); primer borrador del artículo («tres matrices de Administración, Ingeniería Industrial y Derecho», `NOTAS_REVISION_v2.md`); commits desde 2026-02-10 («Prueba Inicial») y 2026-03-02/04 (créditos, taxonomías, Bloom con 646 verbos, núcleos, dashboard) | Prototipo del aplicativo: extracción, taxonomías, núcleos temáticos, conteos de créditos |
| 2. Ampliación | abr.–may. 2026 | 47 archivos = 46 matrices (DisenoDigital_VNAL duplicado con y sin «ñ»); incluye las 3 del piloto | `data/raw/01_FormatosRA_ReformaCurricular/` (2026-04-21 a 2026-05-08); commit «Ajustes Fase II» (2026-05-06) y ajustes del 6 al 14 de mayo (gestor de errores, conteos, pregrado/posgrado, filtros) | Aplicación a la oferta en renovación; robustez del extractor y del dashboard |
| 3. Consolidación | may.–oct. 2026 | 50 matrices (corpus final) | `data/raw/FORMATOS RA CICLO UNO RC/` (desde 2026-05-12); junio: perfiles y asignaturas compartidas; 2026-08-10: gobierno (golden set, checklist), CI, Docker; 2026-10-01/05: auditoría, referencia de V1 (2026-10-03) y resultados; 2026-10-14: presentación a Alta Dirección y Vicerrectoría Académica | Análisis completo, calibración de V1, resultados del artículo y presentación institucional |

## Cambios del corpus entre la fase 2 y la fase 3

- **En ambas:** 39 matrices. **7 idénticas y 32 con una versión nueva** (contenido distinto): las matrices se corrigieron entre fases.
- **Salen (7):** AdmonEmpresas_PMED, Derecho_PBOG, DisenoModas_HMED, ECENJA_PBOG, Esp.NeuropsicologiaEscolar_PBOG, Esp.NeuropsicologiaEscolar_VNAL, ProfGSSL_VNAL.
- **Entran (11):** AdmonEmpresas_HMED, AdmonHotelGastro_PBOG, ContPub_VNAL, DisenoModas_PBOG, EspGerTributaria_PBOG, EspGerenProyInteligenciaNegocios_VNAL, MGEM_VNAL, MGerTalentoHumano_VNAL, MercadeoyPublicidad_PMED, TecnolGuianzaTuris_VNAL, TecnolMercadeoyPublicidad_PMED.
- **Piloto → fase 3:** las 3 matrices piloto también cambiaron (Derecho_VNAL solo entre la fase 2 y la 3).
- **Calibración de V1 (11 matrices):** 9 ya estaban en la fase 2 y 2 entraron en la fase 3 (AdmonHotelGastro_PBOG, DisenoModas_PBOG).
- 21 archivos del corpus final tienen fecha de modificación entre el 1 y el 14 de octubre. La validación del 2026-11-03 reproduce con los archivos actuales las cifras publicadas de V1 (2.574 atributos; 3,8 %), R6 y R7.

## Estado documental de la validación experta

| Documento | Fecha | Qué dice |
|---|---|---|
| `RESPUESTAS_INVESTIGACION.md` | 2026-06-02 | La validación por expertos curriculares está **pendiente**; se propone que 3–5 expertos revisen los reportes de 10 programas |
| `tests/fixtures/golden_set/groundtruth.json` | 2026-08-10 | Etiquetas humanas para 15 programas: **0 de 15 etiquetadas**; fecha «COMPLETAR» |
| `docs/governance/checklist_revision_hallazgos.md` | 2026-08-10 | Plantilla de revisión por Coordinación Académica; no hay ejemplar diligenciado en el repositorio |
| `auditoria/referencia_asociacion_perfil.csv` | 2026-10-03 | Fuente de 389 de 429 atributos: «Lectura experta Claude» |
| `Presentacion_Alta_Direccion_Curricular_v2.pptx` | 2026-10-14 | Diapositivas 4 y 12: «Referencia del perfil asistida por IAg y **no validada por el comité**»; «N1–N5 por un solo codificador» |

**Conclusión:** el repositorio documenta las tres fases y la presentación a la Vicerrectoría, pero no contiene
soporte de una revisión de la Dirección de Currículo sobre la referencia de calibración de V1; la presentación del
14 de octubre afirma lo contrario. Para citar esa revisión en el artículo se necesita su soporte (acta, informe o
correo) y precisar qué revisó: las matrices (diseño curricular), los resultados del aplicativo o la referencia de V1.
