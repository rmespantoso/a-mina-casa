// Escena 3D de «Mi plano 3D», hecha con three.js (js/vendor/three.module.min.js, licencia MIT).
//
// Qué se ve: la habitación a escala (suelo de madera y paredes) y cada mueble con su
// ancho, fondo y alto REALES y su color (leído de la web). La FORMA es una aproximación
// según el tipo (un sofá tiene asiento, respaldo y brazos; un armario, puertas…).
// Que cada mueble se vea exactamente como en la foto necesitaría un modelo 3D de cada
// producto: eso es la fase 2 (ALI no tiene esos modelos hoy).
//
// Las paredes solo se pintan por dentro: la que queda entre la cámara y la habitación
// desaparece sola, así siempre se ve el interior.
//
// Unidades: el plano está en centímetros; la escena, en metros (x → derecha, z → puerta).

import * as THREE from "./vendor/three.module.min.js";
import { altoDibujo, distancias, enPared, huella } from "./logica/plano.js";

const CM = 0.01;
const ALTO_PARED = 2.5;
const MAGENTA = 0xd50d73;

/** Color de cada familia en 3D (algo más apagado que la muestra, para que parezca material). */
const COLOR_3D = {
  madera: 0xc49a6c, blanco: 0xf1efea, gris: 0x9a9ea3, negro: 0x3a3a3a, beige: 0xd8c6ac,
  nogal: 0x6b4a32, verde: 0x6e9a6a, azul: 0x4f6d8f, vivos: 0xc7826f,
};
const SIN_COLOR = 0xcbbfaf; // la web no dice el color: tono neutro (se avisa en la pantalla)

/** ¿Puede este navegador dibujar 3D? */
export function hayWebGL() {
  try {
    const lienzo = document.createElement("canvas");
    return Boolean(window.WebGLRenderingContext && (lienzo.getContext("webgl2") || lienzo.getContext("webgl")));
  } catch {
    return false;
  }
}

// ---------- Texturas pintadas aquí mismo (sin descargar imágenes) ----------

function texturaVetas(base, { ancho = 256, alto = 256, tablas = 0 } = {}) {
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d");
  const color = new THREE.Color(base);
  ctx.fillStyle = `#${color.getHexString()}`;
  ctx.fillRect(0, 0, ancho, alto);
  // Vetas: líneas finas un poco más claras u oscuras. Semilla fija: siempre igual.
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 70; i++) {
    const y = azar() * alto;
    const tono = color.clone().offsetHSL(0, 0, (azar() - 0.5) * 0.08);
    ctx.strokeStyle = `#${tono.getHexString()}`;
    ctx.lineWidth = 0.5 + azar() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= ancho; x += 32) ctx.lineTo(x, y + Math.sin(x / 40 + i) * 2);
    ctx.stroke();
  }
  // Juntas de las tablas del suelo.
  if (tablas) {
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 1.5;
    const alto_tabla = alto / tablas;
    for (let t = 0; t <= tablas; t++) {
      ctx.beginPath();
      ctx.moveTo(0, t * alto_tabla);
      ctx.lineTo(ancho, t * alto_tabla);
      ctx.stroke();
      const corte = ((t * 97) % 100) / 100 * ancho;
      ctx.beginPath();
      ctx.moveTo(corte, t * alto_tabla);
      ctx.lineTo(corte, (t + 1) * alto_tabla);
      ctx.stroke();
    }
  }
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.wrapS = THREE.RepeatWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  return textura;
}

// Número redondo encima de cada mueble (los contadores sí pueden ser redondos en la marca).
function etiquetaNumero(numero) {
  const lienzo = document.createElement("canvas");
  lienzo.width = 128;
  lienzo.height = 128;
  const ctx = lienzo.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#d50d73";
  ctx.stroke();
  ctx.fillStyle = "#000000";
  ctx.font = "bold 64px Poppins, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(numero), 64, 68);
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: textura, depthTest: false }));
  sprite.scale.set(0.28, 0.28, 1);
  sprite.renderOrder = 10;
  return sprite;
}

// Cartel con los centímetros que quedan hasta la pared (rectangular, como los botones de la marca).
// Se guardan hechos: al arrastrar se repiten mucho los mismos números.
const carteles = new Map();
function cartelDistancia(texto) {
  if (!carteles.has(texto)) {
    const lienzo = document.createElement("canvas");
    lienzo.width = 256;
    lienzo.height = 96;
    const ctx = lienzo.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(4, 4, 248, 88);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#d50d73";
    ctx.strokeRect(4, 4, 248, 88);
    ctx.fillStyle = "#000000";
    ctx.font = "bold 52px Poppins, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, 128, 52);
    const textura = new THREE.CanvasTexture(lienzo);
    textura.colorSpace = THREE.SRGBColorSpace;
    // sizeAttenuation false: el cartel se ve del mismo tamaño de cerca y de lejos (legible en el móvil).
    carteles.set(texto, new THREE.SpriteMaterial({ map: textura, depthTest: false, sizeAttenuation: false }));
  }
  const sprite = new THREE.Sprite(carteles.get(texto));
  sprite.scale.set(0.125, 0.047, 1);
  sprite.renderOrder = 12;
  return sprite;
}

const materialGuia = new THREE.MeshBasicMaterial({ color: MAGENTA, depthTest: false });

// Línea magenta (una barra fina) de a hasta b, con su cartel de centímetros en medio.
function guia(grupo, a, b, centimetros) {
  if (centimetros < 1) return; // pegado a la pared: no hay nada que dibujar
  const largo = a.distanceTo(b);
  const barra = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, largo), materialGuia);
  barra.position.copy(a).add(b).multiplyScalar(0.5);
  barra.lookAt(b);
  barra.renderOrder = 11;
  const cartel = cartelDistancia(`${String(centimetros).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} cm`);
  cartel.position.copy(barra.position);
  cartel.position.y += 0.05;
  grupo.add(barra, cartel);
}

// ---------- Muebles ----------
// Cada constructor devuelve un grupo con el origen en el centro de su huella, en el suelo.
// Ancho en x, fondo en z, y el frente mirando hacia +z.

function materiales(colorFamilia) {
  const base = COLOR_3D[colorFamilia] ?? SIN_COLOR;
  const esMadera = colorFamilia === "madera" || colorFamilia === "nogal";
  const cuerpo = new THREE.MeshStandardMaterial({
    color: esMadera ? 0xffffff : base,
    map: esMadera ? texturaVetas(base) : null,
    roughness: esMadera ? 0.65 : 0.85,
  });
  const frente = new THREE.MeshStandardMaterial({
    color: esMadera ? 0xf4f4f4 : new THREE.Color(base).offsetHSL(0, 0, 0.04),
    map: esMadera ? cuerpo.map : null,
    roughness: 0.6,
  });
  const oscuro = new THREE.MeshStandardMaterial({ color: 0x2f2f2f, roughness: 0.4, metalness: 0.3 });
  const cojin = new THREE.MeshStandardMaterial({ color: new THREE.Color(base).offsetHSL(0, 0, 0.03), roughness: 0.95 });
  const cristal = new THREE.MeshStandardMaterial({ color: 0xdfeef2, transparent: true, opacity: 0.35, roughness: 0.1 });
  return { cuerpo, frente, oscuro, cojin, cristal };
}

const geometriaCaja = new THREE.BoxGeometry(1, 1, 1);

// Caja de w × h × d con la base en y y el centro en (x, z).
function caja(grupo, material, w, h, d, x = 0, y = 0, z = 0) {
  if (w <= 0 || h <= 0 || d <= 0) return null;
  const malla = new THREE.Mesh(geometriaCaja, material);
  malla.scale.set(w, h, d);
  malla.position.set(x, y + h / 2, z);
  malla.castShadow = true;
  malla.receiveShadow = true;
  grupo.add(malla);
  return malla;
}

function patas(grupo, material, W, D, alto, grosor = 0.045, margen = 0.04) {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      caja(grupo, material, grosor, alto, grosor, sx * (W / 2 - margen), 0, sz * (D / 2 - margen));
    }
  }
}

function sofa(g, m, W, H, D, plazas) {
  const pata = 0.06;
  const brazo = Math.min(0.16, W * 0.12);
  const asiento = Math.min(0.48, H * 0.55);
  const respaldo = Math.min(0.24, D * 0.28);
  patas(g, m.oscuro, W, D, pata, 0.04, 0.06);
  caja(g, m.cuerpo, W, asiento - pata - 0.13, D, 0, pata);
  const dentro = W - brazo * 2;
  const n = plazas ?? Math.max(1, Math.min(4, Math.round(dentro / 0.6)));
  for (let i = 0; i < n; i++) {
    const ancho = dentro / n;
    caja(g, m.cojin, ancho - 0.015, 0.13, D - respaldo - 0.02, -dentro / 2 + ancho * (i + 0.5), asiento - 0.13, respaldo / 2 + 0.01);
  }
  caja(g, m.cuerpo, dentro, H - pata, respaldo, 0, pata, -D / 2 + respaldo / 2);
  const altoBrazo = Math.min(H - pata, Math.max(asiento + 0.15, H * 0.7) - pata);
  for (const s of [-1, 1]) caja(g, m.cuerpo, brazo, altoBrazo, D, s * (W / 2 - brazo / 2), pata);
}

function canape(g, m, W, H, D) {
  caja(g, m.cuerpo, W, H - 0.02, D);
  caja(g, m.frente, W - 0.02, 0.02, D - 0.02, 0, H - 0.02); // tapa
}

function somier(g, m, W, H, D) {
  const tablero = Math.min(0.06, H * 0.3);
  patas(g, m.oscuro, W, D, H - tablero, 0.05, 0.05);
  caja(g, m.cuerpo, W, tablero, D, 0, H - tablero);
}

function cabecero(g, m, W, H, D) {
  caja(g, m.cuerpo, W, H, D);
  const filas = Math.max(1, Math.round(H / 0.3));
  for (let i = 0; i < filas; i++) caja(g, m.cojin, W - 0.04, H / filas - 0.02, 0.015, 0, 0.01 + (H / filas) * i, D / 2);
}

function mesa(g, m, W, H, D, { balda = false } = {}) {
  const tablero = Math.min(0.04, H * 0.1);
  caja(g, m.cuerpo, W, tablero, D, 0, H - tablero);
  patas(g, m.cuerpo, W, D, H - tablero, Math.min(0.06, W * 0.08), Math.min(0.06, W * 0.1));
  if (balda) caja(g, m.cuerpo, W - 0.08, 0.025, D - 0.08, 0, Math.min(0.1, H * 0.25));
}

function silla(g, m, W, H, D, { respaldo = true, oficina = false } = {}) {
  const asiento = respaldo ? Math.min(0.48, H * 0.55) : H;
  const grosor = 0.05;
  if (oficina) {
    caja(g, m.oscuro, 0.05, asiento - grosor - 0.06, 0.05, 0, 0.06);
    for (let i = 0; i < 5; i++) {
      const brazo = caja(g, m.oscuro, Math.min(W, D) / 2, 0.04, 0.05, 0, 0.02);
      brazo.rotation.y = (i * Math.PI * 2) / 5;
      brazo.position.x = Math.cos(brazo.rotation.y) * Math.min(W, D) / 4;
      brazo.position.z = -Math.sin(brazo.rotation.y) * Math.min(W, D) / 4;
    }
  } else {
    patas(g, respaldo ? m.cuerpo : m.oscuro, W, D, asiento - grosor, 0.035, 0.035);
  }
  caja(g, m.cojin, W, grosor, D * (respaldo ? 0.9 : 1), 0, asiento - grosor, respaldo ? D * 0.05 : 0);
  if (respaldo) caja(g, m.cuerpo, W * 0.92, H - asiento, 0.04, 0, asiento, -D / 2 + 0.03);
}

// Muebles con puertas o cajones: cuerpo + frentes con juntas + tiradores.
function almacen(g, m, W, H, D, { pata = 0, puertas = 0, cajones = 0, columnas = 1, cristal = false } = {}) {
  if (pata) patas(g, m.oscuro, W, D, pata, 0.035, 0.05);
  const alto = H - pata;
  caja(g, m.cuerpo, W, alto, D, 0, pata);
  const junta = 0.008;
  const z = D / 2 + 0.006;
  const margen = 0.02;
  if (puertas) {
    const ancho = (W - margen * 2) / puertas;
    for (let i = 0; i < puertas; i++) {
      const x = -W / 2 + margen + ancho * (i + 0.5);
      caja(g, cristal ? m.cristal : m.frente, ancho - junta, alto - margen * 2, 0.012, x, pata + margen, z);
      const ladoTirador = i % 2 === 0 ? 1 : -1;
      caja(g, m.oscuro, 0.015, Math.min(0.2, alto * 0.25), 0.02, x + ladoTirador * (ancho / 2 - 0.05), pata + alto / 2 - 0.1, z + 0.012);
    }
    if (cristal) for (let b = 1; b < Math.round(alto / 0.4); b++) caja(g, m.cuerpo, W - 0.04, 0.02, D - 0.04, 0, pata + (alto / Math.round(alto / 0.4)) * b);
  }
  if (cajones) {
    const altoCajon = (alto - margen * 2) / cajones;
    const ancho = (W - margen * 2) / columnas;
    for (let c = 0; c < columnas; c++) {
      for (let i = 0; i < cajones; i++) {
        const x = -W / 2 + margen + ancho * (c + 0.5);
        const y = pata + margen + altoCajon * i;
        caja(g, m.frente, ancho - junta, altoCajon - junta, 0.012, x, y, z);
        caja(g, m.oscuro, Math.min(0.14, ancho * 0.3), 0.015, 0.02, x, y + altoCajon / 2 - 0.008, z + 0.012);
      }
    }
  }
}

function estanteria(g, m, W, H, D) {
  const grosor = 0.025;
  for (const s of [-1, 1]) caja(g, m.cuerpo, grosor, H, D, s * (W / 2 - grosor / 2), 0);
  caja(g, m.cuerpo, W, 0.01, 0.01, 0, 0, -D / 2 + 0.005);
  caja(g, m.frente, W - grosor * 2, H, 0.01, 0, 0, -D / 2 + 0.005); // trasera
  const baldas = Math.max(2, Math.round(H / 0.35));
  for (let i = 0; i <= baldas; i++) caja(g, m.cuerpo, W - grosor * 2, grosor, D, 0, Math.min(H - grosor, (H / baldas) * i));
}

/** Construye el mueble según su tipo, con sus medidas en metros. */
function construirMueble(pieza) {
  const grupo = new THREE.Group();
  const m = materiales(pieza.color);
  const W = pieza.ancho_cm * CM;
  const D = pieza.fondo_cm * CM;
  const H = altoDibujo(pieza).alto * CM;
  const bajo = (factor) => Math.min(0.12, H * factor);
  switch (pieza.tipo) {
    case "sofa": case "sofa_cama": case "chaise_longue": sofa(grupo, m, W, H, D); break;
    case "butaca": sofa(grupo, m, W, H, D, 1); break;
    case "cama_canape": canape(grupo, m, W, H, D); break;
    case "somier": somier(grupo, m, W, H, D); break;
    case "cabecero": cabecero(grupo, m, W, H, D); break;
    case "mesa_centro": mesa(grupo, m, W, H, D, { balda: H > 0.3 }); break;
    case "mesa_comedor": case "mesa_cocina": case "escritorio": case "consola": mesa(grupo, m, W, H, D); break;
    case "silla": silla(grupo, m, W, H, D); break;
    case "silla_oficina": silla(grupo, m, W, H, D, { oficina: true }); break;
    case "banqueta": silla(grupo, m, W, H, D, { respaldo: false }); break;
    case "armario": almacen(grupo, m, W, H, D, { puertas: Math.max(2, Math.round(W / 0.5)) }); break;
    case "comoda":
      almacen(grupo, m, W, H, D, { pata: bajo(0.1), cajones: Math.max(2, Math.round(H / 0.22)), columnas: W > 1.2 ? 2 : 1 }); break;
    case "mesita_noche": // la flotante va colgada: sin patas
      almacen(grupo, m, W, H, D, { pata: enPared(pieza) ? 0 : bajo(0.15), cajones: Math.max(1, Math.round(H / 0.2)) }); break;
    case "zapatero": almacen(grupo, m, W, H, D, { pata: bajo(0.06), puertas: Math.max(1, Math.round(W / 0.5)) }); break;
    case "aparador": case "mueble_tv": case "recibidor":
      almacen(grupo, m, W, H, D, { pata: bajo(0.12), puertas: Math.max(1, Math.round(W / 0.55)) }); break;
    case "mueble_cocina": case "mueble_bano": almacen(grupo, m, W, H, D, { puertas: Math.max(1, Math.round(W / 0.5)) }); break;
    case "vitrina": almacen(grupo, m, W, H, D, { pata: bajo(0.05), puertas: Math.max(1, Math.round(W / 0.5)), cristal: true }); break;
    case "estanteria": estanteria(grupo, m, W, H, D); break;
    default: caja(grupo, m.cuerpo, W, H, D);
  }
  return { grupo, alto: H, W, D };
}

// Caja de líneas alrededor del mueble: magenta si está elegido, negra a trazos si hay un aviso.
function contorno(W, H, D, estilo) {
  const geometria = new THREE.EdgesGeometry(new THREE.BoxGeometry(W + 0.03, H + 0.03, D + 0.03));
  const material = estilo === "elegido"
    ? new THREE.LineBasicMaterial({ color: MAGENTA, depthTest: false })
    : new THREE.LineDashedMaterial({ color: 0x000000, dashSize: 0.06, gapSize: 0.04, depthTest: false });
  const lineas = new THREE.LineSegments(geometria, material);
  if (estilo !== "elegido") lineas.computeLineDistances();
  lineas.position.y = H / 2;
  lineas.renderOrder = 5;
  return lineas;
}

// ---------- Escena ----------

/**
 * Prepara la escena dentro de `contenedor`.
 * `alElegir(id | null)` se llama al tocar un mueble (o el suelo vacío).
 * `alMover(id, x_cm, y_cm)` se llama al arrastrar un mueble; `alSoltar()` al terminar.
 * `alMoverEnPared(id, pared, centro_cm, altura_cm)` al arrastrar un mueble colgado por la pared.
 * `alTocar()` se llama la primera vez que el cliente toca la escena (para quitar la ayuda).
 * `alPintar()` se llama después de cada dibujo (para colocar la flecha ↻ encima del mueble elegido).
 */
export function crearEscena(contenedor, { alElegir, alMover, alMoverEnPared = () => {}, alSoltar, alTocar = () => {}, alPintar = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  contenedor.append(renderer.domElement);
  const lienzo = renderer.domElement;
  lienzo.classList.add("escena__lienzo");

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0xf3f1ee);
  const camara = new THREE.PerspectiveCamera(45, 1, 0.05, 100);

  escena.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc4, 1.6));
  const sol = new THREE.DirectionalLight(0xfff4e5, 2.2);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  sol.shadow.bias = -0.0005;
  sol.shadow.normalBias = 0.02;
  escena.add(sol, sol.target);

  const habitacion = new THREE.Group();
  const muebles = new THREE.Group();
  const guias = new THREE.Group(); // distancias del mueble elegido a las paredes
  escena.add(habitacion, muebles, guias);
  const piezas3d = new Map(); // id → { grupo, clave, alto, W, D, numero, contorno }
  let ultimoPlano = null;

  // Cámara que gira alrededor de la habitación: ángulo horizontal, inclinación y distancia.
  const vista = { theta: 0.65, phi: 1.0, radio: 6, centro: new THREE.Vector3() };
  let medidas = { W: 3, L: 3 };

  let pendiente = false;
  const pintar = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      renderer.render(escena, camara);
      alPintar();
    });
  };

  function colocarCamara() {
    vista.phi = Math.min(Math.max(vista.phi, 0.0001), 1.45);
    vista.radio = Math.min(Math.max(vista.radio, 1), 30);
    const { theta, phi, radio, centro } = vista;
    camara.position.set(
      centro.x + radio * Math.sin(phi) * Math.sin(theta),
      centro.y + radio * Math.cos(phi),
      centro.z + radio * Math.sin(phi) * Math.cos(theta),
    );
    camara.lookAt(centro);
    pintar();
  }

  function ajustarTamano() {
    const ancho = contenedor.clientWidth || 360;
    const alto = contenedor.clientHeight || 300;
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
    colocarCamara();
  }
  new ResizeObserver(ajustarTamano).observe(contenedor);

  // Distancia a la que cabe toda la habitación en pantalla.
  // Desde arriba basta con que quepan el ancho y el largo; en 3D, la diagonal de la habitación.
  function distanciaParaVer(desdeArriba = false) {
    const mitadVertical = Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
    const aspecto = Math.max(camara.aspect, 0.3);
    const diagonal = Math.hypot(medidas.W, medidas.L);
    const lado = desdeArriba
      ? Math.max(medidas.L, medidas.W / aspecto) * 1.1
      : Math.max(diagonal * 0.75, diagonal / aspecto) * 1.05;
    return lado / 2 / mitadVertical + 0.5;
  }

  function construirHabitacion(W, L) {
    habitacion.clear();
    const suelo = new THREE.Mesh(
      new THREE.PlaneGeometry(W, L),
      new THREE.MeshStandardMaterial({ map: texturaVetas(0xd9bf9a, { tablas: 8 }), roughness: 0.8 }),
    );
    suelo.material.map.repeat.set(W / 1.6, L / 1.6);
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.set(W / 2, 0, L / 2);
    suelo.receiveShadow = true;
    suelo.name = "suelo";
    habitacion.add(suelo);

    const materialPared = new THREE.MeshStandardMaterial({ color: 0xf6f3ee, roughness: 0.95 });
    const materialRodapie = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    // [ancho de la pared, x, z, giro]: el giro hace que la cara pintada mire hacia dentro.
    const paredes = [
      [W, W / 2, 0, 0],
      [W, W / 2, L, Math.PI],
      [L, 0, L / 2, Math.PI / 2],
      [L, W, L / 2, -Math.PI / 2],
    ];
    for (const [largo, x, z, giro] of paredes) {
      const pared = new THREE.Mesh(new THREE.PlaneGeometry(largo, ALTO_PARED), materialPared);
      pared.position.set(x, ALTO_PARED / 2, z);
      pared.rotation.y = giro;
      pared.receiveShadow = true;
      habitacion.add(pared);
      const rodapie = new THREE.Mesh(new THREE.PlaneGeometry(largo, 0.08), materialRodapie);
      rodapie.position.set(x, 0.04, z);
      rodapie.rotation.y = giro;
      rodapie.translateZ(0.002);
      habitacion.add(rodapie);
    }

    sol.position.set(W * 0.7, 4, L * 1.2);
    sol.target.position.set(W / 2, 0, L / 2);
    const lado = Math.max(W, L) * 0.8 + 1;
    Object.assign(sol.shadow.camera, { left: -lado, right: lado, top: lado, bottom: -lado, near: 0.5, far: 15 });
    sol.shadow.camera.updateProjectionMatrix();
  }

  /** Dibuja un plano: la habitación y sus muebles. Solo reconstruye lo que ha cambiado. */
  function dibujar(plano, { elegida = null, conAviso = new Set() } = {}) {
    ultimoPlano = plano;
    const W = plano.habitacion.ancho_cm * CM;
    const L = plano.habitacion.largo_cm * CM;
    if (W !== medidas.W || L !== medidas.L || habitacion.children.length === 0) {
      medidas = { W, L };
      construirHabitacion(W, L);
      vista.centro.set(W / 2, 0.4, L / 2);
      vista.radio = distanciaParaVer();
    }

    const vivos = new Set();
    plano.piezas.forEach((pieza, indice) => {
      vivos.add(pieza.id);
      const clave = [pieza.tipo, pieza.ancho_cm, pieza.fondo_cm, pieza.alto_cm, pieza.color, enPared(pieza)].join("|");
      let datos = piezas3d.get(pieza.id);
      if (!datos || datos.clave !== clave) {
        if (datos) muebles.remove(datos.grupo);
        const { grupo, alto, W: ancho, D } = construirMueble(pieza);
        grupo.userData.id = pieza.id;
        datos = { grupo, clave, alto, W: ancho, D, numero: null, contorno: null, estilo: null, indice: -1 };
        piezas3d.set(pieza.id, datos);
        muebles.add(grupo);
      }
      // Número encima.
      if (datos.indice !== indice) {
        if (datos.numero) datos.grupo.remove(datos.numero);
        datos.numero = etiquetaNumero(indice + 1);
        datos.numero.position.y = datos.alto + 0.2;
        datos.grupo.add(datos.numero);
        datos.indice = indice;
      }
      // Contorno según el estado.
      const estilo = pieza.id === elegida ? "elegido" : conAviso.has(pieza.id) ? "aviso" : null;
      if (datos.estilo !== estilo) {
        if (datos.contorno) datos.grupo.remove(datos.contorno);
        datos.contorno = estilo ? contorno(datos.W, datos.alto, datos.D, estilo) : null;
        if (datos.contorno) datos.grupo.add(datos.contorno);
        datos.estilo = estilo;
      }
      // Posición y giro (0, 90, 180 o 270°). Los muebles de pared, colgados a su altura.
      const { w, h } = huella(pieza);
      const altura = enPared(pieza) ? (pieza.altura_cm ?? 0) * CM : 0;
      datos.grupo.position.set((pieza.x + w / 2) * CM, altura, (pieza.y + h / 2) * CM);
      datos.grupo.rotation.y = -THREE.MathUtils.degToRad(pieza.giro ?? 0);
    });
    dibujarGuias(plano, elegida);
    for (const [id, datos] of piezas3d) {
      if (!vivos.has(id)) {
        muebles.remove(datos.grupo);
        piezas3d.delete(id);
      }
    }
    colocarCamara();
  }

  /**
   * Distancias del mueble elegido: en el suelo, cuatro líneas hacia las paredes; si está
   * colgado, sobre su pared, hacia los lados, el suelo y el techo. Cada una con sus cm.
   * Si hay otro mueble por medio, la línea se para en él (16/11/2026) y se dibuja por la
   * franja en la que los dos coinciden, para que se vea que toca al otro mueble.
   */
  function dibujarGuias(plano, id) {
    for (const hijo of guias.children) if (hijo.isMesh) hijo.geometry.dispose();
    guias.clear();
    const pieza = id && plano.piezas.find((actual) => actual.id === id);
    const espacio = pieza && distancias(plano, id);
    if (!espacio) return;
    const W = plano.habitacion.ancho_cm * CM;
    const L = plano.habitacion.largo_cm * CM;
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    // Caja de un mueble en metros: x y z en el suelo, y0-y1 en altura.
    const caja = (actual) => {
      const { w, h } = huella(actual);
      const y0 = (enPared(actual) ? actual.altura_cm ?? 0 : 0) * CM;
      return { x0: actual.x * CM, x1: (actual.x + w) * CM, z0: actual.y * CM, z1: (actual.y + h) * CM, y0, y1: y0 + altoDibujo(actual).alto * CM };
    };
    const yo = caja(pieza);
    const otro = (lado) => {
      const idOtro = espacio.hasta?.[lado];
      const encontrada = idOtro && plano.piezas.find((actual) => actual.id === idOtro);
      return encontrada ? caja(encontrada) : null;
    };
    // Mitad de la parte común de dos tramos (o la mitad del mío si no hay otro).
    const mitad = (a0, a1, b) => (b ? (Math.max(a0, b[0]) + Math.min(a1, b[1])) / 2 : (a0 + a1) / 2);
    if (espacio.tipo === "suelo") {
      const suelo = 0.02;
      const d = (lado) => espacio[lado] * CM;
      const oi = otro("izquierda");
      const od = otro("derecha");
      const of = otro("fondo");
      const oe = otro("delante");
      const zi = mitad(yo.z0, yo.z1, oi && [oi.z0, oi.z1]);
      const zd = mitad(yo.z0, yo.z1, od && [od.z0, od.z1]);
      const xf = mitad(yo.x0, yo.x1, of && [of.x0, of.x1]);
      const xe = mitad(yo.x0, yo.x1, oe && [oe.x0, oe.x1]);
      guia(guias, v(yo.x0 - d("izquierda"), suelo, zi), v(yo.x0, suelo, zi), espacio.izquierda);
      guia(guias, v(yo.x1, suelo, zd), v(yo.x1 + d("derecha"), suelo, zd), espacio.derecha);
      guia(guias, v(xf, suelo, yo.z0 - d("fondo")), v(xf, suelo, yo.z0), espacio.fondo);
      guia(guias, v(xe, suelo, yo.z1), v(xe, suelo, yo.z1 + d("delante")), espacio.delante);
      return;
    }
    // Sobre la pared: u va de izquierda a derecha mirándola de frente; alto en metros.
    const e = 0.02;
    const pared = espacio.pared;
    const enLaPared = {
      fondo: (u, alto) => v(u, alto, e),
      derecha: (u, alto) => v(W - e, alto, u),
      delante: (u, alto) => v(W - u, alto, L - e),
      izquierda: (u, alto) => v(e, alto, L - u),
    }[pared];
    // Tramo de una caja a lo largo de la pared (u0 < u1), como se ve de frente.
    const tramoU = (c) => ({
      fondo: [c.x0, c.x1],
      derecha: [c.z0, c.z1],
      delante: [W - c.x1, W - c.x0],
      izquierda: [L - c.z1, L - c.z0],
    }[pared]);
    const [u0, u1] = tramoU(yo);
    const oi = otro("izquierda");
    const od = otro("derecha");
    const os = otro("suelo");
    const ot = otro("techo");
    const alturaI = mitad(yo.y0, yo.y1, oi && [oi.y0, oi.y1]);
    const alturaD = mitad(yo.y0, yo.y1, od && [od.y0, od.y1]);
    const uS = mitad(u0, u1, os && tramoU(os));
    const uT = mitad(u0, u1, ot && tramoU(ot));
    guia(guias, enLaPared(u0 - espacio.izquierda * CM, alturaI), enLaPared(u0, alturaI), espacio.izquierda);
    guia(guias, enLaPared(u1, alturaD), enLaPared(u1 + espacio.derecha * CM, alturaD), espacio.derecha);
    guia(guias, enLaPared(uS, yo.y0 - espacio.suelo * CM), enLaPared(uS, yo.y0), espacio.suelo);
    guia(guias, enLaPared(uT, yo.y1), enLaPared(uT, yo.y1 + espacio.techo * CM), espacio.techo);
  }

  // ---------- Dedo y ratón ----------
  const rayo = new THREE.Raycaster();
  const sueloMatematico = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const punteros = new Map();
  let gesto = null; // { tipo: "mover" | "colgado" | "girar" | "pellizco", … }

  function rayoDesde(evento) {
    const caja = lienzo.getBoundingClientRect();
    const punto = new THREE.Vector2(((evento.clientX - caja.left) / caja.width) * 2 - 1, -((evento.clientY - caja.top) / caja.height) * 2 + 1);
    rayo.setFromCamera(punto, camara);
    return rayo;
  }

  function muebleTocado(evento) {
    const golpe = rayoDesde(evento).intersectObjects(muebles.children, true).find((choque) => choque.object.isMesh);
    let objeto = golpe?.object;
    while (objeto && !objeto.userData.id) objeto = objeto.parent;
    return objeto?.userData.id ?? null;
  }

  // Punto donde el dedo toca el suelo (o, para un mueble colgado, el plano horizontal a su altura).
  function puntoSuelo(evento, altura = 0) {
    const punto = new THREE.Vector3();
    sueloMatematico.constant = -altura;
    return rayoDesde(evento).ray.intersectPlane(sueloMatematico, punto) ? punto : null;
  }

  // Las cuatro paredes como planos matemáticos: normal hacia FUERA de la habitación y distancia.
  const planoPared = (pared) => {
    const { W, L } = medidas;
    const datos = {
      fondo: [new THREE.Vector3(0, 0, -1), 0],
      delante: [new THREE.Vector3(0, 0, 1), L],
      izquierda: [new THREE.Vector3(-1, 0, 0), 0],
      derecha: [new THREE.Vector3(1, 0, 0), W],
    }[pared];
    return new THREE.Plane(datos[0], -datos[1]);
  };
  // Posición a lo largo de una pared, de izquierda a derecha mirándola de frente (metros).
  const aLoLargo = (pared, punto) => ({
    fondo: punto.x,
    derecha: punto.z,
    delante: medidas.W - punto.x,
    izquierda: medidas.L - punto.z,
  }[pared]);
  const largoPared = (pared) => (pared === "fondo" || pared === "delante" ? medidas.W : medidas.L);

  /**
   * Punto de la pared que hay bajo el dedo (16/11/2026), para arrastrar los muebles colgados.
   * Se ve la cara de dentro de las paredes del fondo, así que vale la pared por la que el rayo
   * SALE de la habitación. Si el dedo no está sobre ninguna (por ejemplo, sobre el suelo), se
   * usa la pared en la que ya está el mueble. Devuelve { pared, u, alto } en metros, o null.
   */
  function puntoPared(evento, paredActual, soloEsa = false) {
    const ray = rayoDesde(evento).ray;
    const punto = new THREE.Vector3();
    let mejor = null;
    if (!soloEsa) {
      for (const pared of ["fondo", "derecha", "delante", "izquierda"]) {
        const plano = planoPared(pared);
        if (ray.direction.dot(plano.normal) <= 0) continue;
        if (!ray.intersectPlane(plano, punto)) continue;
        const u = aLoLargo(pared, punto);
        if (u < 0 || u > largoPared(pared) || punto.y < 0 || punto.y > ALTO_PARED) continue;
        const distancia = ray.origin.distanceTo(punto);
        if (!mejor || distancia < mejor.distancia) mejor = { pared, u, alto: punto.y, distancia };
      }
    }
    if (!mejor && ray.intersectPlane(planoPared(paredActual), punto)) {
      mejor = { pared: paredActual, u: aLoLargo(paredActual, punto), alto: punto.y };
    }
    return mejor;
  }

  // Centro de un mueble colgado a lo largo de su pared (cm), como lo mide colgarEn.
  function centroEnSuPared(pieza) {
    const { w, h } = huella(pieza);
    const W = medidas.W / CM;
    const L = medidas.L / CM;
    return {
      fondo: pieza.x + w / 2,
      derecha: pieza.y + h / 2,
      delante: W - (pieza.x + w / 2),
      izquierda: L - (pieza.y + h / 2),
    }[pieza.pared];
  }

  lienzo.addEventListener("pointerdown", (evento) => {
    alTocar();
    punteros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
    lienzo.setPointerCapture(evento.pointerId);
    if (punteros.size === 2) {
      const [a, b] = [...punteros.values()];
      gesto = { tipo: "pellizco", distancia: Math.hypot(a.x - b.x, a.y - b.y) };
      return;
    }
    const id = muebleTocado(evento);
    const pieza = id && ultimoPlano?.piezas.find((actual) => actual.id === id);
    // Mueble colgado: se arrastra por la pared (arriba, abajo, a los lados o a otra pared).
    const enLaPared = pieza && enPared(pieza) && puntoPared(evento, pieza.pared, true);
    if (enLaPared) {
      gesto = {
        tipo: "colgado",
        id,
        pared: pieza.pared,
        du: centroEnSuPared(pieza) - enLaPared.u / CM,
        dalto: (pieza.altura_cm ?? 0) - enLaPared.alto / CM,
        movido: false,
      };
      alElegir(id);
      return;
    }
    const altura = 0;
    const suelo = pieza && !enPared(pieza) && puntoSuelo(evento, altura);
    if (pieza && suelo) {
      // Se recuerda dónde se ha cogido el mueble, para que no salte al dedo.
      gesto = { tipo: "mover", id, altura, dx: pieza.x * CM - suelo.x, dz: pieza.y * CM - suelo.z, movido: false };
      alElegir(id);
    } else {
      gesto = { tipo: "girar", x: evento.clientX, y: evento.clientY, movido: false };
    }
  });

  lienzo.addEventListener("pointermove", (evento) => {
    if (!punteros.has(evento.pointerId)) return;
    const antes = punteros.get(evento.pointerId);
    punteros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
    if (!gesto) return;
    if (gesto.tipo === "pellizco" && punteros.size === 2) {
      const [a, b] = [...punteros.values()];
      const distancia = Math.hypot(a.x - b.x, a.y - b.y);
      vista.radio *= gesto.distancia / Math.max(distancia, 1);
      gesto.distancia = distancia;
      colocarCamara();
    } else if (gesto.tipo === "mover") {
      const suelo = puntoSuelo(evento, gesto.altura);
      if (!suelo) return;
      gesto.movido = true;
      alMover(gesto.id, (suelo.x + gesto.dx) / CM, (suelo.z + gesto.dz) / CM);
    } else if (gesto.tipo === "colgado") {
      const punto = puntoPared(evento, gesto.pared);
      if (!punto) return;
      gesto.movido = true;
      gesto.pared = punto.pared;
      alMoverEnPared(gesto.id, punto.pared, punto.u / CM + gesto.du, punto.alto / CM + gesto.dalto);
    } else if (gesto.tipo === "girar") {
      const dx = evento.clientX - antes.x;
      const dy = evento.clientY - antes.y;
      if (Math.abs(evento.clientX - gesto.x) + Math.abs(evento.clientY - gesto.y) > 4) gesto.movido = true;
      vista.theta -= dx * 0.008;
      vista.phi -= dy * 0.008;
      colocarCamara();
    }
  });

  function terminar(evento) {
    punteros.delete(evento.pointerId);
    if (!gesto) return;
    if (gesto.tipo === "mover" || gesto.tipo === "colgado") alSoltar();
    if (gesto.tipo === "girar" && !gesto.movido) alElegir(null); // tocar el suelo vacío suelta el mueble
    gesto = null;
  }
  lienzo.addEventListener("pointerup", terminar);
  lienzo.addEventListener("pointercancel", terminar);
  lienzo.addEventListener("wheel", (evento) => {
    evento.preventDefault();
    alTocar();
    vista.radio *= 1 + Math.sign(evento.deltaY) * 0.1;
    colocarCamara();
  }, { passive: false });

  function cambiarAngulo(grados) {
    camara.fov = grados;
    camara.updateProjectionMatrix();
  }

  ajustarTamano();

  return {
    dibujar,
    /**
     * Dónde se ve un mueble en la caja del 3D, en píxeles: el punto encima de su centro.
     * null si no existe o queda detrás de la cámara.
     */
    posicionEnPantalla(id) {
      const datos = piezas3d.get(id);
      if (!datos) return null;
      const punto = new THREE.Vector3(0, datos.alto + 0.5, 0); // por encima del número
      datos.grupo.localToWorld(punto);
      punto.project(camara);
      if (punto.z > 1) return null;
      return {
        x: ((punto.x + 1) / 2) * lienzo.clientWidth,
        y: ((1 - punto.y) / 2) * lienzo.clientHeight,
      };
    },
    /** Vista inclinada (3D), la de entrada. */
    vista3D() {
      cambiarAngulo(45);
      vista.theta = 0.65;
      vista.phi = 1.0;
      vista.radio = distanciaParaVer();
      colocarCamara();
    },
    /** Vista desde arriba, como un plano: para colocar con precisión. */
    vistaArriba() {
      cambiarAngulo(15); // lente estrecha: desde arriba los muebles altos casi no se inclinan
      vista.theta = 0;
      vista.phi = 0.0001;
      vista.radio = distanciaParaVer(true);
      colocarCamara();
    },
    girarVista(angulo) {
      vista.theta += angulo;
      colocarCamara();
    },
    acercar(factor) {
      vista.radio *= factor;
      colocarCamara();
    },
  };
}
