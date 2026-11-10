# A Miña Casa ALI · Prototipo

## Qué es este proyecto

Somos un grupo de estudiantes de Negocios Digitales. Hacemos una consultoría de experiencia de cliente para **ALI Hogar** (Espher Hogar S.L.U., Grupo ALI), una gran superficie familiar de mueble y decoración del Polígono A Gándara (Ferrol) con tienda online en alihogar.es (PrestaShop). La asignatura es "Neuromarketing y comportamiento del cliente".

La actuación propuesta se llama **A Miña Casa ALI**: una web móvil, sin app y sin registro, que une la tienda física y la tienda online. Este repositorio contiene **solo el prototipo funcional** que enseñaremos en el pitch. La especificación completa está en `docs/propuesta_A_Mina_Casa_ALI.md` (sección 6). Léela antes de proponer nada.

## Las dos puertas de entrada (las dos son obligatorias)

1. **Desde la tienda:** el cliente escanea el QR de la etiqueta de un mueble y abre su *ficha viva*. Allí ve un semáforo que le dice si el mueble cabe en los huecos de su casa y si pasa por su puerta.
2. **Desde alihogar.es:** el cliente pulsa el banner "¿Qué me cabe?" e introduce la estancia, el tipo de mueble y las medidas de su pared. El *recomendador* le devuelve solo los muebles que caben, ordenados por proporción con la pared, e indica en qué sección de la nave puede verlos y tocarlos.

Las dos entradas acaban en la misma **Mi lista**. La lista se puede compartir por WhatsApp, enviar al asesor de ALI (WhatsApp 604 06 57 88) o usar para comprar online o con recogida en tienda (Click & Collect).

## Pantallas

Son 7: Inicio · Mis huecos · ¿Qué me cabe? · Ficha viva · Mi lista · Ambiente (QR del conjunto) · Encuesta CES. El detalle de cada una está en la sección 6 de la propuesta.

## Reglas técnicas

- HTML, CSS y JavaScript sin frameworks ni proceso de build. Tiene que funcionar abriendo los archivos con un servidor estático simple (`python3 -m http.server`).
- Hosting en GitHub Pages. Sin backend, sin base de datos, sin cuentas de usuario.
- Datos de productos: `data/products.json`, generado a partir de `data/productos.csv` con un script. Nunca edites el JSON a mano.
- Reglas de proporción del recomendador: `data/reglas_proporcion.json`. Son **orientativas y configurables**. Nunca las escribas fijas en el código.
- Los huecos y la lista se guardan en el navegador (`localStorage`), envolviendo cada lectura y escritura en try/catch. La lista se puede compartir codificada en la URL.
- Medición: los eventos de GA4 son `qr_scan` (por UTM), `fit_check`, `space_add`, `list_create`, `list_add`, `list_share`, `whatsapp_advisor`, `go_to_shop`, `survey_open`, `recommend_view` y `recommend_click`. El ID de medición de GA4 va en un único archivo de configuración (`js/config.js`). Mientras no lo tengamos, los eventos se escriben en consola.
- Todos los enlaces a alihogar.es llevan UTM: `utm_source=amicasa&utm_medium=qr|web&utm_campaign=piloto`. El `utm_medium` es `qr` si el cliente entró por un QR y `web` en el resto.
- Los QR de la tienda entran al prototipo con `utm_source=qr_tienda&utm_medium=qr&utm_campaign=piloto`.
- Diseño mobile-first: letra base de al menos 16 px, contraste AA y botones de al menos 48 px de alto. Tiene que poder usarlo alguien de 60 años.
- Idioma: interfaz en castellano, con microcopy cálido en gallego en títulos y saludos ("A miña casa", "Benvido").

## Lógica del semáforo (no cambiar sin avisar)

- **Verde:** sobran al menos 5 cm en ancho y en fondo, y el alto del mueble es menor o igual que el del hueco.
- **Ámbar:** en alguna medida sobran entre 0 y 5 cm.
- **Rojo:** alguna medida supera la del hueco.
- **Puerta:** el mueble pasa si sus dos lados más cortos caben en el ancho y el alto de la puerta.
- Mostrar siempre el aviso "Resultado orientativo".
- Escribir tests sencillos de los casos límite: exacto, 5 cm justos, 1 cm de más y medidas que faltan.

## Lógica del recomendador

1. **Filtro:** solo entran los muebles de la estancia y el tipo elegidos que salen en verde o ámbar, y que pasan por la puerta si se ha indicado.
2. **Proporción:** se calcula qué porcentaje del ancho de la pared ocupa el mueble y se compara con el rango ideal de su tipo en `reglas_proporcion.json`.
3. **Orden y etiquetas:** primero los que quedan dentro del rango y más cerca de su centro. Se muestran 6 como máximo, con la etiqueta "Encaja perfecto", "Encaja" o "Justo".
4. **Sin resultados:** decirlo claramente y ofrecer el WhatsApp del asesor. Nunca se recomienda algo que no cabe.

## Ética (forma parte de la nota)

- Sin dark patterns: ni cuentas atrás, ni escasez falsa, ni precios ocultos.
- No se recogen datos personales. El teléfono del cliente solo aparece si él decide escribir por WhatsApp.
- El semáforo dice "no cabe" aunque eso suponga perder una venta.
- Nada dirigido a menores.

## Datos

- Usa solo los productos de `data/productos.csv` (46 productos reales de alihogar.es, consultados el 10/11/2026). No inventes productos, precios ni medidas.
- Columnas: `ancho_cm`, `fondo_cm` y `alto_cm` siguen el orden ancho × fondo × alto (supuesto: la web no lo etiqueta). `estancia` puede tener varias separadas por `|`. Trata `ean` como texto (hay EAN con ceros a la izquierda). `medidas_origen` es el texto literal de la web. `aviso_cliente` es lo que se enseña al cliente y `notas_internas` son apuntes del equipo que no se publican (no pasan al JSON).
- Nunca se muestran stock ("últimas unidades") ni ofertas ("antes X €"): caducan y serían escasez o anclaje falsos.
- Si `alto_cm` está vacío, el semáforo solo compara ancho y fondo y muestra "Alto: consultar en tienda".
- En mesas extensibles, `ancho_cm` es la medida cerrada y `ancho_abierto_cm` la abierta.
- Si falta un dato, deja el campo vacío y muestra "Consultar en tienda".
- Si un producto no tiene foto autorizada, usa un marcador neutro con el nombre del producto.

## Decisiones aprobadas (10/11/2026)

- **Arquitectura:** una página HTML por pantalla, sin router. Módulos compartidos en `js/`, lógica pura en `js/logica/`, un archivo por pantalla en `js/pantallas/`.
- **Código de lista:** código corto aleatorio (tipo `ALI-7K3F`) que nace con la lista, se ve en Mi lista y viaja en el enlace. Solo sirve para que caja lo anote.
- **Lista en la URL:** `lista.html?v=1&c=CÓDIGO&l=SOF-02.TV-04&h=…`. Los huecos (`h`) son opcionales y se avisa al cliente. Una lista recibida nunca pisa la propia sin preguntar.
- **Huecos con estancia:** cada hueco guarda su estancia; la ficha enseña primero los de la estancia del mueble.
- **Privacidad:** Microsoft Clarity queda fuera del MVP. GA4 solo se carga tras un aviso de consentimiento con dos botones iguales.
- **Semáforo, cómo se lee:** 5 cm justos es verde; 0 cm justos es ámbar; el alto solo exige "menor o igual"; una medida vacía se salta y se dice; el mueble no se gira; sin alto, la puerta muestra "Consultar en tienda".
- **Etiquetas del recomendador:** "Encaja perfecto" es verde y dentro del rango; "Encaja" es verde fuera del rango; "Justo" es ámbar.
- **Marca:** sin logotipo de ALI; el pie dice "Prototipo de estudiantes · no es una web oficial de ALI Hogar".
- **Tests:** se abren en `http://localhost:8000/tests/`. No hace falta instalar nada.
- **Publicación:** `docs/` y `PROMPT_INICIAL.md` están en `.gitignore` porque el repositorio de GitHub Pages es público.

## Cómo trabajamos

- Antes de escribir código en una tarea nueva, propón un plan corto y espera a que lo aprobemos.
- Trabaja por días siguiendo la tabla "Plan con Claude Code" de la sección 6 de la propuesta. Al terminar cada día, resume qué funciona y qué falta, y haz un commit de git con un mensaje claro.
- **No redactes el brief ni las diapositivas.** Ese texto lo escribimos nosotros a mano. Puedes ayudarnos a revisar, explicar o generar capturas y datos del prototipo.
- Explícanos lo que haces en lenguaje sencillo: lo tenemos que defender en la exposición.
