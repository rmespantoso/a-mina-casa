// Pruebas de «Planifica tu espacio»: colores, precio, búsqueda por estancia y búsquedas guardadas.

import { grupo, prueba, igual, cierto } from "./mini.js";
import { cargarDatos, cargarEstancias } from "../js/datos.js";
import { NOMBRE_ESTANCIA, NOMBRE_TIPO } from "../js/textos.js";
import { coloresDe, limpiarColores } from "../js/logica/colores.js";
import {
  MAX_BUSQUEDAS, buscarEnEstancia, enlaceBusqueda, nombreBusqueda, paraGuardar, ponerBusqueda, quitarBusqueda, validarPlan,
} from "../js/logica/planificador.js";

const REGLAS = {
  max_resultados: 6,
  tipos: { comoda: { estancias: ["dormitorio"], ocupacion_min: 0.3, ocupacion_max: 0.6 } },
};
const DORMITORIO = { id: "dormitorio", nombre: "Dormitorio", grupos: [{ id: "comodas", nombre: "Cómodas", tipos: ["comoda"] }] };
const comoda = (id, ancho, precio, nombre = "Cómoda", variantes = []) =>
  ({ id, nombre, tipo: "comoda", estancias: ["dormitorio"], ancho_cm: ancho, fondo_cm: 40, alto_cm: 80, precio_eur: precio, variantes });
const pared = (ancho) => ({ ancho_cm: ancho, fondo_cm: null, alto_cm: null });

grupo("Planifica · colores");

prueba("el color sale de las variantes y del nombre", () => {
  igual(coloresDe({ nombre: "Cómoda Strait", variantes: ["Blanco", "Nogal"] }), ["blanco", "nogal"]);
  igual(coloresDe({ nombre: "Mesa de Madera de Roble", variantes: [] }), ["madera"]);
});

prueba("reconoce palabras con tilde (bambú, marrón)", () => {
  igual(coloresDe({ nombre: "Estantería de Bambú", variantes: [] }), ["madera"]);
  igual(coloresDe({ nombre: "Sillón Marrón", variantes: [] }), ["marron"]);
});

prueba("no adivina: sin palabra de color, sin color", () => {
  igual(coloresDe({ nombre: "Recibidor Ethna con espejo", variantes: ["Modelo 1"] }), []);
});

prueba("no confunde trozos de palabras (Grisalla no es gris; Rosales no es rosa)", () => {
  igual(coloresDe({ nombre: "Cuadro Grisalla", variantes: ["Rosales"] }), []);
});

prueba("los colores que llegan de fuera se limpian", () => {
  igual(limpiarColores(["blanco", "<script>", "blanco", "gris"]), ["blanco", "gris"]);
  igual(limpiarColores("blanco"), []);
});

grupo("Planifica · formulario");

prueba("sin elegir mueble ni ancho, pide las dos cosas", () => {
  const revision = validarPlan({ ancho: "" }, DORMITORIO);
  igual(revision.ok, false);
  cierto(revision.errores.grupo && revision.errores.ancho, JSON.stringify(revision.errores));
});

prueba("con mueble y ancho vale; precio y colores son opcionales", () => {
  const revision = validarPlan({ grupo: "comodas", ancho: "120", precio: "300", colores: ["blanco"] }, DORMITORIO);
  igual(revision.ok, true);
  igual(revision.busqueda.tipos, ["comoda"]);
  igual(revision.busqueda.precioMax, 300);
  igual(revision.busqueda.colores, ["blanco"]);
});

prueba("un precio que no está en la lista se trata como «sin límite»", () => {
  igual(validarPlan({ grupo: "comodas", ancho: "120", precio: "7" }, DORMITORIO).busqueda.precioMax, null);
});

prueba("un ancho en metros se pregunta, no se corrige solo", () => {
  const revision = validarPlan({ grupo: "comodas", ancho: "1,2" }, DORMITORIO);
  igual(revision.ok, false);
  igual(revision.sugerencias.ancho, 120);
});

grupo("Planifica · resultados");

const CATALOGO = [
  comoda("COM-01", 50, 100, "Cómoda Blanca"),
  comoda("COM-02", 60, 400, "Cómoda", ["Blanco"]),
  comoda("COM-03", 98, 150, "Cómoda de Roble"),
  comoda("COM-04", 130, 90, "Cómoda Blanca"),
  comoda("COM-05", 35, null, "Cómoda Blanca"),
];

prueba("nunca sale un mueble que no cabe", () => {
  const { resultados } = buscarEnEstancia(CATALOGO, REGLAS, { tipos: ["comoda"], pared: pared(100) });
  cierto(resultados.every((r) => r.producto.ancho_cm <= 100), resultados.map((r) => r.producto.id).join());
  cierto(!resultados.some((r) => r.producto.id === "COM-04"), "COM-04 mide 130 y no cabe");
});

prueba("el precio máximo deja fuera lo caro y lo sin precio, y lo cuenta", () => {
  const salida = buscarEnEstancia(CATALOGO, REGLAS, { tipos: ["comoda"], pared: pared(100), precioMax: 200 });
  igual(salida.resultados.map((r) => r.producto.id).sort(), ["COM-01", "COM-03"]);
  igual(salida.porPrecio, 2);
});

prueba("el color deja fuera lo que no es de ese color, y lo cuenta", () => {
  const salida = buscarEnEstancia(CATALOGO, REGLAS, { tipos: ["comoda"], pared: pared(100), colores: ["blanco"] });
  igual(salida.resultados.map((r) => r.producto.id).sort(), ["COM-01", "COM-02", "COM-05"]);
  igual(salida.porColor, 1);
});

prueba("primero el que queda mejor de proporción", () => {
  const { resultados } = buscarEnEstancia(CATALOGO, REGLAS, { tipos: ["comoda"], pared: pared(100) });
  igual(resultados[0].producto.id, "COM-01");
  igual(resultados[0].etiqueta, "Encaja perfecto");
  igual(resultados.at(-1).etiqueta, "Justo");
});

prueba("sin ancho no hay resultados", () => {
  igual(buscarEnEstancia(CATALOGO, REGLAS, { tipos: ["comoda"], pared: pared(null) }).total, 0);
});

grupo("Planifica · búsquedas guardadas");

const busqueda = validarPlan({ grupo: "comodas", ancho: "120", precio: "300", colores: ["blanco"] }, DORMITORIO).busqueda;

prueba("el nombre resume la búsqueda", () => {
  igual(nombreBusqueda(busqueda, DORMITORIO, { blanco: "Blanco" }), "Dormitorio · Cómodas · 120 cm · hasta 300 € · Blanco");
});

prueba("solo se guarda la búsqueda, nada personal", () => {
  igual(Object.keys(paraGuardar(busqueda, new Date("2026-11-14"))).sort(),
    ["alto", "ancho", "colores", "estancia", "fecha", "fondo", "grupo", "precio"]);
});

prueba("guardar la misma búsqueda dos veces no la duplica", () => {
  const una = paraGuardar(busqueda);
  const { lista } = ponerBusqueda([], una);
  const otra = ponerBusqueda(lista, { ...una, fecha: "2030-01-01" });
  igual(otra.lista.length, 1);
  igual(otra.repetida, true);
});

prueba(`se recuerdan como mucho ${MAX_BUSQUEDAS} y se olvida la más antigua`, () => {
  let lista = [];
  for (let ancho = 100; ancho < 100 + MAX_BUSQUEDAS + 2; ancho++) lista = ponerBusqueda(lista, { ...paraGuardar(busqueda), ancho }).lista;
  igual(lista.length, MAX_BUSQUEDAS);
  igual(lista[0].ancho, 100 + MAX_BUSQUEDAS + 1);
  igual(quitarBusqueda(lista, 0).length, MAX_BUSQUEDAS - 1);
});

prueba("el enlace para repetirla lleva estancia, mueble, medidas, precio y colores", () => {
  const enlace = new URL(enlaceBusqueda(paraGuardar(busqueda)), "https://ejemplo.test/");
  igual(enlace.pathname, "/espacio.html");
  igual(enlace.searchParams.get("g"), "comodas");
  igual(enlace.searchParams.get("a"), "120");
  igual(enlace.searchParams.get("p"), "300");
  igual(enlace.searchParams.get("c"), "blanco");
});

grupo("Planifica · estancias de verdad");

const [estancias, { productos, reglas }] = await Promise.all([cargarEstancias(), cargarDatos()]);

prueba("cada estancia tiene nombre, foto de alihogar.es y al menos un grupo", () => {
  for (const estancia of estancias) {
    cierto(estancia.id in NOMBRE_ESTANCIA, `${estancia.id} sin nombre de estancia`);
    cierto(estancia.foto.startsWith("https://alihogar.es/"), `${estancia.id}: foto que no es de alihogar.es`);
    cierto(estancia.foto_de.startsWith("https://alihogar.es/"), `${estancia.id}: foto_de que no es de alihogar.es`);
    cierto(estancia.grupos.length > 0, `${estancia.id} sin grupos`);
  }
});

prueba("cada tipo de cada grupo tiene regla de proporción y nombre", () => {
  for (const estancia of estancias) {
    for (const g of estancia.grupos) {
      for (const tipo of g.tipos) {
        cierto(tipo in reglas.tipos, `${estancia.id}/${g.id}: ${tipo} sin regla`);
        cierto(tipo in NOMBRE_TIPO, `${estancia.id}/${g.id}: ${tipo} sin nombre`);
      }
    }
  }
});

prueba("ningún grupo está vacío: todos tienen muebles con medida en el catálogo", () => {
  for (const estancia of estancias) {
    for (const g of estancia.grupos) {
      const conMedida = productos.filter((p) => g.tipos.includes(p.tipo) && p.ancho_cm != null).length;
      cierto(conMedida > 0, `${estancia.id}/${g.id} no tiene muebles con medida`);
    }
  }
});
