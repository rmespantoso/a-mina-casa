// Lo que comparten todas las pantallas: cabecera, navegación inferior,
// botón de WhatsApp y pie. Está en un solo sitio para no repetirlo en cada HTML.
//
// La herramienta está pensada para ir dentro de alihogar.es: por eso la cabecera
// lleva el logo de ALI Hogar y el acceso a la cuenta, como una sección más de su web.

import { CONFIG } from "./config.js";
import { hayAlmacen } from "./almacen.js";
import { medir, registrarEntrada } from "./medicion.js";
import { icono } from "./dibujos.js";
import { enlaceAsesor } from "./enlaces.js";
import { estaRegistrado } from "./sesion.js";

// Los cuatro botones de la barra de abajo.
const NAVEGACION = [
  { id: "inicio", texto: "Inicio", icono: "casa", enlace: "index.html" },
  { id: "huecos", texto: "Mis huecos", icono: "regla", enlace: "huecos.html" },
  { id: "que-me-cabe", texto: "¿Me cabe?", icono: "lupa", enlace: "que-me-cabe.html" },
  { id: "lista", texto: "Mi lista", icono: "corazon", enlace: "lista.html" },
];

function pintarCabecera() {
  const cuenta = estaRegistrado() ? "Mi cuenta" : "Entrar";
  document.getElementById("cabecera").innerHTML = `
    <div class="cabecera__dentro">
      <a class="marca" href="index.html">
        <img class="marca__logo" src="img/logo-ali-hogar.png" alt="ALI Hogar" width="48" height="48">
        <span class="marca__nombre" lang="gl">A miña casa</span>
      </a>
      <a class="cuenta" href="acceso.html">${icono("usuario")}<span>${cuenta}</span></a>
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

// Botón redondo para escribir al asesor de ALI. Solo aquí aparece el teléfono
// del cliente: si él decide escribir.
function pintarWhatsapp() {
  const boton = document.createElement("a");
  boton.className = "whatsapp";
  boton.href = enlaceAsesor();
  boton.target = "_blank";
  boton.rel = "noopener";
  boton.setAttribute("aria-label", `Escribir al asesor de ALI Hogar por WhatsApp (${CONFIG.telefonoAsesor})`);
  boton.innerHTML = icono("whatsapp");
  boton.addEventListener("click", () => medir("whatsapp_advisor", { desde: "boton_flotante" }));
  document.body.append(boton);
}

function pintarPie() {
  // Si el navegador no deja guardar, se avisa con claridad en vez de fallar en silencio.
  const avisoAlmacen = hayAlmacen()
    ? ""
    : "<p><strong>Tu navegador no deja guardar datos.</strong> Puedes seguir, pero tus medidas y tu lista no se recordarán al cerrar.</p>";

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
  pintarCabecera();
  pintarNavegacion(activa);
  pintarWhatsapp();
  pintarPie();
  registrarEntrada(); // apunta si se ha entrado por un QR de la tienda
}
