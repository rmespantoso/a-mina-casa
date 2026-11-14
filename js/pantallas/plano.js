// Pantalla «Mi plano»: la habitación vista desde arriba, a escala, con los muebles de
// Mi lista a su tamaño real. Se mueven arrastrando (dedo o ratón) o con botones, y se
// avisa si dos muebles se pisan o si alguno no cabe. Es el primer paso hacia el 3D:
// funciona con las medidas reales del catálogo, sin modelos 3D.
//
// El plano se guarda en este navegador (localStorage, con try/catch dentro de almacen.js).

import { iniciarPagina } from "../comun.js";
import { leer, guardar } from "../almacen.js";
import { cargarDatos } from "../datos.js";
import { datosDe, comoTexto, pintarErrores } from "../formularios.js";
import { cm, escapar } from "../textos.js";
import { leerMedida } from "../logica/huecos.js";
import {
  PASO_CM, cambiarHabitacion, crearPlano, girarPieza, huella, moverPieza, planoValido, ponerPieza, problemas, quitarPieza,
  sePuedePoner, sueloLibre,
} from "../logica/plano.js";
import { leerLista } from "../mi-lista.js";

iniciarPagina(null);

const formulario = document.getElementById("formulario-habitacion");
const zonaPlano = document.getElementById("zona-plano");
const caja = document.getElementById("plano");
const estado = document.getElementById("estado-plano");
const controles = document.getElementById("controles");
const MARGEN = 30; // cm de aire alrededor de la habitación en el dibujo

let plano = planoValido(leer("plano", null));
let elegida = null;
let catalogo = [];

const nuevoId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const nombreCorto = (nombre) => (nombre.length > 38 ? `${nombre.slice(0, 36)}…` : nombre);
const numeroDe = (id) => plano.piezas.findIndex((pieza) => pieza.id === id) + 1;

function guardarPlano() {
  guardar("plano", plano);
}

// ---------- Dibujo ----------

function dibujar() {
  const { ancho_cm: W, largo_cm: L } = plano.habitacion;
  const { noCaben, pisadas } = problemas(plano);
  const conProblema = new Set([...noCaben.map((pieza) => pieza.id), ...pisadas.flat().map((pieza) => pieza.id)]);
  const anchoCaja = caja.clientWidth || 358;
  const cmPorPx = (W + MARGEN * 2) / anchoCaja;
  const letra = 16 * cmPorPx; // 16 px de verdad, sea cual sea la escala

  const rejilla = [];
  for (let x = 50; x < W; x += 50) rejilla.push(`<line x1="${x}" y1="0" x2="${x}" y2="${L}"/>`);
  for (let y = 50; y < L; y += 50) rejilla.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`);

  const piezas = plano.piezas.map((pieza, indice) => {
    const { w, h } = huella(pieza);
    const clases = ["plano__pieza", pieza.id === elegida ? "plano__pieza--elegida" : "", conProblema.has(pieza.id) ? "plano__pieza--aviso" : ""].join(" ");
    const radio = Math.min(letra * 0.9, w / 2, h / 2);
    return `<g class="${clases}" data-pieza="${escapar(pieza.id)}" transform="translate(${pieza.x} ${pieza.y})">
      <rect width="${w}" height="${h}" rx="2"/>
      <circle cx="${w / 2}" cy="${h / 2}" r="${radio}"/>
      <text x="${w / 2}" y="${h / 2}" font-size="${Math.min(letra, radio * 1.3)}" dominant-baseline="central" text-anchor="middle">${indice + 1}</text>
    </g>`;
  }).join("");

  caja.innerHTML = `
    <svg class="plano__svg" viewBox="${-MARGEN} ${-MARGEN} ${W + MARGEN * 2} ${L + MARGEN * 2}" role="img"
      aria-label="Plano de una habitación de ${cm(W)} por ${cm(L)} con ${plano.piezas.length} muebles">
      <rect class="plano__suelo" x="0" y="0" width="${W}" height="${L}"/>
      <g class="plano__rejilla">${rejilla.join("")}</g>
      <rect class="plano__paredes" x="0" y="0" width="${W}" height="${L}"/>
      <text class="plano__cota" x="${W / 2}" y="${-MARGEN / 3}" font-size="${letra}" text-anchor="middle">${cm(W)}</text>
      <text class="plano__cota" x="${-MARGEN / 3}" y="${L / 2}" font-size="${letra}" text-anchor="middle" transform="rotate(-90 ${-MARGEN / 3} ${L / 2})">${cm(L)}</text>
      ${piezas}
    </svg>`;

  // Estado en palabras: qué pasa en el plano.
  const avisos = [
    ...noCaben.map((pieza) => `El mueble ${numeroDe(pieza.id)} (${nombreCorto(pieza.nombre)}) no cabe en esta habitación.`),
    ...pisadas.map(([a, b]) => `Los muebles ${numeroDe(a.id)} y ${numeroDe(b.id)} se pisan: sepáralos.`),
  ];
  estado.textContent = plano.piezas.length === 0
    ? "Todavía no hay muebles. Añade alguno de tu lista."
    : avisos.length
      ? avisos.join(" ")
      : `Todo cabe. Queda libre más o menos ${String(sueloLibre(plano)).replace(".", ",")} m² de suelo.`;
  estado.classList.toggle("mensaje--aviso", avisos.length > 0);

  pintarListaPiezas(conProblema);
  pintarControles();
}

function pintarListaPiezas(conProblema) {
  document.getElementById("piezas").innerHTML = plano.piezas.length
    ? plano.piezas.map((pieza) => {
      const { w, h } = huella(pieza);
      return `<li>
        <button class="pieza${pieza.id === elegida ? " pieza--elegida" : ""}" type="button" data-elegir="${escapar(pieza.id)}" aria-pressed="${pieza.id === elegida}">
          <span class="pieza__nombre">${escapar(nombreCorto(pieza.nombre))}${conProblema.has(pieza.id) ? " · revisar" : ""}</span>
          <span>${cm(w)} × ${cm(h)}${pieza.giro ? " (girado)" : ""}</span>
        </button>
      </li>`;
    }).join("")
    : '<li class="nota">Aquí aparecerán los muebles que pongas en el plano.</li>';
}

function pintarControles() {
  const pieza = plano.piezas.find((actual) => actual.id === elegida);
  controles.hidden = !pieza;
  if (pieza) document.getElementById("elegida").textContent = `Elegido: ${numeroDe(pieza.id)} · ${nombreCorto(pieza.nombre)}`;
}

function pintarDeMiLista() {
  const zona = document.getElementById("de-mi-lista");
  const ids = leerLista().productos;
  const productos = ids.map((id) => catalogo.find((producto) => producto.id === id)).filter(Boolean);
  if (productos.length === 0) {
    zona.innerHTML = `<p class="pendiente">Tu lista está vacía. Guarda muebles desde <a href="planifica.html">Planifica tu espacio</a> y aparecerán aquí.</p>`;
    return;
  }
  zona.innerHTML = `<ul class="piezas">${productos.map((producto) => sePuedePoner(producto)
    ? `<li><button class="pieza" type="button" data-poner="${escapar(producto.id)}">
        <span class="pieza__nombre">+ ${escapar(nombreCorto(producto.nombre))}</span>
        <span>${cm(producto.ancho_cm)} × ${cm(producto.fondo_cm)}</span></button></li>`
    : `<li class="pieza pieza--sin"><span class="pieza__nombre">${escapar(nombreCorto(producto.nombre))}</span>
        <span>Sin medidas completas: consultar en tienda</span></li>`).join("")}</ul>`;
}

// ---------- Acciones ----------

function poner(id) {
  const producto = catalogo.find((actual) => actual.id === id);
  const resultado = ponerPieza(plano, producto, nuevoId());
  if (!resultado.ok) {
    estado.textContent = resultado.motivo === "lleno"
      ? "El plano está lleno (20 muebles). Quita alguno para añadir otro."
      : "A este mueble le falta el ancho o el fondo en la web: no lo podemos dibujar.";
    return;
  }
  plano = resultado.plano;
  elegida = plano.piezas.at(-1).id;
  guardarPlano();
  dibujar();
}

function elegir(id) {
  elegida = elegida === id ? null : id;
  dibujar();
}

// Arrastrar con el dedo o el ratón: se pasa de píxeles de pantalla a centímetros del plano.
let arrastre = null;
function puntoEnCm(evento) {
  const svg = caja.querySelector("svg");
  const punto = svg.createSVGPoint();
  punto.x = evento.clientX;
  punto.y = evento.clientY;
  return punto.matrixTransform(svg.getScreenCTM().inverse());
}

caja.addEventListener("pointerdown", (evento) => {
  const grupo = evento.target.closest("[data-pieza]");
  if (!grupo) return;
  const pieza = plano.piezas.find((actual) => actual.id === grupo.dataset.pieza);
  const punto = puntoEnCm(evento);
  arrastre = { id: pieza.id, dx: punto.x - pieza.x, dy: punto.y - pieza.y, movido: false };
  elegida = pieza.id;
  caja.setPointerCapture(evento.pointerId);
  evento.preventDefault();
});

caja.addEventListener("pointermove", (evento) => {
  if (!arrastre) return;
  const punto = puntoEnCm(evento);
  plano = moverPieza(plano, arrastre.id, punto.x - arrastre.dx, punto.y - arrastre.dy);
  arrastre.movido = true;
  const pieza = plano.piezas.find((actual) => actual.id === arrastre.id);
  caja.querySelector(`[data-pieza="${CSS.escape(arrastre.id)}"]`)?.setAttribute("transform", `translate(${pieza.x} ${pieza.y})`);
});

function soltar() {
  if (!arrastre) return;
  arrastre = null;
  guardarPlano();
  dibujar();
}
caja.addEventListener("pointerup", soltar);
caja.addEventListener("pointercancel", soltar);

document.getElementById("piezas").addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-elegir]");
  if (boton) elegir(boton.dataset.elegir);
});
document.getElementById("de-mi-lista").addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-poner]");
  if (boton) poner(boton.dataset.poner);
});
controles.addEventListener("click", (evento) => {
  const flecha = evento.target.closest("[data-mover]");
  if (!flecha || !elegida) return;
  const [dx, dy] = flecha.dataset.mover.split(",").map(Number);
  const pieza = plano.piezas.find((actual) => actual.id === elegida);
  plano = moverPieza(plano, elegida, pieza.x + dx, pieza.y + dy);
  guardarPlano();
  dibujar();
});
document.getElementById("girar").addEventListener("click", () => {
  plano = girarPieza(plano, elegida);
  guardarPlano();
  dibujar();
});
document.getElementById("quitar").addEventListener("click", () => {
  plano = quitarPieza(plano, elegida);
  elegida = null;
  guardarPlano();
  dibujar();
});

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const datos = datosDe(formulario);
  const errores = {};
  const sugerencias = {};
  const medidas = {};
  for (const nombre of ["ancho", "largo"]) {
    const leida = leerMedida(datos[nombre]);
    if (leida.estado === "ok") medidas[nombre] = leida.valor;
    else if (leida.estado === "vacia") errores[nombre] = "Falta esta medida.";
    else {
      errores[nombre] = leida.mensaje;
      if (leida.estado === "metros") sugerencias[nombre] = leida.sugerencia;
    }
  }
  if (Object.keys(errores).length) {
    pintarErrores(formulario, errores, sugerencias);
    return;
  }
  pintarErrores(formulario);
  plano = plano ? cambiarHabitacion(plano, medidas.ancho, medidas.largo) : crearPlano(medidas.ancho, medidas.largo);
  guardarPlano();
  mostrarPlano();
  document.getElementById("titulo-plano").focus();
});

window.addEventListener("resize", () => {
  if (plano && !zonaPlano.hidden) dibujar();
});

function mostrarPlano() {
  zonaPlano.hidden = false;
  document.getElementById("dibujar").textContent = "Cambiar medidas";
  dibujar();
  pintarDeMiLista();
}

// ---------- Arranque ----------

try {
  catalogo = (await cargarDatos()).productos;
} catch (error) {
  console.error(error);
  estado.textContent = "No hemos podido cargar los muebles. Recarga la página.";
}

if (plano) {
  formulario.elements.ancho.value = comoTexto(plano.habitacion.ancho_cm);
  formulario.elements.largo.value = comoTexto(plano.habitacion.largo_cm);
  mostrarPlano();
}

// «Probar en mi plano» desde un resultado (plano.html?p=SOF-02): se añade al plano si ya hay habitación.
const pedido = new URLSearchParams(window.location.search).get("p");
if (pedido && /^[A-Z]{2,4}-\d{2,3}$/.test(pedido)) {
  if (plano) {
    if (!plano.piezas.some((pieza) => pieza.producto === pedido)) poner(pedido);
  } else {
    estado.textContent = "";
    const aviso = document.createElement("p");
    aviso.className = "pendiente";
    aviso.textContent = "Primero dinos cuánto mide tu habitación y después añadiremos el mueble al plano.";
    formulario.before(aviso);
    try {
      sessionStorage.setItem("amicasa:pendiente-plano", pedido);
    } catch { /* sin sessionStorage, el cliente lo añadirá desde su lista */ }
  }
}

// Si el cliente venía a probar un mueble y acaba de dibujar la habitación, se añade.
formulario.addEventListener("submit", () => {
  let pendiente = null;
  try {
    pendiente = sessionStorage.getItem("amicasa:pendiente-plano");
    sessionStorage.removeItem("amicasa:pendiente-plano");
  } catch { /* sin sessionStorage no pasa nada: el cliente lo añade desde su lista */ }
  if (pendiente && plano && !plano.piezas.some((pieza) => pieza.producto === pendiente)) poner(pendiente);
});

// Paso de 5 cm: se dice en la ayuda para que el cliente sepa cuánto se mueve cada toque.
document.querySelector(".plano__flechas").setAttribute("aria-description", `Cada toque mueve ${PASO_CM * 2} cm`);
