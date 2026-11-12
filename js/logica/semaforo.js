// El semáforo: decide si un mueble cabe en un hueco.
// Es lógica pura (no toca la pantalla) y tiene sus pruebas en tests/semaforo.test.js.
//
// REGLAS (están en CLAUDE.md; no cambiarlas sin avisar al equipo):
// - Verde: sobran al menos 5 cm en ancho y en fondo, y el alto del mueble es menor o igual.
// - Ámbar: en ancho o en fondo sobran entre 0 y 5 cm.
// - Rojo:  alguna medida del mueble supera la del hueco.
// - Una medida que falta (del mueble o del hueco) se salta y se dice.
// - El mueble no se gira: ancho con ancho, fondo con fondo, alto con alto.
// - No se comprueba la puerta: los muebles se entregan desmontados.

export const MARGEN_CM = 5; // holgura mínima para el verde

const redondear = (numero) => Math.round(numero * 10) / 10;

// Compara una medida. `conMargen` es false en el alto, que solo exige «menor o igual».
function comparar(nombre, mueble, hueco, conMargen) {
  if (mueble == null) return { nombre, estado: "saltada", falta: "mueble", mueble, hueco, sobra: null };
  if (hueco == null) return { nombre, estado: "saltada", falta: "hueco", mueble, hueco, sobra: null };
  const sobra = redondear(hueco - mueble);
  let estado = "verde";
  if (sobra < 0) estado = "rojo";
  else if (conMargen && sobra < MARGEN_CM) estado = "ambar";
  return { nombre, estado, falta: null, mueble, hueco, sobra };
}

// El color del conjunto es el de la peor medida.
function peor(medidas) {
  const comparadas = medidas.filter((medida) => medida.estado !== "saltada");
  if (comparadas.length === 0) return "sin-datos";
  if (comparadas.some((medida) => medida.estado === "rojo")) return "rojo";
  if (comparadas.some((medida) => medida.estado === "ambar")) return "ambar";
  return "verde";
}

/**
 * Compara un mueble con un hueco.
 * Devuelve { estado, medidas, abierta }:
 * - estado: "verde", "ambar", "rojo" o "sin-datos" (si no se ha podido comparar nada).
 * - medidas: el detalle de ancho, fondo y alto.
 * - abierta: solo en mesas extensibles; el ancho abierto comparado con el del hueco.
 */
export function evaluarEncaje(producto, hueco) {
  const medidas = [
    comparar("ancho", producto.ancho_cm, hueco.ancho_cm, true),
    comparar("fondo", producto.fondo_cm, hueco.fondo_cm, true),
    comparar("alto", producto.alto_cm, hueco.alto_cm, false),
  ];
  const abierta = producto.ancho_abierto_cm == null
    ? null
    : comparar("ancho abierta", producto.ancho_abierto_cm, hueco.ancho_cm, true);
  return { estado: peor(medidas), medidas, abierta };
}

const numero = (valor) => String(valor).replace(".", ",");
const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** Explica una medida en una frase corta para el cliente. */
export function frase(medida) {
  const nombre = mayuscula(medida.nombre);
  if (medida.estado === "saltada") {
    return medida.falta === "mueble"
      ? `${nombre}: consultar en tienda. No tenemos esa medida del mueble.`
      : `${nombre}: no comprobado. No has indicado esa medida del hueco.`;
  }
  if (medida.estado === "rojo") return `${nombre}: no cabe. Faltan ${numero(-medida.sobra)} cm.`;
  if (medida.sobra === 0) return `${nombre}: cabe exacto, sin holgura.`;
  if (medida.estado === "ambar") return `${nombre}: muy justo. Solo sobran ${numero(medida.sobra)} cm.`;
  return `${nombre}: cabe. Sobran ${numero(medida.sobra)} cm.`;
}

/** Ordena los huecos: primero los de las estancias del mueble; el resto, en su orden. */
export function ordenarHuecos(huecos, estancias = []) {
  const propios = huecos.filter((hueco) => estancias.includes(hueco.estancia));
  const otros = huecos.filter((hueco) => !estancias.includes(hueco.estancia));
  return [...propios, ...otros];
}
