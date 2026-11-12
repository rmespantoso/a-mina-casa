// Pantalla Tu cuenta: entrar, crear cuenta o seguir como invitado.
// El registro es simulado (ver js/sesion.js): no se piden ni se envían datos.

import { iniciarPagina } from "../comun.js";
import { destinoSeguro, entrarConDemo, estaRegistrado, salir, sesion } from "../sesion.js";

iniciarPagina(null);

// Si se llegó aquí desde otra pantalla (?volver=que-me-cabe), al terminar se vuelve a ella.
const parametros = new URLSearchParams(window.location.search);
const destino = destinoSeguro(parametros.get("volver"), parametros.get("p"));

const vistaInvitado = document.getElementById("vista-invitado");
const vistaRegistrado = document.getElementById("vista-registrado");

function pintar() {
  const registrado = estaRegistrado();
  vistaInvitado.hidden = registrado;
  vistaRegistrado.hidden = !registrado;
  document.getElementById("seguir-invitado").href = destino;
  document.getElementById("continuar").href = destino;

  if (registrado) {
    const actual = sesion();
    document.getElementById("saludo-cuenta").textContent = `Has entrado como «${actual.nombre}».`;
    document.getElementById("estado-noticias").textContent = actual.quiereNoticias
      ? "Recibirás novedades y ofertas de ALI Hogar."
      : "No recibirás publicidad: no marcaste esa casilla.";
  }
  // La cabecera cambia de «Entrar» a «Mi cuenta».
  document.querySelector(".cuenta span").textContent = registrado ? "Mi cuenta" : "Entrar";
}

document.getElementById("crear-cuenta").addEventListener("click", () => {
  entrarConDemo({ esNueva: true, quiereNoticias: document.getElementById("quiere-noticias").checked });
  pintar();
});

document.getElementById("entrar").addEventListener("click", () => {
  entrarConDemo({ esNueva: false });
  pintar();
});

document.getElementById("salir").addEventListener("click", () => {
  salir();
  pintar();
});

pintar();
