// Lo que comparten todas las pantallas: cabecera (con la navegación),
// botón de WhatsApp y pie. Está en un solo sitio para no repetirlo en cada HTML.
//
// La herramienta está pensada para ir dentro de alihogar.es: por eso la cabecera
// lleva el logo de ALI Hogar y el acceso a la cuenta, como una sección más de su web.

import { CONFIG } from "./config.js";
import { hayAlmacen } from "./almacen.js";
import { activarMedicion, decisionMedicion, medir, registrarEntrada } from "./medicion.js";
import { pintarConsentimiento } from "./consentimiento.js";
import { icono } from "./dibujos.js";
import { enlaceAsesor, enlaceTienda } from "./enlaces.js";
import { estaRegistrado } from "./sesion.js";

// Navegación 100 % web (decisión del 14/11/2026): sin barra de iconos abajo, que es cosa
// de app. En el ordenador estos enlaces se ven en la cabecera, en horizontal; en el
// móvil están dentro del menú ☰, como en la web móvil de alihogar.es.
const NAVEGACION = [
  { id: "planifica", texto: "Planifica tu espacio", enlace: "index.html" },
  { id: "plano", texto: "Mi plano 3D", enlace: "plano.html" },
  { id: "huecos", texto: "Mis medidas", enlace: "huecos.html" },
  { id: "lista", texto: "Mi lista", enlace: "lista.html" },
];

// Menú de las tres rayas, arriba a la izquierda, como en la web móvil de alihogar.es.
// Dentro de alihogar.es, «Planifica tu espacio» sería una línea más de su menú.
function opcionesMenu(activa) {
  const cuenta = estaRegistrado() ? "Mi cuenta" : "Entrar o crear cuenta";
  const tienda = enlaceTienda("https://alihogar.es/");
  return `
    <li><a class="menu__enlace menu__enlace--destacado" href="index.html"${actual("planifica", activa)}>Planifica tu espacio<small>Elige una estancia y mira qué te cabe</small></a></li>
    <li><a class="menu__enlace" href="index.html#busquedas">Mis búsquedas guardadas</a></li>
    <li><a class="menu__enlace" href="plano.html"${actual("plano", activa)}>Mi plano 3D<small>Mira cómo quedan tus muebles en tu habitación</small></a></li>
    <li><a class="menu__enlace" href="huecos.html"${actual("huecos", activa)}>Mis medidas<small>Tus huecos, para el semáforo de la tienda</small></a></li>
    <li><a class="menu__enlace" href="lista.html"${actual("lista", activa)}>Mi lista</a></li>
    <li><a class="menu__enlace" href="index.html#escanear">Escanea en la tienda</a></li>
    <li><a class="menu__enlace" href="acceso.html">${cuenta}</a></li>
    <li><a class="menu__enlace" href="${tienda}" target="_blank" rel="noopener">Ir a alihogar.es<span class="solo-lector"> (se abre en otra pestaña)</span></a></li>`;
}

function prepararMenu() {
  const boton = document.getElementById("abrir-menu");
  const menu = document.getElementById("menu");
  const fondo = document.getElementById("menu-fondo");
  const abrir = () => {
    menu.hidden = false;
    fondo.hidden = false;
    boton.setAttribute("aria-expanded", "true");
    menu.querySelector(".menu__cerrar").focus();
  };
  const cerrar = () => {
    if (menu.hidden) return;
    menu.hidden = true;
    fondo.hidden = true;
    boton.setAttribute("aria-expanded", "false");
    boton.focus();
  };
  boton.addEventListener("click", () => (menu.hidden ? abrir() : cerrar()));
  menu.querySelector(".menu__cerrar").addEventListener("click", cerrar);
  fondo.addEventListener("click", cerrar);
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") cerrar();
  });
  // Un enlace a otra parte de la misma página (#busquedas) también cierra el menú.
  menu.addEventListener("click", (evento) => {
    if (evento.target.closest("a")) {
      menu.hidden = true;
      fondo.hidden = true;
      boton.setAttribute("aria-expanded", "false");
    }
  });
}

const actual = (id, activa) => (id === activa ? ' aria-current="page"' : "");

function pintarCabecera(activa) {
  const cuenta = estaRegistrado() ? "Mi cuenta" : "Entrar";
  document.getElementById("cabecera").innerHTML = `
    <div class="cabecera__dentro">
      <button class="menu-boton" id="abrir-menu" type="button" aria-expanded="false" aria-controls="menu">
        ${icono("menu")}<span class="solo-lector">Abrir el menú</span>
      </button>
      <a class="marca" href="index.html">
        <img class="marca__logo" src="img/logo-ali-hogar.png" alt="ALI Hogar" width="48" height="48">
        <span class="marca__nombre" lang="gl">A miña casa</span>
      </a>
      <nav class="cabecera__nav" aria-label="Secciones">
        <ul>${NAVEGACION.map((enlace) => `<li><a href="${enlace.enlace}"${actual(enlace.id, activa)}>${enlace.texto}</a></li>`).join("")}</ul>
      </nav>
      <a class="cuenta" href="acceso.html">${icono("usuario")}<span>${cuenta}</span></a>
    </div>
    <div class="menu-fondo" id="menu-fondo" hidden></div>
    <nav class="menu" id="menu" aria-label="Menú" hidden>
      <div class="menu__cabeza">
        <p class="menu__titulo">Menú</p>
        <button class="menu__cerrar boton-icono" type="button">${icono("cerrar")}<span class="solo-lector">Cerrar el menú</span></button>
      </div>
      <ul class="menu__lista">${opcionesMenu(activa)}</ul>
    </nav>`;
  prepararMenu();
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
      <div id="pie-medicion"></div>
    </div>`;
}

/**
 * Arranca una pantalla. `activa` es la sección de la cabecera que se marca
 * ("planifica", "plano", "huecos", "lista") o null si no es ninguno.
 */
export function iniciarPagina(activa = null) {
  pintarCabecera(activa);
  pintarWhatsapp();
  pintarPie();
  // GA4 solo arranca si el cliente ya dijo que sí en una visita anterior.
  if (decisionMedicion() === "si") activarMedicion();
  pintarConsentimiento();
  registrarEntrada(); // apunta si se ha entrado por un QR de la tienda
}
