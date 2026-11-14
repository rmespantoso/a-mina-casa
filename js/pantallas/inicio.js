// Pantalla de Inicio: las dos puertas de entrada (planificar desde casa o escanear en la
// tienda) y la leyenda del semáforo. Desde el 14/11/2026 es más sencilla: en las pruebas
// con clientes, tantas opciones en la portada confundían.

import { iniciarPagina } from "../comun.js";
import { chipSemaforo } from "../componentes.js";

iniciarPagina("inicio");

// Leyenda del semáforo: qué significa cada luz.
const LEYENDA = [
  ["verde", "Te sobran 5 cm o más."],
  ["ambar", "Entra, pero con menos de 5 cm."],
  ["rojo", "Alguna medida se pasa. Te lo decimos igual."],
];
document.getElementById("leyenda").innerHTML = LEYENDA.map(
  ([estado, texto]) => `<li>${chipSemaforo(estado)}<span>${texto}</span></li>`
).join("");
