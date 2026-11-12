// Dibujos propios en SVG: iconos y siluetas de muebles.
// Están hechos por nosotros con líneas sencillas: no usamos fotos ni logotipos de nadie.

// Iconos de 24 × 24. Solo las líneas; el color lo pone el CSS (clase .icono).
const ICONOS = {
  casa: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  regla: '<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.5 8v3M10 8v4M13.5 8v3M17 8v4"/>',
  lupa: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/>',
  corazon: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  // Semáforo: tres formas distintas para que no dependa solo del color.
  cabe: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.2 9.5"/>',
  justo: '<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  "no-cabe": '<path d="M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3z"/><path d="m9 9 6 6M15 9l-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.3"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.6-4 3.6-6 7.5-6s6.9 2 7.5 6"/>',
  whatsapp:
    '<path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5z"/>' +
    '<path d="M9 8.6c-.3 2.9 2.7 6 5.7 6.2l1-1.4-1.9-1.1-.8.7c-.9-.4-1.7-1.2-2.1-2.1l.7-.8-1.1-1.9z"/>',
};

/** Devuelve el SVG de un icono. Es decorativo: el texto de al lado dice lo mismo. */
export function icono(nombre) {
  return `<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONOS[nombre] ?? ""}</svg>`;
}

// Dibujos de la guía para medir (320 × 170). Usan los mismos estilos que el croquis.
const TRAZOS_GUIA = {
  hueco: {
    descripcion: "Un hueco visto de frente: el ancho va de lado a lado, el alto de abajo arriba y el fondo desde la pared hacia ti.",
    trazos:
      '<rect class="croquis__pared" x="70" y="18" width="200" height="100"/>' +
      '<path class="croquis__suelo" d="M70 118 40 158M270 118l30 40M70 118h200"/>' +
      '<path class="croquis__cota" d="M82 44h176M82 37v14M258 37v14"/>' +
      '<text class="croquis__texto" x="170" y="68" text-anchor="middle">ancho</text>' +
      '<path class="croquis__cota" d="M54 18v100M47 18h14M47 118h14"/>' +
      '<text class="croquis__texto" x="42" y="73" text-anchor="end">alto</text>' +
      '<path class="croquis__cota" d="m284 122 24 32M278 126l12-8M302 158l12-8"/>' +
      '<text class="croquis__texto" x="268" y="150" text-anchor="end">fondo</text>',
  },
  rodapie: {
    descripcion: "Una pared vista de lado con un rodapié y un radiador: el fondo se mide desde el radiador, que es lo que más sobresale.",
    trazos:
      '<rect class="croquis__pared" x="40" y="8" width="16" height="122"/>' +
      '<rect class="croquis__mueble" x="56" y="50" width="24" height="52"/>' +
      '<rect class="croquis__pared" x="56" y="112" width="9" height="18" stroke="var(--texto)" stroke-width="1.5"/>' +
      '<path class="croquis__suelo" d="M20 130h280"/>' +
      '<path class="croquis__cota" d="M80 76h180M80 68v16M260 68v16"/>' +
      '<text class="croquis__texto" x="170" y="62" text-anchor="middle">fondo libre</text>' +
      '<text class="croquis__texto" x="160" y="160" text-anchor="middle">desde lo que sobresale</text>',
  },
  puerta: {
    descripcion: "Una puerta vista de frente: el ancho y el alto se miden por dentro del marco.",
    trazos:
      '<rect x="104" y="10" width="112" height="140" fill="none" stroke="var(--texto)" stroke-width="1.5"/>' +
      '<rect class="croquis__pared" x="116" y="22" width="88" height="128"/>' +
      '<path class="croquis__suelo" d="M40 150h240"/>' +
      '<path class="croquis__cota" d="M116 96h88M116 88v16M204 88v16"/>' +
      '<text class="croquis__texto" x="160" y="82" text-anchor="middle">ancho</text>' +
      '<path class="croquis__cota" d="M238 22v128M230 22h16M230 150h16"/>' +
      '<text class="croquis__texto" x="250" y="92">alto</text>',
  },
};

/** Devuelve el dibujo de un paso de la guía para medir: "hueco", "rodapie" o "puerta". */
export function dibujoGuia(nombre) {
  const dibujo = TRAZOS_GUIA[nombre];
  if (!dibujo) return "";
  return `<svg class="croquis croquis--guia" viewBox="0 0 320 170" role="img" aria-label="${dibujo.descripcion}">${dibujo.trazos}</svg>`;
}

// Siluetas de 120 × 80, una por cada tipo de mueble del CSV.
const SILUETAS = {
  sofa:
    '<rect x="22" y="20" width="76" height="28" rx="8"/><rect x="10" y="34" width="18" height="28" rx="7"/>' +
    '<rect x="92" y="34" width="18" height="28" rx="7"/><rect x="28" y="44" width="64" height="18" rx="5"/>' +
    '<path d="M20 62v7M100 62v7"/>',
  mueble_tv:
    '<rect x="38" y="10" width="44" height="26" rx="2"/><path d="M60 36v6"/>' +
    '<rect x="12" y="42" width="96" height="22" rx="3"/><path d="M44 42v22M76 42v22M20 64v7M100 64v7"/>',
  aparador:
    '<rect x="14" y="24" width="92" height="38" rx="3"/><path d="M45 24v38M75 24v38M22 62v9M98 62v9"/>' +
    '<path d="M38 41v4M52 41v4M82 41v4"/>',
  estanteria: '<rect x="38" y="6" width="44" height="68" rx="2"/><path d="M38 23h44M38 40h44M38 57h44"/>',
  cama_canape:
    '<rect x="10" y="20" width="10" height="50" rx="2"/><rect x="24" y="35" width="26" height="10" rx="5"/>' +
    '<rect x="20" y="45" width="90" height="13" rx="4"/><path d="M20 58h90v8H20zM108 66v5"/>',
  comoda:
    '<rect x="30" y="14" width="60" height="52" rx="3"/><path d="M30 31h60M30 48h60M36 66v7M84 66v7"/>' +
    '<path d="M54 22.5h12M54 39.5h12M54 57h12"/>',
  mesa_comedor: '<rect x="10" y="30" width="100" height="8" rx="2"/><path d="m20 38-4 33M100 38l4 33"/>',
  recibidor:
    '<rect x="46" y="6" width="28" height="32" rx="14"/><rect x="32" y="46" width="56" height="20" rx="2"/>' +
    '<path d="M60 46v20M38 66v7M82 66v7"/>',
};

/** Devuelve el SVG de la silueta de un tipo de mueble. Si el tipo no existe, un rectángulo neutro. */
export function silueta(tipo) {
  const trazos = SILUETAS[tipo] ?? '<rect x="20" y="20" width="80" height="44" rx="4"/>';
  return `<svg class="marcador-foto__dibujo" viewBox="0 0 120 80" aria-hidden="true" focusable="false">${trazos}</svg>`;
}
