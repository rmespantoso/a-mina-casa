"""Convierte data/productos.csv en data/products.json.

Cómo usarlo (desde la carpeta del proyecto):

    python scripts/csv_a_json.py        (en Mac o Linux: python3 scripts/csv_a_json.py)

Reglas que sigue:
- El CSV es la ÚNICA fuente de datos. El JSON se genera siempre con este script
  y nunca se edita a mano.
- No inventa nada: si un dato falta en el CSV, en el JSON queda como null y la
  web muestra "Consultar en tienda".
- El EAN se guarda como texto para no perder los ceros de la izquierda.
- `notas_internas` NO pasa al JSON: son apuntes del equipo, no avisos para el cliente.

Solo usa la biblioteca estándar de Python: no hay que instalar nada más.
"""

import csv
import json
import sys
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
RUTA_CSV = RAIZ / "data" / "productos.csv"
RUTA_JSON = RAIZ / "data" / "products.json"
RUTA_REGLAS = RAIZ / "data" / "reglas_proporcion.json"
RUTA_FOTOS_COLOR = RAIZ / "data" / "fotos_color.json"  # lo genera scripts/fotos_por_color.py (16/11/2026)

# Columnas que debe tener el CSV, en este orden.
COLUMNAS = [
    "id", "ean", "nombre", "tipo", "estancia", "precio_eur",
    "ancho_cm", "fondo_cm", "alto_cm", "ancho_abierto_cm", "seccion_nave",
    "url_alihogar", "url_foto", "variantes", "foto_autorizada",
    "medidas_origen", "aviso_cliente", "notas_internas",
]

errores = []   # impiden generar el JSON
avisos = []    # no lo impiden, pero conviene revisarlos


def texto(valor):
    """Devuelve el texto sin espacios sobrantes, o None si está vacío."""
    valor = (valor or "").strip()
    return valor or None


def numero(valor, id_producto, columna):
    """Convierte "34.5" en 34.5 y "180" en 180. Vacío -> None. Otra cosa -> error."""
    valor = (valor or "").strip()
    if not valor:
        return None
    try:
        n = float(valor)
    except ValueError:
        errores.append(f"{id_producto}: «{valor}» no es un número en la columna {columna}")
        return None
    if n <= 0:
        errores.append(f"{id_producto}: {columna} debe ser mayor que 0 (pone {valor})")
        return None
    return int(n) if n.is_integer() else n


def lista(valor):
    """Convierte "salon|comedor" en ["salon", "comedor"]. Vacío -> []."""
    return [parte.strip() for parte in (valor or "").split("|") if parte.strip()]


def convertir_fila(fila):
    """Pasa una fila del CSV al formato que usa la web."""
    id_producto = texto(fila["id"]) or "(sin id)"

    producto = {
        "id": texto(fila["id"]),
        "ean": texto(fila["ean"]),                      # siempre texto
        "nombre": texto(fila["nombre"]),
        "tipo": texto(fila["tipo"]),
        "estancias": lista(fila["estancia"]),
        "precio_eur": numero(fila["precio_eur"], id_producto, "precio_eur"),
        "ancho_cm": numero(fila["ancho_cm"], id_producto, "ancho_cm"),
        "fondo_cm": numero(fila["fondo_cm"], id_producto, "fondo_cm"),
        "alto_cm": numero(fila["alto_cm"], id_producto, "alto_cm"),
        "ancho_abierto_cm": numero(fila["ancho_abierto_cm"], id_producto, "ancho_abierto_cm"),
        "seccion_nave": texto(fila["seccion_nave"]),
        "url_alihogar": texto(fila["url_alihogar"]),
        "url_foto": texto(fila["url_foto"]),
        "foto_autorizada": (fila["foto_autorizada"] or "").strip().lower() in ("si", "sí"),
        "variantes": lista(fila["variantes"]),
        "medidas_origen": texto(fila["medidas_origen"]),
        "aviso_cliente": texto(fila["aviso_cliente"]),
    }

    # Datos imprescindibles: sin ellos el producto no se puede enseñar.
    for campo in ("id", "nombre", "tipo"):
        if not producto[campo]:
            errores.append(f"{id_producto}: falta «{campo}»")
    if not producto["estancias"]:
        errores.append(f"{id_producto}: falta «estancia»")

    # Datos que pueden faltar: se avisa y la web dirá "Consultar en tienda".
    for campo in ("precio_eur", "ancho_cm", "fondo_cm", "alto_cm", "url_alihogar"):
        if producto[campo] is None:
            avisos.append(f"{id_producto}: sin «{campo}» -> la web mostrará «Consultar en tienda»")

    if producto["ean"] and not (producto["ean"].isdigit() and len(producto["ean"]) == 13):
        avisos.append(f"{id_producto}: el EAN «{producto['ean']}» no tiene 13 cifras")
    if producto["url_alihogar"] and not producto["url_alihogar"].startswith("https://alihogar.es/"):
        avisos.append(f"{id_producto}: el enlace no es de https://alihogar.es/")
    if (producto["ancho_abierto_cm"] and producto["ancho_cm"]
            and producto["ancho_abierto_cm"] <= producto["ancho_cm"]):
        errores.append(f"{id_producto}: ancho_abierto_cm debe ser mayor que ancho_cm")

    return producto


def main():
    # En Windows la consola no siempre usa UTF-8: lo forzamos para las tildes.
    sys.stdout.reconfigure(encoding="utf-8")

    # utf-8-sig acepta el archivo tanto si Excel le ha puesto marca BOM como si no.
    with open(RUTA_CSV, encoding="utf-8-sig", newline="") as archivo:
        lector = csv.DictReader(archivo)
        if lector.fieldnames != COLUMNAS:
            print("ERROR: las columnas del CSV no son las esperadas.")
            print("  Esperadas:", ", ".join(COLUMNAS))
            print("  Leídas:   ", ", ".join(lector.fieldnames or []))
            sys.exit(1)
        filas = list(lector)

    productos = [convertir_fila(fila) for fila in filas]

    # Foto de cada color (si existe data/fotos_color.json): { "Gris": "https://alihogar.es/...jpg" }.
    # Solo se guardan los colores que el mueble tiene en el CSV y fotos de alihogar.es.
    fotos_color = {}
    if RUTA_FOTOS_COLOR.exists():
        fotos_color = json.loads(RUTA_FOTOS_COLOR.read_text(encoding="utf-8")).get("fotos", {})
    for producto in productos:
        delmueble = {color: url for color, url in fotos_color.get(producto["id"], {}).items()
                     if color in producto["variantes"] and str(url).startswith("https://alihogar.es/")}
        if delmueble:
            producto["fotos_color"] = delmueble

    # Ids repetidos.
    for id_producto, veces in Counter(p["id"] for p in productos).items():
        if veces > 1:
            errores.append(f"{id_producto}: el id aparece {veces} veces")

    # Cada tipo debe tener su regla de proporción.
    reglas = json.loads(RUTA_REGLAS.read_text(encoding="utf-8"))
    for producto in productos:
        if producto["tipo"] and producto["tipo"] not in reglas["tipos"]:
            avisos.append(f"{producto['id']}: el tipo «{producto['tipo']}» no tiene regla en reglas_proporcion.json")

    if errores:
        print(f"ERROR: {len(errores)} problema(s). No se ha generado el JSON.")
        for error in errores:
            print("  -", error)
        sys.exit(1)

    salida = {
        "_aviso": "Archivo GENERADO por scripts/csv_a_json.py a partir de data/productos.csv. No lo edites a mano.",
        "productos": productos,
    }
    with open(RUTA_JSON, "w", encoding="utf-8", newline="\n") as archivo:
        json.dump(salida, archivo, ensure_ascii=False, indent=2)
        archivo.write("\n")

    # ---- Informe ----
    print(f"OK: {len(productos)} productos escritos en {RUTA_JSON.relative_to(RAIZ)}")
    print("\nPor tipo:")
    for tipo, cuantos in Counter(p["tipo"] for p in productos).most_common():
        print(f"  {tipo:13} {cuantos}")

    sin_seccion = sum(1 for p in productos if not p["seccion_nave"])
    sin_foto = sum(1 for p in productos if not p["foto_autorizada"])
    print("\nDatos pendientes:")
    print(f"  Sin sección de la nave: {sin_seccion} de {len(productos)}")
    print(f"  Sin foto autorizada:    {sin_foto} de {len(productos)}")
    if avisos:
        print(f"\nAvisos ({len(avisos)}):")
        for aviso in avisos:
            print("  -", aviso)

    por_revisar = [(f["id"], f["notas_internas"]) for f in filas if "Revisar" in (f["notas_internas"] or "")]
    if por_revisar:
        print(f"\nNotas internas marcadas «Revisar» ({len(por_revisar)}):")
        for id_producto, nota in por_revisar:
            print(f"  - {id_producto}: {nota}")


if __name__ == "__main__":
    main()
