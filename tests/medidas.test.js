// Pruebas de cómo se lee una medida escrita por el cliente (filtros y Mi plano 3D).

import { grupo, prueba, igual, cierto } from "./mini.js";
import { leerMedida } from "../js/logica/medidas.js";

grupo("Medidas · leer una medida");

prueba("una medida normal vale, con coma o con punto", () => {
  igual(leerMedida("250"), { estado: "ok", valor: 250 });
  igual(leerMedida("94,5"), { estado: "ok", valor: 94.5 });
  igual(leerMedida("94.5"), { estado: "ok", valor: 94.5 });
  igual(leerMedida(" 180 cm "), { estado: "ok", valor: 180 });
});

prueba("un campo vacío no es un error: es «sin indicar»", () => {
  igual(leerMedida("").estado, "vacia");
  igual(leerMedida("   ").estado, "vacia");
  igual(leerMedida(undefined).estado, "vacia");
});

prueba("letras, negativos y símbolos no valen", () => {
  igual(leerMedida("dos metros").estado, "error");
  igual(leerMedida("-80").estado, "error");
  igual(leerMedida("2x3").estado, "error");
  igual(leerMedida("0").estado, "error");
});

prueba("si parece escrita en metros se pregunta, no se corrige sola", () => {
  const leida = leerMedida("2,5");
  igual(leida.estado, "metros");
  igual(leida.sugerencia, 250);
  cierto(leida.mensaje.includes("250 cm"), leida.mensaje);
  igual(leerMedida("0.8").sugerencia, 80);
  igual(leerMedida("2,03").sugerencia, 203, "se calcula sin redondear antes");
});

prueba("los límites: 20 y 1000 cm valen; 19 y 1001 no", () => {
  igual(leerMedida("20").estado, "ok");
  igual(leerMedida("1000").estado, "ok");
  igual(leerMedida("19").estado, "error");
  igual(leerMedida("1001").estado, "error");
});

