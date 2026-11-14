// «Planifica tu espacio»: la búsqueda dentro de una estancia. Es lógica pura (sin pantalla).
//
// El cliente elige una estancia (dormitorio), un grupo de muebles (canapés), las medidas
// de su hueco y, si quiere, un precio máximo y unos colores. Se aplican las mismas reglas
// que en el recomendador: solo entra lo que cabe (verde o ámbar), nunca lo que no cabe,
// y se ordena por proporción con la pared.

import { evaluarEncaje } from "./semaforo.js";
import { leerMedida } from "./huecos.js";
import { coloresDe, limpiarColores } from "./colores.js";

/** Precios máximos que se ofrecen (en euros). null = sin límite. */
export const PRECIOS = [null, 100, 200, 300, 500, 750, 1000, 1500];

/** Cuántas búsquedas guardadas se recuerdan como mucho. */
export const MAX_BUSQUEDAS = 10;

/** Busca una estancia por su id en la lista de data/estancias.json. */
export function estanciaPorId(estancias, id) {
  return estancias.find((estancia) => estancia.id === id) ?? null;
}

/**
 * Revisa el formulario de una estancia. Solo el ancho del hueco es obligatorio.
 * Devuelve { ok, busqueda, errores, sugerencias }.
 */
export function validarPlan(datos = {}, estancia) {
  const errores = {};
  const sugerencias = {};
  const pared = {};

  const grupo = estancia?.grupos.find((actual) => actual.id === datos.grupo);
  if (!grupo) errores.grupo = "Elige qué mueble buscas.";

  for (const nombre of ["ancho", "fondo", "alto"]) {
    const leida = leerMedida(datos[nombre]);
    if (leida.estado === "ok") {
      pared[`${nombre}_cm`] = leida.valor;
    } else if (leida.estado === "vacia") {
      pared[`${nombre}_cm`] = null;
      if (nombre === "ancho") errores.ancho = "Falta el ancho del hueco. Es la única medida obligatoria.";
    } else {
      errores[nombre] = leida.mensaje;
      if (leida.estado === "metros") sugerencias[nombre] = leida.sugerencia;
    }
  }

  const precio = Number(datos.precio);
  const precioMax = PRECIOS.includes(precio) ? precio : null;
  const colores = limpiarColores(datos.colores);

  const ok = Object.keys(errores).length === 0;
  const busqueda = ok ? { estancia: estancia.id, grupo: grupo.id, tipos: grupo.tipos, pared, precioMax, colores } : null;
  return { ok, busqueda, errores, sugerencias };
}

// Lo lejos que queda una ocupación del rango ideal (0 si está dentro).
function fueraDelRango(ocupacion, regla) {
  if (ocupacion < regla.ocupacion_min) return regla.ocupacion_min - ocupacion;
  if (ocupacion > regla.ocupacion_max) return ocupacion - regla.ocupacion_max;
  return 0;
}

/**
 * Busca los muebles de un grupo que caben en el hueco y cumplen precio y color.
 * Orden: verdes dentro de su rango (el más centrado delante), verdes fuera de rango
 * (el que menos se aleja delante) y al final los ámbar. Cada mueble se compara con
 * el rango de SU tipo en reglas_proporcion.json.
 *
 * Devuelve { resultados, total, caben, porPrecio, porColor }:
 * - resultados: como mucho `max_resultados`;
 * - total: cuántos cumplen todo;
 * - caben: cuántos caben sin mirar precio ni color;
 * - porPrecio / porColor: cuántos de los que caben se quedan fuera por cada filtro.
 */
export function buscarEnEstancia(productos, reglas, { tipos, pared, precioMax = null, colores = [] }) {
  if (!pared || pared.ancho_cm == null || !Array.isArray(tipos)) {
    return { resultados: [], total: 0, caben: 0, porPrecio: 0, porColor: 0 };
  }

  const queCaben = productos
    .filter((producto) => tipos.includes(producto.tipo) && reglas.tipos[producto.tipo] && producto.ancho_cm != null)
    .map((producto) => {
      const regla = reglas.tipos[producto.tipo];
      const encaje = evaluarEncaje(producto, pared);
      const ocupacion = producto.ancho_cm / pared.ancho_cm;
      const lejos = fueraDelRango(ocupacion, regla);
      const dentro = lejos === 0;
      let etiqueta = "Justo";
      if (encaje.estado === "verde") etiqueta = dentro ? "Encaja perfecto" : "Encaja";
      const grupo = encaje.estado === "verde" ? (dentro ? 0 : 1) : 2;
      const centro = (regla.ocupacion_min + regla.ocupacion_max) / 2;
      const distancia = grupo === 1 ? lejos : Math.abs(ocupacion - centro);
      return { producto, regla, encaje, ocupacion, dentro, etiqueta, grupo, distancia };
    })
    .filter((candidato) => candidato.encaje.estado === "verde" || candidato.encaje.estado === "ambar");

  const pasaPrecio = (candidato) => precioMax == null || (candidato.producto.precio_eur != null && candidato.producto.precio_eur <= precioMax);
  const pasaColor = (candidato) => colores.length === 0 || coloresDe(candidato.producto).some((color) => colores.includes(color));

  const finales = queCaben
    .filter((candidato) => pasaPrecio(candidato) && pasaColor(candidato))
    .sort((a, b) => a.grupo - b.grupo || a.distancia - b.distancia || a.producto.id.localeCompare(b.producto.id));

  return {
    resultados: finales.slice(0, reglas.max_resultados),
    total: finales.length,
    caben: queCaben.length,
    porPrecio: queCaben.filter((candidato) => !pasaPrecio(candidato)).length,
    porColor: queCaben.filter((candidato) => pasaPrecio(candidato) && !pasaColor(candidato)).length,
  };
}

// ---------- Búsquedas guardadas ----------

/** Nombre corto de una búsqueda: «Dormitorio · Canapés · 170 cm · hasta 500 €». */
export function nombreBusqueda(busqueda, estancia, nombresColor = {}) {
  const grupo = estancia?.grupos.find((actual) => actual.id === busqueda.grupo);
  const partes = [estancia?.nombre ?? busqueda.estancia, grupo?.nombre ?? busqueda.grupo, `${busqueda.pared.ancho_cm} cm`];
  if (busqueda.precioMax) partes.push(`hasta ${busqueda.precioMax} €`);
  if (busqueda.colores?.length) partes.push(busqueda.colores.map((id) => nombresColor[id] ?? id).join(", "));
  return partes.join(" · ");
}

/** Lo que se guarda de una búsqueda: solo la búsqueda, nada personal. */
export function paraGuardar(busqueda, ahora = new Date()) {
  return {
    estancia: busqueda.estancia,
    grupo: busqueda.grupo,
    ancho: busqueda.pared.ancho_cm,
    fondo: busqueda.pared.fondo_cm,
    alto: busqueda.pared.alto_cm,
    precio: busqueda.precioMax,
    colores: busqueda.colores,
    fecha: ahora.toISOString().slice(0, 10),
  };
}

/** ¿Son la misma búsqueda (sin mirar la fecha)? */
function mismaBusqueda(a, b) {
  return a.estancia === b.estancia && a.grupo === b.grupo && a.ancho === b.ancho && a.fondo === b.fondo &&
    a.alto === b.alto && a.precio === b.precio && [...(a.colores ?? [])].sort().join() === [...(b.colores ?? [])].sort().join();
}

/**
 * Añade una búsqueda guardada (la más reciente, la primera). Si ya estaba, la sube arriba
 * sin duplicarla. Si se pasa de MAX_BUSQUEDAS, se olvida la más antigua.
 * Devuelve { lista, repetida }.
 */
export function ponerBusqueda(lista, nueva) {
  const repetida = lista.some((actual) => mismaBusqueda(actual, nueva));
  const resto = lista.filter((actual) => !mismaBusqueda(actual, nueva));
  return { lista: [nueva, ...resto].slice(0, MAX_BUSQUEDAS), repetida };
}

/** Quita la búsqueda de la posición indicada. */
export function quitarBusqueda(lista, posicion) {
  return lista.filter((_, indice) => indice !== posicion);
}

/** Dirección para repetir una búsqueda guardada: espacio.html?e=…&g=…&a=… */
export function enlaceBusqueda(guardada) {
  const parametros = new URLSearchParams({ e: guardada.estancia, g: guardada.grupo, a: String(guardada.ancho) });
  if (guardada.fondo != null) parametros.set("f", String(guardada.fondo));
  if (guardada.alto != null) parametros.set("h", String(guardada.alto));
  if (guardada.precio != null) parametros.set("p", String(guardada.precio));
  if (guardada.colores?.length) parametros.set("c", guardada.colores.join("."));
  return `espacio.html?${parametros}`;
}
