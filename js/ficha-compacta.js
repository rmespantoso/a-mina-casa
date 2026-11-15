// Ficha compacta de un mueble (15/11/2026). La usan dos sitios:
//   - ficha.html: lo que se abre al escanear el QR de la etiqueta en la tienda.
//   - Mi plano 3D, al escanear un QR desde «Escanea un código QR» (`enPlano: true`).
//
// Arriba el mueble (foto, nombre, precio y medidas) y sus acciones en poco espacio:
// Ficha (alihogar.es) · Carrito (demostración) o Elegir · Guardar (Mi lista) · Plano 3D.
// En el plano, «Plano 3D» se cambia por «+ Añadir a mi plano 3D», que mete el mueble en el
// plano abierto. Debajo, tres filas de recomendados (js/logica/relacionados.js).

import { fotoProducto } from "./componentes.js";
import { icono } from "./dibujos.js";
import { enlaceTienda } from "./enlaces.js";
import { medir } from "./medicion.js";
import { NOMBRE_TIPO, cm, escapar, euros, medidas } from "./textos.js";
import { accionCompra } from "./logica/recomendador.js";
import { relacionados } from "./logica/relacionados.js";
import { sePuedePoner } from "./logica/plano.js";
import { estaGuardado, guardarProducto, quitarProducto } from "./mi-lista.js";

const OTRA_PESTANA = '<span class="solo-lector"> en alihogar.es (se abre en otra pestaña)</span>';

function accion(etiqueta, nombreIcono, atributos, { enlace = null } = {}) {
  const dentro = `${icono(nombreIcono)}<span class="accion-qr__texto">${etiqueta}</span>`;
  return enlace
    ? `<a class="accion-qr" href="${escapar(enlace)}" ${atributos}>${dentro}</a>`
    : `<button class="accion-qr" type="button" ${atributos}>${dentro}</button>`;
}

function botonLista(producto) {
  const guardado = estaGuardado(producto.id);
  return accion(guardado ? "Guardado" : "Guardar", "corazon",
    `data-accion="lista" aria-pressed="${guardado}" aria-label="${guardado ? "Guardado en mi lista. Quitar" : "Guardar en mi lista"}"`);
}

/** Las acciones del mueble. En el plano, la de «Plano 3D» pasa a ser un botón grande de añadir. */
function htmlAcciones(producto, enPlano) {
  const tienda = enlaceTienda(producto.url_alihogar);
  const fuera = 'target="_blank" rel="noopener"';
  const botones = [];
  if (tienda) botones.push(accion(`Ficha${OTRA_PESTANA}`, "ficha", `data-accion="tienda" ${fuera}`, { enlace: tienda }));
  const compra = accionCompra(producto);
  if (compra === "carrito") botones.push(accion("Carrito", "carrito", 'data-accion="carrito"'));
  else if (compra === "elegir") botones.push(accion(`Elegir${OTRA_PESTANA}`, "carrito", `data-accion="tienda" ${fuera}`, { enlace: tienda }));
  botones.push(botonLista(producto));
  const sePuede = sePuedePoner(producto);
  if (!enPlano && sePuede) {
    botones.push(accion("Plano 3D", "cubo", 'data-accion="plano"', { enlace: `plano.html?p=${encodeURIComponent(producto.id)}` }));
  }
  const anadir = !enPlano ? "" : sePuede
    ? `<button class="boton boton--primario ficha-qr__anadir" type="button" data-accion="anadir">+ Añadir a mi plano 3D</button>`
    : '<p class="nota">La web no da su ancho o su fondo: no lo podemos poner en el plano.</p>';
  return `${anadir}<div class="acciones-qr" style="--columnas:${botones.length}">${botones.join("")}</div>`;
}

/** HTML de la ficha. `nivel` es el nivel del título del mueble (1 en ficha.html). */
export function htmlFichaCompacta(producto, { enPlano = false, nivel = 1 } = {}) {
  const abierta = producto.ancho_abierto_cm == null || producto.aviso_cliente
    ? ""
    : ` · abierta, ${cm(producto.ancho_abierto_cm)} de ancho`;
  const variantes = producto.variantes.length
    ? `<p class="nota"><strong>También en:</strong> ${escapar(producto.variantes.join(", "))}.</p>`
    : "";
  const aviso = producto.aviso_cliente
    ? `<div class="aviso">${icono("info")}<p>${escapar(producto.aviso_cliente)}</p></div>`
    : "";
  return `<article class="ficha-qr" data-ficha="${escapar(producto.id)}">
    <div class="ficha-qr__cabeza">
      <div class="ficha-qr__foto">${fotoProducto(producto)}</div>
      <div class="ficha-qr__datos">
        <p class="ficha-qr__tipo">${escapar(NOMBRE_TIPO[producto.tipo] ?? producto.tipo)}</p>
        <h${nivel} class="ficha-qr__nombre" tabindex="-1">${escapar(producto.nombre)}</h${nivel}>
        <p class="ficha-qr__precio">${euros(producto.precio_eur)}</p>
        <p class="ficha-qr__medidas"><span class="solo-lector">Medidas, ancho por fondo por alto: </span>${medidas(producto)}${abierta}</p>
      </div>
    </div>
    ${variantes}
    ${aviso}
    ${htmlAcciones(producto, enPlano)}
    <p class="mensaje" data-mensaje role="status" hidden></p>
  </article>`;
}

// ---------- Recomendados ----------

function miniTarjeta(producto, fila, puesto, enPlano) {
  const nombre = escapar(producto.nombre);
  const datos = `<span class="mini-qr__foto">${fotoProducto(producto)}</span>
      <span class="mini-qr__nombre">${nombre}</span>
      <span class="mini-qr__precio">${euros(producto.precio_eur)}</span>`;
  const marca = `data-reco="${escapar(producto.id)}" data-fila="${fila}" data-puesto="${puesto}"`;
  if (!enPlano) {
    return `<li class="mini-qr"><a class="mini-qr__abrir" href="ficha.html?p=${encodeURIComponent(producto.id)}" ${marca}>${datos}</a></li>`;
  }
  const anadir = sePuedePoner(producto)
    ? `<button class="boton-mini boton-mini--primario" type="button" data-anadir-reco="${escapar(producto.id)}">+ Añadir<span class="solo-lector"> al plano: ${nombre}</span></button>`
    : "";
  return `<li class="mini-qr">
      <button class="mini-qr__abrir" type="button" ${marca}>${datos}<span class="solo-lector"> (ver su ficha)</span></button>
      ${anadir}
    </li>`;
}

function fila(titulo, lista, nombreFila, nivel, enPlano) {
  if (!lista.length) return "";
  return `<section class="fila-qr" aria-label="${escapar(titulo)}">
      <h${nivel} class="fila-qr__titulo">${escapar(titulo)}</h${nivel}>
      <ul class="fila-qr__lista">${lista.map((producto, i) => miniTarjeta(producto, nombreFila, i + 1, enPlano)).join("")}</ul>
    </section>`;
}

/** HTML de las tres filas de recomendados. Si no hay ninguno, cadena vacía. */
export function htmlRecomendados(filas, { enPlano = false, nivel = 2 } = {}) {
  const coleccion = filas.coleccion ? `De la colección ${filas.coleccion}` : "De la misma colección";
  return fila("Parecidos", filas.parecidos, "parecidos", nivel, enPlano) +
    fila("Combina con", filas.combina, "combina", nivel, enPlano) +
    fila(coleccion, filas.mismaColeccion, "coleccion", nivel, enPlano);
}

/**
 * Pinta la ficha y los recomendados dentro de `contenedor` y engancha los botones.
 * - `productos` y `config`: el catálogo y data/complementos.json (para los recomendados).
 * - `desde`: de dónde viene, para la medición ("ficha_qr" o "plano_qr").
 * - `alAnadir(producto)`: solo en el plano; devuelve el texto que se le dice al cliente.
 * - `alVer(producto)`: solo en el plano; abre otro mueble en la misma ficha.
 */
export function montarFichaCompacta(contenedor, producto, { productos = [], config = {}, enPlano = false, nivel = 1, desde = "ficha_qr", alAnadir, alVer } = {}) {
  const filas = relacionados(producto, productos, config);
  contenedor.innerHTML = htmlFichaCompacta(producto, { enPlano, nivel }) + htmlRecomendados(filas, { enPlano, nivel: nivel + 1 });
  const mensaje = contenedor.querySelector("[data-mensaje]");
  const decir = (html) => {
    mensaje.innerHTML = html;
    mensaje.hidden = false;
  };

  medir("recommend_view", {
    producto: producto.id,
    desde,
    parecidos: filas.parecidos.length,
    combina: filas.combina.length,
    coleccion: filas.mismaColeccion.length,
  });

  contenedor.onclick = (evento) => {
    const reco = evento.target.closest("[data-reco]");
    if (reco) {
      medir("recommend_click", { producto: reco.dataset.reco, desde, fila: reco.dataset.fila, puesto: Number(reco.dataset.puesto) });
      if (enPlano && alVer) alVer(productos.find((otro) => otro.id === reco.dataset.reco));
      return;
    }
    const anadirReco = evento.target.closest("[data-anadir-reco]");
    if (anadirReco && alAnadir) {
      const otro = productos.find((x) => x.id === anadirReco.dataset.anadirReco);
      decir(escapar(alAnadir(otro)));
      return;
    }
    const boton = evento.target.closest("[data-accion]");
    if (!boton) return;
    switch (boton.dataset.accion) {
      case "tienda":
        medir("go_to_shop", { producto: producto.id, desde });
        break;
      case "carrito":
        medir("add_to_cart", { producto: producto.id, desde, demo: true });
        decir("<strong>Esto es una demostración.</strong> Cuando la herramienta esté dentro de alihogar.es, " +
          "este mueble se añadirá a tu carrito. Hoy no se ha añadido nada: para comprarlo, pulsa «Ficha».");
        break;
      case "lista":
        if (estaGuardado(producto.id)) {
          quitarProducto(producto.id);
          decir("Quitado de tu lista.");
        } else {
          const resultado = guardarProducto(producto.id);
          if (!resultado.ok) decir("Tu lista está llena. Quita algún mueble para guardar este.");
          else {
            const aviso = resultado.enMovil ? "" : " Tu navegador no deja guardar datos: se perderá al cerrar la página.";
            decir(`Guardado en tu lista.${aviso} <a href="lista.html">Ver mi lista</a>`);
          }
        }
        boton.outerHTML = botonLista(producto);
        break;
      case "anadir":
        if (alAnadir) decir(escapar(alAnadir(producto)));
        break;
      default: // "plano": es un enlace normal
        break;
    }
  };
  return filas;
}
