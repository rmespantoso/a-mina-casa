// Pantalla de INICIO = «Planifica tu espacio» (index.html, desde el 14/11/2026): lo
// primero que ve el cliente son las estancias para elegir (salón, dormitorio, cocina…).
// Debajo, cómo usar la herramienta en la tienda.

import { iniciarPagina } from "../comun.js";
import { cargarEstancias } from "../datos.js";
import { escapar } from "../textos.js";

iniciarPagina("planifica");

const zonaEstancias = document.getElementById("estancias");

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

try {
  const estancias = await cargarEstancias();
  zonaEstancias.innerHTML = estancias.map(tarjetaEstancia).join("");
} catch (error) {
  console.error(error);
  zonaEstancias.innerHTML = '<li class="pendiente"><p>No hemos podido cargar las estancias. Recarga la página.</p></li>';
}
