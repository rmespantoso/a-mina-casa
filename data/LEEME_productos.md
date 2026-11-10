# productos.csv

Contiene 46 productos reales de alihogar.es, consultados ficha a ficha el 10/11/2026:

| Tipo | Productos |
| --- | --- |
| Sofás | 8 |
| Muebles TV | 6 |
| Aparadores | 6 |
| Cómodas | 6 |
| Estanterías | 5 |
| Canapés y camas | 5 |
| Mesas de comedor | 5 |
| Recibidores | 5 |

## Columnas de notas (cambio del 10/11/2026)

La antigua columna `notas` se ha separado en tres, moviendo el texto que ya había:

- **`aviso_cliente`**: lo que se enseña al cliente (plazo de entrega, espejo aparte, precio que puede variar con el tamaño, mesa extensible…).
- **`notas_internas`**: apuntes del equipo (stock, ofertas, «Revisar orden»). No se publican ni pasan a `products.json`.
- **`ancho_abierto_cm`**: el ancho de las mesas extensibles abiertas, sacado de `medidas_origen`.

Después de tocar el CSV hay que regenerar el JSON con `python scripts/csv_a_json.py`.

## Qué hay que revisar o completar

1. **`seccion_nave`**: está vacía en todos los productos porque no es un dato público. Rellenadla con ALI. Mientras esté vacía, el prototipo muestra "Consultar en tienda".
2. **Orden de las medidas**: la web da "A x B x C cm" sin decir cuál es cuál. Hemos supuesto ancho × fondo × alto. Los casos dudosos tienen el aviso "Revisar orden" en `notas`: los tres sofás Turin y el Sar, donde el alto sale mayor que el fondo.
3. **Precios de canapés por tamaño**: la web muestra un único precio, el de la variante por defecto. Hemos usado la medida 135 x 190 cm, pero el precio de esa medida puede ser distinto.
4. **Canapé CAM-01**: la web no da su altura.
5. **Precios y stock**: corresponden al 10/11/2026 y pueden cambiar.
6. **Fotos**: `url_foto` es un enlace a la foto de la web. Está marcada `foto_autorizada = no` hasta que ALI dé permiso para usarla.
