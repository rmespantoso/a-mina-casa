// Pantalla Ambiente: lo que se abre al escanear el QR de un conjunto montado en la tienda
// (ambiente.html?a=AMB-01). Enseña todos sus muebles y deja guardar el conjunto entero
// o solo algunos. (El semáforo de los huecos se quitó el 14/11/2026.)

import { CONFIG } from "../config.js";
import { iniciarPagina } from "../comun.js";
import { cargarAmbientes, cargarDatos } from "../datos.js";
import { medir } from "../medicion.js";
import { enlaceAsesor } from "../enlaces.js";
import { fotoProducto } from "../componentes.js";
import { icono } from "../dibujos.js";
import { NOMBRE_ESTANCIA, NOMBRE_TIPO, escapar, euros, medidas } from "../textos.js";
import { totalLista } from "../logica/lista.js";
import { prepararAmbientes } from "../logica/qr.js";
import { estaGuardado, guardarProducto, guardarVarios, quitarProducto } from "../mi-lista.js";

iniciarPagina(null);

const contenido = document.getElementById("contenido");
const idAmbiente = new URLSearchParams(window.location.search).get("a");

function pintarNoEncontrado() {
  document.title = "Ambiente no encontrado · A miña casa (prototipo)";
  contenido.innerHTML = `
    <h1>No encontramos ese ambiente</h1>
    <p class="entrada">Puede que el código QR sea antiguo o que el enlace esté incompleto.</p>
    <div class="acciones">
      <a class="boton boton--primario" href="index.html">Ir al inicio</a>
      <a class="boton boton--secundario" id="asesor" target="_blank" rel="noopener"
        href="${escapar(enlaceAsesor("Hola, he escaneado el QR de un ambiente en la tienda y no me abre. ¿Me ayudáis?"))}">
        ${icono("whatsapp")}Preguntar al asesor</a>
    </div>`;
  document.getElementById("asesor").addEventListener("click", () => medir("whatsapp_advisor", { desde: "ambiente_no_encontrado" }));
}

const textoGuardar = (id) => (estaGuardado(id) ? "Quitar de mi lista" : `${icono("corazon")}Guardar en mi lista`);

function articulo(producto) {
  const nombre = escapar(producto.nombre);
  return `<li class="articulo" data-producto="${escapar(producto.id)}">
    <div class="articulo__cabeza">
      <a class="articulo__foto" href="ficha.html?p=${encodeURIComponent(producto.id)}" aria-label="Ver la ficha de ${nombre}">${fotoProducto(producto)}</a>
      <div>
        <p class="tarjeta__tipo">${escapar(NOMBRE_TIPO[producto.tipo] ?? producto.tipo)}</p>
        <h3 class="tarjeta__nombre">${nombre}</h3>
        <p class="tarjeta__medidas">${medidas(producto)}</p>
        <p class="tarjeta__precio">${euros(producto.precio_eur)}</p>
      </div>
    </div>
    <div class="acciones acciones--pareja">
      <button class="boton boton--secundario" type="button" data-guardar aria-pressed="${estaGuardado(producto.id)}">${textoGuardar(producto.id)}</button>
      <a class="boton boton--secundario" href="ficha.html?p=${encodeURIComponent(producto.id)}">Ver ficha<span class="solo-lector"> de ${nombre}</span></a>
    </div>
  </li>`;
}

function pintarAmbiente(ambiente) {
  document.title = `${ambiente.nombre} · A miña casa (prototipo)`;
  const { productos } = ambiente;
  const { total, sinPrecio } = totalLista(productos);
  const asesor = enlaceAsesor(`Hola, tengo una duda sobre este conjunto de la tienda: ${ambiente.nombre} (ref. ${ambiente.id}).`);

  const ejemplo = ambiente.esEjemplo
    ? `<div class="aviso">${icono("info")}<p><strong>Conjunto de ejemplo.</strong> Lo ha preparado el equipo del prototipo con muebles reales: puede no estar montado así en la tienda.</p></div>`
    : "";
  const perdidos = ambiente.perdidos
    ? `<p class="mensaje">${ambiente.perdidos === 1 ? "Un mueble de este conjunto ya no está" : `${ambiente.perdidos} muebles de este conjunto ya no están`} en la herramienta.</p>`
    : "";

  contenido.innerHTML = `
    <p class="ficha__tipo">Ambiente · ${escapar(NOMBRE_ESTANCIA[ambiente.estancia] ?? "")}</p>
    <h1 class="ficha__nombre">${escapar(ambiente.nombre)}</h1>
    <p class="entrada">${productos.length === 1 ? "Un mueble" : `${productos.length} muebles`} que has visto juntos en la tienda. Guarda los que quieras en tu lista.</p>
    ${ejemplo}
    ${perdidos}

    <h2 class="seccion">Los muebles del conjunto</h2>
    <ul class="articulos">${productos.map((producto) => articulo(producto)).join("")}</ul>

    <div class="total">
      <p class="total__linea"><span>Total orientativo del conjunto</span><strong>${euros(total)}</strong></p>
      <p class="nota">Precios consultados el ${CONFIG.fechaDatos}. Pueden haber cambiado.${sinPrecio ? ` No incluye ${sinPrecio} con precio a consultar en tienda.` : ""}</p>
    </div>

    <p class="mensaje" id="mensaje" role="status" hidden></p>
    <div class="acciones">
      <button class="boton boton--primario" type="button" id="guardar-todo">${icono("corazon")}Guardar todo en mi lista</button>
      <a class="boton boton--secundario" id="asesor" href="${escapar(asesor)}" target="_blank" rel="noopener">${icono("whatsapp")}Preguntar al asesor</a>
    </div>`;

  const mensaje = document.getElementById("mensaje");
  const decir = (html) => {
    mensaje.innerHTML = html;
    mensaje.hidden = false;
  };

  function repintarBotones() {
    for (const fila of contenido.querySelectorAll("[data-producto]")) {
      const boton = fila.querySelector("[data-guardar]");
      boton.innerHTML = textoGuardar(fila.dataset.producto);
      boton.setAttribute("aria-pressed", estaGuardado(fila.dataset.producto) ? "true" : "false");
    }
  }

  // Guardar o quitar un mueble suelto.
  contenido.querySelector(".articulos").addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-guardar]");
    if (!boton) return;
    const id = boton.closest("[data-producto]").dataset.producto;
    if (estaGuardado(id)) {
      quitarProducto(id);
      decir("Quitado de tu lista.");
    } else {
      const resultado = guardarProducto(id);
      decir(resultado.ok
        ? 'Guardado en tu lista. <a href="lista.html">Ver mi lista</a>'
        : "Tu lista está llena. Quita algún mueble para guardar este.");
    }
    repintarBotones();
  });

  // Guardar el conjunto entero: no duplica lo que ya estaba y avisa si no cabe todo.
  document.getElementById("guardar-todo").addEventListener("click", () => {
    const { anadidos, repetidos, sinSitio } = guardarVarios(productos.map((producto) => producto.id));
    const partes = [];
    if (anadidos) partes.push(anadidos === 1 ? "Guardado 1 mueble." : `Guardados ${anadidos} muebles.`);
    if (repetidos) partes.push(repetidos === 1 ? "1 ya estaba en tu lista." : `${repetidos} ya estaban en tu lista.`);
    if (sinSitio) partes.push(`${sinSitio === 1 ? "1 no ha cabido" : `${sinSitio} no han cabido`}: tu lista está llena.`);
    decir(`${partes.join(" ")} <a href="lista.html">Ver mi lista</a>`);
    repintarBotones();
  });

  document.getElementById("asesor").addEventListener("click", () => medir("whatsapp_advisor", { ambiente: ambiente.id, desde: "ambiente" }));

}

try {
  const [{ productos }, ambientes] = await Promise.all([cargarDatos(), cargarAmbientes()]);
  const ambiente = prepararAmbientes(ambientes, productos).find((actual) => actual.id === idAmbiente);
  if (ambiente && ambiente.productos.length) pintarAmbiente(ambiente);
  else pintarNoEncontrado();
} catch (error) {
  console.error(error);
  contenido.innerHTML = `
    <h1>No hemos podido cargar el ambiente</h1>
    <p class="entrada">Comprueba tu conexión y vuelve a intentarlo.</p>
    <div class="acciones"><a class="boton boton--primario" href="">Volver a intentarlo</a></div>`;
}
