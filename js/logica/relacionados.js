// Muebles recomendados debajo de la ficha del QR (15/11/2026). Es lógica pura
// (tests/relacionados.test.js): recibe el catálogo y devuelve listas, sin tocar la pantalla.
//
// Tres filas, todas con muebles reales del catálogo (nunca se inventa nada):
//   - Parecidos: del mismo tipo y la misma estancia, con precio y medidas cercanos.
//   - Combina con: otros tipos que suelen ir juntos (data/complementos.json → combina_con).
//   - De la misma colección: el mismo nombre de colección (Turin, Strait, Kioto…).
// Un mueble que ya sale en una fila no se repite en las siguientes.

export const POR_FILA = 6;

const compartenEstancia = (a, b) =>
  !a.estancias?.length || !b.estancias?.length || a.estancias.some((estancia) => b.estancias.includes(estancia));

// Diferencia relativa entre dos números (0 = iguales, 1 = muy distintos). Sin dato, a medias.
function diferencia(a, b) {
  if (a == null || b == null) return 0.5;
  const mayor = Math.max(Math.abs(a), Math.abs(b));
  return mayor === 0 ? 0 : Math.abs(a - b) / mayor;
}

/** Cuánto se parecen dos muebles del mismo tipo: precio y medidas (menor = más parecido). */
function distancia(a, b) {
  const tamano = (diferencia(a.ancho_cm, b.ancho_cm) + diferencia(a.fondo_cm, b.fondo_cm) + diferencia(a.alto_cm, b.alto_cm)) / 3;
  return diferencia(a.precio_eur, b.precio_eur) + tamano;
}

/**
 * Colección de un mueble: la primera palabra con mayúscula de su nombre, después del tipo,
 * que no esté en la lista `noEsColeccion`. «Sofá Turin de 3 Plazas» → "Turin". Si no hay, null.
 */
export function coleccionDe(producto, noEsColeccion = []) {
  const fuera = new Set(noEsColeccion);
  for (const trozo of String(producto?.nombre ?? "").split(/\s+/).slice(1)) {
    const palabra = trozo.replace(/^[("'.,]+|[)"'.,]+$/g, "");
    if (palabra.length < 3 || fuera.has(palabra)) continue;
    if (!/^[A-ZÁÉÍÓÚÑ][\p{L}-]*$/u.test(palabra)) continue;
    return palabra;
  }
  return null;
}

/** Mismo tipo y estancia, ordenados por parecido (precio y medidas). */
export function parecidos(producto, productos, cuantos = POR_FILA) {
  return productos
    .filter((otro) => otro.id !== producto.id && otro.tipo === producto.tipo && compartenEstancia(producto, otro))
    .map((otro) => ({ otro, d: distancia(producto, otro) }))
    .sort((a, b) => a.d - b.d || a.otro.id.localeCompare(b.otro.id))
    .slice(0, cuantos)
    .map(({ otro }) => otro);
}

/**
 * Muebles de los tipos que combinan con este (en el orden de `combinaCon`), de la misma estancia.
 * Se van alternando los tipos para que haya variedad; dentro de cada tipo, primero los de la
 * misma colección y después de menor a mayor precio.
 */
export function combinaCon(producto, productos, combinaConTipos = {}, noEsColeccion = [], cuantos = POR_FILA) {
  const tipos = combinaConTipos[producto.tipo] ?? [];
  const coleccion = coleccionDe(producto, noEsColeccion);
  const precio = (p) => p.precio_eur ?? Infinity;
  const porTipo = tipos.map((tipo) =>
    productos
      .filter((otro) => otro.id !== producto.id && otro.tipo === tipo && compartenEstancia(producto, otro))
      .sort((a, b) => {
        const mismaA = coleccion && coleccionDe(a, noEsColeccion) === coleccion ? 0 : 1;
        const mismaB = coleccion && coleccionDe(b, noEsColeccion) === coleccion ? 0 : 1;
        return mismaA - mismaB || precio(a) - precio(b) || a.id.localeCompare(b.id);
      }));
  const elegidos = [];
  for (let vuelta = 0; elegidos.length < cuantos && porTipo.some((lista) => lista.length > vuelta); vuelta++) {
    for (const lista of porTipo) {
      if (lista[vuelta] && elegidos.length < cuantos) elegidos.push(lista[vuelta]);
    }
  }
  return elegidos;
}

/** Otros muebles con el mismo nombre de colección (de cualquier tipo). */
export function mismaColeccion(producto, productos, noEsColeccion = [], cuantos = POR_FILA) {
  const coleccion = coleccionDe(producto, noEsColeccion);
  if (!coleccion) return [];
  return productos
    .filter((otro) => otro.id !== producto.id && coleccionDe(otro, noEsColeccion) === coleccion)
    .slice(0, cuantos);
}

/**
 * Las tres filas de la ficha, sin repetir muebles entre ellas.
 * `config` es data/complementos.json: { combina_con, no_es_coleccion }.
 */
export function relacionados(producto, productos, config = {}) {
  const noEs = config.no_es_coleccion ?? [];
  const usados = new Set([producto.id]);
  // Coge hasta POR_FILA muebles que no hayan salido antes y los marca como usados.
  function sinRepetir(lista) {
    const fila = [];
    for (const otro of lista) {
      if (fila.length === POR_FILA) break;
      if (usados.has(otro.id)) continue;
      usados.add(otro.id);
      fila.push(otro);
    }
    return fila;
  }
  // Se piden de más para que, al quitar repetidos, la fila siga llena.
  const filaParecidos = sinRepetir(parecidos(producto, productos, POR_FILA));
  const filaCombina = sinRepetir(combinaCon(producto, productos, config.combina_con, noEs, POR_FILA * 2));
  const filaColeccion = sinRepetir(mismaColeccion(producto, productos, noEs, POR_FILA * 3));
  return {
    coleccion: coleccionDe(producto, noEs),
    parecidos: filaParecidos,
    combina: filaCombina,
    mismaColeccion: filaColeccion,
  };
}
