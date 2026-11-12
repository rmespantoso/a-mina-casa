// Pantalla Mis huecos: crear, cambiar y borrar huecos y enseñar la guía para medir. La usan igual el invitado y el registrado.

import { iniciarPagina } from "../comun.js";
import { guardar, leer } from "../almacen.js";
import { destinoSeguro, estaRegistrado } from "../sesion.js";
import { dibujoGuia } from "../dibujos.js";
import { comoTexto, datosDe, pintarErrores } from "../formularios.js";
import { NOMBRE_ESTANCIA, cm, escapar } from "../textos.js";
import { ESTANCIAS, MAX_HUECOS, validarHueco } from "../logica/huecos.js";
import { borrarHueco, guardarHueco, leerHuecos } from "../mis-huecos.js";

iniciarPagina("huecos");

const listaHuecos = document.getElementById("lista-huecos");
const formularioHueco = document.getElementById("formulario-hueco");
const zonaAnadir = document.getElementById("zona-anadir");
const mensaje = document.getElementById("mensaje");
const invitacion = document.getElementById("invitacion");

let idEnEdicion = null;      // hueco que se está cambiando (null si es uno nuevo)
let idPorBorrar = null;      // hueco que espera el «Sí, borrar»

// ---------- Piezas fijas de la página ----------

// Si se llegó desde la ficha de un mueble (?volver=ficha&p=SOF-01), se ofrece volver a él.
const parametros = new URLSearchParams(window.location.search);
const vuelta = destinoSeguro(parametros.get("volver"), parametros.get("p"));
if (vuelta.startsWith("ficha.html?p=")) {
  document.getElementById("volver-ficha").href = vuelta;
  document.getElementById("zona-volver").hidden = false;
}

document.getElementById("donde-se-guarda").textContent = estaRegistrado()
  ? "Guardado en tu cuenta (demostración: en este prototipo se queda en este móvil)."
  : "Se guardan solo en este móvil. No te pedimos ningún dato personal.";

document.getElementById("hueco-estancia").innerHTML =
  '<option value="">Elige una…</option>' +
  ESTANCIAS.map((estancia) => `<option value="${estancia}">${NOMBRE_ESTANCIA[estancia]}</option>`).join("");

document.getElementById("dibujo-hueco").innerHTML = dibujoGuia("hueco");
document.getElementById("dibujo-rodapie").innerHTML = dibujoGuia("rodapie");

// ---------- Mensajes ----------

function decir(texto, enMovil = true) {
  mensaje.textContent = enMovil
    ? texto
    : `${texto} Tu navegador no deja guardar datos: se perderá al cerrar la página.`;
  mensaje.hidden = false;
  mensaje.focus();
}

// ---------- Huecos ----------

function tarjetaHueco(hueco) {
  const acciones = idPorBorrar === hueco.id
    ? `<p class="hueco__pregunta" role="alert">¿Borrar «${escapar(hueco.nombre)}»? No se puede deshacer.</p>
       <div class="acciones acciones--pareja">
         <button class="boton boton--primario" type="button" data-accion="confirmar">Sí, borrar</button>
         <button class="boton boton--secundario" type="button" data-accion="cancelar">No</button>
       </div>`
    : `<div class="acciones acciones--pareja">
         <button class="boton boton--secundario" type="button" data-accion="editar"
           aria-label="Editar ${escapar(hueco.nombre)}">Editar</button>
         <button class="boton boton--secundario" type="button" data-accion="borrar"
           aria-label="Borrar ${escapar(hueco.nombre)}">Borrar</button>
       </div>`;

  return `<li class="hueco" data-id="${escapar(hueco.id)}">
    <p class="hueco__estancia">${escapar(NOMBRE_ESTANCIA[hueco.estancia])}</p>
    <h3 class="hueco__nombre">${escapar(hueco.nombre)}</h3>
    <dl class="hueco__medidas">
      <div><dt>Ancho</dt><dd>${cm(hueco.ancho_cm)}</dd></div>
      <div><dt>Fondo</dt><dd>${hueco.fondo_cm == null ? "Sin indicar" : cm(hueco.fondo_cm)}</dd></div>
      <div><dt>Alto</dt><dd>${hueco.alto_cm == null ? "Sin indicar" : cm(hueco.alto_cm)}</dd></div>
    </dl>
    ${acciones}
  </li>`;
}

function pintarHuecos() {
  const huecos = leerHuecos();
  const lleno = huecos.length >= MAX_HUECOS;

  document.getElementById("contador").textContent = huecos.length ? `${huecos.length} de ${MAX_HUECOS}` : "";
  listaHuecos.innerHTML = huecos.length
    ? `<ul class="huecos">${huecos.map(tarjetaHueco).join("")}</ul>`
    : '<p class="pendiente">Todavía no has guardado ningún hueco. Empieza por la pared donde quieres poner el mueble.</p>';

  // El botón de añadir se esconde mientras el formulario está abierto o si ya hay 8.
  zonaAnadir.hidden = !formularioHueco.hidden || lleno;
  document.getElementById("aviso-lleno").hidden = !lleno;
}

function abrirFormularioHueco(hueco = null) {
  idEnEdicion = hueco ? hueco.id : null;
  idPorBorrar = null;
  formularioHueco.reset();
  pintarErrores(formularioHueco);
  document.getElementById("titulo-formulario-hueco").textContent = hueco ? `Cambiar «${hueco.nombre}»` : "Hueco nuevo";
  if (hueco) {
    formularioHueco.elements.nombre.value = hueco.nombre;
    formularioHueco.elements.estancia.value = hueco.estancia;
    formularioHueco.elements.ancho.value = comoTexto(hueco.ancho_cm);
    formularioHueco.elements.fondo.value = comoTexto(hueco.fondo_cm);
    formularioHueco.elements.alto.value = comoTexto(hueco.alto_cm);
  }
  formularioHueco.hidden = false;
  pintarHuecos();
  formularioHueco.elements.nombre.focus();
}

function cerrarFormularioHueco() {
  formularioHueco.hidden = true;
  idEnEdicion = null;
  pintarHuecos();
}

document.getElementById("anadir-hueco").addEventListener("click", () => abrirFormularioHueco());

formularioHueco.querySelector("[data-cancelar]").addEventListener("click", () => {
  cerrarFormularioHueco();
  document.getElementById("anadir-hueco").focus();
});

formularioHueco.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const revision = validarHueco(datosDe(formularioHueco));
  if (!revision.ok) {
    pintarErrores(formularioHueco, revision.errores, revision.sugerencias);
    return;
  }

  const eraNuevo = idEnEdicion === null;
  const resultado = guardarHueco(revision.hueco, idEnEdicion);
  if (!resultado.ok) {
    cerrarFormularioHueco();
    decir(resultado.motivo === "lleno"
      ? `Ya tienes ${MAX_HUECOS} huecos. Borra uno para añadir otro.`
      : "Ese hueco ya no existe. Vuelve a crearlo.");
    return;
  }

  cerrarFormularioHueco();
  decir(`Guardado: «${revision.hueco.nombre}».`, resultado.enMovil);

  // Al invitado se le propone registrarse una sola vez, al guardar su primer hueco.
  if (eraNuevo && !estaRegistrado() && leerHuecos().length === 1 && !leer("invitacion-huecos", false)) {
    guardar("invitacion-huecos", true);
    invitacion.hidden = false;
  }
});

listaHuecos.addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-accion]");
  if (!boton) return;
  const id = boton.closest("[data-id]").dataset.id;
  const hueco = leerHuecos().find((actual) => actual.id === id);
  if (!hueco) return;

  if (boton.dataset.accion === "editar") {
    abrirFormularioHueco(hueco);
  } else if (boton.dataset.accion === "borrar") {
    idPorBorrar = id;
    pintarHuecos();
    listaHuecos.querySelector('[data-accion="cancelar"]').focus(); // lo seguro, primero
  } else if (boton.dataset.accion === "cancelar") {
    idPorBorrar = null;
    pintarHuecos();
    listaHuecos.querySelector(`[data-id="${CSS.escape(id)}"] [data-accion="borrar"]`).focus();
  } else if (boton.dataset.accion === "confirmar") {
    borrarHueco(id);
    idPorBorrar = null;
    if (idEnEdicion === id) cerrarFormularioHueco();
    pintarHuecos();
    decir(`Borrado: «${hueco.nombre}».`);
  }
});

document.getElementById("invitacion-no").addEventListener("click", () => {
  invitacion.hidden = true;
});

pintarHuecos();
