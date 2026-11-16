// «Planifica tu espacio»: el filtro dentro de una estancia. Es lógica pura (sin pantalla).
//
// Desde el 14/11/2026 es un FILTRO de recomendación, no un hueco: el cliente dice, si
// quiere, qué tipo de mueble busca, las medidas que quiere que tenga el mueble (como
// mucho), un precio máximo y unos colores. Todo es opcional. Salen los muebles de la
// estancia que cumplen todo lo que haya elegido.
//
// Las medidas se leen como «como mucho»: si pide 160 cm de ancho, salen los de 160 o
// menos, primero los que más se acercan a lo que pidió. Si el mueble no tiene esa
// medida en la web, no sale (no se adivina). El semáforo de los huecos (QR) no cambia.

import { leerMedida } from "./medidas.js";
import { coloresDe, limpiarColores } from "./colores.js";

/** Barra del precio: de 0 a PRECIO_TOPE euros, de PASO_PRECIO en PASO_PRECIO. El tope = sin límite.
 *  Los recuadros «Desde» y «Hasta» admiten cualquier cifra en euros enteros. */
export const PRECIO_TOPE = 2000;
export const PASO_PRECIO = 25;

/**
 * Tope de la barra del precio según los muebles que se buscan (16/11/2026): el precio del más
 * caro de esos tipos, redondeado hacia arriba a un número redondo (hasta 500 €, al múltiplo
 * de 50; por encima, al de 100). Mesitas (169,99 €) → 200; sofás (1.223,99 €) → 1.300.
 * Sin precios, el tope general (PRECIO_TOPE).
 */
export function topePrecio(productos, tipos) {
  const precios = productos.filter((producto) => tipos.includes(producto.tipo) && producto.precio_eur > 0).map((producto) => producto.precio_eur);
  if (precios.length === 0) return PRECIO_TOPE;
  const mayor = Math.max(...precios);
  const unidad = mayor <= 500 ? 50 : 100;
  return Math.max(unidad, Math.ceil(mayor / unidad - 1e-9) * unidad);
}

/** Salto de la barra: de 10 en 10 € en las barras cortas (hasta 500 €) y de 25 en 25 € en las largas. */
export function pasoPrecio(tope) {
  return tope <= 500 ? 10 : 25;
}

/** Cuántos muebles se enseñan de cada vez (luego, «Ver más»). */
export const POR_PAGINA = 12;

const MEDIDAS = ["ancho", "fondo", "alto"];

/** Busca una estancia por su id en la lista de data/estancias.json. */
export function estanciaPorId(estancias, id) {
  return estancias.find((estancia) => estancia.id === id) ?? null;
}

/** Todos los tipos de mueble de una estancia, sin repetir. */
export function tiposDeEstancia(estancia) {
  return [...new Set((estancia?.grupos ?? []).flatMap((grupo) => grupo.tipos))];
}

const numeroPrecio = (valor) => {
  if (valor === "" || valor == null) return null;
  const numero = Number(String(valor).replace(",", ".").replace(/\s*€$/, ""));
  return Number.isFinite(numero) ? Math.round(numero) : null;
};

/** Precio máximo. Sin número, negativo o en el tope (2.000 € o más): sin límite (null). */
export function leerPrecio(valor) {
  const numero = numeroPrecio(valor);
  if (numero == null || numero < 0 || numero >= PRECIO_TOPE) return null;
  return numero;
}

/** Precio mínimo. Sin número, 0 o menos: sin mínimo (null). */
export function leerPrecioMin(valor) {
  const numero = numeroPrecio(valor);
  if (numero == null || numero <= 0) return null;
  return Math.min(numero, PRECIO_TOPE);
}

/**
 * Revisa el formulario de una estancia. Nada es obligatorio: solo se avisa si una
 * medida está mal escrita. Devuelve { ok, busqueda, errores, sugerencias }.
 */
export function validarPlan(datos = {}, estancia) {
  const errores = {};
  const sugerencias = {};
  const medidas = {};

  const grupo = estancia?.grupos.find((actual) => actual.id === datos.grupo) ?? null;

  for (const nombre of MEDIDAS) {
    const leida = leerMedida(datos[nombre]);
    if (leida.estado === "ok") {
      medidas[`${nombre}_cm`] = leida.valor;
    } else if (leida.estado === "vacia") {
      medidas[`${nombre}_cm`] = null;
    } else {
      errores[nombre] = leida.mensaje;
      if (leida.estado === "metros") sugerencias[nombre] = leida.sugerencia;
    }
  }

  // Si el mínimo queda por encima del máximo, se dan la vuelta (no se pide al cliente que lo corrija).
  let precioMin = leerPrecioMin(datos.precio_min);
  let precioMax = leerPrecio(datos.precio);
  if (precioMin != null && precioMax != null && precioMin > precioMax) [precioMin, precioMax] = [precioMax, precioMin];

  const ok = Object.keys(errores).length === 0 && Boolean(estancia);
  const busqueda = ok
    ? {
        estancia: estancia.id,
        grupo: grupo?.id ?? null,
        tipos: grupo ? grupo.tipos : tiposDeEstancia(estancia),
        medidas,
        precioMin,
        precioMax,
        colores: limpiarColores(datos.colores),
      }
    : null;
  return { ok, busqueda, errores, sugerencias };
}

// ¿Cumple el mueble las medidas pedidas (como mucho)? Sin la medida en la web, no.
function cumpleMedidas(producto, medidas) {
  return MEDIDAS.every((nombre) => {
    const pedida = medidas[`${nombre}_cm`];
    if (pedida == null) return true;
    const suya = producto[`${nombre}_cm`];
    return suya != null && suya <= pedida;
  });
}

// Lo lejos que queda el mueble de lo que pidió el cliente (0 = justo lo pedido).
function distancia(producto, medidas) {
  let suma = 0;
  for (const nombre of MEDIDAS) {
    const pedida = medidas[`${nombre}_cm`];
    if (pedida) suma += (pedida - producto[`${nombre}_cm`]) / pedida;
  }
  return suma;
}

/**
 * Busca los muebles de la estancia que cumplen el filtro.
 * Orden: si hay medidas, primero los que más se acercan a lo pedido; si no, de menor a
 * mayor precio (los que no tienen precio, al final).
 *
 * Devuelve { resultados, total, delTipo, porMedida, porPrecio, porColor }:
 * - resultados: todos los que cumplen, ya ordenados;
 * - delTipo: cuántos muebles hay de ese tipo en la estancia, sin filtrar;
 * - porMedida / porPrecio / porColor: cuántos se quedan fuera en cada paso, por orden.
 */
export function buscarEnEstancia(productos, { tipos, medidas = {}, precioMin = null, precioMax = null, colores = [] }) {
  const vacio = { resultados: [], total: 0, delTipo: 0, porMedida: 0, porPrecio: 0, porColor: 0 };
  if (!Array.isArray(tipos) || tipos.length === 0) return vacio;

  const hayMedidas = MEDIDAS.some((nombre) => medidas[`${nombre}_cm`] != null);
  const pasaPrecio = (producto) => (precioMin == null && precioMax == null) || (producto.precio_eur != null &&
    (precioMin == null || producto.precio_eur >= precioMin) && (precioMax == null || producto.precio_eur <= precioMax));
  const pasaColor = (producto) => colores.length === 0 || coloresDe(producto).some((color) => colores.includes(color));

  const delTipo = productos.filter((producto) => tipos.includes(producto.tipo));
  const conMedida = delTipo.filter((producto) => cumpleMedidas(producto, medidas));
  const conPrecio = conMedida.filter(pasaPrecio);
  const finales = conPrecio.filter(pasaColor);

  const precio = (producto) => producto.precio_eur ?? Infinity;
  finales.sort((a, b) =>
    (hayMedidas ? distancia(a, medidas) - distancia(b, medidas) : 0) || precio(a) - precio(b) || a.id.localeCompare(b.id));

  return {
    resultados: finales,
    total: finales.length,
    delTipo: delTipo.length,
    porMedida: delTipo.length - conMedida.length,
    porPrecio: conMedida.length - conPrecio.length,
    porColor: conPrecio.length - finales.length,
  };
}

// ---------- La búsqueda en la dirección ----------

/** La búsqueda en forma sencilla (para la dirección): solo el filtro, nada personal. */
export function paraGuardar(busqueda, ahora = new Date()) {
  return {
    estancia: busqueda.estancia,
    grupo: busqueda.grupo,
    ancho: busqueda.medidas.ancho_cm,
    fondo: busqueda.medidas.fondo_cm,
    alto: busqueda.medidas.alto_cm,
    precio_min: busqueda.precioMin ?? null,
    precio: busqueda.precioMax,
    colores: busqueda.colores,
    fecha: ahora.toISOString().slice(0, 10),
  };
}

/** Las medidas pedidas, en texto: «160 cm de ancho, 45 de fondo». "" si no hay. */
export function textoMedidas(guardada) {
  const partes = [];
  for (const nombre of MEDIDAS) {
    if (guardada[nombre] != null) partes.push(`${String(guardada[nombre]).replace(".", ",")}${partes.length ? "" : " cm"} de ${nombre}`);
  }
  return partes.join(", ");
}

// Parámetros de una búsqueda en la dirección: e (estancia), g, a, f, h, pm (precio mínimo), p, c.
function parametrosBusqueda(guardada) {
  const parametros = new URLSearchParams({ e: guardada.estancia });
  if (guardada.grupo) parametros.set("g", guardada.grupo);
  if (guardada.ancho != null) parametros.set("a", String(guardada.ancho));
  if (guardada.fondo != null) parametros.set("f", String(guardada.fondo));
  if (guardada.alto != null) parametros.set("h", String(guardada.alto));
  if (guardada.precio_min != null) parametros.set("pm", String(guardada.precio_min));
  if (guardada.precio != null) parametros.set("p", String(guardada.precio));
  const colores = limpiarColores(guardada.colores);
  if (colores.length) parametros.set("c", colores.join("."));
  return parametros;
}

/** Página de resultados de una búsqueda (desde el 15/11/2026, aparte del filtro). */
export function enlaceBusqueda(guardada) {
  return `resultados.html?${parametrosBusqueda(guardada)}`;
}

/** El filtro de la estancia con esa búsqueda ya rellena («← Volver a la búsqueda»). */
export function enlaceFiltro(guardada) {
  return `espacio.html?${parametrosBusqueda(guardada)}`;
}

/** Lee una búsqueda de la dirección (lo contrario de parametrosBusqueda). */
export function busquedaDeDireccion(busqueda) {
  const parametros = new URLSearchParams(busqueda);
  const numero = (clave) => (parametros.get(clave) ?? "");
  return {
    estancia: parametros.get("e"),
    grupo: parametros.get("g"),
    ancho: numero("a"),
    fondo: numero("f"),
    alto: numero("h"),
    precio_min: numero("pm"),
    precio: numero("p"),
    colores: (parametros.get("c") ?? "").split("."),
  };
}
