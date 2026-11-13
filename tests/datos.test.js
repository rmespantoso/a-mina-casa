// Pruebas de los datos: comprueban que products.json dice exactamente lo mismo
// que productos.csv. Es la garantía de que no hay productos, precios ni medidas inventados.

import { grupo, prueba, igual, cierto } from "./mini.js";
import { leerCsv } from "./mini-csv.js";
import { cargarDatos, buscarProducto } from "../js/datos.js";
import { NOMBRE_ESTANCIA, NOMBRE_TIPO } from "../js/textos.js";

const textoCsv = await fetch(new URL("../data/productos.csv", import.meta.url)).then((r) => r.text());
const filasCsv = leerCsv(textoCsv);
const { productos, reglas } = await cargarDatos();

/** Convierte una celda del CSV en número, o en null si está vacía. */
const numero = (texto) => (texto === "" ? null : Number(texto));

grupo("Datos · products.json frente a productos.csv");

prueba("hay tantos productos como filas en el CSV (al menos los 46 revisados a mano)", () => {
  cierto(productos.length >= 46, `solo hay ${productos.length}`);
  igual(productos.length, filasCsv.length);
});

prueba("todos los ids tienen la forma acordada (ABC-12 o ABC-123)", () => {
  productos.forEach((p) => cierto(/^[A-Z]{2,4}-\d{2,3}$/.test(p.id), `id raro: ${p.id}`));
});

prueba("los ids son los del CSV, en el mismo orden y sin repetir", () => {
  igual(productos.map((p) => p.id), filasCsv.map((f) => f.id));
  igual(new Set(productos.map((p) => p.id)).size, productos.length);
});

prueba("nombre, precio, medidas y enlace coinciden con el CSV en todos los productos", () => {
  filasCsv.forEach((fila, i) => {
    const p = productos[i];
    igual(p.nombre, fila.nombre, `${fila.id} nombre`);
    igual(p.precio_eur, numero(fila.precio_eur), `${fila.id} precio`);
    igual(p.ancho_cm, numero(fila.ancho_cm), `${fila.id} ancho`);
    igual(p.fondo_cm, numero(fila.fondo_cm), `${fila.id} fondo`);
    igual(p.alto_cm, numero(fila.alto_cm), `${fila.id} alto`);
    igual(p.ancho_abierto_cm, numero(fila.ancho_abierto_cm), `${fila.id} ancho abierto`);
    igual(p.url_alihogar, fila.url_alihogar || null, `${fila.id} enlace`);
    igual(p.tipo, fila.tipo, `${fila.id} tipo`);
    igual(p.aviso_cliente, fila.aviso_cliente || null, `${fila.id} aviso`);
  });
});

prueba("el EAN es texto y conserva los ceros de la izquierda (MES-05)", async () => {
  const mesa = await buscarProducto("MES-05");
  igual(mesa.ean, "0600120020010");
  cierto(productos.every((p) => p.ean === null || typeof p.ean === "string"), "hay un EAN que no es texto");
});

prueba("un EAN vacío queda como null, no como texto vacío (CAM-01)", async () => {
  igual((await buscarProducto("CAM-01")).ean, null);
});

prueba("los decimales se leen bien (TV-02 tiene 34,5 cm de fondo)", async () => {
  igual((await buscarProducto("TV-02")).fondo_cm, 34.5);
});

prueba("si falta el alto, queda null y no 0 (CAM-01)", async () => {
  igual((await buscarProducto("CAM-01")).alto_cm, null);
});

prueba("varias estancias se separan en una lista (APA-01: salón y comedor)", async () => {
  igual((await buscarProducto("APA-01")).estancias, ["salon", "comedor"]);
});

prueba("las variantes se separan en una lista (SOF-02: Beige y Gris)", async () => {
  igual((await buscarProducto("SOF-02")).variantes, ["Beige", "Gris"]);
});

prueba("las mesas extensibles traen su ancho abierto, mayor que el cerrado", () => {
  ["MES-01", "MES-02", "MES-03", "MES-04", "MES-05"].forEach((id) => {
    const mesa = productos.find((p) => p.id === id);
    cierto(mesa.ancho_abierto_cm > mesa.ancho_cm, `${id}: abierto no es mayor que cerrado`);
  });
  productos.filter((p) => p.ancho_abierto_cm !== null).forEach((p) => {
    cierto(p.ancho_cm !== null && p.ancho_abierto_cm > p.ancho_cm, `${p.id}: abierto no es mayor que cerrado`);
  });
});

prueba("ninguna medida importada es absurda (más de 0 y hasta 4 m)", () => {
  productos.forEach((p) => ["ancho_cm", "fondo_cm", "alto_cm"].forEach((campo) => {
    if (p[campo] !== null) cierto(p[campo] > 0 && p[campo] <= 400, `${p.id}: ${campo} = ${p[campo]}`);
  }));
});

prueba("todos los enlaces apuntan a https://alihogar.es/", () => {
  productos.forEach((p) => cierto(p.url_alihogar.startsWith("https://alihogar.es/"), `${p.id}: enlace raro`));
});

prueba("las fotos están autorizadas y son de alihogar.es", () => {
  productos.forEach((p) => {
    cierto(p.foto_autorizada === true, `${p.id}: foto sin autorizar`);
    if (p.url_foto) cierto(p.url_foto.startsWith("https://alihogar.es/"), `${p.id}: la foto no es de alihogar.es`);
  });
});

prueba("las notas internas no se publican en el JSON", () => {
  cierto(productos.every((p) => !("notas_internas" in p) && !("notas" in p)), "el JSON lleva notas internas");
});

prueba("ningún aviso al cliente habla de stock ni de ofertas", () => {
  productos.forEach((p) => cierto(!/unidades|stock|oferta|antes /i.test(p.aviso_cliente ?? ""), `${p.id}: ${p.aviso_cliente}`));
});

prueba("un id que no existe devuelve null", async () => {
  igual(await buscarProducto("NO-EXISTE"), null);
});

grupo("Datos · reglas de proporción");

prueba("cada tipo de producto tiene su regla y su nombre para el cliente", () => {
  productos.forEach((p) => {
    cierto(p.tipo in reglas.tipos, `${p.id}: el tipo ${p.tipo} no tiene regla`);
    cierto(p.tipo in NOMBRE_TIPO, `${p.id}: el tipo ${p.tipo} no tiene nombre`);
  });
});

prueba("cada estancia de producto tiene nombre para el cliente", () => {
  productos.forEach((p) => p.estancias.forEach((e) => cierto(e in NOMBRE_ESTANCIA, `${p.id}: estancia ${e} sin nombre`)));
});

prueba("los rangos de las reglas tienen sentido (0 < mínimo < máximo ≤ 1)", () => {
  Object.entries(reglas.tipos).forEach(([tipo, regla]) => {
    cierto(regla.ocupacion_min > 0 && regla.ocupacion_min < regla.ocupacion_max && regla.ocupacion_max <= 1, `regla rara en ${tipo}`);
  });
  cierto(reglas.margen_verde_cm > 0, "falta margen_verde_cm");
  cierto(reglas.max_resultados > 0, "falta max_resultados");
});
