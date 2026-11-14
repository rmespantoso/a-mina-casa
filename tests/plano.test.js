// Pruebas de Mi plano 3D: medidas reales, sin salirse de la habitación y avisos claros.

import { grupo, prueba, igual, cierto } from "./mini.js";
import {
  LADO_ESTANDAR, MAX_PIEZAS, MAX_PLANOS, PRUEBA, abrirPlano, abrirPrueba, actualizarPlano, altoDibujo, cambiarHabitacion,
  coleccionValida, crearPlano, girarPieza, guardarComoNuevo, huella, moverPieza, nombreValido, planoActivo, planoDePruebaVacio,
  planoValido, ponerPieza, problemas, quitarPieza, quitarPlano, sueloLibre,
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

grupo("Plano 3D · datos para dibujar");

prueba("el mueble guarda su tipo, su alto y su color para el 3D", () => {
  const sofa = { id: "SOF-02", nombre: "Sofá de Madera de Pino", tipo: "sofa", ancho_cm: 180, fondo_cm: 90, alto_cm: 100, variantes: [] };
  const pieza = ponerPieza(crearPlano(400, 400), sofa, "a").plano.piezas[0];
  igual([pieza.tipo, pieza.alto_cm, pieza.color], ["sofa", 100, "madera"]);
});

prueba("sin alto en la web, se dibuja con un alto aproximado y se dice", () => {
  const somier = { id: "SOM-01", nombre: "Somier", tipo: "somier", ancho_cm: 150, fondo_cm: 190, alto_cm: null };
  const pieza = ponerPieza(crearPlano(400, 400), somier, "a").plano.piezas[0];
  igual(altoDibujo(pieza), { alto: 30, aproximado: true });
  igual(altoDibujo({ ...pieza, alto_cm: 32 }), { alto: 32, aproximado: false });
});

grupo("Plano 3D · plano de prueba y planos guardados");

const vacia = () => ({ activo: null, planos: [], prueba: null });
const conPieza = (plano, id = "a") => ponerPieza(plano, { id: "MNO-05", nombre: "Mesita", ancho_cm: 61, fondo_cm: 33 }, id).plano;

prueba(`el plano de prueba empieza en ${LADO_ESTANDAR} × ${LADO_ESTANDAR} cm`, () => {
  const coleccion = abrirPrueba(vacia());
  igual(coleccion.activo, PRUEBA);
  igual(planoActivo(coleccion).habitacion, { ancho_cm: LADO_ESTANDAR, largo_cm: LADO_ESTANDAR });
});

prueba("los cambios del plano de prueba se quedan en el de prueba, no en «Mis planos»", () => {
  let coleccion = abrirPrueba(vacia());
  coleccion = actualizarPlano(coleccion, conPieza(planoActivo(coleccion)));
  igual(coleccion.planos.length, 0);
  igual(coleccion.prueba.piezas.length, 1);
});

prueba("guardar como nuevo plano guarda medidas y muebles con su nombre, y vacía el de prueba", () => {
  let coleccion = abrirPrueba(vacia());
  const conMueble = cambiarHabitacion(conPieza(planoActivo(coleccion)), 300, 420);
  const salida = guardarComoNuevo(coleccion, conMueble, "  Salón  ", "h1");
  igual(salida.ok, true);
  coleccion = salida.coleccion;
  igual(coleccion.activo, "h1");
  igual(coleccion.prueba, null);
  igual([coleccion.planos[0].nombre, coleccion.planos[0].habitacion.ancho_cm, coleccion.planos[0].piezas.length], ["Salón", 300, 1]);
});

prueba("los cambios de un plano guardado se guardan en él, sin duplicarlo", () => {
  let coleccion = guardarComoNuevo(abrirPrueba(vacia()), planoDePruebaVacio(), "Dormitorio", "h1").coleccion;
  coleccion = actualizarPlano(coleccion, cambiarHabitacion(planoActivo(coleccion), 350, 400));
  igual(coleccion.planos.length, 1);
  igual(coleccion.planos[0].habitacion.ancho_cm, 350);
});

prueba(`como mucho ${MAX_PLANOS} planos guardados`, () => {
  let coleccion = vacia();
  for (let i = 0; i < MAX_PLANOS; i++) coleccion = guardarComoNuevo(coleccion, planoDePruebaVacio(), `Plano ${i}`, `h${i}`).coleccion;
  const salida = guardarComoNuevo(coleccion, planoDePruebaVacio(), "Uno más", "otro");
  igual(salida.ok, false);
  igual(salida.motivo, "lleno");
});

prueba("al borrar el plano abierto, se abre el plano de prueba", () => {
  let coleccion = guardarComoNuevo(vacia(), planoDePruebaVacio(), "A", "h1").coleccion;
  coleccion = quitarPlano(coleccion, "h1");
  igual(coleccion.planos, []);
  igual(coleccion.activo, PRUEBA);
});

prueba("abrir un plano guardado lo deja abierto; un id que no existe no cambia nada", () => {
  const coleccion = guardarComoNuevo(abrirPrueba(vacia()), planoDePruebaVacio(), "A", "h1").coleccion;
  igual(abrirPlano(abrirPrueba(coleccion), "h1").activo, "h1");
  igual(abrirPlano(coleccion, "nada"), coleccion);
});

prueba("el nombre se limpia y nunca queda vacío", () => {
  igual(nombreValido("   "), "Mi habitación");
  igual(nombreValido("  Salón   nuevo "), "Salón nuevo");
  igual(nombreValido("x".repeat(80)).length, 40);
});

prueba("el plano único de la versión anterior se recupera como plano guardado", () => {
  const coleccion = coleccionValida(null, { habitacion: { ancho_cm: 320, largo_cm: 380 }, piezas: [] });
  igual(coleccion.planos.length, 1);
  igual(coleccion.activo, coleccion.planos[0].id);
});

prueba("una colección estropeada en el navegador no rompe la página", () => {
  igual(coleccionValida("basura"), vacia());
  igual(coleccionValida({ activo: "x", planos: [null, { id: "h1", habitacion: { ancho_cm: -3 } }], prueba: 7 }), vacia());
});
