// Guarda y lee datos en el propio móvil del cliente (localStorage).
// Aquí no hay servidor: nada de lo que se guarda sale del navegador.
//
// Cada lectura y cada escritura va dentro de try/catch porque el navegador
// puede negarse a guardar (modo privado estricto, almacenamiento bloqueado o
// lleno). Si pasa, la web NO se rompe: usa una copia en memoria que dura
// mientras la página siga abierta.

const PREFIJO = "amicasa:";   // para no mezclarnos con datos de otras webs
const memoria = new Map();    // plan B cuando localStorage no funciona

/** ¿Deja este navegador guardar datos? Se comprueba escribiendo y borrando una prueba. */
export function hayAlmacen() {
  try {
    const clave = PREFIJO + "prueba";
    window.localStorage.setItem(clave, "1");
    window.localStorage.removeItem(clave);
    return true;
  } catch {
    return false;
  }
}

/** Lee un dato guardado. Si no existe o está estropeado, devuelve `porDefecto`. */
export function leer(clave, porDefecto = null) {
  try {
    const texto = window.localStorage.getItem(PREFIJO + clave);
    if (texto !== null) return JSON.parse(texto);
  } catch {
    // localStorage bloqueado o texto que no es JSON: seguimos con la memoria.
  }
  return memoria.has(clave) ? memoria.get(clave) : porDefecto;
}

/** Guarda un dato. Devuelve true si quedó guardado en el móvil y false si solo en memoria. */
export function guardar(clave, valor) {
  memoria.set(clave, valor);
  try {
    window.localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

/** Borra un dato guardado. */
export function borrar(clave) {
  memoria.delete(clave);
  try {
    window.localStorage.removeItem(PREFIJO + clave);
  } catch {
    // Nada que hacer: en memoria ya está borrado.
  }
}
