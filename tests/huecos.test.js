// Pruebas de Mis huecos: qué medidas valen, el aviso de metros, el máximo de 8,
// y editar y borrar.

import { grupo, prueba, igual, cierto } from "./mini.js";
import { borrar, guardar, leer } from "../js/almacen.js";
import {
  MAX_HUECOS, leerMedida, limpiarHuecos, ponerHueco, quitarHueco, validarHueco,
} from "../js/logica/huecos.js";
import { borrarHueco, guardarHueco, leerHuecos } from "../js/mis-huecos.js";

const PARED = { nombre: "Pared del sofá", estancia: "salon", ancho: "250", fondo: "95", alto: "" };
const hueco = (nombre, ancho = 200) => ({ nombre, estancia: "salon", ancho_cm: ancho, fondo_cm: null, alto_cm: null });

grupo("Huecos · leer una medida");

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

grupo("Huecos · formulario");

prueba("un hueco bien rellenado se acepta y el alto vacío queda sin indicar", () => {
  const revision = validarHueco(PARED);
  igual(revision.ok, true);
  igual(revision.hueco, { nombre: "Pared del sofá", estancia: "salon", ancho_cm: 250, fondo_cm: 95, alto_cm: null });
});

prueba("el ancho es obligatorio; el fondo y el alto, no", () => {
  igual(validarHueco({ ...PARED, fondo: "", alto: "" }).ok, true);
  const revision = validarHueco({ ...PARED, ancho: "" });
  igual(revision.ok, false);
  igual(Object.keys(revision.errores), ["ancho"]);
});

prueba("hacen falta nombre y una estancia de las cuatro", () => {
  igual(Object.keys(validarHueco({ ...PARED, nombre: "  " }).errores), ["nombre"]);
  igual(Object.keys(validarHueco({ ...PARED, estancia: "garaje" }).errores), ["estancia"]);
  igual(Object.keys(validarHueco({ ...PARED, nombre: "x".repeat(41) }).errores), ["nombre"]);
});

prueba("una medida en metros bloquea el guardado y propone la corrección", () => {
  const revision = validarHueco({ ...PARED, ancho: "2,5" });
  igual(revision.ok, false);
  igual(revision.hueco, null);
  igual(revision.sugerencias, { ancho: 250 });
});

grupo("Huecos · la lista");

prueba("no se pasa de 8 huecos", () => {
  let lista = [];
  for (let i = 1; i <= MAX_HUECOS; i++) lista = ponerHueco(lista, hueco(`Hueco ${i}`)).lista;
  igual(lista.length, 8);
  const noveno = ponerHueco(lista, hueco("Uno más"));
  igual(noveno.ok, false);
  igual(noveno.motivo, "lleno");
  igual(noveno.lista.length, 8);
});

prueba("editar un hueco no toca los demás ni cambia su sitio", () => {
  let lista = ponerHueco([], hueco("A", 100)).lista;
  lista = ponerHueco(lista, hueco("B", 200)).lista;
  lista = ponerHueco(lista, hueco("C", 300)).lista;
  const cambiada = ponerHueco(lista, hueco("B grande", 220), "h2").lista;
  igual(cambiada.map((h) => `${h.id}:${h.nombre}:${h.ancho_cm}`), ["h1:A:100", "h2:B grande:220", "h3:C:300"]);
  igual(lista[1].nombre, "B", "la lista original no se modifica");
  igual(ponerHueco(lista, hueco("X"), "h99").ok, false);
});

prueba("borrar un hueco no toca los demás, y el siguiente no repite identificador", () => {
  let lista = ponerHueco([], hueco("A")).lista;
  lista = ponerHueco(lista, hueco("B")).lista;
  lista = ponerHueco(lista, hueco("C")).lista;
  const sinB = quitarHueco(lista, "h2");
  igual(sinB.map((h) => h.id), ["h1", "h3"]);
  igual(ponerHueco(sinB, hueco("D")).id, "h4");
});

prueba("datos estropeados o manipulados en el móvil no rompen la pantalla", () => {
  igual(limpiarHuecos("texto raro"), []);
  igual(limpiarHuecos([null, { id: "h1" }, { id: "h2", ancho_cm: 99999 }]), []);
  const limpio = limpiarHuecos([{ id: "h1", nombre: "A", estancia: "garaje", ancho_cm: 200, fondo_cm: "x", alto_cm: 240 }]);
  igual(limpio, [{ id: "h1", nombre: "A", estancia: "salon", ancho_cm: 200, fondo_cm: null, alto_cm: 240 }]);
});

grupo("Huecos · guardar en el móvil");

/** Ejecuta una prueba sin huecos guardados y deja el navegador como estaba. */
function conMovilLimpio(funcion) {
  return () => {
    const huecosAntes = leer("huecos", null);
    borrar("huecos");
    try {
      funcion();
    } finally {
      if (huecosAntes === null) borrar("huecos"); else guardar("huecos", huecosAntes);
    }
  };
}

prueba("un hueco guardado sigue ahí al volver a leer", conMovilLimpio(() => {
  const resultado = guardarHueco(validarHueco(PARED).hueco);
  igual(resultado.ok, true);
  igual(leerHuecos().map((h) => h.nombre), ["Pared del sofá"]);
}));

prueba("se puede cambiar y borrar un hueco guardado", conMovilLimpio(() => {
  const { id } = guardarHueco(hueco("A", 100));
  guardarHueco(hueco("B", 200));
  guardarHueco(hueco("A corregido", 120), id);
  igual(leerHuecos().map((h) => h.nombre), ["A corregido", "B"]);
  borrarHueco(id);
  igual(leerHuecos().map((h) => h.nombre), ["B"]);
}));
