// Muestrario de diseño (estilo.html). Es una página para el equipo:
// enseña las piezas y calcula el contraste de los colores de la marca.

import { iniciarPagina } from "../comun.js";
import { cargarDatos } from "../datos.js";
import { avisoOrientativo, chipSemaforo, croquisPared, tarjetaProducto } from "../componentes.js";

iniciarPagina(null);

// ---- Contraste (fórmula de las pautas WCAG) ----
function luminancia(color) {
  const [r, g, b] = color.match(/\d+(\.\d+)?/g).slice(0, 3).map((canal) => {
    const c = Number(canal) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(colorA, colorB) {
  const [clara, oscura] = [luminancia(colorA), luminancia(colorB)].sort((a, b) => b - a);
  return (clara + 0.05) / (oscura + 0.05);
}

// Parejas texto / fondo que se usan en la herramienta: [nombre, texto, fondo, mínimo].
const PAREJAS = [
  ["Texto", "--texto", "--fondo", 4.5],
  ["Título", "--titulo", "--fondo", 4.5],
  ["Texto en caja gris", "--texto", "--gris-claro", 4.5],
  ["Enlace y título de sección", "--marca", "--fondo", 4.5],
  ["Botón principal", "--sobre-marca", "--marca", 4.5],
  ["Botón al pulsar", "--sobre-marca", "--marca-fuerte", 4.5],
  ["Aviso", "--titulo", "--rosa-claro", 4.5],
  ["Magenta del logo (solo letra grande: pide 3 : 1)", "--marca-viva", "--fondo", 3],
  ["Semáforo: cabe", "--verde", "--verde-fondo", 4.5],
  ["Semáforo: justo", "--ambar", "--ambar-fondo", 4.5],
  ["Semáforo: no cabe", "--rojo", "--rojo-fondo", 4.5],
  ["Borde de campo (pide 3 : 1)", "--borde-campo", "--fondo", 3],
];

const lista = document.getElementById("muestras");
lista.innerHTML = PAREJAS.map(
  ([nombre, texto, fondo, minimo]) =>
    `<li class="muestra" data-minimo="${minimo}" style="color: var(${texto}); background: var(${fondo});">${nombre}<small></small></li>`
).join("");

// El navegador nos dice el color final de cada muestra y con eso se calcula el contraste.
lista.querySelectorAll(".muestra").forEach((muestra) => {
  const estilo = getComputedStyle(muestra);
  const valor = contraste(estilo.color, estilo.backgroundColor);
  const pasa = valor >= Number(muestra.dataset.minimo);
  muestra.dataset.contraste = valor.toFixed(2);
  muestra.dataset.pasa = pasa ? "si" : "no";
  muestra.querySelector("small").textContent = `${valor.toFixed(1).replace(".", ",")} : 1 · ${pasa ? "pasa" : "NO PASA"}`;
});

// ---- Piezas ----
document.getElementById("semaforos").innerHTML = ["verde", "ambar", "rojo"].map((estado) => chipSemaforo(estado)).join("");
document.getElementById("aviso").innerHTML = avisoOrientativo();

// La tarjeta y el croquis usan un producto real del catálogo (el primero), no uno inventado.
try {
  const { productos } = await cargarDatos();
  const producto = productos[0];
  document.getElementById("tarjeta").innerHTML = `<li>${tarjetaProducto(producto, chipSemaforo("verde"))}</li>`;
  document.getElementById("croquis").innerHTML = croquisPared({ anchoPared: 300, anchoMueble: producto.ancho_cm });
} catch (error) {
  console.error(error);
  document.getElementById("tarjeta").innerHTML = `<li class="pendiente"><p>No se han podido cargar los productos.</p></li>`;
}
