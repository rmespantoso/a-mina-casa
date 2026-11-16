// Carga los datos del prototipo: los productos y las reglas de proporción.
// Los dos son archivos JSON de la carpeta data/. Aquí no hay ningún dato escrito a mano.

// Las rutas se calculan desde ESTE archivo, así funcionan igual en la portada,
// en la carpeta de tests y en GitHub Pages.
const URL_PRODUCTOS = new URL("../data/products.json", import.meta.url);
const URL_REGLAS = new URL("../data/reglas_proporcion.json", import.meta.url);

const URL_AMBIENTES = new URL("../data/ambientes.json", import.meta.url);
const URL_ESTANCIAS = new URL("../data/estancias.json", import.meta.url);

let promesa = null; // para pedir los archivos una sola vez por página

async function pedirJson(url) {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`No se pudo cargar ${url.pathname} (${respuesta.status})`);
  return respuesta.json();
}

/** Devuelve { productos, reglas }. */
export function cargarDatos() {
  if (!promesa) {
    promesa = Promise.all([pedirJson(URL_PRODUCTOS), pedirJson(URL_REGLAS)])
      .then(([catalogo, reglas]) => ({ productos: catalogo.productos, reglas }))
      .catch((error) => {
        promesa = null; // si falló, que se pueda volver a intentar
        throw error;
      });
  }
  return promesa;
}

/** Busca un producto por su id (por ejemplo "SOF-01"). Si no existe, devuelve null. */
export async function buscarProducto(id) {
  const { productos } = await cargarDatos();
  return productos.find((producto) => producto.id === id) ?? null;
}

/** Devuelve la lista de ambientes tal como está en data/ambientes.json (sin limpiar). */
export async function cargarAmbientes() {
  return (await pedirJson(URL_AMBIENTES)).ambientes;
}

const URL_COMPLEMENTOS = new URL("../data/complementos.json", import.meta.url);

/** Reglas de los recomendados de la ficha (data/complementos.json): { combina_con, no_es_coleccion }. */
export async function cargarComplementos() {
  const { combina_con: combina = {}, no_es_coleccion: noEs = [] } = await pedirJson(URL_COMPLEMENTOS);
  return { combina_con: combina, no_es_coleccion: noEs };
}

/** Devuelve las estancias de «Planifica tu espacio» (data/estancias.json). */
export async function cargarEstancias() {
  return (await pedirJson(URL_ESTANCIAS)).estancias;
}

const URL_COLOCACION = new URL("../data/colocacion.json", import.meta.url);

/** Qué muebles van colgados en la pared de Mi plano 3D (data/colocacion.json). */
export async function cargarColocacion() {
  const { palabras = [], altura_cm: alturas = {}, altura_por_defecto: porDefecto = 120 } = await pedirJson(URL_COLOCACION);
  return { palabras, altura_cm: alturas, altura_por_defecto: porDefecto };
}
