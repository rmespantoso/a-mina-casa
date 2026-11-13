// Medición: registra qué hace el cliente (eventos) para calcular los KPIs.
//
// - Si hay ID de GA4 en config.js Y el cliente ha aceptado la medición, el evento
//   se envía a GA4. GA4 no se carga nunca antes de que el cliente diga que sí.
// - Si no, se escribe en la consola del navegador. Así el prototipo funciona
//   igual sin conexión a GA4.
// El aviso con los dos botones está en js/consentimiento.js.
//
// Nunca se envían datos personales: solo ids de producto, medidas y resultados.

import { CONFIG } from "./config.js";
import { leer, guardar } from "./almacen.js";

// Lista cerrada de eventos. Si alguien escribe mal un nombre, no se envía.
export const EVENTOS = [
  "qr_scan",          // entra escaneando un QR de la tienda (se detecta por el UTM)
  "fit_check",        // se le enseña un semáforo
  "space_add",        // guarda un hueco
  "list_create",      // guarda su primer producto: nace una lista
  "list_add",         // guarda un producto en la lista
  "list_share",       // comparte la lista
  "whatsapp_advisor", // escribe al asesor de ALI
  "go_to_shop",       // sale hacia alihogar.es
  "add_to_cart",      // pulsa «Añadir al carrito» (en el prototipo es una demostración)
  "survey_open",      // abre la encuesta CES
  "recommend_view",   // ve resultados del recomendador
  "recommend_click",  // pulsa un resultado del recomendador
  "sign_up",          // crea su cuenta (un lead, si además acepta comunicaciones)
  "login",            // entra con su cuenta
];

// ---------- Consentimiento ----------

/** ¿Hay algo que pedir? Sin ID de GA4 no se mide nada fuera del navegador. */
export function hayMedicion() {
  return typeof CONFIG.ga4Id === "string" && /^G-[A-Z0-9]{4,}$/.test(CONFIG.ga4Id);
}

/** Lo que decidió el cliente: "si", "no" o null si todavía no ha contestado. */
export function decisionMedicion() {
  const valor = leer("consentimiento", null);
  return valor === "si" || valor === "no" ? valor : null;
}

/**
 * La dirección de la página que se cuenta en GA4, sin nada escrito por el cliente.
 * Solo se conservan el mueble, el ambiente y los UTM: fuera medidas, nombres de
 * huecos y listas compartidas.
 */
export function direccionLimpia(url) {
  const original = new URL(url);
  const limpia = new URL(original.origin + original.pathname);
  // Cada dato solo viaja si tiene su forma exacta («a» es el ambiente en un QR,
  // pero el ancho de la pared en «¿Qué me cabe?»: ese no pasa).
  const FORMAS = {
    p: /^[A-Z]{2,4}-\d{2,3}$/,
    a: /^AMB-\d{2}$/,
    utm_source: /^[\w-]{1,40}$/,
    utm_medium: /^[\w-]{1,40}$/,
    utm_campaign: /^[\w-]{1,40}$/,
  };
  for (const [clave, forma] of Object.entries(FORMAS)) {
    const valor = original.searchParams.get(clave);
    if (valor !== null && forma.test(valor)) limpia.searchParams.set(clave, valor);
  }
  return limpia.href;
}

// Eventos de esta página que ocurrieron antes de contestar al aviso. Si el cliente
// acepta, se envían; si rechaza o no contesta, se pierden al salir de la página.
const enEspera = [];

/** Carga GA4. Solo se llama cuando el cliente ha aceptado. */
export function activarMedicion() {
  if (!hayMedicion() || typeof window.gtag === "function") return false;
  window[`ga-disable-${CONFIG.ga4Id}`] = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", CONFIG.ga4Id, {
    page_location: direccionLimpia(window.location.href),
    page_referrer: document.referrer ? direccionLimpia(document.referrer) : "",
    allow_google_signals: false,             // sin publicidad ni perfiles
    allow_ad_personalization_signals: false,
  });
  const etiqueta = document.createElement("script");
  etiqueta.async = true;
  etiqueta.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(CONFIG.ga4Id)}`;
  document.head.append(etiqueta);
  for (const [nombre, datos] of enEspera.splice(0)) window.gtag("event", nombre, datos);
  return true;
}

/** Apaga GA4 y borra sus cookies. Se llama cuando el cliente rechaza o cambia de idea. */
export function desactivarMedicion() {
  enEspera.length = 0;
  if (!hayMedicion()) return;
  window[`ga-disable-${CONFIG.ga4Id}`] = true;
  window.gtag = undefined;
  try {
    for (const trozo of document.cookie.split(";")) {
      const nombre = trozo.split("=")[0].trim();
      if (nombre.startsWith("_ga")) document.cookie = `${nombre}=; Max-Age=0; path=/`;
    }
  } catch { /* si no se pueden tocar las cookies, GA4 ya está apagado igualmente */ }
}

/** Guarda la decisión del cliente y la aplica al momento. */
export function decidirMedicion(acepta) {
  guardar("consentimiento", acepta ? "si" : "no");
  if (acepta) activarMedicion();
  else desactivarMedicion();
}

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
  if (hayMedicion() && typeof window.gtag === "function") {
    window.gtag("event", nombre, completos);
  } else {
    // Sin permiso todavía: se guarda solo en memoria por si acepta en esta misma página.
    if (hayMedicion() && decisionMedicion() === null && enEspera.length < 20) enEspera.push([nombre, completos]);
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
