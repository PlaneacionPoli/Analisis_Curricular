"""
Respuesta definitiva a los revisores, construida pregunta a pregunta con la autora (desde 2026-11-04).
Las cifras proceden de auditoria/evidencia_revisores_v1.json, evidencia_revisores_r.json y FASES_PROYECTO.md.
Los textos [CONFIRMAR] marcan decisiones o datos pendientes de la autora (en rojo en el Word).

Uso: python auditoria/scripts/generar_respuesta_final.py
Salida: auditoria/Respuesta_revisores_final.docx
"""
import re

from docx import Document
from docx.shared import Cm, Pt, RGBColor

OUT = 'auditoria/Respuesta_revisores_final.docx'
doc = Document()
doc.styles['Normal'].font.name = 'Times New Roman'
doc.styles['Normal'].font.size = Pt(11)
for s in doc.sections:
    s.left_margin = s.right_margin = s.top_margin = s.bottom_margin = Cm(2.5)


def _runs(par, text, italic=False, bold=False):
    for seg in re.split(r'(\[(?:CONFIRMAR|PENDIENTE)[^\]]*\])', text):
        if not seg:
            continue
        r = par.add_run(seg)
        r.italic, r.bold = italic, bold
        if seg.startswith(('[CONFIRMAR', '[PENDIENTE')):
            r.font.color.rgb = RGBColor(0xC0, 0x00, 0x00)
            r.bold = True


def p(text, italic=False, bold=False):
    par = doc.add_paragraph()
    _runs(par, text, italic, bold)
    par.paragraph_format.space_after = Pt(6)


def bullets(items):
    for it in items:
        _runs(doc.add_paragraph(style='List Bullet'), it)


def table(rows):
    t = doc.add_table(rows=len(rows), cols=len(rows[0]))
    t.style = 'Table Grid'
    for i, row in enumerate(rows):
        for j, val in enumerate(row):
            c = t.cell(i, j)
            c.text = ''
            _runs(c.paragraphs[0], str(val), bold=i == 0)
            for r in c.paragraphs[0].runs:
                r.font.size = Pt(9)
    doc.add_paragraph()


def respuesta(parrafos):
    for titulo, texto in parrafos:
        par = doc.add_paragraph()
        if titulo:
            par.add_run(titulo + ' ').bold = True
        _runs(par, texto)
        par.paragraph_format.space_after = Pt(6)


doc.add_heading('Respuesta a los revisores', 0)
p('Manuscrito: «Inteligencia artificial generativa como infraestructura de decisión curricular: estudio aplicado sobre '
  'coherencia, evaluabilidad y trazabilidad en una institución de educación superior».', italic=True)
p('Versión de trabajo construida pregunta a pregunta. Estado: las cinco preguntas redactadas; quedan los puntos [CONFIRMAR] señalados en rojo.',
  italic=True)

# =====================================================================================================  PREGUNTA 1
doc.add_heading('Comentario 1. Validación del modelo analítico', 1)
p('Observación del revisor: «Los autores deben proporcionar más información sobre la selección de expertos, el '
  'procedimiento de validación, los juicios de referencia y la independencia de los conjuntos de datos de calibración y '
  'evaluación. El acuerdo reportado del 80,1 % y el coeficiente kappa de Cohen de 0,44 requieren una interpretación más '
  'crítica. Los indicadores de desempeño específicos de la clase y una matriz de confusión fortalecerían la transparencia '
  'metodológica. Explique de forma coherente los diferentes tamaños de muestra utilizados en las distintas etapas '
  'analíticas.»', italic=True)

doc.add_heading('Respuesta', 2)
respuesta([
    ('Revisión experta.',
     'Cada matriz fue revisada antes del análisis por los directores de programa, los coordinadores de escuela, el líder y '
     'el director de currículo. El director de currículo revisó además los resultados del aplicativo en tres fases (3, 46 y '
     '50 matrices; Tabla X), y los resultados consolidados se presentaron a la Vicerrectoría Académica. La revisión de las '
     'reglas y los resultados por la investigación principal, responsable del desarrollo, se informa como control de calidad '
     'interno y no como validación independiente.'),
    ('Juicios de referencia y calibración.',
     'La lectura de referencia usada para calibrar la asociación del perfil (11 matrices, 1.287 decisiones) fue elaborada '
     'por el equipo investigador con apoyo de IAg y no fue validada por un comité experto; corregimos la descripción '
     'anterior. Los umbrales se ajustaron para maximizar el acuerdo con esa referencia.'),
    ('Independencia de los datos.',
     'El acuerdo del 80,1 % se obtuvo sobre el mismo conjunto usado para calibrar. Evaluamos ahora el método con matrices '
     'excluidas de la calibración: el acuerdo es del 77,1 % (κ = 0,39), cifra que el manuscrito informa en su lugar.'),
    ('Interpretación.',
     'El κ indica un acuerdo moderado. El método reconoce bien la alineación existente (sensibilidad 0,85), pero detecta '
     'solo la mitad de las ausencias (especificidad 0,54). Por ello, el 3,8 % de atributos sin alineación se presenta como '
     'una cota inferior y los resultados como propuestas para la revisión del comité curricular. Una versión más simple, '
     'basada solo en coincidencia de términos, obtuvo un acuerdo similar (κ = 0,43), y así se declara '
     '[CONFIRMAR: mantener el componente semántico o simplificar el método].'),
    ('Métricas por clase y matriz de confusión.', 'Se incorporan en la Tabla Y.'),
    ('Tamaños de muestra.',
     'La Tabla S1 indica la unidad de análisis y el tamaño de cada etapa. Corregimos dos inconsistencias: 338 RA únicos y '
     '6.684 núcleos temáticos.'),
    ('Limitación.',
     'Se declara que la referencia no constituye un juicio experto independiente. [CONFIRMAR: si el comité curricular '
     'validará una muestra de decisiones antes del reenvío, añadir aquí el compromiso; si no, conservar solo la limitación.]'),
])

doc.add_heading('Tabla X. Fases de desarrollo y revisión (nueva, en el Procedimiento)', 2)
table([
    ['Fase', 'Periodo', 'Matrices', 'Revisión'],
    ['Revisión de insumos', 'Previa a cada fase', 'Cada matriz, de forma individual',
     'Directores de programa, coordinadores de escuela, líder de currículo y director de currículo'],
    ['Control de calidad interno', 'Antes de cada fase', 'Todas las de la fase',
     'Investigación principal: reglas, aplicativo y resultados (no independiente del desarrollo)'],
    ['1. Preliminar', 'feb.–abr. 2026', '3 (Administración de Empresas PBOG, Derecho VNAL, Ingeniería Industrial PMED)',
     'Director de currículo: resultados en el aplicativo'],
    ['2. Ampliación', 'abr.–may. 2026', '46 (incluye las 3 del piloto)', 'Director de currículo: resultados en el aplicativo'],
    ['3. Consolidación', 'may.–oct. 2026', '50 (39 de la fase 2, de las cuales 32 se actualizaron; 7 excluidas; 11 incorporadas)',
     'Director de currículo; presentación a la Vicerrectoría Académica (oct. 2026)'],
])

doc.add_heading('Tabla S1. Tamaños de muestra por etapa (nueva, suplementaria)', 2)
table([
    ['Etapa / resultado', 'Unidad', 'n', 'Criterio'],
    ['Corpus, R1–R5, R6', 'Matriz programa-sede', '50', 'Unidad de análisis'],
    ['R6 y R7, sensibilidad', 'Programa', '39 (38 en R7)', 'Una matriz por programa (oferta multisede)'],
    ['R7, Kruskal-Wallis', 'Matriz', '49', 'Sin HBOG (n = 1)'],
    ['R2 (V2)', 'Competencia', '222 (182 específicas)', 'Sin las 40 repeticiones de la competencia genérica'],
    ['R3–R4 (V3, V4)', 'RA único', '338 (586 registros)', 'Un RA aporta a varias competencias'],
    ['R5 (V5)', 'Estrategia / indicador', '391 / 1.185', 'Paso 4'],
    ['Etapa 4, R1, R8.3 (V1)', 'Atributo del perfil', '2.574 (de 2.580)', 'Sin 6 cifras de empleabilidad o etiquetas de nivel'],
    ['Calibración de V1', 'Decisión atributo × capa', '1.287 (429 × 3; 11 matrices)', 'Submuestra de 8 enfoques'],
    ['Corpus micro', 'Asignatura', '1.757', 'Todas las asignaturas'],
    ['Etapas 2 y 5; R8.1–R8.2', 'Asignatura no electiva', '1.616', 'Sin 141 electivas'],
    ['Etapa 6 (LDA)', 'Asignatura', '1.192', 'Una matriz por programa'],
    ['Etapa 2', 'Núcleo temático', '6.684 (2.828 únicos)', 'Separación por numeración'],
])

doc.add_heading('Tabla Y. Desempeño del método de asociación del perfil (nueva)', 2)
table([
    ['Capa', 'Estimación', 'VP', 'FP', 'FN', 'VN', 'Acuerdo', 'κ', 'AC1', 'Sensibilidad', 'Especificidad'],
    ['Competencias', 'Dentro', '246', '59', '45', '79', '75,8 %', '0,43', '0,58', '0,85', '0,57'],
    ['Competencias', 'Fuera', '228', '57', '63', '81', '72,0 %', '0,37', '0,50', '0,78', '0,59'],
    ['RA', 'Dentro', '236', '68', '46', '79', '73,4 %', '0,39', '0,53', '0,84', '0,54'],
    ['RA', 'Fuera', '219', '63', '63', '84', '70,6 %', '0,35', '0,47', '0,78', '0,57'],
    ['Asignaturas', 'Dentro', '380', '26', '12', '11', '91,1 %', '0,32', '0,90', '0,97', '0,30'],
    ['Asignaturas', 'Fuera', '370', '27', '22', '10', '88,6 %', '0,23', '0,87', '0,94', '0,27'],
    ['Global', 'Dentro', '862', '153', '103', '169', '80,1 %', '0,44', '0,69', '0,89', '0,53'],
    ['Global', 'Fuera', '817', '147', '148', '175', '77,1 %', '0,39', '0,63', '0,85', '0,54'],
])
p('Dentro = sobre el conjunto de calibración. Fuera = validación cruzada anidada dejando fuera una matriz. Clase positiva: '
  'con respaldo. Fuente: auditoria/evidencia_revisores_v1.json.', italic=True)

doc.add_heading('Cambios en el manuscrito', 2)
table([
    ['Ubicación', 'Texto actual', 'Cambio'],
    ['Materiales y Métodos, diseño', '«validación cualitativa por equipos expertos»',
     '«revisión de las matrices en una cadena de cuatro niveles y revisión de los resultados por la Dirección de Currículo»'],
    ['Variables, B2', '«contrastó con la revisión experta de matrices reales en tres tareas»; «se calibró con revisión experta»',
     '«La asociación del perfil se calibró contra una lectura de referencia elaborada con asistencia de IAg (Etapa 4); los '
     'umbrales de las Etapas 5 y 6 son operativos y no se calibraron»'],
    ['Corpus', 'Criterio «autorización»', 'Precisar la cadena de revisión de cuatro niveles'],
    ['Procedimiento', '—', 'Nuevo apartado «Fases de desarrollo y revisión» con la Tabla X, antes de las siete etapas'],
    ['Etapa 4', 'Un solo párrafo', 'Tres apartados: construcción de la referencia, calibración y validación (dentro y fuera de la muestra), con la Tabla Y'],
    ['Tabla 6', 'IAg: «Solo diseño y construcción»', 'Añadir la elaboración asistida de la referencia de V1'],
    ['Resumen, R1, Conclusiones', '3,8 % sin alineación', 'Estimación condicionada a los umbrales y cota inferior'],
    ['Resumen; Corpus', '341 RA; 6.671 núcleos', '338 RA; 6.684 núcleos'],
    ['Discusión D3', '—', 'Fases de revisión y presentación a la Vicerrectoría como evidencia de gobernanza (pregunta de investigación 3)'],
    ['Nuevo apartado de Limitaciones', '—',
     'Referencia de V1 asistida por IAg y sin validar; calibración dentro del corpus; especificidad baja; sensibilidad a los '
     'umbrales; revisión de resultados por un único revisor; doble rol de desarrollo y revisión'],
    ['Material suplementario', '—', 'Tabla S1'],
    ['Página de título', '—', 'Declaración CRediT y de conflicto de intereses y posicionalidad (ver abajo)'],
])

doc.add_heading('Declaraciones para la página de título (no van en el manuscrito anonimizado)', 2)
respuesta([
    ('Contribución de autoría (CRediT).',
     '[CONFIRMAR: iniciales y coautores] Conceptualización, Metodología, Software, Validación, Análisis formal, Curación de '
     'datos, Redacción del borrador original, Revisión y edición, Visualización.'),
    ('Conflicto de intereses y posicionalidad.',
     'La autoría pertenece a la institución estudiada [CONFIRMAR: dependencia y cargo] y desarrolló el aplicativo analizado, '
     'cuyas reglas, funcionamiento y resultados también revisó. El aplicativo no tiene fines comerciales. La institución '
     'autorizó el uso de la información con fines de evaluación curricular.'),
])
p('En revisión doble ciega, la respuesta y el manuscrito usan «el equipo investigador» o «la investigación principal», sin '
  'cargo ni dependencia.', italic=True)

doc.add_heading('Referencias que se añaden', 2)
for r in [
    'Feinstein, A. R., & Cicchetti, D. V. (1990). High agreement but low kappa: I. The problems of two paradoxes. Journal of Clinical Epidemiology, 43(6), 543–549.',
    'Gwet, K. L. (2008). Computing inter-rater reliability and its variance in the presence of high agreement. British Journal of Mathematical and Statistical Psychology, 61(1), 29–48.',
    'Landis, J. R., & Koch, G. G. (1977). The measurement of observer agreement for categorical data. Biometrics, 33(1), 159–174.',
    'McHugh, M. L. (2012). Interrater reliability: The kappa statistic. Biochemia Medica, 22(3), 276–282.',
]:
    par = doc.add_paragraph(r + ' [CONFIRMAR DOI]')
    par.paragraph_format.left_indent = Cm(1)
    par.paragraph_format.first_line_indent = Cm(-1)

# =====================================================================================================  PREGUNTA 2
doc.add_heading('Comentario 2. Clarificación de la contribución de la IAg', 1)
p('Observación del revisor: «El manuscrito debe distinguir más claramente entre el desarrollo de la infraestructura '
  'analítica asistido por GenAI y los procedimientos deterministas responsables de los hallazgos reportados. El valor '
  'añadido de GenAI debe discutirse sin implicar mejoras que no se hayan probado empíricamente frente a una alternativa que '
  'no sea GenAI.»', italic=True)

doc.add_heading('Respuesta', 2)
respuesta([
    ('Desarrollo frente a cálculo.',
     'La IAg apoyó el desarrollo del instrumento, pero ninguna cifra del estudio procede de ella: todas se obtienen con '
     'procedimientos deterministas y reproducibles (reglas, similitud de textos, modelo temático con semillas fijas y '
     'pruebas estadísticas). El módulo generativo del aplicativo no se utilizó.'),
    ('Usos de la IAg.',
     'Añadimos un inventario completo (Tabla Z). La Dirección de Currículo revisó con OpenAI la redacción y la coherencia de '
     'las matrices antes de aprobarlas; Claude (Anthropic) apoyó la programación, la propuesta de reglas, la lectura de '
     'referencia de V1, los diccionarios de términos, la configuración del modelo temático y la redacción. Corregimos la '
     'afirmación de que la IAg no intervino en el análisis: no produjo cifras, pero sí apoyó la definición de reglas y la '
     'calibración de V1.'),
    ('Valor añadido.',
     'Retiramos las afirmaciones de mejora en escala o calidad atribuidas a la IAg, porque no se compararon con un desarrollo '
     'sin ella. Esa comparación se declara como limitación y como línea de investigación futura.'),
    ('Título.',
     'Ajustamos el título y el marco para que la IAg figure como apoyo al desarrollo y no como el instrumento de análisis.'),
])

doc.add_heading('Tabla Z. Uso de la IAg en el estudio: alcance y trazabilidad (nueva, en Materiales y Métodos)', 2)
table([
    ['#', 'Etapa y uso', 'Ejecutor y herramienta', 'Verificación humana', 'Efecto sobre los resultados'],
    ['', 'A. INSUMO CURRICULAR', '', '', ''],
    ['U1', 'Revisión de la redacción y la coherencia de las matrices curriculares (Pasos 1–5)',
     'Dirección de Currículo con una herramienta de OpenAI [CONFIRMAR: versión del modelo]',
     'Cadena de revisión de cuatro niveles (programa, escuela, líder y director de currículo)',
     'Insumo del corpus; el estudio no estima el efecto de la IAg sobre su calidad y puede contribuir a la uniformidad '
     'formal de las formulaciones (V3)'],
    ['', 'B. DESARROLLO DEL INSTRUMENTO', '', '', ''],
    ['U2', 'Programación del aplicativo: código, documentación y depuración',
     'Investigación principal con Claude (Anthropic); 33 commits con coautoría declarada',
     'Pruebas automatizadas, controles de regresión y revisión de la investigación principal',
     'Ninguno directo: el código resultante es determinista y reproducible'],
    ['U3', 'Scripts de auditoría: estadística (R6, R7), figuras, controles antes y después, verificación de cifras',
     'Investigación principal con Claude', 'Contraste de cada cifra con los archivos de evidencia; reproducción completa',
     'Ninguno directo (código determinista)'],
    ['U4', 'Propuesta de reglas y criterios: regla y libro de códigos de N1–N5 (V5), regla de asignación de tendencias, '
     'valoración Cumple/Parcial/No cumple, separación de núcleos y deduplicación de RA',
     'Claude propuso; la investigación principal decidió (decisiones D1–D30 registradas con fecha y justificación)',
     'Aprobación de cada decisión; sin doble codificación de N1–N5 (un solo codificador)',
     'Directo en la definición de las variables, no en su ejecución'],
    ['', 'C. RECURSOS DE REFERENCIA Y LÉXICOS', '', '', ''],
    ['U5', 'Lectura de referencia para calibrar V1 (1.287 decisiones de 11 matrices)',
     'Equipo investigador con Claude (389 de 429 atributos)', 'No validada por el comité curricular',
     'Indirecto: fija los umbrales de V1 (R1, R8.3, Tablas 8 y 16); validación en el comentario 1'],
    ['U6', 'Contraste exploratorio con una segunda herramienta: tabla de asociación perfil–contenido de Administración de '
     'Empresas PBOG (19 atributos), evaluada contra la matriz', 'OpenAI; evaluación con script determinista',
     'Clasificación de cada fila como válida, genérica o temática',
     'Ninguno: exploratorio. La otra IA asoció el 100 % de los atributos en las tres capas; sin entidades genéricas ni '
     'temáticas, el 73,7 %'],
    ['U7', 'Diccionarios: equivalencias de dominio (V1) y lista de tendencias (propuesta integrada de 32, consolidada en 15 '
     'oficiales; D21 y D30)',
     'Candidatos de equivalencias generados por script; propuesta y depuración de términos con asistencia de Claude (oct. 2026)',
     'Aprobación de la lista oficial por la investigación principal',
     'Indirecto: definen qué cuenta como respaldo (R1) o como tendencia (R8.2)'],
    ['U8', 'Definición del modelo temático: preprocesamiento y lematización, documento por asignatura, rango de k (5–30), '
     'criterio de coherencia NPMI y estabilidad, consenso de 10 semillas; denominación de los 13 tópicos (Tabla 15)',
     'Claude como agente, con decisión de la investigación principal (D11)',
     'Aprobación de la configuración y de las denominaciones',
     'Indirecto: fija la configuración con que se calcula R8.2; la denominación de los tópicos es interpretativa'],
    ['', 'D. COMUNICACIÓN', '', '', ''],
    ['U9', 'Estructura, redacción y reformulación del manuscrito; auditoría de la correspondencia entre texto y evidencia',
     'Investigación principal con Claude (prompt de estructura; textos auditados)',
     'Aprobación de cada texto por la autora; verificación de cifras contra la evidencia', 'Ninguno en las cifras'],
    ['U10', 'Búsqueda, verificación (Crossref) y formato APA 7 de referencias; inserción de citas',
     'Investigación principal con Claude', 'Revisión de cada referencia por la autora [CONFIRMAR]',
     'Ninguno en las cifras; afecta el marco teórico'],
    ['U11', 'Presentación y guion para la Vicerrectoría Académica (oct. 2026)', 'Investigación principal con Claude',
     'Revisión de la autora', 'Ninguno (comunicación institucional)'],
    ['U12', 'Análisis complementarios para esta revisión (validación cruzada, bootstrap, ablación, sensibilidad) y '
     'redacción de la respuesta', 'Investigación principal con Claude', 'Revisión de la autora; reproducción de las cifras '
     'publicadas como control', 'Nuevas cifras de validación, obtenidas con código determinista'],
    ['', 'E. DISPONIBLE SIN USO', '', '', ''],
    ['U13', 'Módulo de resúmenes narrativos del aplicativo', 'Modelo generativo vía API', '—',
     'Ninguno: desactivado durante el estudio'],
    ['', 'EJECUCIÓN DEL ANÁLISIS', '', '', ''],
    ['—', 'Extracción, cálculo de V1–V5, similitud, LDA, N1–N5 y estadística', 'Aplicativo (sin IAg en la ejecución)',
     'Reproducción verificada', 'Producen todas las cifras de R1–R8'],
])

doc.add_heading('Cambios en el manuscrito', 2)
table([
    ['Ubicación', 'Texto actual', 'Texto propuesto'],
    ['Título', '«Inteligencia artificial generativa como infraestructura de decisión curricular: estudio aplicado…»',
     '«Infraestructura de decisión curricular asistida por inteligencia artificial generativa: estudio aplicado sobre '
     'coherencia, evaluabilidad y trazabilidad en una institución de educación superior» [CONFIRMAR título]'],
    ['Resumen, Discusión', '«el valor institucional de la IAg no reside en automatizar decisiones, sino en ampliar la '
     'capacidad para detectar rupturas…»',
     '«el valor del modelo no reside en automatizar decisiones, sino en hacer visibles las rupturas entre componentes, '
     'priorizar revisiones y documentar las decisiones humanas; la IAg asistió su desarrollo, sin que el estudio estime su '
     'efecto frente a un desarrollo sin ella»'],
    ['Materiales y Métodos', '«La IAg intervino en dos momentos… sin clasificar los datos del análisis final»',
     '«La IAg intervino en la estructuración de las matrices, el desarrollo del aplicativo, la elaboración de la lectura de '
     'referencia de V1, la revisión de diccionarios y la redacción (Tabla Z). Ninguna cifra reportada procede de una salida '
     'generativa: todas se obtienen con procedimientos deterministas»'],
    ['Materiales y Métodos', '—', 'Nuevo apartado «Uso de la IAg: alcance y trazabilidad» con la Tabla Z'],
    ['Tabla 6', 'IA generativa: «Solo diseño y construcción»',
     'Dos filas: «OpenAI: revisión de redacción y coherencia de las matrices» y «Claude (Anthropic): desarrollo, calibración '
     'de V1, diccionarios y redacción»; ninguna interviene en la ejecución'],
    ['Categoría A', '«calidad formal de los componentes generados con apoyo de la IAg»', '«calidad formal de los componentes de la matriz»'],
    ['D1, título', '«Coherencia y alineación curricular como resultado de asistencia analítica»',
     '«Coherencia y alineación curricular: lo que detecta el análisis determinista»'],
    ['D4 y Conclusiones', '«La IAg amplió la escala del análisis»',
     '«El procedimiento determinista permitió examinar 50 matrices, 2.574 atributos y 6.684 núcleos; la IAg asistió su construcción»'],
    ['Conclusiones, párrafo final', '«Su aporte consiste en ayudar a construir una infraestructura capaz de formularla… a una '
     'escala que la revisión manual difícilmente alcanza»',
     '«En este estudio, su aporte se limitó a asistir la construcción de esa infraestructura; si esa asistencia reduce el '
     'esfuerzo o mejora la calidad frente a un desarrollo convencional es una pregunta que este diseño no responde»'],
    ['Materiales y Métodos', '«cuyas salidas los equipos académicos aceptaron, ajustaron o descartaron con registro documental»',
     '«cuyas salidas revisó la cadena de revisión de Currículo» (sin afirmar un registro que no existe)'],
    ['Resumen', '«cada hallazgo se somete a decisión experta documentada»',
     '«los hallazgos se entregan como propuestas para la revisión de la Dirección de Currículo»'],
    ['Limitaciones', '—', 'El efecto de la IAg no se contrastó con una alternativa sin IAg; las reglas (U4), la referencia '
     'de V1 (U5), los diccionarios (U7) y la configuración del LDA (U8) se elaboraron con asistencia de IAg; la revisión '
     'con IAg de las matrices (U1) puede homogeneizar sus formulaciones (P8) y no se conservó registro de lo aceptado o '
     'ajustado; N1–N5 tiene un solo codificador'],
    ['Declaraciones', '—', 'Declaración de uso de IA (abajo)'],
])

doc.add_heading('Declaración de uso de inteligencia artificial (nueva, al final del manuscrito)', 2)
p('En este estudio se utilizaron dos herramientas de IA generativa. La Dirección de Currículo usó una herramienta de '
  'OpenAI [CONFIRMAR: versión] para revisar la redacción y la coherencia de las matrices curriculares antes de su '
  'aprobación; la misma herramienta se usó en un contraste exploratorio que no forma parte de los resultados. Claude '
  '(Anthropic) asistió, como asistente y como agente, el desarrollo del código del aplicativo y de los scripts de análisis, '
  'la propuesta de reglas de clasificación, la definición del modelo temático, la elaboración de una lectura de referencia '
  'para calibrar el método de asociación del perfil, la depuración de diccionarios de términos, la redacción y revisión del '
  'manuscrito y la gestión de referencias bibliográficas. La investigación principal revisó y aprobó todas las '
  'salidas, verificó cada cifra contra los archivos de evidencia y asume la responsabilidad plena del contenido. Ninguna '
  'cifra reportada procede de una salida generativa. [CONFIRMAR: ajustar al formato que exija la revista]')

# =====================================================================================================  PREGUNTA 3
doc.add_heading('Comentario 3. Validez de constructo de los indicadores', 1)
p('Observación del revisor: «La justificación conceptual de V2 requiere fortalecimiento. La repetición de verbos de acción '
  'no indica necesariamente redundancia curricular. Del mismo modo, el resultado de evaluabilidad del 100 % refleja el '
  'cumplimiento de una plantilla obligatoria en lugar de una calidad de evaluación demostrada.»', italic=True)

doc.add_heading('Respuesta', 2)
respuesta([
    ('V2.',
     'Coincidimos con el revisor y lo verificamos: ninguna de las competencias que repiten verbo tiene contenidos muy '
     'similares, mientras que varias con verbos distintos sí los tienen. V2 deja de usarse como indicador de redundancia y '
     'se informa como dato descriptivo («diferenciación del verbo rector»), fuera de los contrastes estadísticos. La '
     'redundancia de contenido requiere una lectura experta que el estudio no realizó, y así se declara.'),
    ('V3.',
     'Coincidimos en que el 100 % refleja el cumplimiento de la plantilla, reforzado por la revisión previa de la redacción, '
     'y no la calidad de la evaluación. V3 se renombra «conformidad estructural del RA» y se presenta como condición del '
     'instrumento. Para mostrar el límite de esa conformidad añadimos cuatro diagnósticos (Tabla W): la forma se cumple casi '
     'siempre (96–100 %), pero solo el 3,8 % de los RA declara un producto evaluable y solo el 0,8 % de las estrategias '
     'aporta evidencia directa del aprendizaje. Esta brecha entre forma y evidencia pasa a ser un hallazgo central de la '
     'Discusión.'),
    ('Reorganización de las variables.',
     'Separamos las condiciones que la plantilla garantiza de las variables que diferencian programas (V1, V4 y V5), que son '
     'las únicas que entran en los análisis estadísticos (Tabla V). Las conclusiones no cambian.'),
])

doc.add_heading('Tabla V. Familias de variables (sustituye a la Tabla 2)', 2)
table([
    ['Familia', 'Variable', 'Definición operativa', 'Resultado', 'Tratamiento'],
    ['Condiciones del instrumento', 'Conformidad estructural del RA (antes V3)', 'RA con verbo observable y finalidad',
     '100 % (338/338)', 'Verificada; no diferencia programas'],
    ['Condiciones del instrumento', 'RA con competencia de referencia', 'RA que citan una competencia del Paso 2', '100 %', 'Verificada'],
    ['Condiciones del instrumento', 'Tres tipos de saber', 'Matrices con Saber, SaberHacer y SaberSer', '100 % (50/50)', 'Verificada'],
    ['Condiciones del instrumento', 'Estrategia con indicador e instrumento', 'Estrategias del Paso 4 con ambos campos',
     '100 % (391/391)', 'Verificada'],
    ['Descriptiva de formulación', 'Diferenciación del verbo rector (antes V2)', 'Matrices sin verbo repetido entre competencias específicas',
     '90 % (45/50)', 'Descriptiva; fuera de R6 y R7'],
    ['Variables diferenciadoras', 'V1. Alineación del perfil', 'Atributos del perfil alineados con al menos una capa',
     '96,2 % (mediana por matriz 97,3 %)', 'R6 y R7'],
    ['Variables diferenciadoras', 'V4. Trazabilidad', 'RA únicos con estrategia que incluye indicador e instrumento',
     '87,0 % (98,0 % sin el RA genérico)', 'R6 y R7'],
    ['Variables diferenciadoras', 'V5. Nivel de evidencia', 'Estrategias cuyo indicador de mayor nivel es N2 o superior',
     '95,4 % (evidencia directa N3–N4: 0,8 %)', 'R6 y R7'],
])
p('Se conserva la numeración V1–V5 para facilitar el seguimiento de los cambios por los revisores.', italic=True)

doc.add_heading('Tabla W. Diagnósticos descriptivos de la formulación de los RA (nueva, en R3)', 2)
table([
    ['Diagnóstico', 'Condición verificada', 'RA que cumplen (n = 338)', 'Bloom (n = 164)', 'BAK (n = 174)'],
    ['Conformidad estructural (antes V3)', 'Verbo observable y finalidad', '100 %', '100 %', '100 %'],
    ['D3. Acción única', 'Un solo verbo principal, sin verbos coordinados', '100 %', '100 %', '100 %'],
    ['D2. Verbo de la redacción', 'La redacción empieza con el verbo declarado', '98,2 % (6 no coinciden)', '—', '—'],
    ['D1. Coherencia nivel–verbo', 'El verbo declarado pertenece al nivel declarado (listas de la matriz)',
     '96,4 % (12 RA en 7 matrices)', '98,8 %', '94,3 %'],
    ['D4. Producto evaluable', 'La finalidad declara un producto evaluable explícito', '3,8 % (13 RA en 9 matrices)', '0,0 %', '7,5 %'],
    ['Referencia: V5', 'Estrategias con evidencia directa del aprendizaje (N3–N4)', '0,8 % de 391 estrategias', '—', '—'],
])
p('Reglas deterministas, sin umbrales. D1 usa la hoja «Taxonomias para RA» de cada matriz (frente a la taxonomía '
  'institucional consolidada: 81,1 %). D3: análisis de dependencias con spaCy, verificado con una regla de coordinación '
  'independiente (0 casos). Fuente: auditoria/scripts/revisores_v3_diagnosticos.py → auditoria/evidencia_revisores_v3.json '
  'y auditoria/Diagnosticos_RA_V3.xlsx (detalle por RA).', italic=True)

doc.add_heading('Cambios en el manuscrito', 2)
table([
    ['Ubicación', 'Cambio'],
    ['Variables (Categorías A y B) y Tabla 2', 'Sustituir por la Tabla V: condiciones del instrumento, dato descriptivo y variables diferenciadoras'],
    ['Resumen', 'No abrir con «la evaluabilidad alcanzó el 100 %»: abrir con el contraste entre la conformidad formal (100 %), '
     'el producto evaluable explícito (3,8 %) y la evidencia directa (0,8 %)'],
    ['R2', 'Retitular «Diferenciación del verbo rector»; informar el análisis de similitud (5 pares con verbo repetido, 0 sobre el '
     'P95; 10 pares con verbo distinto sobre el P95) y las 2 inconsistencias de diligenciamiento; sin calificar como redundancia'],
    ['R3', 'Retitular «Conformidad estructural y diagnósticos de formulación de los RA»; Tabla W; declarar la doble causa '
     '(plantilla y revisión con IAg)'],
    ['R6', 'Solo V1, V4 y V5: tres correlaciones'],
    ['R7', 'Solo V1, V4 y V5; V2 se informa de forma descriptiva por sede'],
    ['Figura 1 (ruta)', 'V2 fuera de la ruta; V3 como condición del instrumento (gris)'],
    ['Figura 5', 'Retirar V2 y V3 de la distribución por matriz, o mostrarlas aparte como condiciones'],
    ['D1', 'Retirar «inconsistencias entre competencias son puntuales»; presentar la diferenciación del verbo como descriptiva'],
    ['D2', 'Desarrollar el gradiente forma → evidencia (100 % → 96,4 % → 3,8 % → 0,8 %) como hallazgo central'],
    ['Discusión o Conclusiones', 'Coexistencia de versiones de la taxonomía (81,1 % frente a 96,4 %) como oportunidad de estandarización'],
    ['Limitaciones', 'La redundancia de contenido entre competencias y la calidad evaluativa sustantiva requieren juicio experto no realizado'],
])

doc.add_heading('Referencias que se añaden', 2)
for r in ['Messick, S. (1995). Validity of psychological assessment: Validation of inferences from persons\' responses and '
          'performances as scientific inquiry into score meaning. American Psychologist, 50(9), 741–749.']:
    par = doc.add_paragraph(r + ' [CONFIRMAR DOI]')
    par.paragraph_format.left_indent = Cm(1)
    par.paragraph_format.first_line_indent = Cm(-1)

# =====================================================================================================  PREGUNTA 4
doc.add_heading('Comentario 4. Interpretación estadística y generalización', 1)
p('Observación del revisor: «Los autores deberían interpretar las diferencias no significativas entre ubicaciones con más '
  'cautela, considerando tamaños de grupo desiguales, el número limitado de matrices en ciertos grupos y la dependencia '
  'parcial de las observaciones entre unidades de programa-ubicación.»', italic=True)

doc.add_heading('Respuesta', 2)
respuesta([
    ('Interpretación.',
     'Reformulamos R7: no se detectaron diferencias significativas entre sedes, lo que no demuestra que sean iguales. Con '
     'el tamaño de los grupos, el estudio solo detectaría diferencias amplias, por ejemplo de 10 a 23 puntos en '
     'trazabilidad (Tabla T).'),
    ('Grupos desiguales y pequeños.',
     'Confirmamos los resultados con pruebas por permutación, adecuadas para grupos pequeños. Las sedes con una y tres '
     'matrices se presentan solo de forma descriptiva.'),
    ('Dependencia entre matrices.',
     'Repetimos el análisis tomando una sola matriz por programa y calculamos los intervalos agrupando por programa. Los '
     'resultados se mantienen.'),
    ('Factores de confusión.',
     'Declaramos que sede y modalidad no pueden separarse y que las sedes difieren en su composición por nivel de formación '
     '(Tabla U).'),
    ('Generalización.',
     'El corpus es un censo de la cohorte en renovación curricular, no una muestra. Lo transferible es el procedimiento, no '
     'las cifras. Retiramos de R7 la recomendación institucional; en la Discusión se sustenta en brechas comunes a todas las '
     'sedes.'),
])

doc.add_heading('Tabla U. Composición y resultados por sede (sustituye a la Tabla 11)', 2)
table([
    ['Sede (modalidad)', 'Matrices', 'Posgrado / Profesional / Técnica-Tecnología', 'Matrices de programas multisede',
     'V1 mediana (rango)', 'V4 mediana (rango)', 'V5 mediana (rango)', 'Con verbo repetido (descriptivo)'],
    ['VNAL (virtual)', '22', '7 / 11 / 4', '4 (18 %)', '97,4 % (92,3–100)', '87,5 % (83,3–100)', '100 % (71,4–100)', '1'],
    ['PBOG (presencial)', '17', '3 / 13 / 1', '7 (41 %)', '97,2 % (87,2–100)', '85,7 % (75,0–100)', '100 % (25,0–100)', '2'],
    ['PMED (presencial)', '7', '0 / 6 / 1', '5 (71 %)', '97,0 % (90,3–100)', '83,3 % (62,5–100)', '100 % (83,3–100)', '1'],
    ['HMED (híbrida)¹', '3', '0 / 3 / 0', '3 (100 %)', '97,3 % (92,9–100)', '87,5 % (85,7–90,0)', '100 % (87,5–100)', '1'],
    ['HBOG (híbrida)¹', '1', '0 / 1 / 0', '0', '100 %', '83,3 %', '100 %', '0'],
    ['Total', '50', '10 / 34 / 6', '19 (38 %)', '97,3 % (87,2–100)', '87,5 % (62,5–100)', '100 % (25,0–100)', '5'],
])
p('¹ Resultado descriptivo. HBOG no entra en la prueba de Kruskal-Wallis (n = 1).', italic=True)

doc.add_heading('Tabla T. Contraste entre sedes con tratamiento de la dependencia (nueva, en R7)', 2)
table([
    ['Variable', 'H (gl = 3; n = 49)', 'p asintótica', 'p por permutación', 'ε² (IC 95 %)',
     'Submuestreo: % de réplicas con p < 0,05', 'DMD (pp) VNAL / PBOG / PMED / HMED'],
    ['V1', '0,84', '0,841', '0,853', '0,000 (0–0,14)', '0 %', '3 / 4 / 5 / 10'],
    ['V4', '3,86', '0,277', '0,287', '0,019 (0–0,27)', '0 %', '10 / 11 / 13 / 23'],
    ['V5', '1,57', '0,667', '0,656', '0,000 (0–0,19)', '0 %', '— (efecto techo)'],
])
p('Permutación: 10.000 réplicas. Submuestreo: 1.000 réplicas con una matriz al azar por programa. ε²: bootstrap de '
  'programas completos (2.000 réplicas). DMD: diferencia mínima detectable con potencia 0,80 y α = 0,05, por simulación '
  '(400 réplicas por valor), desplazando la sede indicada. Fuente: auditoria/evidencia_revisores_r.json.', italic=True)

doc.add_heading('Cambios en el manuscrito', 2)
table([
    ['Ubicación', 'Texto actual', 'Texto propuesto'],
    ['R7', '«No existe evidencia de diferencias entre sedes»',
     '«No se detectaron diferencias significativas entre sedes; este resultado no demuestra homogeneidad: los IC de ε² no '
     'excluyen efectos moderados y el diseño solo detectaría diferencias de 10 a 23 puntos en V4»'],
    ['R7', '«Los resultados sugieren que las acciones de mejora pueden formularse institucionalmente…»', 'Se retira de R7'],
    ['R7', '«La variabilidad es mayor dentro de las sedes que entre ellas»',
     'Se conserva con su dato: en PBOG, V5 va de 25,0 % a 100 %; en PMED, V4 va de 62,5 % a 100 %'],
    ['R7', 'Tabla 11', 'Tabla U (con composición y proporción multisede) y Tabla T (contraste con tratamiento de la dependencia)'],
    ['R6', 'Seis correlaciones sin intervalos', 'Tres correlaciones (V1, V4, V5) con IC 95 % por bootstrap de programas'],
    ['D2 / D3', '—', 'Recomendación institucional sustentada en el origen instrumental de las brechas (RA genérico sin '
     'estrategia en 38 de 40 matrices; 0,8 % de evidencia directa), común a todas las sedes'],
    ['Discusión y Conclusiones', '«modelo auditable y transferible como procedimiento»',
     'Se conserva y se precisa: estudio de caso; generalización analítica del procedimiento, no estadística de las cifras (Yin, 2018)'],
    ['Limitaciones', '—', 'Potencia limitada; sede y modalidad no separables; composición por nivel desigual; dependencia por '
     'oferta multisede; censo no aleatorio; efecto techo en V5'],
])

doc.add_heading('Referencias que se añaden', 2)
for r in ['Wasserstein, R. L., & Lazar, N. A. (2016). The ASA statement on p-values: Context, process, and purpose. The '
          'American Statistician, 70(2), 129–133.',
          'Yin, R. K. (2018). Case study research and applications: Design and methods (6.ª ed.). SAGE.']:
    par = doc.add_paragraph(r + ' [CONFIRMAR DOI]')
    par.paragraph_format.left_indent = Cm(1)
    par.paragraph_format.first_line_indent = Cm(-1)

# =====================================================================================================  PREGUNTA 5
doc.add_heading('Comentario 5. Reproducibilidad y transparencia', 1)
p('Observación del revisor: «Debería proporcionarse información más detallada sobre umbrales de similitud, decisiones de '
  'calibración, procedimientos de preprocesamiento, revisión de expertos y acceso al código analítico o documentación de '
  'apoyo.»', italic=True)

doc.add_heading('Respuesta', 2)
respuesta([
    ('Documentación.',
     'Incorporamos como material suplementario los umbrales y parámetros, con su valor y su condición de calibrados u '
     'operativos (S2); el análisis de sensibilidad (S3); el registro de decisiones metodológicas (S4); el preprocesamiento '
     '(S5), y el uso de IAg (S6). El alcance de la revisión experta se precisa en el comentario 1.'),
    ('Código y verificación.',
     'El código está en un repositorio público con licencia MIT, con las versiones de las bibliotecas fijadas y un script '
     'que verifica cada cifra del manuscrito contra su evidencia (32 de 32 coinciden). La versión revisada se depositará con '
     'DOI [CONFIRMAR: DOI]. Las matrices son documentos institucionales y están disponibles a solicitud '
     '[CONFIRMAR: publicación de la evidencia derivada anonimizada].'),
    ('Corrección.',
     'El manuscrito anterior afirmaba que las versiones y las instrucciones de IAg estaban documentadas. Las versiones ya '
     'están fijadas; las instrucciones usadas en la revisión de las matrices no se conservaron, y así se declara. '
     '[CONFIRMAR: si la revisión es doble ciega, se facilitará un enlace anonimizado.]'),
])

doc.add_heading('Cambios en el manuscrito', 2)
table([
    ['Ubicación', 'Texto actual', 'Texto propuesto'],
    ['Procedimiento, final', '«El código, las versiones de bibliotecas, semillas, parámetros, diccionarios, umbrales y reglas '
     'de preprocesamiento están documentados en el repositorio del proyecto»',
     '«El código, el entorno de ejecución con versiones fijadas, las semillas, los parámetros, los diccionarios, el registro '
     'de decisiones y un script que verifica cada cifra contra su evidencia están disponibles en [repositorio, DOI]; los '
     'parámetros y su estado se detallan en la Tabla S2 y el preprocesamiento en S5»'],
    ['Principio P9', '«Se documentan las fuentes, reglas, modelos, parámetros, instrucciones, umbrales y decisiones…»',
     '«…parámetros, umbrales y decisiones; las instrucciones empleadas en la revisión de las matrices con IAg no se '
     'conservaron (ver Limitaciones)»'],
    ['Etapas 4 y 5', 'Umbrales sin indicar su estado', 'Indicar cuáles son calibrados y cuáles operativos, con remisión a S2 y S3'],
    ['Etapas 2, 4 y 6', '—', 'Una frase de preprocesamiento que remite a S5'],
    ['Final del manuscrito', '—', 'Declaración de disponibilidad de datos y código'],
    ['Material suplementario', '—', 'S1 tamaños de muestra; S2 parámetros; S3 sensibilidad; S4 registro de decisiones; '
     'S5 preprocesamiento; S6 uso de IAg'],
])

doc.add_heading('Declaración de disponibilidad de datos y código (nueva)', 2)
p('El código del aplicativo y de los análisis, el entorno de ejecución, los parámetros, los diccionarios, el registro de '
  'decisiones y el script de verificación están disponibles en [repositorio; DOI de Zenodo] [CONFIRMAR] con licencia MIT. '
  'Las matrices curriculares analizadas son documentos institucionales y están disponibles a solicitud razonable, con '
  'autorización de la institución.')

doc.add_heading('Paquete de reproducibilidad preparado', 2)
table([
    ['Componente', 'Archivo', 'Estado'],
    ['Entorno con versiones exactas y revisión del modelo de embeddings', 'requirements-lock.txt', 'Preparado'],
    ['Guía: entorno, datos, verificación, correspondencia, S2 y S5', 'auditoria/REPRODUCIBILIDAD.md', 'Preparado'],
    ['Verificación de las cifras del manuscrito (32/32)', 'auditoria/scripts/reproducir_articulo.py', 'Preparado'],
    ['Scripts de los análisis para los revisores', 'auditoria/scripts/revisores_*.py', 'Preparados'],
    ['Corrección de la deduplicación de V3 (D23)', 'auditoria/scripts/verificar_v3.py', 'Corregido'],
    ['Fases del proyecto', 'auditoria/FASES_PROYECTO.md', 'Preparado'],
    ['Versionado en el repositorio', 'commit y etiqueta de versión', '[CONFIRMAR: autorización para el commit]'],
    ['Identificador persistente', 'DOI de Zenodo', '[CONFIRMAR: lo crea la autora con su cuenta]'],
    ['Evidencia derivada (evidencia_*.json)', 'Hoy excluida por .gitignore', '[CONFIRMAR: autorización institucional]'],
])

doc.save(OUT)
print('ok', OUT)
