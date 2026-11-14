// Colores para el filtro de «Planifica tu espacio». Es lógica pura (sin pantalla).
//
// alihogar.es no tiene un campo «color» para todos los muebles: unas veces el color
// es una variante (Blanco, Roble…) y otras va en el nombre («…de Madera de Pino»).
// Aquí se lee de esos dos sitios y se agrupa en familias sencillas. Si no aparece
// ninguna palabra de color, el mueble queda «sin color» y no se adivina.
//
// 9 familias (14/11/2026), elegidas contando el catálogo: los colores con muy pocos
// muebles se juntan (madera oscura con marrón; rosa, mostaza y teja), porque en la
// pantalla de un móvil casi no se distinguen y por separado darían muy pocos resultados.
// Van ordenadas de más a menos muebles.

// Busca palabras enteras aunque lleven tilde («bambú», «marrón»): \b no sirve con letras acentuadas.
const palabras = (opciones) => new RegExp(`(?<!\\p{L})(?:${opciones})(?!\\p{L})`, "iu");

/** Familias de color que ve el cliente, con la muestra que se pinta junto al nombre. */
export const FAMILIAS = [
  {
    id: "madera",
    nombre: "Madera clara",
    muestra: "#C9A27A",
    palabras: palabras("roble|pino|haya|natural|bambú|bambu|acacia|mango|teca|fresno|abedul|sonoma|cambria|ratán|ratan|caña|madera"),
  },
  { id: "blanco", nombre: "Blanco", muestra: "#FFFFFF", palabras: palabras("blanc[oa]s?|marfil|crema|hueso|nieve") },
  { id: "gris", nombre: "Gris", muestra: "#9A9EA3", palabras: palabras("gris(es)?|plata|cemento") },
  { id: "negro", nombre: "Negro", muestra: "#2B2B2B", palabras: palabras("negr[oa]s?|antracita|grafito") },
  { id: "beige", nombre: "Beige y arena", muestra: "#DCCBB3", palabras: palabras("beige|taupe|arena|lino|camel|piedra") },
  {
    id: "nogal",
    nombre: "Madera oscura y marrón",
    muestra: "#6E4D33",
    palabras: palabras("nogal|wengué|wengue|cerezo|castaño|marrón|marron|chocolate|cuero|coñac|tabaco"),
  },
  { id: "verde", nombre: "Verde", muestra: "#6E9A6A", palabras: palabras("verde|oliva|salvia") },
  { id: "azul", nombre: "Azul", muestra: "#4F6D8F", palabras: palabras("azul|marino|turquesa") },
  {
    id: "vivos",
    nombre: "Rosa, mostaza y teja",
    muestra: "linear-gradient(90deg, #E7A6B8 0 33%, #E3B341 33% 66%, #B5533C 66%)",
    palabras: palabras("rosa|malva|amarill[oa]|mostaza|ocre|roj[oa]|teja|terracota|burdeos|granate|naranja"),
  },
];

const IDS = FAMILIAS.map((familia) => familia.id);

// Familias antiguas (antes del 14/11/2026) que se juntaron: una búsqueda guardada con
// ellas sigue funcionando.
const ANTIGUAS = { marron: "nogal", rosa: "vivos", amarillo: "vivos", rojo: "vivos" };

/** Familias de color de un mueble, leídas de sus variantes y de su nombre. [] si no hay ninguna. */
export function coloresDe(producto) {
  const texto = [...(producto.variantes ?? []), producto.nombre ?? ""].join(" · ");
  return FAMILIAS.filter((familia) => familia.palabras.test(texto)).map((familia) => familia.id);
}

/** Deja solo ids de familia válidos y sin repetir (por si vienen de la dirección o del navegador). */
export function limpiarColores(lista) {
  if (!Array.isArray(lista)) return [];
  return [...new Set(lista.map((id) => ANTIGUAS[id] ?? id).filter((id) => IDS.includes(id)))];
}
