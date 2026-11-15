// Pantalla Ficha viva: lo que se abre al escanear el QR de un mueble (ficha.html?p=SOF-01).
// Rediseño del 15/11/2026: el mueble con cuatro acciones compactas (Ficha, Carrito o Elegir,
// Guardar y Plano 3D) y debajo tres filas de recomendados: Parecidos, Combina con y De la
// misma colección. Para preguntar al asesor está el botón redondo de WhatsApp.

import { iniciarPagina } from "../comun.js";
import { cargarComplementos, cargarDatos } from "../datos.js";
import { medir } from "../medicion.js";
import { enlaceAsesor } from "../enlaces.js";
import { icono } from "../dibujos.js";
import { escapar } from "../textos.js";
import { montarFichaCompacta } from "../ficha-compacta.js";

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

// ---------- La ficha ----------
// La pinta js/ficha-compacta.js, la misma que sale en Mi plano 3D al escanear un QR.

function pintarFicha(producto, productos, config) {
  document.title = `${producto.nombre} · A miña casa (prototipo)`;
  montarFichaCompacta(contenido, producto, { productos, config, desde: "ficha_qr" });
}

// ---------- Arranque ----------

try {
  const [{ productos }, config] = await Promise.all([cargarDatos(), cargarComplementos()]);
  const producto = id ? productos.find((actual) => actual.id === id) : null;
  if (producto) pintarFicha(producto, productos, config);
  else pintarNoEncontrado();
} catch (error) {
  console.error(error);
  contenido.innerHTML = `
    <h1>No hemos podido cargar el mueble</h1>
    <p class="entrada">Comprueba tu conexión y vuelve a intentarlo.</p>
    <div class="acciones"><a class="boton boton--primario" href="">Volver a intentarlo</a></div>`;
}
