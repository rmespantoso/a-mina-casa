// Sesión: sabe si quien usa la herramienta es INVITADO o está REGISTRADO.
//
// - Invitado: lo usa casi todo y sus medidas y su lista se quedan en su móvil.
// - Registrado: lo mismo, guardado en su cuenta, y además el recomendador.
//
// IMPORTANTE: en este prototipo el registro es SIMULADO. No hay servidor, no se
// pide correo ni contraseña y no se envía ningún dato. Solo se apunta en el
// navegador que se ha entrado con la «cuenta de demostración».
// En la herramienta real, esta cuenta sería la de alihogar.es.

import { borrar, guardar, leer } from "./almacen.js";
import { medir } from "./medicion.js";

// Funciones que solo puede usar quien tiene cuenta. El resto está abierto a todos.
export const SOLO_REGISTRADOS = ["recomendador"];

const INVITADO = { tipo: "invitado" };

/** Devuelve la sesión actual: { tipo: "invitado" } o { tipo: "registrado", nombre, ... }. */
export function sesion() {
  const guardada = leer("sesion", null);
  return guardada && guardada.tipo === "registrado" ? guardada : INVITADO;
}

/** ¿Ha entrado con cuenta? */
export function estaRegistrado() {
  return sesion().tipo === "registrado";
}

/** ¿Puede usar esta función ("recomendador", "huecos", "lista"...)? */
export function puedeUsar(funcion) {
  return estaRegistrado() || !SOLO_REGISTRADOS.includes(funcion);
}

/**
 * Entra con la cuenta de demostración.
 * - `esNueva`: true si viene de «Crear cuenta» (evento sign_up), false si de «Entrar» (login).
 * - `quiereNoticias`: la casilla de comunicaciones comerciales. Va aparte y sin marcar:
 *   tener cuenta no significa aceptar publicidad.
 */
export function entrarConDemo({ esNueva = false, quiereNoticias = false } = {}) {
  const nueva = {
    tipo: "registrado",
    nombre: "Cliente de demostración",
    esDemo: true,
    quiereNoticias: Boolean(quiereNoticias),
  };
  guardar("sesion", nueva);
  medir(esNueva ? "sign_up" : "login", { metodo: "demo", acepta_comunicaciones: nueva.quiereNoticias });
  return nueva;
}

/** Cierra la sesión: vuelve a ser invitado. Las medidas y la lista del móvil no se tocan. */
export function salir() {
  borrar("sesion");
}

// Páginas a las que se puede volver después de entrar. Es una lista cerrada para
// que nadie pueda usar el enlace de acceso para mandar al cliente a otra web.
const DESTINOS = ["index", "huecos", "que-me-cabe", "lista", "ficha", "ambiente"];

/** Convierte el parámetro ?volver= en una dirección segura dentro de la herramienta. */
export function destinoSeguro(volver, producto = null, ambiente = null) {
  if (!DESTINOS.includes(volver)) return "index.html";
  const esProducto = typeof producto === "string" && /^[A-Z]{2,4}-\d{2,3}$/.test(producto);
  const esAmbiente = typeof ambiente === "string" && /^AMB-\d{2}$/.test(ambiente);
  if (volver === "ficha" && esProducto) return `ficha.html?p=${producto}`;
  if (volver === "ambiente" && esAmbiente) return `ambiente.html?a=${ambiente}`;
  return `${volver}.html`;
}
