from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH

OUT = r"C:/Users/ximen/OneDrive/Proyectos_DS/Analisis_Curricular/auditoria/Respuesta_revisores_propuestas.docx"

doc = Document()
st = doc.styles["Normal"]
st.font.name = "Times New Roman"
st.font.size = Pt(11)
for s in doc.sections:
    s.left_margin = s.right_margin = Cm(2.5)
    s.top_margin = s.bottom_margin = Cm(2.5)


def h(text, level=1):
    doc.add_heading(text, level=level)


def p(text, italic=False, bold=False):
    par = doc.add_paragraph()
    _runs(par, text, italic, bold)
    par.paragraph_format.space_after = Pt(6)
    return par


def _runs(par, text, italic=False, bold=False):
    # Segmentos [PENDIENTE ...] / [CONFIRMAR ...] en rojo
    import re
    for seg in re.split(r"(\[(?:PENDIENTE|CONFIRMAR)[^\]]*\])", text):
        if not seg:
            continue
        r = par.add_run(seg)
        r.italic = italic
        r.bold = bold
        if seg.startswith("[PENDIENTE") or seg.startswith("[CONFIRMAR"):
            r.font.color.rgb = RGBColor(0xC0, 0x00, 0x00)
            r.bold = True


def bullets(items):
    for it in items:
        par = doc.add_paragraph(style="List Bullet")
        _runs(par, it)


def table(rows, header=True, widths=None):
    t = doc.add_table(rows=len(rows), cols=len(rows[0]))
    t.style = "Table Grid"
    for i, row in enumerate(rows):
        for j, val in enumerate(row):
            cell = t.cell(i, j)
            cell.text = ""
            _runs(cell.paragraphs[0], str(val), bold=(header and i == 0))
            for r in cell.paragraphs[0].runs:
                r.font.size = Pt(9)
    doc.add_paragraph()


def comentario(n, titulo, texto):
    h(f"Comentario {n}. {titulo}", 2)
    p("Observación del revisor: " + texto, italic=True)


def bloque(resp, cambios, req=None):
    par = doc.add_paragraph()
    par.add_run("Respuesta al revisor. ").bold = True
    _runs(par, resp)
    par = doc.add_paragraph()
    par.add_run("Cambios en el manuscrito.").bold = True
    bullets(cambios)
    if req:
        par = doc.add_paragraph()
        par.add_run("Requisitos para ejecutarla. ").bold = True
        _runs(par, req)


C1 = ("Validación del modelo analítico: selección de expertos, procedimiento de validación, juicios de referencia, "
      "independencia entre calibración y evaluación; interpretación crítica del 80,1 % y κ = 0,44; métricas por clase "
      "y matriz de confusión; coherencia de los tamaños de muestra entre etapas.")
C2 = ("Clarificación de la contribución de la IAg: distinguir el desarrollo asistido por IAg de los procedimientos "
      "deterministas que producen los hallazgos, sin atribuir mejoras no contrastadas frente a una alternativa sin IAg.")
C3 = ("Validez de constructo: fortalecer la justificación de V2 (la repetición de verbos no equivale a redundancia) y "
      "reconocer que la evaluabilidad del 100 % refleja cumplimiento de plantilla y no calidad evaluativa demostrada.")
C4 = ("Interpretación estadística y generalización: cautela ante diferencias no significativas entre sedes, por "
      "tamaños desiguales, pocos casos en algunos grupos y dependencia parcial entre unidades programa-sede.")
C5 = ("Reproducibilidad y transparencia: umbrales de similitud, decisiones de calibración, preprocesamiento, "
      "revisión experta y acceso al código o documentación de soporte.")

# ------------------------------------------------------------------ portada
t = doc.add_heading("Respuesta a los revisores: tres propuestas alternativas", 0)
p("Manuscrito: «Inteligencia artificial generativa como infraestructura de decisión curricular: estudio aplicado "
  "sobre coherencia, evaluabilidad y trazabilidad en una institución de educación superior».", italic=True)
p("Documento de trabajo para la autora. Se elaboró a partir de la versión «Articulo Politécnico Grancolombiano "
  "V2.docx» (26-10-2026) y de las fuentes de evidencia del proyecto (auditoria/evidencia_*.json, "
  "auditoria/referencia_asociacion_perfil.csv, config_asociacion_perfil.json, auditoria/PENDIENTES.md). "
  "No modifica el manuscrito.")

h("Cómo usar este documento", 1)
p("Las tres propuestas son respuestas completas e independientes a los cinco comentarios; cada una puede enviarse "
  "por sí sola. Difieren en el alcance del trabajo adicional:")
table([
    ["Propuesta", "Estrategia", "Trabajo adicional", "Riesgo ante el revisor"],
    ["1. Transparencia y acotación del alcance", "Reescritura, reporte de métricas ya calculadas y reencuadre de las afirmaciones",
     "Bajo: solo análisis existentes", "Medio: puede juzgarse insuficiente la validación de V1"],
    ["2. Reanálisis con los datos existentes", "Propuesta 1 + nuevos análisis computacionales (línea base, sensibilidad, remuestreo por conglomerados) y repositorio público",
     "Calculado (Anexo B); falta publicar el repositorio", "Bajo-medio"],
    ["3. Validación independiente", "Propuesta 2 + panel experto humano sobre matrices no usadas en la calibración, doble codificación y modelos multinivel",
     "Alto: requiere jueces externos y nuevo trabajo de campo", "Bajo, si se ejecuta completa"],
])
p("Los textos en rojo marcados [PENDIENTE] o [CONFIRMAR] señalan datos que no existen todavía en la evidencia "
  "del proyecto o que la autora debe verificar. No se rellenaron con valores plausibles.")

# ------------------------------------------------------------------ hallazgos previos
h("Hallazgos de la revisión del manuscrito y de las fuentes", 1)
p("Antes de responder, conviene corregir lo siguiente en cualquiera de las tres propuestas. El primer punto "
  "condiciona la respuesta a los comentarios 1, 2 y 5.")
h("Hallazgo crítico: origen de la lectura de referencia de V1", 2)
p("El manuscrito afirma que «la asociación del perfil se calibró con revisión experta (Etapa 4)» y que la IAg no "
  "clasificó «los datos del análisis final». Según auditoria/referencia_asociacion_perfil.csv, 389 de los 429 "
  "atributos de la referencia tienen como fuente «Lectura experta Claude 2026-10-03» y los 40 restantes "
  "«Revisión uno a uno», revisión que, según el registro del proyecto, también se hizo con asistencia de IAg. "
  "La lectura de referencia, por tanto, no es un juicio experto humano independiente, y el 80,1 % mide la "
  "concordancia entre el método determinista y una referencia asistida por IAg. Además, el acuerdo se calculó "
  "sobre las mismas 11 matrices usadas para fijar los parámetros (estimación dentro de la muestra).")
p("[CONFIRMAR: si la autora o el comité curricular revisaron la referencia después del 2026-10-03. Si lo hicieron, "
  "documentar quién, cuántas decisiones y con qué criterio; si no, la respuesta no puede afirmar que hubo validación "
  "experta.]")
p("Este punto no es menor: el revisor pide precisamente la «selección de expertos» y los «juicios de referencia». "
  "Una respuesta que describa un panel inexistente comprometería la integridad del artículo. Las tres propuestas "
  "declaran el origen real de la referencia; difieren en lo que se hace a partir de ahí.")

h("Inconsistencias internas a corregir", 2)
table([
    ["Ubicación", "Problema", "Corrección"],
    ["Resumen", "341 RA únicos", "338 RA únicos (cifra de Resultados, Tabla 1 y Tabla 7; decisión D23)"],
    ["Corpus", "6.671 núcleos (2.815 únicos)", "6.684 núcleos (2.828 únicos), como en la Etapa 2 (decisión D25)"],
    ["Tabla 2, V1", "«Proporción de RA que declaran una competencia de referencia…»", "Proporción de atributos del perfil alineados con al menos una capa (competencias, RA o asignaturas), como en R1"],
    ["Tabla 2, V2", "«Proporción de competencias cuyo verbo rector se repite»", "En R2 se usa como indicador dicotómico por matriz (90 % de matrices sin repetición); unificar"],
    ["Tabla 2, V5", "«Al menos un indicador diligenciado… con independencia de su naturaleza»", "Proporción de estrategias cuyo indicador de mayor nivel es N2 o superior (95,4 %), como en R5"],
    ["Tabla 2, V4", "Categoría de origen «B1. Cobertura de perfil»", "Revisar: V4 mide trazabilidad RA–estrategia, no cobertura del perfil"],
    ["Variables, B2", "Afirma que la calibración se contrastó con revisión experta en tres tareas", "Solo V1 tiene calibración (y su referencia es asistida por IAg); los umbrales de las Etapas 5 y 6 son operativos y no calibrados"],
    ["Tabla 6", "IA generativa: «Solo diseño y construcción»", "Añadir: elaboración asistida de la lectura de referencia de V1"],
    ["Referencias", "Robertson y Zaragoza (2009) no se cita en el texto", "Retirarla, o citarla si BM25 (rank-bm25) interviene en el método"],
    ["R7, Discusión", "«No existe evidencia de diferencias»; «las acciones pueden formularse institucionalmente»", "Ver comentario 4: la ausencia de significación no prueba homogeneidad"],
])

# ------------------------------------------------------------------ evidencia
h("Evidencia de soporte reconstruida", 1)
h("Matriz de confusión del método de asociación (V1)", 2)
p("Reconstruida a partir de auditoria/evidencia_calibracion_asociacion.json (márgenes por capa y listado de las 256 "
  "discrepancias). Los κ recalculados coinciden con los informados (0,429; 0,388; 0,322; 0,441). Clase positiva = "
  "«con respaldo»; clase negativa = «sin respaldo». La salida ternaria del método (explícito, parcial, sin respaldo) "
  "se dicotomiza porque la referencia es binaria.")
table([
    ["Capa", "n", "VP", "FP", "FN", "VN", "Acuerdo", "κ (IC 95 %)¹", "PABAK", "AC1 de Gwet"],
    ["Competencias", "429", "246", "59", "45", "79", "75,8 %", "0,43 (0,34–0,53)", "0,52", "0,58"],
    ["Resultados de aprendizaje", "429", "236", "68", "46", "79", "73,4 %", "0,39 (0,29–0,48)", "0,47", "0,53"],
    ["Asignaturas", "429", "380", "26", "12", "11", "91,1 %", "0,32 (0,11–0,53)", "0,82", "0,90"],
    ["Global", "1.287", "862", "153", "103", "169", "80,1 %", "0,44 (0,38–0,50)", "0,60", "0,69"],
])
p("¹ IC asintótico; no corrige la dependencia de las tres decisiones de un mismo atributo ni la agrupación por "
  "matriz, por lo que es optimista. VP: verdadero positivo; FP: falso positivo; FN: falso negativo; VN: verdadero negativo.", italic=True)
table([
    ["Capa", "Precisión (+)", "Sensibilidad (+)", "F1 (+)", "Especificidad (–)", "VPN (–)", "F1 (–)", "Exactitud balanceada"],
    ["Competencias", "0,807", "0,845", "0,826", "0,572", "0,637", "0,603", "0,709"],
    ["Resultados de aprendizaje", "0,776", "0,837", "0,805", "0,537", "0,632", "0,581", "0,687"],
    ["Asignaturas", "0,936", "0,969", "0,952", "0,297", "0,478", "0,367", "0,633"],
    ["Global", "0,849", "0,893", "0,871", "0,525", "0,621", "0,569", "0,709"],
])
p("Lectura crítica: el método es fiable para confirmar alineación, pero débil para detectar su ausencia, que es la "
  "clase de interés institucional. Solo recupera el 52,5 % de las decisiones «sin respaldo» de la referencia (29,7 % "
  "en la capa de asignaturas) y sobreestima la alineación (78,9 % frente a 75,0 % en la referencia). En consecuencia, "
  "el 3,8 % de atributos sin alineación debe leerse como cota inferior. El κ moderado coexiste con un acuerdo bruto "
  "alto por la prevalencia desbalanceada (75 % positivos; paradoja del kappa: Feinstein y Cicchetti, 1990), lo que "
  "justifica informar PABAK y AC1 junto a κ, no en su lugar.")

h("Validación por enfoque disciplinar (dejando fuera un enfoque)", 2)
p("En cada partición los parámetros se recalibraron sin el enfoque excluido y se evaluaron en él; es la única "
  "estimación fuera de la muestra disponible.")
table([
    ["Enfoque excluido", "Decisiones", "Acuerdo", "κ", "Parámetros (explícita / parcial / semántica / núcleo)"],
    ["Ciencias básicas", "69", "71,0 %", "0,36", "0,25 / 0,05 / 0,58 / no"],
    ["Creativo", "150", "82,7 %", "0,54", "0,25 / 0,05 / 0,58 / no"],
    ["Gestión y negocios", "294", "82,0 %", "0,38", "0,15 / 0,05 / 0,74 / sí"],
    ["Humano y educativo", "177", "68,9 %", "0,18", "0,25 / 0,05 / 0,58 / no"],
    ["Ingeniería y TIC", "171", "84,2 %", "0,46", "0,15 / 0,05 / 0,74 / sí"],
    ["Posgrado", "114", "72,8 %", "0,46", "0,35 / 0,15 / 0,46 / sí"],
    ["Servicios", "105", "77,1 %", "0,47", "0,15 / 0,05 / 0,74 / sí"],
    ["Social y comunicación", "207", "75,8 %", "0,40", "0,15 / 0,05 / 0,74 / sí"],
])
p("Que los parámetros óptimos cambien entre particiones indica sensibilidad del método al dominio disciplinar; en "
  "«Humano y educativo» el κ fuera de la muestra (0,18) es bajo.")

h("Tamaños de muestra por etapa analítica", 2)
table([
    ["Etapa / resultado", "Unidad", "n", "Razón del tamaño"],
    ["Corpus, R1–R5, R6", "Matriz programa-sede", "50", "Unidad de análisis declarada"],
    ["Sensibilidad de R6 y R7", "Programa (una matriz por programa)", "39 (38 en R7)", "Controla la oferta multisede; en R7 se excluye el programa cuya única matriz es HBOG [CONFIRMAR]"],
    ["R7, Kruskal-Wallis", "Matriz", "49", "Excluye HBOG (n = 1)"],
    ["R2 (V2)", "Competencia", "222 (182 específicas)", "Se excluyen 40 repeticiones de la competencia genérica institucional"],
    ["R3–R4 (V3, V4)", "RA único por matriz", "338 (586 registros RA–competencia)", "Un RA puede aportar a varias competencias; se deduplica"],
    ["R5 (V5)", "Estrategia / indicador", "391 / 1.185", "Paso 4"],
    ["Etapa 4, R1, R8.3 (V1)", "Atributo del perfil", "2.574 (de 2.580)", "Se excluyen 6 cifras de empleabilidad o etiquetas de nivel"],
    ["Calibración de V1", "Decisión atributo × capa", "1.287 (429 × 3; 11 matrices)", "Submuestra de calibración"],
    ["Corpus micro", "Registro de asignatura", "1.757", "Todas las asignaturas de las 50 matrices"],
    ["Etapas 2 y 5, R8.1, R8.2", "Asignatura no electiva", "1.616", "Se excluyen 141 electivas sin contenido propio"],
    ["R8.1", "Denominación", "709 (159 compartidas)", "Nombres únicos normalizados"],
    ["Etapa 6 (LDA)", "Documento = asignatura", "1.192", "Una matriz por programa para no duplicar la oferta multisede"],
    ["Etapa 2", "Núcleo temático", "6.684 (2.828 únicos)", "Separación por numeración"],
])

# ------------------------------------------------------------------ PROPUESTA 1
h("Propuesta 1. Transparencia metodológica y acotación del alcance", 1)
p("Responde con la evidencia ya disponible. Reescribe el método para declarar con precisión lo que se hizo, "
  "incorpora las métricas reconstruidas y reduce el alcance de las afirmaciones a lo que esa evidencia sostiene.")

comentario(1, "Validación del modelo analítico", C1)
bloque(
    "Agradecemos la observación, que nos llevó a reexaminar el procedimiento de validación de V1. En la versión "
    "revisada describimos con precisión el origen de los juicios de referencia: la lectura de referencia de 11 "
    "matrices (429 atributos; 1.287 decisiones atributo × capa) fue elaborada por el equipo investigador con "
    "asistencia de IAg sobre la matriz original y no por un panel de expertos independiente. Por ello, "
    "reformulamos el 80,1 % como concordancia del método determinista con una referencia provisional, no como "
    "exactitud frente a un estándar experto. Precisamos también que esa cifra se obtuvo dentro de la misma muestra "
    "usada para calibrar, y que la estimación fuera de la muestra procede de una validación cruzada dejando fuera un "
    "enfoque disciplinar (acuerdo entre 68,9 % y 84,2 %; κ entre 0,18 y 0,54). Incorporamos la matriz de confusión "
    "por capa, las métricas por clase (precisión, sensibilidad, especificidad, valor predictivo negativo y F1 de "
    "ambas clases) y los coeficientes PABAK y AC1 de Gwet, que corrigen la dependencia de κ respecto de la "
    "prevalencia. Este análisis revela que el método confirma con fiabilidad la alineación (sensibilidad 0,89), pero "
    "detecta solo el 52,5 % de las ausencias de respaldo, por lo que el 3,8 % de atributos sin alineación se "
    "interpreta ahora como cota inferior. El κ de 0,44 corresponde a un acuerdo moderado según Landis y Koch (1977), "
    "y débil según criterios más exigentes (McHugh, 2012); lo declaramos como limitación. Finalmente, añadimos una "
    "tabla que explica cada tamaño de muestra según la unidad de análisis de cada etapa.",
    [
        "Etapa 4: sustituir «se calibró con revisión experta» por la descripción del origen de la referencia y la distinción entre acuerdo dentro y fuera de la muestra.",
        "Nueva tabla (suplementaria o en el texto): matriz de confusión y métricas por clase y capa (ver Anexo de evidencia).",
        "R1 y Conclusiones: el 3,8 % sin alineación se presenta como cota inferior y como propuesta para revisión experta.",
        "Nueva Tabla S1: tamaños de muestra por etapa analítica y razón de cada uno.",
        "Limitaciones: ausencia de una referencia experta independiente; κ moderado; sensibilidad de los parámetros al enfoque disciplinar.",
        "Corregir 341 → 338 RA y 6.671 → 6.684 núcleos.",
    ])

comentario(2, "Contribución de la IAg", C2)
bloque(
    "Coincidimos con el revisor. Añadimos una tabla de distribución de funciones que separa, para cada tarea, el "
    "agente que la ejecutó, la intervención de la IAg y la verificación humana. La IAg intervino en tres tareas: "
    "estructuración de las matrices por los equipos académicos, programación y documentación del aplicativo, y "
    "elaboración asistida de la lectura de referencia de V1, esta última omitida en la versión anterior. Ningún "
    "resultado de R1–R8 procede de una salida generativa: todos se obtienen con procedimientos deterministas "
    "(extracción por reglas, TF-IDF, similitud coseno, embeddings con un modelo fijo y LDA con semillas fijas), que "
    "producen el mismo resultado ante la misma entrada. Retiramos las afirmaciones que atribuían a la IAg una mejora "
    "de escala, rapidez o calidad, porque el estudio no la contrastó con una alternativa sin IAg. La escala del "
    "análisis se atribuye ahora al procedimiento determinista; la aportación de la IAg se describe como facilitadora "
    "del desarrollo, sin estimación de su efecto.",
    [
        "Materiales y Métodos: nueva tabla «Distribución de funciones entre IAg, procedimientos deterministas y revisión humana».",
        "Tabla 6: añadir la elaboración asistida de la referencia de V1 como uso de la IAg.",
        "Resumen, D4 y Conclusiones: reemplazar «la IAg amplió la escala del análisis» por «el procedimiento determinista permitió examinar…; la IAg asistió su construcción».",
        "Limitaciones: el valor añadido de la IAg no se estimó empíricamente; no se comparó con un desarrollo sin IAg.",
    ])
table([
    ["Tarea", "Ejecutor", "Intervención de IAg", "Determinista", "Verificación humana"],
    ["Estructuración de matrices (Pasos 1–5)", "Equipos académicos", "Asistió la redacción y organización", "No aplica", "Aceptación, ajuste o descarte por los equipos [CONFIRMAR registro]"],
    ["Programación del aplicativo", "Equipo investigador", "Asistió código, documentación y depuración", "El código resultante sí", "Pruebas y controles (auditoria/control_*.json)"],
    ["Lectura de referencia de V1", "Equipo investigador", "Asistió la clasificación de 429 atributos", "No", "[CONFIRMAR: alcance real de la revisión humana]"],
    ["Análisis R1–R8", "Aplicativo", "Ninguna", "Sí", "Revisión de resultados por la autora"],
], header=True)

comentario(3, "Validez de constructo de V2 y V3", C3)
bloque(
    "Aceptamos ambas observaciones. V2 se redefine como indicador de cribado de diferenciación del verbo rector y no "
    "como medida de redundancia curricular: la repetición de un verbo entre competencias de un mismo programa señala "
    "un posible solapamiento que requiere lectura experta, pues dos competencias pueden compartir verbo con objetos, "
    "finalidades y niveles de exigencia distintos. En la versión revisada, el 90 % se interpreta como proporción de "
    "matrices sin alerta, y las cinco matrices con repetición se presentan como casos para revisión, no como "
    "evidencia de redundancia. Respecto de V3, renombramos la variable como «conformidad estructural del RA» y "
    "explicitamos que el 100 % verifica la presencia de los elementos exigidos por la plantilla (verbo observable y "
    "finalidad), no la calidad de la evaluación. La evidencia más próxima a la calidad evaluativa es V5, que muestra "
    "que solo el 0,8 % de las estrategias declara evidencia directa del aprendizaje; ese contraste se destaca ahora "
    "en la Discusión como hallazgo central.",
    [
        "Tabla 2: redefinir V2 (cribado de diferenciación léxica) y V3 (conformidad estructural); categoría de origen y nota de alcance.",
        "R2 y D1: lenguaje de «alerta de posible solapamiento» en lugar de «redundancia» o «inconsistencia».",
        "R3 y D2: V3 como condición del instrumento; contraste explícito V3 = 100 % frente a N3 = 0,8 %.",
        "Marco de validez: justificar el alcance interpretativo de cada variable (Messick, 1995; Kane, 2013).",
    ])

comentario(4, "Interpretación estadística y generalización", C4)
bloque(
    "Compartimos la cautela. Reformulamos R7 y la Discusión: la ausencia de diferencias significativas no se "
    "interpreta como evidencia de homogeneidad entre sedes. Declaramos explícitamente los factores que limitan la "
    "potencia y la validez de la comparación: grupos desiguales (22, 17, 7 y 3 matrices), exclusión de HBOG (n = 1), "
    "efecto techo en V5 (40 de 50 matrices en el 100 %), naturaleza dicotómica de V2 y dependencia de 19 matrices "
    "pertenecientes a 8 programas multisede que comparten RA. El análisis de sensibilidad con una matriz por programa "
    "(n = 38) conduce a la misma conclusión (p ≥ 0,18; ε² ≤ 0,055), pero no elimina la falta de potencia. Retiramos "
    "la inferencia de que las acciones de mejora pueden formularse institucionalmente a partir de R7; esa "
    "recomendación se sostiene ahora en la variabilidad dentro de las sedes y en el origen instrumental de las "
    "brechas, no en la prueba de contraste. Los resultados por sede se presentan como descriptivos y exploratorios.",
    [
        "R7: «no se detectaron diferencias» en lugar de «no existe evidencia de diferencias»; añadir el tamaño de cada grupo junto a cada estadístico.",
        "R7: informar ε² del análisis por programa y declarar las limitaciones de potencia.",
        "D2 y Conclusiones: retirar la inferencia de homogeneidad institucional.",
        "Limitaciones: dependencia de las observaciones, efecto techo y estudio de caso en una sola institución.",
    ])

comentario(5, "Reproducibilidad y transparencia", C5)
bloque(
    "Ampliamos la documentación del procedimiento con una tabla suplementaria de parámetros que distingue los "
    "calibrados (solo los de V1) de los operativos, que se fijaron a priori y no se ajustaron con revisión experta. "
    "Describimos el preprocesamiento (normalización de encabezados por aproximación, separación de núcleos por "
    "numeración, lematización con spaCy, exclusión de electivas y de la competencia genérica institucional), las "
    "decisiones de calibración (búsqueda en rejilla sobre la referencia de 11 matrices y validación cruzada por "
    "enfoque) y el estado real de la revisión experta. El código, las configuraciones y la documentación están "
    "disponibles para los revisores y se depositarán junto con la versión final [CONFIRMAR: repositorio y condiciones "
    "de acceso].",
    [
        "Nueva Tabla S2: parámetros, valor, función, estado (calibrado u operativo) y etapa (ver Anexo).",
        "Párrafo de preprocesamiento en la Etapa 2 y en la Etapa 6.",
        "Declaración de disponibilidad de código y datos.",
    ],
    "Ninguno adicional; la Tabla S2 se construye con config_asociacion_perfil.json y el texto del método.")

# ------------------------------------------------------------------ PROPUESTA 2
h("Propuesta 2. Reanálisis con los datos existentes", 1)
p("Incluye todo lo de la Propuesta 1 y añade análisis computacionales que pueden ejecutarse con el corpus y el "
  "código actuales, sin nuevos jueces. Fortalece la respuesta a los comentarios 1, 3, 4 y 5 con evidencia nueva, "
  "aunque no resuelve la falta de una referencia experta humana.")

comentario(1, "Validación del modelo analítico", C1)
bloque(
    "Además de declarar el origen de la referencia y reportar la matriz de confusión y las métricas por clase, "
    "realizamos cuatro análisis adicionales (Anexo B). Primero, estimamos el desempeño fuera de la muestra con "
    "validación cruzada anidada dejando fuera una matriz: en cada una de las 11 particiones los parámetros se "
    "calibraron con las otras diez y se evaluaron en la excluida. El acuerdo agregado fue del 77,1 % (IC 95 %: "
    "73,1–81,5), con κ = 0,39 (0,28–0,50) y AC1 = 0,63 (0,55–0,72), frente al 80,1 % y κ = 0,44 dentro de la muestra; "
    "por matriz, el acuerdo osciló entre 68,9 % y 86,5 % y κ entre 0,18 y 0,63, y los parámetros vigentes resultaron "
    "seleccionados en 5 de las 11 particiones. Segundo, los intervalos se obtuvieron por bootstrap en dos etapas "
    "(matrices y atributos dentro de cada matriz; 2.000 réplicas), que respeta la dependencia entre las tres "
    "decisiones de un mismo atributo; dentro de la muestra, κ = 0,44 (0,32–0,56). Tercero, comparamos el método con "
    "líneas base deterministas calibradas con la misma rejilla y el mismo objetivo. Fuera de la muestra, la cobertura "
    "léxica ponderada por IDF sin similitud semántica alcanzó κ = 0,43 y AC1 = 0,65, la similitud semántica sola "
    "κ = 0,32, y un léxico simple sin equivalencias de dominio, familias de palabras ni regla de rol κ = 0,36. La "
    "vía semántica, por tanto, no mejora el acuerdo con esta referencia, mientras que las familias de palabras sí "
    "contribuyen (κ = 0,35 sin ellas); lo informamos así y no atribuimos al componente semántico una mejora que los "
    "datos no muestran. Cuarto, el porcentaje de atributos sin alineación en las 50 matrices es sensible a los "
    "umbrales: varía entre 1,9 % y 10,8 % en la rejilla evaluada y entre 3,8 % y 8,9 % con los parámetros "
    "seleccionados en cada partición de la validación cruzada. En consecuencia, el 3,8 % se presenta como estimación "
    "condicionada a los parámetros vigentes y probablemente como cota inferior (especificidad fuera de la muestra: "
    "0,54). Las diferencias de tamaño de muestra entre etapas se explican en una tabla específica.",
    [
        "Todo lo de la Propuesta 1 para este comentario.",
        "Tabla de validación cruzada anidada por matriz (Anexo B, B1).",
        "Tabla de ablación frente a líneas base deterministas (B2).",
        "IC bootstrap en dos etapas para acuerdo, κ, AC1 y métricas por clase (B1).",
        "Tabla de sensibilidad del % sin alineación a los umbrales (B3); R1 y Conclusiones con el rango.",
    ],
    "Ejecutado: auditoria/scripts/revisores_validacion_v1.py → auditoria/evidencia_revisores_v1.json.")

comentario(2, "Contribución de la IAg", C2)
bloque(
    "Incorporamos la tabla de distribución de funciones y la declaración del uso de IAg en la elaboración asistida de "
    "la lectura de referencia. Para no atribuir mejoras no contrastadas, separamos dos niveles de evidencia. El "
    "aporte del procedimiento determinista se contrasta empíricamente con líneas base no generativas (ver comentario "
    "1), y ese contraste muestra que el componente más sofisticado, la similitud semántica, no mejora el acuerdo "
    "frente a una línea base léxica. El aporte de la IAg al desarrollo se describe con indicadores de proceso del "
    "registro del proyecto (26 decisiones metodológicas documentadas con fecha y justificación, 7 controles de "
    "regresión antes y después de cada ajuste, y el historial de versiones del código), sin inferir un efecto causal, "
    "porque no existe un desarrollo comparable sin IAg. Lo declaramos como limitación y como línea de investigación "
    "futura.",
    [
        "Todo lo de la Propuesta 1 para este comentario.",
        "Subapartado «Alcance de la evidencia sobre la IAg», que separa el aporte contrastado (procedimiento) del descriptivo (desarrollo asistido).",
    ])

comentario(3, "Validez de constructo de V2 y V3", C3)
bloque(
    "Contrastamos empíricamente el supuesto de V2. Calculamos la similitud semántica entre el objeto y la finalidad "
    "(la redacción sin el verbo rector) de todos los pares de competencias específicas de una misma matriz: 185 pares "
    "únicos, contando una sola vez los que se repiten en programas multisede. Ninguno de los 5 pares con verbo "
    "repetido supera el percentil 95 de la distribución (0,79) y 3 de ellos quedan por debajo de la mediana (0,63). "
    "Por ejemplo, en Derecho, «Conocer el derecho público…» y «Conocer los aspectos asociados a las relaciones de "
    "producción…» comparten verbo con contenidos claramente distintos (similitud 0,36). En cambio, 10 pares con "
    "verbos distintos superan el percentil 95, como «Aplicar teorías y metodologías del mercadeo y la comunicación "
    "publicitaria…» y «Desarrollar acciones tácticas mercadológicas y de comunicación publicitaria…» (0,87). La "
    "repetición del verbo, por tanto, no identifica solapamiento de contenido, lo que confirma la observación del "
    "revisor. En la versión revisada, V2 se retira como indicador de coherencia y se informa como dato descriptivo, y "
    "los pares de alta similitud se presentan como candidatos a revisión experta, sin calificarlos como redundancia. "
    "Detectamos además dos competencias cuyo verbo declarado no coincide con el de la redacción (p. ej., «conocer» "
    "frente a «proponer»), lo que indica inconsistencias de diligenciamiento. En V3 mantenemos el tratamiento de la "
    "Propuesta 1: no construimos un indicador automático de calidad del RA, porque sus criterios y ponderaciones "
    "requerirían una validación experta que este reanálisis no aporta.",
    [
        "R2 y Tabla 2: V2 deja de ser variable de coherencia; se informa el análisis de similitud (Anexo B, B4).",
        "R6 y R7: retirar V2 o conservarla solo como dato descriptivo [CONFIRMAR decisión de la autora].",
        "R3 y Discusión: V3 como conformidad estructural, igual que en la Propuesta 1.",
    ],
    "Ejecutado: auditoria/scripts/revisores_v2_r6_r7.py → auditoria/evidencia_revisores_r.json.")

comentario(4, "Interpretación estadística y generalización", C4)
bloque(
    "Además de reformular la interpretación, ajustamos las pruebas a la naturaleza de cada variable y a la dependencia "
    "de los datos (Anexo B, B5). Para V2, dicotómica, sustituimos Kruskal-Wallis por una prueba exacta de "
    "independencia sede × repetición estimada por Monte Carlo (100.000 permutaciones): χ² = 2,69, p = 0,45. Para V1, "
    "V4 y V5, el valor p por permutación (10.000) coincide con el asintótico (0,85; 0,29 y 0,66). Para tratar la "
    "dependencia entre matrices multisede, repetimos la prueba en 1.000 submuestras con una matriz al azar por "
    "programa: ninguna arrojó p < 0,05 (mediana de p entre 0,40 y 0,50). Sin embargo, los IC 95 % de ε² por "
    "bootstrap de programas son amplios (V1: 0–0,14; V4: 0–0,27; V5: 0–0,19) y no excluyen efectos moderados o "
    "grandes. La diferencia mínima detectable con potencia 0,80, estimada por simulación, es de 3 a 10 puntos "
    "porcentuales en V1 y de 10 a 23 puntos en V4, según la sede desplazada (la mayor en HMED, n = 3). Por tanto, el "
    "diseño solo permite descartar diferencias grandes, y una diferencia de 10 puntos en trazabilidad entre sedes "
    "pasaría inadvertida. Los ρ de Spearman de R6 se acompañan de IC 95 % por bootstrap de programas, todos los "
    "cuales incluyen el cero y son amplios (p. ej., V1–V4: −0,17; IC −0,50 a 0,20). HBOG se presenta solo "
    "descriptivamente.",
    [
        "R7: prueba exacta para V2; p por permutación; submuestreo de una matriz por programa; ε² con IC.",
        "Párrafo de diferencia mínima detectable (Anexo B, B5).",
        "R6: IC bootstrap de los ρ y advertencia sobre V2 (dicotómica) y V5 (efecto techo: 40 de 50 matrices en 100 %).",
    ],
    "Ejecutado: auditoria/scripts/revisores_v2_r6_r7.py → auditoria/evidencia_revisores_r.json.")

comentario(5, "Reproducibilidad y transparencia", C5)
bloque(
    "Depositamos un paquete de reproducibilidad con identificador persistente [CONFIRMAR: repositorio público o "
    "Zenodo; DOI] que contiene el código, las configuraciones versionadas, el entorno de ejecución (Dockerfile y "
    "requirements.txt), los diccionarios de sinónimos y equivalencias, la lectura de referencia con la fuente de cada "
    "decisión y los resultados derivados anonimizados. Las matrices originales no se publican por ser documentos "
    "institucionales; se indica el procedimiento de acceso [CONFIRMAR con la institución]. Documentamos el conjunto "
    "de datos con una hoja de datos (Gebru et al., 2021) y el método con una ficha de modelo (Mitchell et al., 2019), "
    "ambos ya citados en el manuscrito. Añadimos análisis de sensibilidad de los umbrales (Anexo B, B3 y B6). En V1, "
    "el porcentaje sin alineación varía entre 1,9 % y 10,8 % en la rejilla de cobertura explícita (0,15–0,35) y "
    "similitud semántica (0,50–0,66), mientras que el acuerdo con la referencia apenas cambia (75,1 %–80,7 %): la "
    "referencia no discrimina entre estos valores, lo que explica la sensibilidad del indicador. En la Etapa 5, el "
    "número de asignaturas homónimas divergentes es estable entre los umbrales 0,60 y 0,75 (15 o 16 de 159) y va de "
    "6 a 19 en el intervalo 0,40–0,80.",
    [
        "Tabla S2 de parámetros (como en la Propuesta 1).",
        "Tabla S3 de sensibilidad de umbrales.",
        "Material suplementario: hoja de datos y ficha de modelo.",
        "Declaración de disponibilidad con enlace persistente.",
    ])

# ------------------------------------------------------------------ PROPUESTA 3
h("Propuesta 3. Validación independiente con juicio experto humano", 1)
p("Incluye las Propuestas 1 y 2 y sustituye la referencia asistida por IAg por una referencia experta humana "
  "construida sobre matrices no usadas en la calibración. Es la respuesta más sólida al comentario 1, pero exige "
  "un plazo de reenvío amplio.")

comentario(1, "Validación del modelo analítico", C1)
bloque(
    "Para responder a la observación con un estándar experto, rediseñamos la validación en tres fases. (a) Selección "
    "de expertos: conformamos un panel de [PENDIENTE: n] jueces con criterios explícitos de inclusión (experiencia "
    "mínima en diseño curricular por competencias, participación en comités curriculares y dominio disciplinar del "
    "programa evaluado), sin participación en la construcción del aplicativo ni en la formulación de las matrices "
    "evaluadas. (b) Juicios de referencia: dos jueces independientes clasificaron cada decisión atributo × capa con "
    "un protocolo y un libro de códigos, sin acceso a la salida del método; los desacuerdos se resolvieron por "
    "consenso con un tercer juez. Informamos la concordancia entre jueces antes del consenso [PENDIENTE: κ y AC1 "
    "entre jueces], que fija el techo razonable para el desempeño del método. (c) Independencia de los conjuntos: "
    "mantenemos las 11 matrices de calibración y evaluamos el método con parámetros congelados en una muestra "
    "estratificada por enfoque y nivel de [PENDIENTE: n] matrices no usadas en la calibración [PENDIENTE: acuerdo, "
    "κ, AC1, matriz de confusión y métricas por clase en el conjunto de prueba]. La lectura asistida por IAg se "
    "conserva solo como antecedente y se informa su concordancia con el panel [PENDIENTE]. Las diferencias de "
    "tamaño de muestra entre etapas se explican en una tabla específica.",
    [
        "Nuevo apartado «Validación experta del método de asociación»: panel, protocolo, libro de códigos, cegamiento, consenso.",
        "Tablas de concordancia entre jueces y de desempeño en el conjunto de prueba independiente.",
        "Recalcular R1 y R8.3 si el panel modifica la calibración [CONFIRMAR antes de reenviar].",
    ],
    "Panel experto, protocolo aprobado por la institución, de 4 a 8 semanas según el número de matrices de prueba.")

comentario(2, "Contribución de la IAg", C2)
bloque(
    "Con la validación experta humana, ninguna cifra del artículo depende ya de juicios elaborados con IAg; la IAg "
    "queda limitada a la estructuración de las matrices y al desarrollo del aplicativo, como se muestra en la tabla "
    "de distribución de funciones. Para no implicar mejoras no probadas, el manuscrito separa tres niveles: el "
    "desempeño del procedimiento determinista, contrastado con el panel experto y con líneas base no generativas; la "
    "concordancia de la lectura asistida por IAg con el panel, presentada como evidencia exploratoria sobre su "
    "utilidad como apoyo a la revisión [PENDIENTE]; y el aporte al desarrollo, descrito sin efecto causal. Si la "
    "institución lo permite, un ejercicio controlado en una submuestra, con revisión manual cronometrada frente a "
    "revisión apoyada por el aplicativo, aportaría una estimación del ahorro de esfuerzo [PENDIENTE: diseño y "
    "resultados]; en su ausencia, se declara como limitación.",
    [
        "Todo lo de las Propuestas 1 y 2 para este comentario.",
        "Resultado exploratorio: concordancia de la lectura asistida por IAg con el panel experto.",
        "Opcional: ejercicio controlado de esfuerzo de revisión.",
    ])

comentario(3, "Validez de constructo de V2 y V3", C3)
bloque(
    "Sometemos V2 y V3 a validación de contenido por el panel. Para V2, los jueces valoran cada par de competencias "
    "marcado por la regla léxico-semántica (Propuesta 2) como solapamiento real, complementariedad o falsa alarma, lo "
    "que permite estimar la precisión de la alerta [PENDIENTE]. Para V3, sustituimos la conformidad estructural por una "
    "medida de evaluabilidad sustantiva: dos jueces aplican una rúbrica analítica a una muestra estratificada de RA "
    "(observabilidad, coherencia entre verbo y nivel taxonómico, especificidad del producto y posibilidad de definir "
    "un criterio de desempeño) y se informa su concordancia [PENDIENTE: κ ponderado]. Aplicamos el mismo esquema de "
    "doble codificación a los niveles de evidencia N1–N5 de V5 [PENDIENTE: κ entre codificadores], pendiente desde "
    "la versión anterior. El contraste entre conformidad estructural, evaluabilidad sustantiva y evidencia directa "
    "(N3 = 0,8 %) sostiene la discusión sobre la distancia entre cumplir la plantilla y evaluar el aprendizaje.",
    [
        "Nuevo apartado de validez de contenido de V2, V3 y V5 con rúbricas y concordancia.",
        "R2, R3 y R5 con los resultados del panel; Tabla 2 actualizada.",
    ])

comentario(4, "Interpretación estadística y generalización", C4)
bloque(
    "Además de los ajustes de la Propuesta 2, modelamos los datos en el nivel en que se generan. Estimamos modelos "
    "lineales generalizados mixtos binomiales sobre las unidades elementales (atributo para V1, RA para V4 y "
    "estrategia para V5), con la sede como efecto fijo y efectos aleatorios de programa y matriz, lo que incorpora la "
    "dependencia de las matrices multisede y aprovecha toda la información, en lugar de reducirla a una proporción "
    "por matriz [PENDIENTE: OR por sede con IC 95 % y varianza entre programas]. Si la institución define un margen de "
    "diferencia sin relevancia práctica, una prueba de equivalencia (TOST) permitiría afirmar homogeneidad y no solo "
    "ausencia de diferencia [CONFIRMAR margen]. Mantenemos el carácter exploratorio de las comparaciones y limitamos "
    "la generalización a la institución estudiada; la transferibilidad se plantea para el procedimiento, no para las "
    "cifras.",
    [
        "R7: modelos mixtos como análisis principal y Kruskal-Wallis como sensibilidad.",
        "Opcional: prueba de equivalencia con margen definido institucionalmente.",
        "Limitaciones: estudio de caso institucional y transferibilidad del procedimiento.",
    ],
    "Modelos con statsmodels o lme4 (Bates et al., 2015).")

comentario(5, "Reproducibilidad y transparencia", C5)
bloque(
    "Además del paquete de reproducibilidad, la Tabla S2 de parámetros y el análisis de sensibilidad de la Propuesta 2, "
    "documentamos el protocolo de la revisión experta: criterios de selección, libro de códigos, instrucciones a los "
    "jueces, decisiones por consenso y registro de cada decisión con su fuente (método, juez 1, juez 2, consenso). "
    "Publicamos el registro anonimizado de decisiones como material suplementario y un registro de cambios de "
    "parámetros que vincula cada ajuste con la evidencia que lo motivó, en coherencia con los principios P4 y P9 del "
    "propio modelo.",
    [
        "Material suplementario: protocolo experto, libro de códigos y registro de decisiones.",
        "Registro versionado de cambios de parámetros.",
    ])

# ------------------------------------------------------------------ Anexo parámetros
h("Anexo. Parámetros del procedimiento (base de la Tabla S2)", 1)
p("Valores tomados de config_asociacion_perfil.json y del texto del método. «Operativo» = fijado a priori, sin "
  "calibración experta.")
table([
    ["Etapa", "Parámetro", "Valor", "Estado"],
    ["4 (V1)", "Cobertura léxica ponderada por IDF para respaldo explícito", "≥ 0,25", "Calibrado (referencia asistida por IAg)"],
    ["4 (V1)", "Cobertura mínima para respaldo parcial", "≥ 0,05", "Calibrado"],
    ["4 (V1)", "Similitud semántica para respaldo parcial", "≥ 0,58", "Calibrado"],
    ["4 (V1)", "Modelo de embeddings", "paraphrase-multilingual-MiniLM-L12-v2", "Fijo"],
    ["4 (V1)", "FACTOR_ROL; PESO_NUCLEO; UMBRAL_CONTEXTO; PESO_CONTEXTO; RAIZ", "0,5; 3,0; 0,15; 0,25; 6", "[CONFIRMAR función y estado de cada uno]"],
    ["2", "Núcleo de extensión atípica", "> Q3 + 1,5 × RIC", "Regla estadística convencional"],
    ["4 (R4)", "Recuperación de RA reformulados entre Pasos 3 y 4", "Similitud ≥ 0,80 o mejor coincidencia mutua ≥ 0,50", "Operativo"],
    ["5", "Asignatura homónima divergente", "Similitud media < 0,60", "Operativo"],
    ["5", "Asignatura homónima idéntica", "≥ 0,95", "Operativo"],
    ["5", "Variante de nombre o error tipográfico", "Similitud de nombre ≥ 0,85", "Operativo"],
    ["5", "Par candidato a homologación", "Similitud de contenido ≥ 0,60", "Operativo"],
    ["6", "Número de tópicos LDA", "k = 13 (rango evaluado 5–30; NPMI y estabilidad)", "Seleccionado por criterio interno"],
    ["6", "Réplicas de consenso", "10 semillas", "Fijo"],
])

# ------------------------------------------------------------------ Anexo B: resultados
import json
BASE = "C:/Users/ximen/OneDrive/Proyectos_DS/Analisis_Curricular/auditoria/"
V = json.load(open(BASE + "evidencia_revisores_v1.json", encoding="utf-8"))
R = json.load(open(BASE + "evidencia_revisores_r.json", encoding="utf-8"))
f = lambda x, d=3: f"{x:.{d}f}".replace(".", ",")  # noqa: E731
pc = lambda x: f"{100 * x:.1f} %".replace(".", ",")  # noqa: E731
ic = lambda a: f"{f(a[0], 2)}–{f(a[1], 2)}"  # noqa: E731

h("Anexo B. Resultados de los análisis complementarios (Propuesta 2)", 1)
p("Fuentes: auditoria/evidencia_revisores_v1.json y auditoria/evidencia_revisores_r.json, generados por "
  "auditoria/scripts/revisores_validacion_v1.py y auditoria/scripts/revisores_v2_r6_r7.py (semilla 20261103).")

h("B1. Desempeño dentro y fuera de la muestra (V1)", 2)
filas = [["Capa", "Estimación", "VP", "FP", "FN", "VN", "Acuerdo", "κ", "AC1", "Sensibilidad", "Especificidad", "F1 (–)"]]
for capa in ["Competencia", "RA", "Asignatura", "Global"]:
    for et, k in [("Dentro de la muestra", "dentro_muestra"), ("Fuera de la muestra", "lomo")]:
        m = V[k][capa]
        filas.append([capa, et, m["VP"], m["FP"], m["FN"], m["VN"], pc(m["acuerdo"]), f(m["kappa"], 2), f(m["AC1"], 2),
                      f(m["sensibilidad"], 2), f(m["especificidad"], 2), f(m["F1_neg"], 2)])
table(filas)
filas = [["Métrica global", "Dentro de la muestra (IC 95 %)", "Fuera de la muestra (IC 95 %)"]]
for k, n in [("acuerdo", "Acuerdo"), ("kappa", "κ"), ("AC1", "AC1"), ("sensibilidad", "Sensibilidad"),
             ("especificidad", "Especificidad"), ("F1_neg", "F1 (–)")]:
    filas.append([n, f"{f(V['dentro_muestra']['Global'][k], 2)} ({ic(V['dentro_muestra_IC95'][k])})",
                  f"{f(V['lomo']['Global'][k], 2)} ({ic(V['lomo_IC95'][k])})"])
table(filas)
p("Fuera de la muestra = validación cruzada anidada dejando fuera una matriz (11 particiones). IC por bootstrap en "
  "dos etapas (matrices y atributos), 2.000 réplicas.", italic=True)
filas = [["Matriz excluida", "Decisiones", "Acuerdo", "κ", "Parámetros elegidos sin ella"]]
for m, v in V["lomo_por_matriz"].items():
    pr = V["lomo_parametros"][m]
    filas.append([m, v["n"], pc(v["acuerdo"]), f(v["kappa"], 2),
                  f"{f(pr['explicita'], 2)} / {f(pr['parcial'], 2)} / {f(pr['semantica'], 2)} / {'sí' if pr['nucleo'] else 'no'}"])
table(filas)

h("B2. Ablación frente a líneas base deterministas", 2)
filas = [["Variante", "Acuerdo dentro", "κ dentro", "Acuerdo fuera", "κ fuera", "AC1 fuera", "Especificidad fuera"]]
for n, v in V["ablacion"].items():
    filas.append([n, pc(v["dentro_acuerdo"]), f(v["dentro"], 2), pc(v["lomo"]["acuerdo"]), f(v["lomo"]["kappa"], 2),
                  f(v["lomo"]["AC1"], 2), f(v["lomo"]["especificidad"], 2)])
table(filas)
p("Cada variante se calibró con la misma rejilla y el mismo objetivo (κ promedio por enfoque). Las diferencias entre "
  "el método completo y la variante solo léxica están dentro de los IC de B1; la conclusión es que la vía semántica "
  "no aporta mejora demostrable con esta referencia, no que la empeore.", italic=True)

h("B3. Sensibilidad de V1 a los umbrales", 2)
sc = {(x["explicita"], x["semantica"]): x for x in V["sensibilidad_calibracion"]}
filas = [["Explícita", "Semántica", "Acuerdo (calibración)", "κ (calibración)", "% sin alineación (50 matrices)", "V1 mínima por matriz"]]
for x in V["sensibilidad_50"]:
    c = sc[(x["explicita"], x["semantica"])]
    filas.append([f(x["explicita"], 2), f(x["semantica"], 2), pc(c["acuerdo"]), f(c["kappa"], 2),
                  f"{f(x['sin_alineacion_%'], 1)} %", f"{f(x['V1_min'], 1)} %"])
table(filas)
p("Parámetros vigentes: 0,25 / 0,58 (3,8 %). Con los parámetros elegidos en cada partición de B1, el % sin "
  "alineación en las 50 matrices va de " + f(min(V["parametros_lomo_en_50"].values()), 1) + " % a "
  + f(max(V["parametros_lomo_en_50"].values()), 1) + " %.", italic=True)

h("B4. V2: similitud semántica entre competencias de una misma matriz", 2)
u = R["V2_pares_unicos"]
table([["Indicador", "Valor"],
       ["Pares únicos de competencias específicas intra-matriz", u["pares"]],
       ["Mediana y P95 de similitud (sin verbo rector)", f"{f(u['sim_P50'], 2)} y {f(u['sim_P95'], 2)}"],
       ["Pares con verbo repetido", u["mismo_verbo"]],
       ["… sobre el P95", u["mismo_verbo_sobre_P95"]],
       ["… bajo la mediana", u["mismo_verbo_bajo_P50"]],
       ["Pares con verbo distinto sobre el P95", u["verbo_distinto_sobre_P95"]],
       ["Competencias con verbo declarado ≠ verbo de la redacción", len(R["V2_verbo_inconsistente"])]])
vistos, filas = set(), [["Matriz", "Verbo", "Similitud", "Percentil"]]
for x in R["V2"]["pares_mismo_verbo"]:
    k = (x["a"], x["b"])
    if k in vistos:
        continue
    vistos.add(k)
    filas.append([x["matriz"], x["verbo_a"], f(x["sim"], 2), f(x["percentil"], 0)])
table(filas)
p("Percentil calculado sobre los 266 pares intra-matriz con repeticiones multisede; el resultado sin duplicados es el "
  "de la tabla anterior.", italic=True)

h("B5. R6 y R7 con tratamiento de la dependencia", 2)
filas = [["Par", "ρ", "IC 95 % (bootstrap de programas)"]]
for k, v in R["R6"].items():
    filas.append([k, f(v["rho"], 2), ic(v["IC95"])])
table(filas)
filas = [["Variable", "H", "p asintótica", "p permutación", "ε² (IC 95 %)", "Submuestreo 1 matriz/programa: p mediana", "% submuestras p < 0,05"]]
for v in ["V1", "V4", "V5"]:
    x = R["R7"][v]
    filas.append([v, f(x["H"], 2), f(x["p_asintotica"]), f(x["p_permutacion"]), f"{f(x['epsilon2'])} ({ic(x['epsilon2_IC95'])})",
                  f(x["submuestreo_p_mediana"], 2), pc(x["submuestreo_prop_p<0,05"])])
x = R["R7"]["V2"]
filas.append(["V2", "χ² = " + f(x["chi2"], 2), "—", f(x["p_exacta_MonteCarlo"]) + " (exacta, Monte Carlo)", "—", "—", "—"])
table(filas)
filas = [["Sede desplazada", "n", "DMD en V1 (pp)", "DMD en V4 (pp)"]]
for s in sorted(R["R7"]["tamanos"]):
    filas.append([s, R["R7"]["tamanos"][s], f(R["R7"]["MDE_pp_potencia_0,80"]["V1"][s], 0), f(R["R7"]["MDE_pp_potencia_0,80"]["V4"][s], 0)])
table(filas)
p("DMD = diferencia mínima detectable con potencia 0,80 y α = 0,05, por simulación (400 réplicas por valor), "
  "desplazando una sede hacia abajo sobre valores remuestreados del conjunto. Supone que las sedes comparten la "
  "forma de la distribución.", italic=True)

h("B6. Etapa 5: umbral de divergencia de asignaturas homónimas", 2)
e5 = R["etapa5_homonimas"]["por_umbral"]
table([["Umbral"] + [f(float(k), 2) for k in e5], ["Divergentes (de 159)"] + list(e5.values())])

# ------------------------------------------------------------------ Anexo C: validación
h("Anexo C. Validación de los scripts y de los Excel de soporte", 1)
p("Se verificó que los archivos de soporte y los scripts nuevos reproducen las cifras del manuscrito antes de "
  "usarlos en la respuesta.")
table([
    ["Archivo / script", "Comprobación", "Resultado"],
    ["Asociacion_perfil_50_matrices.xlsx", "50 matrices; 2.574 atributos evaluables (6 no evaluables); 98 sin alineación (3,8 %)", "Coincide"],
    ["", "Por capa 75,6 % / 72,4 % / 95,2 %; tres capas 65,7 %; profesional 97,4 % (424); ocupacional 96,0 % (2.150)", "Coincide"],
    ["", "V1 por matriz 87,2 %–100 %, mediana 97,3 %; 12 matrices al 100 %; Resumen = recálculo desde Items", "Coincide"],
    ["", "Poblaciones de actuación: 423 atributos, 10,9 % sin alineación", "Coincide"],
    ["Calibracion_asociacion_perfil.xlsx", "Global 80,1 %, κ 0,441; por capa 0,429 / 0,388 / 0,322; 256 discrepancias; validación por enfoque 68,9 %–84,2 %", "Coincide"],
    ["referencia_asociacion_perfil.csv", "429 atributos, 11 matrices, 8 enfoques; 389 con fuente «Lectura experta Claude»", "Coincide; las 11 matrices están dentro de las 50 (sin conjunto independiente)"],
    ["revisores_validacion_v1.py", "Reproduce 80,1 % y los cuatro κ publicados; reproduce 2.574 atributos y 3,8 % en las 50 matrices (aserciones en el código)", "Coincide"],
    ["revisores_v2_r6_r7.py", "Reproduce los seis ρ de R6 y las H de R7 (V1 0,84; V4 3,86; V5 1,57); identifica las 5 matrices con verbo repetido", "Coincide"],
    ["Corrección durante la validación", "La primera ejecución contó 2.584 atributos por no deduplicar por (perfil, origen, texto) como el aplicativo; corregido", "Resuelto"],
    ["Corrección durante la validación", "Los percentiles de V2 contaban dos veces los pares de programas multisede; se añadió el cálculo sin duplicados (185 pares)", "Resuelto; conclusión igual"],
])
p("Limitaciones de los análisis nuevos: el IC bootstrap de ε² se calcula sobre las réplicas que conservan las cuatro "
  "sedes con al menos dos matrices; la DMD supone distribuciones de igual forma entre sedes; la ablación y la "
  "validación cruzada usan la misma referencia asistida por IAg, por lo que miden concordancia con ella y no "
  "exactitud frente a un juicio experto.", italic=True)

# ------------------------------------------------------------------ recomendación
h("Recomendación", 1)
p("Se recomienda la Propuesta 2 como base, ya calculada (Anexo B), con el comentario 1 respondido según la Propuesta 3 "
  "en la medida en que pueda conformarse un panel de al menos dos jueces sobre una muestra de matrices no usadas en "
  "la calibración. El revisor pide explícitamente la selección de expertos y la independencia entre calibración y "
  "evaluación, y los análisis de la Propuesta 2 confirman su preocupación: fuera de la muestra el acuerdo baja a "
  "77,1 % (κ = 0,39), la vía semántica no mejora a una línea base léxica y el % sin alineación depende de los "
  "umbrales (1,9 %–10,8 %). Dos decisiones quedan en manos de la autora antes de reescribir el manuscrito: si se "
  "simplifica el método de V1 a la vía léxica, y si V2 se retira de R6 y R7.")

h("Referencias nuevas sugeridas (verificar DOI antes de incorporar)", 1)
for r in [
    "Bates, D., Mächler, M., Bolker, B., & Walker, S. (2015). Fitting linear mixed-effects models using lme4. Journal of Statistical Software, 67(1), 1–48.",
    "Byrt, T., Bishop, J., & Carlin, J. B. (1993). Bias, prevalence and kappa. Journal of Clinical Epidemiology, 46(5), 423–429.",
    "Feinstein, A. R., & Cicchetti, D. V. (1990). High agreement but low kappa: I. The problems of two paradoxes. Journal of Clinical Epidemiology, 43(6), 543–549.",
    "Gwet, K. L. (2008). Computing inter-rater reliability and its variance in the presence of high agreement. British Journal of Mathematical and Statistical Psychology, 61(1), 29–48.",
    "Kane, M. T. (2013). Validating the interpretations and uses of test scores. Journal of Educational Measurement, 50(1), 1–73.",
    "Landis, J. R., & Koch, G. G. (1977). The measurement of observer agreement for categorical data. Biometrics, 33(1), 159–174.",
    "McHugh, M. L. (2012). Interrater reliability: The kappa statistic. Biochemia Medica, 22(3), 276–282.",
    "Messick, S. (1995). Validity of psychological assessment. American Psychologist, 50(9), 741–749.",
    "Varma, S., & Simon, R. (2006). Bias in error estimation when using cross-validation for model selection. BMC Bioinformatics, 7, 91.",
]:
    par = doc.add_paragraph(r)
    par.paragraph_format.left_indent = Cm(1)
    par.paragraph_format.first_line_indent = Cm(-1)

doc.save(OUT)
print("ok", OUT)
