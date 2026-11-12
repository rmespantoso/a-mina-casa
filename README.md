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

## Cómo actualizar los productos

1. Edita `data/productos.csv`.
2. Regenera el JSON (nunca se edita a mano):

```bash
python scripts/csv_a_json.py
```

3. Abre las pruebas y comprueba que pasan todas.

## Cómo está organizado

| Carpeta o archivo | Qué contiene |
| --- | --- |
| `index.html`, `huecos.html`, … | Una página por pantalla |
| `css/` | `base.css` (colores y letras) y `componentes.css` (piezas) |
| `js/config.js` | El único archivo de configuración: GA4, WhatsApp, encuesta, UTM |
| `js/` | Módulos compartidos: datos, guardado en el móvil, sesión (invitado o registrado), medición, enlaces, dibujos |
| `fonts/`, `img/` | Fuente Poppins y logo de ALI Hogar (usado con su permiso) |
| `js/pantallas/` | Un archivo por pantalla |
| `data/` | `productos.csv` (fuente), `products.json` (generado) y las reglas de proporción |
| `scripts/` | `csv_a_json.py` |
| `tests/` | Pruebas que se ejecutan en el navegador |
