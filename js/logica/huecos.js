// Reglas de un hueco: qué medidas valen y cuáles no.
// Es lógica pura: no toca la pantalla ni guarda nada, y por eso se puede probar sola
// (tests/huecos.test.js).

export const MEDIDA_MINIMA = 20;    // cm. Por debajo, casi seguro que es un error.
export const MEDIDA_MAXIMA = 1000;  // cm. Una pared de más de 10 m no es de una casa.
export const MAX_HUECOS = 8;
export const LARGO_NOMBRE = 40;

export const ESTANCIAS = ["salon", "comedor", "dormitorio", "recibidor"];

/**
 * Lee lo que el cliente ha escrito en un campo de medida. Devuelve uno de estos:
 * - { estado: "vacia" }                      no ha escrito nada
 * - { estado: "ok", valor }                  medida válida, en cm
 * - { estado: "metros", sugerencia, mensaje } parece escrita en metros: se pregunta, no se corrige sola
 * - { estado: "error", mensaje }             no vale
 */
export function leerMedida(texto) {
  const limpio = String(texto ?? "").trim().replace(/\s*cm$/i, "").replace(",", ".");
  if (limpio === "") return { estado: "vacia" };

  if (!/^\d+(\.\d+)?$/.test(limpio)) {
    return { estado: "error", mensaje: "Escribe solo el número, en centímetros. Por ejemplo: 250." };
  }

  const escrito = Number(limpio);
  const valor = Math.round(escrito * 10) / 10; // un decimal como mucho

  if (valor < MEDIDA_MINIMA) {
    // Se calcula con lo escrito, sin redondear: 2,03 m son 203 cm, no 200.
    const enCentimetros = Math.round(escrito * 100);
    if (enCentimetros >= MEDIDA_MINIMA && enCentimetros <= MEDIDA_MAXIMA) {
      return {
        estado: "metros",
        sugerencia: enCentimetros,
        mensaje: `¿Son ${enCentimetros} cm? Parece que lo has escrito en metros.`,
      };
    }
    return { estado: "error", mensaje: `Es muy poco. La medida mínima es ${MEDIDA_MINIMA} cm: revísala.` };
  }

  if (valor > MEDIDA_MAXIMA) {
    return { estado: "error", mensaje: `Es demasiado. La medida máxima es ${MEDIDA_MAXIMA} cm: revísala.` };
  }

  return { estado: "ok", valor };
}

// Revisa una lista de campos de medida y reparte el resultado en valores, errores y sugerencias.
function revisarMedidas(datos, campos) {
  const valores = {};
  const errores = {};
  const sugerencias = {};
  for (const { nombre, obligatoria, falta } of campos) {
    const leida = leerMedida(datos[nombre]);
    if (leida.estado === "ok") {
      valores[nombre] = leida.valor;
    } else if (leida.estado === "vacia") {
      valores[nombre] = null;
      if (obligatoria) errores[nombre] = falta;
    } else {
      errores[nombre] = leida.mensaje;
      if (leida.estado === "metros") sugerencias[nombre] = leida.sugerencia;
    }
  }
  return { valores, errores, sugerencias };
}

/**
 * Revisa el formulario de un hueco. El ancho es obligatorio; el fondo y el alto, opcionales
 * (si faltan, el semáforo se los salta y lo dice).
 * Devuelve { ok, hueco, errores, sugerencias }.
 */
export function validarHueco(datos = {}) {
  const { valores, errores, sugerencias } = revisarMedidas(datos, [
    { nombre: "ancho", obligatoria: true, falta: "Falta el ancho. Es la única medida obligatoria." },
    { nombre: "fondo", obligatoria: false },
    { nombre: "alto", obligatoria: false },
  ]);

  const nombre = String(datos.nombre ?? "").trim().replace(/\s+/g, " ");
  if (nombre === "") errores.nombre = "Ponle un nombre para reconocerlo. Por ejemplo: Pared del sofá.";
  else if (nombre.length > LARGO_NOMBRE) errores.nombre = `El nombre es muy largo: como mucho ${LARGO_NOMBRE} letras.`;

  if (!ESTANCIAS.includes(datos.estancia)) errores.estancia = "Elige en qué estancia está.";

  const ok = Object.keys(errores).length === 0;
  const hueco = ok
    ? { nombre, estancia: datos.estancia, ancho_cm: valores.ancho, fondo_cm: valores.fondo, alto_cm: valores.alto }
    : null;
  return { ok, hueco, errores, sugerencias };
}

// Identificador nuevo para un hueco: h1, h2, h3… sin repetir ninguno de la lista.
function siguienteId(lista) {
  const numeros = lista.map((hueco) => Number(String(hueco.id).slice(1))).filter(Number.isFinite);
  return `h${Math.max(0, ...numeros) + 1}`;
}

/**
 * Añade un hueco a la lista o, si se pasa `id`, cambia el que ya existe.
 * No modifica la lista recibida: devuelve una nueva.
 * Devuelve { ok, lista, id } o { ok: false, motivo: "lleno" | "no-existe", lista }.
 */
export function ponerHueco(lista, hueco, id = null) {
  if (id !== null) {
    if (!lista.some((actual) => actual.id === id)) return { ok: false, motivo: "no-existe", lista };
    return { ok: true, id, lista: lista.map((actual) => (actual.id === id ? { ...hueco, id } : actual)) };
  }
  if (lista.length >= MAX_HUECOS) return { ok: false, motivo: "lleno", lista };
  const nuevoId = siguienteId(lista);
  return { ok: true, id: nuevoId, lista: [...lista, { ...hueco, id: nuevoId }] };
}

/** Devuelve la lista sin el hueco indicado. Los demás no se tocan. */
export function quitarHueco(lista, id) {
  return lista.filter((hueco) => hueco.id !== id);
}

const esMedida = (valor) => typeof valor === "number" && valor >= MEDIDA_MINIMA && valor <= MEDIDA_MAXIMA;
const medidaONada = (valor) => (esMedida(valor) ? valor : null);

/** Limpia lo leído del móvil: si está estropeado o manipulado, se queda solo lo que es válido. */
export function limpiarHuecos(dato) {
  if (!Array.isArray(dato)) return [];
  return dato
    .filter((hueco) => hueco && typeof hueco === "object" && typeof hueco.id === "string" && esMedida(hueco.ancho_cm))
    .slice(0, MAX_HUECOS)
    .map((hueco) => ({
      id: hueco.id,
      nombre: String(hueco.nombre ?? "Hueco").slice(0, LARGO_NOMBRE),
      estancia: ESTANCIAS.includes(hueco.estancia) ? hueco.estancia : "salon",
      ancho_cm: hueco.ancho_cm,
      fondo_cm: medidaONada(hueco.fondo_cm),
      alto_cm: medidaONada(hueco.alto_cm),
    }));
}
