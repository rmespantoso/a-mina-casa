# A Miña Casa ALI · prototipo

Herramienta web, sin app, que dice si un mueble de ALI Hogar cabe en tu casa. Se usa como invitado o con cuenta (simulada en el prototipo).
Es un **prototipo de estudiantes**: no es una web oficial de ALI Hogar.

## Cómo abrirlo

Hace falta Python 3 (no hay que instalar nada más). Desde esta carpeta:

```bash
python -m http.server 8000
```

En Mac o Linux el comando es `python3 -m http.server 8000`.

- Prototipo: http://localhost:8000/
- Pruebas automáticas: http://localhost:8000/tests/
- Muestrario de diseño: http://localhost:8000/estilo.html
- Etiquetas con QR para imprimir (página del equipo): http://localhost:8000/etiquetas.html
- La portada (http://localhost:8000/) es «Planifica tu espacio» · Mi plano: http://localhost:8000/plano.html

## Cómo actualizar los productos

1. Edita `data/productos.csv`.
2. Regenera el JSON (nunca se edita a mano):

```bash
python scripts/csv_a_json.py
```

3. Abre las pruebas y comprueba que pasan todas.

### Traer muebles nuevos de alihogar.es

```bash
python scripts/importar_alihogar.py
python scripts/csv_a_json.py
```

El primero lee las secciones con hueco de alihogar.es (una página por segundo, unos 20 minutos) y añade al CSV solo los muebles que aún no están; no toca las filas que ya había. Las medidas dudosas se quedan vacías («Consultar en tienda») y se apuntan en `docs/informe_importacion.csv` para revisarlas a mano.

## Cómo está organizado

| Carpeta o archivo | Qué contiene |
| --- | --- |
| `index.html`, `huecos.html`, … | Una página por pantalla |
| `css/` | `base.css` (colores y letras) y `componentes.css` (piezas) |
| `js/config.js` | El único archivo de configuración: GA4, WhatsApp, encuesta, UTM |
| `js/` | Módulos compartidos: datos, guardado en el móvil, sesión (invitado o registrado), medición, enlaces, dibujos |
| `fonts/`, `img/` | Fuente Poppins y logo de ALI Hogar (usado con su permiso) |
| `js/pantallas/` | Un archivo por pantalla |
| `data/` | `productos.csv` (fuente), `products.json` (generado), las reglas de proporción y `ambientes.json` (conjuntos de la tienda) |
| `js/vendor/` | `qrcode.js`: librería que dibuja los QR (qrcode-generator 1.4.4, de Kazuhiko Arase, licencia MIT) |
| `data/estancias.json` | Las estancias de «Planifica tu espacio»: foto, frase y grupos de muebles |
| `scripts/` | `csv_a_json.py` (CSV → JSON) e `importar_alihogar.py` (trae muebles de alihogar.es) |
| `tests/` | Pruebas que se ejecutan en el navegador |
