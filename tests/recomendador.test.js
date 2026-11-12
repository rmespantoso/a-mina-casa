// Pruebas del recomendador «¿Qué me cabe?»: filtro, etiquetas, orden, máximo de
// resultados y que las reglas de proporción se leen del JSON (no están en el código).

import { grupo, prueba, igual, cierto } from "./mini.js";
import { cargarDatos } from "../js/datos.js";
import { MARGEN_CM } from "../js/logica/semaforo.js";
import { estanciasDeReglas, porcentaje, recomendar, tiposDeEstancia, validarBusqueda } from "../js/logica/recomendador.js";

// Reglas de mentira, pequeñas, para probar sin depender del catálogo real.
const REGLAS = {
  max_resultados: 3,
  tipos: {
    sofa: { estancias: ["salon"], ocupacion_min: 0.5, ocupacion_max: 0.7 },
    comoda: { estancias: ["dormitorio"], ocupacion_min: 0.3, ocupacion_max: 0.6 },
  },
};

const sofa = (id, ancho, fondo = 90, alto = 80) =>
  ({ id, tipo: "sofa", estancias: ["salon"], ancho_cm: ancho, fondo_cm: fondo, alto_cm: alto, ancho_abierto_cm: null });
const pared = (ancho, fondo = null, alto = null) => ({ ancho_cm: ancho, fondo_cm: fondo, alto_cm: alto });
const buscar = (productos, anchoPared, reglas = REGLAS) =>
  recomendar(productos, reglas, { estancia: "salon", tipo: "sofa", pared: pared(anchoPared) });
const ids = (respuesta) => respuesta.resultados.map((r) => r.producto.id);

grupo("Recomendador · filtro");

prueba("solo entran muebles del tipo y la estancia pedidos", () => {
  const productos = [
    sofa("SOF-01", 180),
    { ...sofa("COM-01", 180), tipo: "comoda", estancias: ["dormitorio"] },
    { ...sofa("SOF-02", 180), estancias: ["dormitorio"] },
  ];
  igual(ids(buscar(productos, 300)), ["SOF-01"]);
});

prueba("nunca se recomienda un mueble que no cabe", () => {
  const respuesta = buscar([sofa("SOF-01", 301), sofa("SOF-02", 180)], 300);
  igual(ids(respuesta), ["SOF-02"]);
});

prueba("también se descarta si no cabe de fondo o de alto", () => {
  const productos = [sofa("SOF-01", 180, 120), sofa("SOF-02", 180, 90, 250), sofa("SOF-03", 180)];
  const respuesta = recomendar(productos, REGLAS, { estancia: "salon", tipo: "sofa", pared: pared(300, 100, 240) });
  igual(ids(respuesta), ["SOF-03"]);
});

prueba("si no cabe ninguno, devuelve una lista vacía y no un error", () => {
  const respuesta = buscar([sofa("SOF-01", 250)], 150);
  igual(respuesta.resultados, []);
  igual(respuesta.total, 0);
  igual(recomendar([], REGLAS, { estancia: "salon", tipo: "silla", pared: pared(300) }).resultados, []);
});

grupo("Recomendador · etiquetas y orden");

prueba("verde y dentro del rango es «Encaja perfecto»", () => {
  const [resultado] = buscar([sofa("SOF-01", 180)], 300).resultados; // ocupa el 60 %
  igual(resultado.etiqueta, "Encaja perfecto");
  igual(porcentaje(resultado.ocupacion), 60);
});

prueba("verde pero fuera del rango es «Encaja»", () => {
  igual(buscar([sofa("SOF-01", 120)], 300).resultados[0].etiqueta, "Encaja"); // 40 %: se queda pequeño
  igual(buscar([sofa("SOF-01", 270)], 300).resultados[0].etiqueta, "Encaja"); // 90 %: muy grande
});

prueba("ámbar (menos de 5 cm de holgura) es «Justo»", () => {
  igual(buscar([sofa("SOF-01", 297)], 300).resultados[0].etiqueta, "Justo");
  igual(buscar([sofa("SOF-01", 300)], 300).resultados[0].etiqueta, "Justo");
});

prueba("los límites del rango cuentan como dentro", () => {
  igual(buscar([sofa("SOF-01", 150)], 300).resultados[0].etiqueta, "Encaja perfecto"); // 50 % justo
  igual(buscar([sofa("SOF-01", 210)], 300).resultados[0].etiqueta, "Encaja perfecto"); // 70 % justo
});

prueba("orden: primero el más centrado en el rango, luego fuera de rango y al final los ámbar", () => {
  const productos = [
    sofa("SOF-01", 298), // ámbar
    sofa("SOF-02", 120), // 40 %: fuera, a 10 puntos
    sofa("SOF-03", 200), // 67 %: dentro, lejos del centro (60 %)
    sofa("SOF-04", 185), // 62 %: dentro, el más centrado
    sofa("SOF-05", 240), // 80 %: fuera, a 10 puntos
    sofa("SOF-06", 225), // 75 %: fuera, a 5 puntos
  ];
  const respuesta = buscar(productos, 300, { ...REGLAS, max_resultados: 10 });
  igual(ids(respuesta), ["SOF-04", "SOF-03", "SOF-06", "SOF-02", "SOF-05", "SOF-01"]);
});

prueba("se enseñan como mucho los que diga max_resultados, y se dice cuántos cabían", () => {
  const productos = [150, 160, 170, 180, 190].map((ancho, i) => sofa(`SOF-0${i + 1}`, ancho));
  const respuesta = buscar(productos, 300);
  igual(respuesta.resultados.length, 3);
  igual(respuesta.total, 5);
});

prueba("las reglas son configurables: si cambia el rango del JSON, cambia la etiqueta", () => {
  const productos = [sofa("SOF-01", 120)]; // 40 %
  igual(buscar(productos, 300).resultados[0].etiqueta, "Encaja");
  const otras = { ...REGLAS, tipos: { ...REGLAS.tipos, sofa: { estancias: ["salon"], ocupacion_min: 0.3, ocupacion_max: 0.5 } } };
  igual(buscar(productos, 300, otras).resultados[0].etiqueta, "Encaja perfecto");
});

grupo("Recomendador · formulario");

prueba("cada estancia ofrece solo sus tipos de mueble", () => {
  igual(tiposDeEstancia(REGLAS, "salon"), ["sofa"]);
  igual(tiposDeEstancia(REGLAS, "dormitorio"), ["comoda"]);
  igual(estanciasDeReglas(REGLAS), ["salon", "dormitorio"]);
});

prueba("solo el ancho de la pared es obligatorio", () => {
  const revision = validarBusqueda({ estancia: "salon", tipo: "sofa", ancho: "300", fondo: "", alto: "" }, REGLAS);
  igual(revision.ok, true);
  igual(revision.busqueda, { estancia: "salon", tipo: "sofa", pared: { ancho_cm: 300, fondo_cm: null, alto_cm: null } });
  igual(Object.keys(validarBusqueda({ estancia: "salon", tipo: "sofa", ancho: "" }, REGLAS).errores), ["ancho"]);
});

prueba("no deja buscar un mueble que no es de esa estancia, ni medidas en metros", () => {
  igual(Object.keys(validarBusqueda({ estancia: "salon", tipo: "comoda", ancho: "300" }, REGLAS).errores), ["tipo"]);
  igual(Object.keys(validarBusqueda({ estancia: "garaje", tipo: "sofa", ancho: "300" }, REGLAS).errores), ["estancia"]);
  igual(validarBusqueda({ estancia: "salon", tipo: "sofa", ancho: "3" }, REGLAS).sugerencias, { ancho: 300 });
});

grupo("Recomendador · catálogo y reglas reales");

prueba("el margen de 5 cm es el mismo en el semáforo y en reglas_proporcion.json", async () => {
  const { reglas } = await cargarDatos();
  igual(reglas.margen_verde_cm, MARGEN_CM, "si se cambia uno, hay que cambiar el otro");
});

prueba("todos los tipos del catálogo tienen su regla de proporción", async () => {
  const { productos, reglas } = await cargarDatos();
  const sinRegla = [...new Set(productos.map((p) => p.tipo))].filter((tipo) => !reglas.tipos[tipo]);
  igual(sinRegla, []);
});

prueba("sofás para una pared de 300 cm: solo sofás que caben, 6 como mucho", async () => {
  const { productos, reglas } = await cargarDatos();
  const respuesta = recomendar(productos, reglas, { estancia: "salon", tipo: "sofa", pared: pared(300) });
  cierto(respuesta.resultados.length > 0 && respuesta.resultados.length <= reglas.max_resultados, `salen ${respuesta.resultados.length}`);
  for (const { producto, encaje } of respuesta.resultados) {
    igual(producto.tipo, "sofa");
    cierto(producto.ancho_cm <= 300, `${producto.id} mide ${producto.ancho_cm}`);
    cierto(encaje.estado !== "rojo", `${producto.id} sale en rojo`);
  }
});

prueba("una pared de 100 cm no tiene ningún sofá: lista vacía", async () => {
  const { productos, reglas } = await cargarDatos();
  igual(recomendar(productos, reglas, { estancia: "salon", tipo: "sofa", pared: pared(100) }).resultados, []);
});
