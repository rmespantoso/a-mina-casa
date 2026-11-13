// Pruebas del consentimiento: GA4 no se carga sin permiso y nunca recibe lo que escribe el cliente.

import { grupo, prueba, igual, cierto } from "./mini.js";
import { CONFIG } from "../js/config.js";
import { borrar, guardar, leer } from "../js/almacen.js";
import { activarMedicion, decidirMedicion, decisionMedicion, direccionLimpia, hayMedicion, medir } from "../js/medicion.js";

/** Ejecuta una prueba con un ID de GA4 y una decisión concretos, y lo deja todo como estaba. */
function con(ga4Id, decision, funcion) {
  return () => {
    const idAntes = CONFIG.ga4Id;
    const decisionAntes = leer("consentimiento", null);
    const gtagAntes = window.gtag;
    CONFIG.ga4Id = ga4Id;
    window.gtag = undefined;
    if (decision === null) borrar("consentimiento"); else guardar("consentimiento", decision);
    try {
      funcion();
    } finally {
      CONFIG.ga4Id = idAntes;
      window.gtag = gtagAntes;
      if (decisionAntes === null) borrar("consentimiento"); else guardar("consentimiento", decisionAntes);
    }
  };
}

grupo("Medición · consentimiento");

prueba("sin ID de GA4 no hay nada que medir ni que preguntar", con("", null, () => {
  igual(hayMedicion(), false);
  igual(activarMedicion(), false);
  igual(typeof window.gtag, "undefined");
}));

prueba("un ID con mala forma se trata como si no hubiera", con("<script>", null, () => {
  igual(hayMedicion(), false);
}));

prueba("mientras el cliente no contesta, la decisión es «sin contestar»", con("G-PRUEBA1234", null, () => {
  igual(hayMedicion(), true);
  igual(decisionMedicion(), null);
}));

prueba("un valor raro guardado cuenta como «sin contestar»", con("G-PRUEBA1234", "quizas", () => {
  igual(decisionMedicion(), null);
}));

prueba("sin permiso, un evento no llega a GA4", con("G-PRUEBA1234", null, () => {
  window.gtag = undefined;
  cierto(medir("list_add", { producto: "SOF-01" }), "el evento es válido");
  igual(typeof window.gtag, "undefined", "medir no debe cargar GA4 por su cuenta");
}));

prueba("rechazar se guarda y deja GA4 apagado", con("G-PRUEBA1234", null, () => {
  decidirMedicion(false);
  igual(decisionMedicion(), "no");
  igual(window["ga-disable-G-PRUEBA1234"], true);
  igual(typeof window.gtag, "undefined");
}));

grupo("Medición · dirección que se envía");

prueba("se conservan el mueble y los UTM del QR", () => {
  igual(
    direccionLimpia("https://ejemplo.test/amicasa/ficha.html?p=SOF-01&utm_source=qr_tienda&utm_medium=qr&utm_campaign=piloto"),
    "https://ejemplo.test/amicasa/ficha.html?p=SOF-01&utm_source=qr_tienda&utm_medium=qr&utm_campaign=piloto",
  );
});

prueba("se quitan la lista compartida y los nombres de los huecos", () => {
  igual(
    direccionLimpia("https://ejemplo.test/amicasa/lista.html?v=1&c=ALI-7K3F&l=SOF-02.TV-04&h=salon;260;100;250;Casa%20de%20Mar%C3%ADa"),
    "https://ejemplo.test/amicasa/lista.html",
  );
});

prueba("se quitan las medidas escritas en «¿Qué me cabe?»", () => {
  igual(direccionLimpia("https://ejemplo.test/que-me-cabe.html?e=salon&t=sofa&a=260&f=100"), "https://ejemplo.test/que-me-cabe.html");
});

prueba("un valor con símbolos raros no viaja", () => {
  igual(direccionLimpia("https://ejemplo.test/ficha.html?p=%3Cscript%3E#trozo"), "https://ejemplo.test/ficha.html");
});
