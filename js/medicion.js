// Medición: registra qué hace el cliente (eventos) para calcular los KPIs.
//
// - Si hay ID de GA4 en config.js y GA4 está cargado, el evento se envía a GA4.
// - Si no, se escribe en la consola del navegador. Así el prototipo funciona
//   igual sin conexión a GA4.
// La carga de GA4 y el aviso de consentimiento se añaden el día 7.
//
// Nunca se envían datos personales: solo ids de producto, medidas y resultados.

import { CONFIG } from "./config.js";
import { leer, guardar } from "./almacen.js";

// Lista cerrada de eventos. Si alguien escribe mal un nombre, no se envía.
export const EVENTOS = [
  "qr_scan",          // entra escaneando un QR de la tienda (se detecta por el UTM)
  "fit_check",        // se le enseña un semáforo
  "space_add",        // guarda un hueco o la puerta
  "list_create",      // guarda su primer producto: nace una lista
  "list_add",         // guarda un producto en la lista
  "list_share",       // comparte la lista
  "whatsapp_advisor", // escribe al asesor de ALI
  "go_to_shop",       // sale hacia alihogar.es
  "survey_open",      // abre la encuesta CES
  "recommend_view",   // ve resultados del recomendador
  "recommend_click",  // pulsa un resultado del recomendador
  "sign_up",          // crea su cuenta (un lead, si además acepta comunicaciones)
  "login",            // entra con su cuenta
];

/** Por dónde entró el cliente: "qr" (tienda) o "web". Decide el utm_medium de salida. */
export function origenSesion() {
  return leer("origen", "web") === "qr" ? "qr" : "web";
}

/** Registra un evento. Devuelve true si el nombre es válido. */
export function medir(nombre, datos = {}) {
  if (!EVENTOS.includes(nombre)) {
    console.warn(`[medición] «${nombre}» no está en la lista de eventos: no se envía.`);
    return false;
  }
  const completos = { ...datos, origen: origenSesion() };
  if (CONFIG.ga4Id && typeof window.gtag === "function") {
    window.gtag("event", nombre, completos);
  } else {
    console.info("[medición]", nombre, completos);
  }
  return true;
}

/**
 * Mira la dirección con la que se abrió la página y apunta el origen.
 * - Con utm_medium=qr  -> origen "qr" y evento qr_scan.
 * - Con utm_medium=web -> origen "web".
 * - Sin UTM            -> se queda el origen que ya hubiera ("web" si no hay ninguno).
 */
export function registrarEntrada(url = new URL(window.location.href)) {
  const medio = url.searchParams.get("utm_medium");
  if (medio === "qr") {
    guardar("origen", "qr");
    medir("qr_scan", {
      producto: url.searchParams.get("p"),
      ambiente: url.searchParams.get("a"),
      utm_source: url.searchParams.get("utm_source"),
      utm_campaign: url.searchParams.get("utm_campaign"),
    });
  } else if (medio === "web") {
    guardar("origen", "web");
  }
  return origenSesion();
}
