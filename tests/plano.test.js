// Pruebas del plano a escala: medidas reales, sin salirse de la habitación y avisos claros.

import { grupo, prueba, igual, cierto } from "./mini.js";
import {
  MAX_PIEZAS, cambiarHabitacion, crearPlano, girarPieza, huella, moverPieza, planoValido, ponerPieza, problemas, quitarPieza, sueloLibre,
} from "../js/logica/plano.js";

const CAMA = { id: "CAM-02", nombre: "Cama", ancho_cm: 156, fondo_cm: 196 };
const MESITA = { id: "MNO-05", nombre: "Mesita", ancho_cm: 61, fondo_cm: 33 };
const SIN_FONDO = { id: "CAB-05", nombre: "Cabecero", ancho_cm: 160, fondo_cm: null };

grupo("Plano · poner muebles");

prueba("un mueble entra con su ancho y su fondo reales, en la esquina", () => {
  const { ok, plano } = ponerPieza(crearPlano(320, 380), CAMA, "a");
  igual(ok, true);
  const pieza = plano.piezas[0];
  igual([pieza.ancho_cm, pieza.fondo_cm, pieza.x, pieza.y], [156, 196, 0, 0]);
});

prueba("el segundo mueble busca un sitio libre: no se pone encima del primero", () => {
  let plano = ponerPieza(crearPlano(320, 380), CAMA, "a").plano;
  plano = ponerPieza(plano, MESITA, "b").plano;
  igual(problemas(plano).pisadas.length, 0);
});

prueba("sin ancho o sin fondo no se dibuja (no se inventa la medida)", () => {
  const salida = ponerPieza(crearPlano(320, 380), SIN_FONDO, "a");
  igual(salida.ok, false);
  igual(salida.motivo, "sin-medidas");
});

prueba(`como mucho ${MAX_PIEZAS} muebles`, () => {
  let plano = crearPlano(3000, 3000);
  for (let i = 0; i < MAX_PIEZAS; i++) plano = ponerPieza(plano, MESITA, `p${i}`).plano;
  igual(ponerPieza(plano, MESITA, "otra").motivo, "lleno");
});

grupo("Plano · mover y girar");

prueba("se mueve de 5 en 5 cm", () => {
  const plano = moverPieza(ponerPieza(crearPlano(320, 380), MESITA, "a").plano, "a", 47, 103);
  igual([plano.piezas[0].x, plano.piezas[0].y], [45, 105]);
});

prueba("no se sale de la habitación", () => {
  const plano = moverPieza(ponerPieza(crearPlano(320, 380), MESITA, "a").plano, "a", 999, -50);
  igual([plano.piezas[0].x, plano.piezas[0].y], [320 - 61, 0]);
});

prueba("al girar, ancho y fondo se cambian en el suelo", () => {
  const plano = girarPieza(ponerPieza(crearPlano(320, 380), CAMA, "a").plano, "a");
  igual(huella(plano.piezas[0]), { w: 196, h: 156 });
});

prueba("quitar un mueble lo saca del plano", () => {
  igual(quitarPieza(ponerPieza(crearPlano(320, 380), CAMA, "a").plano, "a").piezas.length, 0);
});

grupo("Plano · avisos");

prueba("avisa si dos muebles se pisan", () => {
  let plano = ponerPieza(crearPlano(320, 380), CAMA, "a").plano;
  plano = ponerPieza(plano, MESITA, "b").plano;
  plano = moverPieza(plano, "b", 50, 50);
  igual(problemas(plano).pisadas.map(([a, b]) => [a.id, b.id]), [["a", "b"]]);
});

prueba("pegados pero sin pisarse no es un problema", () => {
  let plano = ponerPieza(crearPlano(320, 380), CAMA, "a").plano;
  plano = moverPieza(ponerPieza(plano, MESITA, "b").plano, "b", 160, 0); // la cama mide 156: queda a 4 cm
  igual(problemas(plano).pisadas.length, 0);
});

prueba("avisa si un mueble no cabe en la habitación", () => {
  const plano = ponerPieza(crearPlano(150, 300), CAMA, "a").plano;
  igual(problemas(plano).noCaben.map((pieza) => pieza.id), ["a"]);
});

prueba("al hacer la habitación más pequeña, los muebles se recolocan dentro", () => {
  let plano = moverPieza(ponerPieza(crearPlano(400, 400), MESITA, "a").plano, "a", 300, 300);
  plano = cambiarHabitacion(plano, 200, 200);
  igual([plano.piezas[0].x, plano.piezas[0].y], [200 - 61, 200 - 33]);
});

prueba("calcula el suelo libre aproximado en m²", () => {
  igual(sueloLibre(ponerPieza(crearPlano(300, 400), CAMA, "a").plano), 8.9);
});

grupo("Plano · guardado");

prueba("un plano estropeado en el navegador no rompe la página", () => {
  igual(planoValido(null), null);
  igual(planoValido({ habitacion: { ancho_cm: "mucho" } }), null);
  const limpio = planoValido({ habitacion: { ancho_cm: 300, largo_cm: 400 }, piezas: [{ id: 1 }, null] });
  igual(limpio.piezas, []);
});
