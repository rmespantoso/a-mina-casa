// Los huecos del cliente: leerlos y guardarlos en su móvil.
// Las reglas (qué vale y qué no) están en js/logica/huecos.js; aquí solo se guarda y se mide.
// Lo usan la pantalla Mis huecos y, desde el día 3, la ficha con el semáforo.

import { guardar, leer } from "./almacen.js";
import { medir } from "./medicion.js";
import { limpiarHuecos, ponerHueco, quitarHueco } from "./logica/huecos.js";

/** Los huecos guardados (lista vacía si no hay ninguno). */
export function leerHuecos() {
  return limpiarHuecos(leer("huecos", []));
}

/**
 * Guarda un hueco ya validado. Con `id` cambia uno existente; sin él, añade uno nuevo.
 * Devuelve { ok, id, enMovil } o { ok: false, motivo }.
 * `enMovil` es false si el navegador no deja guardar (solo dura hasta cerrar la página).
 */
export function guardarHueco(hueco, id = null, { medirlo = true } = {}) {
  const resultado = ponerHueco(leerHuecos(), hueco, id);
  if (!resultado.ok) return { ok: false, motivo: resultado.motivo };

  const enMovil = guardar("huecos", resultado.lista);
  if (id === null && medirlo) {
    // Solo se mide al añadir, no al corregir. No viaja ningún dato personal.
    medir("space_add", { tipo: "hueco", estancia: hueco.estancia, total: resultado.lista.length });
  }
  return { ok: true, id: resultado.id, enMovil };
}

/** Borra un hueco. */
export function borrarHueco(id) {
  guardar("huecos", quitarHueco(leerHuecos(), id));
}
