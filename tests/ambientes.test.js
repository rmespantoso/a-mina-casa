// Pruebas de los ambientes y de las direcciones que van dentro de los códigos QR.

import { grupo, prueba, igual, cierto } from "./mini.js";
import { CONFIG } from "../js/config.js";
import { borrar, guardar, leer } from "../js/almacen.js";
import { cargarAmbientes, cargarDatos } from "../js/datos.js";
import { registrarEntrada } from "../js/medicion.js";
import { enlaceQrAmbiente, enlaceQrProducto, esDePrueba, leerCodigoQr, leerReferencia, prepararAmbientes } from "../js/logica/qr.js";
import { guardarVarios, leerLista } from "../js/mi-lista.js";

const BASE = "https://ejemplo.test/amicasa/";
const UTM = CONFIG.utmEntradaQr;

grupo("QR · direcciones");

prueba("el QR de un mueble abre su ficha con los tres UTM de entrada", () => {
  const enlace = new URL(enlaceQrProducto(BASE, "SOF-01", UTM));
  igual(enlace.origin + enlace.pathname, "https://ejemplo.test/amicasa/ficha.html");
  igual(enlace.searchParams.get("p"), "SOF-01");
  igual(enlace.searchParams.get("utm_source"), "qr_tienda");
  igual(enlace.searchParams.get("utm_medium"), "qr");
  igual(enlace.searchParams.get("utm_campaign"), "piloto");
});

prueba("un mueble con id de 3 cifras también tiene QR", () => {
  igual(new URL(enlaceQrProducto(BASE, "MCE-134", UTM)).searchParams.get("p"), "MCE-134");
});

prueba("el QR de un ambiente abre el conjunto con los mismos UTM", () => {
  const enlace = new URL(enlaceQrAmbiente(BASE, "AMB-01", UTM));
  igual(enlace.pathname, "/amicasa/ambiente.html");
  igual(enlace.searchParams.get("a"), "AMB-01");
  igual(enlace.searchParams.get("utm_medium"), "qr");
});

prueba("no se crea un QR para un identificador con mala forma", () => {
  igual(enlaceQrProducto(BASE, "<script>", UTM), null);
  igual(enlaceQrProducto(BASE, "MCE-1234", UTM), null);
  igual(enlaceQrProducto(BASE, "AMB-1", UTM), null);
  igual(enlaceQrAmbiente(BASE, "SOF-01", UTM), null);
});

prueba("se sabe cuándo un QR es de prueba (apunta a este ordenador)", () => {
  igual(esDePrueba("http://localhost:8000/"), true);
  igual(esDePrueba("http://127.0.0.1:8000/"), true);
  igual(esDePrueba("http://192.168.1.134:8000/"), true, "la wifi de casa también es de prueba");
  igual(esDePrueba("http://10.0.0.5/"), true);
  igual(esDePrueba("http://172.20.1.1/"), true);
  igual(esDePrueba("http://172.40.1.1/"), false);
  igual(esDePrueba("https://usuario.github.io/alimicasa/"), false);
});

prueba("entrar por el QR de un ambiente marca el origen «qr»", () => {
  const anterior = leer("origen", null);
  try {
    borrar("origen");
    igual(registrarEntrada(new URL(enlaceQrAmbiente(BASE, "AMB-01", UTM))), "qr");
  } finally {
    if (anterior === null) borrar("origen");
    else guardar("origen", anterior);
  }
});

grupo("Ambientes · datos");

prueba("cada ambiente tiene id, nombre, estancia y al menos dos muebles", async () => {
  const ambientes = await cargarAmbientes();
  cierto(ambientes.length > 0, "no hay ningún ambiente");
  for (const ambiente of ambientes) {
    cierto(/^AMB-\d{2}$/.test(ambiente.id), `id raro: ${ambiente.id}`);
    cierto(ambiente.nombre && ambiente.nombre.trim() !== "", `${ambiente.id} no tiene nombre`);
    cierto(["salon", "comedor", "dormitorio", "recibidor"].includes(ambiente.estancia), `${ambiente.id}: estancia «${ambiente.estancia}»`);
    cierto(ambiente.productos.length >= 2, `${ambiente.id} tiene menos de 2 muebles`);
  }
  igual(new Set(ambientes.map((a) => a.id)).size, ambientes.length, "hay ids de ambiente repetidos");
});

prueba("todos los muebles de los ambientes existen en el catálogo, sin repetir", async () => {
  const [{ productos }, ambientes] = await Promise.all([cargarDatos(), cargarAmbientes()]);
  const ids = productos.map((p) => p.id);
  for (const ambiente of ambientes) {
    igual(ambiente.productos.filter((id) => !ids.includes(id)), [], `${ambiente.id} tiene muebles que no existen`);
    igual(new Set(ambiente.productos).size, ambiente.productos.length, `${ambiente.id} repite muebles`);
  }
});

prueba("un ambiente sin validar se marca como ejemplo; los muebles que no existen se quitan y se cuentan", () => {
  const catalogo = [{ id: "SOF-01" }, { id: "TV-01" }];
  const [uno, dos] = prepararAmbientes([
    { id: "AMB-01", nombre: "Salón", estancia: "salon", estado: "ejemplo", productos: ["SOF-01", "XXX-99", "TV-01", "SOF-01"] },
    { id: "AMB-02", nombre: "Otro", estancia: "salon", estado: "validado", productos: ["TV-01"] },
    { id: "raro", nombre: "Mal", productos: [] },
    null,
  ], catalogo);
  igual(uno.productos.map((p) => p.id), ["SOF-01", "TV-01"]);
  igual(uno.perdidos, 1);
  igual(uno.esEjemplo, true);
  igual(dos.esEjemplo, false);
  igual(prepararAmbientes("texto raro", catalogo), []);
});

grupo("Ambientes · guardar el conjunto");

/** Ejecuta una prueba sin lista guardada y deja el navegador como estaba. */
function conListaLimpia(funcion) {
  return () => {
    const antes = leer("lista", null);
    borrar("lista");
    try {
      funcion();
    } finally {
      if (antes === null) borrar("lista"); else guardar("lista", antes);
    }
  };
}

prueba("«Guardar todo» mete el conjunto entero en la lista", conListaLimpia(() => {
  igual(guardarVarios(["SOF-02", "TV-01", "APA-01"]), { anadidos: 3, repetidos: 0, sinSitio: 0 });
  igual(leerLista().productos, ["SOF-02", "TV-01", "APA-01"]);
}));

prueba("no duplica lo que ya estaba en la lista", conListaLimpia(() => {
  guardarVarios(["TV-01"]);
  igual(guardarVarios(["SOF-02", "TV-01", "APA-01"]), { anadidos: 2, repetidos: 1, sinSitio: 0 });
  igual(leerLista().productos, ["TV-01", "SOF-02", "APA-01"]);
}));

prueba("si la lista se llena, guarda los que caben y dice cuántos se quedan fuera", conListaLimpia(() => {
  const dieciocho = Array.from({ length: 18 }, (_, i) => `SOF-${String(i + 10).padStart(2, "0")}`);
  guardarVarios(dieciocho);
  igual(guardarVarios(["TV-01", "TV-02", "TV-03"]), { anadidos: 2, repetidos: 0, sinSitio: 1 });
  igual(leerLista().productos.length, 20);
}));

grupo("QR · leer un código desde Mi plano 3D");

const BASES = ["https://ejemplo.test/amicasa/", "http://localhost:8000/"];

prueba("un QR de etiqueta da el mueble y uno de ambiente da el conjunto", () => {
  igual(leerCodigoQr(enlaceQrProducto(BASES[0], "SOF-02", UTM), BASES), { tipo: "producto", id: "SOF-02" });
  igual(leerCodigoQr(enlaceQrAmbiente(BASES[0], "AMB-01", UTM), BASES), { tipo: "ambiente", id: "AMB-01" });
  igual(leerCodigoQr("http://localhost:8000/ficha.html?p=MCE-120", BASES), { tipo: "producto", id: "MCE-120" });
  igual(leerCodigoQr("  https://ejemplo.test/amicasa/ficha.html?p=TV-04  ", BASES), { tipo: "producto", id: "TV-04" });
});

prueba("los códigos que no son de este prototipo no valen (y nunca se abren)", () => {
  igual(leerCodigoQr("https://otra-web.test/amicasa/ficha.html?p=SOF-02", BASES), null, "otra web");
  igual(leerCodigoQr("https://ejemplo.test/otra/ficha.html?p=SOF-02", BASES), null, "otra carpeta");
  igual(leerCodigoQr("https://ejemplo.test/amicasa/lista.html?v=1", BASES), null, "otra página");
  igual(leerCodigoQr("https://ejemplo.test/amicasa/ficha.html?p=<script>", BASES), null, "id raro");
  igual(leerCodigoQr("javascript:alert(1)", BASES), null);
  igual(leerCodigoQr("Hola, esto es un texto", BASES), null);
  igual(leerCodigoQr("", BASES), null);
  igual(leerCodigoQr(null, BASES), null);
});

prueba("la referencia escrita a mano se entiende aunque se escriba de varias formas", () => {
  igual(leerReferencia("SOF-02"), "SOF-02");
  igual(leerReferencia(" sof-02 "), "SOF-02");
  igual(leerReferencia("sof02"), "SOF-02");
  igual(leerReferencia("Sof 02"), "SOF-02");
  igual(leerReferencia("mce-120"), "MCE-120");
  igual(leerReferencia("SOFA-2"), null);
  igual(leerReferencia("12345"), null);
  igual(leerReferencia(""), null);
});
