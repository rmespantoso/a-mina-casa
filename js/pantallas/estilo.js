// Muestrario de diseño (estilo.html). Es una página para el equipo:
// enseña las piezas, deja elegir el tema y calcula el contraste de los colores.

import { iniciarPagina } from "../comun.js";
import { guardar, leer } from "../almacen.js";
import { cargarDatos } from "../datos.js";
import { avisoOrientativo, chipSemaforo, croquisPared, tarjetaProducto } from "../componentes.js";
import { silueta } from "../dibujos.js";
import { NOMBRE_TIPO } from "../textos.js";

iniciarPagina(null);

// ---- Selector de tema ----
const NOMBRE_TEMA = { ria: "A · Ría", castano: "B · Castaño" };

function aplicarTema(tema) {
  if (tema === "ria") delete document.documentElement.dataset.tema;
  else document.documentElement.dataset.tema = tema;
  guardar("tema", tema);
  document.getElementById("tema-actual").textContent = `Tema activo: ${NOMBRE_TEMA[tema]}`;
  pintarMuestras();
}

document.querySelectorAll("button[data-tema]").forEach((boton) => {
  boton.addEventListener("click", () => aplicarTema(boton.dataset.tema));
});

// ---- Contraste (fórmula de las pautas WCAG) ----
function luminancia(color) {
  const [r, g, b] = color.match(/\d+(\.\d+)?/g).slice(0, 3).map((canal) => {
    const c = Number(canal) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(colorA, colorB) {
  const [clara, oscura] = [luminancia(colorA), luminancia(colorB)].sort((a, b) => b - a);
  return (clara + 0.05) / (oscura + 0.05);
}

// Parejas texto / fondo que se usan en la web.
const PAREJAS = [
  ["Texto", "--tinta", "--fondo"],
  ["Texto secundario", "--tinta-suave", "--fondo"],
  ["Texto en tarjeta", "--tinta", "--superficie"],
  ["Secundario en tarjeta", "--tinta-suave", "--superficie"],
  ["Enlace", "--marca", "--fondo"],
  ["Botón principal", "--sobre-marca", "--marca"],
  ["Botón secundario", "--marca", "--superficie"],
  ["Aviso", "--tinta", "--marca-suave"],
  ["Marcador de foto", "--tinta", "--superficie-2"],
  ["Nota del marcador", "--tinta-suave", "--superficie-2"],
  ["Semáforo: cabe", "--verde", "--verde-fondo"],
  ["Semáforo: justo", "--ambar", "--ambar-fondo"],
  ["Semáforo: no cabe", "--rojo", "--rojo-fondo"],
  ["Borde de campo (pide 3 : 1)", "--borde-campo", "--superficie"],
];

function pintarMuestras() {
  const lista = document.getElementById("muestras");
  lista.innerHTML = PAREJAS.map(
    ([nombre, texto, fondo]) =>
      `<li class="muestra" data-minimo="${nombre.includes("3 : 1") ? 3 : 4.5}"
           style="color: var(${texto}); background: var(${fondo});">${nombre}<small></small></li>`
  ).join("");

  // El navegador nos dice el color final de cada muestra y con eso se calcula el contraste.
  lista.querySelectorAll(".muestra").forEach((muestra) => {
    const estilo = getComputedStyle(muestra);
    const valor = contraste(estilo.color, estilo.backgroundColor);
    const pasa = valor >= Number(muestra.dataset.minimo);
    muestra.dataset.contraste = valor.toFixed(2);
    muestra.dataset.pasa = pasa ? "si" : "no";
    muestra.querySelector("small").textContent =
      `${valor.toFixed(1).replace(".", ",")} : 1 · ${pasa ? "pasa" : "NO PASA"}`;
  });
}

// ---- Piezas ----
document.getElementById("tema-actual").textContent = `Tema activo: ${NOMBRE_TEMA[leer("tema", "ria")] ?? NOMBRE_TEMA.ria}`;
pintarMuestras();

document.getElementById("semaforos").innerHTML = ["verde", "ambar", "rojo"].map((estado) => chipSemaforo(estado)).join("");
document.getElementById("aviso").innerHTML = avisoOrientativo();

document.getElementById("siluetas").innerHTML = Object.keys(NOMBRE_TIPO)
  .map((tipo) => `<div class="marcador-foto">${silueta(tipo)}<span class="marcador-foto__nota">${NOMBRE_TIPO[tipo]}</span></div>`)
  .join("");

// La tarjeta y el croquis usan un producto real del catálogo (el primero), no uno inventado.
try {
  const { productos } = await cargarDatos();
  const producto = productos[0];
  document.getElementById("tarjeta").innerHTML = tarjetaProducto(producto, chipSemaforo("verde"));
  document.getElementById("croquis").innerHTML = croquisPared({ anchoPared: 300, anchoMueble: producto.ancho_cm });
} catch (error) {
  console.error(error);
  document.getElementById("tarjeta").innerHTML = `<div class="pendiente"><p>No se han podido cargar los productos.</p></div>`;
}
