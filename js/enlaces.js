// Enlaces que salen de la herramienta: alihogar.es (siempre con UTM) y WhatsApp del asesor.

import { CONFIG } from "./config.js";
import { origenSesion } from "./medicion.js";

/**
 * Añade los UTM a un enlace de alihogar.es:
 * utm_source=amicasa, utm_medium=qr o web (según por dónde entró el cliente) y utm_campaign=piloto.
 * Si el enlace no es de alihogar.es o falta, devuelve null: no se enlaza a otro sitio.
 */
export function enlaceTienda(url, medio = origenSesion()) {
  if (!url || !url.startsWith("https://alihogar.es/")) return null;
  const destino = new URL(url);
  destino.searchParams.set("utm_source", CONFIG.utmSalida.source);
  destino.searchParams.set("utm_medium", medio === "qr" ? "qr" : "web");
  destino.searchParams.set("utm_campaign", CONFIG.utmSalida.campaign);
  return destino.href;
}

/** Enlace para escribir al asesor de ALI por WhatsApp con un texto ya preparado. */
export function enlaceAsesor(texto = "Hola, tengo una duda sobre un mueble.") {
  return `https://wa.me/${CONFIG.whatsappAsesor}?text=${encodeURIComponent(texto)}`;
}
