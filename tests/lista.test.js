// Pruebas de Mi lista: guardar, no duplicar, quitar y el código ALI-XXXX.

import { grupo, prueba, igual, cierto } from "./mini.js";
import { borrar, guardar, leer } from "../js/almacen.js";
import { MAX_PRODUCTOS, anadirALista, estaEnLista, limpiarLista, nuevoCodigo, quitarDeLista } from "../js/logica/lista.js";
import { estaGuardado, guardarProducto, leerLista, quitarProducto } from "../js/mi-lista.js";

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
