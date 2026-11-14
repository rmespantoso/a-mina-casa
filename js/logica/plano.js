// Planos de la habitación (Mi plano 3D). Es lógica pura (sin pantalla).
//
// La habitación es un rectángulo de ancho × largo en centímetros. Cada mueble es una
// caja con su ancho, su fondo y su alto REALES (los de products.json): nunca se inventa
// una medida. Si a un mueble le falta el ancho o el fondo, no se puede poner en el plano.
// Si solo le falta el alto, se dibuja con una altura aproximada de su tipo y se avisa.
// El origen (0, 0) es la esquina del fondo a la izquierda; x va hacia la derecha e y hacia
// la puerta. La pantalla 3D convierte esto a metros.
//
// El cliente puede guardar varios planos con nombre (hasta MAX_PLANOS), cada uno con
// su habitación y la posición de cada mueble (desde el 14/11/2026).

import { coloresDe } from "./colores.js";

export const PASO_CM = 5;        // los muebles se mueven de 5 en 5 cm
export const MAX_PIEZAS = 20;
export const MAX_PLANOS = 10;
export const LARGO_NOMBRE = 40;

/** Alturas aproximadas para dibujar un mueble cuya web no da el alto (solo para el dibujo). */
export const ALTO_APROXIMADO = {
  somier: 30, cama_canape: 35, cabecero: 120, sofa: 85, sofa_cama: 85, chaise_longue: 85, butaca: 90,
  silla: 85, silla_oficina: 100, banqueta: 45, mesa_centro: 45, mesa_comedor: 76, mesa_cocina: 76, escritorio: 75,
  consola: 80, mesita_noche: 55, comoda: 85, aparador: 85, mueble_tv: 50, vitrina: 180, estanteria: 180, armario: 200,
  zapatero: 100, recibidor: 85, mueble_cocina: 90, mueble_bano: 60,
};

/** Un plano nuevo y vacío. */
export function crearPlano(ancho, largo, nombre = "", id = "") {
  return { id, nombre: nombreValido(nombre), habitacion: { ancho_cm: ancho, largo_cm: largo }, piezas: [] };
}

/** Nombre limpio para un plano: sin espacios de más, corto y nunca vacío. */
export function nombreValido(nombre) {
  const limpio = String(nombre ?? "").replace(/\s+/g, " ").trim().slice(0, LARGO_NOMBRE);
  return limpio || "Mi habitación";
}

/** ¿Se puede poner este mueble en el plano? (necesita ancho y fondo) */
export function sePuedePoner(producto) {
  return Boolean(producto) && producto.ancho_cm > 0 && producto.fondo_cm > 0;
}

/** Tamaño que ocupa una pieza en el suelo, teniendo en cuenta si está girada. */
export function huella(pieza) {
  return pieza.giro === 90 ? { w: pieza.fondo_cm, h: pieza.ancho_cm } : { w: pieza.ancho_cm, h: pieza.fondo_cm };
}

const redondear = (valor) => Math.round(valor / PASO_CM) * PASO_CM;

/** Deja la pieza dentro de la habitación (si cabe). Si es más grande, la pega a la esquina. */
function dentro(pieza, habitacion) {
  const { w, h } = huella(pieza);
  const x = Math.min(Math.max(0, pieza.x), Math.max(0, habitacion.ancho_cm - w));
  const y = Math.min(Math.max(0, pieza.y), Math.max(0, habitacion.largo_cm - h));
  return { ...pieza, x, y };
}

function pisa(a, b) {
  const ha = huella(a);
  const hb = huella(b);
  return a.x < b.x + hb.w && b.x < a.x + ha.w && a.y < b.y + hb.h && b.y < a.y + ha.h;
}

/** Busca el primer sitio libre (de 5 en 5 cm, por filas). Si no hay, la esquina. */
function sitioLibre(plano, pieza) {
  const { w, h } = huella(pieza);
  const { ancho_cm, largo_cm } = plano.habitacion;
  for (let y = 0; y + h <= largo_cm; y += PASO_CM) {
    for (let x = 0; x + w <= ancho_cm; x += PASO_CM) {
      const prueba = { ...pieza, x, y };
      if (!plano.piezas.some((otra) => pisa(prueba, otra))) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

/**
 * Añade un mueble al plano en el primer sitio libre.
 * Guarda también su tipo, su alto y su color (para dibujarlo en 3D) y su foto y precio.
 * Devuelve { ok, plano, motivo }: motivo "sin-medidas" o "lleno" si no se ha podido.
 */
export function ponerPieza(plano, producto, idNuevo) {
  if (!sePuedePoner(producto)) return { ok: false, plano, motivo: "sin-medidas" };
  if (plano.piezas.length >= MAX_PIEZAS) return { ok: false, plano, motivo: "lleno" };
  const pieza = {
    id: idNuevo,
    producto: producto.id,
    nombre: producto.nombre,
    tipo: producto.tipo ?? "",
    ancho_cm: producto.ancho_cm,
    fondo_cm: producto.fondo_cm,
    alto_cm: producto.alto_cm > 0 ? producto.alto_cm : null,
    color: coloresDe(producto)[0] ?? null,
    giro: 0,
    x: 0,
    y: 0,
  };
  const sitio = sitioLibre(plano, pieza);
  return { ok: true, plano: { ...plano, piezas: [...plano.piezas, { ...pieza, ...sitio }] }, motivo: null };
}

/** Alto con el que se dibuja la pieza: el real, o el aproximado de su tipo (y se dice). */
export function altoDibujo(pieza) {
  if (pieza.alto_cm > 0) return { alto: pieza.alto_cm, aproximado: false };
  return { alto: ALTO_APROXIMADO[pieza.tipo] ?? 80, aproximado: true };
}

/** Mueve una pieza a (x, y), redondeando a 5 cm y sin salirse de la habitación. */
export function moverPieza(plano, id, x, y) {
  return {
    ...plano,
    piezas: plano.piezas.map((pieza) => (pieza.id === id ? dentro({ ...pieza, x: redondear(x), y: redondear(y) }, plano.habitacion) : pieza)),
  };
}

/** Gira una pieza 90° (sobre su esquina) y la vuelve a meter en la habitación si se sale. */
export function girarPieza(plano, id) {
  return {
    ...plano,
    piezas: plano.piezas.map((pieza) => (pieza.id === id ? dentro({ ...pieza, giro: pieza.giro === 90 ? 0 : 90 }, plano.habitacion) : pieza)),
  };
}

export function quitarPieza(plano, id) {
  return { ...plano, piezas: plano.piezas.filter((pieza) => pieza.id !== id) };
}

/** Cambia el tamaño de la habitación y recoloca las piezas para que no se salgan. */
export function cambiarHabitacion(plano, ancho, largo) {
  const habitacion = { ancho_cm: ancho, largo_cm: largo };
  return { ...plano, habitacion, piezas: plano.piezas.map((pieza) => dentro(pieza, habitacion)) };
}

/**
 * Lo que hay que avisar al cliente:
 * - noCaben: piezas más grandes que la habitación (tal como están);
 * - pisadas: parejas de piezas que se pisan.
 */
export function problemas(plano) {
  const { ancho_cm, largo_cm } = plano.habitacion;
  const noCaben = plano.piezas.filter((pieza) => {
    const { w, h } = huella(pieza);
    return w > ancho_cm || h > largo_cm;
  });
  const pisadas = [];
  plano.piezas.forEach((a, i) => {
    plano.piezas.slice(i + 1).forEach((b) => {
      if (pisa(a, b)) pisadas.push([a, b]);
    });
  });
  return { noCaben, pisadas };
}

/** Superficie libre aproximada (m²), para dar una idea de cuánto espacio queda. */
export function sueloLibre(plano) {
  const total = plano.habitacion.ancho_cm * plano.habitacion.largo_cm;
  const ocupado = plano.piezas.reduce((suma, pieza) => suma + pieza.ancho_cm * pieza.fondo_cm, 0);
  return Math.max(0, Math.round((total - ocupado) / 1000) / 10);
}

const texto = (valor, largo) => (typeof valor === "string" ? valor.slice(0, largo) : "");

/** Revisa un plano leído del navegador: si está estropeado, devuelve null. */
export function planoValido(plano) {
  const numero = (valor) => typeof valor === "number" && valor > 0 && valor <= 3000;
  if (!plano || !plano.habitacion || !numero(plano.habitacion.ancho_cm) || !numero(plano.habitacion.largo_cm)) return null;
  const piezas = Array.isArray(plano.piezas) ? plano.piezas.filter((pieza) =>
    pieza && typeof pieza.id === "string" && typeof pieza.producto === "string" &&
    numero(pieza.ancho_cm) && numero(pieza.fondo_cm) && typeof pieza.x === "number" && typeof pieza.y === "number") : [];
  return {
    id: texto(plano.id, 40),
    nombre: nombreValido(plano.nombre),
    fecha: texto(plano.fecha, 10),
    habitacion: { ancho_cm: plano.habitacion.ancho_cm, largo_cm: plano.habitacion.largo_cm },
    piezas: piezas.slice(0, MAX_PIEZAS).map((pieza) => ({
      ...pieza,
      nombre: texto(pieza.nombre, 200),
      tipo: texto(pieza.tipo, 40),
      alto_cm: numero(pieza.alto_cm) ? pieza.alto_cm : null,
      color: texto(pieza.color, 20) || null,
      giro: pieza.giro === 90 ? 90 : 0,
    })),
  };
}

// ---------- Varios planos guardados ----------
// La colección es { activo: id del plano abierto, planos: [plano, plano…] }.

/** Revisa la colección leída del navegador. Acepta también el plano único de antes. */
export function coleccionValida(datos, planoAntiguo = null) {
  let planos = Array.isArray(datos?.planos) ? datos.planos.map(planoValido).filter((plano) => plano && plano.id) : [];
  if (planos.length === 0) {
    const antiguo = planoValido(planoAntiguo);
    if (antiguo) planos = [{ ...antiguo, id: antiguo.id || "plano-1" }];
  }
  planos = planos.slice(0, MAX_PLANOS);
  const activo = planos.some((plano) => plano.id === datos?.activo) ? datos.activo : planos[0]?.id ?? null;
  return { activo, planos };
}

/** Guarda (o actualiza) un plano en la colección. Devuelve { ok, coleccion, motivo }. */
export function ponerPlano(coleccion, plano, ahora = new Date()) {
  const fechado = { ...plano, nombre: nombreValido(plano.nombre), fecha: ahora.toISOString().slice(0, 10) };
  const existe = coleccion.planos.some((actual) => actual.id === plano.id);
  if (!existe && coleccion.planos.length >= MAX_PLANOS) return { ok: false, coleccion, motivo: "lleno" };
  const planos = existe
    ? coleccion.planos.map((actual) => (actual.id === plano.id ? fechado : actual))
    : [...coleccion.planos, fechado];
  return { ok: true, coleccion: { activo: plano.id, planos }, motivo: null };
}

/** Borra un plano. Si era el abierto, se abre el primero que quede (o ninguno). */
export function quitarPlano(coleccion, id) {
  const planos = coleccion.planos.filter((plano) => plano.id !== id);
  const activo = coleccion.activo === id ? planos[0]?.id ?? null : coleccion.activo;
  return { activo, planos };
}

/** El plano abierto, o null. */
export function planoActivo(coleccion) {
  return coleccion.planos.find((plano) => plano.id === coleccion.activo) ?? null;
}
