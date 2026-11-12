// Reglas de Mi lista: qué productos tiene y cuál es su código.
// Es lógica pura. La pantalla Mi lista (día 5) y la ficha la usan a través de js/mi-lista.js.
//
// Una lista es { codigo: "ALI-7K3F", productos: ["SOF-02", "TV-04"] }, o null si aún no existe.

export const MAX_PRODUCTOS = 20;

// Sin 0, O, 1 ni I: en caja se confunden al leerlos en voz alta o al anotarlos.
const LETRAS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const FORMA_CODIGO = /^ALI-[2-9A-HJ-NP-Z]{4}$/;
const FORMA_ID = /^[A-Z]{2,4}-\d{2}$/;

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
