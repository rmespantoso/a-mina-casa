// ÚNICO archivo de configuración del prototipo.
// Todo lo que puede cambiar sin tocar el resto del código está aquí.

export const CONFIG = {
  // ID de medición de Google Analytics 4 (tiene la forma "G-XXXXXXXXXX").
  // Mientras esté vacío, los eventos solo se escriben en la consola del navegador.
  ga4Id: "",

  // Dirección pública del prototipo en GitHub Pages, acabada en "/".
  // Ejemplo: "https://usuario.github.io/alimicasa/". La usan los códigos QR (día 6).
  urlPublicada: "",

  // WhatsApp del asesor de ALI Hogar (604 06 57 88), con el prefijo de España.
  whatsappAsesor: "34604065788",
  telefonoAsesor: "604 06 57 88",

  // Enlace al Google Form con la pregunta CES. Vacío = "Encuesta disponible pronto".
  urlEncuesta: "",

  // Fecha en la que se consultaron precios y medidas en alihogar.es.
  fechaDatos: "10/11/2026",

  // UTM de los enlaces que SALEN hacia alihogar.es.
  // El "medium" (qr o web) lo decide medicion.js según por dónde entró el cliente.
  utmSalida: { source: "amicasa", campaign: "piloto" },

  // UTM que llevan los códigos QR de la tienda al ENTRAR en el prototipo.
  utmEntradaQr: { source: "qr_tienda", medium: "qr", campaign: "piloto" },
};
