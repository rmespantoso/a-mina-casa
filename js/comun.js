// Lo que comparten todas las pantallas: cabecera, navegación inferior y pie.
// Está en un solo sitio para no repetirlo en cada archivo HTML.

import { CONFIG } from "./config.js";
import { hayAlmacen, leer } from "./almacen.js";
import { registrarEntrada } from "./medicion.js";
import { icono } from "./dibujos.js";

// Los cuatro botones de la barra de abajo.
const NAVEGACION = [
  { id: "inicio", texto: "Inicio", icono: "casa", enlace: "index.html" },
  { id: "huecos", texto: "Mis huecos", icono: "regla", enlace: "huecos.html" },
  { id: "que-me-cabe", texto: "¿Me cabe?", icono: "lupa", enlace: "que-me-cabe.html" },
  { id: "lista", texto: "Mi lista", icono: "corazon", enlace: "lista.html" },
];

function pintarCabecera() {
  document.getElementById("cabecera").innerHTML = `
    <div class="cabecera__dentro">
      <a class="marca" href="index.html">
        <span class="marca__nombre" lang="gl">A miña casa</span>
        <span class="marca__sub">ALI Hogar · prototipo</span>
      </a>
    </div>`;
}

function pintarNavegacion(activa) {
  const enlaces = NAVEGACION.map(
    (boton) => `<li>
      <a class="navegacion__enlace" href="${boton.enlace}"${boton.id === activa ? ' aria-current="page"' : ""}>
        ${icono(boton.icono)}<span>${boton.texto}</span>
      </a>
    </li>`
  ).join("");
  document.getElementById("navegacion").innerHTML = `<ul class="navegacion__lista">${enlaces}</ul>`;
}

function pintarPie() {
  // Si el navegador no deja guardar, se avisa con claridad en vez de fallar en silencio.
  const avisoAlmacen = hayAlmacen()
    ? ""
    : "<p><strong>Tu navegador no deja guardar datos.</strong> Puedes seguir usando la web, pero tus medidas y tu lista no se recordarán al cerrarla.</p>";

  document.getElementById("pie").innerHTML = `
    <div class="pie__dentro">
      ${avisoAlmacen}
      <p>Los resultados son orientativos: mide siempre antes de comprar.</p>
      <p>Precios y medidas de alihogar.es consultados el ${CONFIG.fechaDatos}. Pueden haber cambiado.</p>
      <p>Prototipo de estudiantes · no es una web oficial de ALI Hogar.</p>
      <a href="encuesta.html">Cuéntanos qué te ha parecido</a>
    </div>`;
}

/**
 * Arranca una pantalla. `activa` es el botón de la barra que se marca
 * ("inicio", "huecos", "que-me-cabe", "lista") o null si no es ninguno.
 */
export function iniciarPagina(activa = null) {
  // Tema visual elegido en estilo.html. Es provisional: cuando el equipo elija, se quita.
  const tema = leer("tema", "ria");
  if (tema !== "ria") document.documentElement.dataset.tema = tema;

  pintarCabecera();
  pintarNavegacion(activa);
  pintarPie();
  registrarEntrada(); // apunta si se ha entrado por un QR de la tienda
}
