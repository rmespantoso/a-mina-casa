// Pantalla ¿Qué me cabe? (el recomendador llega el día 4).
// Es la única función reservada a quien tiene cuenta. Al invitado se le explica
// por qué y se le recuerda todo lo que sí puede hacer sin registrarse.

import { iniciarPagina } from "../comun.js";
import { puedeUsar } from "../sesion.js";

iniciarPagina("que-me-cabe");

const puede = puedeUsar("recomendador");
document.getElementById("solo-registrados").hidden = puede;
document.getElementById("recomendador").hidden = !puede;
