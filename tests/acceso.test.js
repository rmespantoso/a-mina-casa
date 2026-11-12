// Pruebas de invitado y registrado, y de los enlaces que salen de la herramienta.

import { grupo, prueba, igual, cierto } from "./mini.js";
import { borrar, guardar, leer } from "../js/almacen.js";
import { destinoSeguro, entrarConDemo, estaRegistrado, puedeUsar, salir, sesion } from "../js/sesion.js";
import { enlaceAsesor, enlaceTienda } from "../js/enlaces.js";

/** Ejecuta una prueba y deja la sesión del navegador como estaba antes. */
function conSesionLimpia(funcion) {
  return () => {
    const anterior = leer("sesion", null);
    borrar("sesion");
    try {
      funcion();
    } finally {
      if (anterior === null) borrar("sesion");
      else guardar("sesion", anterior);
    }
  };
}

grupo("Acceso · invitado y registrado");

prueba("sin haber entrado, se es invitado", conSesionLimpia(() => {
  igual(sesion().tipo, "invitado");
  igual(estaRegistrado(), false);
}));

prueba("el invitado puede usar huecos, semáforo y lista, pero no el recomendador", conSesionLimpia(() => {
  igual(puedeUsar("huecos"), true);
  igual(puedeUsar("semaforo"), true);
  igual(puedeUsar("lista"), true);
  igual(puedeUsar("recomendador"), false);
}));

prueba("al entrar con la cuenta de demostración se desbloquea el recomendador", conSesionLimpia(() => {
  entrarConDemo({ esNueva: true });
  igual(estaRegistrado(), true);
  igual(puedeUsar("recomendador"), true);
}));

prueba("la cuenta de demostración no guarda correo, teléfono ni contraseña", conSesionLimpia(() => {
  entrarConDemo({ esNueva: true });
  igual(Object.keys(sesion()).sort(), ["esDemo", "nombre", "quiereNoticias", "tipo"]);
}));

prueba("recibir publicidad va aparte: sin marcar la casilla, queda en «no»", conSesionLimpia(() => {
  igual(entrarConDemo({ esNueva: true }).quiereNoticias, false);
  igual(entrarConDemo({ esNueva: true, quiereNoticias: true }).quiereNoticias, true);
}));

prueba("al cerrar sesión se vuelve a ser invitado", conSesionLimpia(() => {
  entrarConDemo();
  salir();
  igual(estaRegistrado(), false);
}));

prueba("una sesión estropeada o manipulada se trata como invitado", conSesionLimpia(() => {
  guardar("sesion", { tipo: "administrador" });
  igual(estaRegistrado(), false);
  guardar("sesion", "texto raro");
  igual(estaRegistrado(), false);
}));

prueba("después de entrar solo se vuelve a páginas de la herramienta", () => {
  igual(destinoSeguro("que-me-cabe"), "que-me-cabe.html");
  igual(destinoSeguro("ficha", "SOF-01"), "ficha.html?p=SOF-01");
  igual(destinoSeguro("ficha", "<script>"), "ficha.html");
  igual(destinoSeguro("https://otra-web.example"), "index.html");
  igual(destinoSeguro(null), "index.html");
});

grupo("Enlaces · alihogar.es y asesor");

prueba("un enlace a alihogar.es sale con sus tres UTM", () => {
  const enlace = new URL(enlaceTienda("https://alihogar.es/sofas/17736-sofa.html", "qr"));
  igual(enlace.searchParams.get("utm_source"), "amicasa");
  igual(enlace.searchParams.get("utm_medium"), "qr");
  igual(enlace.searchParams.get("utm_campaign"), "piloto");
});

prueba("el medio es «web» salvo que se haya entrado por un QR", () => {
  igual(new URL(enlaceTienda("https://alihogar.es/x.html", "web")).searchParams.get("utm_medium"), "web");
  igual(new URL(enlaceTienda("https://alihogar.es/x.html", "otra-cosa")).searchParams.get("utm_medium"), "web");
});

prueba("no se enlaza a webs que no sean alihogar.es, ni cuando falta el enlace", () => {
  igual(enlaceTienda("https://otra-tienda.example/sofa.html", "web"), null);
  igual(enlaceTienda(null, "web"), null);
});

prueba("el enlace del asesor va al WhatsApp de ALI (604 06 57 88) con el texto preparado", () => {
  const enlace = enlaceAsesor("¿Me cabe este sofá?");
  cierto(enlace.startsWith("https://wa.me/34604065788?text="), enlace);
  igual(new URL(enlace).searchParams.get("text"), "¿Me cabe este sofá?");
});
