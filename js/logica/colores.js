// Colores para el filtro de «Planifica tu espacio». Es lógica pura (sin pantalla).
//
// alihogar.es no tiene un campo «color» para todos los muebles: unas veces el color
// es una variante (Blanco, Roble…) y otras va en el nombre («…de Madera de Pino»).
// Aquí se lee de esos dos sitios y se agrupa en familias sencillas. Si no aparece
// ninguna palabra de color, el mueble queda «sin color» y no se adivina.

// Busca palabras enteras aunque lleven tilde («bambú», «marrón»): \b no sirve con letras acentuadas.
const palabras = (opciones) => new RegExp(`(?<!\\p{L})(?:${opciones})(?!\\p{L})`, "iu");

/** Familias de color que ve el cliente, con la muestra que se pinta en el botón. */
export const FAMILIAS = [
  { id: "blanco", nombre: "Blanco", muestra: "#FFFFFF", palabras: palabras("blanc[oa]s?|marfil|crema|hueso|nieve") },
  { id: "negro", nombre: "Negro", muestra: "#2B2B2B", palabras: palabras("negr[oa]s?|antracita|grafito") },
  { id: "gris", nombre: "Gris", muestra: "#9A9EA3", palabras: palabras("gris(es)?|plata|cemento") },
  { id: "beige", nombre: "Beige y arena", muestra: "#DCCBB3", palabras: palabras("beige|taupe|arena|lino|camel|piedra") },
  {
    id: "madera",
    nombre: "Madera clara",
    muestra: "#C9A27A",
    palabras: palabras("roble|pino|haya|natural|bambú|bambu|acacia|mango|teca|fresno|abedul|sonoma|cambria|ratán|ratan|caña|madera"),
  },
  { id: "nogal", nombre: "Madera oscura", muestra: "#6E4D33", palabras: palabras("nogal|wengué|wengue|cerezo|castaño") },
  { id: "marron", nombre: "Marrón", muestra: "#7B5A45", palabras: palabras("marrón|marron|chocolate|cuero|coñac|tabaco") },
  { id: "verde", nombre: "Verde", muestra: "#6E9A6A", palabras: palabras("verde|oliva|salvia") },
  { id: "azul", nombre: "Azul", muestra: "#4F6D8F", palabras: palabras("azul|marino|turquesa") },
  { id: "rosa", nombre: "Rosa", muestra: "#E7A6B8", palabras: palabras("rosa|malva") },
  { id: "amarillo", nombre: "Amarillo y mostaza", muestra: "#E3B341", palabras: palabras("amarill[oa]|mostaza|ocre") },
  { id: "rojo", nombre: "Rojo y teja", muestra: "#B5533C", palabras: palabras("roj[oa]|teja|terracota|burdeos|granate|naranja") },
];

const IDS = FAMILIAS.map((familia) => familia.id);

/** Familias de color de un mueble, leídas de sus variantes y de su nombre. [] si no hay ninguna. */
export function coloresDe(producto) {
  const texto = [...(producto.variantes ?? []), producto.nombre ?? ""].join(" · ");
  return FAMILIAS.filter((familia) => familia.palabras.test(texto)).map((familia) => familia.id);
}

/** Deja solo ids de familia válidos y sin repetir (por si vienen de la dirección o del navegador). */
export function limpiarColores(lista) {
  if (!Array.isArray(lista)) return [];
  return [...new Set(lista.filter((id) => IDS.includes(id)))];
}
