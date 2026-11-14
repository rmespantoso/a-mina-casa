// Pantalla de una estancia de «Planifica tu espacio» (espacio.html?e=dormitorio).
//
// Filtro de recomendación en 4 pasos, todos opcionales (decisión del 14/11/2026):
//   1. ¿Qué buscas? → desplegable con los tipos de mueble de la estancia.
//   2. Medidas → ancho, fondo y alto MÁXIMOS que quiere para el mueble (no es un hueco).
//   3. Precio máximo → barra de 0 a 2.000 € (al final, sin límite).
//   4. Color → desplegable con casillas: varios o ninguno.
// Al pulsar «Ver qué me cabe» salen los muebles. El filtro completo se puede guardar.
//
// Está abierta a todos: no hace falta cuenta para buscar.

import { iniciarPagina } from "../comun.js";
import { cargarDatos, cargarEstancias } from "../datos.js";
import { medir } from "../medicion.js";
import { enlaceAsesor, enlaceTienda } from "../enlaces.js";
import { tarjetaProducto } from "../componentes.js";
import { icono } from "../dibujos.js";
import { datosDe, pintarErrores } from "../formularios.js";
import { escapar, euros } from "../textos.js";
import { accionCompra } from "../logica/recomendador.js";
import { FAMILIAS, limpiarColores } from "../logica/colores.js";
import {
  POR_PAGINA, PRECIO_TOPE, buscarEnEstancia, enlaceBusqueda, estanciaPorId, leerPrecio, nombreBusqueda, paraGuardar, textoMedidas, validarPlan,
} from "../logica/planificador.js";
import { guardarBusqueda } from "../mis-busquedas.js";
import { estaGuardado, guardarProducto, quitarProducto } from "../mi-lista.js";
import { estaRegistrado } from "../sesion.js";

iniciarPagina("planifica");

const parametros = new URLSearchParams(window.location.search);
const formulario = document.getElementById("formulario-plan");
const zonaResultados = document.getElementById("resultados");
const barraPrecio = document.getElementById("plan-precio");
const NOMBRES_COLOR = Object.fromEntries(FAMILIAS.map((familia) => [familia.id, familia.nombre]));

let productos, estancia;
let ultimaBusqueda = null; // la última búsqueda hecha, para «Guardar esta búsqueda»
let encontrados = []; // todos los muebles de la última búsqueda (se enseñan de POR_PAGINA en POR_PAGINA)
let mostrados = 0;

// ---------- Formulario ----------

const textoPrecio = (valor) => {
  const precio = leerPrecio(valor);
  return precio == null ? "Sin límite" : `Hasta ${precio} €`;
};

function pintarPrecio() {
  const texto = textoPrecio(barraPrecio.value);
  document.getElementById("precio-valor").textContent = texto;
  barraPrecio.setAttribute("aria-valuetext", texto);
  // El tramo elegido de la barra se pinta en magenta (ver .barra en componentes.css).
  barraPrecio.style.setProperty("--relleno", `${(Number(barraPrecio.value) / PRECIO_TOPE) * 100}%`);
}

function coloresElegidos() {
  return [...formulario.querySelectorAll('input[name="colores"]:checked')].map((casilla) => casilla.value);
}

function pintarResumenColores() {
  const elegidos = coloresElegidos();
  document.getElementById("resumen-colores").textContent = elegidos.length
    ? elegidos.map((id) => NOMBRES_COLOR[id]).join(", ")
    : "Todos los colores";
}

function prepararEstancia() {
  document.title = `${estancia.titulo} · A miña casa (prototipo)`;
  document.getElementById("titulo").textContent = estancia.titulo;
  document.getElementById("portada").innerHTML =
    `<img src="${escapar(estancia.foto)}" alt="Ambiente de ${escapar(estancia.nombre.toLowerCase())} con muebles de ALI Hogar" width="1000" height="1000">`;

  // 1. Tipos de mueble de la estancia. La primera opción no filtra.
  formulario.elements.grupo.innerHTML = '<option value="">Todos los muebles</option>' +
    estancia.grupos.map((grupo) => `<option value="${escapar(grupo.id)}">${escapar(grupo.nombre)}</option>`).join("");

  // 3. Barra del precio.
  barraPrecio.addEventListener("input", pintarPrecio);

  // 4. Colores: casillas con muestra y nombre (el color nunca va solo, siempre con su nombre).
  document.getElementById("colores").innerHTML = FAMILIAS.map((familia) => `
    <label class="casilla-color"><input type="checkbox" name="colores" value="${familia.id}">
      <span class="casilla-color__muestra" style="background:${familia.muestra}" aria-hidden="true"></span>${escapar(familia.nombre)}</label>`).join("") +
    '<button class="boton-enlace" type="button" id="quitar-colores">Quitar colores</button>';
  document.getElementById("colores").addEventListener("change", pintarResumenColores);
  document.getElementById("quitar-colores").addEventListener("click", () => {
    for (const casilla of formulario.querySelectorAll('input[name="colores"]')) casilla.checked = false;
    pintarResumenColores();
  });

  formulario.hidden = false;
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    document.getElementById("desplegable-colores").open = false;
    buscar();
  });
  zonaResultados.addEventListener("click", alPulsarResultado);

  // Si la dirección ya trae una búsqueda (guardada o vuelta de una ficha), se rellena y se repite sola.
  formulario.elements.grupo.value = estancia.grupos.some((grupo) => grupo.id === parametros.get("g")) ? parametros.get("g") : "";
  formulario.elements.ancho.value = parametros.get("a") ?? "";
  formulario.elements.fondo.value = parametros.get("f") ?? "";
  formulario.elements.alto.value = parametros.get("h") ?? "";
  barraPrecio.value = leerPrecio(parametros.get("p")) ?? PRECIO_TOPE;
  const elegidos = limpiarColores((parametros.get("c") ?? "").split("."));
  for (const casilla of formulario.querySelectorAll('input[name="colores"]')) casilla.checked = elegidos.includes(casilla.value);
  pintarPrecio();
  pintarResumenColores();
  if (parametros.has("b") || parametros.has("g")) buscar({ enfocar: false });
}

function leerFormulario() {
  const datos = datosDe(formulario);
  datos.colores = coloresElegidos();
  return datos;
}

function buscar({ enfocar = true } = {}) {
  const revision = validarPlan(leerFormulario(), estancia);
  if (!revision.ok) {
    pintarErrores(formulario, revision.errores, revision.sugerencias);
    zonaResultados.innerHTML = "";
    return;
  }
  pintarErrores(formulario);
  ultimaBusqueda = revision.busqueda;
  // La búsqueda se deja en la dirección (sin ningún dato personal): así, al volver de una
  // ficha, los resultados siguen ahí. GA4 nunca recibe estos datos (ver direccionLimpia).
  window.history.replaceState(null, "", enlaceBusqueda(paraGuardar(revision.busqueda)));
  pintarResultados(revision.busqueda, enfocar);
}

// ---------- Resultados ----------

const textoGuardar = (id) => (estaGuardado(id) ? "Quitar de mi lista" : `${icono("corazon")}Guardar en mi lista`);

function tarjetaResultado(producto) {
  const dondeVerlo = producto.seccion_nave
    ? `En la tienda está en: ${escapar(producto.seccion_nave)}.`
    : "Para verlo y tocarlo en la tienda, pregunta a un empleado: te dirá dónde está.";
  const extra = `
    <div class="resultado__encaje">
      <p class="nota">${dondeVerlo}</p>
      <p class="mensaje resultado__aviso" role="status" hidden></p>
    </div>`;

  // «Ver ficha de producto» lleva directo a alihogar.es (con UTM). El carrito es una DEMOSTRACIÓN.
  const tienda = enlaceTienda(producto.url_alihogar);
  const otraPestana = '<span class="solo-lector"> en alihogar.es (se abre en otra pestaña)</span>';
  const enlace = (texto, clase) =>
    `<a class="boton ${clase}" data-tienda href="${escapar(tienda)}" target="_blank" rel="noopener">${texto}${otraPestana}</a>`;
  const accion = accionCompra(producto);
  let principales = `<a class="boton boton--primario" href="ficha.html?p=${encodeURIComponent(producto.id)}">Ver ficha</a>`;
  if (accion === "carrito") {
    principales = `<button class="boton boton--primario" type="button" data-carrito>Añadir al carrito</button>
      ${tienda ? enlace("Ver ficha de producto", "boton--secundario") : ""}`;
  } else if (accion === "elegir") {
    principales = enlace("Elegir opción y comprar", "boton--primario");
  }
  const plano = producto.ancho_cm && producto.fondo_cm
    ? `<a class="boton boton--secundario" href="plano.html?p=${encodeURIComponent(producto.id)}">Probar en mi plano 3D</a>`
    : "";
  const botones = `<div class="acciones">
      ${principales}
      <button class="boton boton--secundario" type="button" data-guardar aria-pressed="${estaGuardado(producto.id)}">${textoGuardar(producto.id)}</button>
      ${plano}
    </div>`;
  return `<li data-producto="${escapar(producto.id)}">${tarjetaProducto(producto, extra, botones)}</li>`;
}

// Resumen del filtro en una frase: «Canapés · hasta 160 cm de ancho · hasta 500 € · Blanco».
function resumenFiltro(busqueda) {
  const nombre = nombreBusqueda(paraGuardar(busqueda), estancia, NOMBRES_COLOR);
  return nombre.split(" · ").slice(1).join(" · ");
}

function pintarMas() {
  const lista = document.getElementById("lista-resultados");
  const nuevos = encontrados.slice(mostrados, mostrados + POR_PAGINA);
  lista.insertAdjacentHTML("beforeend", nuevos.map(tarjetaResultado).join(""));
  mostrados += nuevos.length;
  const quedan = encontrados.length - mostrados;
  const boton = document.getElementById("ver-mas");
  boton.hidden = quedan <= 0;
  boton.textContent = `Ver ${Math.min(quedan, POR_PAGINA)} más (quedan ${quedan})`;
  document.getElementById("cuantos-ves").textContent = `Ves ${mostrados} de ${encontrados.length}.`;
}

function pintarResultados(busqueda, enfocar) {
  const salida = buscarEnEstancia(productos, busqueda);
  const { resultados, total, delTipo, porMedida, porPrecio, porColor } = salida;
  const grupo = estancia.grupos.find((actual) => actual.id === busqueda.grupo);
  const queBusca = (grupo?.nombre ?? "muebles").toLowerCase();

  medir("recommend_view", {
    estancia: busqueda.estancia,
    tipo: busqueda.grupo ?? "todos",
    ancho_max: busqueda.medidas.ancho_cm,
    precio_max: busqueda.precioMax,
    colores: busqueda.colores.length,
    resultados: total,
  });

  // Por qué hay menos: se dice claro cuántos se quedan fuera en cada filtro.
  const fuera = [];
  if (porMedida) fuera.push(`${porMedida} no ${porMedida === 1 ? "cumple" : "cumplen"} tus medidas (o la web no da esa medida)`);
  if (porPrecio) fuera.push(`${porPrecio} ${porPrecio === 1 ? "cuesta" : "cuestan"} más de ${busqueda.precioMax} €`);
  if (porColor) fuera.push(`${porColor} no ${porColor === 1 ? "es" : "son"} del color elegido (o la web no dice su color)`);
  const textoFuera = fuera.length ? `<p class="nota">Se quedan fuera: ${escapar(fuera.join("; "))}.</p>` : "";

  const guardar = `
    <div class="acciones">
      <button class="boton boton--secundario" type="button" id="guardar-busqueda">Guardar esta búsqueda</button>
    </div>
    <p class="mensaje" id="aviso-busqueda" role="status" hidden></p>`;

  if (resultados.length === 0) {
    const medidas = textoMedidas(paraGuardar(busqueda));
    const texto = `Hola, busco ${queBusca} para ${estancia.nombre.toLowerCase()}${medidas ? ` de hasta ${medidas}` : ""} y no encuentro nada. ¿Me ayudáis?`;
    const motivo = delTipo === 0
      ? "Esta herramienta todavía no tiene muebles de este tipo."
      : "Ningún mueble cumple todo lo que has elegido. Prueba a quitar algún filtro o a subir el precio.";
    zonaResultados.innerHTML = `
      <h2 class="seccion" id="titulo-resultados" tabindex="-1">No hemos encontrado ninguno</h2>
      <div class="pendiente"><p>${motivo}</p><p>El asesor de ALI Hogar puede buscarte otras opciones.</p></div>
      ${textoFuera}
      <div class="acciones">
        <a class="boton boton--primario" id="asesor-sin-resultados" href="${escapar(enlaceAsesor(texto))}" target="_blank" rel="noopener">
          ${icono("whatsapp")}Preguntar al asesor</a>
      </div>
      ${guardar}`;
    document.getElementById("asesor-sin-resultados")
      .addEventListener("click", () => medir("whatsapp_advisor", { desde: "planifica_sin_resultados", tipo: busqueda.grupo ?? "todos" }));
  } else {
    const hayMedidas = Object.values(busqueda.medidas).some((valor) => valor != null);
    const titulo = total === 1 ? "1 mueble para ti" : `${total} muebles para ti`;
    zonaResultados.innerHTML = `
      <h2 class="seccion" id="titulo-resultados" tabindex="-1">${titulo}</h2>
      <p>${escapar(resumenFiltro(busqueda))}.
        ${hayMedidas ? "Primero, los que más se acercan a tus medidas." : "Ordenados de menor a mayor precio."}</p>
      ${textoFuera}
      ${guardar}
      <ul class="resultados-lista" id="lista-resultados"></ul>
      <p class="nota" id="cuantos-ves" aria-live="polite"></p>
      <div class="acciones"><button class="boton boton--secundario" type="button" id="ver-mas">Ver más</button></div>
      <div class="aviso">${icono("info")}<p><strong>Orientativo.</strong> Las medidas son las de alihogar.es: mide siempre antes de comprar.</p></div>`;
    encontrados = resultados;
    mostrados = 0;
    pintarMas();
  }
  if (enfocar) document.getElementById("titulo-resultados").focus();
}

function alPulsarResultado(evento) {
  if (evento.target.closest("#ver-mas")) {
    const primero = mostrados;
    pintarMas();
    // El foco pasa al primer mueble nuevo, para no perderse.
    document.querySelectorAll("#lista-resultados > li")[primero]?.querySelector("a, button")?.focus();
    return;
  }

  // Guardar el filtro completo para repetirlo otro día.
  if (evento.target.closest("#guardar-busqueda")) {
    const aviso = document.getElementById("aviso-busqueda");
    const resultado = guardarBusqueda(paraGuardar(ultimaBusqueda));
    const nombre = nombreBusqueda(paraGuardar(ultimaBusqueda), estancia, NOMBRES_COLOR);
    const donde = estaRegistrado() ? "en tu cuenta (demostración: se queda en este navegador)" : "en este navegador";
    aviso.innerHTML = resultado.repetida
      ? `Ya la tenías guardada: «${escapar(nombre)}». <a href="index.html#busquedas">Ver mis búsquedas</a>`
      : `Búsqueda guardada ${donde}: «${escapar(nombre)}». <a href="index.html#busquedas">Ver mis búsquedas</a>`;
    aviso.hidden = false;
    return;
  }

  const tarjeta = evento.target.closest("[data-producto]");
  if (!tarjeta) return;
  const id = tarjeta.dataset.producto;
  const puesto = [...zonaResultados.querySelectorAll(".resultados-lista > li")].indexOf(tarjeta) + 1;

  if (evento.target.closest("a.boton")) {
    medir("recommend_click", { producto: id, puesto });
    if (evento.target.closest("[data-tienda]")) medir("go_to_shop", { producto: id, desde: "planifica" });
    return;
  }

  const aviso = tarjeta.querySelector(".resultado__aviso");
  if (evento.target.closest("[data-carrito]")) {
    medir("add_to_cart", { producto: id, puesto, desde: "planifica", demo: true });
    aviso.innerHTML = "<strong>Esto es una demostración.</strong> Cuando la herramienta esté dentro de alihogar.es, " +
      "este mueble se añadirá a tu carrito. Hoy no se ha añadido nada: para comprarlo, pulsa «Ver ficha de producto».";
    aviso.hidden = false;
    return;
  }

  const boton = evento.target.closest("[data-guardar]");
  if (!boton) return;
  if (estaGuardado(id)) {
    quitarProducto(id);
    aviso.textContent = "Quitado de tu lista.";
  } else {
    const resultado = guardarProducto(id);
    aviso.innerHTML = resultado.ok
      ? 'Guardado en tu lista. <a href="lista.html">Ver mi lista</a>'
      : "Tu lista está llena. Quita algún mueble para guardar este.";
  }
  aviso.hidden = false;
  boton.innerHTML = textoGuardar(id);
  boton.setAttribute("aria-pressed", estaGuardado(id) ? "true" : "false");
}

// ---------- Arranque ----------
// Va al final del archivo: así todas las funciones y constantes de arriba ya existen.

try {
  const [datos, estancias] = await Promise.all([cargarDatos(), cargarEstancias()]);
  ({ productos } = datos);
  estancia = estanciaPorId(estancias, parametros.get("e"));
} catch (error) {
  console.error(error);
  zonaResultados.innerHTML = '<p class="pendiente">No hemos podido cargar los muebles. Comprueba tu conexión y recarga la página.</p>';
}

if (productos && !estancia) {
  document.getElementById("titulo").textContent = "No encontramos esa estancia";
  zonaResultados.innerHTML = `<div class="acciones"><a class="boton boton--primario" href="index.html">Ver todas las estancias</a></div>`;
} else if (estancia) {
  prepararEstancia();
}
