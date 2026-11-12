// Ayudas para los formularios de medidas (Mis huecos y ¿Qué me cabe?).
// Cada campo del HTML lleva data-campo="nombre", una .campo__entrada y una .campo__error.

/** Lo que el cliente ha escrito en un formulario, como { nombre: valor }. */
export const datosDe = (formulario) => Object.fromEntries(new FormData(formulario));

/** 94.5 -> "94,5" para volver a poner una medida guardada en un campo. */
export const comoTexto = (valor) => (valor == null ? "" : String(valor).replace(".", ","));

/** Pinta los errores debajo de cada campo y lleva el cursor al primero. Sin errores, los limpia. */
export function pintarErrores(formulario, errores = {}, sugerencias = {}) {
  let primero = null;
  for (const campo of formulario.querySelectorAll("[data-campo]")) {
    const nombre = campo.dataset.campo;
    const entrada = campo.querySelector(".campo__entrada");
    const caja = campo.querySelector(".campo__error");
    const texto = errores[nombre];

    campo.classList.toggle("campo--error", Boolean(texto));
    entrada.setAttribute("aria-invalid", texto ? "true" : "false");
    caja.hidden = !texto;
    caja.textContent = texto ?? "";

    // Si parece escrito en metros, se ofrece la corrección con un botón. Nunca se cambia solo.
    if (texto && sugerencias[nombre] != null) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "boton boton--secundario";
      boton.textContent = `Sí, son ${sugerencias[nombre]} cm`;
      boton.addEventListener("click", () => {
        entrada.value = sugerencias[nombre];
        campo.classList.remove("campo--error");
        entrada.setAttribute("aria-invalid", "false");
        caja.hidden = true;
        caja.textContent = "";
        entrada.focus();
      });
      caja.append(boton);
    }
    if (texto && !primero) primero = entrada;
  }
  primero?.focus();
}
