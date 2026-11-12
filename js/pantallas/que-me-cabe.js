// Pantalla ¿Qué me cabe?: el recomendador. El cliente dice estancia, tipo de mueble y
// medidas de su pared, y ve solo los muebles que caben, ordenados por proporción.
//
// Es la única función reservada a quien tiene cuenta. Al invitado se le explica
// por qué y se le recuerda todo lo que sí puede hacer sin registrarse.

import { iniciarPagina } from "../comun.js";
import { puedeUsar } from "../sesion.js";
import { cargarDatos } from "../datos.js";
import { medir } from "../medicion.js";
import { enlaceAsesor, enlaceTienda } from "../enlaces.js";
import { avisoOrientativo, chipSemaforo, croquisPared, tarjetaProducto } from "../componentes.js";
import { icono } from "../dibujos.js";
import { comoTexto, datosDe, pintarErrores } from "../formularios.js";
import { NOMBRE_ESTANCIA, NOMBRE_TIPO, cm, escapar } from "../textos.js";
import { estanciasDeReglas, porcentaje, recomendar, tiposDeEstancia, validarBusqueda } from "../logica/recomendador.js";
import { frase } from "../logica/semaforo.js";
import { leerHuecos } from "../mis-huecos.js";
import { estaGuardado, guardarProducto, quitarProducto } from "../mi-lista.js";

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

  const textoGuardar = (id) => (estaGuardado(id) ? "Quitar de mi lista" : `${icono("corazon")}Guardar en mi lista`);

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
        <p class="mensaje resultado__aviso" role="status" hidden></p>
      </div>`;
    // «Ver ficha de producto» lleva directo a alihogar.es (con UTM), sin paso intermedio.
    // Si un producto no tuviera enlace, se abre nuestra ficha: nunca se inventa una dirección.
    const tienda = enlaceTienda(producto.url_alihogar);
    const verFicha = tienda
      ? `<a class="boton boton--primario" data-tienda href="${escapar(tienda)}" target="_blank" rel="noopener">Ver ficha de producto<span class="solo-lector"> en alihogar.es (se abre en otra pestaña)</span></a>`
      : `<a class="boton boton--primario" href="ficha.html?p=${encodeURIComponent(producto.id)}">Ver ficha</a>`;
    const botones = `<div class="acciones">
        ${verFicha}
        <button class="boton boton--secundario" type="button" data-guardar>${textoGuardar(producto.id)}</button>
      </div>`;
    return `<li data-producto="${escapar(producto.id)}">${tarjetaProducto(producto, extra, botones)}</li>`;
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

  // Lo que se pulsa en un resultado: salir a alihogar.es o guardar en la lista.
  zonaResultados.addEventListener("click", (evento) => {
    const tarjeta = evento.target.closest("[data-producto]");
    if (!tarjeta) return;
    const id = tarjeta.dataset.producto;
    const puesto = [...zonaResultados.querySelectorAll(".resultados-lista > li")].indexOf(tarjeta) + 1;

    if (evento.target.closest("a.boton")) {
      medir("recommend_click", { producto: id, puesto });
      if (evento.target.closest("[data-tienda]")) medir("go_to_shop", { producto: id, desde: "recomendador" });
      return;
    }

    const boton = evento.target.closest("[data-guardar]");
    if (!boton) return;
    const aviso = tarjeta.querySelector(".resultado__aviso");
    if (estaGuardado(id)) {
      quitarProducto(id);
      aviso.textContent = "Quitado de tu lista.";
    } else {
      const resultado = guardarProducto(id);
      aviso.innerHTML = resultado.ok
        ? 'Guardado en tu lista. <a href="lista.html">Ver mi lista</a>'
        : "Tu lista está llena. Quita algún mueble para guardar este.";
    }
    aviso.hidden = false;
    boton.innerHTML = textoGuardar(id);
    boton.setAttribute("aria-pressed", estaGuardado(id) ? "true" : "false");
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
