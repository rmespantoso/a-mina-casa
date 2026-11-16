// Pruebas de «Planifica tu espacio»: colores, precio, filtro por estancia y búsquedas guardadas.

import { grupo, prueba, igual, cierto } from "./mini.js";
import { cargarDatos, cargarEstancias } from "../js/datos.js";
import { NOMBRE_ESTANCIA, NOMBRE_TIPO } from "../js/textos.js";
import { coloresDe, fotoDelColor, limpiarColores } from "../js/logica/colores.js";
import {
  PRECIO_TOPE, buscarEnEstancia, busquedaDeDireccion, enlaceBusqueda, enlaceFiltro, leerPrecio, leerPrecioMin, paraGuardar,
  pasoPrecio, topePrecio,
  validarPlan,
} from "../js/logica/planificador.js";

const DORMITORIO = {
  id: "dormitorio",
  nombre: "Dormitorio",
  grupos: [{ id: "comodas", nombre: "Cómodas", tipos: ["comoda"] }, { id: "armarios", nombre: "Armarios", tipos: ["armario"] }],
};
const comoda = (id, ancho, precio, nombre = "Cómoda", variantes = []) =>
  ({ id, nombre, tipo: "comoda", estancias: ["dormitorio"], ancho_cm: ancho, fondo_cm: 40, alto_cm: 80, precio_eur: precio, variantes });
const medidas = (ancho) => ({ ancho_cm: ancho, fondo_cm: null, alto_cm: null });

grupo("Planifica · colores");

prueba("el color sale de las variantes y del nombre", () => {
  igual(coloresDe({ nombre: "Cómoda Strait", variantes: ["Blanco", "Nogal"] }).sort(), ["blanco", "nogal"]);
  igual(coloresDe({ nombre: "Mesa de Madera de Roble", variantes: [] }), ["madera"]);
});

prueba("reconoce palabras con tilde (bambú, marrón)", () => {
  igual(coloresDe({ nombre: "Estantería de Bambú", variantes: [] }), ["madera"]);
  igual(coloresDe({ nombre: "Sillón Marrón", variantes: [] }), ["nogal"]); // «Madera oscura y marrón»
});

prueba("no adivina: sin palabra de color, sin color", () => {
  igual(coloresDe({ nombre: "Recibidor Ethna con espejo", variantes: ["Modelo 1"] }), []);
});

prueba("no confunde trozos de palabras (Grisalla no es gris; Rosales no es rosa)", () => {
  igual(coloresDe({ nombre: "Cuadro Grisalla", variantes: ["Rosales"] }), []);
});

prueba("si las variantes dicen el color, el nombre no cuenta (la madera de pino del sofá es la estructura)", () => {
  igual(coloresDe({ nombre: "Sofá Turin de 3 Plazas Sintra de Madera de Pino", variantes: ["Gris", "Beige"] }).sort(), ["beige", "gris"]);
});

prueba("en el nombre, madera, cuero y San Marino no son colores", () => {
  igual(coloresDe({ nombre: "Sofá Ostuni de 3 Plazas de Madera", variantes: [] }), []);
  igual(coloresDe({ nombre: "Mesita de Noche Negra de Madera", variantes: [] }), ["negro"]);
  igual(coloresDe({ nombre: "Silla Olwen de Efecto Cuero y Acero", variantes: [] }), []);
  igual(coloresDe({ nombre: "Carrito Auxiliar San Marino de 4 Niveles", variantes: [] }), []);
  igual(coloresDe({ nombre: "Sofá Azul Marino", variantes: [] }), ["azul"]);
});

prueba("los colores que llegan de fuera se limpian", () => {
  igual(limpiarColores(["blanco", "<script>", "blanco", "gris"]), ["blanco", "gris"]);
  igual(limpiarColores("blanco"), []);
  igual(limpiarColores(["rojo", "amarillo"]), ["vivos"]); // familias antiguas que se juntaron
});

grupo("Planifica · formulario");

prueba("todo es opcional: sin rellenar nada, busca todos los muebles de la estancia", () => {
  const revision = validarPlan({}, DORMITORIO);
  igual(revision.ok, true);
  igual(revision.busqueda.grupo, null);
  igual(revision.busqueda.tipos, ["comoda", "armario"]);
  igual(revision.busqueda.precioMax, null);
});

prueba("con tipo, medidas, precio y colores", () => {
  const revision = validarPlan({ grupo: "comodas", ancho: "120", precio: "300", colores: ["blanco"] }, DORMITORIO);
  igual(revision.ok, true);
  igual(revision.busqueda.tipos, ["comoda"]);
  igual(revision.busqueda.medidas, { ancho_cm: 120, fondo_cm: null, alto_cm: null });
  igual(revision.busqueda.precioMax, 300);
  igual(revision.busqueda.colores, ["blanco"]);
});

prueba(`la barra del precio: en el tope (${PRECIO_TOPE} €) o sin número es «sin límite»`, () => {
  igual(leerPrecio(String(PRECIO_TOPE)), null);
  igual(leerPrecio("abc"), null);
  igual(leerPrecio("-5"), null);
  igual(leerPrecio("0"), 0);
  igual(leerPrecio("410"), 410, "lo escrito a mano se respeta");
  igual(leerPrecioMin("0"), null, "0 es «sin mínimo»");
  igual(leerPrecioMin("150"), 150);
});

prueba("si el mínimo queda por encima del máximo, se dan la vuelta", () => {
  const revision = validarPlan({ precio_min: "500", precio: "200" }, DORMITORIO);
  igual([revision.busqueda.precioMin, revision.busqueda.precioMax], [200, 500]);
});

prueba("una medida en metros se pregunta, no se corrige sola", () => {
  const revision = validarPlan({ ancho: "1,2" }, DORMITORIO);
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
  { ...comoda("ARM-01", 100, 300, "Armario"), tipo: "armario", alto_cm: null },
];
const solo = (salida) => salida.resultados.map((producto) => producto.id);

prueba("las medidas son «como mucho»: nunca sale uno más grande", () => {
  const salida = buscarEnEstancia(CATALOGO, { tipos: ["comoda"], medidas: medidas(100) });
  cierto(salida.resultados.every((p) => p.ancho_cm <= 100), solo(salida).join());
  igual(salida.porMedida, 1);
});

prueba("con medidas, primero el que más se acerca a lo pedido", () => {
  igual(solo(buscarEnEstancia(CATALOGO, { tipos: ["comoda"], medidas: medidas(100) }))[0], "COM-03");
});

prueba("sin medidas, de menor a mayor precio (sin precio, al final)", () => {
  igual(solo(buscarEnEstancia(CATALOGO, { tipos: ["comoda"] })), ["COM-04", "COM-01", "COM-03", "COM-02", "COM-05"]);
});

prueba("si el mueble no tiene la medida pedida en la web, no sale (no se adivina)", () => {
  const salida = buscarEnEstancia(CATALOGO, { tipos: ["armario"], medidas: { alto_cm: 200 } });
  igual(salida.total, 0);
  igual(salida.porMedida, 1);
});

prueba("el precio máximo deja fuera lo caro y lo sin precio, y lo cuenta", () => {
  const salida = buscarEnEstancia(CATALOGO, { tipos: ["comoda"], medidas: medidas(100), precioMax: 200 });
  igual(solo(salida).sort(), ["COM-01", "COM-03"]);
  igual(salida.porPrecio, 2);
});

prueba("el color deja fuera lo que no es de ese color, y lo cuenta", () => {
  const salida = buscarEnEstancia(CATALOGO, { tipos: ["comoda"], medidas: medidas(100), colores: ["blanco"] });
  igual(solo(salida).sort(), ["COM-01", "COM-02", "COM-05"]);
  igual(salida.porColor, 1);
});

prueba("el precio mínimo deja fuera lo más barato", () => {
  const salida = buscarEnEstancia(CATALOGO, { tipos: ["comoda"], precioMin: 120, precioMax: 400 });
  igual(solo(salida), ["COM-03", "COM-02"]);
  igual(salida.porPrecio, 3);
});

prueba("«Todos los muebles» junta los tipos de la estancia", () => {
  igual(buscarEnEstancia(CATALOGO, validarPlan({}, DORMITORIO).busqueda).total, 6);
});

grupo("Planifica · la búsqueda en la dirección");

const busqueda = validarPlan({ grupo: "comodas", ancho: "120", fondo: "45", precio: "300", colores: ["blanco"] }, DORMITORIO).busqueda;

prueba("en la dirección solo va el filtro, nada personal", () => {
  igual(Object.keys(paraGuardar(busqueda, new Date("2026-11-14"))).sort(),
    ["alto", "ancho", "colores", "estancia", "fecha", "fondo", "grupo", "precio", "precio_min"]);
});

prueba("el enlace para repetirla abre la página de resultados con todo el filtro", () => {
  const enlace = new URL(enlaceBusqueda(paraGuardar(busqueda)), "https://ejemplo.test/");
  igual(enlace.pathname, "/resultados.html");
  igual(enlace.searchParams.get("g"), "comodas");
  igual(enlace.searchParams.get("a"), "120");
  igual(enlace.searchParams.get("f"), "45");
  igual(enlace.searchParams.has("h"), false);
  igual(enlace.searchParams.get("p"), "300");
  igual(enlace.searchParams.get("c"), "blanco");
});

prueba("«Volver a la búsqueda» lleva al filtro con lo mismo, y se puede leer de vuelta", () => {
  const guardada = { ...paraGuardar(busqueda), precio_min: 100 };
  const enlace = new URL(enlaceFiltro(guardada), "https://ejemplo.test/");
  igual(enlace.pathname, "/espacio.html");
  const leida = busquedaDeDireccion(enlace.search);
  igual([leida.estancia, leida.grupo, leida.ancho, leida.precio_min, leida.precio], ["dormitorio", "comodas", "120", "100", "300"]);
});

prueba("un enlace antiguo con colores ya juntados (marrón, rosa) sigue valiendo", () => {
  const enlace = new URL(enlaceBusqueda({ estancia: "salon", grupo: null, colores: ["marron", "rosa"] }), "https://ejemplo.test/");
  igual(enlace.searchParams.get("c"), "nogal.vivos");
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

grupo("Planifica · barra del precio según el tipo (16/11/2026)");

prueba("el final de la barra es el mueble más caro redondeado hacia arriba a un número redondo", () => {
  const p = (tipo, precio) => ({ tipo, precio_eur: precio });
  const catalogo = [p("mesita_noche", 169.99), p("mesita_noche", 40), p("cabecero", 305.99), p("mesa_centro", 509.99),
    p("sofa", 1223.99), p("banqueta", 500), p("silla", 12)];
  igual(topePrecio(catalogo, ["mesita_noche"]), 200);
  igual(topePrecio(catalogo, ["cabecero"]), 350);
  igual(topePrecio(catalogo, ["mesa_centro"]), 600);
  igual(topePrecio(catalogo, ["sofa"]), 1300);
  igual(topePrecio(catalogo, ["banqueta"]), 500, "un precio ya redondo se queda igual");
  igual(topePrecio(catalogo, ["silla"]), 50, "nunca menos de 50 €");
  igual(topePrecio(catalogo, ["mesita_noche", "sofa"]), 1300, "con varios tipos, el más caro de todos");
  igual(topePrecio(catalogo, ["armario"]), PRECIO_TOPE, "sin muebles, el tope general");
});

prueba("el salto es de 10 € en las barras cortas y de 25 € en las largas", () => {
  igual(pasoPrecio(200), 10);
  igual(pasoPrecio(500), 10);
  igual(pasoPrecio(600), 25);
});

prueba("en el catálogo real ningún grupo pasa de 2.000 € y todos los topes son redondos", async () => {
  const [{ productos }, estancias] = await Promise.all([cargarDatos(), cargarEstancias()]);
  for (const estancia of estancias) {
    for (const grupo of estancia.grupos) {
      const tope = topePrecio(productos, grupo.tipos);
      cierto(tope <= PRECIO_TOPE && tope % 50 === 0, `${estancia.id}/${grupo.id}: ${tope}`);
      const caro = Math.max(...productos.filter((x) => grupo.tipos.includes(x.tipo) && x.precio_eur).map((x) => x.precio_eur));
      cierto(caro <= tope, `${grupo.id}: el más caro (${caro}) cabe en la barra`);
    }
  }
});

grupo("Planifica · foto en el color elegido (16/11/2026)");

prueba("con un color elegido sale la foto de ese color; si no hay, ninguna (se usa la principal)", () => {
  const sofa = { nombre: "Sofá Ejemplo", variantes: ["Beige", "Gris Oscuro"],
    fotos_color: { Beige: "https://alihogar.es/1-large_default/a.jpg", "Gris Oscuro": "https://alihogar.es/2-large_default/b.jpg" } };
  igual(fotoDelColor(sofa, ["gris"]), { url: "https://alihogar.es/2-large_default/b.jpg", color: "Gris Oscuro" });
  igual(fotoDelColor(sofa, ["azul", "beige"]), { url: "https://alihogar.es/1-large_default/a.jpg", color: "Beige" });
  igual(fotoDelColor(sofa, ["verde"]), null, "color que no tiene");
  igual(fotoDelColor(sofa, []), null, "sin color elegido");
  igual(fotoDelColor({ nombre: "Mesa", variantes: [] }, ["gris"]), null, "sin fotos por color");
});
