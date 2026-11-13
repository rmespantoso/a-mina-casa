// Página de etiquetas (herramienta del equipo): dibuja una etiqueta con QR por cada
// ambiente y por cada mueble, lista para imprimir en A4.
//
// El QR lo dibuja la librería js/vendor/qrcode.js (qrcode-generator, licencia MIT),
// que se carga en etiquetas.html y deja disponible la función global `qrcode`.

import { CONFIG } from "../config.js";
import { iniciarPagina } from "../comun.js";
import { cargarAmbientes, cargarDatos } from "../datos.js";
import { NOMBRE_ESTANCIA, NOMBRE_TIPO, escapar, medidas } from "../textos.js";
import { enlaceQrAmbiente, enlaceQrProducto, esDePrueba, prepararAmbientes } from "../logica/qr.js";

iniciarPagina(null);

// Carpeta del prototipo: la publicada (config.js) o, si aún no hay, la de este ordenador.
const BASE = CONFIG.urlPublicada || new URL(".", window.location.href).href;
const UTM = CONFIG.utmEntradaQr;

/** Dibuja un QR como SVG. Nivel de corrección «M»: aguanta que la etiqueta se roce un poco. */
function dibujarQr(texto, descripcion) {
  const qr = window.qrcode(0, "M");
  qr.addData(texto);
  qr.make();
  const lado = qr.getModuleCount();
  const MARGEN = 4; // borde blanco obligatorio para que los móviles lo lean
  let trazo = "";
  for (let fila = 0; fila < lado; fila++) {
    for (let columna = 0; columna < lado; columna++) {
      if (qr.isDark(fila, columna)) trazo += `M${columna + MARGEN} ${fila + MARGEN}h1v1h-1z`;
    }
  }
  const total = lado + MARGEN * 2;
  return `<svg class="etiqueta__qr" viewBox="0 0 ${total} ${total}" role="img" aria-label="${escapar(descripcion)}" shape-rendering="crispEdges">
    <rect width="${total}" height="${total}" fill="#fff"/><path d="${trazo}" fill="#000"/></svg>`;
}

function etiqueta({ tipo, nombre, detalle, referencia, enlace }) {
  return `<article class="etiqueta">
    <div class="etiqueta__texto">
      <img class="etiqueta__logo" src="img/logo-ali-hogar.png" alt="ALI Hogar" width="40" height="40">
      <p class="etiqueta__tipo">${escapar(tipo)}</p>
      <h3 class="etiqueta__nombre">${escapar(nombre)}</h3>
      <p class="etiqueta__detalle">${escapar(detalle)}</p>
      <p class="etiqueta__llamada">Escanea y mira si te cabe en casa</p>
      <p class="etiqueta__ref">${escapar(referencia)}</p>
    </div>
    ${dibujarQr(enlace, `Código QR de ${nombre}`)}
  </article>`;
}

const estado = document.getElementById("estado");

try {
  if (typeof window.qrcode !== "function") throw new Error("No se ha cargado js/vendor/qrcode.js");

  const [{ productos }, ambientesCrudos] = await Promise.all([cargarDatos(), cargarAmbientes()]);
  const ambientes = prepararAmbientes(ambientesCrudos, productos).filter((ambiente) => ambiente.productos.length);

  // Aviso bien visible: un QR que apunta a este ordenador o a la wifi de casa no sirve en la tienda.
  if (esDePrueba(BASE)) {
    document.getElementById("aviso-prueba").innerHTML = `<div class="pendiente">
      <p><strong>Estos QR son de prueba: no los imprimas para la tienda.</strong></p>
      <p>Apuntan a este ordenador o a esta wifi (${escapar(new URL(BASE).host)}): fuera de aquí no abren. Cuando el prototipo esté publicado, pon su dirección en <code>js/config.js</code> («urlPublicada») y vuelve a abrir esta página.</p>
    </div>`;
  }

  const etiquetasAmbientes = ambientes.map((ambiente) => etiqueta({
    tipo: `Ambiente · ${NOMBRE_ESTANCIA[ambiente.estancia] ?? ""}`,
    nombre: ambiente.nombre,
    detalle: ambiente.productos.length === 1 ? "1 mueble" : `${ambiente.productos.length} muebles`,
    referencia: ambiente.esEjemplo ? `${ambiente.id} · ejemplo` : ambiente.id,
    enlace: enlaceQrAmbiente(BASE, ambiente.id, UTM),
  }));

  // Sin precio a propósito: los precios cambian y una etiqueta impresa se quedaría vieja.
  const etiquetasProductos = productos.map((producto) => etiqueta({
    tipo: NOMBRE_TIPO[producto.tipo] ?? producto.tipo,
    nombre: producto.nombre,
    detalle: medidas(producto),
    referencia: producto.id,
    enlace: enlaceQrProducto(BASE, producto.id, UTM),
  }));

  document.getElementById("etiquetas").innerHTML = `
    <h2 class="seccion no-imprimir">Ambientes (${etiquetasAmbientes.length})</h2>
    <div class="etiquetas">${etiquetasAmbientes.join("")}</div>
    <h2 class="seccion no-imprimir">Muebles (${etiquetasProductos.length})</h2>
    <div class="etiquetas">${etiquetasProductos.join("")}</div>`;

  estado.textContent = `Listas ${etiquetasAmbientes.length + etiquetasProductos.length} etiquetas.`;
  document.getElementById("imprimir").addEventListener("click", () => window.print());
} catch (error) {
  console.error(error);
  estado.textContent = "No se han podido preparar las etiquetas. Recarga la página.";
}
