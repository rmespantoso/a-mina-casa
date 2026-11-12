// Pantalla ¿Qué me cabe?: el recomendador. El cliente dice estancia, tipo de mueble y
// medidas de su pared, y ve solo los muebles que caben, ordenados por proporción.
//
// Es la única función reservada a quien tiene cuenta. Al invitado se le explica
// por qué y se le recuerda todo lo que sí puede hacer sin registrarse.

import { iniciarPagina } from "../comun.js";
import { puedeUsar } from "../sesion.js";
import { cargarDatos } from "../datos.js";
import { medir } from "../medicion.js";
import { enlaceAsesor } from "../enlaces.js";
import { avisoOrientativo, chipSemaforo, croquisPared, tarjetaProducto } from "../componentes.js";
import { icono } from "../dibujos.js";
import { comoTexto, datosDe, pintarErrores } from "../formularios.js";
import { NOMBRE_ESTANCIA, NOMBRE_TIPO, cm, escapar } from "../textos.js";
import { estanciasDeReglas, porcentaje, recomendar, tiposDeEstancia, validarBusqueda } from "../logica/recomendador.js";
import { frase } from "../logica/semaforo.js";
import { leerHuecos } from "../mis-huecos.js";

iniciarPagina("que-me-cabe");

const puede = puedeUsar("recomendador");
document.getElementById("solo-registrados").hidden = puede;
document.getElementById("recomendador").hidden = !puede;

if (puede) await iniciarRecomendador();

async function iniciarRecomendador() {
  const formulario = document.getElementById("formulario-busqueda");
  const zonaResultados = document.getElementById("resultados");
  const selectorEstancia = formulario.elements.estancia;
  const selectorTipo = formulario.elements.tipo;
  const selectorHueco = document.getElementById("hueco-guardado");

  let datos;
  try {
    datos = await cargarDatos();
  } catch (error) {
    console.error(error);
    zonaResultados.innerHTML = '<p class="pendiente">No hemos podido cargar los muebles. Comprueba tu conexión y recarga la página.</p>';
    return;
  }
  const { productos, reglas } = datos;

  // ---------- Desplegables ----------

  const opciones = (valores, nombres, vacia) =>
    `<option value="">${vacia}</option>` +
    valores.map((valor) => `<option value="${valor}">${escapar(nombres[valor] ?? valor)}</option>`).join("");

  selectorEstancia.innerHTML = opciones(estanciasDeReglas(reglas), NOMBRE_ESTANCIA, "Elige una…");

  // Al elegir estancia solo se ofrecen los muebles que tienen sentido en ella.
  function pintarTipos(elegido = "") {
    const estancia = selectorEstancia.value;
    const tipos = estancia ? tiposDeEstancia(reglas, estancia) : [];
    selectorTipo.innerHTML = opciones(tipos, NOMBRE_TIPO, estancia ? "Elige uno…" : "Elige antes la estancia");
    selectorTipo.disabled = !estancia;
    if (tipos.includes(elegido)) selectorTipo.value = elegido;
  }
  selectorEstancia.addEventListener("change", () => pintarTipos());
  pintarTipos();

  // Los huecos guardados sirven de atajo para no volver a escribir las medidas.
  const huecos = leerHuecos();
  if (huecos.length) {
    document.getElementById("zona-hueco").hidden = false;
    selectorHueco.innerHTML =
      '<option value="">No, escribo las medidas</option>' +
      huecos.map((hueco) => `<option value="${escapar(hueco.id)}">${escapar(hueco.nombre)} · ${cm(hueco.ancho_cm)}</option>`).join("");
    selectorHueco.addEventListener("change", () => {
      const hueco = huecos.find((actual) => actual.id === selectorHueco.value);
      if (!hueco) return;
      const tipoAnterior = selectorTipo.value;
      selectorEstancia.value = hueco.estancia;
      pintarTipos(tipoAnterior);
      formulario.elements.ancho.value = comoTexto(hueco.ancho_cm);
      formulario.elements.fondo.value = comoTexto(hueco.fondo_cm);
      formulario.elements.alto.value = comoTexto(hueco.alto_cm);
    });
  }

  // ---------- Resultados ----------

  function tarjetaResultado(resultado, busqueda, regla) {
    const { producto, encaje, ocupacion, etiqueta } = resultado;
    const justas = encaje.medidas.filter((medida) => medida.estado === "ambar");
    const abiertaNoCabe = encaje.abierta && encaje.abierta.estado === "rojo";
    // Dónde verlo: ALI no tiene los muebles localizados por sección, así que se remite al personal.
    const dondeVerlo = producto.seccion_nave
      ? `En la tienda está en: ${escapar(producto.seccion_nave)}.`
      : "Para verlo y tocarlo en la tienda, pregunta a un empleado: te dirá dónde está.";

    const extra = `
      <div class="resultado__encaje">
        ${chipSemaforo(encaje.estado, etiqueta)}
        <p>Ocupa el ${porcentaje(ocupacion)} % de tu pared. Lo ideal para este tipo de mueble es entre el
          ${porcentaje(regla.ocupacion_min)} y el ${porcentaje(regla.ocupacion_max)} % (orientativo).</p>
        ${justas.map((medida) => `<p>${escapar(frase(medida))}</p>`).join("")}
        ${abiertaNoCabe ? `<p>Ojo: abierta mide ${cm(producto.ancho_abierto_cm)} y no cabe en tu pared.</p>` : ""}
        ${croquisPared({ anchoPared: busqueda.pared.ancho_cm, anchoMueble: producto.ancho_cm })}
        <p class="nota">${dondeVerlo}</p>
      </div>`;
    return `<li>${tarjetaProducto(producto, extra)}</li>`;
  }

  function pintarResultados(busqueda) {
    const { resultados, total, regla } = recomendar(productos, reglas, busqueda);
    const nombreTipo = (NOMBRE_TIPO[busqueda.tipo] ?? busqueda.tipo).toLowerCase();
    const pared = `una pared de ${cm(busqueda.pared.ancho_cm)}`;

    medir("recommend_view", {
      estancia: busqueda.estancia,
      tipo: busqueda.tipo,
      ancho_pared: busqueda.pared.ancho_cm,
      resultados: resultados.length,
    });

    if (resultados.length === 0) {
      // Nunca se recomienda algo que no cabe: se dice claro y se ofrece ayuda.
      const texto = `Hola, busco esto: ${nombreTipo}. Es para ${pared} de ancho y no encuentro nada que quepa. ¿Me ayudáis?`;
      zonaResultados.innerHTML = `
        <h2 class="seccion" id="titulo-resultados" tabindex="-1">No hemos encontrado ninguno que quepa</h2>
        <div class="pendiente">
          <p>Buscabas: ${escapar(nombreTipo)}. De los muebles de esta herramienta, ninguno de ese tipo cabe en ${pared}.</p>
          <p>El asesor de ALI Hogar puede buscarte otras opciones.</p>
        </div>
        <div class="acciones">
          <a class="boton boton--primario" id="asesor-sin-resultados" href="${escapar(enlaceAsesor(texto))}" target="_blank" rel="noopener">
            ${icono("whatsapp")}Preguntar al asesor</a>
        </div>`;
      document.getElementById("asesor-sin-resultados")
        .addEventListener("click", () => medir("whatsapp_advisor", { desde: "recomendador_sin_resultados", tipo: busqueda.tipo }));
    } else {
      const titulo = resultados.length === 1 ? "1 mueble que te cabe" : `${resultados.length} muebles que te caben`;
      const recorte = total > resultados.length
        ? `<p>Te enseñamos los ${resultados.length} que mejor encajan de los ${total} que caben.</p>`
        : "";
      zonaResultados.innerHTML = `
        <h2 class="seccion" id="titulo-resultados" tabindex="-1">${titulo}</h2>
        <p>Para ${pared}, ordenados por cómo quedan de proporción.</p>
        ${recorte}
        <ul class="resultados-lista">${resultados.map((resultado) => tarjetaResultado(resultado, busqueda, regla)).join("")}</ul>
        ${avisoOrientativo()}`;
    }
    document.getElementById("titulo-resultados").focus();
  }

  // Al pulsar un mueble recomendado se apunta cuál y en qué puesto estaba.
  zonaResultados.addEventListener("click", (evento) => {
    const enlace = evento.target.closest('a[href^="ficha.html"]');
    if (!enlace) return;
    const tarjetas = [...zonaResultados.querySelectorAll(".resultados-lista > li")];
    medir("recommend_click", {
      producto: new URL(enlace.href).searchParams.get("p"),
      puesto: tarjetas.indexOf(enlace.closest("li")) + 1,
    });
  });

  // ---------- Buscar ----------

  // La búsqueda se deja en la dirección de la página (sin ningún dato personal):
  // así, al volver de una ficha, los resultados siguen ahí.
  function apuntarEnDireccion(datosFormulario) {
    const parametros = new URLSearchParams();
    for (const [clave, campo] of [["e", "estancia"], ["t", "tipo"], ["a", "ancho"], ["f", "fondo"], ["h", "alto"]]) {
      if (datosFormulario[campo]) parametros.set(clave, datosFormulario[campo]);
    }
    window.history.replaceState(null, "", `${window.location.pathname}?${parametros}`);
  }

  function buscar() {
    const datosFormulario = datosDe(formulario);
    const revision = validarBusqueda(datosFormulario, reglas);
    if (!revision.ok) {
      pintarErrores(formulario, revision.errores, revision.sugerencias);
      zonaResultados.innerHTML = "";
      return;
    }
    pintarErrores(formulario);
    apuntarEnDireccion(datosFormulario);
    pintarResultados(revision.busqueda);
  }

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    buscar();
  });

  // Si la dirección ya trae una búsqueda (al volver de una ficha), se repite sola.
  const entrada = new URLSearchParams(window.location.search);
  if (entrada.has("e") && entrada.has("a")) {
    selectorEstancia.value = entrada.get("e");
    pintarTipos(entrada.get("t") ?? "");
    formulario.elements.ancho.value = entrada.get("a");
    formulario.elements.fondo.value = entrada.get("f") ?? "";
    formulario.elements.alto.value = entrada.get("h") ?? "";
    if (validarBusqueda(datosDe(formulario), reglas).ok) buscar();
  }
}
