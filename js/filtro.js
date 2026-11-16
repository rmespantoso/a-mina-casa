// El filtro de muebles de «Planifica tu espacio», en una sola pieza que comparten la
// pantalla de cada estancia (espacio.html) y «Añadir artículo» de Mi plano 3D.
//
// Pasos, todos opcionales (decisión del 14/11/2026):
//   (Estancia: solo en Mi plano 3D, donde no se viene de una estancia concreta.)
//   1. ¿Qué buscas? → desplegable con los tipos de mueble de la estancia.
//   2. Medidas → ancho, fondo y alto MÁXIMOS del mueble.
//   3. Precio → barra con dos tiradores (mínimo y máximo) y los recuadros «Desde» y «Hasta»
//      para escribirlo a mano (desde el 15/11/2026). Desde el 16/11/2026 la barra llega hasta
//      un número redondo según el mueble más caro del tipo elegido (topePrecio).
//   4. Color → desplegable con casillas: varios o ninguno.
//
// `prefijo` hace únicos los id de los campos, por si hubiera dos filtros en una página.

import { pintarErrores } from "./formularios.js";
import { escapar } from "./textos.js";
import { FAMILIAS, limpiarColores } from "./logica/colores.js";
import {
  PASO_PRECIO, PRECIO_TOPE, estanciaPorId, leerPrecio, leerPrecioMin, pasoPrecio, tiposDeEstancia, topePrecio, validarPlan,
} from "./logica/planificador.js";

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

// Dibujo que explica qué es el ancho, el fondo y el alto: un sofá con tres flechas de punta
// a punta. Hecho por nosotros con líneas sencillas; cada flecha lleva su palabra.
function dibujoMedidas(prefijo) {
  const flecha = `${prefijo}-flecha`;
  return `<svg class="dibujo-medidas" viewBox="0 55 330 148" role="img"
      aria-label="Cómo se mide un mueble: el ancho va de lado a lado, el fondo de delante hacia atrás y el alto del suelo a lo más alto.">
    <defs>
      <marker id="${flecha}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 10 5 0 10z" class="dibujo-medidas__punta"/>
      </marker>
    </defs>
    <!-- Respaldo (detrás), asiento con dos cojines y dos brazos -->
    <path class="dibujo-medidas__sofa dibujo-medidas__sofa--arriba" d="M83 80h180l12-8H95z"/>
    <path class="dibujo-medidas__sofa dibujo-medidas__sofa--atras" d="M83 80h180v24H83z"/>
    <path class="dibujo-medidas__sofa dibujo-medidas__sofa--arriba" d="M80 122h130l28-18H108z"/>
    <path class="dibujo-medidas__sofa" d="M80 122h130v38H80z"/>
    <path class="dibujo-medidas__linea" d="M145 122v38M145 122l28-18"/>
    <path class="dibujo-medidas__sofa dibujo-medidas__sofa--arriba" d="M55 95h25l40-26H95z"/>
    <path class="dibujo-medidas__sofa" d="M55 95h25v65H55z"/>
    <path class="dibujo-medidas__sofa dibujo-medidas__sofa--lado" d="M235 95l40-26v65l-40 26z"/>
    <path class="dibujo-medidas__sofa dibujo-medidas__sofa--arriba" d="M210 95h25l40-26h-25z"/>
    <path class="dibujo-medidas__sofa" d="M210 95h25v65h-25z"/>
    <path class="dibujo-medidas__suelo" d="M20 160h220"/>
    <path class="dibujo-medidas__flecha" d="M57 182h176" marker-start="url(#${flecha})" marker-end="url(#${flecha})"/>
    <text class="dibujo-medidas__texto" x="145" y="198" text-anchor="middle">Ancho</text>
    <path class="dibujo-medidas__flecha" d="M246 168l38-25" marker-start="url(#${flecha})" marker-end="url(#${flecha})"/>
    <text class="dibujo-medidas__texto" x="268" y="186">Fondo</text>
    <path class="dibujo-medidas__flecha" d="M32 158V74" marker-start="url(#${flecha})" marker-end="url(#${flecha})"/>
    <text class="dibujo-medidas__texto" x="18" y="116" text-anchor="middle" transform="rotate(-90 18 116)">Alto</text>
  </svg>`;
}

function campoPrecio(prefijo, nombre, etiqueta, ejemplo) {
  return `<div class="campo">
      <label class="campo__etiqueta" for="${prefijo}-${nombre}">${etiqueta}</label>
      <div class="campo__caja">
        <input class="campo__entrada" id="${prefijo}-${nombre}" name="${nombre}" type="text" inputmode="numeric" autocomplete="off"
          placeholder="${ejemplo}">
        <span class="campo__unidad" aria-hidden="true">€</span>
      </div>
    </div>`;
}

/** HTML de los campos del filtro (va dentro de un <form>). Con `conEstancia`, empieza por la estancia. */
export function htmlFiltro(prefijo, { conEstancia = false, textoBoton = "Buscar artículos" } = {}) {
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
      ${dibujoMedidas(prefijo)}
      <div class="medidas-fila">
        ${campoMedida(prefijo, "ancho", "Ancho")}
        ${campoMedida(prefijo, "fondo", "Fondo")}
        ${campoMedida(prefijo, "alto", "Alto")}
      </div>
    </fieldset>

    <fieldset class="grupo-campos">
      <legend class="paso-titulo">${paso(3)}Precio</legend>
      <output class="precio-valor" data-precio-valor>Cualquier precio</output>
      <!-- Barra con dos tiradores (mínimo y máximo). Los recuadros de debajo dicen lo mismo y se pueden escribir. -->
      <div class="barra-doble" data-barra-doble>
        <input class="barra barra--doble" type="range" min="0" max="${PRECIO_TOPE}" step="${PASO_PRECIO}" value="0"
          aria-label="Precio mínimo" data-barra-min>
        <input class="barra barra--doble" type="range" min="0" max="${PRECIO_TOPE}" step="${PASO_PRECIO}" value="${PRECIO_TOPE}"
          aria-label="Precio máximo" data-barra-max>
      </div>
      <div class="barra__extremos" aria-hidden="true"><span>0 €</span><span data-tope-precio>2.000 €</span></div>
      <div class="medidas-fila medidas-fila--dos">
        ${campoPrecio(prefijo, "precio_min", "Desde", "0")}
        ${campoPrecio(prefijo, "precio", "Hasta", "Sin límite")}
      </div>
    </fieldset>

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
 * - productos: el catálogo, para que la barra del precio llegue hasta donde tiene sentido.
 * - alBuscar(busqueda, estancia): se llama al enviar el filtro si todo está bien.
 * Devuelve { rellenar(guardada), estancia() }.
 */
export function montarFiltro(formulario, { prefijo, estancias, estancia, productos = [], alBuscar }) {
  let actual = estancia ?? estancias[0];
  let tope = PRECIO_TOPE; // final de la barra del precio (cambia con el tipo de mueble)
  const barraMin = formulario.querySelector("[data-barra-min]");
  const barraMax = formulario.querySelector("[data-barra-max]");
  const textoMin = formulario.elements.precio_min;
  const textoMax = formulario.elements.precio;
  const valorPrecio = formulario.querySelector("[data-precio-valor]");
  const desplegable = formulario.querySelector("[data-colores]");
  const casillas = () => [...formulario.querySelectorAll('input[name="colores"]')];

  // El texto de arriba y el tramo magenta de la barra salen de los recuadros (lo que cuenta al buscar).
  function pintarPrecio() {
    const desde = leerPrecioMin(textoMin.value);
    const hasta = leerPrecio(textoMax.value);
    let texto = "Cualquier precio";
    if (desde != null && hasta != null) texto = `De ${desde} € a ${hasta} €`;
    else if (desde != null) texto = `Desde ${desde} €`;
    else if (hasta != null) texto = `Hasta ${hasta} €`;
    valorPrecio.textContent = texto;
    barraMin.setAttribute("aria-valuetext", desde == null ? "Sin mínimo" : `${desde} €`);
    barraMax.setAttribute("aria-valuetext", hasta == null ? "Sin límite" : `${hasta} €`);
    const caja = formulario.querySelector("[data-barra-doble]");
    caja.style.setProperty("--desde", `${(Number(barraMin.value) / tope) * 100}%`);
    caja.style.setProperty("--hasta", `${(Number(barraMax.value) / tope) * 100}%`);
  }

  // Barra -> recuadros. Un tirador no puede pasar al otro.
  function alMoverBarra(evento) {
    if (Number(barraMin.value) > Number(barraMax.value)) {
      if (evento.target === barraMin) barraMin.value = barraMax.value;
      else barraMax.value = barraMin.value;
    }
    // Solo se reescribe el recuadro del tirador que se mueve (lo tecleado en el otro se respeta).
    if (evento.target === barraMin) textoMin.value = Number(barraMin.value) > 0 ? barraMin.value : "";
    else textoMax.value = Number(barraMax.value) < tope ? barraMax.value : "";
    pintarPrecio();
  }

  // Recuadros -> barra (lo escrito se respeta tal cual; la barra se acerca a su tramo).
  function alEscribirPrecio() {
    barraMin.value = leerPrecioMin(textoMin.value) ?? 0;
    barraMax.value = leerPrecio(textoMax.value) ?? tope;
    pintarPrecio();
  }

  // La barra llega hasta un número redondo según los muebles que se buscan (16/11/2026).
  // Lo escrito en los recuadros no se toca: si pasa del nuevo final, la barra se queda al final.
  function ajustarBarra() {
    const grupo = actual.grupos.find((opcion) => opcion.id === formulario.elements.grupo.value);
    const tipos = grupo ? grupo.tipos : tiposDeEstancia(actual);
    tope = productos.length ? topePrecio(productos, tipos) : PRECIO_TOPE;
    const paso = productos.length ? pasoPrecio(tope) : PASO_PRECIO;
    for (const barra of [barraMin, barraMax]) {
      barra.max = String(tope);
      barra.step = String(paso);
    }
    formulario.querySelector("[data-tope-precio]").textContent = `${String(tope).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} €`;
    alEscribirPrecio();
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
      ajustarBarra();
    });
  }
  pintarGrupos();
  formulario.elements.grupo.addEventListener("change", ajustarBarra);

  barraMin.addEventListener("input", alMoverBarra);
  barraMax.addEventListener("input", alMoverBarra);
  textoMin.addEventListener("input", alEscribirPrecio);
  textoMax.addEventListener("input", alEscribirPrecio);
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

  ajustarBarra();
  pintarResumen();

  return {
    /** Rellena el filtro con una búsqueda guardada ({ grupo, ancho, fondo, alto, precio_min, precio, colores }). */
    rellenar(guardada) {
      formulario.elements.grupo.value = actual.grupos.some((grupo) => grupo.id === guardada.grupo) ? guardada.grupo : "";
      ajustarBarra();
      // Con coma decimal, como lo escribe el cliente («245,5»).
      for (const nombre of ["ancho", "fondo", "alto"]) formulario.elements[nombre].value = String(guardada[nombre] ?? "").replace(".", ",");
      textoMin.value = leerPrecioMin(guardada.precio_min) ?? "";
      textoMax.value = leerPrecio(guardada.precio) ?? "";
      alEscribirPrecio();
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
