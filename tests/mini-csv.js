// Lector de CSV mínimo para las pruebas: entiende comillas y comas dentro de comillas.
// Devuelve una lista de objetos { columna: valor } con todos los valores como texto.

export function leerCsv(texto) {
  const filas = [];
  let fila = [];
  let celda = "";
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const letra = texto[i];
    if (entreComillas) {
      if (letra === '"' && texto[i + 1] === '"') {
        celda += '"';       // dos comillas seguidas = una comilla escrita
        i++;
      } else if (letra === '"') {
        entreComillas = false;
      } else {
        celda += letra;
      }
    } else if (letra === '"') {
      entreComillas = true;
    } else if (letra === ",") {
      fila.push(celda);
      celda = "";
    } else if (letra === "\n") {
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else if (letra !== "\r") {
      celda += letra;
    }
  }
  if (celda !== "" || fila.length > 0) {
    fila.push(celda);
    filas.push(fila);
  }

  const [cabecera, ...resto] = filas;
  return resto
    .filter((valores) => valores.some((valor) => valor !== ""))
    .map((valores) => Object.fromEntries(cabecera.map((columna, i) => [columna, valores[i] ?? ""])));
}
