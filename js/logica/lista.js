// Reglas de Mi lista: qué productos tiene y cuál es su código.
// Es lógica pura. La pantalla Mi lista (día 5) y la ficha la usan a través de js/mi-lista.js.
//
// Una lista es { codigo: "ALI-7K3F", productos: ["SOF-02", "TV-04"] }, o null si aún no existe.

import { euros } from "../textos.js";

export const MAX_PRODUCTOS = 20;

// Sin 0, O, 1 ni I: en caja se confunden al leerlos en voz alta o al anotarlos.
const LETRAS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const FORMA_CODIGO = /^ALI-[2-9A-HJ-NP-Z]{4}$/;
const FORMA_ID = /^[A-Z]{2,4}-\d{2,3}$/;

/** Crea un código corto al azar, tipo ALI-7K3F. Solo sirve para que caja lo anote. */
export function nuevoCodigo(azar = Math.random) {
  let codigo = "ALI-";
  for (let i = 0; i < 4; i++) codigo += LETRAS[Math.floor(azar() * LETRAS.length)];
  return codigo;
}

/** ¿Está este producto en la lista? */
export function estaEnLista(lista, id) {
  return Boolean(lista) && lista.productos.includes(id);
}

/**
 * Añade un producto. No modifica la lista recibida: devuelve una nueva.
 * Devuelve { lista, anadido, esNueva, motivo }:
 * - esNueva: true si la lista ha nacido con este producto (se le pone código).
 * - anadido: false si ya estaba o si la lista está llena (motivo "repetido" o "llena").
 */
export function anadirALista(lista, id, azar = Math.random) {
  if (!lista) return { lista: { codigo: nuevoCodigo(azar), productos: [id] }, anadido: true, esNueva: true };
  if (lista.productos.includes(id)) return { lista, anadido: false, esNueva: false, motivo: "repetido" };
  if (lista.productos.length >= MAX_PRODUCTOS) return { lista, anadido: false, esNueva: false, motivo: "llena" };
  return { lista: { ...lista, productos: [...lista.productos, id] }, anadido: true, esNueva: false };
}

/** Quita un producto. El código de la lista no cambia. */
export function quitarDeLista(lista, id) {
  if (!lista) return null;
  return { ...lista, productos: lista.productos.filter((actual) => actual !== id) };
}

/** Limpia lo leído del móvil: si está estropeado o manipulado, no hay lista. */
export function limpiarLista(dato) {
  if (!dato || typeof dato !== "object" || !FORMA_CODIGO.test(dato.codigo) || !Array.isArray(dato.productos)) return null;
  const productos = [...new Set(dato.productos.filter((id) => typeof id === "string" && FORMA_ID.test(id)))];
  return { codigo: dato.codigo, productos: productos.slice(0, MAX_PRODUCTOS) };
}

// ---------------------------------------------------------------------------
// Compartir: la lista viaja escrita en el propio enlace (no hay servidor).
//   lista.html?v=1&c=ALI-7K3F&l=SOF-02.TV-04
// v = versión del formato · c = código · l = productos.
// (Hasta el 14/11/2026 también podían viajar los huecos en «h»; ahora se ignora.)
// ---------------------------------------------------------------------------

const VERSION = "1";

/** Crea el enlace para compartir una lista. `base` es la dirección de lista.html. */
export function crearEnlace(base, lista) {
  const enlace = new URL(base);
  enlace.search = "";
  enlace.searchParams.set("v", VERSION);
  enlace.searchParams.set("c", lista.codigo);
  enlace.searchParams.set("l", lista.productos.join("."));
  return enlace.href;
}

/**
 * Lee una lista de un enlace. `busqueda` es la parte «?v=1&c=…» de la dirección.
 * Devuelve null si el enlace no trae ninguna lista, { error } si no se puede leer
 * y { lista } si está bien. Lo que viene de fuera siempre se limpia.
 */
export function leerEnlace(busqueda) {
  const parametros = new URLSearchParams(busqueda);
  if (!parametros.has("c") && !parametros.has("l")) return null;
  if (parametros.get("v") !== VERSION) return { error: "version" };

  const lista = limpiarLista({ codigo: parametros.get("c"), productos: (parametros.get("l") ?? "").split(".") });
  if (!lista || lista.productos.length === 0) return { error: "estropeado" };
  return { lista };
}

/** Suma los precios. `sinPrecio` dice a cuántos muebles les falta (no se inventa). */
export function totalLista(productos) {
  const conPrecio = productos.filter((producto) => producto.precio_eur != null);
  const total = Math.round(conPrecio.reduce((suma, producto) => suma + producto.precio_eur, 0) * 100) / 100;
  return { total, sinPrecio: productos.length - conPrecio.length };
}

/**
 * Texto que se manda por WhatsApp. Solo lleva muebles, precios, el código y el enlace:
 * ningún dato personal. Con `paraAsesor`, saluda y pide ayuda al asesor de ALI.
 */
// Desde el 15/11/2026 el código de la lista no se enseña al cliente ni va en el mensaje
// (sigue viajando dentro del enlace, para reconocer la lista). Ya no hay «Enviar al asesor».
export function textoCompartir({ productos, enlace }) {
  const { total, sinPrecio } = totalLista(productos);
  const lineas = productos.map((producto) => `• ${producto.nombre} — ${euros(producto.precio_eur)}`);
  const notaTotal = sinPrecio ? ` (sin contar ${sinPrecio} con precio a consultar)` : "";
  return [
    "Mira esta lista de muebles de ALI Hogar:",
    ...lineas,
    `Total orientativo: ${euros(total)}${notaTotal}`,
    `Ver la lista: ${enlace}`,
  ].join("\n");
}
