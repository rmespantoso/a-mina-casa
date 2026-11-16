// Pruebas de Mi plano 3D: medidas reales, sin salirse de la habitación y avisos claros.

import { grupo, prueba, igual, cierto } from "./mini.js";
import {
  LADO_ESTANDAR, MAX_PIEZAS, MAX_PLANOS, PRUEBA, abrirPlano, abrirPrueba, actualizarPlano, altoDibujo, cambiarHabitacion,
  coleccionValida, crearPlano, girarPieza, guardarComoNuevo, huella, moverPieza, nombreValido, planoActivo, planoDePruebaVacio,
  planoValido, ponerPieza, problemas, quitarPieza, quitarPlano, sueloLibre,
  ALTO_HABITACION, distancias, esDePared, moverEnPared, precioPlano,
} from "../js/logica/plano.js";
import { cargarColocacion, cargarDatos } from "../js/datos.js";

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

grupo("Plano · girar de 90 en 90°");

prueba("cuatro toques de ↻ dan la vuelta entera y el mueble vuelve a su sitio", () => {
  let plano = moverPieza(ponerPieza(crearPlano(500, 500), CAMA, "a").plano, "a", 100, 100);
  const inicio = plano.piezas[0];
  const giros = [];
  for (let i = 0; i < 4; i++) {
    plano = girarPieza(plano, "a");
    giros.push(plano.piezas[0].giro);
  }
  igual(giros, [90, 180, 270, 0]);
  igual([plano.piezas[0].x, plano.piezas[0].y], [inicio.x, inicio.y]);
});

prueba("gira sobre su centro (no sobre la esquina)", () => {
  const plano = girarPieza(moverPieza(ponerPieza(crearPlano(500, 500), CAMA, "a").plano, "a", 100, 100), "a");
  const { x, y } = plano.piezas[0];
  const { w, h } = huella(plano.piezas[0]);
  igual([x + w / 2, y + h / 2], [100 + 78, 100 + 98]);
});

prueba("un plano guardado acepta 180 y 270, y lo raro vuelve a 0", () => {
  const base = { habitacion: { ancho_cm: 300, largo_cm: 300 } };
  const pieza = (giro) => ({ id: "a", producto: "X", ancho_cm: 50, fondo_cm: 40, x: 0, y: 0, giro });
  igual(planoValido({ ...base, piezas: [pieza(270)] }).piezas[0].giro, 270);
  igual(planoValido({ ...base, piezas: [pieza(45)] }).piezas[0].giro, 0);
});

grupo("Plano · distancias y precio");

prueba("distancias de un mueble del suelo a las cuatro paredes", () => {
  const plano = moverPieza(ponerPieza(crearPlano(400, 300), MESITA, "a").plano, "a", 100, 50);
  igual(distancias(plano, "a"), { tipo: "suelo", izquierda: 100, derecha: 400 - 100 - 61, fondo: 50, delante: 300 - 50 - 33, hasta: {} });
  igual(distancias(plano, "nada"), null);
});

prueba("el precio de la habitación suma los muebles y cuenta los que no tienen precio", () => {
  let plano = ponerPieza(crearPlano(500, 500), CAMA, "a").plano;
  plano = ponerPieza(plano, MESITA, "b").plano;
  plano = ponerPieza(plano, MESITA, "c").plano;
  const catalogo = [{ id: "CAM-02", precio_eur: 299.95 }, { id: "MNO-05", precio_eur: 40.1 }];
  igual(precioPlano(plano, catalogo), { total: 380.15, sinPrecio: 0 });
  igual(precioPlano(plano, [{ id: "CAM-02", precio_eur: 300 }]), { total: 300, sinPrecio: 2 });
});

grupo("Plano · muebles de pared");

const COLOCACION = { palabras: ["de pared", "flotante"], altura_cm: { estanteria: 120, mesita_noche: 45 }, altura_por_defecto: 100 };
const BALDA = { id: "EST-07", nombre: "Estante Balda de Pared", tipo: "estanteria", ancho_cm: 138, fondo_cm: 30, alto_cm: 3 };
const FLOTANTE = { id: "MNO-46", nombre: "Mesita de Noche Flotante", tipo: "mesita_noche", ancho_cm: 47, fondo_cm: 30, alto_cm: 45 };
const ARMARIO = { id: "ARM-01", nombre: "Armario", tipo: "armario", ancho_cm: 100, fondo_cm: 60, alto_cm: 200 };

prueba("se reconoce por las palabras del nombre (sin mirar tildes ni mayúsculas)", () => {
  cierto(esDePared(BALDA, COLOCACION));
  cierto(esDePared({ nombre: "MESITA FLOTANTE" }, COLOCACION));
  cierto(!esDePared({ nombre: "Mesa de centro con balda" }, COLOCACION));
  cierto(!esDePared(BALDA, null), "sin reglas, todo va al suelo");
});

prueba("entra pegado a la pared del fondo, a la altura de su tipo", () => {
  const [balda] = ponerPieza(crearPlano(400, 300), BALDA, "a", COLOCACION).plano.piezas;
  igual([balda.pared, balda.altura_cm, balda.y, balda.giro], ["fondo", 120, 0, 0]);
  igual(ponerPieza(crearPlano(400, 300), FLOTANTE, "b", COLOCACION).plano.piezas[0].altura_cm, 45);
});

prueba("flechas: sube y baja de 10 en 10 sin pasar del techo ni del suelo", () => {
  let plano = ponerPieza(crearPlano(400, 300), FLOTANTE, "a", COLOCACION).plano;
  plano = moverEnPared(plano, "a", "arriba");
  igual(plano.piezas[0].altura_cm, 55);
  for (let i = 0; i < 30; i++) plano = moverEnPared(plano, "a", "arriba");
  igual(plano.piezas[0].altura_cm, ALTO_HABITACION - 45, "el techo manda");
  for (let i = 0; i < 30; i++) plano = moverEnPared(plano, "a", "abajo");
  igual(plano.piezas[0].altura_cm, 0);
});

prueba("flechas: izquierda y derecha como se ve la pared de frente", () => {
  let plano = moverPieza(ponerPieza(crearPlano(400, 300), FLOTANTE, "a", COLOCACION).plano, "a", 100, 0);
  plano = moverEnPared(plano, "a", "derecha");
  igual(plano.piezas[0].x, 110, "en el fondo, → va hacia la derecha del plano");
  plano = girarPieza(girarPieza(plano, "a"), "a"); // a la pared de delante
  igual(plano.piezas[0].pared, "delante");
  const antes = plano.piezas[0].x;
  plano = moverEnPared(plano, "a", "derecha");
  cierto(plano.piezas[0].x < antes && plano.piezas[0].x >= antes - 10, "en la de delante, → va al revés");
});

prueba("↻ lo pasa a la pared siguiente, con la trasera pegada", () => {
  let plano = ponerPieza(crearPlano(400, 300), BALDA, "a", COLOCACION).plano;
  const vistas = [];
  for (let i = 0; i < 4; i++) {
    plano = girarPieza(plano, "a");
    const pieza = plano.piezas[0];
    const { w, h } = huella(pieza);
    vistas.push([pieza.pared, pieza.giro]);
    if (pieza.pared === "derecha") igual(pieza.x + w, 400);
    if (pieza.pared === "delante") igual(pieza.y + h, 300);
    if (pieza.pared === "izquierda") igual(pieza.x, 0);
  }
  igual(vistas, [["derecha", 90], ["delante", 180], ["izquierda", 270], ["fondo", 0]]);
});

prueba("al arrastrarlo se pega a la pared más cercana y conserva la altura", () => {
  let plano = ponerPieza(crearPlano(400, 300), FLOTANTE, "a", COLOCACION).plano;
  plano = moverPieza(plano, "a", 10, 150);
  igual([plano.piezas[0].pared, plano.piezas[0].x, plano.piezas[0].altura_cm], ["izquierda", 0, 45]);
});

prueba("no pisa a un mueble bajo de debajo, pero sí a uno alto o a otro de pared", () => {
  let plano = ponerPieza(crearPlano(400, 300), MESITA, "suelo").plano; // mesita sin tipo ni alto: 80 cm aproximados
  plano = ponerPieza(plano, BALDA, "balda", COLOCACION).plano;
  igual(plano.piezas[1].x, 0, "la balda puede ir encima de la mesita");
  igual(problemas(plano).pisadas.length, 0);
  plano = ponerPieza(plano, ARMARIO, "armario").plano;
  plano = moverPieza(plano, "armario", 0, 0);
  igual(problemas(plano).pisadas.length, 2, "el armario de 200 cm choca con la mesita y con la balda");
  const dos = ponerPieza(ponerPieza(crearPlano(400, 300), BALDA, "x", COLOCACION).plano, BALDA, "y", COLOCACION).plano;
  igual(problemas(dos).pisadas.length, 0, "la segunda balda busca hueco libre en la pared");
});

prueba("distancias de un mueble de pared: lados, suelo y techo", () => {
  const plano = moverPieza(ponerPieza(crearPlano(400, 300), FLOTANTE, "a", COLOCACION).plano, "a", 100, 0);
  igual(distancias(plano, "a"), { tipo: "pared", pared: "fondo", izquierda: 100, derecha: 400 - 100 - 47, suelo: 45, techo: 250 - 45 - 45, hasta: {} });
});

grupo("Plano · distancias con otro mueble por medio");

prueba("la línea se para en el mueble de al lado y dice cuál es", () => {
  let plano = ponerPieza(crearPlano(400, 300), MESITA, "a").plano;
  plano = ponerPieza(plano, MESITA, "b").plano;
  plano = moverPieza(plano, "a", 100, 50);
  plano = moverPieza(plano, "b", 250, 50);
  const espacio = distancias(plano, "a");
  igual(espacio.derecha, 250 - 161, "hasta la mesita b, no hasta la pared");
  igual(espacio.hasta.derecha, "b");
  igual(espacio.izquierda, 100, "a la izquierda no hay nada: hasta la pared");
  igual(espacio.hasta.izquierda, undefined);
  igual(distancias(plano, "b").izquierda, 89, "desde b, igual hacia el otro lado");
});

prueba("un mueble que no está en la misma fila no corta la línea", () => {
  let plano = ponerPieza(crearPlano(400, 300), MESITA, "a").plano;
  plano = ponerPieza(plano, MESITA, "b").plano;
  plano = moverPieza(plano, "a", 100, 50);
  plano = moverPieza(plano, "b", 250, 200);
  igual(distancias(plano, "a").hasta.derecha, undefined);
  igual(distancias(plano, "a").derecha, 400 - 161);
});

prueba("una balda colgada encima no corta la línea del suelo; un armario alto sí", () => {
  let plano = ponerPieza(crearPlano(400, 300), MESITA, "a").plano;
  plano = moverPieza(plano, "a", 100, 100);
  plano = ponerPieza(plano, BALDA, "balda", COLOCACION).plano;
  plano = moverPieza(plano, "balda", 60, 0);
  igual(distancias(plano, "a").fondo, 100, "la balda está a 120 cm: la línea llega a la pared");
  plano = ponerPieza(plano, ARMARIO, "armario").plano;
  plano = moverPieza(plano, "armario", 90, 0);
  igual(distancias(plano, "a").fondo, 40, "el armario (60 de fondo) sí la corta");
  igual(distancias(plano, "a").hasta.fondo, "armario");
});

prueba("un mueble de pared mide hasta lo que tiene debajo y hasta otro de su pared", () => {
  let plano = ponerPieza(crearPlano(400, 300), MESITA, "m").plano;
  plano = moverPieza(plano, "m", 0, 0);
  plano = ponerPieza(plano, BALDA, "x", COLOCACION).plano;
  plano = moverPieza(plano, "x", 0, 0);
  const altoMesita = altoDibujo(plano.piezas.find((pieza) => pieza.id === "m")).alto;
  let espacio = distancias(plano, "x");
  igual(espacio.suelo, 120 - altoMesita, "de la balda a la mesita de debajo");
  igual(espacio.hasta.suelo, "m");
  plano = ponerPieza(plano, BALDA, "y", COLOCACION).plano;
  plano = moverPieza(plano, "y", 200, 0);
  plano = moverEnPared(plano, "y", "arriba");
  plano = moverEnPared(plano, "y", "abajo");
  espacio = distancias(plano, "x");
  igual(espacio.derecha, 200 - 138, "hasta la otra balda de la misma pared");
  igual(espacio.hasta.derecha, "y");
  igual(espacio.hasta.izquierda, undefined);
});

prueba("un plano guardado conserva la pared y descarta una pared inventada", () => {
  const base = { habitacion: { ancho_cm: 300, largo_cm: 300 } };
  const pieza = (pared, altura_cm) => ({ id: "a", producto: "X", ancho_cm: 50, fondo_cm: 40, x: 0, y: 0, giro: 0, pared, altura_cm });
  const buena = planoValido({ ...base, piezas: [pieza("derecha", 120)] }).piezas[0];
  igual([buena.pared, buena.altura_cm, buena.giro], ["derecha", 120, 90]);
  const mala = planoValido({ ...base, piezas: [pieza("techo", 120)] }).piezas[0];
  cierto(!("pared" in mala) && !("altura_cm" in mala));
});

prueba("los muebles de pared no ocupan suelo", () => {
  const plano = ponerPieza(crearPlano(400, 300), BALDA, "a", COLOCACION).plano;
  igual(sueloLibre(plano), 12);
});

prueba("en el catálogo real, las baldas y mesitas flotantes van a la pared y las mesas con balda no", async () => {
  const [{ productos }, colocacion] = await Promise.all([cargarDatos(), cargarColocacion()]);
  const dePared = productos.filter((p) => esDePared(p, colocacion));
  cierto(dePared.length >= 20, `${dePared.length} de pared`);
  cierto(dePared.every((p) => ["estanteria", "mesita_noche", "mueble_cocina"].includes(p.tipo)), "solo estantes, mesitas y el botellero");
  cierto(!productos.some((p) => /con balda/i.test(p.nombre) && esDePared(p, colocacion)));
});
