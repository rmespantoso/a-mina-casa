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
export const ALTO_HABITACION = 250; // cm: alto de las paredes del 3D (techo)
export const PASO_PARED = 10;       // las flechas mueven los muebles de pared de 10 en 10 cm
export const GIROS = [0, 90, 180, 270];
/** Las cuatro paredes, en el orden en que ↻ pasa un mueble de pared a la siguiente. */
export const PAREDES = ["fondo", "derecha", "delante", "izquierda"];
// Giro con el que la trasera del mueble toca cada pared (el frente mira hacia dentro).
const GIRO_DE_PARED = { fondo: 0, derecha: 90, delante: 180, izquierda: 270 };
// Hacia dónde va «→» mirando de frente a cada pared, en (x, y) del plano.
const DERECHA_DE_PARED = { fondo: [1, 0], derecha: [0, 1], delante: [-1, 0], izquierda: [0, -1] };

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

/** Tamaño que ocupa una pieza en el suelo, teniendo en cuenta su giro (0, 90, 180 o 270°). */
export function huella(pieza) {
  return pieza.giro === 90 || pieza.giro === 270
    ? { w: pieza.fondo_cm, h: pieza.ancho_cm }
    : { w: pieza.ancho_cm, h: pieza.fondo_cm };
}

const redondear = (valor) => Math.round(valor / PASO_CM) * PASO_CM;
const minusculas = (texto) => String(texto ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** ¿Va colgado en la pared? (baldas, estantes de pared, mesitas flotantes…) */
export const enPared = (pieza) => PAREDES.includes(pieza?.pared);

/**
 * ¿Este mueble se cuelga en la pared? Se mira si su nombre lleva alguna de las palabras de
 * data/colocacion.json («de pared», «flotante», «mural»…). Nunca se escribe fijo en el código.
 */
export function esDePared(producto, colocacion) {
  const nombre = minusculas(producto?.nombre);
  return Boolean(nombre) && (colocacion?.palabras ?? []).some((palabra) => nombre.includes(minusculas(palabra)));
}

/** Altura (desde el suelo hasta la base del mueble) a la que se cuelga al ponerlo. */
export function alturaInicial(producto, colocacion) {
  return colocacion?.altura_cm?.[producto?.tipo] ?? colocacion?.altura_por_defecto ?? 120;
}

/** Base y parte de arriba del mueble (cm desde el suelo): los de pared empiezan en su altura. */
function franja(pieza) {
  const base = enPared(pieza) ? pieza.altura_cm ?? 0 : 0;
  return { base, arriba: base + altoDibujo(pieza).alto };
}

/** Deja la pieza dentro de la habitación (si cabe). Si es más grande, la pega a la esquina. */
function dentro(pieza, habitacion) {
  const { w, h } = huella(pieza);
  const x = Math.min(Math.max(0, pieza.x), Math.max(0, habitacion.ancho_cm - w));
  const y = Math.min(Math.max(0, pieza.y), Math.max(0, habitacion.largo_cm - h));
  return { ...pieza, x, y };
}

/**
 * Pega un mueble de pared a SU pared: lo gira para que la trasera toque la pared, mantiene su
 * centro a lo largo de ella y no lo deja salirse por los lados, ni bajar del suelo ni pasar del techo.
 */
function pegarAPared(pieza, habitacion) {
  const antes = huella(pieza);
  const centroX = pieza.x + antes.w / 2;
  const centroY = pieza.y + antes.h / 2;
  const girada = { ...pieza, giro: GIRO_DE_PARED[pieza.pared] };
  const { w, h } = huella(girada);
  const { ancho_cm: W, largo_cm: L } = habitacion;
  let x = redondear(centroX - w / 2);
  let y = redondear(centroY - h / 2);
  if (pieza.pared === "fondo") y = 0;
  if (pieza.pared === "delante") y = L - h;
  if (pieza.pared === "izquierda") x = 0;
  if (pieza.pared === "derecha") x = W - w;
  const techo = Math.max(0, ALTO_HABITACION - altoDibujo(pieza).alto);
  const altura_cm = Math.min(Math.max(0, redondear(pieza.altura_cm ?? 0)), techo);
  return dentro({ ...girada, x, y, altura_cm }, habitacion);
}

/** Coloca la pieza como le toca: en el suelo dentro de la habitación, o pegada a su pared. */
function colocar(pieza, habitacion) {
  return enPared(pieza) ? pegarAPared(pieza, habitacion) : dentro(pieza, habitacion);
}

/**
 * ¿Dos piezas ocupan el mismo sitio? Tienen que coincidir en el suelo Y en altura: una balda
 * colgada encima de un sofá bajo no lo pisa, pero sí si choca con un armario alto.
 */
function pisa(a, b) {
  const ha = huella(a);
  const hb = huella(b);
  const enSuelo = a.x < b.x + hb.w && b.x < a.x + ha.w && a.y < b.y + hb.h && b.y < a.y + ha.h;
  if (!enSuelo) return false;
  const fa = franja(a);
  const fb = franja(b);
  return fa.base < fb.arriba && fb.base < fa.arriba;
}

/**
 * Busca el primer sitio libre (de 5 en 5 cm). En el suelo, por filas; si es de pared, a lo
 * largo de cada pared. Si no hay, la esquina (y el plano avisará de que se pisan).
 */
function sitioLibre(plano, pieza) {
  const { ancho_cm, largo_cm } = plano.habitacion;
  if (enPared(pieza)) {
    for (const pared of PAREDES) {
      const largo = pared === "fondo" || pared === "delante" ? ancho_cm : largo_cm;
      for (let paso = 0; paso <= largo; paso += PASO_CM) {
        const prueba = pegarAPared({ ...pieza, pared, giro: GIRO_DE_PARED[pared], x: paso, y: paso }, plano.habitacion);
        if (!plano.piezas.some((otra) => pisa(prueba, otra))) return prueba;
      }
    }
    return pegarAPared({ ...pieza, pared: "fondo", giro: 0, x: 0, y: 0 }, plano.habitacion);
  }
  const { w, h } = huella(pieza);
  for (let y = 0; y + h <= largo_cm; y += PASO_CM) {
    for (let x = 0; x + w <= ancho_cm; x += PASO_CM) {
      const prueba = { ...pieza, x, y };
      if (!plano.piezas.some((otra) => pisa(prueba, otra))) return prueba;
    }
  }
  return { ...pieza, x: 0, y: 0 };
}

/**
 * Añade un mueble al plano en el primer sitio libre.
 * Guarda también su tipo, su alto y su color (para dibujarlo en 3D) y su foto y precio.
 * Si `colocacion` (data/colocacion.json) dice que se cuelga, va a la pared, a su altura.
 * Devuelve { ok, plano, motivo }: motivo "sin-medidas" o "lleno" si no se ha podido.
 */
export function ponerPieza(plano, producto, idNuevo, colocacion = null) {
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
  if (esDePared(producto, colocacion)) Object.assign(pieza, { pared: "fondo", altura_cm: alturaInicial(producto, colocacion) });
  return { ok: true, plano: { ...plano, piezas: [...plano.piezas, sitioLibre(plano, pieza)] }, motivo: null };
}

/** Alto con el que se dibuja la pieza: el real, o el aproximado de su tipo (y se dice). */
export function altoDibujo(pieza) {
  if (pieza.alto_cm > 0) return { alto: pieza.alto_cm, aproximado: false };
  return { alto: ALTO_APROXIMADO[pieza.tipo] ?? 80, aproximado: true };
}

const cambiar = (plano, id, cambio) =>
  ({ ...plano, piezas: plano.piezas.map((pieza) => (pieza.id === id ? cambio(pieza) : pieza)) });

/** La pared más cercana al centro de una pieza. */
function paredCercana(pieza, habitacion) {
  const { w, h } = huella(pieza);
  const cx = pieza.x + w / 2;
  const cy = pieza.y + h / 2;
  const distancia = { fondo: cy, derecha: habitacion.ancho_cm - cx, delante: habitacion.largo_cm - cy, izquierda: cx };
  return PAREDES.reduce((mejor, pared) => (distancia[pared] < distancia[mejor] ? pared : mejor), PAREDES[0]);
}

/**
 * Mueve una pieza a (x, y), redondeando a 5 cm y sin salirse de la habitación.
 * Un mueble de pared se pega a la pared más cercana (y conserva su altura).
 */
export function moverPieza(plano, id, x, y) {
  return cambiar(plano, id, (pieza) => {
    const movida = { ...pieza, x: redondear(x), y: redondear(y) };
    if (!enPared(pieza)) return dentro(movida, plano.habitacion);
    return pegarAPared({ ...movida, pared: paredCercana(movida, plano.habitacion) }, plano.habitacion);
  });
}

/**
 * ↻: un mueble del suelo gira un cuarto de vuelta (90°) sobre su centro, así que en 4 toques
 * vuelve a como estaba. Uno de pared pasa a la pared siguiente (fondo → derecha → delante → izquierda).
 */
export function girarPieza(plano, id) {
  return cambiar(plano, id, (pieza) => {
    if (enPared(pieza)) {
      const siguiente = PAREDES[(PAREDES.indexOf(pieza.pared) + 1) % PAREDES.length];
      return pegarAPared({ ...pieza, pared: siguiente }, plano.habitacion);
    }
    const antes = huella(pieza);
    const giro = GIROS[(GIROS.indexOf(pieza.giro) + 1) % GIROS.length];
    const despues = huella({ ...pieza, giro });
    const x = redondear(pieza.x + antes.w / 2 - despues.w / 2);
    const y = redondear(pieza.y + antes.h / 2 - despues.h / 2);
    return dentro({ ...pieza, giro, x, y }, plano.habitacion);
  });
}

/**
 * Flechas de un mueble de pared: "arriba" y "abajo" cambian su altura; "izquierda" y "derecha"
 * lo deslizan por la pared, tal como se ve mirándola de frente. De PASO_PARED en PASO_PARED cm.
 */
export function moverEnPared(plano, id, direccion) {
  return cambiar(plano, id, (pieza) => {
    if (!enPared(pieza)) return pieza;
    const movida = { ...pieza };
    if (direccion === "arriba") movida.altura_cm = (pieza.altura_cm ?? 0) + PASO_PARED;
    if (direccion === "abajo") movida.altura_cm = (pieza.altura_cm ?? 0) - PASO_PARED;
    const signo = direccion === "derecha" ? 1 : direccion === "izquierda" ? -1 : 0;
    const [dx, dy] = DERECHA_DE_PARED[pieza.pared];
    movida.x += signo * dx * PASO_PARED;
    movida.y += signo * dy * PASO_PARED;
    return pegarAPared(movida, plano.habitacion);
  });
}

/**
 * Cuánto espacio queda alrededor de una pieza (cm, nunca negativo).
 * - Suelo: { tipo: "suelo", izquierda, derecha, fondo, delante } hasta las cuatro paredes.
 * - Pared: { tipo: "pared", pared, izquierda, derecha, suelo, techo }: los lados como se ven
 *   mirando la pared de frente, y lo que queda hasta el suelo y hasta el techo.
 */
export function distancias(plano, id) {
  const pieza = plano.piezas.find((actual) => actual.id === id);
  if (!pieza) return null;
  const { w, h } = huella(pieza);
  const positivo = (valor) => Math.max(0, Math.round(valor));
  const lados = {
    izquierda: positivo(pieza.x),
    derecha: positivo(plano.habitacion.ancho_cm - pieza.x - w),
    fondo: positivo(pieza.y),
    delante: positivo(plano.habitacion.largo_cm - pieza.y - h),
  };
  if (!enPared(pieza)) return { tipo: "suelo", ...lados };
  const [izquierda, derecha] = {
    fondo: [lados.izquierda, lados.derecha],
    derecha: [lados.fondo, lados.delante],
    delante: [lados.derecha, lados.izquierda],
    izquierda: [lados.delante, lados.fondo],
  }[pieza.pared];
  const { base, arriba } = franja(pieza);
  return { tipo: "pared", pared: pieza.pared, izquierda, derecha, suelo: positivo(base), techo: positivo(ALTO_HABITACION - arriba) };
}

/** Lo que cuestan juntos los muebles del plano. `sinPrecio`: los que no tienen precio en la web. */
export function precioPlano(plano, catalogo) {
  let total = 0;
  let sinPrecio = 0;
  for (const pieza of plano.piezas) {
    const precio = catalogo.find((producto) => producto.id === pieza.producto)?.precio_eur;
    if (precio > 0) total += precio;
    else sinPrecio += 1;
  }
  return { total: Math.round(total * 100) / 100, sinPrecio };
}

export function quitarPieza(plano, id) {
  return { ...plano, piezas: plano.piezas.filter((pieza) => pieza.id !== id) };
}

/** Cambia el tamaño de la habitación y recoloca las piezas para que no se salgan. */
export function cambiarHabitacion(plano, ancho, largo) {
  const habitacion = { ancho_cm: ancho, largo_cm: largo };
  return { ...plano, habitacion, piezas: plano.piezas.map((pieza) => colocar(pieza, habitacion)) };
}

/**
 * Lo que hay que avisar al cliente:
 * - noCaben: piezas más grandes que la habitación (tal como están) o más altas que el techo;
 * - pisadas: parejas de piezas que se pisan.
 */
export function problemas(plano) {
  const { ancho_cm, largo_cm } = plano.habitacion;
  const noCaben = plano.piezas.filter((pieza) => {
    const { w, h } = huella(pieza);
    return w > ancho_cm || h > largo_cm || franja(pieza).arriba > ALTO_HABITACION;
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
  // Los muebles de pared no ocupan suelo.
  const ocupado = plano.piezas.reduce((suma, pieza) => suma + (enPared(pieza) ? 0 : pieza.ancho_cm * pieza.fondo_cm), 0);
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
    piezas: piezas.slice(0, MAX_PIEZAS).map((pieza) => {
      const { pared, altura_cm: altura, ...resto } = pieza;
      const limpia = {
        ...resto,
        nombre: texto(pieza.nombre, 200),
        tipo: texto(pieza.tipo, 40),
        alto_cm: numero(pieza.alto_cm) ? pieza.alto_cm : null,
        color: texto(pieza.color, 20) || null,
        giro: GIROS.includes(pieza.giro) ? pieza.giro : 0,
      };
      // Mueble de pared: solo si la pared es una de las cuatro; la altura, entre el suelo y el techo.
      if (PAREDES.includes(pared)) {
        Object.assign(limpia, {
          pared,
          altura_cm: typeof altura === "number" && altura >= 0 && altura <= ALTO_HABITACION ? altura : 0,
          giro: GIRO_DE_PARED[pared],
        });
      }
      return limpia;
    }),
  };
}

// ---------- Plano de prueba y planos guardados ----------
// La colección es { activo, planos: [plano, plano…], prueba }:
// - prueba: el plano de prueba (500 × 500 cm al empezar). Es donde cae un mueble al pulsar
//   «Probar en mi plano 3D». Se recuerda en el navegador, pero no está en «Mis planos»
//   hasta que el cliente lo guarda con un nombre.
// - planos: los guardados con nombre (hasta MAX_PLANOS).
// - activo: el id del plano abierto ("prueba" o el de uno guardado).

export const PRUEBA = "prueba";
export const LADO_ESTANDAR = 500; // cm: habitación de partida del plano de prueba

/** Un plano de prueba vacío, de 500 × 500 cm. */
export function planoDePruebaVacio() {
  return crearPlano(LADO_ESTANDAR, LADO_ESTANDAR, "Plano de prueba", PRUEBA);
}

/** Revisa la colección leída del navegador. Acepta también el plano único de antes. */
export function coleccionValida(datos, planoAntiguo = null) {
  let planos = Array.isArray(datos?.planos)
    ? datos.planos.map(planoValido).filter((plano) => plano && plano.id && plano.id !== PRUEBA)
    : [];
  if (planos.length === 0) {
    const antiguo = planoValido(planoAntiguo);
    if (antiguo) planos = [{ ...antiguo, id: antiguo.id || "plano-1" }];
  }
  planos = planos.slice(0, MAX_PLANOS);
  const leida = planoValido(datos?.prueba);
  const prueba = leida ? { ...leida, id: PRUEBA, nombre: "Plano de prueba" } : null;
  const existe = (id) => (id === PRUEBA ? Boolean(prueba) : planos.some((plano) => plano.id === id));
  const activo = existe(datos?.activo) ? datos.activo : planos[0]?.id ?? (prueba ? PRUEBA : null);
  return { activo, planos, prueba };
}

/** El plano abierto, o null. */
export function planoActivo(coleccion) {
  if (coleccion.activo === PRUEBA) return coleccion.prueba;
  return coleccion.planos.find((plano) => plano.id === coleccion.activo) ?? null;
}

/** Abre el plano de prueba (lo crea de 500 × 500 si no había). */
export function abrirPrueba(coleccion) {
  return { ...coleccion, activo: PRUEBA, prueba: coleccion.prueba ?? planoDePruebaVacio() };
}

/** Guarda los cambios del plano abierto donde corresponda (prueba o guardado). */
export function actualizarPlano(coleccion, plano, ahora = new Date()) {
  if (plano.id === PRUEBA) return { ...coleccion, activo: PRUEBA, prueba: plano };
  const fechado = { ...plano, nombre: nombreValido(plano.nombre), fecha: ahora.toISOString().slice(0, 10) };
  const existe = coleccion.planos.some((actual) => actual.id === plano.id);
  const planos = existe ? coleccion.planos.map((actual) => (actual.id === plano.id ? fechado : actual)) : coleccion.planos;
  return { ...coleccion, activo: existe ? plano.id : coleccion.activo, planos };
}

/**
 * Guarda el plano abierto como un plano NUEVO con nombre (medidas y muebles incluidos).
 * Si venía del plano de prueba, el de prueba se vacía para la próxima vez.
 * Devuelve { ok, coleccion, plano, motivo }.
 */
export function guardarComoNuevo(coleccion, plano, nombre, idNuevo, ahora = new Date()) {
  if (coleccion.planos.length >= MAX_PLANOS) return { ok: false, coleccion, plano, motivo: "lleno" };
  const nuevo = { ...plano, id: idNuevo, nombre: nombreValido(nombre), fecha: ahora.toISOString().slice(0, 10) };
  return {
    ok: true,
    coleccion: {
      activo: idNuevo,
      planos: [...coleccion.planos, nuevo],
      prueba: plano.id === PRUEBA ? null : coleccion.prueba,
    },
    plano: nuevo,
    motivo: null,
  };
}

/** Abre un plano guardado. */
export function abrirPlano(coleccion, id) {
  return coleccion.planos.some((plano) => plano.id === id) ? { ...coleccion, activo: id } : coleccion;
}

/** Borra un plano guardado. Si era el abierto, se abre el plano de prueba. */
export function quitarPlano(coleccion, id) {
  const planos = coleccion.planos.filter((plano) => plano.id !== id);
  if (coleccion.activo !== id) return { ...coleccion, planos };
  return abrirPrueba({ ...coleccion, planos });
}
