// Panel para completar V1 sin salir de la página: calcula el perfil de las matrices que faltan (con o sin modelo semántico).
import { calcularFaltantes, estadoLote, modoPerfil, omitirCalculo } from '../perfil/lote.js';
import { h } from '../ui.js';

/**
 * @param {Map} archivoDe  id de matriz → archivo
 * @param {number} faltan  matrices sin perfil calculado
 */
export function panelV1({ archivoDe, faltan, rerender }) {
  const e = estadoLote();
  if (e.corriendo) {
    const descargando = e.modelo?.status === 'progress' && e.hechas === 0;
    const restante = e.fase === 'calculando' && e.hechas > 0 ? Math.max(1, Math.round((performance.now() - e.inicio) / e.hechas * (e.total - e.hechas) / 60000)) : null;
    const mensaje = e.fase === 'cache' ? 'Revisando qué matrices ya tienen su perfil calculado…'
      : e.fase === 'modelo' ? `Preparando el cálculo de ${e.total} ${e.total === 1 ? 'matriz' : 'matrices'} (inicia el motor y el modelo; puede tardar unos segundos)…`
        : `${e.hechas} de ${e.total} matrices${e.nombre ? ` · ${e.nombre}` : ''}${restante ? ` · quedan unos ${restante} min` : ''}.`;
    return h('div', { class: 'aviso info' },
      h('p', { html: `<b>Calculando el perfil para completar V1:</b> ${mensaje}` +
        (descargando ? ` Descargando el modelo semántico (${Math.round(e.modelo.progress ?? 0)} %; solo la primera vez).` : '') }),
      h('div', { class: 'barra-avance' }, h('div', { style: { width: `${100 * e.hechas / Math.max(e.total, 1)}%` } })),
      h('p', { class: 'leyenda' }, 'Cada matriz tarda alrededor de medio minuto con el modelo semántico; lo ya calculado queda guardado en este navegador y no se repite. ' +
        'Mientras tanto no se muestran cifras, porque V1 estaría incompleta.'),
      h('button', { type: 'button', class: 'boton secundario', disabled: e.cancelar ? true : null, onclick: () => omitirCalculo(rerender) },
        e.cancelar ? 'Deteniendo al terminar la matriz en curso…' : 'Ver el resumen sin completar V1'));
  }
  if (!faltan) return null;
  const modo = modoPerfil();
  const lanzar = m => () => calcularFaltantes(archivoDe, m, rerender);
  return h('div', { class: 'aviso warning' },
    e.error ? h('p', { html: `<b>No se pudo completar el cálculo:</b> ${e.error}` }) : null,
    e.omitido ? h('p', { html: '<b>Cálculo detenido:</b> el resumen se muestra con V1 incompleta; lo ya calculado se conserva.' }) : null,
    h('p', { html: `<b>V1 todavía no está completa:</b> falta calcular el perfil de egreso de <b>${faltan}</b> matriz${faltan === 1 ? '' : 'ces'}. ` +
      'V1 es la proporción de atributos del perfil con alineación en alguna capa; se calcula aquí mismo, en este navegador.' }),
    h('p', { class: 'leyenda', html: '<b>Con modelo semántico</b> (recomendado) reproduce el método del artículo; la primera vez descarga ≈120 MB desde Hugging Face y queda en la caché. ' +
      '<b>Solo léxico</b> es más rápido y no descarga nada, pero no detecta asociaciones «parciales» y V1 resultará menor.' }),
    h('button', { type: 'button', class: modo === 'lexico' ? 'boton secundario' : 'boton', onclick: lanzar('semantico') }, 'Calcular V1 con el modelo semántico'), ' ',
    h('button', { type: 'button', class: modo === 'lexico' ? 'boton' : 'boton secundario', onclick: lanzar('lexico') }, 'Calcular V1 solo con léxico'));
}
