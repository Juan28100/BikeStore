# BIKESTORE — catálogo, carritos y recuperación de cuenta

BIKESTORE conserva la interfaz responsive del rediseño. Catálogo, existencias, cuentas cliente y carritos se guardan en D1. Se puede recorrer como invitado; registrarse al entrar no es obligatorio. Al registrarse o iniciar sesión, el carrito invitado se fusiona con el carrito de la cuenta cliente. La cuenta administradora ve solo el panel de gestión y no puede crear ni usar carrito.

> **Alcance:** añadir al carrito no reserva ni descuenta inventario. El stock cambia mediante altas y ajustes administrativos auditables. Checkout, órdenes y pagos continúan siendo demostrativos; no introduzcas datos bancarios. El flujo desplegado de recuperación genera enlaces de un solo uso, actualiza el hash en D1 y revoca sesiones. Las pruebas locales usan un Resend simulado y no envían correo real. `onboarding@resend.dev` es solo para la cuenta de pruebas de Resend; **la recuperación por correo a clientes queda pendiente hasta verificar un dominio propio y usar un remitente de ese dominio**.

## Garantía de existencias y variantes

El stock pertenece al producto, no a cada talla. En `POST /api/cart/items` y `PUT /api/cart/items`, el servidor suma las cantidades de **todas las variantes del mismo producto** antes de aceptar el cambio. La fusión de carritos se hace en una transacción D1 y asigna solo las unidades restantes, con orden determinista por variante. La lectura del carrito normaliza y persiste cualquier exceso histórico —incluido stock reducido a cero— en una transacción; no da por supuesta una talla concreta.

El administrador cambia una cantidad objetivo absoluta, no un delta calculado desde una lectura previa. El `PATCH` exige `Idempotency-Key`; D1 registra la huella del payload, actualiza el producto e inserta el movimiento del ledger en un solo `batch` transaccional. La repetición de la misma clave y payload no duplica movimientos; reutilizarla con otro payload se rechaza. Cambios concurrentes al mismo stock se serializan al calcular la diferencia contra el saldo vigente.

## Componentes

- `src/worker.js`: API REST, sesiones, autorización, límites de creación invitada, carritos, stock y limpieza periódica.
- `src/resend-mailer.mjs`: envío transaccional mediante la API de Resend; endpoint de producción fijo y override limitado a loopback en pruebas.
- `migrations/0001_store.sql`: esquema base, incluida la expiración de invitados; preservada sin cambios.
- `migrations/0002_auth_limit_and_idempotency.sql`: contadores D1 de auth y claves idempotentes del PATCH admin; aplicada en la D1 alojada.
- `migrations/0003_password_reset.sql`: token de recuperación por cuenta, hash, vencimiento y marcador de consumo; aplicada en la D1 alojada.
- `app.js` y `public/app.js`: tienda, login/registro y diálogos de recuperación; el formulario admin genera y reutiliza una clave idempotente si se reintenta el mismo payload.
- `index.html` y `public/index.html`: interfaz pública; `public/` contiene exclusivamente los assets permitidos del sitio.
- `wrangler.toml`: Worker/Assets, D1, límites edge, Cron diario de mantenimiento, `preview_urls = false`, `APP_ORIGIN` fijado a la URL publicada actual y `RESEND_FROM_EMAIL` de prueba.
- `tests/`: pruebas locales de API, recuperación, administración, ciclo de invitados, Resend simulado y allowlist de assets; esta carpeta no se empaqueta.
- `scripts/run-local-tests.sh`: inicializa y limpia un D1 local aislado, genera credenciales ficticias aleatorias solo durante la ejecución y corre toda la batería sin usar la D1 alojada ni publicar.

## API

| Método y ruta | Función |
|---|---|
| `GET /api/health` | Comprueba Worker y conexión D1. |
| `GET /api/products?category=&sort=&q=` | Catálogo público filtrable; no requiere cuenta. |
| `GET /api/auth/session` | Devuelve el usuario autenticado sin crear ni leer un carrito. |
| `POST /api/auth/register` | Crea una cuenta cliente, inicia sesión y fusiona el carrito invitado. |
| `POST /api/auth/login` | Inicia sesión en una cuenta existente y fusiona el carrito invitado. |
| `POST /api/auth/password-reset/request` | Solicita recuperación; responde genéricamente igual exista o no la cuenta. |
| `POST /api/auth/password-reset/complete` | Cambia la contraseña con token válido, no vencido y sin consumir. |
| `POST /api/auth/logout` | Revoca la sesión y limpia cookies; elimina el carrito invitado temporal si había uno. |
| `GET /api/cart` | Lee el carrito propio. Sin sesión ni cookie invitada devuelve una vista vacía de invitado **sin crear filas ni cookies**. Admin recibe 403. |
| `POST /api/cart/items` | Agrega unidades solo si la suma de todas las variantes cabe en stock; un primer agregado válido puede crear el carrito invitado. |
| `PUT /api/cart/items` | Ajusta una variante validando también el total de las demás; no crea invitados. |
| `DELETE /api/cart/items?productId=&variant=` / `DELETE /api/cart` | Quita una variante o vacía el carrito propio; sin propietario existente devuelve vista vacía sin crear filas. |
| `GET /api/admin/products?q=&category=` | Consulta productos, incluidos los inactivos; solo admin. |
| `POST /api/admin/products` | Crea producto y registra existencias iniciales; solo admin. |
| `PATCH /api/admin/products/:id` | Guarda datos y ajusta existencias con `Idempotency-Key`; solo admin. |
| `DELETE /api/admin/products/:id` | Baja lógica y eliminación del carrito; solo admin. |

## Seguridad y límites

- El único rol admin permitido es `jjcorreagetial16@gmail.com`; la API exige rol, correo y marca de verificación en cada ruta protegida. El registro público no puede asignar ese rol. Las rutas de carrito rechazan cuentas admin; la interfaz admin oculta tienda, búsqueda y bolsa.
- Las contraseñas usan PBKDF2-HMAC-SHA-256 con sal aleatoria y 210.000 iteraciones; tokens de sesión e invitado se guardan como hashes. Las cookies son `HttpOnly`, `Secure` y `SameSite=Lax`.
- **Carritos invitados:** leer `/api/cart` sin cookie no escribe en D1 ni emite una cookie. Solo un `POST /api/cart/items` válido y con stock puede crear usuario y carrito. D1 limita esas creaciones a 20 por IP en una ventana fija de 10 minutos; `GUEST_EDGE_CREATE_LIMITER` añade una barrera de 30/min por IP y ubicación. D1 es la autoridad, los límites edge son por colo y eventualmente consistentes, y el contador falla cerrado si no puede guardarse. El bucket se conserva en la tabla acotada de auth, que elimina ventanas vencidas y no supera 50.000 claves.
- Un carrito invitado vence a los 180 días. Al fusionar sus artículos en una cuenta, se marca vencido; el logout de un invitado elimina sus líneas, carrito, sesiones/referencias de recuperación y usuario en una transacción y en orden compatible con las claves foráneas. El logout de una cuenta revoca la sesión pero conserva la cuenta y su carrito persistente. Un Cron diario, configurado para las 05:00 UTC, elimina hasta 500 invitados vencidos por ejecución: primero líneas de carrito, luego carritos, sesiones y referencias de recuperación, y finalmente usuarios que ya no tienen referencias. No requiere una migración de esquema nueva; utiliza el campo de expiración existente.
- Recuperación: token aleatorio de 32 bytes, solo su hash SHA-256 se guarda en D1, vence en 30 minutos y se mantiene un token por cuenta. La actualización del marcador de consumo, del hash PBKDF2 nuevo y la revocación de sesiones ocurre en un único `D1.batch`; un identificador de redención evita que dos solicitudes concurrentes consuman el mismo enlace. El cliente pone el token en el fragmento `#password-reset=…`, que no se envía en la solicitud inicial de la página, elimina el fragmento al abrir el formulario y no usa almacenamiento local. El Worker y los assets envían `Referrer-Policy: no-referrer`. Tras cambiar la clave no se inicia sesión automáticamente.
- La solicitud de recuperación responde con el mismo `202` y el mismo texto tanto para cuentas existentes como inexistentes. D1 limita solicitud a 20/IP y 5/IP+correo normalizado por ventana fija de 10 minutos; el completado limita a 20/IP y 5/IP+hash del token. El binding edge `AUTH_EDGE_PASSWORD_RESET_LIMITER` añade 10/min por IP y ubicación para cada endpoint. Los contadores no usan un `Map` creciente por isolate.
- El runtime del Worker envía correo con `POST` a `https://api.resend.com/emails` y requiere `RESEND_API_KEY` (secreto del Worker) y `RESEND_FROM_EMAIL` (remitente). `APP_ORIGIN` se fija a `https://noma-estudio-demo.torch-ringer.workers.dev`; no se deriva del encabezado Host. Si falta la configuración o Resend rechaza el envío, se elimina el token recién creado y la respuesta pública continúa siendo genérica. `onboarding@resend.dev` es solo para la cuenta de pruebas de Resend y no habilita entregas a clientes; **se requiere verificar un dominio propio y usar un remitente de ese dominio antes de habilitarlas**.
- Escrituras HTTP requieren `Origin` presente y exactamente igual al origen del Worker. Métodos de lectura pueden no traer `Origin`; si lo traen, debe coincidir. Un origen cruzado se rechaza en cualquier método.
- El cuerpo JSON se lee como stream y se limita a 16 KiB de bytes efectivamente recibidos. `Content-Length` sirve solo como rechazo anticipado cuando declara más; no es la única comprobación.
- Registro y login tienen cuotas independientes. Cada registro —incluso inválido— consume solo la cuota por IP de `register`: D1 permite hasta 30 intentos por IP en 10 minutos y `AUTH_EDGE_REGISTER_LIMITER` añade 30/min por IP en cada ubicación. Los logins exitosos no incrementan contadores. Solo un fallo incrementa D1 en dos ámbitos: IP (30/10 min) y par IP+correo normalizado (10/10 min); por eso el umbral temporal no bloquea esa cuenta desde otras IP. Los bindings edge de login (30/min por IP, 10/min por par) son barreras de ráfaga; D1 es la autoridad y falla cerrado.
- El inventario usa un ledger append-only y triggers que aplican movimientos, impiden saldo negativo y rechazan actualizaciones directas del saldo.

## Pruebas locales

Requisitos: Node.js y Wrangler 4.

```sh
bash scripts/run-local-tests.sh
```

La batería verifica M/L cruzadas en `POST` y `PUT`; fusión de invitado al registrarse y al iniciar sesión, incluidos logins concurrentes; 30 GET anónimos sin cookie sin filas ni cuota consumida; 20 creaciones válidas por IP y rechazo de la número 21 sin filas adicionales; borrado de invitado al hacer logout; cleanup Cron de invitados vencidos con líneas, carritos, sesiones y tokens de recuperación, conservando invitados vigentes; buckets de login expirados sembrados con SHA-256 base64url y comprobación de que el Worker actualiza exactamente esas filas; normalización por stock; stock cero; `PATCH` idempotente y carreras; 35 logins exitosos consecutivos; límites de registro/login; recuperación con Resend simulado en `127.0.0.1`; actualización PBKDF2, revocación, replay, carreras y expiración; cota de filas; rechazo de escrituras sin `Origin`; límite del cuerpo por bytes reales; admin sin carrito; y allowlist positiva exacta de `public/` frente a los assets enumerados por Wrangler dry-run. El script usa solo D1 local, no usa una llave real ni envía correo real, destruye su estado al salir y nunca ejecuta `--remote` ni `deploy`.

## Publicación y pendiente

El Worker del backend está **activo** en la URL publicada existente: [noma-estudio-demo.torch-ringer.workers.dev](https://noma-estudio-demo.torch-ringer.workers.dev/). Las migraciones `0002_auth_limit_and_idempotency.sql` y `0003_password_reset.sql` están aplicadas a la D1 `bikestore-store`. Catálogo, existencias, cuentas y carritos se persisten en esa base; se mantiene la navegación como invitado.

El checkout, las órdenes y los pagos reales siguen fuera del alcance y continúan siendo demostrativos. La recuperación está desplegada, pero `onboarding@resend.dev` solo sirve para la cuenta de pruebas de Resend; el envío de enlaces a clientes queda pendiente hasta verificar un dominio propio y configurar un remitente de ese dominio. **No se enviaron correos reales durante la publicación.**

Version URLs están desactivadas en Cloudflare; la URL principal publicada sigue habilitada. `preview_urls = false` permanece fijado en Wrangler para futuras cargas.
