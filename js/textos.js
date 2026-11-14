// Textos y formatos que se repiten en varias pantallas.

// Texto que se enseña siempre que falta un dato. Nunca se inventa.
export const CONSULTAR = "Consultar en tienda";

// Nombres para el cliente de los tipos y estancias del CSV.
export const NOMBRE_TIPO = {
  sofa: "Sofá",
  mueble_tv: "Mueble de TV",
  aparador: "Aparador",
  estanteria: "Estantería",
  cama_canape: "Cama o canapé",
  comoda: "Cómoda",
  mesa_comedor: "Mesa de comedor",
  recibidor: "Recibidor",
  chaise_longue: "Sofá chaise longue",
  sofa_cama: "Sofá cama",
  butaca: "Butaca o sillón",
  vitrina: "Vitrina",
  mesa_centro: "Mesa de centro o auxiliar",
  somier: "Somier, base o cama",
  cabecero: "Cabecero",
  armario: "Armario",
  mesita_noche: "Mesita de noche",
  banqueta: "Banqueta de pie de cama",
  consola: "Consola",
  zapatero: "Zapatero",
  escritorio: "Escritorio",
  silla: "Silla o taburete",
  silla_oficina: "Silla de oficina",
  mesa_cocina: "Mesa de cocina",
  mueble_cocina: "Armario de cocina",
  mueble_bano: "Mueble de baño",
};

export const NOMBRE_ESTANCIA = {
  salon: "Salón",
  comedor: "Comedor",
  dormitorio: "Dormitorio",
  recibidor: "Recibidor",
  estudio: "Estudio",
  cocina: "Cocina",
  bano: "Baño",
};

const formatoNumero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const formatoEuros = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

/** 34.5 -> "34,5 cm". Si falta el dato -> "Consultar en tienda". */
export function cm(valor) {
  return valor == null ? CONSULTAR : `${formatoNumero.format(valor)} cm`;
}

/** 999.99 -> "999,99 €". Si falta el dato -> "Consultar en tienda". */
export function euros(valor) {
  return valor == null ? CONSULTAR : formatoEuros.format(valor);
}

/** Medidas de un producto en una línea: "180 × 90 × 100 cm". */
export function medidas(producto) {
  const partes = [producto.ancho_cm, producto.fondo_cm, producto.alto_cm];
  if (partes.every((parte) => parte == null)) return CONSULTAR;
  return partes.map((parte) => (parte == null ? "?" : formatoNumero.format(parte))).join(" × ") + " cm";
}

/** Evita que un texto (un nombre de hueco, por ejemplo) se interprete como HTML. */
export function escapar(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
