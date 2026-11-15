// Direcciones que llevan dentro los códigos QR de la tienda.
// Es lógica pura: el dibujo del QR lo hace la página de etiquetas con js/vendor/qrcode.js.
//
// Todo QR entra en el prototipo con los UTM de entrada de config.js
// (utm_source=qr_tienda&utm_medium=qr&utm_campaign=piloto): así se cuenta el evento qr_scan.

const FORMA_PRODUCTO = /^[A-Z]{2,4}-\d{2,3}$/;
const FORMA_AMBIENTE = /^AMB-\d{2}$/;

function conUtm(enlace, utm) {
  enlace.searchParams.set("utm_source", utm.source);
  enlace.searchParams.set("utm_medium", utm.medium);
  enlace.searchParams.set("utm_campaign", utm.campaign);
  return enlace.href;
}

/** Dirección del QR de un mueble: abre su ficha viva. `base` es la carpeta del prototipo, acabada en «/». */
export function enlaceQrProducto(base, id, utm) {
  if (!FORMA_PRODUCTO.test(id)) return null;
  const enlace = new URL("ficha.html", base);
  enlace.searchParams.set("p", id);
  return conUtm(enlace, utm);
}

/** Dirección del QR de un ambiente: abre el conjunto entero. */
export function enlaceQrAmbiente(base, id, utm) {
  if (!FORMA_AMBIENTE.test(id)) return null;
  const enlace = new URL("ambiente.html", base);
  enlace.searchParams.set("a", id);
  return conUtm(enlace, utm);
}

/**
 * ¿Apunta la dirección a este ordenador o a la red de casa (wifi)? Un QR así no
 * funciona en el móvil de un cliente fuera de esa red.
 */
export function esDePrueba(base) {
  const { hostname } = new URL(base);
  if (hostname === "localhost" || hostname === "[::1]" || hostname.endsWith(".local")) return true;
  const partes = hostname.split(".").map(Number);
  if (partes.length !== 4 || partes.some((parte) => !Number.isInteger(parte))) return false;
  const [a, b] = partes;
  return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
}

/**
 * Limpia los ambientes leídos del JSON: solo quedan los que tienen id, nombre y
 * muebles que existen en el catálogo (los que no existen se quitan y se cuentan).
 */
export function prepararAmbientes(ambientes, productos) {
  if (!Array.isArray(ambientes)) return [];
  return ambientes
    .filter((ambiente) => ambiente && FORMA_AMBIENTE.test(ambiente.id) && typeof ambiente.nombre === "string" && Array.isArray(ambiente.productos))
    .map((ambiente) => {
      const ids = [...new Set(ambiente.productos)];
      const encontrados = ids.map((id) => productos.find((producto) => producto.id === id)).filter(Boolean);
      return {
        id: ambiente.id,
        nombre: ambiente.nombre,
        estancia: ambiente.estancia,
        esEjemplo: ambiente.estado !== "validado",
        productos: encontrados,
        perdidos: ids.length - encontrados.length,
      };
    });
}

// ---------- Leer un QR desde Mi plano 3D (15/11/2026) ----------
// «Escanea un código QR» del plano lee el texto del código y aquí se decide qué es.
// Solo valen las direcciones de este prototipo (la publicada o la carpeta desde la que se
// usa): de ellas se saca el mueble o el ambiente y NUNCA se abre la dirección leída.

/**
 * Qué hay dentro de un QR leído. `bases`: carpetas válidas del prototipo, acabadas en «/».
 * Devuelve { tipo: "producto", id } · { tipo: "ambiente", id } · null (no es nuestro).
 */
export function leerCodigoQr(texto, bases) {
  let enlace;
  try {
    enlace = new URL(String(texto ?? "").trim());
  } catch {
    return null;
  }
  if (enlace.protocol !== "https:" && enlace.protocol !== "http:") return null;
  const base = bases.filter(Boolean).map((actual) => new URL(actual))
    .find((actual) => actual.origin === enlace.origin && enlace.pathname.startsWith(actual.pathname));
  if (!base) return null;
  const pagina = enlace.pathname.slice(base.pathname.length);
  if (pagina === "ficha.html") {
    const id = enlace.searchParams.get("p") ?? "";
    return FORMA_PRODUCTO.test(id) ? { tipo: "producto", id } : null;
  }
  if (pagina === "ambiente.html") {
    const id = enlace.searchParams.get("a") ?? "";
    return FORMA_AMBIENTE.test(id) ? { tipo: "ambiente", id } : null;
  }
  return null;
}

/**
 * La referencia escrita a mano (la que va impresa en la etiqueta). Acepta «sof-02»,
 * «SOF 02» o «sof02» y devuelve "SOF-02"; si no tiene esa forma, null.
 */
export function leerReferencia(texto) {
  const limpio = String(texto ?? "").trim().toUpperCase().replace(/[\s_.]+/g, "-");
  const partes = limpio.match(/^([A-Z]{2,4})-?(\d{2,3})$/);
  if (!partes) return null;
  const id = `${partes[1]}-${partes[2]}`;
  return FORMA_PRODUCTO.test(id) ? id : null;
}
