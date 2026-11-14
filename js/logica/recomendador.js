// Qué botón de compra lleva cada mueble. Es lógica pura (tests/recomendador.test.js).
//
// Antes aquí estaba también el recomendador «¿Qué me cabe?» (muebles que caben en una
// pared, ordenados por proporción). Desde el 14/11/2026 se busca con los filtros de cada
// estancia (js/logica/planificador.js) y el semáforo de los huecos se ha quitado.

/**
 * Qué botón de compra lleva un mueble:
 * - "carrito": se puede añadir directamente (no hay nada que elegir).
 * - "elegir":  tiene variantes (colores o medidas); hay que elegirlas en su página de alihogar.es,
 *              para que el cliente no compre sin querer la opción que no era.
 * - "ficha":   tiene variantes pero no enlace a alihogar.es; se abre nuestra ficha.
 */
export function accionCompra(producto) {
  if (!producto.variantes || producto.variantes.length === 0) return "carrito";
  return producto.url_alihogar ? "elegir" : "ficha";
}
