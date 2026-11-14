// Cómo se lee una medida escrita por el cliente (en centímetros): qué vale y qué no.
// Lo usan los filtros de las estancias y Mi plano 3D. Es lógica pura (tests/medidas.test.js).
// (Antes era js/logica/huecos.js: «Mis medidas» y el semáforo se quitaron el 14/11/2026.)

export const MEDIDA_MINIMA = 20;    // cm. Por debajo, casi seguro que es un error.
export const MEDIDA_MAXIMA = 1000;  // cm. Más de 10 m no es de una casa.

/**
 * Lee lo que el cliente ha escrito en un campo de medida. Devuelve uno de estos:
 * - { estado: "vacia" }                      no ha escrito nada
 * - { estado: "ok", valor }                  medida válida, en cm
 * - { estado: "metros", sugerencia, mensaje } parece escrita en metros: se pregunta, no se corrige sola
 * - { estado: "error", mensaje }             no vale
 */
export function leerMedida(texto) {
  const limpio = String(texto ?? "").trim().replace(/\s*cm$/i, "").replace(",", ".");
  if (limpio === "") return { estado: "vacia" };

  if (!/^\d+(\.\d+)?$/.test(limpio)) {
    return { estado: "error", mensaje: "Escribe solo el número, en centímetros. Por ejemplo: 250." };
  }

  const escrito = Number(limpio);
  const valor = Math.round(escrito * 10) / 10; // un decimal como mucho

  if (valor < MEDIDA_MINIMA) {
    // Se calcula con lo escrito, sin redondear: 2,03 m son 203 cm, no 200.
    const enCentimetros = Math.round(escrito * 100);
    if (enCentimetros >= MEDIDA_MINIMA && enCentimetros <= MEDIDA_MAXIMA) {
      return {
        estado: "metros",
        sugerencia: enCentimetros,
        mensaje: `¿Son ${enCentimetros} cm? Parece que lo has escrito en metros.`,
      };
    }
    return { estado: "error", mensaje: `Es muy poco. La medida mínima es ${MEDIDA_MINIMA} cm: revísala.` };
  }

  if (valor > MEDIDA_MAXIMA) {
    return { estado: "error", mensaje: `Es demasiado. La medida máxima es ${MEDIDA_MAXIMA} cm: revísala.` };
  }

  return { estado: "ok", valor };
}
