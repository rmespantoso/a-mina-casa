// El recomendador «¿Qué me cabe?»: de todos los muebles, devuelve solo los que caben
// en la pared del cliente, ordenados por lo bien proporcionados que quedan.
// Es lógica pura y tiene sus pruebas en tests/recomendador.test.js.
//
// Los rangos de proporción NO están aquí: se leen de data/reglas_proporcion.json,
// que es orientativo y se puede cambiar sin tocar el código.

import { leerMedida } from "./huecos.js";
import { evaluarEncaje } from "./semaforo.js";

/** Tipos de mueble que tienen sentido en una estancia, según las reglas. */
export function tiposDeEstancia(reglas, estancia) {
  return Object.keys(reglas.tipos).filter((tipo) => reglas.tipos[tipo].estancias.includes(estancia));
}

/** Todas las estancias que aparecen en las reglas, sin repetir. */
export function estanciasDeReglas(reglas) {
  return [...new Set(Object.values(reglas.tipos).flatMap((regla) => regla.estancias))];
}

/**
 * Revisa el formulario de búsqueda. Solo el ancho de la pared es obligatorio.
 * Devuelve { ok, busqueda: { estancia, tipo, pared }, errores, sugerencias }.
 */
export function validarBusqueda(datos = {}, reglas) {
  const errores = {};
  const sugerencias = {};
  const pared = {};

  if (!estanciasDeReglas(reglas).includes(datos.estancia)) {
    errores.estancia = "Elige la estancia.";
  } else if (!tiposDeEstancia(reglas, datos.estancia).includes(datos.tipo)) {
    errores.tipo = "Elige qué mueble buscas.";
  }

  for (const nombre of ["ancho", "fondo", "alto"]) {
    const leida = leerMedida(datos[nombre]);
    if (leida.estado === "ok") {
      pared[`${nombre}_cm`] = leida.valor;
    } else if (leida.estado === "vacia") {
      pared[`${nombre}_cm`] = null;
      if (nombre === "ancho") errores.ancho = "Falta el ancho de la pared. Es la única medida obligatoria.";
    } else {
      errores[nombre] = leida.mensaje;
      if (leida.estado === "metros") sugerencias[nombre] = leida.sugerencia;
    }
  }

  const ok = Object.keys(errores).length === 0;
  return { ok, busqueda: ok ? { estancia: datos.estancia, tipo: datos.tipo, pared } : null, errores, sugerencias };
}

// Lo lejos que queda una ocupación del rango ideal (0 si está dentro).
function fueraDelRango(ocupacion, regla) {
  if (ocupacion < regla.ocupacion_min) return regla.ocupacion_min - ocupacion;
  if (ocupacion > regla.ocupacion_max) return ocupacion - regla.ocupacion_max;
  return 0;
}

/**
 * Recomienda muebles para una pared.
 * 1. Filtro: solo los de esa estancia y ese tipo que salen en verde o ámbar. Nunca uno que no cabe.
 * 2. Proporción: qué parte del ancho de la pared ocupa cada uno, comparada con el rango de su tipo.
 * 3. Orden: primero los verdes dentro del rango (el más centrado delante), luego los verdes
 *    fuera del rango (el que menos se aleja delante) y al final los ámbar.
 * Devuelve { resultados, total, regla }: `resultados` trae como mucho `max_resultados`
 * y `total` dice cuántos cabían en realidad.
 */
export function recomendar(productos, reglas, { estancia, tipo, pared }) {
  const regla = reglas.tipos[tipo];
  if (!regla || !pared || pared.ancho_cm == null) return { resultados: [], total: 0, regla: regla ?? null };

  const centro = (regla.ocupacion_min + regla.ocupacion_max) / 2;

  const candidatos = productos
    .filter((producto) => producto.tipo === tipo && producto.estancias.includes(estancia) && producto.ancho_cm != null)
    .map((producto) => {
      const encaje = evaluarEncaje(producto, pared);
      const ocupacion = producto.ancho_cm / pared.ancho_cm;
      const lejos = fueraDelRango(ocupacion, regla);
      const dentro = lejos === 0;
      let etiqueta = "Justo";
      if (encaje.estado === "verde") etiqueta = dentro ? "Encaja perfecto" : "Encaja";
      // grupo 0: verde y en rango · grupo 1: verde fuera de rango · grupo 2: ámbar
      const grupo = encaje.estado === "verde" ? (dentro ? 0 : 1) : 2;
      const distancia = grupo === 1 ? lejos : Math.abs(ocupacion - centro);
      return { producto, encaje, ocupacion, dentro, etiqueta, grupo, distancia };
    })
    .filter((candidato) => candidato.encaje.estado === "verde" || candidato.encaje.estado === "ambar")
    .sort((a, b) => a.grupo - b.grupo || a.distancia - b.distancia || a.producto.id.localeCompare(b.producto.id));

  return { resultados: candidatos.slice(0, reglas.max_resultados), total: candidatos.length, regla };
}

/**
 * Qué botón de compra lleva un mueble en los resultados:
 * - "carrito": se puede añadir directamente (no hay nada que elegir).
 * - "elegir":  tiene variantes (colores o medidas); hay que elegirlas en su página de alihogar.es,
 *              para que el cliente no compre sin querer la opción que no era.
 * - "ficha":   tiene variantes pero no enlace a alihogar.es; se abre nuestra ficha.
 */
export function accionCompra(producto) {
  if (!producto.variantes || producto.variantes.length === 0) return "carrito";
  return producto.url_alihogar ? "elegir" : "ficha";
}

/** 0.6234 -> 62 (porcentaje entero, para enseñarlo). */
export function porcentaje(proporcion) {
  return Math.round(proporcion * 100);
}
