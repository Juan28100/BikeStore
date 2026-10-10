# Carga y ciclo de vida de imágenes de productos

## Estado de este paquete

La carga de fotos propias está **desactivada por defecto**. `wrangler.toml` no declara el bucket R2 `PRODUCT_IMAGES` ni las variables de activación. Sin esas condiciones, el Worker devuelve `enabled: false` y el selector queda deshabilitado; la biblioteca incluida sigue disponible. No se requiere migración de D1.

Para activar cargas en un entorno objetivo se necesitan:

1. Un binding R2 `PRODUCT_IMAGES` con lectura y escritura.
2. `PRODUCT_IMAGE_UPLOADS_ENABLED=true`.
3. `PRODUCT_IMAGE_UPLOADS_CPU_VERIFIED=true`, únicamente después de medir el peor caso en el runtime y plan Worker de destino.

El Worker falla cerrado si falta cualquiera de esos requisitos. Este paquete no crea ni enlaza recursos, no modifica Cloudflare y no activa ninguna bandera en producción.

## Conversión y validación

El formulario permite elegir PNG, JPG/JPEG o WebP desde teléfono o computador. **Antes de crear `Image` o decodificar**, lee como máximo **1 MiB** de cabecera: PNG (`IHDR` y CRC), JPEG (marcador SOF), WebP estático (VP8/VP8L/VP8X). Rechaza antes del decoder archivos con más de **50 MP** o **16.000 px por lado**; después de decodificar vuelve a comprobar las dimensiones reportadas por el navegador. WebP animado se rechaza de forma conservadora. Las fotos dentro de los límites se vuelven a codificar en PNG: hasta **1.500.000 píxeles**, **1600 px por lado** y **4 MiB**; los originales pueden pesar hasta 32 MiB. Esta inspección y conversión del navegador mejoran compatibilidad y control de recursos: **no sustituyen la validación de seguridad independiente del Worker**.

Antes de aceptar el upload, el Worker valida de forma independiente el PNG recibido. Solo admite PNG estático no interlazado de **RGB o RGBA, 8 bits por canal**. Comprueba:

- Firma y MIME concordantes, estructura y orden de `IHDR`, chunks `IDAT` contiguos y `IEND`, CRC de cada chunk y ausencia de datos posteriores a `IEND`.
- Descompresión zlib completa, longitud exacta del raster y filtros PNG válidos en cada scanline. PNG indexados, interlazados/APNG, chunks auxiliares y tipos desconocidos se rechazan.
- Límites del servidor: archivo de hasta **4 MiB** (cuerpo multipart hasta 4 MiB + 64 KiB), ancho/alto de hasta **1600 px**, hasta **1,5 millones de píxeles** y hasta **6 MiB expandidos**.
- Para ser compatible con los PNG que emite Canvas en Chromium, se admiten hasta **1024 chunks IDAT** y **1026 chunks totales**. No se admiten chunks auxiliares. Estos límites son fijos y acotados; el caso de 1025 IDAT se rechaza.

El smoke de Chromium en desktop y móvil verifica cabeceras sobredimensionadas (JPEG de **50,01 MP** y JPEG/PNG/WebP de **16.001 px**) y afirma que no se llama ni a `Image` ni a `createImageBitmap` para esos archivos. También confirma que fotos JPEG/WebP reales y un PNG válido siguen convirtiéndose, sin enviar POST en el modo aislado. El smoke completo de escritorio pasó con una foto JPEG de 1,96 MP convertida a PNG de **1224 × 1224**, **1.112.094 bytes**, **272 IDAT / 274 chunks**, aceptada por el decoder extraído del Worker; incluye rechazo de SVG/PNG truncado, las tres fuentes de imagen y guardado fallido con reintento. En una ejecución secuencial del full smoke móvil, la fixture headless se detuvo más de 15 s en `validating-1112094-bytes`; por ello **no se declara CPU predecible en ese recorrido móvil**. Las pruebas de cabecera/conversión móvil sí pasan, pero no sustituyen la medición del full decoder. Los fixtures usan APIs simuladas; no contactan producción ni D1.

## CPU y tamaño

No se añade una dependencia externa ni un decoder/WASM; se usa `DecompressionStream` y una tabla CRC precalculada. La validación mantiene límites de bytes, expansión, dimensiones y chunks antes/después de descomprimir.

Medición local opt-in en Node (no Cloudflare): un PNG canónico de **3.826.169 bytes** (cerca del límite de 4 MiB), **1500 × 1000**, **932 IDAT**, expandido a **6.001.000 bytes**, tomó **634,7 ms de CPU** y **562,5 ms de pared**. Es una medición del entorno local, no predice el CPU del Worker ni demuestra que un plan/runtime lo admita; la diferencia observada en el full smoke móvil refuerza esa limitación. Por eso `PRODUCT_IMAGE_UPLOADS_CPU_VERIFIED` permanece sin configurar y la carga real sigue desactivada. La prueba en el runtime y plan Worker objetivo con R2 sigue pendiente antes de activar nada.

## Retención y limpieza

La política implementada es **retener, no borrar automáticamente**:

- Cada carga recibe una clave UUID nueva; los objetos no se sobrescriben. Las respuestas públicas usan caché `immutable` de un año junto con esta política sin borrado automático.
- Al reemplazar una imagen o dar de baja lógicamente un producto, la imagen anterior se conserva. No hay endpoint de borrado ni llamada automática a `R2.delete`.
- Si la carga termina pero falla el guardado del producto, el formulario conserva la ruta cargada para reintentar sin volver a subirla. Si se abandona el formulario, el objeto huérfano permanece.
- Los objetos compartidos, referenciados, anteriores y huérfanos se retienen; no se configura una regla de expiración.

Una futura limpieza debe ser manual y precedida por un dry-run que compruebe referencias en productos activos e inactivos e historial. Solo podría considerar objetos sin referencias y más antiguos que el periodo de caché de un año; ese proceso no forma parte de este paquete.
