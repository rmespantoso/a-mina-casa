// Pruebas de Mi lista: guardar, no duplicar, quitar y el código ALI-XXXX.

import { grupo, prueba, igual, cierto } from "./mini.js";
import { borrar, guardar, leer } from "../js/almacen.js";
import {
  MAX_PRODUCTOS, anadirALista, crearEnlace, estaEnLista, leerEnlace, limpiarLista, nuevoCodigo, quitarDeLista,
  textoCompartir, totalLista,
} from "../js/logica/lista.js";
import { adoptarLista, estaGuardado, guardarProducto, leerLista, quitarProducto, reponerProducto } from "../js/mi-lista.js";

grupo("Lista · reglas");

prueba("el código tiene la forma ALI-XXXX y no usa 0, O, 1 ni I", () => {
  for (let i = 0; i < 200; i++) {
    const codigo = nuevoCodigo();
    cierto(/^ALI-[2-9A-HJ-NP-Z]{4}$/.test(codigo), codigo);
  }
  igual(nuevoCodigo(() => 0), "ALI-2222");
  igual(nuevoCodigo(() => 0.999), "ALI-ZZZZ");
});

prueba("la lista nace con el primer producto y ya trae su código", () => {
  const resultado = anadirALista(null, "SOF-02", () => 0);
  igual(resultado.esNueva, true);
  igual(resultado.lista, { codigo: "ALI-2222", productos: ["SOF-02"] });
});

prueba("al añadir más productos el código no cambia", () => {
  const primera = anadirALista(null, "SOF-02").lista;
  const segunda = anadirALista(primera, "TV-04");
  igual(segunda.esNueva, false);
  igual(segunda.lista.codigo, primera.codigo);
  igual(segunda.lista.productos, ["SOF-02", "TV-04"]);
  igual(primera.productos, ["SOF-02"], "la lista original no se modifica");
});

prueba("un producto no se guarda dos veces", () => {
  const lista = anadirALista(null, "SOF-02").lista;
  const repetido = anadirALista(lista, "SOF-02");
  igual(repetido.anadido, false);
  igual(repetido.motivo, "repetido");
  igual(repetido.lista.productos, ["SOF-02"]);
});

prueba("quitar un producto deja los demás y conserva el código", () => {
  let lista = anadirALista(null, "SOF-02").lista;
  lista = anadirALista(lista, "TV-04").lista;
  const sin = quitarDeLista(lista, "SOF-02");
  igual(sin.productos, ["TV-04"]);
  igual(sin.codigo, lista.codigo);
  igual(estaEnLista(sin, "SOF-02"), false);
  igual(estaEnLista(null, "SOF-02"), false);
});

prueba(`la lista admite ${MAX_PRODUCTOS} productos como mucho`, () => {
  let lista = null;
  for (let i = 0; i < MAX_PRODUCTOS; i++) lista = anadirALista(lista, `SOF-${String(i).padStart(2, "0")}`).lista;
  const unoMas = anadirALista(lista, "TV-01");
  igual(unoMas.anadido, false);
  igual(unoMas.motivo, "llena");
});

prueba("una lista estropeada o manipulada en el móvil se descarta o se limpia", () => {
  igual(limpiarLista("texto raro"), null);
  igual(limpiarLista({ codigo: "OTRO-1234", productos: ["SOF-01"] }), null);
  igual(limpiarLista({ codigo: "ALI-7K3F", productos: ["SOF-01", "<script>", 7, "SOF-01"] }),
    { codigo: "ALI-7K3F", productos: ["SOF-01"] });
});

grupo("Lista · guardar en el móvil");

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

prueba("guardar un mueble desde la ficha lo deja en la lista", conListaLimpia(() => {
  igual(leerLista(), null);
  igual(guardarProducto("SOF-01").ok, true);
  igual(estaGuardado("SOF-01"), true);
  igual(leerLista().productos, ["SOF-01"]);
}));

prueba("guardar, quitar y volver a guardar mantiene el mismo código", conListaLimpia(() => {
  guardarProducto("SOF-01");
  const codigo = leerLista().codigo;
  quitarProducto("SOF-01");
  igual(estaGuardado("SOF-01"), false);
  guardarProducto("TV-01");
  igual(leerLista().codigo, codigo);
  igual(guardarProducto("TV-01").motivo, "repetido");
}));

prueba("«Deshacer» devuelve el mueble a su sitio", conListaLimpia(() => {
  guardarProducto("SOF-01");
  guardarProducto("TV-01");
  guardarProducto("APA-01");
  quitarProducto("TV-01");
  reponerProducto("TV-01", 1);
  igual(leerLista().productos, ["SOF-01", "TV-01", "APA-01"]);
  reponerProducto("TV-01", 0);
  igual(leerLista().productos.length, 3, "no se duplica");
}));

prueba("una lista recibida no cambia la mía hasta que la acepto", conListaLimpia(() => {
  guardarProducto("SOF-01");
  const mia = leerLista();
  const recibida = leerEnlace("?v=1&c=ALI-7K3F&l=TV-01.APA-01");
  igual(recibida.lista.productos, ["TV-01", "APA-01"]);
  igual(leerLista(), mia, "leer el enlace no toca nada");
  igual(adoptarLista(recibida.lista), true);
  igual(leerLista(), { codigo: "ALI-7K3F", productos: ["TV-01", "APA-01"] });
  igual(adoptarLista({ codigo: "MALO", productos: [] }), false);
}));

grupo("Lista · enlace para compartir");

const LISTA = { codigo: "ALI-7K3F", productos: ["SOF-02", "TV-04"] };
const HUECOS = [
  { id: "h1", nombre: "Pared del sofá", estancia: "salon", ancho_cm: 250, fondo_cm: 94.5, alto_cm: null },
  { id: "h2", nombre: "Entrada", estancia: "recibidor", ancho_cm: 120, fondo_cm: null, alto_cm: 240 },
];
const BASE = "https://ejemplo.test/amicasa/lista.html";

prueba("el enlace tiene la forma acordada: v, c y l", () => {
  igual(crearEnlace(BASE, LISTA), "https://ejemplo.test/amicasa/lista.html?v=1&c=ALI-7K3F&l=SOF-02.TV-04");
  igual(crearEnlace(BASE + "?v=1&c=OTRA&utm_medium=qr", LISTA), crearEnlace(BASE, LISTA), "no arrastra parámetros viejos");
});

prueba("crear un enlace y leerlo devuelve la misma lista", () => {
  const leida = leerEnlace(new URL(crearEnlace(BASE, LISTA)).search);
  igual(leida.lista, LISTA);
  igual(leida.huecos, [], "sin la casilla, las medidas no viajan");
});

prueba("con la casilla marcada, las medidas viajan y llegan iguales", () => {
  const leida = leerEnlace(new URL(crearEnlace(BASE, LISTA, HUECOS)).search);
  igual(leida.lista, LISTA);
  igual(leida.huecos, HUECOS);
});

prueba("una dirección sin lista no es un enlace compartido", () => {
  igual(leerEnlace(""), null);
  igual(leerEnlace("?utm_source=qr_tienda&utm_medium=qr"), null);
});

prueba("enlaces estropeados o manipulados no rompen nada", () => {
  igual(leerEnlace("?v=2&c=ALI-7K3F&l=SOF-02"), { error: "version" });
  igual(leerEnlace("?v=1&c=HACKER&l=SOF-02"), { error: "estropeado" });
  igual(leerEnlace("?v=1&c=ALI-7K3F&l="), { error: "estropeado" });
  igual(leerEnlace("?v=1&c=ALI-7K3F"), { error: "estropeado" });
  const raro = leerEnlace("?v=1&c=ALI-7K3F&l=SOF-02.<script>.SOF-02&h=salon;99999;;;x|garaje;200;;;<b>Y</b>|basura");
  igual(raro.lista.productos, ["SOF-02"], "se quedan solo los productos con forma válida, sin repetir");
  igual(raro.huecos.map((h) => [h.estancia, h.ancho_cm]), [["salon", 200]], "medidas imposibles fuera; estancia rara, a salón");
});

prueba("el total suma bien y avisa si falta algún precio", () => {
  igual(totalLista([{ precio_eur: 999.99 }, { precio_eur: 0.01 }, { precio_eur: 199.5 }]), { total: 1199.5, sinPrecio: 0 });
  igual(totalLista([{ precio_eur: 100 }, { precio_eur: null }]), { total: 100, sinPrecio: 1 });
  igual(totalLista([]), { total: 0, sinPrecio: 0 });
});

prueba("el texto de WhatsApp lleva los muebles, el código y el enlace, y nada más", () => {
  const productos = [{ nombre: "Sofá Ejemplo", precio_eur: 299.99 }, { nombre: "Mesa Ejemplo", precio_eur: null }];
  const texto = textoCompartir({ lista: LISTA, productos, enlace: "https://ejemplo.test/lista.html?v=1" });
  const lineas = texto.split("\n");
  igual(lineas.length, 5);
  cierto(lineas[0].includes("ALI-7K3F"), lineas[0]);
  cierto(lineas[1].startsWith("• Sofá Ejemplo — 299,99"), lineas[1]);
  igual(lineas[2], "• Mesa Ejemplo — Consultar en tienda");
  cierto(lineas[3].includes("sin contar 1"), lineas[3]);
  igual(lineas[4], "Ver la lista: https://ejemplo.test/lista.html?v=1");
});

prueba("el mensaje para el asesor saluda y pide ayuda", () => {
  const texto = textoCompartir({ lista: LISTA, productos: [], enlace: "x", paraAsesor: true });
  cierto(texto.startsWith("Hola, os envío mi lista de A Miña Casa (código ALI-7K3F)"), texto);
});
