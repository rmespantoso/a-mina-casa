// Mini herramienta de pruebas, hecha a medida para no instalar nada.
// Uso:
//   grupo("Semáforo");
//   prueba("5 cm justos es verde", () => { igual(resultado, "verde"); });
// Las pruebas se ejecutan abriendo tests/index.html en el navegador.

const pruebas = [];
let grupoActual = "General";

/** Pone título al bloque de pruebas que viene a continuación. */
export function grupo(nombre) {
  grupoActual = nombre;
}

/** Apunta una prueba. `funcion` puede ser asíncrona. */
export function prueba(nombre, funcion) {
  pruebas.push({ grupo: grupoActual, nombre, funcion });
}

/** Falla si los dos valores no son iguales (compara también listas y objetos). */
export function igual(real, esperado, mensaje = "") {
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a !== b) throw new Error(`${mensaje ? mensaje + ": " : ""}se esperaba ${b} y salió ${a}`);
}

/** Falla si la condición no se cumple. */
export function cierto(condicion, mensaje = "la condición no se cumple") {
  if (!condicion) throw new Error(mensaje);
}

/** Ejecuta todas las pruebas apuntadas y devuelve la lista de resultados. */
export async function ejecutar() {
  const resultados = [];
  for (const { grupo: nombreGrupo, nombre, funcion } of pruebas) {
    try {
      await funcion();
      resultados.push({ grupo: nombreGrupo, nombre, ok: true });
    } catch (error) {
      resultados.push({ grupo: nombreGrupo, nombre, ok: false, error: error.message });
    }
  }
  return resultados;
}
