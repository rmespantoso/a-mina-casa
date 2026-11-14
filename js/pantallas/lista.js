// Pantalla Mi lista: los muebles guardados, el código para caja y los botones de compartir.
// También enseña una lista RECIBIDA por enlace, que nunca pisa la propia sin preguntar.

import { CONFIG } from "../config.js";
import { iniciarPagina } from "../comun.js";
import { guardar, leer } from "../almacen.js";
import { cargarDatos } from "../datos.js";
import { medir } from "../medicion.js";
import { estaRegistrado } from "../sesion.js";
import { enlaceAsesor, enlaceTienda } from "../enlaces.js";
import { avisoOrientativo, fotoProducto } from "../componentes.js";
import { icono } from "../dibujos.js";
import { NOMBRE_TIPO, escapar, euros, medidas } from "../textos.js";
import { crearEnlace, leerEnlace, textoCompartir, totalLista } from "../logica/lista.js";
import { accionCompra } from "../logica/recomendador.js";
import { adoptarLista, leerLista, quitarProducto, reponerProducto } from "../mi-lista.js";

iniciarPagina("lista");

const contenido = document.getElementById("contenido");

// Dirección de esta pantalla, sin parámetros. Publicado, usa la dirección de config.js.
const BASE = CONFIG.urlPublicada
  ? new URL("lista.html", CONFIG.urlPublicada).href
  : new URL("lista.html", window.location.href).href;

let catalogo = [];
let ultimoQuitado = null; // { id, posicion, nombre } para el «Deshacer»

// ---------- Piezas comunes ----------

/** Convierte ids en productos del catálogo. Dice cuántos ya no existen. */
function buscarProductos(ids) {
  const productos = ids.map((id) => catalogo.find((producto) => producto.id === id)).filter(Boolean);
  return { productos, perdidos: ids.length - productos.length };
}

function articulo(producto, conQuitar) {
  const tienda = enlaceTienda(producto.url_alihogar);
  const nombre = escapar(producto.nombre);
  const enlace = (texto, clase) => (tienda
    ? `<a class="boton ${clase}" data-tienda href="${escapar(tienda)}" target="_blank" rel="noopener">${texto}<span class="solo-lector"> de ${nombre} en alihogar.es (se abre en otra pestaña)</span></a>`
    : "");

  // Mismo criterio que en el recomendador (accionCompra):
  // - sin variantes: «Añadir al carrito» (DEMOSTRACIÓN) y, al lado, la ficha de producto;
  // - con colores o medidas a elegir: a su página de alihogar.es, para no comprar la opción equivocada.
  const accion = accionCompra(producto);
  let botones = enlace("Ver ficha de producto", "boton--secundario");
  let pareja = false;
  if (accion === "carrito") {
    botones = `<button class="boton boton--primario" type="button" data-carrito aria-label="Añadir al carrito: ${nombre}">Añadir al carrito</button>${botones}`;
    pareja = Boolean(tienda);
  } else if (accion === "elegir") {
    botones = enlace("Elegir opción y comprar", "boton--primario");
  }

  // Quitar: una papelera arriba a la derecha, con su texto para lectores de pantalla.
  const quitar = conQuitar
    ? `<button class="boton-icono" type="button" data-quitar aria-label="Quitar ${nombre} de mi lista" title="Quitar de mi lista">${icono("papelera")}</button>`
    : "";

  return `<li class="articulo" data-producto="${escapar(producto.id)}">
    <div class="articulo__cabeza${conQuitar ? " articulo__cabeza--con-quitar" : ""}">
      <a class="articulo__foto" href="ficha.html?p=${encodeURIComponent(producto.id)}" aria-label="Ver la ficha de ${nombre}">${fotoProducto(producto)}</a>
      <div>
        <p class="tarjeta__tipo">${escapar(NOMBRE_TIPO[producto.tipo] ?? producto.tipo)}</p>
        <h3 class="tarjeta__nombre">${nombre}</h3>
        <p class="tarjeta__medidas">${medidas(producto)}</p>
        <p class="tarjeta__precio">${euros(producto.precio_eur)}</p>
      </div>
      ${quitar}
    </div>
    <p class="mensaje articulo__aviso" role="status" hidden></p>
    <div class="acciones ${pareja ? "acciones--pareja" : ""}">${botones}</div>
  </li>`;
}

function bloqueTotal(productos) {
  const { total, sinPrecio } = totalLista(productos);
  const nota = sinPrecio ? ` No incluye ${sinPrecio} con precio a consultar en tienda.` : "";
  return `<div class="total">
      <p class="total__linea"><span>Total orientativo</span><strong>${euros(total)}</strong></p>
      <p class="nota">Precios consultados el ${CONFIG.fechaDatos}. Pueden haber cambiado.${nota}</p>
    </div>`;
}

const avisoPerdidos = (perdidos) => (perdidos
  ? `<p class="mensaje">${perdidos === 1 ? "Un mueble de esta lista ya no está" : `${perdidos} muebles de esta lista ya no están`} en la herramienta y no se ha podido cargar.</p>`
  : "");

// ---------- Mi lista ----------

function pintarVacia() {
  contenido.innerHTML = `
    <h1>Mi lista</h1>
    <div class="pendiente">
      <p><strong>Tu lista está vacía.</strong></p>
      <p>Guarda aquí los muebles que te gusten para compararlos con calma y decidir.</p>
    </div>
    <div class="acciones">
      <a class="boton boton--primario" href="index.html">Planifica tu espacio</a>
    </div>`;
}

function pintarMia() {
  const lista = leerLista();
  if (!lista || (lista.productos.length === 0 && !ultimoQuitado)) {
    pintarVacia();
    return;
  }

  const { productos, perdidos } = buscarProductos(lista.productos);
  const deshacer = ultimoQuitado
    ? `<p class="mensaje" id="aviso-quitado" role="status">Quitado: «${escapar(ultimoQuitado.nombre)}».
        <button class="enlace-boton" type="button" id="deshacer">Deshacer</button></p>`
    : "";
  // Al invitado se le propone registrarse una sola vez, cuando ya tiene productos guardados.
  const invitar = !estaRegistrado() && productos.length > 0 && !leer("invitacion-lista", false);
  if (invitar) guardar("invitacion-lista", true);

  contenido.innerHTML = `
    <h1>Mi lista</h1>
    <div class="codigo">
      <p class="codigo__etiqueta">Código de tu lista</p>
      <p class="codigo__valor">${escapar(lista.codigo)}</p>
      <p class="codigo__ayuda">Dilo en caja o al asesor y sabrán qué muebles te interesan.</p>
    </div>
    <p class="nota">${estaRegistrado()
      ? "Guardada en tu cuenta (demostración: en este prototipo se queda en este móvil)."
      : "Se guarda solo en este móvil."}</p>

    ${deshacer}
    ${avisoPerdidos(perdidos)}

    ${invitar ? `<section class="invitacion" id="invitacion" aria-labelledby="titulo-invitacion">
      <h2 id="titulo-invitacion">¿Quieres conservar tu lista?</h2>
      <p>Ahora está guardada en este móvil. Con una cuenta la tendrías también en otros dispositivos y sin límite de tiempo. No es obligatorio.</p>
      <div class="acciones">
        <a class="boton boton--secundario" href="acceso.html?volver=lista">Crear cuenta</a>
        <button class="boton boton--secundario" type="button" id="invitacion-no">Ahora no</button>
      </div>
    </section>` : ""}

    <h2 class="seccion">${productos.length === 1 ? "1 mueble guardado" : `${productos.length} muebles guardados`}</h2>
    ${productos.length
      ? `<ul class="articulos">${productos.map((producto) => articulo(producto, true)).join("")}</ul>
         ${avisoOrientativo()}
         ${bloqueTotal(productos)}
         <div class="acciones"><a class="boton boton--secundario" href="plano.html">Ver mis muebles en mi plano 3D</a></div>`
      : '<p class="pendiente">No queda ningún mueble en tu lista.</p>'}

    ${productos.length ? `
    <h2 class="seccion">Compartir</h2>
    <p>Envía tu lista a quien quieras o al asesor de ALI Hogar. El mensaje solo lleva los muebles, el código y un enlace.</p>
    <div class="acciones">
      <a class="boton boton--primario" id="compartir" target="_blank" rel="noopener" href="#">${icono("whatsapp")}Compartir por WhatsApp</a>
      <a class="boton boton--secundario" id="al-asesor" target="_blank" rel="noopener" href="#">Enviar al asesor de ALI</a>
      <button class="boton boton--secundario" type="button" id="copiar">Copiar enlace</button>
    </div>
    <p class="mensaje" id="aviso-compartir" role="status" hidden></p>

    <h2 class="seccion">Comprar</h2>
    <p>Cada mueble tiene su botón para comprarlo en alihogar.es. Al finalizar la compra puedes elegir envío a casa o recogida en tienda.</p>` : ""}`;

  if (!productos.length) return;

  // --- Compartir ---
  const avisoCompartir = document.getElementById("aviso-compartir");

  function prepararEnlaces() {
    const enlace = crearEnlace(BASE, lista);
    const texto = (paraAsesor) => textoCompartir({ lista, productos, enlace, paraAsesor });
    document.getElementById("compartir").href = `https://wa.me/?text=${encodeURIComponent(texto(false))}`;
    document.getElementById("al-asesor").href = enlaceAsesor(texto(true));
    return enlace;
  }
  prepararEnlaces();

  function trasCompartir(canal, textoAviso) {
    medir("list_share", { canal, productos: productos.length });
    avisoCompartir.innerHTML = `${textoAviso} <a href="encuesta.html">¿Nos cuentas qué te ha parecido?</a>`;
    avisoCompartir.hidden = false;
  }

  document.getElementById("compartir").addEventListener("click", () => trasCompartir("whatsapp", "Se ha abierto WhatsApp con tu lista."));
  document.getElementById("al-asesor").addEventListener("click", () => {
    medir("whatsapp_advisor", { desde: "lista", productos: productos.length });
    trasCompartir("asesor", "Se ha abierto WhatsApp con el asesor de ALI Hogar.");
  });
  document.getElementById("copiar").addEventListener("click", async () => {
    const enlace = prepararEnlaces();
    try {
      await navigator.clipboard.writeText(enlace);
      trasCompartir("enlace", "Enlace copiado. Pégalo donde quieras.");
    } catch {
      // Si el navegador no deja copiar, se enseña el enlace para copiarlo a mano.
      avisoCompartir.textContent = `Copia este enlace: ${enlace}`;
      avisoCompartir.hidden = false;
    }
  });
}

// Un solo «escuchador» para toda la pantalla: quitar, deshacer, salir a la tienda…
contenido.addEventListener("click", (evento) => {
  const fila = evento.target.closest("[data-producto]");

  if (evento.target.closest("[data-tienda]") && fila) {
    medir("go_to_shop", { producto: fila.dataset.producto, desde: "lista" });
    return;
  }

  // Carrito de DEMOSTRACIÓN: no se envía nada a alihogar.es; solo se mide el interés.
  if (evento.target.closest("[data-carrito]") && fila) {
    medir("add_to_cart", { producto: fila.dataset.producto, desde: "lista", demo: true });
    const aviso = fila.querySelector(".articulo__aviso");
    aviso.innerHTML = "<strong>Esto es una demostración.</strong> Cuando la herramienta esté dentro de alihogar.es, " +
      "este mueble se añadirá a tu carrito. Hoy no se ha añadido nada: para comprarlo, pulsa «Ver ficha de producto».";
    aviso.hidden = false;
    return;
  }

  if (evento.target.closest("[data-quitar]") && fila) {
    const id = fila.dataset.producto;
    const lista = leerLista();
    ultimoQuitado = { id, posicion: lista.productos.indexOf(id), nombre: catalogo.find((p) => p.id === id)?.nombre ?? id };
    quitarProducto(id);
    pintarMia();
    document.getElementById("deshacer")?.focus();
    return;
  }

  if (evento.target.closest("#deshacer") && ultimoQuitado) {
    reponerProducto(ultimoQuitado.id, ultimoQuitado.posicion);
    const id = ultimoQuitado.id;
    ultimoQuitado = null;
    pintarMia();
    contenido.querySelector(`[data-producto="${CSS.escape(id)}"] [data-quitar]`)?.focus();
    return;
  }

  if (evento.target.closest("#invitacion-no")) {
    document.getElementById("invitacion").hidden = true;
  }
});

// ---------- Lista recibida por enlace ----------

function pintarRecibida(recibida) {
  const propia = leerLista();
  const tengoLista = Boolean(propia && propia.productos.length);
  const { productos, perdidos } = buscarProductos(recibida.lista.productos);

  document.title = "Lista recibida · A miña casa (prototipo)";
  contenido.innerHTML = `
    <h1>Lista recibida</h1>
    <div class="aviso">${icono("info")}<p><strong>Esta lista te la han enviado.</strong> Todavía no es tuya: puedes mirarla o guardarla.</p></div>
    <div class="codigo">
      <p class="codigo__etiqueta">Código de la lista</p>
      <p class="codigo__valor">${escapar(recibida.lista.codigo)}</p>
    </div>
    ${avisoPerdidos(perdidos)}

    <h2 class="seccion">${productos.length === 1 ? "1 mueble" : `${productos.length} muebles`}</h2>
    ${productos.length
      ? `<ul class="articulos">${productos.map((producto) => articulo(producto, false)).join("")}</ul>
         ${bloqueTotal(productos)}`
      : '<p class="pendiente">No hemos podido cargar ningún mueble de esta lista.</p>'}

    <h2 class="seccion">¿Qué quieres hacer?</h2>
    <div id="zona-decidir">
      <div class="acciones">
        ${productos.length ? '<button class="boton boton--primario" type="button" id="guardar-recibida">Guardarla como mía</button>' : ""}
        <a class="boton boton--secundario" href="lista.html">${tengoLista ? "Solo mirarla: volver a mi lista" : "Solo mirarla: ir a mi lista"}</a>
      </div>
    </div>`;

  const zona = document.getElementById("zona-decidir");

  function guardarComoMia() {
    adoptarLista({ codigo: recibida.lista.codigo, productos: productos.map((producto) => producto.id) });
    window.location.replace("lista.html");
  }

  document.getElementById("guardar-recibida")?.addEventListener("click", () => {
    if (!tengoLista) {
      guardarComoMia();
      return;
    }
    // Ya tengo una lista: se pregunta antes de cambiarla.
    const cuantos = propia.productos.length === 1 ? "1 mueble" : `${propia.productos.length} muebles`;
    zona.innerHTML = `
      <p class="hueco__pregunta" role="alert">Ya tienes una lista con ${cuantos}. Si guardas esta, la tuya se sustituye. ¿Seguro?</p>
      <div class="acciones acciones--pareja">
        <button class="boton boton--primario" type="button" id="si-cambiar">Sí, cambiarla</button>
        <a class="boton boton--secundario" id="no-cambiar" href="lista.html">No, conservar la mía</a>
      </div>`;
    document.getElementById("si-cambiar").addEventListener("click", guardarComoMia);
    document.getElementById("no-cambiar").focus(); // lo seguro, primero
  });
}

function pintarEnlaceMalo(error) {
  contenido.innerHTML = `
    <h1>No podemos abrir esa lista</h1>
    <p class="entrada">${error === "version"
      ? "El enlace es de una versión de la herramienta que ya no usamos."
      : "El enlace está incompleto o estropeado."} Pide que te la envíen otra vez.</p>
    <div class="acciones"><a class="boton boton--primario" href="lista.html">Ir a mi lista</a></div>`;
}

// ---------- Arranque ----------

try {
  catalogo = (await cargarDatos()).productos;
  const recibida = leerEnlace(window.location.search);
  const propia = leerLista();

  if (!recibida) pintarMia();
  else if (recibida.error) pintarEnlaceMalo(recibida.error);
  else if (propia && propia.codigo === recibida.lista.codigo) {
    // Es mi propia lista abierta desde su enlace: se enseña la mía, sin parámetros.
    window.history.replaceState(null, "", "lista.html");
    pintarMia();
  } else pintarRecibida(recibida);
} catch (error) {
  console.error(error);
  contenido.innerHTML = `
    <h1>Mi lista</h1>
    <p class="pendiente">No hemos podido cargar los muebles. Comprueba tu conexión y recarga la página.</p>`;
}
