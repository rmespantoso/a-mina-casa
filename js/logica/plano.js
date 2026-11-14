// Plano de la habitación (vista desde arriba, a escala). Es lógica pura (sin pantalla).
//
// La habitación es un rectángulo de ancho × largo en centímetros. Cada mueble es otro
// rectángulo con su ancho y su fondo REALES (los de products.json): nunca se inventa
// una medida. Si a un mueble le falta el ancho o el fondo, no se puede poner en el plano.
// El origen (0, 0) es la esquina de arriba a la izquierda; x va hacia la derecha e y hacia abajo.

export const PASO_CM = 5;        // los muebles se mueven de 5 en 5 cm
export const MAX_PIEZAS = 20;

/** Un plano nuevo y vacío. */
export function crearPlano(ancho, largo) {
  return { habitacion: { ancho_cm: ancho, largo_cm: largo }, piezas: [] };
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
 * Devuelve { ok, plano, motivo }: motivo "sin-medidas" o "lleno" si no se ha podido.
 */
export function ponerPieza(plano, producto, idNuevo) {
  if (!sePuedePoner(producto)) return { ok: false, plano, motivo: "sin-medidas" };
  if (plano.piezas.length >= MAX_PIEZAS) return { ok: false, plano, motivo: "lleno" };
  const pieza = {
    id: idNuevo,
    producto: producto.id,
    nombre: producto.nombre,
    ancho_cm: producto.ancho_cm,
    fondo_cm: producto.fondo_cm,
    giro: 0,
    x: 0,
    y: 0,
  };
  const sitio = sitioLibre(plano, pieza);
  return { ok: true, plano: { ...plano, piezas: [...plano.piezas, { ...pieza, ...sitio }] }, motivo: null };
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
  return { habitacion, piezas: plano.piezas.map((pieza) => dentro(pieza, habitacion)) };
}

/**
 * Lo que hay que avisar al cliente:
 * - noCaben: piezas más grandes que la habitación (ni girándolas, o tal como están);
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

/** Revisa un plano leído del navegador: si está estropeado, devuelve null. */
export function planoValido(plano) {
  const numero = (valor) => typeof valor === "number" && valor > 0 && valor <= 3000;
  if (!plano || !plano.habitacion || !numero(plano.habitacion.ancho_cm) || !numero(plano.habitacion.largo_cm)) return null;
  const piezas = Array.isArray(plano.piezas) ? plano.piezas.filter((pieza) =>
    pieza && typeof pieza.id === "string" && typeof pieza.producto === "string" &&
    numero(pieza.ancho_cm) && numero(pieza.fondo_cm) && typeof pieza.x === "number" && typeof pieza.y === "number") : [];
  return { habitacion: plano.habitacion, piezas: piezas.slice(0, MAX_PIEZAS).map((pieza) => ({ ...pieza, giro: pieza.giro === 90 ? 90 : 0 })) };
}
