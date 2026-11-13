// Pruebas del semáforo: los casos límite acordados (exacto, 5 cm justos, 1 cm de más,
// medidas que faltan), las mesas extensibles y un par de muebles reales del catálogo.

import { grupo, prueba, igual, cierto } from "./mini.js";
import { cargarDatos } from "../js/datos.js";
import { MARGEN_CM, evaluarEncaje, frase, ordenarHuecos } from "../js/logica/semaforo.js";

const mueble = (ancho, fondo, alto, abierto = null) =>
  ({ ancho_cm: ancho, fondo_cm: fondo, alto_cm: alto, ancho_abierto_cm: abierto });
const hueco = (ancho, fondo = null, alto = null, estancia = "salon") =>
  ({ ancho_cm: ancho, fondo_cm: fondo, alto_cm: alto, estancia });
const estado = (m, h) => evaluarEncaje(m, h).estado;

grupo("Semáforo · casos límite");

prueba("el margen del verde es de 5 cm", () => {
  igual(MARGEN_CM, 5);
});

prueba("sobran más de 5 cm en ancho y fondo: verde", () => {
  igual(estado(mueble(200, 90, 80), hueco(250, 100, 240)), "verde");
});

prueba("5 cm justos es verde", () => {
  igual(estado(mueble(200, 90, 80), hueco(205, 95, 240)), "verde");
});

prueba("4 cm de holgura es ámbar", () => {
  igual(estado(mueble(200, 90, 80), hueco(204, 100, 240)), "ambar");
  igual(estado(mueble(200, 90, 80), hueco(250, 94, 240)), "ambar");
});

prueba("medida exacta (0 cm de holgura) es ámbar", () => {
  igual(estado(mueble(200, 90, 80), hueco(200, 100, 240)), "ambar");
});

prueba("1 cm de más es rojo, sea en ancho, en fondo o en alto", () => {
  igual(estado(mueble(201, 90, 80), hueco(200, 100, 240)), "rojo");
  igual(estado(mueble(200, 101, 80), hueco(250, 100, 240)), "rojo");
  igual(estado(mueble(200, 90, 241), hueco(250, 100, 240)), "rojo");
});

prueba("el alto solo exige «menor o igual»: igual de alto es verde", () => {
  igual(estado(mueble(200, 90, 240), hueco(250, 100, 240)), "verde");
});

prueba("con decimales también acierta (94,5 cm en un hueco de 99,5)", () => {
  igual(estado(mueble(94.5, 40, 80), hueco(99.5, 50, 100)), "verde");
  igual(estado(mueble(94.5, 40, 80), hueco(99.4, 50, 100)), "ambar");
});

prueba("el rojo manda sobre el ámbar: basta una medida que no quepa", () => {
  igual(estado(mueble(200, 101, 80), hueco(202, 100, 240)), "rojo");
});

grupo("Semáforo · medidas que faltan");

prueba("si el hueco no tiene fondo ni alto, solo se compara el ancho y se dice", () => {
  const encaje = evaluarEncaje(mueble(200, 90, 80), hueco(250));
  igual(encaje.estado, "verde");
  igual(encaje.medidas.map((m) => m.estado), ["verde", "saltada", "saltada"]);
  cierto(frase(encaje.medidas[1]).includes("no comprobado"), frase(encaje.medidas[1]));
});

prueba("si al mueble le falta el alto, se compara lo demás y dice «consultar en tienda»", () => {
  const encaje = evaluarEncaje(mueble(135, 190, null), hueco(150, 200, 240));
  igual(encaje.estado, "verde");
  igual(encaje.medidas[2].estado, "saltada");
  cierto(frase(encaje.medidas[2]).includes("consultar en tienda"), frase(encaje.medidas[2]));
});

prueba("una medida saltada nunca tapa un rojo", () => {
  igual(estado(mueble(260, 90, null), hueco(250, 100, 240)), "rojo");
});

prueba("si no se puede comparar nada, no se inventa un color", () => {
  igual(estado(mueble(null, null, null), hueco(250, 100, 240)), "sin-datos");
});

grupo("Semáforo · explicación y orden");

prueba("cada medida se explica con los centímetros que sobran o faltan", () => {
  const { medidas } = evaluarEncaje(mueble(232, 100, 75), hueco(250, 103, 70));
  igual(frase(medidas[0]), "Ancho: cabe. Sobran 18 cm.");
  igual(frase(medidas[1]), "Fondo: muy justo. Solo sobran 3 cm.");
  igual(frase(medidas[2]), "Alto: no cabe. Faltan 5 cm.");
  igual(frase(evaluarEncaje(mueble(200, 90, 80), hueco(200)).medidas[0]), "Ancho: cabe exacto, sin holgura.");
});

prueba("mesa extensible: el color usa el ancho cerrado y la abierta se dice aparte", () => {
  const encaje = evaluarEncaje(mueble(140, 90, 75, 180), hueco(170, 120, 240));
  igual(encaje.estado, "verde", "cerrada cabe");
  igual(encaje.abierta.estado, "rojo", "abierta no");
  igual(frase(encaje.abierta), "Ancho abierta: no cabe. Faltan 10 cm.");
  igual(evaluarEncaje(mueble(200, 90, 80), hueco(250)).abierta, null, "un mueble normal no tiene medida abierta");
});

prueba("los huecos de la estancia del mueble salen primero", () => {
  const huecos = [
    { id: "h1", estancia: "dormitorio" }, { id: "h2", estancia: "salon" },
    { id: "h3", estancia: "recibidor" }, { id: "h4", estancia: "comedor" },
  ];
  igual(ordenarHuecos(huecos, ["salon", "comedor"]).map((h) => h.id), ["h2", "h4", "h1", "h3"]);
  igual(huecos.map((h) => h.id), ["h1", "h2", "h3", "h4"], "la lista original no cambia");
});

grupo("Semáforo · muebles reales del catálogo");

prueba("SOF-01 (232 × 100 × 75 cm) en tres paredes distintas", async () => {
  const { productos } = await cargarDatos();
  const sofa = productos.find((p) => p.id === "SOF-01");
  igual([sofa.ancho_cm, sofa.fondo_cm, sofa.alto_cm], [232, 100, 75], "si cambia el CSV, hay que revisar esta prueba");
  igual(estado(sofa, hueco(250, 110, 240)), "verde");
  igual(estado(sofa, hueco(235, 110, 240)), "ambar");
  igual(estado(sofa, hueco(230, 110, 240)), "rojo");
});

prueba("CAM-01 no tiene alto en la web: se compara sin él", async () => {
  const { productos } = await cargarDatos();
  const cama = productos.find((p) => p.id === "CAM-01");
  igual(cama.alto_cm, null);
  const encaje = evaluarEncaje(cama, hueco(160, 210, 250));
  igual(encaje.estado, "verde");
  igual(encaje.medidas[2].falta, "mueble");
});

prueba("ningún mueble del catálogo rompe el semáforo", async () => {
  const { productos } = await cargarDatos();
  productos.forEach((p) => {
    const resultado = estado(p, hueco(250, 100, 240));
    // «sin-datos» solo vale si al mueble le falta el ancho o el fondo (sale «Consultar en tienda»).
    const permitido = p.ancho_cm === null || p.fondo_cm === null ? ["sin-datos"] : ["verde", "ambar", "rojo"];
    cierto(permitido.includes(resultado), `${p.id}: ${resultado}`);
  });
});
