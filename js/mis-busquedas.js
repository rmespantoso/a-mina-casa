// Búsquedas guardadas de «Planifica tu espacio».
// Se guardan en este navegador (localStorage, siempre con try/catch dentro de almacen.js).
// Con la cuenta de demostración se guardan igual: la cuenta del prototipo es simulada.
// Solo se guarda la búsqueda (estancia, mueble, medidas, precio y color): nada personal.

import { leer, guardar } from "./almacen.js";
import { ponerBusqueda, quitarBusqueda } from "./logica/planificador.js";

const CLAVE = "busquedas";

/** Las búsquedas guardadas, la más reciente primero. */
export function leerBusquedas() {
  const lista = leer(CLAVE, []);
  return Array.isArray(lista) ? lista.filter((busqueda) => busqueda && busqueda.estancia && busqueda.grupo) : [];
}

/** Guarda una búsqueda. Devuelve { ok, repetida, total }. */
export function guardarBusqueda(nueva) {
  const { lista, repetida } = ponerBusqueda(leerBusquedas(), nueva);
  const ok = guardar(CLAVE, lista);
  return { ok, repetida, total: lista.length };
}

/** Borra la búsqueda de esa posición. */
export function borrarBusqueda(posicion) {
  guardar(CLAVE, quitarBusqueda(leerBusquedas(), posicion));
}
