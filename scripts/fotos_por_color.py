"""Foto de cada color de los muebles con variantes (16/11/2026).

En alihogar.es un mueble con varios colores tiene una foto para cada color. El CSV solo guarda
la del color principal, así que al filtrar por «Gris» podía salir la foto en «Madera». Este script
pregunta a la web, color por color, cuál es su foto (lo mismo que hace su página al pulsar un
color) y lo guarda en data/fotos_color.json:

    { "_aviso": "...", "fotos": { "SOF-02": { "Beige": "https://alihogar.es/...jpg", "Gris": "..." } } }

Solo se guardan DIRECCIONES de fotos (no se descargan): la web las enseña desde alihogar.es,
como el resto. Las fotos son de ALI Hogar, que nos ha dado permiso para usarlas.

Para saber qué colores tiene cada mueble usa la «vista rápida» de la web (la ventanita que abre su
listado), que responde en menos de un segundo; la ficha completa tarda unos 40 segundos en cargar.
Va despacio (una petición por segundo, como el importador) y se puede cortar y volver a lanzar:
los muebles ya hechos se saltan. Después hay que regenerar el JSON:

    python scripts/fotos_por_color.py
    python scripts/csv_a_json.py
"""

import csv
import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importar_alihogar import GRUPO_MEDIDA, pedir  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
RUTA_CSV = RAIZ / "data" / "productos.csv"
RUTA_FOTOS = RAIZ / "data" / "fotos_color.json"
AVISO = ("Foto de cada color de los muebles con variantes, sacada de alihogar.es con "
         "scripts/fotos_por_color.py (16/11/2026). Solo direcciones de fotos de ALI Hogar, usadas con su permiso. "
         "No se edita a mano.")
FOTO = re.compile(r"https://alihogar\.es/\d+-large_default/[^\"'\s\\]+\.jpg")
IDS_EN_URL = re.compile(r"/(\d+)(?:-(\d+))?-[^/]+\.html$")  # .../sofas/17113-18202-sofa-turin....html


def grupos_de_variantes(contenido):
    """Grupos de variantes (color, medida…) del HTML de la web, igual que lee el importador."""
    grupos = []
    zona = contenido[contenido.find("product-variants"):]
    zona = zona[:zona.find("product-add-to-cart")] if "product-add-to-cart" in zona else zona[:20000]
    for bloque in re.findall(r'product-variants-item">(.*?)(?=product-variants-item"|$)', zona, re.S):
        nombre = re.search(r'control-label">\s*([^:<]+)', bloque)
        grupo = re.search(r'data-product-attribute="(\d+)"', bloque)
        if not (nombre and grupo):
            continue
        opciones = re.findall(r'<option value="(\d+)" title="([^"]*)"', bloque)
        opciones += re.findall(r'<input[^>]*value="(\d+)"[^>]*title="([^"]*)"', bloque)
        elegida = re.search(r'value="(\d+)"[^>]*(?:selected|checked)', bloque)
        grupos.append({
            "nombre": nombre.group(1).strip(),
            "id": grupo.group(1),
            "opciones": [(valor, html.unescape(titulo).strip()) for valor, titulo in opciones],
            "elegida": elegida.group(1) if elegida else (opciones[0][0] if opciones else None),
        })
    return grupos


def vista_rapida(url):
    """Id del producto y sus grupos de variantes, con la vista rápida de la web."""
    ids = IDS_EN_URL.search(url)
    if not ids:
        return None
    datos = {"action": "quickview", "ajax": "1", "id_product": ids.group(1), "id_product_attribute": ids.group(2) or "0"}
    respuesta = pedir("https://alihogar.es/index.php?controller=product", datos)
    try:
        contenido = json.loads(respuesta).get("quickview_html", "")
    except (TypeError, ValueError):
        return None
    return ids.group(1), grupos_de_variantes(contenido)


def guardar(fotos):
    RUTA_FOTOS.write_text(json.dumps({"_aviso": AVISO, "fotos": fotos}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def foto_de_color(url, id_producto, grupos, grupo_color, valor):
    """Pide a la web la combinación con ese color y devuelve la dirección de su primera foto."""
    datos = {"ajax": "1", "action": "refresh", "quantity_wanted": "1", "id_product": id_producto, "id_customization": "0"}
    for grupo in grupos:
        datos[f"group[{grupo['id']}]"] = valor if grupo["id"] == grupo_color["id"] else grupo["elegida"]
    respuesta = pedir(url, datos)
    try:
        respuesta = json.loads(respuesta)
    except (TypeError, ValueError):
        return None
    encontrada = FOTO.search(respuesta.get("product_cover_thumbnails", "").replace("\\/", "/"))
    return encontrada.group(0) if encontrada else None


def main():
    previas = {}
    if RUTA_FOTOS.exists():
        previas = json.loads(RUTA_FOTOS.read_text(encoding="utf-8")).get("fotos", {})
    with RUTA_CSV.open(encoding="utf-8", newline="") as archivo:
        filas = [fila for fila in csv.DictReader(archivo) if fila["variantes"].strip() and fila["url_alihogar"].strip()]
    print(f"{len(filas)} muebles con variantes; {len(previas)} ya hechos.")
    fotos = dict(previas)
    for numero, fila in enumerate(filas, 1):
        if fila["id"] in fotos:
            continue
        url = fila["url_alihogar"].split("#")[0]
        leida = vista_rapida(url)
        if not leida:
            print(f"  [{numero}] {fila['id']}: no se pudo leer la vista rápida")
            continue
        id_producto, grupos = leida
        colores = [grupo for grupo in grupos if not GRUPO_MEDIDA.search(grupo["nombre"])]
        delmueble = {}
        for grupo in colores:
            for valor, titulo in grupo["opciones"]:
                # A la dirección general del producto: la de su ficha tarda unos 40 s en responder.
                foto = foto_de_color(f"https://alihogar.es/index.php?controller=product&id_product={id_producto}", id_producto, grupos, grupo, valor)
                if foto:
                    delmueble[titulo] = foto
        fotos[fila["id"]] = delmueble
        print(f"  [{numero}/{len(filas)}] {fila['id']}: {len(delmueble)} colores con foto")
        guardar(fotos)  # se guarda cada mueble: si se corta, no se pierde nada
    guardar(fotos)
    print(f"Hecho: {sum(1 for v in fotos.values() if v)} muebles con fotos por color en {RUTA_FOTOS.name}.")


if __name__ == "__main__":
    main()
