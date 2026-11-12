// Pantalla de Inicio: las dos puertas de entrada, los 3 pasos, la leyenda del
// semáforo y cuatro muebles reales de la tienda.

import { iniciarPagina } from "../comun.js";
import { cargarDatos } from "../datos.js";
import { chipSemaforo, tarjetaProducto } from "../componentes.js";

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

// Muebles de la tienda: el primero de cada uno de los cuatro primeros tipos del catálogo.
// Salen de products.json: no hay ningún producto escrito a mano.
const destacados = document.getElementById("destacados");
try {
  const { productos } = await cargarDatos();
  const vistos = new Set();
  const elegidos = productos.filter((producto) => {
    if (vistos.has(producto.tipo) || vistos.size >= 4) return false;
    vistos.add(producto.tipo);
    return true;
  });
  destacados.innerHTML = elegidos.map((producto) => `<li>${tarjetaProducto(producto)}</li>`).join("");
} catch (error) {
  console.error(error);
  destacados.innerHTML = `<li class="pendiente"><p>No hemos podido cargar los muebles. Recarga la página.</p></li>`;
}
