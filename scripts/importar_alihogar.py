"""Importa a data/productos.csv los muebles de alihogar.es de las secciones con hueco.

Cómo usarlo (desde la carpeta del proyecto):

    python scripts/importar_alihogar.py            (tarda unos 20 minutos)
    python scripts/csv_a_json.py                   (después, para generar el JSON)

Qué hace:
- Recorre las secciones de la lista SECCIONES (salón, comedor, dormitorio,
  descanso, sofás, entrada y estudio) y lee la ficha de cada mueble.
- Pide una página por segundo para no cargar la web de ALI Hogar.
- NO toca las filas que ya están en el CSV (las revisó el equipo a mano):
  solo añade los muebles nuevos detrás.
- Escribe un informe para revisar en docs/informe_importacion.csv
  (docs/ no se publica).

Reglas (las mismas del proyecto):
- No inventa medidas. Solo guarda una medida si en la ficha hay UNA medida
  clara de tres números (ancho x fondo x alto, en ese orden: la web no lo
  etiqueta). Si hay varias o ninguna, la deja vacía y la web dirá
  «Consultar en tienda».
- Si una medida parece rara (por ejemplo, un sofá más alto que hondo), la
  guarda tal cual y la marca «Revisar» en notas_internas: no la corrige.
- Canapés con varios tamaños: una fila por tamaño. La web da el tamaño del
  colchón, no el del canapé por fuera, así que esas medidas quedan vacías.
- Somieres y bases: su medida es la del colchón; se guarda con un aviso.
- No guarda stock ni precios «antes X €»: solo el precio de hoy.

Solo usa la biblioteca estándar de Python: no hay que instalar nada más.
"""

import csv
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
RUTA_CSV = RAIZ / "data" / "productos.csv"
RUTA_INFORME = RAIZ / "docs" / "informe_importacion.csv"

WEB = "https://alihogar.es/"
AGENTE = "Mozilla/5.0 (compatible; AMinaCasaPrototipo/1.0; prototipo de estudiantes)"
PAUSA_S = 1.0          # segundos entre peticiones
HOY = date.today().strftime("%d/%m/%Y")

# Sección de alihogar.es -> (tipo, estancias, prefijo del id).
# El orden importa: si un mueble sale en dos secciones, se queda con la primera.
SECCIONES = [
    ("38-sofas", "sofa", "salon", "SOF"),
    ("39-chaise-longue", "chaise_longue", "salon", "CHL"),
    ("40-sofas-cama", "sofa_cama", "salon|dormitorio", "SCA"),
    ("41-butaca", "butaca", "salon|dormitorio", "BUT"),
    ("8-composicion-tv", "mueble_tv", "salon", "TV"),
    ("7-muebles-tv", "mueble_tv", "salon", "TV"),
    ("5-aparadores", "aparador", "salon|comedor", "APA"),
    ("6-vitrinas", "vitrina", "salon|comedor", "VIT"),
    ("10-mesas-de-comedor", "mesa_comedor", "comedor", "MES"),
    ("9-mesas-de-centro-y-auxiliares", "mesa_centro", "salon", "MCE"),
    ("47-canapes", "cama_canape", "dormitorio", "CAM"),
    ("48-somieres-y-bases", "somier", "dormitorio", "SOM"),
    ("15-cabecero", "cabecero", "dormitorio", "CAB"),
    ("16-armarios", "armario", "dormitorio", "ARM"),
    ("18-comodas-y-sinfonieres", "comoda", "dormitorio", "COM"),
    ("14-mesitas-de-noche", "mesita_noche", "dormitorio", "MNO"),
    ("17-pie-de-cama", "banqueta", "dormitorio", "BAN"),
    ("20-recibidores", "recibidor", "recibidor", "REC"),
    ("21-consolas", "consola", "recibidor|salon", "CON"),
    ("22-zapateros", "zapatero", "recibidor", "ZAP"),
    ("25-escritorios", "escritorio", "estudio|dormitorio", "ESC"),
    ("27-estanterias-y-librerias", "estanteria", "salon|estudio|dormitorio", "EST"),
]

COLUMNAS = [
    "id", "ean", "nombre", "tipo", "estancia", "precio_eur",
    "ancho_cm", "fondo_cm", "alto_cm", "ancho_abierto_cm", "seccion_nave",
    "url_alihogar", "url_foto", "variantes", "foto_autorizada",
    "medidas_origen", "aviso_cliente", "notas_internas",
]

# Grupos de variantes que cambian la medida del mueble (los demás son colores o acabados).
GRUPO_MEDIDA = re.compile(r"tama|medid|dimensi|plaza|ancho|largo|formato", re.I)

NUM = r"(\d{1,3}(?:[.,]\d{1,2})?)"
TRIPLE = re.compile(NUM + r"\s*(?:cm)?\s*[x×X]\s*" + NUM + r"\s*(?:cm)?\s*[x×X]\s*" + NUM + r"\s*(?:cm|centímetros)", re.I)
# Mesas extensibles: «140 - 180 x 90 x 75 cm» o «140/190 x 90 x 78 cm» (cerrada - abierta).
RANGO = re.compile(NUM + r"\s*(?:cm)?\s*[-–/]\s*" + NUM + r"\s*(?:cm)?\s*[x×X]\s*" + NUM + r"\s*(?:cm)?\s*[x×X]\s*" + NUM + r"\s*(?:cm|centímetros)", re.I)
# Medida escrita junto al nombre del tamaño: «Grande: 160-200-240 x 90 x 76 cm».
TRAS_TAMANO = NUM + r"((?:\s*[-–/]\s*\d{1,3}(?:[.,]\d{1,2})?)*)\s*(?:cm)?\s*[x×X]\s*" + NUM + r"\s*(?:cm)?\s*[x×X]\s*" + NUM + r"\s*cm"

# Accesorios que salen en las secciones de muebles pero no ocupan un hueco (patas sueltas).
ACCESORIO = re.compile(r"^(set\s+(de\s+)?\d+\s+patas|patas?\b)", re.I)

DOBLE = re.compile(NUM + r"\s*(?:cm)?\s*[x×X]\s*" + NUM + r"\s*cm", re.I)
ETIQUETA = re.compile(r"(medidas|dimensiones|dimensión|tamaño|medida)\b[^.:\d]{0,40}:?\s*$", re.I)

informe = []   # filas del informe de revisión


# ---------- Descargas ----------

def pedir(url, datos=None):
    """Descarga una página (o hace un POST si hay datos). Espera PAUSA_S antes de cada petición."""
    time.sleep(PAUSA_S)
    cabeceras = {"User-Agent": AGENTE, "Accept-Language": "es-ES,es;q=0.9"}
    cuerpo = None
    if datos is not None:
        cuerpo = urllib.parse.urlencode(datos).encode()
        cabeceras["X-Requested-With"] = "XMLHttpRequest"
    for intento in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=cuerpo, headers=cabeceras), timeout=30) as respuesta:
                return respuesta.read().decode("utf-8", errors="replace")
        except Exception as error:  # red caída, 503…: se reintenta con calma
            if intento == 2:
                print(f"  ! No se pudo leer {url}: {error}")
                return None
            time.sleep(5 * (intento + 1))


# ---------- Lectura de la web ----------

def productos_de_seccion(seccion):
    """Devuelve las direcciones de los muebles de una sección (sin repetir)."""
    vistos, urls, pagina = set(), [], 1
    while True:
        contenido = pedir(f"{WEB}{seccion}?resultsPerPage=200&page={pagina}")
        if not contenido:
            break
        nuevos = 0
        for bloque in re.findall(r'<article class="product-miniature.*?</article>', contenido, re.S):
            id_web = re.search(r'data-id-product="(\d+)"', bloque)
            enlace = re.search(r'href="(https://alihogar\.es/[^"#?]+\.html)', bloque)
            if id_web and enlace and id_web.group(1) not in vistos:
                vistos.add(id_web.group(1))
                urls.append((id_web.group(1), enlace.group(1)))
                nuevos += 1
        if nuevos == 0 or f"page={pagina + 1}" not in contenido:
            break
        pagina += 1
    return urls


def leer_ficha(url):
    """Lee la ficha de un mueble: datos del producto y grupos de variantes."""
    contenido = pedir(url)
    if not contenido:
        return None
    dato = re.search(r'data-product="([^"]+)"', contenido)
    if not dato:
        return None
    producto = json.loads(html.unescape(dato.group(1)))
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
    return producto, grupos


def precio_combinacion(url, id_producto, grupos, elecciones):
    """Pregunta a la web el precio y la dirección de una combinación (un tamaño concreto)."""
    datos = {"ajax": "1", "action": "refresh", "quantity_wanted": "1", "id_product": id_producto, "id_customization": "0"}
    for grupo in grupos:
        datos[f"group[{grupo['id']}]"] = elecciones.get(grupo["id"], grupo["elegida"])
    respuesta = pedir(url, datos)
    try:
        respuesta = json.loads(respuesta)
    except (TypeError, ValueError):
        return None, url
    precio = re.search(r'current-price-value"[^>]*content="([\d.]+)"', respuesta.get("product_prices", "")) \
        or re.search(r'itemprop="price"[^>]*content="([\d.]+)"', respuesta.get("product_prices", ""))
    enlace = (respuesta.get("product_url") or url).split("#")[0]
    return (float(precio.group(1)) if precio else None), enlace


# ---------- Medidas ----------

def numero(texto):
    valor = float(texto.replace(",", "."))
    return int(valor) if valor.is_integer() else valor


def texto_limpio(trozo_html):
    texto = html.unescape(re.sub(r"<[^>]+>", " ", trozo_html or ""))
    return re.sub(r"\s+", " ", texto).strip()


def buscar_medidas(texto):
    """
    Busca la medida del mueble en el texto de la ficha.
    Devuelve (ancho, fondo, alto, ancho_abierto, texto_original, motivo).
    Si no está clara, las medidas van a None.
    """
    rangos = {}
    for encontrada in RANGO.finditer(texto):
        cerrada, abierta, fondo, alto = (numero(parte) for parte in encontrada.groups())
        if abierta > cerrada:
            rangos.setdefault((cerrada, fondo, alto, abierta), texto[max(0, encontrada.start() - 30):encontrada.end()].strip())
    if len(rangos) == 1:
        (medida, original), = rangos.items()
        return (*medida, original, "")
    etiquetadas, todas = {}, {}
    for encontrada in TRIPLE.finditer(texto):
        if rangos and RANGO.search(texto[max(0, encontrada.start() - 12):encontrada.end()]):
            continue
        medida = tuple(numero(parte) for parte in encontrada.groups())
        original = texto[max(0, encontrada.start() - 30):encontrada.end()].strip()
        todas.setdefault(medida, original)
        if ETIQUETA.search(texto[max(0, encontrada.start() - 50):encontrada.start()]):
            etiquetadas.setdefault(medida, original)
    for grupo, motivo in ((etiquetadas, ""), (todas, "medida sin etiqueta en la ficha")):
        if len(grupo) == 1:
            (medida, original), = grupo.items()
            return (*medida, None, original, motivo)
        if len(grupo) > 1:
            return None, None, None, None, " | ".join(list(grupo.values())[:3]), "varias medidas distintas en la ficha"
    if re.search(r"Ø|diámetro", texto, re.I):
        return None, None, None, None, "", "mueble redondo (diámetro): revisar a mano"
    return None, None, None, None, "", "la ficha no da una medida de tres números"


def medida_de_tamano(texto, titulo):
    """
    Busca en la ficha la medida que va justo detrás del nombre de un tamaño
    («Pequeño: 140-180 x 90 x 76 cm»). Solo la da si aparece una única vez.
    Devuelve (ancho, fondo, alto, ancho_abierto, texto_original) o None.
    """
    halladas = {}
    for encontrada in re.finditer(re.escape(titulo) + r"\s*:?\s*" + TRAS_TAMANO, texto, re.I):
        primero, resto, fondo, alto = encontrada.groups()
        ancho = numero(primero)
        pasos = [numero(parte) for parte in re.findall(r"\d{1,3}(?:[.,]\d{1,2})?", resto or "")]
        abierto = pasos[-1] if pasos and pasos[-1] > ancho else None
        halladas.setdefault((ancho, numero(fondo), numero(alto), abierto), encontrada.group(0))
    if len(halladas) == 1:
        (medida, original), = halladas.items()
        return (*medida, original)
    return None


def avisos_de_medida(tipo, ancho, fondo, alto):
    """Señales de que el orden ancho x fondo x alto puede no ser el de la web. No corrige nada."""
    avisos = []
    if None in (ancho, fondo, alto):
        return avisos
    if any(valor > 400 for valor in (ancho, fondo, alto)):
        avisos.append("alguna medida pasa de 4 m")
    if tipo in ("sofa", "chaise_longue", "sofa_cama") and alto > fondo + 15:
        avisos.append(f"alto ({alto}) mayor que fondo ({fondo})")
    if tipo in ("mesa_comedor", "escritorio") and not 60 <= alto <= 95:
        avisos.append(f"alto de {alto} cm raro para una mesa")
    if tipo in ("aparador", "comoda", "mueble_tv", "recibidor", "consola", "zapatero") and fondo > ancho:
        avisos.append(f"fondo ({fondo}) mayor que ancho ({ancho})")
    return avisos


# ---------- Filas del CSV ----------

def ean_de(url, producto):
    final = re.search(r"-(\d{13})\.html$", url)
    if final:
        return final.group(1)
    ean = (producto.get("ean13") or "").strip()
    return ean if ean.isdigit() and len(ean) == 13 else ""


def foto_de(producto):
    try:
        return producto["cover"]["bySize"]["large_default"]["url"]
    except (KeyError, TypeError):
        imagenes = producto.get("images") or []
        try:
            return imagenes[0]["bySize"]["large_default"]["url"]
        except (IndexError, KeyError, TypeError):
            return ""


def apuntar(id_fila, nombre, url, motivo):
    informe.append({"id": id_fila, "nombre": nombre, "url": url, "motivo": motivo})


def filas_de_producto(seccion, url, ficha, siguiente_id):
    """Convierte la ficha de un mueble en una o varias filas del CSV (una por tamaño)."""
    _, tipo, estancias, _ = seccion
    producto, grupos = ficha
    nombre = texto_limpio(producto.get("name"))
    descripcion = texto_limpio(producto.get("description_short", "")) + " " + texto_limpio(producto.get("description", ""))
    grupos_medida = [grupo for grupo in grupos if GRUPO_MEDIDA.search(grupo["nombre"])]
    colores = [titulo for grupo in grupos if grupo not in grupos_medida for _, titulo in grupo["opciones"]]
    extensible = bool(re.search(r"extensible", nombre + " " + descripcion, re.I))
    base = {
        "ean": ean_de(url, producto),
        "tipo": tipo,
        "estancia": estancias,
        "ancho_abierto_cm": "",
        "seccion_nave": "",
        "url_foto": foto_de(producto),
        "variantes": "|".join(dict.fromkeys(colores)),
        "foto_autorizada": "si",
    }
    nota_base = f"Importado automáticamente de alihogar.es el {HOY}."

    # Caso normal: el mueble tiene una sola medida (los colores no la cambian).
    if not grupos_medida:
        ancho, fondo, alto, abierto, original, motivo = buscar_medidas(descripcion)
        avisos = avisos_de_medida(tipo, ancho, fondo, alto)
        if abierto:
            aviso_cliente = f"Extensible: {ancho} cm cerrada, {abierto} cm abierta"
        elif extensible and ancho:
            aviso_cliente = "Mesa extensible: la medida abierta, consultar en tienda"
        else:
            aviso_cliente = ""
        id_fila = siguiente_id()
        if motivo:
            apuntar(id_fila, nombre, url, motivo)
        if avisos:
            apuntar(id_fila, nombre, url, "Revisar orden: " + "; ".join(avisos))
        if extensible and not abierto:
            apuntar(id_fila, nombre, url, "Extensible: falta la medida abierta (ancho_abierto_cm)")
        nota = nota_base + (f" Revisar orden: {'; '.join(avisos)}." if avisos else "") + (f" {motivo.capitalize()}." if motivo else "")
        return [{**base, "id": id_fila, "nombre": nombre, "precio_eur": producto.get("price_amount") or "",
                 "ancho_cm": ancho or "", "fondo_cm": fondo or "", "alto_cm": alto or "", "ancho_abierto_cm": abierto or "",
                 "url_alihogar": url, "medidas_origen": original, "aviso_cliente": aviso_cliente, "notas_internas": nota}]

    # Varios grupos que cambian la medida: no se puede saber qué medida es cuál.
    if len(grupos_medida) > 1:
        id_fila = siguiente_id()
        apuntar(id_fila, nombre, url, "varios grupos de tamaño: medidas sin rellenar")
        return [{**base, "id": id_fila, "nombre": nombre, "precio_eur": producto.get("price_amount") or "",
                 "ancho_cm": "", "fondo_cm": "", "alto_cm": "", "url_alihogar": url, "medidas_origen": "",
                 "aviso_cliente": "", "notas_internas": nota_base + " Varios tamaños: medidas sin rellenar."}]

    # Un grupo de tamaño: una fila por tamaño, con su precio y su enlace.
    grupo = grupos_medida[0]
    filas = []
    for valor, titulo in grupo["opciones"]:
        precio, enlace = precio_combinacion(url, producto.get("id_product") or producto.get("id"), grupos, {grupo["id"]: valor})
        id_fila = siguiente_id()
        ancho = fondo = alto = ""
        aviso_cliente, nota = "", nota_base
        triple = TRIPLE.search(titulo + " cm")
        doble = DOBLE.search(titulo if "cm" in titulo else titulo + " cm")
        junto = None if triple else medida_de_tamano(descripcion, titulo)
        abierto, origen = "", f"{grupo['nombre']}: {titulo}"
        if triple:
            ancho, fondo, alto = (numero(parte) for parte in triple.groups())
        elif junto:
            ancho, fondo, alto, abierto, origen = junto
            abierto = abierto or ""
            if abierto:
                aviso_cliente = f"Extensible: {ancho} cm cerrada, {abierto} cm abierta"
        elif doble and tipo == "somier":
            ancho, fondo = (numero(parte) for parte in doble.groups())
            aviso_cliente = "Medida del colchón: la base puede ser algo mayor"
            apuntar(id_fila, nombre, enlace, "somier: medida del colchón, sin alto")
        elif doble and tipo == "cama_canape":
            aviso_cliente = f"Para colchón de {titulo}. Medida exterior: consultar en tienda"
            apuntar(id_fila, nombre, enlace, "canapé: la web solo da el tamaño del colchón")
        else:
            apuntar(id_fila, nombre, enlace, f"tamaño «{titulo}» sin medida de tres números")
        if precio is None:
            apuntar(id_fila, nombre, enlace, "no se pudo leer el precio de este tamaño")
        filas.append({**base, "id": id_fila, "nombre": f"{nombre} ({titulo})", "precio_eur": precio if precio is not None else "",
                      "ancho_cm": ancho, "fondo_cm": fondo, "alto_cm": alto, "ancho_abierto_cm": abierto, "url_alihogar": enlace,
                      "medidas_origen": origen, "aviso_cliente": aviso_cliente, "notas_internas": nota})
    return filas


# ---------- Programa ----------

def main():
    sys.stdout.reconfigure(encoding="utf-8")
    with open(RUTA_CSV, encoding="utf-8-sig", newline="") as archivo:
        existentes = list(csv.DictReader(archivo))

    # Muebles que ya están en el CSV (por el número de producto de su enlace).
    ya_estan = set()
    for fila in existentes:
        numero_web = re.search(r"alihogar\.es/[^/]+/(\d+)-", fila["url_alihogar"] or "")
        if numero_web:
            ya_estan.add(numero_web.group(1))

    # Siguiente número libre de cada prefijo.
    contadores = {}
    for fila in existentes:
        prefijo, _, cifra = fila["id"].partition("-")
        if cifra.isdigit():
            contadores[prefijo] = max(contadores.get(prefijo, 0), int(cifra))

    nuevas, vistos = [], set(ya_estan)
    for seccion in SECCIONES:
        slug, tipo, _, prefijo = seccion
        lista = productos_de_seccion(slug)
        pendientes = [(id_web, url) for id_web, url in lista if id_web not in vistos]
        print(f"{slug}: {len(lista)} en la web, {len(pendientes)} nuevos")

        def siguiente_id(prefijo=prefijo):
            contadores[prefijo] = contadores.get(prefijo, 0) + 1
            return f"{prefijo}-{contadores[prefijo]:02d}"

        for posicion, (id_web, url) in enumerate(pendientes, 1):
            vistos.add(id_web)
            ficha = leer_ficha(url)
            if not ficha:
                apuntar("", "", url, "no se pudo leer la ficha: no se ha importado")
                continue
            if ACCESORIO.search(texto_limpio(ficha[0].get("name"))):
                apuntar("", texto_limpio(ficha[0].get("name")), url, "accesorio (patas), no es un mueble: no se ha importado")
                continue
            # En «Sofás» la web mete también sillones sueltos: para el cliente son butacas.
            if tipo == "sofa" and re.match(r"(sillón|butaca)\b", texto_limpio(ficha[0].get("name")), re.I):
                seccion_butaca = next(s for s in SECCIONES if s[1] == "butaca")
                filas = filas_de_producto(seccion_butaca, url, ficha, lambda: siguiente_id("BUT"))
            else:
                filas = filas_de_producto(seccion, url, ficha, siguiente_id)
            nuevas.extend(filas)
            if posicion % 20 == 0:
                print(f"  {posicion}/{len(pendientes)}")

    with open(RUTA_CSV, "w", encoding="utf-8", newline="") as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=COLUMNAS, lineterminator="\n")
        escritor.writeheader()
        escritor.writerows(existentes)
        escritor.writerows(nuevas)

    RUTA_INFORME.parent.mkdir(exist_ok=True)
    with open(RUTA_INFORME, "w", encoding="utf-8-sig", newline="") as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=["id", "nombre", "url", "motivo"], lineterminator="\n")
        escritor.writeheader()
        escritor.writerows(informe)

    con_medida = sum(1 for fila in nuevas if fila["ancho_cm"] and fila["fondo_cm"])
    print(f"\nOK: {len(nuevas)} muebles nuevos añadidos ({len(existentes)} que ya estaban, sin tocar).")
    print(f"  Con medida: {con_medida} · Sin medida («Consultar en tienda»): {len(nuevas) - con_medida}")
    print(f"  Informe de revisión: {RUTA_INFORME.relative_to(RAIZ)} ({len(informe)} avisos)")
    print("Ahora ejecuta: python scripts/csv_a_json.py")


if __name__ == "__main__":
    main()
