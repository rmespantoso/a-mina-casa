// Piezas de pantalla que se repiten: semáforo, marcador de foto, tarjeta y croquis.
// Cada función recibe datos y devuelve el HTML ya montado.

import { icono, silueta } from "./dibujos.js";
import { NOMBRE_TIPO, escapar, euros, medidas } from "./textos.js";

// Las tres luces del semáforo: siempre color + icono + palabra.
const LUCES = {
  verde: { icono: "cabe", texto: "Cabe" },
  ambar: { icono: "justo", texto: "Justo" },
  rojo: { icono: "no-cabe", texto: "No cabe" },
};

/** Etiqueta del semáforo. `estado` es "verde", "ambar" o "rojo". */
export function chipSemaforo(estado, texto = LUCES[estado].texto) {
  return `<span class="semaforo semaforo--${estado}">${icono(LUCES[estado].icono)}${escapar(texto)}</span>`;
}

/** Aviso obligatorio que acompaña a cualquier semáforo. */
export function avisoOrientativo() {
  return `<div class="aviso">${icono("info")}<p><strong>Resultado orientativo.</strong> Mide siempre antes de comprar.</p></div>`;
}

/**
 * Lo que se enseña en lugar de la foto cuando ALI no la ha autorizado:
 * un dibujo neutro del tipo de mueble con el nombre del producto.
 */
export function marcadorFoto(producto) {
  return `<div class="marcador-foto">
    ${silueta(producto.tipo)}
    <span class="marcador-foto__nombre">${escapar(producto.nombre)}</span>
    <span class="marcador-foto__nota">Dibujo orientativo · foto no disponible</span>
  </div>`;
}

/** Foto del producto si está autorizada; si no, el marcador. */
export function fotoProducto(producto) {
  if (producto.foto_autorizada && producto.url_foto) {
    return `<img src="${escapar(producto.url_foto)}" alt="${escapar(producto.nombre)}" loading="lazy">`;
  }
  return marcadorFoto(producto);
}

/** Tarjeta resumida de un producto. `extra` es HTML opcional (un semáforo, un botón...). */
export function tarjetaProducto(producto, extra = "") {
  return `<article class="tarjeta">
    ${fotoProducto(producto)}
    <div class="tarjeta__cuerpo">
      <p class="tarjeta__tipo">${escapar(NOMBRE_TIPO[producto.tipo] ?? producto.tipo)}</p>
      <h3 class="tarjeta__nombre">${escapar(producto.nombre)}</h3>
      <p class="tarjeta__medidas">${medidas(producto)} <span class="nota">(ancho × fondo × alto)</span></p>
      <p class="tarjeta__precio">${euros(producto.precio_eur)}</p>
      ${extra}
    </div>
  </article>`;
}

/**
 * Croquis a escala: dibuja la pared y, encima, el mueble con su ancho real en proporción.
 * Sirve para ver de un vistazo qué parte de la pared ocupa.
 */
export function croquisPared({ anchoPared, anchoMueble }) {
  const IZQUIERDA = 10;   // margen del dibujo
  const ANCHO = 300;      // ancho de la pared en el dibujo
  const SUELO = 96;
  const proporcion = anchoMueble / anchoPared;
  const porcentaje = Math.round(proporcion * 100);
  const anchoDibujo = Math.min(proporcion, 1) * ANCHO;
  const x = IZQUIERDA + (ANCHO - anchoDibujo) / 2;
  const descripcion = `El mueble mide ${anchoMueble} cm y ocupa el ${porcentaje} % de una pared de ${anchoPared} cm.`;

  return `<svg class="croquis" viewBox="0 0 320 132" role="img" aria-label="${escapar(descripcion)}">
    <rect class="croquis__pared" x="${IZQUIERDA}" y="26" width="${ANCHO}" height="${SUELO - 26}" rx="6"/>
    <path class="croquis__cota" d="M${IZQUIERDA} 14h${ANCHO}M${IZQUIERDA} 8v12M${IZQUIERDA + ANCHO} 8v12"/>
    <rect x="104" y="4" width="112" height="20" fill="var(--fondo)"/>
    <text class="croquis__texto" x="160" y="19" text-anchor="middle">pared ${anchoPared} cm</text>
    <rect class="croquis__mueble" x="${x}" y="58" width="${anchoDibujo}" height="${SUELO - 58}" rx="5"/>
    <path class="croquis__suelo" d="M0 ${SUELO}h320"/>
    <path class="croquis__cota" d="M${x} 110h${anchoDibujo}M${x} 104v12M${x + anchoDibujo} 104v12"/>
    <text class="croquis__texto" x="160" y="129" text-anchor="middle">mueble ${anchoMueble} cm · ${porcentaje} % de la pared</text>
  </svg>`;
}
