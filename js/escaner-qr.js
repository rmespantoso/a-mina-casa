// Escáner de códigos QR con la cámara del móvil (15/11/2026), para «Escanea un código QR»
// de Mi plano 3D.
//
// La imagen de la cámara se mira en el propio móvil y no se guarda ni se envía a ningún sitio.
// Para leer el código:
//   - Chrome en Android (y otros) traen un lector propio (BarcodeDetector): se usa ese.
//   - Safari del iPhone no lo tiene: se carga la librería js/vendor/jsQR.js (Apache 2.0),
//     solo la primera vez que hace falta.
// La cámara solo funciona en páginas seguras (https o localhost).

const URL_JSQR = new URL("./vendor/jsQR.js", import.meta.url).href;
const CADA_MS = 250; // cada cuánto se mira la imagen
const LADO_MAX = 640; // la imagen se reduce para que vaya rápido

let cargaJsQr = null;

function cargarJsQr() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  if (!cargaJsQr) {
    cargaJsQr = new Promise((resolver, fallar) => {
      const script = document.createElement("script");
      script.src = URL_JSQR;
      script.onload = () => (window.jsQR ? resolver(window.jsQR) : fallar(new Error("jsQR no se ha cargado")));
      script.onerror = () => {
        cargaJsQr = null;
        fallar(new Error("No se pudo cargar el lector de QR"));
      };
      document.head.append(script);
    });
  }
  return cargaJsQr;
}

async function crearLector() {
  if ("BarcodeDetector" in window) {
    try {
      const formatos = await window.BarcodeDetector.getSupportedFormats();
      if (formatos.includes("qr_code")) {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
      }
    } catch { /* si falla, se usa jsQR */ }
  }
  const jsQR = await cargarJsQr();
  const lienzo = document.createElement("canvas");
  const ctx = lienzo.getContext("2d", { willReadFrequently: true });
  return async (video) => {
    const escala = Math.min(1, LADO_MAX / Math.max(video.videoWidth, video.videoHeight));
    lienzo.width = Math.round(video.videoWidth * escala);
    lienzo.height = Math.round(video.videoHeight * escala);
    if (!lienzo.width || !lienzo.height) return null;
    ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);
    const { data } = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
    return jsQR(data, lienzo.width, lienzo.height, { inversionAttempts: "dontInvert" })?.data ?? null;
  };
}

/** Texto para el cliente según el error de la cámara. */
export function motivoError(error) {
  if (!window.isSecureContext) return "La cámara solo funciona en páginas seguras (https). Escribe la referencia de la etiqueta.";
  if (!navigator.mediaDevices?.getUserMedia) return "Tu navegador no deja usar la cámara. Escribe la referencia de la etiqueta.";
  switch (error?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "No has dado permiso para usar la cámara. Puedes darlo en los ajustes del navegador o escribir la referencia de la etiqueta.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No encontramos ninguna cámara en este aparato. Escribe la referencia de la etiqueta.";
    case "NotReadableError":
      return "La cámara está ocupada por otra aplicación. Ciérrala y vuelve a probar.";
    default:
      return "No hemos podido abrir la cámara. Escribe la referencia de la etiqueta.";
  }
}

/**
 * Prepara el escáner dentro de `video` (un <video> de la página).
 * `alLeer(texto)` recibe el texto del primer QR leído; después la cámara se apaga sola.
 * `alApagar()` avisa si la cámara se apaga sola por cambiar de app o de pestaña.
 * Devuelve { abrir(): Promise, cerrar() }. `abrir` lanza el error si la cámara no se abre.
 */
export function crearEscaner(video, { alLeer, alApagar = () => {} }) {
  let flujo = null;
  let temporizador = null;
  let activo = false;

  function cerrar() {
    activo = false;
    clearTimeout(temporizador);
    flujo?.getTracks().forEach((pista) => pista.stop());
    flujo = null;
    video.srcObject = null;
  }

  async function abrir() {
    cerrar();
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("sin cámara");
    const lector = await crearLector();
    flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    video.setAttribute("playsinline", "");
    video.muted = true;
    video.srcObject = flujo;
    await video.play();
    activo = true;
    const mirar = async () => {
      if (!activo) return;
      try {
        const texto = video.readyState >= 2 ? await lector(video) : null;
        if (texto && activo) {
          cerrar();
          alLeer(texto);
          return;
        }
      } catch { /* una imagen que no se puede leer: se prueba con la siguiente */ }
      temporizador = setTimeout(mirar, CADA_MS);
    };
    mirar();
  }

  // Si el cliente cambia de app o de pestaña, la cámara se apaga.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && activo) {
      cerrar();
      alApagar();
    }
  });
  window.addEventListener("pagehide", cerrar);

  return { abrir, cerrar, get activo() { return activo; } };
}
