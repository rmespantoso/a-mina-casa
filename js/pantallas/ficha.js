// Pantalla Ficha viva: lo que se abre al escanear el QR de un mueble (ficha.html?p=SOF-01).
// Enseña el mueble y tres acciones: guardar en la lista, ver la ficha de producto en
// alihogar.es y preguntar al asesor. (El semáforo de los huecos se quitó el 14/11/2026;
// el rediseño de esta ficha está pendiente.)

import { iniciarPagina } from "../comun.js";
import { buscarProducto } from "../datos.js";
import { medir } from "../medicion.js";
import { enlaceAsesor, enlaceTienda } from "../enlaces.js";
import { fotoProducto } from "../componentes.js";
import { icono } from "../dibujos.js";
import { CONSULTAR, NOMBRE_TIPO, cm, escapar, euros } from "../textos.js";
import { estaGuardado, guardarProducto, quitarProducto } from "../mi-lista.js";

iniciarPagina(null);

const contenido = document.getElementById("contenido");
const id = new URLSearchParams(window.location.search).get("p");

// ---------- Cuando no hay mueble que enseñar ----------

function pintarNoEncontrado() {
  document.title = "Mueble no encontrado · A miña casa (prototipo)";
  contenido.innerHTML = `
    <h1>No encontramos ese mueble</h1>
    <p class="entrada">Puede que el código QR sea antiguo o que el enlace esté incompleto.</p>
    <div class="acciones">
      <a class="boton boton--primario" href="index.html">Ir al inicio</a>
      <a class="boton boton--secundario" id="asesor" target="_blank" rel="noopener"
        href="${escapar(enlaceAsesor("Hola, he escaneado un QR en la tienda y no me abre el mueble. ¿Me ayudáis?"))}">
        ${icono("whatsapp")}Preguntar al asesor</a>
    </div>`;
  document.getElementById("asesor").addEventListener("click", () => medir("whatsapp_advisor", { desde: "ficha_no_encontrada" }));
}

// ---------- Piezas de la ficha ----------

function medidasProducto(producto) {
  // Si el aviso del producto ya lo cuenta, no se repite.
  const abierta = producto.ancho_abierto_cm == null || producto.aviso_cliente
    ? ""
    : `<p class="nota">Es extensible: abierta mide ${cm(producto.ancho_abierto_cm)} de ancho.</p>`;
  return `<dl class="hueco__medidas">
      <div><dt>Ancho</dt><dd>${cm(producto.ancho_cm)}</dd></div>
      <div><dt>Fondo</dt><dd>${cm(producto.fondo_cm)}</dd></div>
      <div><dt>Alto</dt><dd>${cm(producto.alto_cm)}</dd></div>
    </dl>${abierta}`;
}

// ---------- La ficha ----------

function pintarFicha(producto) {
  document.title = `${producto.nombre} · A miña casa (prototipo)`;

  const tienda = enlaceTienda(producto.url_alihogar);
  const asesor = enlaceAsesor(`Hola, tengo una duda sobre este mueble: ${producto.nombre} (ref. ${producto.id}).`);

  const variantes = producto.variantes.length
    ? `<p class="nota"><strong>También disponible en:</strong> ${escapar(producto.variantes.join(", "))}.</p>`
    : "";
  const aviso = producto.aviso_cliente
    ? `<div class="aviso">${icono("info")}<p>${escapar(producto.aviso_cliente)}</p></div>`
    : "";
  // Si el producto no tuviera enlace a alihogar.es, no se inventa: se dice.
  const botonTienda = tienda
    ? `<a class="boton boton--secundario" id="ver-tienda" href="${escapar(tienda)}" target="_blank" rel="noopener">Ver ficha de producto<span class="solo-lector"> en alihogar.es (se abre en otra pestaña)</span></a>`
    : `<p class="nota">Ficha de producto: ${CONSULTAR.toLowerCase()}.</p>`;

  contenido.innerHTML = `
    ${fotoProducto(producto)}
    <p class="ficha__tipo">${escapar(NOMBRE_TIPO[producto.tipo] ?? producto.tipo)}</p>
    <h1 class="ficha__nombre">${escapar(producto.nombre)}</h1>
    <p class="ficha__precio">${euros(producto.precio_eur)}</p>
    ${medidasProducto(producto)}
    ${variantes}
    ${aviso}

    <h2 class="seccion">¿Qué quieres hacer?</h2>
    <p class="mensaje" id="mensaje" role="status" hidden></p>
    <div class="acciones">
      <button class="boton boton--primario" type="button" id="guardar"></button>
      ${botonTienda}
      <a class="boton boton--secundario" id="asesor" href="${escapar(asesor)}" target="_blank" rel="noopener">${icono("whatsapp")}Preguntar al asesor</a>
    </div>`;

  // --- Guardar en la lista (y quitar, con el mismo botón) ---
  const botonGuardar = document.getElementById("guardar");
  const mensaje = document.getElementById("mensaje");

  function pintarBoton() {
    const guardado = estaGuardado(producto.id);
    botonGuardar.innerHTML = guardado ? "Quitar de mi lista" : `${icono("corazon")}Guardar en mi lista`;
    botonGuardar.className = `boton ${guardado ? "boton--secundario" : "boton--primario"}`;
    botonGuardar.setAttribute("aria-pressed", guardado ? "true" : "false");
  }

  function decir(html) {
    mensaje.innerHTML = html;
    mensaje.hidden = false;
  }

  botonGuardar.addEventListener("click", () => {
    if (estaGuardado(producto.id)) {
      quitarProducto(producto.id);
      decir("Quitado de tu lista.");
    } else {
      const resultado = guardarProducto(producto.id);
      if (!resultado.ok) {
        decir("Tu lista está llena. Quita algún mueble para guardar este.");
      } else {
        const aviso = resultado.enMovil ? "" : " Tu navegador no deja guardar datos: se perderá al cerrar la página.";
        decir(`Guardado en tu lista.${aviso} <a href="lista.html">Ver mi lista</a>`);
      }
    }
    pintarBoton();
  });
  pintarBoton();

  // --- Salidas ---
  document.getElementById("ver-tienda")?.addEventListener("click", () => medir("go_to_shop", { producto: producto.id, desde: "ficha" }));
  document.getElementById("asesor").addEventListener("click", () => medir("whatsapp_advisor", { producto: producto.id, desde: "ficha" }));

}

// ---------- Arranque ----------

try {
  const producto = id ? await buscarProducto(id) : null;
  if (producto) pintarFicha(producto);
  else pintarNoEncontrado();
} catch (error) {
  console.error(error);
  contenido.innerHTML = `
    <h1>No hemos podido cargar el mueble</h1>
    <p class="entrada">Comprueba tu conexión y vuelve a intentarlo.</p>
    <div class="acciones"><a class="boton boton--primario" href="">Volver a intentarlo</a></div>`;
}
