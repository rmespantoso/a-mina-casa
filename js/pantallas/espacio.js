// Pantalla de una estancia de «Planifica tu espacio» (espacio.html?e=dormitorio).
//
// Solo el FILTRO (el de js/filtro.js): tipo de mueble, medidas, precio y color, todo opcional.
// Al pulsar «Buscar artículos», los muebles se abren en otra página (resultados.html), para
// que el cliente tenga menos distracciones (decisión del 15/11/2026). Desde allí, «← Volver
// a la búsqueda» trae aquí la búsqueda ya rellena.
//
// Está abierta a todos: no hace falta cuenta para buscar.

import { iniciarPagina } from "../comun.js";
import { cargarDatos, cargarEstancias } from "../datos.js";
import { htmlFiltro, montarFiltro } from "../filtro.js";
import { escapar } from "../textos.js";
import { busquedaDeDireccion, enlaceBusqueda, estanciaPorId, paraGuardar } from "../logica/planificador.js";

iniciarPagina("planifica");

const parametros = new URLSearchParams(window.location.search);
// Enlaces antiguos que pedían «buscar al abrir» (b=1): ahora los resultados están en su página.
if (parametros.has("b")) {
  parametros.delete("b");
  window.location.replace(`resultados.html?${parametros}`);
}

const formulario = document.getElementById("formulario-plan");
const zonaAvisos = document.getElementById("resultados");

let productos, estancia, estancias;

// ---------- Formulario (el filtro compartido de js/filtro.js) ----------

function prepararEstancia() {
  document.title = `${estancia.titulo} · A miña casa (prototipo)`;
  document.getElementById("titulo").textContent = estancia.titulo;
  document.getElementById("portada").innerHTML =
    `<img src="${escapar(estancia.foto)}" alt="Ambiente de ${escapar(estancia.nombre.toLowerCase())} con muebles de ALI Hogar" width="1000" height="1000">`;

  formulario.innerHTML = htmlFiltro("plan");
  const filtro = montarFiltro(formulario, {
    prefijo: "plan",
    estancias,
    estancia,
    // La búsqueda viaja en la dirección (sin ningún dato personal). GA4 no la recibe (ver direccionLimpia).
    alBuscar: (busqueda) => window.location.assign(enlaceBusqueda(paraGuardar(busqueda))),
  });
  formulario.hidden = false;

  // Si se vuelve de los resultados, el filtro aparece como el cliente lo dejó.
  filtro.rellenar(busquedaDeDireccion(window.location.search));
}

// ---------- Arranque ----------
// Va al final del archivo: así todas las funciones y constantes de arriba ya existen.

try {
  let datos;
  [datos, estancias] = await Promise.all([cargarDatos(), cargarEstancias()]);
  ({ productos } = datos);
  estancia = estanciaPorId(estancias, parametros.get("e"));
} catch (error) {
  console.error(error);
  zonaAvisos.innerHTML = '<p class="pendiente">No hemos podido cargar los muebles. Comprueba tu conexión y recarga la página.</p>';
}

if (productos && !estancia) {
  document.getElementById("titulo").textContent = "No encontramos esa estancia";
  zonaAvisos.innerHTML = `<div class="acciones"><a class="boton boton--primario" href="index.html">Ver todas las estancias</a></div>`;
} else if (estancia) {
  prepararEstancia();
}
