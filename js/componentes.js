// Piezas de pantalla que se repiten: aviso, foto y tarjeta de producto.
// Cada función recibe datos y devuelve el HTML ya montado.

import { icono, silueta } from "./dibujos.js";
import { NOMBRE_TIPO, escapar, euros, medidas } from "./textos.js";
import { fotoDelColor } from "./logica/colores.js";

/** Aviso de que las medidas son orientativas. */
export function avisoOrientativo() {
  return `<div class="aviso">${icono("info")}<p><strong>Resultado orientativo.</strong> Mide siempre antes de comprar.</p></div>`;
}

/** Dibujo neutro con el nombre, para un producto que no tenga foto autorizada. */
export function marcadorFoto(producto) {
  return `<div class="marcador-foto">
    ${silueta(producto.tipo)}
    <span class="marcador-foto__nota">${escapar(producto.nombre)} · foto no disponible</span>
  </div>`;
}

/**
 * Foto real del producto (cargada desde alihogar.es) si está autorizada; si no, el marcador.
 * Con `colores` (los que filtró el cliente), la foto del mueble en ese color si la web la tiene.
 */
export function fotoProducto(producto, { colores = [] } = {}) {
  if (producto.foto_autorizada && producto.url_foto) {
    const delColor = fotoDelColor(producto, colores);
    const alt = delColor ? `${producto.nombre}, en ${delColor.color.toLowerCase()}` : producto.nombre;
    return `<img class="tarjeta__foto" src="${escapar(delColor?.url ?? producto.url_foto)}" alt="${escapar(alt)}"
      width="400" height="450" loading="lazy">`;
  }
  return marcadorFoto(producto);
}

/**
 * Tarjeta de producto: foto, nombre en mayúsculas, medidas, precio y botón «Ver ficha».
 * `extra` es HTML opcional que va antes del botón (dónde verlo en la tienda, por ejemplo).
 * `botones` cambia el botón «Ver ficha» por otros (los resultados del recomendador lo usan).
 * `colores`: los colores que filtró el cliente, para enseñar la foto en ese color.
 */
export function tarjetaProducto(producto, extra = "", botones = null, { colores = [] } = {}) {
  return `<article class="tarjeta">
    ${fotoProducto(producto, { colores })}
    <div class="tarjeta__cuerpo">
      <p class="tarjeta__tipo">${escapar(NOMBRE_TIPO[producto.tipo] ?? producto.tipo)}</p>
      <h3 class="tarjeta__nombre">${escapar(producto.nombre)}</h3>
      <p class="tarjeta__medidas">${medidas(producto)}</p>
      <p class="tarjeta__precio">${euros(producto.precio_eur)}</p>
      ${extra}
      ${botones ?? `<a class="boton boton--primario" href="ficha.html?p=${encodeURIComponent(producto.id)}">Ver ficha</a>`}
    </div>
  </article>`;
}
