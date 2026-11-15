// Pruebas de los muebles recomendados de la ficha del QR (parecidos, combina con, colección).

import { grupo, prueba, igual, cierto } from "./mini.js";
import { cargarComplementos, cargarDatos } from "../js/datos.js";
import { POR_FILA, coleccionDe, combinaCon, mismaColeccion, parecidos, relacionados } from "../js/logica/relacionados.js";

const NO_ES = ["Plazas", "Madera", "Pino", "Auxiliar", "MDF"];
const p = (id, nombre, tipo, precio, ancho = 100, estancias = ["salon"]) =>
  ({ id, nombre, tipo, precio_eur: precio, ancho_cm: ancho, fondo_cm: 50, alto_cm: 80, estancias });

const SOFA = p("SOF-01", "Sofá Turin de 3 Plazas de Madera", "sofa", 400, 200);
const CATALOGO = [
  SOFA,
  p("SOF-02", "Sofá Roma de 3 Plazas", "sofa", 420, 205),
  p("SOF-03", "Sofá Lujo de 4 Plazas", "sofa", 1200, 280),
  p("SOF-04", "Sofá Patio de Exterior", "sofa", 410, 200, ["terraza"]),
  p("MCE-01", "Mesa Auxiliar Turin de Pino", "mesa_centro", 90),
  p("MCE-02", "Mesa Auxiliar Nube", "mesa_centro", 40),
  p("TV-01", "Mueble de TV Kioto", "mueble_tv", 150),
  p("APA-01", "Aparador Turin con 4 Puertas", "aparador", 300, 160, ["salon", "comedor"]),
  p("CAM-01", "Canapé Turin Abatible", "cama_canape", 250, 150, ["dormitorio"]),
];
const CONFIG = { combina_con: { sofa: ["mesa_centro", "mueble_tv"] }, no_es_coleccion: NO_ES };

grupo("Recomendados · colección");

prueba("la colección es la primera palabra con mayúscula después del tipo", () => {
  igual(coleccionDe(SOFA, NO_ES), "Turin");
  igual(coleccionDe({ nombre: "Mesa Auxiliar Turin de Pino" }, NO_ES), "Turin", "salta las palabras de la lista");
  igual(coleccionDe({ nombre: "Base Tapizada SUYDI de ECUS (120 x 190 cm)" }, ["Tapizada"]), "SUYDI");
  igual(coleccionDe({ nombre: "Estante Flotante de Pared Turin Liso (pequeño)" }, ["Flotante", "Pared"]), "Turin");
});

prueba("sin colección clara devuelve null", () => {
  igual(coleccionDe({ nombre: "Sofá de 3 plazas" }, NO_ES), null);
  igual(coleccionDe({ nombre: "Mesa Auxiliar de MDF" }, NO_ES), null);
  igual(coleccionDe(null, NO_ES), null);
});

grupo("Recomendados · filas");

prueba("parecidos: mismo tipo y estancia, el más cercano en precio y medidas primero", () => {
  igual(parecidos(SOFA, CATALOGO).map((x) => x.id), ["SOF-02", "SOF-03"], "el de terraza no sale");
});

prueba("combina con: alterna los tipos y pone primero la misma colección", () => {
  igual(combinaCon(SOFA, CATALOGO, CONFIG.combina_con, NO_ES).map((x) => x.id), ["MCE-01", "TV-01", "MCE-02"]);
  igual(combinaCon({ ...SOFA, tipo: "mueble_bano" }, CATALOGO, CONFIG.combina_con, NO_ES), [], "un tipo sin parejas no da nada");
});

prueba("misma colección: cualquier tipo con el mismo nombre de colección", () => {
  igual(mismaColeccion(SOFA, CATALOGO, NO_ES).map((x) => x.id), ["MCE-01", "APA-01", "CAM-01"]);
  igual(mismaColeccion(CATALOGO[1], CATALOGO, NO_ES), [], "Roma no tiene más muebles");
});

prueba("las tres filas no repiten muebles entre ellas ni el propio mueble", () => {
  const filas = relacionados(SOFA, CATALOGO, CONFIG);
  igual(filas.coleccion, "Turin");
  igual(filas.mismaColeccion.map((x) => x.id), ["APA-01", "CAM-01"], "MCE-01 ya sale en «Combina con»");
  const todos = [...filas.parecidos, ...filas.combina, ...filas.mismaColeccion].map((x) => x.id);
  igual(new Set(todos).size, todos.length);
  cierto(!todos.includes(SOFA.id));
});

prueba(`en el catálogo real cada fila tiene como mucho ${POR_FILA} muebles y no se repiten`, async () => {
  const [{ productos }, config] = await Promise.all([cargarDatos(), cargarComplementos()]);
  for (const producto of productos.slice(0, 120)) {
    const filas = relacionados(producto, productos, config);
    const todos = [...filas.parecidos, ...filas.combina, ...filas.mismaColeccion].map((x) => x.id);
    cierto(filas.parecidos.length <= POR_FILA && filas.combina.length <= POR_FILA && filas.mismaColeccion.length <= POR_FILA, producto.id);
    igual(new Set(todos).size, todos.length, producto.id);
    cierto(!todos.includes(producto.id), producto.id);
  }
});

prueba("todos los tipos del catálogo tienen su entrada en complementos.json y apuntan a tipos que existen", async () => {
  const [{ productos }, config] = await Promise.all([cargarDatos(), cargarComplementos()]);
  const tipos = new Set(productos.map((x) => x.tipo));
  for (const tipo of tipos) cierto(Array.isArray(config.combina_con[tipo]), `falta ${tipo}`);
  for (const [tipo, parejas] of Object.entries(config.combina_con)) {
    for (const pareja of parejas) cierto(tipos.has(pareja), `${tipo} → ${pareja} no existe`);
  }
});

prueba("el sofá Turin real recomienda muebles de la colección Turin", async () => {
  const [{ productos }, config] = await Promise.all([cargarDatos(), cargarComplementos()]);
  const turin = productos.find((x) => x.id === "SOF-02");
  const filas = relacionados(turin, productos, config);
  igual(filas.coleccion, "Turin");
  cierto(filas.mismaColeccion.length > 0, "hay otros Turin");
  cierto(filas.parecidos.every((x) => x.tipo === "sofa"));
});
