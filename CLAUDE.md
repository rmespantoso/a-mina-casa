# A Miña Casa ALI · Prototipo

## Qué es este proyecto

Somos un grupo de estudiantes de Negocios Digitales. Hacemos una consultoría de experiencia de cliente para **ALI Hogar** (Espher Hogar S.L.U., Grupo ALI), una gran superficie familiar de mueble y decoración del Polígono A Gándara (Ferrol) con tienda online en alihogar.es (PrestaShop). La asignatura es "Neuromarketing y comportamiento del cliente".

La actuación propuesta se llama **A Miña Casa ALI**: una herramienta web, sin app, que une la tienda física y la tienda online. Se usa como invitado o con cuenta (ver "Invitado y registrado"). En el futuro irá integrada dentro de alihogar.es como una sección más; ahora solo construimos la herramienta, pensada para encajar ahí. Este repositorio contiene **solo el prototipo funcional** que enseñaremos en el pitch. La especificación completa está en `docs/propuesta_A_Mina_Casa_ALI.md` (sección 6). Léela antes de proponer nada.

## Las dos puertas de entrada (las dos son obligatorias)

1. **Desde la tienda:** el cliente escanea el QR de la etiqueta de un mueble y abre su *ficha viva*. Allí ve un semáforo que le dice si el mueble cabe en los huecos de su casa.
2. **Desde alihogar.es:** el cliente pulsa el banner "¿Qué me cabe?" e introduce la estancia, el tipo de mueble y las medidas de su pared. El *recomendador* le devuelve solo los muebles que caben, ordenados por proporción con la pared, e indica en qué sección de la nave puede verlos y tocarlos.

Las dos entradas acaban en la misma **Mi lista**. La lista se puede compartir por WhatsApp, enviar al asesor de ALI (WhatsApp 604 06 57 88) o usar para comprar online o con recogida en tienda (Click & Collect).

## Invitado y registrado (decisión del 12/11/2026)

- **Invitado (sin cuenta):** escanea QR, mete medidas de sus huecos, ve el semáforo, abre la ficha de producto y guarda productos en Mi lista. Todo se queda en su móvil.
- **Registrado:** lo mismo, guardado en su cuenta (sin límite de tiempo y en otros dispositivos). Desde el 14/11/2026 el buscador «Planifica tu espacio» está abierto también al invitado (ver «Planifica tu espacio»).
- Compartir la lista por WhatsApp y escribir al asesor están abiertos a todos.
- Al invitado se le propone registrarse, sin obligar, al guardar su primer hueco y cuando ya tiene productos en la lista.
- La cuenta sería la de alihogar.es. **En el prototipo el registro es simulado:** un botón de "cuenta de demostración", sin pedir correo ni contraseña y sin enviar datos a ningún sitio. Nunca publiques un formulario que pida credenciales reales con la marca de ALI.
- "Ver ficha de producto" lleva a la página del producto en alihogar.es (con UTM). En los resultados del recomendador va directo, sin pasar por nuestra ficha.
- **Carrito (decisión del 12/11/2026):** en los resultados del recomendador y en Mi lista hay un botón "Añadir al carrito" que en el prototipo es una **demostración**: avisa de que no se ha añadido nada y solo lanza el evento `add_to_cart`. El carrito real solo será posible cuando la herramienta esté dentro de alihogar.es. Los muebles con variantes (color o medida) no llevan ese botón: llevan "Elegir opción y comprar", que abre su página en alihogar.es.

## Pantallas

Inicio · Planifica tu espacio (estancias) · Estancia (buscador) · Mi plano · Mis huecos · Ficha viva · Mi lista · Ambiente (QR del conjunto) · Encuesta CES · Tu cuenta (acceso). «¿Qué me cabe?» (`que-me-cabe.html`) solo reenvía los enlaces antiguos a «Planifica tu espacio». El detalle original está en la sección 6 de la propuesta.

## Reglas técnicas

- HTML, CSS y JavaScript sin frameworks ni proceso de build. Tiene que funcionar abriendo los archivos con un servidor estático simple (`python3 -m http.server`).
- Hosting en GitHub Pages. Sin backend ni base de datos: la cuenta de usuario del prototipo es simulada.
- Datos de productos: `data/products.json`, generado a partir de `data/productos.csv` con un script. Nunca edites el JSON a mano.
- Reglas de proporción del recomendador: `data/reglas_proporcion.json`. Son **orientativas y configurables**. Nunca las escribas fijas en el código.
- Los huecos y la lista se guardan en el navegador (`localStorage`), envolviendo cada lectura y escritura en try/catch. La lista se puede compartir codificada en la URL.
- Medición: los eventos de GA4 son `qr_scan` (por UTM), `fit_check`, `space_add`, `list_create`, `list_add`, `list_share`, `whatsapp_advisor`, `go_to_shop`, `add_to_cart`, `survey_open`, `recommend_view`, `recommend_click`, `sign_up` y `login`. El ID de medición de GA4 va en un único archivo de configuración (`js/config.js`). Mientras no lo tengamos, los eventos se escriben en consola.
- Todos los enlaces a alihogar.es llevan UTM: `utm_source=amicasa&utm_medium=qr|web&utm_campaign=piloto`. El `utm_medium` es `qr` si el cliente entró por un QR y `web` en el resto.
- Los QR de la tienda entran al prototipo con `utm_source=qr_tienda&utm_medium=qr&utm_campaign=piloto`.
- Diseño mobile-first: letra base de al menos 16 px, contraste AA y botones de al menos 48 px de alto. Tiene que poder usarlo alguien de 60 años.
- Idioma: interfaz en castellano, con microcopy cálido en gallego en títulos y saludos ("A miña casa", "Benvido").
- **Marca ALI Hogar** (guía en Canva, "Guía de marca ALI"): fondo blanco; magenta `#D50D73` en botones y texto y `#E41E85` solo en titulares grandes y adornos; texto gris `#54595F`; títulos negros; fuente Poppins (en `fonts/`); botones rectos en mayúsculas; lo redondo se reserva para el logo, el WhatsApp y los contadores. Tono: tuteo, frases cortas y prácticas. Verde, ámbar y rojo solo se usan en el semáforo. No se copia su letra pequeña de 12-15 px.

## Lógica del semáforo (no cambiar sin avisar)

- **Verde:** sobran al menos 5 cm en ancho y en fondo, y el alto del mueble es menor o igual que el del hueco.
- **Ámbar:** en alguna medida sobran entre 0 y 5 cm.
- **Rojo:** alguna medida supera la del hueco.
- **Sin comprobación de puerta (decisión del 12/11/2026):** los muebles se entregan desmontados, así que no se piden las medidas de la puerta ni se comprueba si el mueble pasa por ella. No la añadas.
- Mostrar siempre el aviso "Resultado orientativo".
- Escribir tests sencillos de los casos límite: exacto, 5 cm justos, 1 cm de más y medidas que faltan.

## Lógica del recomendador

1. **Filtro:** solo entran los muebles de la estancia y el tipo elegidos que salen en verde o ámbar.
2. **Proporción:** se calcula qué porcentaje del ancho de la pared ocupa el mueble y se compara con el rango ideal de su tipo en `reglas_proporcion.json`.
3. **Orden y etiquetas:** primero los que quedan dentro del rango y más cerca de su centro. Se muestran 6 como máximo, con la etiqueta "Encaja perfecto", "Encaja" o "Justo".
4. **Sin resultados:** decirlo claramente y ofrecer el WhatsApp del asesor. Nunca se recomienda algo que no cabe.

## Ética (forma parte de la nota)

- Sin dark patterns: ni cuentas atrás, ni escasez falsa, ni precios ocultos.
- El invitado no deja ningún dato personal. El registrado, solo los de su cuenta y con consentimiento; recibir comunicaciones comerciales va en una casilla aparte y sin marcar. El teléfono del cliente solo aparece si él decide escribir por WhatsApp.
- El registro nunca se fuerza con trucos: se explica para qué sirve y se puede seguir sin él.
- El semáforo dice "no cabe" aunque eso suponga perder una venta.
- Nada dirigido a menores.

## Datos

- Usa solo los productos de `data/productos.csv`. No inventes productos, precios ni medidas. Son 839 productos reales de alihogar.es: los 46 primeros los revisó el equipo a mano (consultados el 10/11/2026) y el resto se importó el 13/11/2026 con `scripts/importar_alihogar.py` (ver «Catálogo completo»).
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
- **Semáforo, cómo se lee:** 5 cm justos es verde; 0 cm justos es ámbar; el alto solo exige "menor o igual"; una medida vacía se salta y se dice; el mueble no se gira.
- **Etiquetas del recomendador:** "Encaja perfecto" es verde y dentro del rango; "Encaja" es verde fuera del rango; "Justo" es ámbar.
- **Marca:** desde el 12/11/2026 se usan el logotipo y las fotos de ALI Hogar, con su permiso. El pie sigue diciendo "Prototipo de estudiantes · no es una web oficial de ALI Hogar".
- **Ambientes y QR (12/11/2026):** los ambientes están en `data/ambientes.json`; los dos actuales son ejemplos del equipo (`"estado": "ejemplo"`) y hay que sustituirlos por los conjuntos reales de ALI. Las etiquetas con QR se generan en `etiquetas.html` (página del equipo) con la librería `js/vendor/qrcode.js` (MIT), la única dependencia externa del proyecto. Las etiquetas no llevan precio.
- **Consentimiento (13/11/2026):** el aviso de medición está en `js/consentimiento.js` y solo aparece si hay ID de GA4 en `js/config.js`. Dos botones iguales (Rechazar / Aceptar); GA4 no se carga hasta que el cliente acepta y se puede cambiar la decisión desde el pie. A GA4 nunca viaja la dirección completa: `direccionLimpia` quita medidas, nombres de huecos y listas compartidas.
- **Catálogo completo (13/11/2026):** solo las secciones donde se mide un hueco (salón, comedor, dormitorio, descanso, sofás, entrada y estudio); fuera sillas, puffs, percheros, colchones, cocina, baño, terraza y patas sueltas. El importador nunca toca las filas que ya están en el CSV, solo guarda una medida si la ficha da una única medida clara de tres números y marca «Revisar» lo raro sin corregirlo. Canapés: una fila por tamaño, sin medida exterior salvo que la web la dé. Somieres: medida del colchón con aviso. Los sillones de la sección «Sofás» pasan a butaca. Las dudas van a `docs/informe_importacion.csv` (no se publica). Los ids admiten 3 cifras (`MCE-120`). Hay estancia «Estudio». Los rangos de los tipos nuevos en `reglas_proporcion.json` son una propuesta sin validar.
- **Planifica tu espacio (14/11/2026):** tras las pruebas con clientes (les costaba entender la herramienta), el recomendador se reorganiza por estancias. Menú ☰ arriba a la izquierda, como en la web móvil de ALI, con «Planifica tu espacio» destacado. Estancias en `data/estancias.json` (salón, comedor, dormitorio, estudio, entrada, cocina y baño; sin terraza), cada una con una foto real de ambiente sacada de la galería de un producto de alihogar.es (no ilustraciones: el equipo pidió realismo) y sus grupos de muebles. Filtros: medidas del hueco (solo el ancho obligatorio), precio máximo y color. El color se lee de las variantes y del nombre (`js/logica/colores.js`); si no aparece, el mueble queda sin color y no se adivina. Abierto a todos, sin cuenta. «Guardar esta búsqueda» guarda hasta 10 búsquedas en el navegador (nada personal). Se importaron también cocina, baño, sillas y sillas de oficina (1.127 productos). La pantalla de inicio ES «Planifica tu espacio» (`index.html`): lo primero que se ve son las estancias; debajo, las búsquedas guardadas y «¿Estás en la tienda?» (la puerta del QR). `planifica.html` solo reenvía al inicio. Barra de abajo: Planifica · Mi plano · Mis medidas · Mi lista.
- **Mi plano (14/11/2026):** plano 2D a escala (vista desde arriba) con las medidas reales de ancho y fondo; se arrastra con el dedo o con botones, se gira y avisa si dos muebles se pisan o si uno no cabe. Es el paso previo al 3D: el 3D realista tipo IKEA necesita un modelo 3D de cada mueble y se presenta como fase 2, no se construye en el prototipo.
- **Tests:** se abren en `http://localhost:8000/tests/`. No hace falta instalar nada.
- **Publicación:** `docs/` y `PROMPT_INICIAL.md` están en `.gitignore` porque el repositorio de GitHub Pages es público.

## Cómo trabajamos

- Antes de escribir código en una tarea nueva, propón un plan corto y espera a que lo aprobemos.
- Trabaja por días siguiendo la tabla "Plan con Claude Code" de la sección 6 de la propuesta. Al terminar cada día, resume qué funciona y qué falta, y haz un commit de git con un mensaje claro.
- **No redactes el brief ni las diapositivas.** Ese texto lo escribimos nosotros a mano. Puedes ayudarnos a revisar, explicar o generar capturas y datos del prototipo.
  - **Excepción (11/11/2026):** la presentación de la tutoría con la profesora sí la redacta Claude, por decisión nuestra. La regla sigue en pie para el brief y para las diapositivas de la exposición final.
- **Permiso de ALI Hogar (11/11/2026):** nos autorizan a usar su logotipo, sus imágenes y su contenido real. La guía de marca está en Canva («Guía de marca ALI»).
- Explícanos lo que haces en lenguaje sencillo: lo tenemos que defender en la exposición.
