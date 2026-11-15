// Pantalla «Muebles para ti» (resultados.html?e=salon&g=sofas&a=220&pm=100&p=600&c=gris).
//
// Desde el 15/11/2026 los resultados van en una página aparte del filtro, para que el cliente
// tenga menos distracciones. Arriba a la izquierda, «← Volver a la búsqueda» lleva al filtro
// de la estancia con lo que había elegido. Aquí se puede guardar la búsqueda, guardar muebles
// en la lista, ir a comprar y «Probar en mi plano 3D».

import { iniciarPagina } from "../comun.js";
import { cargarDatos, cargarEstancias } from "../datos.js";
import { medir } from "../medicion.js";
import { enlaceAsesor, enlaceTienda } from "../enlaces.js";
import { tarjetaProducto } from "../componentes.js";
import { icono } from "../dibujos.js";
import { escapar } from "../textos.js";
import { accionCompra } from "../logica/recomendador.js";
import { FAMILIAS } from "../logica/colores.js";
import {
  POR_PAGINA, buscarEnEstancia, busquedaDeDireccion, enlaceBusqueda, enlaceFiltro, estanciaPorId, nombreBusqueda, paraGuardar,
  textoMedidas, validarPlan,
} from "../logica/planificador.js";
import { guardarBusqueda } from "../mis-busquedas.js";
import { estaGuardado, guardarProducto, quitarProducto } from "../mi-lista.js";
import { estaRegistrado } from "../sesion.js";

iniciarPagina("planifica");

const zona = document.getElementById("resultados");
const NOMBRES_COLOR = Object.fromEntries(FAMILIAS.map((familia) => [familia.id, familia.nombre]));

let estancia = null;
let busqueda = null; // la búsqueda de esta página
let encontrados = []; // todos los muebles encontrados (se enseñan de POR_PAGINA en POR_PAGINA)
let mostrados = 0;

const textoGuardar = (id) => (estaGuardado(id) ? "Quitar de mi lista" : `${icono("corazon")}Guardar en mi lista`);

function tarjetaResultado(producto) {
  const dondeVerlo = producto.seccion_nave
    ? `En la tienda está en: ${escapar(producto.seccion_nave)}.`
    : "Para verlo y tocarlo en la tienda, pregunta a un empleado: te dirá dónde está.";
  const extra = `
    <div class="resultado__encaje">
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
  const plano = producto.ancho_cm && producto.fondo_cm
    ? `<a class="boton boton--secundario" data-plano href="plano.html?p=${encodeURIComponent(producto.id)}">Probar en mi plano 3D</a>`
    : "";
  const botones = `<div class="acciones">
      ${principales}
      <button class="boton boton--secundario" type="button" data-guardar aria-pressed="${estaGuardado(producto.id)}">${textoGuardar(producto.id)}</button>
      ${plano}
    </div>`;
  return `<li data-producto="${escapar(producto.id)}">${tarjetaProducto(producto, extra, botones)}</li>`;
}

function pintarMas() {
  const lista = document.getElementById("lista-resultados");
  const nuevos = encontrados.slice(mostrados, mostrados + POR_PAGINA);
  lista.insertAdjacentHTML("beforeend", nuevos.map(tarjetaResultado).join(""));
  mostrados += nuevos.length;
  const quedan = encontrados.length - mostrados;
  const boton = document.getElementById("ver-mas");
  boton.hidden = quedan <= 0;
  boton.textContent = `Ver ${Math.min(quedan, POR_PAGINA)} más (quedan ${quedan})`;
  document.getElementById("cuantos-ves").textContent = `Ves ${mostrados} de ${encontrados.length}.`;
}

function pintarResultados(productos) {
  const { resultados, total, delTipo, porMedida, porPrecio, porColor } = buscarEnEstancia(productos, busqueda);
  const guardada = paraGuardar(busqueda);
  const grupo = estancia.grupos.find((actual) => actual.id === busqueda.grupo);
  const queBusca = (grupo?.nombre ?? "muebles").toLowerCase();
  // Resumen del filtro en una frase: «Sofás · hasta 220 cm de ancho · de 100 a 600 € · Gris».
  const resumen = nombreBusqueda(guardada, estancia, NOMBRES_COLOR).split(" · ").slice(1).join(" · ");

  medir("recommend_view", {
    estancia: busqueda.estancia,
    tipo: busqueda.grupo ?? "todos",
    ancho_max: busqueda.medidas.ancho_cm,
    precio_min: busqueda.precioMin,
    precio_max: busqueda.precioMax,
    colores: busqueda.colores.length,
    resultados: total,
  });

  // Por qué hay menos: se dice claro cuántos se quedan fuera en cada filtro.
  const fuera = [];
  if (porMedida) fuera.push(`${porMedida} no ${porMedida === 1 ? "cumple" : "cumplen"} tus medidas (o la web no da esa medida)`);
  if (porPrecio) fuera.push(`${porPrecio} ${porPrecio === 1 ? "queda" : "quedan"} fuera de tu precio (o no tienen precio en la web)`);
  if (porColor) fuera.push(`${porColor} no ${porColor === 1 ? "es" : "son"} del color elegido (o la web no dice su color)`);
  const textoFuera = fuera.length ? `<p class="nota">Se quedan fuera: ${escapar(fuera.join("; "))}.</p>` : "";

  const guardar = `
    <div class="acciones">
      <button class="boton boton--secundario" type="button" id="guardar-busqueda">Guardar esta búsqueda</button>
    </div>
    <p class="mensaje" id="aviso-busqueda" role="status" hidden></p>`;

  const titulo = document.getElementById("titulo-resultados");
  if (total === 0) {
    titulo.textContent = "No hemos encontrado ninguno";
    const medidas = textoMedidas(guardada);
    const texto = `Hola, busco ${queBusca} para ${estancia.nombre.toLowerCase()}${medidas ? ` de hasta ${medidas}` : ""} y no encuentro nada. ¿Me ayudáis?`;
    const motivo = delTipo === 0
      ? "Esta herramienta todavía no tiene muebles de este tipo."
      : "Ningún mueble cumple todo lo que has elegido. Vuelve a la búsqueda y prueba a quitar algún filtro o a cambiar el precio.";
    zona.innerHTML = `
      <p>${escapar(resumen)}.</p>
      <div class="pendiente"><p>${motivo}</p><p>El asesor de ALI Hogar puede buscarte otras opciones.</p></div>
      ${textoFuera}
      <div class="acciones">
        <a class="boton boton--primario" id="asesor-sin-resultados" href="${escapar(enlaceAsesor(texto))}" target="_blank" rel="noopener">
          ${icono("whatsapp")}Preguntar al asesor</a>
        <a class="boton boton--secundario" href="${escapar(enlaceFiltro(guardada))}">Cambiar la búsqueda</a>
      </div>
      ${guardar}`;
    document.getElementById("asesor-sin-resultados")
      .addEventListener("click", () => medir("whatsapp_advisor", { desde: "planifica_sin_resultados", tipo: busqueda.grupo ?? "todos" }));
    return;
  }

  titulo.textContent = total === 1 ? "1 mueble para ti" : `${total} muebles para ti`;
  const hayMedidas = Object.values(busqueda.medidas).some((valor) => valor != null);
  zona.innerHTML = `
    <p>${escapar(resumen)}.
      ${hayMedidas ? "Primero, los que más se acercan a tus medidas." : "Ordenados de menor a mayor precio."}</p>
    ${textoFuera}
    ${guardar}
    <ul class="resultados-lista" id="lista-resultados"></ul>
    <p class="nota" id="cuantos-ves" aria-live="polite"></p>
    <div class="acciones"><button class="boton boton--secundario" type="button" id="ver-mas">Ver más</button></div>
    <div class="aviso">${icono("info")}<p><strong>Orientativo.</strong> Las medidas son las de alihogar.es: mide siempre antes de comprar.</p></div>`;
  encontrados = resultados;
  mostrados = 0;
  pintarMas();
}

zona.addEventListener("click", (evento) => {
  if (evento.target.closest("#ver-mas")) {
    const primero = mostrados;
    pintarMas();
    // El foco pasa al primer mueble nuevo, para no perderse.
    document.querySelectorAll("#lista-resultados > li")[primero]?.querySelector("a, button")?.focus();
    return;
  }

  // Guardar el filtro completo para repetirlo otro día.
  if (evento.target.closest("#guardar-busqueda")) {
    const aviso = document.getElementById("aviso-busqueda");
    const resultado = guardarBusqueda(paraGuardar(busqueda));
    const nombre = nombreBusqueda(paraGuardar(busqueda), estancia, NOMBRES_COLOR);
    const donde = estaRegistrado() ? "en tu cuenta (demostración: se queda en este navegador)" : "en este navegador";
    aviso.innerHTML = resultado.repetida
      ? `Ya la tenías guardada: «${escapar(nombre)}». <a href="index.html#busquedas">Ver mis búsquedas</a>`
      : `Búsqueda guardada ${donde}: «${escapar(nombre)}». <a href="index.html#busquedas">Ver mis búsquedas</a>`;
    aviso.hidden = false;
    return;
  }

  const tarjeta = evento.target.closest("[data-producto]");
  if (!tarjeta) return;
  const id = tarjeta.dataset.producto;
  const puesto = [...zona.querySelectorAll(".resultados-lista > li")].indexOf(tarjeta) + 1;

  if (evento.target.closest("a.boton")) {
    // Para que Mi plano 3D pueda ofrecer «← Volver a la búsqueda» (vuelve a estos resultados).
    if (evento.target.closest("[data-plano]")) recordarBusqueda();
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
});

// Mi plano 3D lee esto para su enlace «← Volver a la búsqueda». Solo es la dirección de la
// búsqueda (estancia y filtros), nada personal; dura lo que dure la pestaña.
function recordarBusqueda() {
  try {
    sessionStorage.setItem("amicasa:volver-plano", enlaceBusqueda(paraGuardar(busqueda)));
  } catch { /* sin sessionStorage, el plano enseña «← Otras estancias» */ }
}

// ---------- Arranque ----------

try {
  const [{ productos }, estancias] = await Promise.all([cargarDatos(), cargarEstancias()]);
  const pedida = busquedaDeDireccion(window.location.search);
  estancia = estanciaPorId(estancias, pedida.estancia);
  const revision = estancia ? validarPlan(pedida, estancia) : { ok: false };
  if (!revision.ok) {
    document.getElementById("titulo-resultados").textContent = "No encontramos esa búsqueda";
    document.getElementById("volver").href = estancia ? `espacio.html?e=${encodeURIComponent(estancia.id)}` : "index.html";
    zona.innerHTML = `<p class="pendiente">Puede que el enlace esté incompleto. Vuelve a la búsqueda y pulsa «Buscar artículos».</p>`;
  } else {
    busqueda = revision.busqueda;
    document.title = `Muebles para ti · ${estancia.nombre} · A miña casa (prototipo)`;
    const encima = document.getElementById("estancia-resultados");
    encima.textContent = estancia.titulo;
    encima.removeAttribute("lang");
    document.getElementById("volver").href = enlaceFiltro(paraGuardar(busqueda));
    pintarResultados(productos);
  }
} catch (error) {
  console.error(error);
  zona.innerHTML = '<p class="pendiente">No hemos podido cargar los muebles. Comprueba tu conexión y recarga la página.</p>';
}
