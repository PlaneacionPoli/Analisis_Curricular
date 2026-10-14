// Marcador de las páginas que se portan en fases posteriores.
import { aviso, h, titulo } from '../ui.js';

export function paginaPendiente(nombre, descripcion, fase) {
  return h('div', {},
    ...titulo(nombre),
    aviso('info', `<b>En construcción (fase ${fase}).</b> ${descripcion}`),
    h('p', { class: 'leyenda' }, 'Esta sección todavía no está disponible en esta versión.'));
}
