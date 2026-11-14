// El filtro de muebles de «Planifica tu espacio», en una sola pieza que comparten la
// pantalla de cada estancia (espacio.html) y «Añadir artículo» de Mi plano 3D.
//
// Pasos, todos opcionales (decisión del 14/11/2026):
//   (Estancia: solo en Mi plano 3D, donde no se viene de una estancia concreta.)
//   1. ¿Qué buscas? → desplegable con los tipos de mueble de la estancia.
//   2. Medidas → ancho, fondo y alto MÁXIMOS del mueble.
//   3. Precio máximo → barra de 0 a 2.000 € (al final, sin límite).
//   4. Color → desplegable con casillas: varios o ninguno.
//
// `prefijo` hace únicos los id de los campos, por si hubiera dos filtros en una página.

import { pintarErrores } from "./formularios.js";
import { escapar } from "./textos.js";
import { FAMILIAS, limpiarColores } from "./logica/colores.js";
import { PASO_PRECIO, PRECIO_TOPE, estanciaPorId, leerPrecio, validarPlan } from "./logica/planificador.js";

const NOMBRES_COLOR = Object.fromEntries(FAMILIAS.map((familia) => [familia.id, familia.nombre]));

function campoMedida(prefijo, nombre, etiqueta) {
  return `<div class="campo" data-campo="${nombre}">
      <label class="campo__etiqueta" for="${prefijo}-${nombre}">${etiqueta}</label>
      <div class="campo__caja">
        <input class="campo__entrada" id="${prefijo}-${nombre}" name="${nombre}" type="text" inputmode="decimal" autocomplete="off"
          aria-describedby="${prefijo}-ayuda-medidas ${prefijo}-error-${nombre}">
        <span class="campo__unidad" aria-hidden="true">cm</span>
      </div>
      <div class="campo__error" id="${prefijo}-error-${nombre}" hidden></div>
    </div>`;
}

/** HTML de los campos del filtro (va dentro de un <form>). Con `conEstancia`, empieza por la estancia. */
export function htmlFiltro(prefijo, { conEstancia = false, textoBoton = "Ver qué me cabe" } = {}) {
  const paso = (numero) => `<span class="contador" aria-hidden="true">${numero}</span>`;
  const estancia = conEstancia
    ? `<div class="campo">
        <label class="campo__etiqueta paso-titulo" for="${prefijo}-estancia">Estancia</label>
        <div class="campo__caja"><select class="campo__entrada" id="${prefijo}-estancia" name="estancia"></select></div>
      </div>`
    : "";
  return `
    <p class="nota">Todo es opcional: rellena solo lo que te importe.</p>
    ${estancia}
    <div class="campo">
      <label class="campo__etiqueta paso-titulo" for="${prefijo}-grupo">${paso(1)}¿Qué buscas?</label>
      <div class="campo__caja"><select class="campo__entrada" id="${prefijo}-grupo" name="grupo"></select></div>
    </div>

    <fieldset class="grupo-campos">
      <legend class="paso-titulo">${paso(2)}Medidas</legend>
      <p class="campo__ayuda" id="${prefijo}-ayuda-medidas">Las medidas máximas que quieres que tenga el mueble, en centímetros.</p>
      <div class="medidas-fila">
        ${campoMedida(prefijo, "ancho", "Ancho")}
        ${campoMedida(prefijo, "fondo", "Fondo")}
        ${campoMedida(prefijo, "alto", "Alto")}
      </div>
    </fieldset>

    <div class="campo">
      <label class="campo__etiqueta paso-titulo" for="${prefijo}-precio">${paso(3)}Precio máximo</label>
      <output class="precio-valor" id="${prefijo}-precio-valor" for="${prefijo}-precio">Sin límite</output>
      <input class="barra" id="${prefijo}-precio" name="precio" type="range" min="0" max="${PRECIO_TOPE}" step="${PASO_PRECIO}" value="${PRECIO_TOPE}">
      <div class="barra__extremos" aria-hidden="true"><span>0 €</span><span>${String(PRECIO_TOPE).replace(/\B(?=(\d{3})+$)/g, ".")} €</span></div>
    </div>

    <div class="campo">
      <p class="campo__etiqueta paso-titulo" id="${prefijo}-titulo-colores">${paso(4)}Color</p>
      <details class="desplegable" data-colores>
        <summary class="desplegable__boton" aria-describedby="${prefijo}-titulo-colores"><span data-resumen-colores>Todos los colores</span></summary>
        <fieldset class="desplegable__panel">
          <legend class="solo-lector">Colores (puedes elegir varios o ninguno)</legend>
          ${FAMILIAS.map((familia) => `
            <label class="casilla-color"><input type="checkbox" name="colores" value="${familia.id}">
              <span class="casilla-color__muestra" style="background:${familia.muestra}" aria-hidden="true"></span>${escapar(familia.nombre)}</label>`).join("")}
          <button class="boton-enlace" type="button" data-quitar-colores>Quitar colores</button>
        </fieldset>
      </details>
    </div>

    <div class="acciones">
      <button class="boton boton--primario" type="submit">${escapar(textoBoton)}</button>
    </div>`;
}

/**
 * Da vida a un filtro ya pintado con htmlFiltro.
 * - estancias: todas (para el desplegable de estancia) · estancia: la elegida al empezar.
 * - alBuscar(busqueda, estancia): se llama al enviar el filtro si todo está bien.
 * Devuelve { rellenar(guardada), estancia() }.
 */
export function montarFiltro(formulario, { prefijo, estancias, estancia, alBuscar }) {
  let actual = estancia ?? estancias[0];
  const barra = formulario.elements.precio;
  const valorPrecio = document.getElementById(`${prefijo}-precio-valor`);
  const desplegable = formulario.querySelector("[data-colores]");
  const casillas = () => [...formulario.querySelectorAll('input[name="colores"]')];

  function pintarPrecio() {
    const precio = leerPrecio(barra.value);
    const texto = precio == null ? "Sin límite" : `Hasta ${precio} €`;
    valorPrecio.textContent = texto;
    barra.setAttribute("aria-valuetext", texto);
    barra.style.setProperty("--relleno", `${(Number(barra.value) / PRECIO_TOPE) * 100}%`);
  }

  function pintarResumen() {
    const elegidos = casillas().filter((casilla) => casilla.checked).map((casilla) => casilla.value);
    formulario.querySelector("[data-resumen-colores]").textContent = elegidos.length
      ? elegidos.map((id) => NOMBRES_COLOR[id]).join(", ")
      : "Todos los colores";
  }

  function pintarGrupos() {
    const anterior = formulario.elements.grupo.value;
    formulario.elements.grupo.innerHTML = '<option value="">Todos los muebles</option>' +
      actual.grupos.map((grupo) => `<option value="${escapar(grupo.id)}">${escapar(grupo.nombre)}</option>`).join("");
    if (actual.grupos.some((grupo) => grupo.id === anterior)) formulario.elements.grupo.value = anterior;
  }

  if (formulario.elements.estancia) {
    formulario.elements.estancia.innerHTML = estancias
      .map((opcion) => `<option value="${escapar(opcion.id)}">${escapar(opcion.nombre)}</option>`).join("");
    formulario.elements.estancia.value = actual.id;
    formulario.elements.estancia.addEventListener("change", () => {
      actual = estanciaPorId(estancias, formulario.elements.estancia.value) ?? actual;
      pintarGrupos();
    });
  }
  pintarGrupos();

  barra.addEventListener("input", pintarPrecio);
  desplegable.addEventListener("change", pintarResumen);
  formulario.querySelector("[data-quitar-colores]").addEventListener("click", () => {
    for (const casilla of casillas()) casilla.checked = false;
    pintarResumen();
  });

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    desplegable.open = false;
    const datos = Object.fromEntries(new FormData(formulario));
    datos.colores = casillas().filter((casilla) => casilla.checked).map((casilla) => casilla.value);
    const revision = validarPlan(datos, actual);
    if (!revision.ok) {
      pintarErrores(formulario, revision.errores, revision.sugerencias);
      return;
    }
    pintarErrores(formulario);
    alBuscar(revision.busqueda, actual);
  });

  pintarPrecio();
  pintarResumen();

  return {
    /** Rellena el filtro con una búsqueda guardada ({ grupo, ancho, fondo, alto, precio, colores }). */
    rellenar(guardada) {
      formulario.elements.grupo.value = actual.grupos.some((grupo) => grupo.id === guardada.grupo) ? guardada.grupo : "";
      for (const nombre of ["ancho", "fondo", "alto"]) formulario.elements[nombre].value = guardada[nombre] ?? "";
      barra.value = leerPrecio(guardada.precio) ?? PRECIO_TOPE;
      const elegidos = limpiarColores(guardada.colores ?? []);
      for (const casilla of casillas()) casilla.checked = elegidos.includes(casilla.value);
      pintarPrecio();
      pintarResumen();
    },
    /** Envía el filtro como si el cliente hubiera pulsado el botón. */
    enviar() {
      formulario.requestSubmit();
    },
    estancia: () => actual,
  };
}
