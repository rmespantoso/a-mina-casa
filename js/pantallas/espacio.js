// Pantalla de una estancia de «Planifica tu espacio» (espacio.html?e=dormitorio).
// El cliente elige qué busca (canapés, armarios…), pone las medidas de su hueco y,
// si quiere, un precio máximo y unos colores. Ve solo lo que cabe, ordenado por
// proporción con la pared, y puede guardar la búsqueda para repetirla otro día.
//
// Está abierta a todos (decisión del 14/11/2026): no hace falta cuenta para buscar.

import { iniciarPagina } from "../comun.js";
import { cargarDatos, cargarEstancias } from "../datos.js";
import { medir } from "../medicion.js";
import { enlaceAsesor, enlaceTienda } from "../enlaces.js";
import { avisoOrientativo, chipSemaforo, croquisPared, tarjetaProducto } from "../componentes.js";
import { icono } from "../dibujos.js";
import { comoTexto, datosDe, pintarErrores } from "../formularios.js";
import { NOMBRE_ESTANCIA, cm, escapar, euros } from "../textos.js";
import { accionCompra, porcentaje } from "../logica/recomendador.js";
import { FAMILIAS } from "../logica/colores.js";
import { PRECIOS, buscarEnEstancia, estanciaPorId, nombreBusqueda, paraGuardar, validarPlan } from "../logica/planificador.js";
import { frase, ordenarHuecos } from "../logica/semaforo.js";
import { leerHuecos } from "../mis-huecos.js";
import { guardarBusqueda } from "../mis-busquedas.js";
import { estaGuardado, guardarProducto, quitarProducto } from "../mi-lista.js";
import { estaRegistrado } from "../sesion.js";

iniciarPagina("planifica");

const parametros = new URLSearchParams(window.location.search);
const formulario = document.getElementById("formulario-plan");
const zonaResultados = document.getElementById("resultados");
const NOMBRES_COLOR = Object.fromEntries(FAMILIAS.map((familia) => [familia.id, familia.nombre]));

let productos, reglas, estancia;
let ultimaBusqueda = null; // la última búsqueda hecha, para «Guardar esta búsqueda»

function prepararEstancia() {
  document.title = `${estancia.titulo} · A miña casa (prototipo)`;
  document.getElementById("titulo").textContent = estancia.titulo;
  document.getElementById("portada").innerHTML =
    `<img src="${escapar(estancia.foto)}" alt="Ambiente de ${escapar(estancia.nombre.toLowerCase())} con muebles de ALI Hogar" width="1000" height="1000">`;

  // Paso 1: qué mueble. Botones grandes (por dentro, botones de radio).
  document.getElementById("grupos").innerHTML = estancia.grupos.map((grupo) => `
    <label class="opcion"><input type="radio" name="grupo" value="${escapar(grupo.id)}">${escapar(grupo.nombre)}</label>`).join("");

  // Paso 3: precio y colores.
  formulario.elements.precio.innerHTML = PRECIOS.map((precio) =>
    `<option value="${precio ?? ""}">${precio == null ? "Sin límite" : `Hasta ${euros(precio)}`}</option>`).join("");
  document.getElementById("colores").innerHTML = FAMILIAS.map((familia) => `
    <label class="opcion"><input type="checkbox" name="colores" value="${familia.id}">
      <span class="opcion__muestra" style="background:${familia.muestra}" aria-hidden="true"></span>${escapar(familia.nombre)}</label>`).join("");

  // Atajo: usar una medida guardada (primero las de esta estancia).
  const huecos = ordenarHuecos(leerHuecos(), [estancia.id]);
  if (huecos.length) {
    const selector = document.getElementById("hueco-guardado");
    document.getElementById("zona-hueco").hidden = false;
    selector.innerHTML = '<option value="">No, escribo las medidas</option>' + huecos.map((hueco) =>
      `<option value="${escapar(hueco.id)}">${escapar(hueco.nombre)} · ${escapar(NOMBRE_ESTANCIA[hueco.estancia] ?? "")} · ${cm(hueco.ancho_cm)}</option>`).join("");
    selector.addEventListener("change", () => {
      const hueco = huecos.find((actual) => actual.id === selector.value);
      if (!hueco) return;
      formulario.elements.ancho.value = comoTexto(hueco.ancho_cm);
      formulario.elements.fondo.value = comoTexto(hueco.fondo_cm);
      formulario.elements.alto.value = comoTexto(hueco.alto_cm);
    });
  }

  formulario.hidden = false;
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    buscar();
  });
  zonaResultados.addEventListener("click", alPulsarResultado);

  // Si la dirección ya trae una búsqueda (búsqueda guardada o vuelta de una ficha), se repite sola.
  formulario.elements.ancho.value = parametros.get("a") ?? "";
  formulario.elements.fondo.value = parametros.get("f") ?? "";
  formulario.elements.alto.value = parametros.get("h") ?? "";
  if (parametros.has("g")) {
    const grupo = formulario.querySelector(`input[name="grupo"][value="${CSS.escape(parametros.get("g"))}"]`);
    if (grupo) grupo.checked = true;
    formulario.elements.precio.value = PRECIOS.includes(Number(parametros.get("p"))) ? parametros.get("p") : "";
    const elegidos = (parametros.get("c") ?? "").split(".");
    for (const casilla of formulario.querySelectorAll('input[name="colores"]')) casilla.checked = elegidos.includes(casilla.value);
    if (validarPlan(leerFormulario(), estancia).ok) buscar();
  }
}

function leerFormulario() {
  const datos = datosDe(formulario);
  datos.colores = [...formulario.querySelectorAll('input[name="colores"]:checked')].map((casilla) => casilla.value);
  return datos;
}

// La búsqueda se deja en la dirección (sin ningún dato personal): así, al volver de una
// ficha, los resultados siguen ahí. GA4 nunca recibe estos datos (ver direccionLimpia).
function apuntarEnDireccion(busqueda) {
  const nuevos = new URLSearchParams({ e: busqueda.estancia, g: busqueda.grupo, a: String(busqueda.pared.ancho_cm) });
  if (busqueda.pared.fondo_cm != null) nuevos.set("f", String(busqueda.pared.fondo_cm));
  if (busqueda.pared.alto_cm != null) nuevos.set("h", String(busqueda.pared.alto_cm));
  if (busqueda.precioMax != null) nuevos.set("p", String(busqueda.precioMax));
  if (busqueda.colores.length) nuevos.set("c", busqueda.colores.join("."));
  window.history.replaceState(null, "", `${window.location.pathname}?${nuevos}`);
}

function buscar() {
  const revision = validarPlan(leerFormulario(), estancia);
  if (!revision.ok) {
    pintarErrores(formulario, revision.errores, revision.sugerencias);
    zonaResultados.innerHTML = "";
    return;
  }
  pintarErrores(formulario);
  ultimaBusqueda = revision.busqueda;
  apuntarEnDireccion(revision.busqueda);
  pintarResultados(revision.busqueda);
}

// ---------- Resultados ----------

const textoGuardar = (id) => (estaGuardado(id) ? "Quitar de mi lista" : `${icono("corazon")}Guardar en mi lista`);

function tarjetaResultado(resultado, busqueda) {
  const { producto, regla, encaje, ocupacion, etiqueta } = resultado;
  const justas = encaje.medidas.filter((medida) => medida.estado === "ambar");
  const abiertaNoCabe = encaje.abierta && encaje.abierta.estado === "rojo";
  const dondeVerlo = producto.seccion_nave
    ? `En la tienda está en: ${escapar(producto.seccion_nave)}.`
    : "Para verlo y tocarlo en la tienda, pregunta a un empleado: te dirá dónde está.";

  const extra = `
    <div class="resultado__encaje">
      ${chipSemaforo(encaje.estado, etiqueta)}
      <p>Ocupa el ${porcentaje(ocupacion)} % de tu pared. Lo ideal para este mueble es entre el
        ${porcentaje(regla.ocupacion_min)} y el ${porcentaje(regla.ocupacion_max)} % (orientativo).</p>
      ${justas.map((medida) => `<p>${escapar(frase(medida))}</p>`).join("")}
      ${abiertaNoCabe ? `<p>Ojo: abierta mide ${cm(producto.ancho_abierto_cm)} y no cabe en tu pared.</p>` : ""}
      ${croquisPared({ anchoPared: busqueda.pared.ancho_cm, anchoMueble: producto.ancho_cm })}
      <p class="nota">${dondeVerlo}</p>
      <p class="mensaje resultado__aviso" role="status" hidden></p>
    </div>`;

  // «Ver ficha de producto» lleva directo a alihogar.es (con UTM). El carrito es una DEMOSTRACIÓN.
  const tienda = enlaceTienda(producto.url_alihogar);
  const otraPestana = '<span class="solo-lector"> en alihogar.es (se abre en otra pestaña)</span>';
  const enlace = (texto, clase) =>
    `<a class="boton ${clase}" data-tienda href="${escapar(tienda)}" target="_blank" rel="noopener">${texto}${otraPestana}</a>`;
  const accion = accionCompra(producto);
  let principales = `<a class="boton boton--primario" href="ficha.html?p=${encodeURIComponent(producto.id)}">Ver ficha</a>`;
  if (accion === "carrito") {
    principales = `<button class="boton boton--primario" type="button" data-carrito>Añadir al carrito</button>
      ${tienda ? enlace("Ver ficha de producto", "boton--secundario") : ""}`;
  } else if (accion === "elegir") {
    principales = enlace("Elegir opción y comprar", "boton--primario");
  }
  const plano = producto.fondo_cm
    ? `<a class="boton boton--secundario" href="plano.html?p=${encodeURIComponent(producto.id)}">Probar en mi plano</a>`
    : "";
  const botones = `<div class="acciones">
      ${principales}
      <button class="boton boton--secundario" type="button" data-guardar aria-pressed="${estaGuardado(producto.id)}">${textoGuardar(producto.id)}</button>
      ${plano}
    </div>`;
  return `<li data-producto="${escapar(producto.id)}">${tarjetaProducto(producto, extra, botones)}</li>`;
}

function pintarResultados(busqueda) {
  const { resultados, total, caben, porPrecio, porColor } = buscarEnEstancia(productos, reglas, busqueda);
  const grupo = estancia.grupos.find((actual) => actual.id === busqueda.grupo);
  const queBusca = grupo.nombre.toLowerCase();
  const hueco = `un hueco de ${cm(busqueda.pared.ancho_cm)}`;

  medir("recommend_view", {
    estancia: busqueda.estancia,
    tipo: busqueda.grupo,
    ancho_pared: busqueda.pared.ancho_cm,
    precio_max: busqueda.precioMax,
    colores: busqueda.colores.length,
    resultados: resultados.length,
  });

  // Por qué hay menos: se dice claro cuántos se quedan fuera por precio o por color.
  const fuera = [];
  if (porPrecio) fuera.push(`${porPrecio === 1 ? "1 cabe" : `${porPrecio} caben`} pero ${porPrecio === 1 ? "cuesta" : "cuestan"} más de ${euros(busqueda.precioMax)}`);
  if (porColor) fuera.push(`${porColor === 1 ? "1 cabe" : `${porColor} caben`} pero no ${porColor === 1 ? "es" : "son"} del color elegido (o la web no dice su color)`);
  const textoFuera = fuera.length ? `<p class="nota">${escapar(fuera.join(". "))}.</p>` : "";

  const guardar = `
    <div class="acciones">
      <button class="boton boton--secundario" type="button" id="guardar-busqueda">Guardar esta búsqueda</button>
    </div>
    <p class="mensaje" id="aviso-busqueda" role="status" hidden></p>`;

  if (resultados.length === 0) {
    const texto = `Hola, busco ${queBusca} para ${hueco} de ancho y no encuentro nada que quepa. ¿Me ayudáis?`;
    const motivo = caben === 0
      ? `De los muebles de esta herramienta, ningún ${escapar(queBusca)} cabe en ${hueco}.`
      : "Hay muebles que caben, pero ninguno cumple el precio o el color que has elegido. Prueba a quitar algún filtro.";
    zonaResultados.innerHTML = `
      <h2 class="seccion" id="titulo-resultados" tabindex="-1">No hemos encontrado ninguno</h2>
      <div class="pendiente"><p>${motivo}</p><p>El asesor de ALI Hogar puede buscarte otras opciones.</p></div>
      ${textoFuera}
      <div class="acciones">
        <a class="boton boton--primario" id="asesor-sin-resultados" href="${escapar(enlaceAsesor(texto))}" target="_blank" rel="noopener">
          ${icono("whatsapp")}Preguntar al asesor</a>
      </div>
      ${guardar}`;
    document.getElementById("asesor-sin-resultados")
      .addEventListener("click", () => medir("whatsapp_advisor", { desde: "planifica_sin_resultados", tipo: busqueda.grupo }));
  } else {
    const titulo = resultados.length === 1 ? "1 mueble que te cabe" : `${resultados.length} muebles que te caben`;
    const recorte = total > resultados.length
      ? `<p>Te enseñamos los ${resultados.length} que mejor encajan de los ${total} que cumplen tu búsqueda.</p>`
      : "";
    zonaResultados.innerHTML = `
      <h2 class="seccion" id="titulo-resultados" tabindex="-1">${titulo}</h2>
      <p>${escapar(grupo.nombre)} para ${hueco}, ordenados por cómo quedan de proporción.</p>
      ${recorte}
      ${textoFuera}
      ${guardar}
      <ul class="resultados-lista">${resultados.map((resultado) => tarjetaResultado(resultado, busqueda)).join("")}</ul>
      ${avisoOrientativo()}`;
  }
  document.getElementById("titulo-resultados").focus();
}

function alPulsarResultado(evento) {
  // Guardar la búsqueda para repetirla otro día.
  if (evento.target.closest("#guardar-busqueda")) {
    const aviso = document.getElementById("aviso-busqueda");
    const resultado = guardarBusqueda(paraGuardar(ultimaBusqueda));
    const nombre = nombreBusqueda(ultimaBusqueda, estancia, NOMBRES_COLOR);
    const donde = estaRegistrado() ? "en tu cuenta (demostración: se queda en este móvil)" : "en este móvil";
    aviso.innerHTML = resultado.repetida
      ? `Ya la tenías guardada: «${escapar(nombre)}». <a href="index.html#busquedas">Ver mis búsquedas</a>`
      : `Búsqueda guardada ${donde}: «${escapar(nombre)}». <a href="index.html#busquedas">Ver mis búsquedas</a>`;
    aviso.hidden = false;
    return;
  }

  const tarjeta = evento.target.closest("[data-producto]");
  if (!tarjeta) return;
  const id = tarjeta.dataset.producto;
  const puesto = [...zonaResultados.querySelectorAll(".resultados-lista > li")].indexOf(tarjeta) + 1;

  if (evento.target.closest("a.boton")) {
    medir("recommend_click", { producto: id, puesto });
    if (evento.target.closest("[data-tienda]")) medir("go_to_shop", { producto: id, desde: "planifica" });
    return;
  }

  const aviso = tarjeta.querySelector(".resultado__aviso");
  if (evento.target.closest("[data-carrito]")) {
    medir("add_to_cart", { producto: id, puesto, desde: "planifica", demo: true });
    aviso.innerHTML = "<strong>Esto es una demostración.</strong> Cuando la herramienta esté dentro de alihogar.es, " +
      "este mueble se añadirá a tu carrito. Hoy no se ha añadido nada: para comprarlo, pulsa «Ver ficha de producto».";
    aviso.hidden = false;
    return;
  }

  const boton = evento.target.closest("[data-guardar]");
  if (!boton) return;
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
}

// ---------- Arranque ----------
// Va al final del archivo: así todas las funciones y constantes de arriba ya existen.

try {
  const [datos, estancias] = await Promise.all([cargarDatos(), cargarEstancias()]);
  ({ productos, reglas } = datos);
  estancia = estanciaPorId(estancias, parametros.get("e"));
} catch (error) {
  console.error(error);
  zonaResultados.innerHTML = '<p class="pendiente">No hemos podido cargar los muebles. Comprueba tu conexión y recarga la página.</p>';
}

if (productos && !estancia) {
  document.getElementById("titulo").textContent = "No encontramos esa estancia";
  zonaResultados.innerHTML = `<div class="acciones"><a class="boton boton--primario" href="index.html">Ver todas las estancias</a></div>`;
} else if (estancia) {
  prepararEstancia();
}
