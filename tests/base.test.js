// Pruebas de las piezas básicas: guardar en el móvil, medición y formatos.

import { grupo, prueba, igual, cierto } from "./mini.js";
import { borrar, guardar, leer } from "../js/almacen.js";
import { EVENTOS, medir, origenSesion, registrarEntrada } from "../js/medicion.js";
import { CONSULTAR, cm, escapar, euros, medidas } from "../js/textos.js";

grupo("Almacén · guardar en el móvil");

prueba("lo que se guarda se puede leer después", () => {
  guardar("prueba-test", { ancho: 300, nombre: "Salón" });
  igual(leer("prueba-test"), { ancho: 300, nombre: "Salón" });
  borrar("prueba-test");
});

prueba("si no hay nada guardado, devuelve el valor por defecto", () => {
  igual(leer("clave-que-no-existe", []), []);
});

prueba("un dato estropeado no rompe la web: devuelve el valor por defecto", () => {
  window.localStorage.setItem("amicasa:roto-test", "{esto no es JSON");
  igual(leer("roto-test", "por defecto"), "por defecto");
  window.localStorage.removeItem("amicasa:roto-test");
});

prueba("sin localStorage (modo privado estricto) sigue funcionando en memoria", () => {
  // Se simula un navegador que se niega a guardar y a leer.
  const original = Object.getOwnPropertyDescriptor(window, "localStorage");
  Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new Error("bloqueado"); } });
  try {
    igual(guardar("privado-test", [1, 2]), false, "guardar debe avisar de que no quedó en el móvil");
    igual(leer("privado-test"), [1, 2], "pero el dato sigue disponible en memoria");
    borrar("privado-test");
    igual(leer("privado-test", null), null);
  } finally {
    Object.defineProperty(window, "localStorage", original);
  }
});

grupo("Medición · eventos");

prueba("están los 13 eventos acordados", () => {
  igual([...EVENTOS].sort(), ["fit_check", "go_to_shop", "list_add", "list_create", "list_share", "login", "qr_scan",
    "recommend_click", "recommend_view", "sign_up", "space_add", "survey_open", "whatsapp_advisor"]);
});

prueba("un evento con el nombre mal escrito no se envía", () => {
  igual(medir("evento_inventado"), false);
});

prueba("entrar con el UTM de un QR marca el origen «qr»; con el de la web, «web»", () => {
  const anterior = leer("origen", null);
  try {
    igual(registrarEntrada(new URL("https://ejemplo.test/ficha.html?p=SOF-01&utm_source=qr_tienda&utm_medium=qr&utm_campaign=piloto")), "qr");
    igual(origenSesion(), "qr");
    igual(registrarEntrada(new URL("https://ejemplo.test/lista.html")), "qr", "sin UTM se conserva el origen");
    igual(registrarEntrada(new URL("https://ejemplo.test/que-me-cabe.html?utm_medium=web")), "web");
  } finally {
    if (anterior === null) borrar("origen");
    else guardar("origen", anterior);
  }
});

grupo("Textos · formatos");

prueba("las medidas y los precios se escriben a la española", () => {
  igual(cm(34.5), "34,5 cm");
  igual(cm(180), "180 cm");
  cierto(/^999,99\s€$/.test(euros(999.99)), `precio mal escrito: ${euros(999.99)}`);
});

prueba("si falta un dato se muestra «Consultar en tienda», nunca un número inventado", () => {
  igual(cm(null), CONSULTAR);
  igual(euros(null), CONSULTAR);
  igual(medidas({ ancho_cm: null, fondo_cm: null, alto_cm: null }), CONSULTAR);
  igual(medidas({ ancho_cm: 135, fondo_cm: 190, alto_cm: null }), "135 × 190 × ? cm");
});

prueba("un texto con símbolos de HTML se muestra tal cual y no se ejecuta", () => {
  igual(escapar('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
});
