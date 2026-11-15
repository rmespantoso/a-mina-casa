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

/** Devuelve las estancias de «Planifica tu espacio» (data/estancias.json). */
export async function cargarEstancias() {
  return (await pedirJson(URL_ESTANCIAS)).estancias;
}

const URL_FOTOS_3D = new URL("../data/fotos_3d.json", import.meta.url);

/** Ids de los muebles que tienen copia de su foto para la vista «Foto real» de Mi plano 3D. */
export async function cargarFotos3d() {
  try {
    return new Set((await pedirJson(URL_FOTOS_3D)).fotos);
  } catch {
    return new Set(); // sin el archivo, todos los muebles se ven con su forma
  }
}

/** Dirección de la copia de la foto de un mueble (img/fotos-3d/ID.jpg). */
export function urlFoto3d(id) {
  return new URL(`../img/fotos-3d/${encodeURIComponent(id)}.jpg`, import.meta.url).href;
}
