// Pruebas del botón de compra de cada mueble.

import { grupo, prueba, igual } from "./mini.js";
import { cargarDatos } from "../js/datos.js";
import { accionCompra } from "../js/logica/recomendador.js";

grupo("Compra · qué botón lleva cada mueble");

prueba("sin variantes se puede añadir al carrito directamente", () => {
  igual(accionCompra({ variantes: [], url_alihogar: "https://alihogar.es/x.html" }), "carrito");
});

prueba("con colores o medidas a elegir se manda a alihogar.es, no al carrito", () => {
  igual(accionCompra({ variantes: ["Gris", "Gris Oscuro"], url_alihogar: "https://alihogar.es/x.html" }), "elegir");
  igual(accionCompra({ variantes: ["Gris"], url_alihogar: null }), "ficha");
});

prueba("en el catálogo real, todo mueble con variantes tiene su enlace para elegirlas", async () => {
  const { productos } = await cargarDatos();
  igual(productos.filter((p) => accionCompra(p) === "ficha").map((p) => p.id), []);
});
