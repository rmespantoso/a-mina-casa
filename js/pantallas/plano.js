// Pantalla «Mi plano 3D» (rediseño del 14/11/2026).
//
// Lo primero que se ve es la habitación en 3D. Al pulsar «Probar en mi plano 3D» en un
// mueble (plano.html?p=SOF-02, o varios: ?p=SOF-02.MCE-05), el mueble cae directamente en
// el PLANO DE PRUEBA, una habitación estándar de 500 × 500 cm. Debajo:
//   - dos recuadros con el ancho y el largo de la habitación, que se cambian al momento;
//   - el mueble elegido (foto, medidas, precio, girar y quitar);
//   - «Guardar como nuevo plano» con un nombre (medidas y muebles incluidos);
//   - Mis planos (abrir y borrar) y «Añadir de mi lista».
// Todo se mueve con el dedo o el ratón: no hay botones de cámara.
//
// Se guarda en este navegador (localStorage, con try/catch dentro de almacen.js) y no se
// pide ningún dato personal. Los planos guardados guardan solos cada cambio.

import { iniciarPagina } from "../comun.js";
import { leer, guardar } from "../almacen.js";
import { cargarDatos } from "../datos.js";
import { medir } from "../medicion.js";
import { comoTexto, pintarErrores } from "../formularios.js";
import { cm, escapar, euros, medidas as textoMedidas } from "../textos.js";
import { fotoProducto } from "../componentes.js";
import { icono } from "../dibujos.js";
import { leerMedida } from "../logica/medidas.js";
import { FAMILIAS } from "../logica/colores.js";
import {
  MAX_PIEZAS, MAX_PLANOS, PRUEBA, abrirPlano, abrirPrueba, actualizarPlano, altoDibujo, cambiarHabitacion, coleccionValida,
  girarPieza, guardarComoNuevo, huella, moverPieza, planoActivo, planoDePruebaVacio, ponerPieza, problemas, quitarPieza,
  quitarPlano, sePuedePoner, sueloLibre,
} from "../logica/plano.js";
import { leerLista } from "../mi-lista.js";
import { crearEscena, hayWebGL } from "../escena3d.js";

iniciarPagina("plano");

const formularioHabitacion = document.getElementById("formulario-habitacion");
const formularioGuardar = document.getElementById("formulario-guardar");
const estado = document.getElementById("estado-plano");
const controles = document.getElementById("controles");
const avisoPlanos = document.getElementById("aviso-planos");
const avisoGuardar = document.getElementById("aviso-guardar");
const NOMBRES_COLOR = Object.fromEntries(FAMILIAS.map((familia) => [familia.id, familia.nombre]));
const FORMA_ID = /^[A-Z]{2,4}-\d{2,3}$/;

// Colección: plano de prueba + planos guardados. Si había un plano de la versión anterior, se recupera.
let coleccion = coleccionValida(leer("planos", null), leer("plano", null));
if (!planoActivo(coleccion)) coleccion = abrirPrueba(coleccion);
let plano = planoActivo(coleccion);
let elegida = null;
let catalogo = [];
let escena = null;

const nuevoId = (letra) => `${letra}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const nombreCorto = (nombre) => (nombre.length > 38 ? `${nombre.slice(0, 36)}…` : nombre);
const numeroDe = (id) => plano.piezas.findIndex((pieza) => pieza.id === id) + 1;
const fechaBonita = (fecha) => (fecha ? fecha.split("-").reverse().join("/") : "");
const esPrueba = () => plano.id === PRUEBA;

// ---------- Guardar ----------

// Guarda el plano abierto donde le toca (en el de prueba o en su plano guardado).
function guardarCambios() {
  coleccion = actualizarPlano(coleccion, plano);
  const ok = guardar("planos", coleccion);
  pintarEstadoGuardado(ok);
  pintarPlanos();
}

function pintarEstadoGuardado(ok = true) {
  const zona = document.getElementById("estado-guardado");
  if (!ok) {
    zona.textContent = "Tu navegador no deja guardar: el plano se perderá al cerrar.";
  } else if (esPrueba()) {
    zona.textContent = "Plano de prueba: se recuerda en este navegador. Guárdalo con un nombre para tenerlo en «Mis planos».";
  } else {
    zona.textContent = `Plano guardado en este navegador. Cada cambio se guarda solo.`;
  }
}

// ---------- Mis planos ----------

function pintarPlanos() {
  const zona = document.getElementById("lista-planos");
  const vacio = esPrueba() && plano.piezas.length === 0 ? "" : `
    <div class="acciones"><button class="boton boton--secundario" type="button" id="plano-vacio">Empezar un plano vacío (500 × 500 cm)</button></div>`;
  if (coleccion.planos.length === 0) {
    zona.innerHTML = `<p class="nota">Todavía no has guardado ningún plano. Usa «Guardar como nuevo plano» para tenerlo aquí.</p>${vacio}`;
    return;
  }
  zona.innerHTML = `
    <ul class="planos">
      ${coleccion.planos.map((guardado) => {
        const abierto = guardado.id === plano.id;
        const muebles = guardado.piezas.length === 1 ? "1 mueble" : `${guardado.piezas.length} muebles`;
        return `<li class="plano-guardado${abierto ? " plano-guardado--abierto" : ""}">
          <p class="plano-guardado__nombre">${escapar(guardado.nombre)}${abierto ? ' <span class="plano-guardado__marca">(abierto)</span>' : ""}</p>
          <p class="plano-guardado__datos">${cm(guardado.habitacion.ancho_cm)} × ${cm(guardado.habitacion.largo_cm)} · ${muebles}${guardado.fecha ? ` · ${fechaBonita(guardado.fecha)}` : ""}</p>
          <div class="acciones acciones--pareja">
            ${abierto ? "" : `<button class="boton boton--primario" type="button" data-abrir="${escapar(guardado.id)}">Abrir<span class="solo-lector"> ${escapar(guardado.nombre)}</span></button>`}
            <button class="boton boton--secundario" type="button" data-borrar="${escapar(guardado.id)}">Borrar<span class="solo-lector"> ${escapar(guardado.nombre)}</span></button>
          </div>
        </li>`;
      }).join("")}
    </ul>
    ${esPrueba() ? "" : '<div class="acciones"><button class="boton boton--secundario" type="button" id="ir-prueba">Volver al plano de prueba</button></div>'}
    ${vacio}`;
}

function abrir(nuevaColeccion, { enfocar = true } = {}) {
  coleccion = nuevaColeccion;
  guardar("planos", coleccion);
  plano = planoActivo(coleccion);
  elegida = null;
  pintarTodo();
  if (enfocar) document.getElementById("titulo-plano").focus();
}

document.getElementById("lista-planos").addEventListener("click", (evento) => {
  const botonAbrir = evento.target.closest("[data-abrir]");
  const botonBorrar = evento.target.closest("[data-borrar]");
  avisoPlanos.hidden = true;
  if (botonAbrir) {
    abrir(abrirPlano(coleccion, botonAbrir.dataset.abrir));
  } else if (botonBorrar) {
    const guardado = coleccion.planos.find((actual) => actual.id === botonBorrar.dataset.borrar);
    if (!guardado || !window.confirm(`¿Borrar el plano «${guardado.nombre}»? No se puede deshacer.`)) return;
    abrir(quitarPlano(coleccion, guardado.id), { enfocar: false });
    avisoPlanos.textContent = `Plano «${guardado.nombre}» borrado.`;
    avisoPlanos.hidden = false;
    document.getElementById("titulo-mis-planos").focus();
  } else if (evento.target.closest("#ir-prueba")) {
    abrir(abrirPrueba(coleccion));
  } else if (evento.target.closest("#plano-vacio")) {
    if (esPrueba() && plano.piezas.length && !window.confirm("¿Vaciar el plano de prueba? Los muebles que no hayas guardado se quitarán del plano.")) return;
    abrir({ ...coleccion, activo: PRUEBA, prueba: planoDePruebaVacio() });
  }
});

// ---------- Medidas de la habitación (se aplican al momento) ----------

function pintarMedidas() {
  formularioHabitacion.elements.ancho.value = comoTexto(plano.habitacion.ancho_cm);
  formularioHabitacion.elements.largo.value = comoTexto(plano.habitacion.largo_cm);
  pintarErrores(formularioHabitacion);
}

let esperaMedidas = null;
formularioHabitacion.addEventListener("input", () => {
  clearTimeout(esperaMedidas);
  esperaMedidas = setTimeout(aplicarMedidas, 450); // espera a que termine de escribir
});
formularioHabitacion.addEventListener("change", aplicarMedidas);
formularioHabitacion.addEventListener("submit", (evento) => {
  evento.preventDefault();
  aplicarMedidas();
});

function aplicarMedidas() {
  clearTimeout(esperaMedidas);
  const errores = {};
  const sugerencias = {};
  const medidas = {};
  for (const nombre of ["ancho", "largo"]) {
    const leida = leerMedida(formularioHabitacion.elements[nombre].value);
    if (leida.estado === "ok") medidas[nombre] = leida.valor;
    else if (leida.estado === "vacia") errores[nombre] = "Escribe esta medida en centímetros.";
    else {
      errores[nombre] = leida.mensaje;
      if (leida.estado === "metros") sugerencias[nombre] = leida.sugerencia;
    }
  }
  // Los errores se enseñan sin mover el cursor (pintarErrores lo llevaría al campo).
  const activo = document.activeElement;
  pintarErrores(formularioHabitacion, errores, sugerencias);
  activo?.focus?.();
  if (Object.keys(errores).length) return;
  if (medidas.ancho === plano.habitacion.ancho_cm && medidas.largo === plano.habitacion.largo_cm) return;
  plano = cambiarHabitacion(plano, medidas.ancho, medidas.largo);
  guardarCambios();
  dibujar();
}

// ---------- Guardar como nuevo plano ----------

formularioGuardar.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const nombre = formularioGuardar.elements.nombre.value;
  const resultado = guardarComoNuevo(coleccion, plano, nombre, nuevoId("h"));
  if (!resultado.ok) {
    avisoGuardar.textContent = `Ya tienes ${MAX_PLANOS} planos guardados. Borra alguno en «Mis planos» para guardar otro.`;
    avisoGuardar.hidden = false;
    return;
  }
  coleccion = resultado.coleccion;
  plano = resultado.plano;
  const ok = guardar("planos", coleccion);
  medir("plan_save", { muebles: plano.piezas.length, planos: coleccion.planos.length });
  formularioGuardar.reset();
  pintarTodo();
  avisoGuardar.innerHTML = ok
    ? `Guardado como «${escapar(plano.nombre)}». Lo tienes en <a href="#mis-planos">Mis planos</a>. Lo que cambies ahora se guarda solo.`
    : "Tu navegador no deja guardar: el plano se perderá al cerrar.";
  avisoGuardar.hidden = false;
});

// ---------- Dibujo ----------

function dibujar({ soloEscena = false } = {}) {
  const { noCaben, pisadas } = problemas(plano);
  const conAviso = new Set([...noCaben.map((pieza) => pieza.id), ...pisadas.flat().map((pieza) => pieza.id)]);
  escena?.dibujar(plano, { elegida, conAviso });
  if (soloEscena) return;

  document.getElementById("escena").setAttribute("aria-label",
    `Habitación en 3D de ${cm(plano.habitacion.ancho_cm)} por ${cm(plano.habitacion.largo_cm)} con ${plano.piezas.length} muebles`);

  const avisos = [
    ...noCaben.map((pieza) => `El mueble ${numeroDe(pieza.id)} (${nombreCorto(pieza.nombre)}) no cabe en esta habitación.`),
    ...pisadas.map(([a, b]) => `Los muebles ${numeroDe(a.id)} y ${numeroDe(b.id)} se pisan: sepáralos.`),
  ];
  estado.textContent = plano.piezas.length === 0
    ? "Todavía no hay muebles. Añade alguno de tu lista (abajo) o pulsa «Probar en mi plano 3D» en un mueble."
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

// Ficha corta del mueble elegido: foto real, medidas, precio, girar y quitar.
function pintarElegido() {
  const pieza = plano.piezas.find((actual) => actual.id === elegida);
  controles.hidden = !pieza;
  if (!pieza) return;
  const producto = catalogo.find((actual) => actual.id === pieza.producto);
  const { aproximado } = altoDibujo(pieza);
  const notas = [];
  if (aproximado) notas.push("La web no da su alto: en el 3D sale con una altura aproximada.");
  if (!pieza.color) notas.push("La web no dice su color: en el 3D sale en un tono neutro.");
  document.getElementById("elegido").innerHTML = `
    <div class="elegido__foto">${producto ? fotoProducto(producto) : ""}</div>
    <div class="elegido__datos">
      <p class="tarjeta__tipo">Mueble ${numeroDe(pieza.id)}${pieza.color ? ` · ${escapar(NOMBRES_COLOR[pieza.color] ?? "")}` : ""}</p>
      <p class="elegido__nombre">${escapar(pieza.nombre)}</p>
      <p>${producto ? textoMedidas(producto) : `${cm(pieza.ancho_cm)} × ${cm(pieza.fondo_cm)}`}${producto ? ` · <strong>${euros(producto.precio_eur)}</strong>` : ""}</p>
      ${notas.length ? `<p class="nota">${escapar(notas.join(" "))}</p>` : ""}
      <div class="elegido__botones">
        <button class="boton-mini" type="button" id="girar">↻ Girar</button>
        <button class="boton-mini" type="button" id="quitar">${icono("papelera")}Quitar</button>
        <a class="boton-mini" href="ficha.html?p=${encodeURIComponent(pieza.producto)}">Ver ficha</a>
      </div>
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

function pintarTodo() {
  document.getElementById("titulo-plano").textContent = plano.nombre;
  document.getElementById("guardar-nuevo").textContent = esPrueba() ? "Guardar" : "Guardar copia";
  pintarEstadoGuardado();
  pintarMedidas();
  pintarPlanos();
  dibujar();
}

// ---------- Acciones sobre los muebles ----------

/** Pone un mueble en el plano abierto. Devuelve true si se ha podido. */
function poner(id, { avisar = true } = {}) {
  const producto = catalogo.find((actual) => actual.id === id);
  const resultado = ponerPieza(plano, producto, nuevoId("p"));
  if (!resultado.ok) {
    if (avisar) {
      estado.textContent = resultado.motivo === "lleno"
        ? `El plano está lleno (${MAX_PIEZAS} muebles). Quita alguno para añadir otro.`
        : "A este mueble le falta el ancho o el fondo en la web: no lo podemos dibujar.";
    }
    return false;
  }
  plano = resultado.plano;
  elegida = plano.piezas.at(-1).id;
  return true;
}

document.getElementById("piezas").addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-elegir]");
  if (!boton) return;
  elegida = elegida === boton.dataset.elegir ? null : boton.dataset.elegir;
  dibujar();
});
document.getElementById("de-mi-lista").addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-poner]");
  if (!boton || !poner(boton.dataset.poner)) return;
  medir("plan_try", { producto: boton.dataset.poner, desde: "mi_lista" });
  guardarCambios();
  dibujar();
  document.getElementById("escena").scrollIntoView({ behavior: "smooth", block: "center" });
});
controles.addEventListener("click", (evento) => {
  if (!elegida) return;
  if (evento.target.closest("#girar")) plano = girarPieza(plano, elegida);
  else if (evento.target.closest("#quitar")) {
    plano = quitarPieza(plano, elegida);
    elegida = null;
  } else return;
  guardarCambios();
  dibujar();
});

// ---------- La escena 3D ----------

function prepararEscena() {
  const caja = document.getElementById("escena");
  const ayuda = document.getElementById("ayuda-escena");
  if (!hayWebGL()) {
    caja.classList.add("escena--sin");
    caja.innerHTML = '<p class="pendiente">Tu navegador no puede mostrar el 3D. Puedes seguir colocando los muebles con la lista.</p>';
    return;
  }
  caja.setAttribute("role", "img");
  escena = crearEscena(caja, {
    alTocar() {
      ayuda.hidden = true;
    },
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
      guardarCambios();
      dibujar();
    },
  });
}

// ---------- Arranque ----------

try {
  catalogo = (await cargarDatos()).productos;
} catch (error) {
  console.error(error);
  estado.textContent = "No hemos podido cargar los muebles. Recarga la página.";
}

// «Probar en mi plano 3D» (plano.html?p=SOF-02 o ?p=SOF-02.MCE-05): al plano de prueba, directo.
const pedidos = (new URLSearchParams(window.location.search).get("p") ?? "").split(".").filter((id) => FORMA_ID.test(id));
if (pedidos.length) {
  coleccion = abrirPrueba(coleccion);
  plano = planoActivo(coleccion);
  let puestos = 0;
  for (const id of pedidos) {
    if (plano.piezas.some((pieza) => pieza.producto === id)) continue; // ya estaba: no se duplica
    if (poner(id)) {
      puestos += 1;
      medir("plan_try", { producto: id, desde: "boton" });
    }
  }
  if (!puestos) elegida = plano.piezas.find((pieza) => pieza.producto === pedidos[0])?.id ?? null;
  coleccion = actualizarPlano(coleccion, plano);
  guardar("planos", coleccion);
  // Se quita ?p de la dirección: al recargar no se vuelve a añadir.
  window.history.replaceState(null, "", window.location.pathname);
}

prepararEscena();
pintarTodo();
pintarDeMiLista();
