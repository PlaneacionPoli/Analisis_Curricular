// Estado global mínimo con suscripción (equivale a st.session_state).
const estado = {
  pagina: 'Inicio',
  archivos: null,          // [{nombre, buffer, huella}] cargados
  datos: null,             // {filas, columnas, fallidos, avisos, totales, guardado}
  filtros: { programa: 'Todos', modalidad: 'Todos', sede: 'Todos', nivel: 'Todos' },
  matriz: null,            // id de la matriz elegida (programa-sede) o null = vista del conjunto
  progreso: null,          // {i, n, nombre} mientras se procesa
  mensaje: null,           // aviso de la carga (rechazados, caché no disponible)
};
const oyentes = new Set();

export const obtener = () => estado;

export function actualizar(parcial) {
  Object.assign(estado, parcial);
  oyentes.forEach(f => f(estado));
}

export const suscribir = f => { oyentes.add(f); return () => oyentes.delete(f); };

/** df_filtered: aplica Programa, Modalidad, Sede y Nivel sobre el consolidado. */
export function filasFiltradas() {
  if (!estado.datos) return [];
  const { programa, modalidad, sede, nivel } = estado.filtros;
  return estado.datos.filas.filter(f =>
    (modalidad === 'Todos' || f.Modalidad === modalidad) &&
    (sede === 'Todos' || f.Sede === sede) &&
    (programa === 'Todos' || f.Programa === programa) &&
    (nivel === 'Todos' || f.Nivel === nivel));
}
