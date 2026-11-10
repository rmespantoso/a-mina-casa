// Pantalla Encuesta: lleva al Google Form con la pregunta CES
// («¿Cuánto esfuerzo te costó decidirte?», del 1 al 7).
// El enlace del formulario está en config.js. Si aún no existe, se dice con claridad.

import { iniciarPagina } from "../comun.js";
import { CONFIG } from "../config.js";
import { medir } from "../medicion.js";

iniciarPagina(null);

const zona = document.getElementById("zona-encuesta");

if (CONFIG.urlEncuesta) {
  zona.innerHTML = `<a class="boton boton--primario" id="abrir-encuesta" href="${CONFIG.urlEncuesta}"
      target="_blank" rel="noopener">Abrir la encuesta</a>
    <p class="nota">Se abre en una pestaña nueva, en Google Forms.</p>`;
  document.getElementById("abrir-encuesta").addEventListener("click", () => medir("survey_open"));
} else {
  zona.innerHTML = `<div class="pendiente"><p>La encuesta estará disponible pronto.</p></div>`;
}
