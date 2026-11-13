// Aviso de consentimiento para la medición (GA4).
//
// Reglas (ética del proyecto):
// - Dos botones IGUALES: aceptar y rechazar pesan lo mismo, sin colores que empujen.
// - GA4 no se carga hasta que el cliente dice que sí.
// - Si dice que no, todo funciona igual y no se le vuelve a preguntar.
// - Puede cambiar de idea cuando quiera desde el pie de la página.
// - Si no hay ID de GA4 en config.js no se mide nada, así que no se pregunta nada.

import { decidirMedicion, decisionMedicion, hayMedicion } from "./medicion.js";

function pintarAviso() {
  document.getElementById("consentimiento")?.remove();
  const aviso = document.createElement("section");
  aviso.id = "consentimiento";
  aviso.className = "consentimiento";
  aviso.setAttribute("aria-labelledby", "consentimiento-titulo");
  aviso.innerHTML = `
    <p class="consentimiento__titulo" id="consentimiento-titulo">¿Nos dejas medir cómo se usa?</p>
    <p>Usamos Google Analytics para contar visitas y pulsaciones, y así mejorar la herramienta. No enviamos tu nombre ni tu teléfono: solo datos anónimos, como qué muebles miras o el ancho de pared que buscas. Si dices que no, todo funciona igual.</p>
    <div class="acciones acciones--pareja">
      <button class="boton boton--secundario" type="button" data-medicion="no">Rechazar</button>
      <button class="boton boton--secundario" type="button" data-medicion="si">Aceptar</button>
    </div>`;
  aviso.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-medicion]");
    if (!boton) return;
    decidirMedicion(boton.dataset.medicion === "si");
    aviso.remove();
    pintarPieMedicion(true);
  });
  document.getElementById("cabecera").after(aviso);
}

/** Línea del pie que dice qué se decidió y deja cambiarlo. */
function pintarPieMedicion(avisar = false) {
  const zona = document.getElementById("pie-medicion");
  if (!zona) return;
  const decision = decisionMedicion();
  if (decision === null) {
    zona.innerHTML = "";
    return;
  }
  zona.innerHTML = `
    <p ${avisar ? 'role="status"' : ""}>Medición con Google Analytics: <strong>${decision === "si" ? "aceptada" : "rechazada"}</strong>.</p>
    <button class="pie__boton" type="button" id="cambiar-medicion">Cambiar mi decisión</button>`;
  document.getElementById("cambiar-medicion").addEventListener("click", () => {
    pintarAviso();
    const aviso = document.getElementById("consentimiento");
    aviso.setAttribute("tabindex", "-1");
    aviso.focus();
    aviso.scrollIntoView({ block: "start" });
  });
}

/** Lo llama comun.js en cada pantalla. */
export function pintarConsentimiento() {
  if (!hayMedicion()) return;
  if (decisionMedicion() === null) pintarAviso();
  pintarPieMedicion();
}
