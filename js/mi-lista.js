// Mi lista: los productos que el cliente va guardando, en su móvil.
// Las reglas están en js/logica/lista.js; aquí solo se guarda y se mide.

import { guardar, leer } from "./almacen.js";
import { medir } from "./medicion.js";
import { anadirALista, estaEnLista, limpiarLista, quitarDeLista } from "./logica/lista.js";

/** La lista guardada ({ codigo, productos }) o null si aún no existe. */
export function leerLista() {
  return limpiarLista(leer("lista", null));
}

/** ¿Está guardado este producto? */
export function estaGuardado(id) {
  return estaEnLista(leerLista(), id);
}

/**
 * Guarda un producto en la lista. Si es el primero, nace la lista con su código.
 * Devuelve { ok, enMovil, total } o { ok: false, motivo }.
 */
export function guardarProducto(id) {
  const resultado = anadirALista(leerLista(), id);
  if (!resultado.anadido) return { ok: false, motivo: resultado.motivo };

  const enMovil = guardar("lista", resultado.lista);
  // El código de la lista no se envía a la medición: no hace falta para los KPIs.
  if (resultado.esNueva) medir("list_create", { producto: id });
  medir("list_add", { producto: id, total: resultado.lista.productos.length });
  return { ok: true, enMovil, total: resultado.lista.productos.length };
}

/** Quita un producto de la lista. */
export function quitarProducto(id) {
  const lista = quitarDeLista(leerLista(), id);
  if (lista) guardar("lista", lista);
}
