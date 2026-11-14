// Pantalla «Mi plano 3D» (decisión del 14/11/2026): la habitación del cliente en 3D, con los
// muebles de Mi lista a su tamaño real. Se mueven arrastrando (dedo o ratón) o con botones,
// se giran, y se avisa si dos muebles se pisan o si alguno no cabe.
//
// El cliente puede guardar varios planos con nombre (hasta 10): la habitación y la posición
// de cada mueble. Se guardan en este navegador (localStorage, con try/catch dentro de
// almacen.js) y no piden ningún dato personal. Cada cambio se guarda solo.

import { iniciarPagina } from "../comun.js";
import { leer, guardar } from "../almacen.js";
import { cargarDatos } from "../datos.js";
import { datosDe, comoTexto, pintarErrores } from "../formularios.js";
import { cm, escapar, euros, medidas as textoMedidas } from "../textos.js";
import { fotoProducto } from "../componentes.js";
import { leerMedida } from "../logica/huecos.js";
import { FAMILIAS } from "../logica/colores.js";
import {
  MAX_PLANOS, altoDibujo, cambiarHabitacion, coleccionValida, crearPlano, girarPieza, huella, moverPieza, nombreValido,
  planoActivo, ponerPieza, ponerPlano, problemas, quitarPieza, quitarPlano, sePuedePoner, sueloLibre,
} from "../logica/plano.js";
import { leerLista } from "../mi-lista.js";
import { crearEscena, hayWebGL } from "../escena3d.js";

iniciarPagina("plano");

const formulario = document.getElementById("formulario-habitacion");
const zonaPlano = document.getElementById("zona-plano");
const estado = document.getElementById("estado-plano");
const controles = document.getElementById("controles");
const avisoPlanos = document.getElementById("aviso-planos");
const NOMBRES_COLOR = Object.fromEntries(FAMILIAS.map((familia) => [familia.id, familia.nombre]));

// Colección de planos guardados. Si había un plano de antes (un solo plano), se recupera.
let coleccion = coleccionValida(leer("planos", null), leer("plano", null));
let plano = planoActivo(coleccion);
let elegida = null;
let catalogo = [];
let escena = null;

const nuevoId = (letra) => `${letra}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const nombreCorto = (nombre) => (nombre.length > 38 ? `${nombre.slice(0, 36)}…` : nombre);
const numeroDe = (id) => plano.piezas.findIndex((pieza) => pieza.id === id) + 1;
const fechaBonita = (fecha) => (fecha ? fecha.split("-").reverse().join("/") : "");

// ---------- Guardar ----------

function guardarPlano() {
  const resultado = ponerPlano(coleccion, plano);
  if (!resultado.ok) return false;
  coleccion = resultado.coleccion;
  const ok = guardar("planos", coleccion);
  const hora = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("guardado").textContent = ok
    ? `Guardado en este navegador a las ${hora}. Cada cambio se guarda solo.`
    : "Tu navegador no deja guardar: el plano se perderá al cerrar.";
  pintarPlanos();
  return true;
}

// ---------- Mis planos ----------

function pintarPlanos() {
  const zona = document.getElementById("lista-planos");
  const nuevo = coleccion.planos.length < MAX_PLANOS
    ? '<button class="boton boton--secundario" type="button" id="nuevo-plano">+ Nuevo plano</button>'
    : `<p class="nota">Tienes ${MAX_PLANOS} planos, el máximo. Borra alguno para crear otro.</p>`;
  if (coleccion.planos.length === 0) {
    zona.innerHTML = '<p class="nota">Todavía no tienes planos. Crea el primero aquí abajo.</p>';
    return;
  }
  zona.innerHTML = `
    <ul class="planos">
      ${coleccion.planos.map((guardado) => {
        const abierto = plano && guardado.id === plano.id;
        const muebles = guardado.piezas.length === 1 ? "1 mueble" : `${guardado.piezas.length} muebles`;
        return `<li class="plano-guardado${abierto ? " plano-guardado--abierto" : ""}">
          <p class="plano-guardado__nombre">${escapar(guardado.nombre)}${abierto ? " <span class=\"plano-guardado__marca\">(abierto)</span>" : ""}</p>
          <p class="plano-guardado__datos">${cm(guardado.habitacion.ancho_cm)} × ${cm(guardado.habitacion.largo_cm)} · ${muebles}${guardado.fecha ? ` · ${fechaBonita(guardado.fecha)}` : ""}</p>
          <div class="acciones acciones--pareja">
            ${abierto ? "" : `<button class="boton boton--primario" type="button" data-abrir="${escapar(guardado.id)}">Abrir<span class="solo-lector"> ${escapar(guardado.nombre)}</span></button>`}
            <button class="boton boton--secundario" type="button" data-borrar="${escapar(guardado.id)}">Borrar<span class="solo-lector"> ${escapar(guardado.nombre)}</span></button>
          </div>
        </li>`;
      }).join("")}
    </ul>
    <div class="acciones">${nuevo}</div>`;
}

document.getElementById("lista-planos").addEventListener("click", (evento) => {
  const abrir = evento.target.closest("[data-abrir]");
  const borrar = evento.target.closest("[data-borrar]");
  if (abrir) {
    coleccion = { ...coleccion, activo: abrir.dataset.abrir };
    guardar("planos", coleccion);
    plano = planoActivo(coleccion);
    elegida = null;
    mostrarPlano();
    document.getElementById("titulo-plano").focus();
  } else if (borrar) {
    const guardado = coleccion.planos.find((actual) => actual.id === borrar.dataset.borrar);
    if (!guardado || !window.confirm(`¿Borrar el plano «${guardado.nombre}»? No se puede deshacer.`)) return;
    coleccion = quitarPlano(coleccion, guardado.id);
    guardar("planos", coleccion);
    plano = planoActivo(coleccion);
    elegida = null;
    avisoPlanos.textContent = `Plano «${guardado.nombre}» borrado.`;
    avisoPlanos.hidden = false;
    if (plano) mostrarPlano();
    else empezarNuevo(false);
    pintarPlanos();
    document.getElementById("titulo-mis-planos").focus();
  } else if (evento.target.closest("#nuevo-plano")) {
    empezarNuevo(true);
  }
});

function empezarNuevo(enfocar) {
  plano = null;
  elegida = null;
  formulario.reset();
  zonaPlano.hidden = true;
  document.getElementById("crear").textContent = "Crear mi plano";
  pintarPlanos();
  if (enfocar) document.getElementById("hab-nombre").focus();
}

// ---------- Dibujo ----------

function dibujar({ soloEscena = false } = {}) {
  const { noCaben, pisadas } = problemas(plano);
  const conAviso = new Set([...noCaben.map((pieza) => pieza.id), ...pisadas.flat().map((pieza) => pieza.id)]);
  escena?.dibujar(plano, { elegida, conAviso });
  if (soloEscena) return;

  document.getElementById("nombre-plano").textContent = plano.nombre;
  document.getElementById("escena").setAttribute("aria-label",
    `Habitación en 3D de ${cm(plano.habitacion.ancho_cm)} por ${cm(plano.habitacion.largo_cm)} con ${plano.piezas.length} muebles`);

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

  pintarListaPiezas(conAviso);
  pintarElegido();
}

function pintarListaPiezas(conAviso) {
  document.getElementById("piezas").innerHTML = plano.piezas.length
    ? plano.piezas.map((pieza) => {
      const { w, h } = huella(pieza);
      return `<li>
        <button class="pieza${pieza.id === elegida ? " pieza--elegida" : ""}" type="button" data-elegir="${escapar(pieza.id)}" aria-pressed="${pieza.id === elegida}">
          <span class="pieza__nombre">${escapar(nombreCorto(pieza.nombre))}${conAviso.has(pieza.id) ? " · revisar" : ""}</span>
          <span>${cm(w)} × ${cm(h)}${pieza.giro ? " (girado)" : ""}</span>
        </button>
      </li>`;
    }).join("")
    : '<li class="nota">Aquí aparecerán los muebles que pongas en el plano.</li>';
}

// Ficha corta del mueble elegido: su foto real, medidas, precio y enlace a su ficha.
function pintarElegido() {
  const pieza = plano.piezas.find((actual) => actual.id === elegida);
  controles.hidden = !pieza;
  if (!pieza) return;
  const producto = catalogo.find((actual) => actual.id === pieza.producto);
  const { aproximado } = altoDibujo(pieza);
  const notas = [];
  if (aproximado) notas.push("La web no da su alto: en el 3D se dibuja con una altura aproximada.");
  notas.push(pieza.color
    ? `Color en el 3D: ${NOMBRES_COLOR[pieza.color] ?? pieza.color} (aproximado).`
    : "La web no dice su color: en el 3D sale en un tono neutro.");
  document.getElementById("elegido").innerHTML = `
    <div class="elegido__foto">${producto ? fotoProducto(producto) : ""}</div>
    <div>
      <p class="tarjeta__tipo">Elegido: mueble ${numeroDe(pieza.id)}</p>
      <p class="elegido__nombre">${escapar(pieza.nombre)}</p>
      <p>${producto ? textoMedidas(producto) : `${cm(pieza.ancho_cm)} × ${cm(pieza.fondo_cm)}`}</p>
      ${producto ? `<p class="tarjeta__precio">${euros(producto.precio_eur)}</p>` : ""}
      <p class="nota">${escapar(notas.join(" "))}</p>
      <a href="ficha.html?p=${encodeURIComponent(pieza.producto)}">Ver ficha del mueble</a>
    </div>`;
}

function pintarDeMiLista() {
  const zona = document.getElementById("de-mi-lista");
  const ids = leerLista()?.productos ?? []; // sin lista guardada, leerLista() da null
  const productos = ids.map((id) => catalogo.find((producto) => producto.id === id)).filter(Boolean);
  if (productos.length === 0) {
    zona.innerHTML = `<p class="pendiente">Tu lista está vacía. Guarda muebles desde <a href="index.html">Planifica tu espacio</a> y aparecerán aquí.</p>`;
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
  const resultado = ponerPieza(plano, producto, nuevoId("p"));
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

// Botones de la cámara (para quien no quiera o no pueda arrastrar).
document.querySelector(".escena__botones").addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-camara]");
  if (!boton || !escena) return;
  const accion = boton.dataset.camara;
  if (accion === "3d" || accion === "arriba") {
    if (accion === "3d") escena.vista3D();
    else escena.vistaArriba();
    for (const otro of document.querySelectorAll('[data-camara="3d"], [data-camara="arriba"]')) {
      otro.setAttribute("aria-pressed", String(otro === boton));
    }
  }
  if (accion === "izquierda") escena.girarVista(-Math.PI / 8);
  if (accion === "derecha") escena.girarVista(Math.PI / 8);
  if (accion === "acercar") escena.acercar(0.8);
  if (accion === "alejar") escena.acercar(1.25);
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
  const nombre = nombreValido(datos.nombre);
  if (plano) {
    plano = { ...cambiarHabitacion(plano, medidas.ancho, medidas.largo), nombre };
  } else {
    if (coleccion.planos.length >= MAX_PLANOS) {
      avisoPlanos.textContent = `Ya tienes ${MAX_PLANOS} planos. Borra alguno para crear otro.`;
      avisoPlanos.hidden = false;
      return;
    }
    plano = crearPlano(medidas.ancho, medidas.largo, nombre, nuevoId("h"));
  }
  guardarPlano();
  mostrarPlano();
  ponerPendiente();
  document.getElementById("titulo-plano").focus();
});

function mostrarPlano() {
  zonaPlano.hidden = false;
  formulario.elements.nombre.value = plano.nombre;
  formulario.elements.ancho.value = comoTexto(plano.habitacion.ancho_cm);
  formulario.elements.largo.value = comoTexto(plano.habitacion.largo_cm);
  document.getElementById("crear").textContent = "Guardar cambios";
  pintarPlanos();
  prepararEscena();
  dibujar();
  pintarDeMiLista();
}

// La escena se crea la primera vez que se enseña el plano (necesita que la caja se vea).
function prepararEscena() {
  if (escena) return;
  const caja = document.getElementById("escena");
  if (!hayWebGL()) {
    caja.classList.add("escena--sin");
    caja.innerHTML = '<p class="pendiente">Tu navegador no puede mostrar el 3D. Puedes seguir colocando los muebles con la lista y los botones.</p>';
    document.querySelector(".escena__botones").hidden = true;
    return;
  }
  caja.setAttribute("role", "img");
  escena = crearEscena(caja, {
    alElegir(id) {
      if (id === elegida) return;
      elegida = id;
      dibujar();
    },
    alMover(id, x, y) {
      plano = moverPieza(plano, id, x, y);
      dibujar({ soloEscena: true });
    },
    alSoltar() {
      guardarPlano();
      dibujar();
    },
  });
}

// ---------- «Probar en mi plano 3D» desde un resultado (plano.html?p=SOF-02) ----------

function ponerPendiente() {
  let pendiente = null;
  try {
    pendiente = sessionStorage.getItem("amicasa:pendiente-plano");
    sessionStorage.removeItem("amicasa:pendiente-plano");
  } catch { /* sin sessionStorage no pasa nada: el cliente lo añade desde su lista */ }
  if (pendiente && plano && !plano.piezas.some((pieza) => pieza.producto === pendiente)) poner(pendiente);
}

// ---------- Arranque ----------

try {
  catalogo = (await cargarDatos()).productos;
} catch (error) {
  console.error(error);
  estado.textContent = "No hemos podido cargar los muebles. Recarga la página.";
}

if (plano) {
  guardar("planos", coleccion); // deja ya guardado el plano recuperado de la versión anterior
  mostrarPlano();
} else {
  pintarPlanos();
}

const pedido = new URLSearchParams(window.location.search).get("p");
if (pedido && /^[A-Z]{2,4}-\d{2,3}$/.test(pedido)) {
  if (plano) {
    if (!plano.piezas.some((pieza) => pieza.producto === pedido)) poner(pedido);
  } else {
    const aviso = document.createElement("p");
    aviso.className = "pendiente";
    aviso.textContent = "Primero dinos cuánto mide tu habitación y después añadiremos el mueble al plano.";
    formulario.before(aviso);
    try {
      sessionStorage.setItem("amicasa:pendiente-plano", pedido);
    } catch { /* sin sessionStorage, el cliente lo añadirá desde su lista */ }
  }
}
