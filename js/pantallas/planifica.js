// Pantalla de INICIO = «Planifica tu espacio» (index.html, desde el 14/11/2026): lo
// primero que ve el cliente son las estancias para elegir (salón, dormitorio, cocina…).
// Debajo, sus búsquedas guardadas y cómo usar la herramienta en la tienda.

import { iniciarPagina } from "../comun.js";
import { cargarEstancias } from "../datos.js";
import { icono } from "../dibujos.js";
import { escapar } from "../textos.js";
import { FAMILIAS } from "../logica/colores.js";
import { enlaceBusqueda, estanciaPorId, nombreBusqueda } from "../logica/planificador.js";
import { borrarBusqueda, leerBusquedas } from "../mis-busquedas.js";
import { estaRegistrado } from "../sesion.js";

iniciarPagina("planifica");

const zonaEstancias = document.getElementById("estancias");
const zonaBusquedas = document.getElementById("lista-busquedas");
const NOMBRES_COLOR = Object.fromEntries(FAMILIAS.map((familia) => [familia.id, familia.nombre]));

function tarjetaEstancia(estancia) {
  return `<li>
    <a class="estancia" href="espacio.html?e=${encodeURIComponent(estancia.id)}">
      <img class="estancia__foto" src="${escapar(estancia.foto)}" alt="" loading="lazy" width="1000" height="1000">
      <span class="estancia__texto">
        <span class="estancia__titulo">${escapar(estancia.titulo)}</span>
        <span class="estancia__frase">${escapar(estancia.frase)}</span>
      </span>
    </a>
  </li>`;
}

function pintarBusquedas(estancias) {
  const busquedas = leerBusquedas();
  if (busquedas.length === 0) {
    zonaBusquedas.innerHTML = `<p class="pendiente">Todavía no has guardado ninguna. Cuando filtres en una estancia,
      pulsa «Guardar esta búsqueda» y la tendrás aquí para repetirla con un toque.</p>`;
    return;
  }
  const donde = estaRegistrado() ? "Guardadas en tu cuenta (demostración: se quedan en este navegador)." : "Guardadas en este navegador.";
  zonaBusquedas.innerHTML = `
    <p class="nota">${donde}</p>
    <ul class="busquedas">
      ${busquedas.map((busqueda, posicion) => {
        const estancia = estanciaPorId(estancias, busqueda.estancia);
        const nombre = nombreBusqueda(busqueda, estancia, NOMBRES_COLOR);
        return `<li class="busqueda">
          <p class="busqueda__nombre">${escapar(nombre)}</p>
          <div class="busqueda__acciones">
            <a class="boton boton--primario" href="${escapar(enlaceBusqueda(busqueda))}">Repetir búsqueda</a>
            <button class="boton-icono" type="button" data-borrar="${posicion}">${icono("papelera")}<span class="solo-lector">Borrar la búsqueda ${escapar(nombre)}</span></button>
          </div>
        </li>`;
      }).join("")}
    </ul>`;
}

try {
  const estancias = await cargarEstancias();
  zonaEstancias.innerHTML = estancias.map(tarjetaEstancia).join("");
  pintarBusquedas(estancias);
  zonaBusquedas.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-borrar]");
    if (!boton) return;
    borrarBusqueda(Number(boton.dataset.borrar));
    pintarBusquedas(estancias);
    document.getElementById("titulo-busquedas").focus();
  });
  // Si se llega desde el menú («Mis búsquedas guardadas»), se lleva al cliente a esa parte.
  if (window.location.hash === "#busquedas") document.getElementById("titulo-busquedas").focus();
} catch (error) {
  console.error(error);
  zonaEstancias.innerHTML = '<li class="pendiente"><p>No hemos podido cargar las estancias. Recarga la página.</p></li>';
}
