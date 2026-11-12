// Pantalla Mis huecos: crear, cambiar y borrar huecos, guardar la puerta
// y enseñar la guía para medir. La usan igual el invitado y el registrado.

import { iniciarPagina } from "../comun.js";
import { guardar, leer } from "../almacen.js";
import { estaRegistrado } from "../sesion.js";
import { dibujoGuia } from "../dibujos.js";
import { NOMBRE_ESTANCIA, cm, escapar } from "../textos.js";
import { ESTANCIAS, MAX_HUECOS, validarHueco, validarPuerta } from "../logica/huecos.js";
import { borrarHueco, borrarPuerta, guardarHueco, guardarPuerta, leerHuecos, leerPuerta } from "../mis-huecos.js";

iniciarPagina("huecos");

const listaHuecos = document.getElementById("lista-huecos");
const formularioHueco = document.getElementById("formulario-hueco");
const formularioPuerta = document.getElementById("formulario-puerta");
const puertaGuardada = document.getElementById("puerta-guardada");
const zonaAnadir = document.getElementById("zona-anadir");
const mensaje = document.getElementById("mensaje");
const invitacion = document.getElementById("invitacion");

let idEnEdicion = null;      // hueco que se está cambiando (null si es uno nuevo)
let idPorBorrar = null;      // hueco que espera el «Sí, borrar»
let puertaPorQuitar = false; // la puerta espera el «Sí, quitar»

// ---------- Piezas fijas de la página ----------

document.getElementById("donde-se-guarda").textContent = estaRegistrado()
  ? "Guardado en tu cuenta (demostración: en este prototipo se queda en este móvil)."
  : "Se guardan solo en este móvil. No te pedimos ningún dato personal.";

document.getElementById("hueco-estancia").innerHTML =
  '<option value="">Elige una…</option>' +
  ESTANCIAS.map((estancia) => `<option value="${estancia}">${NOMBRE_ESTANCIA[estancia]}</option>`).join("");

document.getElementById("dibujo-hueco").innerHTML = dibujoGuia("hueco");
document.getElementById("dibujo-rodapie").innerHTML = dibujoGuia("rodapie");
document.getElementById("dibujo-puerta").innerHTML = dibujoGuia("puerta");

// ---------- Mensajes ----------

function decir(texto, enMovil = true) {
  mensaje.textContent = enMovil
    ? texto
    : `${texto} Tu navegador no deja guardar datos: se perderá al cerrar la página.`;
  mensaje.hidden = false;
  mensaje.focus();
}

// ---------- Errores de un formulario ----------

/** Pinta los errores debajo de cada campo y lleva el cursor al primero. */
function pintarErrores(formulario, errores = {}, sugerencias = {}) {
  let primero = null;
  for (const campo of formulario.querySelectorAll("[data-campo]")) {
    const nombre = campo.dataset.campo;
    const entrada = campo.querySelector(".campo__entrada");
    const caja = campo.querySelector(".campo__error");
    const texto = errores[nombre];

    campo.classList.toggle("campo--error", Boolean(texto));
    entrada.setAttribute("aria-invalid", texto ? "true" : "false");
    caja.hidden = !texto;
    caja.textContent = texto ?? "";

    // Si parece escrito en metros, se ofrece la corrección con un botón. Nunca se cambia solo.
    if (texto && sugerencias[nombre] != null) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "boton boton--secundario";
      boton.textContent = `Sí, son ${sugerencias[nombre]} cm`;
      boton.addEventListener("click", () => {
        entrada.value = sugerencias[nombre];
        campo.classList.remove("campo--error");
        entrada.setAttribute("aria-invalid", "false");
        caja.hidden = true;
        caja.textContent = "";
        entrada.focus();
      });
      caja.append(boton);
    }
    if (texto && !primero) primero = entrada;
  }
  primero?.focus();
}

const datosDe = (formulario) => Object.fromEntries(new FormData(formulario));
const texto = (valor) => (valor == null ? "" : String(valor).replace(".", ","));

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
    formularioHueco.elements.ancho.value = texto(hueco.ancho_cm);
    formularioHueco.elements.fondo.value = texto(hueco.fondo_cm);
    formularioHueco.elements.alto.value = texto(hueco.alto_cm);
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

// ---------- Puerta ----------

function pintarPuerta() {
  const puerta = leerPuerta();
  if (!formularioPuerta.hidden) {
    puertaGuardada.innerHTML = "";
    return;
  }
  if (!puerta) {
    puertaGuardada.innerHTML = `<div class="acciones">
      <button class="boton boton--secundario" type="button" data-accion="editar">Añadir mi puerta</button>
    </div>`;
    return;
  }
  const acciones = puertaPorQuitar
    ? `<p class="hueco__pregunta" role="alert">¿Quitar la puerta guardada?</p>
       <div class="acciones acciones--pareja">
         <button class="boton boton--primario" type="button" data-accion="confirmar">Sí, quitar</button>
         <button class="boton boton--secundario" type="button" data-accion="cancelar">No</button>
       </div>`
    : `<div class="acciones acciones--pareja">
         <button class="boton boton--secundario" type="button" data-accion="editar" aria-label="Editar la puerta">Editar</button>
         <button class="boton boton--secundario" type="button" data-accion="borrar" aria-label="Quitar la puerta">Quitar</button>
       </div>`;
  puertaGuardada.innerHTML = `<div class="hueco">
    <h3 class="hueco__nombre">Puerta</h3>
    <dl class="hueco__medidas">
      <div><dt>Ancho</dt><dd>${cm(puerta.ancho_cm)}</dd></div>
      <div><dt>Alto</dt><dd>${cm(puerta.alto_cm)}</dd></div>
    </dl>
    ${acciones}
  </div>`;
}

function cerrarFormularioPuerta() {
  formularioPuerta.hidden = true;
  pintarPuerta();
}

puertaGuardada.addEventListener("click", (evento) => {
  const accion = evento.target.closest("[data-accion]")?.dataset.accion;
  if (!accion) return;

  if (accion === "editar") {
    const puerta = leerPuerta();
    puertaPorQuitar = false;
    formularioPuerta.reset();
    pintarErrores(formularioPuerta);
    formularioPuerta.elements.ancho.value = texto(puerta?.ancho_cm);
    formularioPuerta.elements.alto.value = texto(puerta?.alto_cm);
    formularioPuerta.hidden = false;
    pintarPuerta();
    formularioPuerta.elements.ancho.focus();
  } else if (accion === "borrar") {
    puertaPorQuitar = true;
    pintarPuerta();
    puertaGuardada.querySelector('[data-accion="cancelar"]').focus();
  } else if (accion === "cancelar") {
    puertaPorQuitar = false;
    pintarPuerta();
    puertaGuardada.querySelector('[data-accion="borrar"]').focus();
  } else if (accion === "confirmar") {
    borrarPuerta();
    puertaPorQuitar = false;
    pintarPuerta();
    decir("Puerta quitada.");
  }
});

formularioPuerta.querySelector("[data-cancelar]").addEventListener("click", () => {
  cerrarFormularioPuerta();
  puertaGuardada.querySelector('[data-accion="editar"]').focus();
});

formularioPuerta.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const revision = validarPuerta(datosDe(formularioPuerta));
  if (!revision.ok) {
    pintarErrores(formularioPuerta, revision.errores, revision.sugerencias);
    return;
  }
  const resultado = guardarPuerta(revision.puerta);
  cerrarFormularioPuerta();
  decir("Puerta guardada.", resultado.enMovil);
});

pintarHuecos();
pintarPuerta();
