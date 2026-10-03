# Documentación técnica y funcional de Dulce Encanto

Fecha de revisión: 14 de septiembre de 2026.

Este documento describe el código y la configuración presentes en el repositorio, incluidos los cambios locales al momento de la revisión. Se elaboró mediante lectura estática: no se inició la aplicación, no se instalaron dependencias, no se ejecutaron migraciones ni pruebas y no se realizaron llamadas a servicios externos. Las versiones indicadas son las declaradas en los manifiestos o imágenes Docker; no representan una comprobación del entorno instalado.

## 1. Propósito del proyecto

Dulce Encanto es un sistema web para una pastelería. Combina una tienda para clientes con un panel de administración del negocio. Permite consultar productos, personalizar tortas, gestionar el carrito, registrar pedidos y controlar pagos y entregas.

El sistema separa la interfaz que utiliza el usuario, desarrollada en Angular, de las reglas del negocio y la persistencia de datos, implementadas mediante una API Laravel y MySQL.

## 2. Tecnologías utilizadas y su función

| Tecnología | Versión declarada | Uso en el proyecto |
| --- | --- | --- |
| Angular | `^22.1.0` | Interfaz web organizada en componentes y pantallas. |
| Angular CLI y Angular Build | `^22.1.6` | Desarrollo, compilación y ejecución de pruebas del frontend. |
| TypeScript | `~6.0.2` | Código de componentes, servicios y modelos tipados. |
| HTML y SCSS | Sin versión propia declarada | Plantillas, estilos globales y estilos por componente. |
| Angular Router | `^22.1.0` | Navegación, carga diferida y protección de rutas. |
| Angular Forms | `^22.1.0` | Formularios de acceso, compra y administración. |
| RxJS | `~7.8.0` | Flujos asíncronos y tratamiento de respuestas HTTP. |
| Node.js | `24-alpine` en Docker | Entorno de las herramientas del frontend. |
| npm | `11.6.0` en `packageManager` | Gestión de paquetes JavaScript. El Dockerfile no fija npm por separado. |
| PHP | `^8.3` en Composer; `8.4-cli` en Docker | Lenguaje del backend; Docker define el entorno previsto. |
| Laravel | `^13.17` | API, validación, autenticación, base de datos y archivos. |
| Laravel Sanctum | `^4.0` | Autenticación de la SPA mediante sesiones y cookies. |
| Spatie Laravel Permission | `^8.0` | Roles y permisos del negocio. |
| Eloquent ORM | Incluido en Laravel | Modelos, relaciones y consultas a la base de datos. |
| Composer | Imagen `composer:2` | Dependencias y carga automática de clases PHP. |
| MySQL | `8.4` en Docker Compose | Base de datos del entorno local. |
| Docker y Docker Compose | Sin versión fijada | Contenedores de frontend, backend y base de datos. |
| API de imágenes de OpenAI | Modelo configurable | Generación de referencias visuales para tortas personalizadas. |
| Git | Sin versión fijada | Control de versiones del repositorio. |

### Herramientas auxiliares

- **Frontend:** Vitest `^4.0.8`, jsdom `^28.0.0` y Prettier `^3.8.1` están declarados para pruebas y formato.
- **Backend:** PHPUnit `^12.5.12`, Mockery y Faker apoyan las pruebas; Laravel Pint se utiliza como herramienta de formato. También se declaran Tinker, Pail, Boost, Pao y Collision como herramientas de desarrollo.
- **Recursos propios de Laravel:** `backend/package.json` declara Vite `^8.0.0`, Tailwind CSS `^4.0.0` y Laravel Vite Plugin `^3.1`. Estos paquetes pertenecen al backend; la aplicación Angular tiene su propia compilación y estilos SCSS.
- **Extensiones PHP de la imagen:** `intl`, `pdo_mysql` y `zip`.

Los archivos `composer.lock` y los archivos de bloqueo npm registran resoluciones concretas de dependencias. Un rango como `^22.1.0` no equivale a una versión exacta instalada.

## 3. Arquitectura

```text
Usuario en el navegador
          |
          v
Angular: componentes, formularios, servicios y guards
          | HTTP / JSON + cookies de sesión y CSRF
          v
Laravel: rutas /api/v1, middleware y controladores
          |
          +--> Form Requests: validación de entradas
          +--> Servicios y modelos Eloquent: lógica y persistencia
          +--> API Resources: respuestas JSON
          |
          +--> MySQL: datos del negocio
          +--> Storage público: imágenes
          +--> OpenAI: generación opcional de imágenes
```

Angular inicia desde `frontend/src/main.ts`. `app.config.ts` registra el cliente HTTP, el router y la carga inicial del usuario. `app.routes.ts` carga las pantallas mediante `loadComponent`. Los servicios de `core/` concentran las solicitudes a la API y utilizan modelos TypeScript; la autenticación usa también `signal` y `computed` para su estado.

Laravel registra las rutas en `backend/routes/api.php`. Los controladores están agrupados bajo `Api/V1`, las clases de `Requests` validan entradas y las clases de `Resources` estructuran respuestas. `PromotionPricing` concentra reglas de precios de promociones.

## 4. Organización de carpetas

```text
DulceEncanto/
├── README.md                 Guía breve de entrada
├── DOCUMENTACION.md          Documentación técnica y funcional
├── docker-compose.yml        Servicios y volúmenes locales
├── frontend/
│   ├── src/app/core/          Servicios, modelos y guards
│   ├── src/app/features/      Pantallas públicas, de cuenta y administración
│   ├── src/app/app.routes.ts  Rutas del navegador
│   ├── src/styles.scss       Estilos generales
│   ├── public/               Imágenes e iconos estáticos
│   ├── angular.json          Configuración de Angular
│   └── package.json          Dependencias y comandos
└── backend/
    ├── app/Http/Controllers/  Atención de solicitudes
    ├── app/Http/Requests/     Validación y autorización de entradas
    ├── app/Http/Resources/    Serialización JSON
    ├── app/Models/            Entidades y relaciones Eloquent
    ├── app/Services/          Reglas de negocio compartidas
    ├── config/               Configuración de Laravel e integraciones
    ├── database/migrations/   Evolución del esquema de datos
    ├── database/seeders/      Roles y datos iniciales
    ├── routes/               Rutas web, API y consola
    ├── storage/              Archivos, caché y registros
    ├── tests/                Pruebas unitarias y funcionales
    └── composer.json         Dependencias PHP y comandos
```

## 5. Funcionalidades implementadas en el código

| Módulo | Responsabilidad |
| --- | --- |
| Inicio y catálogo | Mostrar categorías, productos, detalles y promociones públicas. |
| Autenticación | Registro, ingreso, sesión actual, cierre de sesión y cambio de contraseña. |
| Cuenta | Perfil, fecha de cumpleaños, direcciones y cierre de otras sesiones. |
| Diseñador de tortas | Selección de opciones, cotización y solicitud de imagen referencial. |
| Carrito | Productos, tortas personalizadas, cantidades y cupones. |
| Compra y pedidos | Registro y consulta de pedidos, retiro o entrega a domicilio. |
| Pagos | Registro del método de pago y revisión administrativa. |
| Catálogo administrativo | Gestión de categorías, productos, imágenes, disponibilidad y favoritos de clientes. |
| Promociones | Administración de campañas, descuentos y cupones. |
| Entregas | Zonas, fechas bloqueadas, ajustes, asignación y seguimiento de repartos. |
| Clientes y equipo | Consulta de clientes y administración de usuarios internos. |
| Panel administrativo | Indicadores del negocio sujetos a permisos. |
| Notificaciones | Consulta y marcado individual o general como leídas. |

Los métodos de pago admitidos por `StoreOrderRequest` son efectivo (`cash`), Yape, Plin y transferencia (`transfer`). Su presencia representa métodos registrados en el sistema; no demuestra una integración de cobro automático con una pasarela bancaria.

### Generación de imágenes

`CakeImageController` contiene una integración HTTP con `/v1/images/generations`. Construye una descripción con las opciones seleccionadas, solicita una imagen de 1024 × 1024, interpreta la respuesta Base64 y guarda un PNG en `storage/app/public/cake-designs/`.

La configuración utiliza `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL` y `OPENAI_IMAGE_QUALITY`. El código establece `gpt-image-2` y `low` como valores predeterminados. Estos son valores encontrados en el repositorio; no se verificaron disponibilidad del modelo, credenciales ni funcionamiento del proveedor. La ruta requiere autenticación y tiene un límite configurado de tres solicitudes por 60 minutos.

## 6. Datos principales

| Modelos | Información que representan |
| --- | --- |
| `User`, `Address` | Usuarios, perfil y direcciones. |
| `Category`, `Product` | Clasificación y productos del catálogo. |
| `CakeOption` | Opciones y precios del configurador. |
| `Cart`, `CartItem` | Carrito y sus elementos. |
| `Order`, `OrderItem` | Pedido y detalle de la compra. |
| `Payment` | Información y estado del pago. |
| `Promotion` | Promociones y cupones. |
| `DeliveryZone`, `DeliverySetting`, `BlockedDeliveryDate` | Cobertura y reglas de entrega. |
| `AppNotification` | Notificaciones dentro de la aplicación. |

La estructura incluye además tablas de roles y permisos, sesiones, caché, trabajos y tokens. Las migraciones son la fuente del esquema y de sus modificaciones. Los seeders cargan roles, cuentas internas y datos iniciales de catálogo, opciones, promociones y entregas.

## 7. Autenticación y permisos

La SPA solicita primero `/sanctum/csrf-cookie` y envía cookies con `withCredentials: true`. Para operaciones de escritura, los servicios incluyen el encabezado `X-XSRF-TOKEN`. Laravel habilita la API con estado mediante `statefulApi()` y protege rutas privadas con `auth:sanctum`.

CORS permite el origen definido por `FRONTEND_URL` y admite credenciales. Angular usa `authGuard` y `permissionGuard` para la navegación; la API aplica sus propios controles mediante middleware `can:...`.

| Rol | Permisos definidos en el seeder |
| --- | --- |
| `superadministrador` | Todos los permisos definidos, incluidos roles y equipo interno. |
| `administrador` | Catálogo, tortas, pedidos, aprobación de pagos, promociones, entregas, configuración, clientes y reportes. |
| `vendedor` | Consulta catálogo y promociones; gestiona pedidos, asigna repartidores y aprueba o rechaza pagos. |
| `repartidor` | `delivery.ver` y `delivery.actualizar`. |
| `cliente` | Sin permisos administrativos; acceso autenticado a funciones de compra y cuenta. |

La asignación exacta está en `backend/database/seeders/RolePermissionSeeder.php`. Por ejemplo, el vendedor no recibe `catalogo.gestionar`, por lo que no debe describirse como editor del catálogo. Las rutas concretas pueden añadir restricciones sobre los registros accesibles.

## 8. Mapa resumido de la API

Todas las rutas de esta tabla tienen el prefijo `/api/v1`. El contrato detallado de campos se encuentra en `app/Http/Requests/` y las respuestas en `app/Http/Resources/` y los controladores.

| Acceso | Rutas representativas |
| --- | --- |
| Público | `GET /health`, `/catalog/categories`, `/catalog/products`, `/catalog/products/{slug}`, `/promotions`, `/delivery-configuration` |
| Configurador público | `GET /cake-designer/options`, `POST /cake-designer/quote` |
| Registro e ingreso | `POST /auth/register`, `POST /auth/login` |
| Sesión y cuenta | `GET /auth/me`, `POST /auth/logout`, `PUT /auth/password`, `PUT /account/profile`, `DELETE /auth/other-sessions` |
| Direcciones | `GET/POST /addresses`, `PUT/DELETE /addresses/{address}` |
| Imagen de torta | `POST /cake-designer/image` |
| Carrito | `GET/DELETE /cart`, `POST /cart/products`, `POST /cart/custom-cakes`, `PATCH/DELETE /cart/items/{cartItem}`, `POST/DELETE /cart/coupon` |
| Pedidos del cliente | `GET/POST /orders`, `GET /orders/{order}` |
| Notificaciones | `GET /notifications`, `PATCH /notifications/read-all`, `PATCH /notifications/{notification}/read` |
| Administración | Recursos bajo `/admin/categories`, `/admin/products`, `/admin/cake-options`, `/admin/orders`, `/admin/payments`, `/admin/promotions`, `/admin/customers`, `/admin/staff-users` y `/admin/dashboard` |
| Entregas | `/admin/delivery/*`, `/admin/delivery-configuration/*`, `GET /delivery/orders`, `PATCH /delivery/orders/{order}`, `PATCH /delivery/location` |

La lista completa y los métodos administrativos están en `backend/routes/api.php`. `/health` comprueba también la conexión a la base de datos con una consulta.

## 9. Configuración y entorno local

Docker Compose define tres servicios:

| Servicio | Puerto en el equipo | Detalles |
| --- | --- | --- |
| Frontend | `4200` | Node.js 24, `ng serve`, carpeta local montada y volumen para `node_modules`. |
| Backend | `8000` | PHP 8.4, Composer y `php artisan serve`; inicia tras la comprobación de MySQL. |
| MySQL | `3307` | Puerto interno `3306` y volumen persistente `mysql_data`. |

El backend conserva imágenes mediante un montaje de `backend/storage/app/public`. Su código se copia al construir la imagen; los cambios PHP requieren reconstruirla. El Dockerfile crea el enlace público de almacenamiento y ejecuta `artisan optimize` al arrancar.

Variables relevantes de `backend/.env.example`:

| Variables | Finalidad |
| --- | --- |
| `APP_NAME`, `APP_ENV`, `APP_DEBUG`, `APP_KEY`, `APP_URL` | Identidad y configuración de Laravel. |
| `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN` | Origen del navegador y autenticación con cookies. |
| `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | Conexión a MySQL. Dentro de Compose: host `mysql`, puerto `3306`. |
| `SESSION_DRIVER`, `CACHE_STORE`, `QUEUE_CONNECTION` | La plantilla usa base de datos para sesiones, caché y colas. |
| `SUPER_ADMIN_NAME`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` | Cuenta inicial del propietario creada por el seeder. |
| `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_QUALITY` | Integración de imágenes. |

La plantilla usa idioma español, zona horaria `America/Lima` y correo mediante registros (`MAIL_MAILER=log`). Las entradas para Redis, AWS y otros proveedores no prueban que estén activos. Compose no define un servicio Redis ni un trabajador de colas.

### Instrucciones de arranque para uso posterior

Estos comandos se documentan como referencia y **no se ejecutaron durante esta tarea**. Desde la raíz, con Docker Desktop disponible:

1. Crear `backend/.env` desde `.env.example` únicamente si aún no existe, y revisar sus valores. No sobrescribir una configuración existente.
   Copiar `backend/.env.gemini.example` a `backend/.env.gemini` y completar la clave localmente. Docker Compose carga este archivo, que está ignorado por Git; no es necesario copiar la clave a `.env`.
2. Construir la imagen del backend y generar la clave en una instalación nueva:

   ```powershell
   docker compose build backend
   docker compose run --rm --no-deps backend php artisan key:generate --show
   ```

   Guardar la clave obtenida en `APP_KEY` del archivo local `backend/.env`. El código del backend no está montado: generarla sin `--show` dentro de un contenedor temporal no actualizaría ese archivo local. Conservar la clave existente si la aplicación ya estaba configurada.

3. Iniciar los servicios y preparar los datos de una instalación nueva:

   ```powershell
   docker compose up -d --build
   docker compose exec backend php artisan migrate --seed
   ```

   Los seeders escriben datos y cuentas iniciales; revisar su contenido antes de aplicarlos sobre una base con información existente.

4. Abrir `http://localhost:4200`. La API local utiliza `http://localhost:8000/api/v1`.

Alternativamente, iniciar solo `backend mysql` con Compose y ejecutar `npm install` y `npm start` dentro de `frontend/`. No iniciar simultáneamente ambos frontends en el puerto 4200.

## 10. Pruebas y mantenimiento

El backend incluye pruebas funcionales de autenticación, catálogo, carrito, pedidos, pagos, promociones, entregas, notificaciones, usuarios y configurador. `phpunit.xml` configura SQLite en memoria y servicios de sesión/caché en memoria para las pruebas. El frontend incluye archivos `.spec.ts` y el constructor de pruebas de Angular con Vitest.

Comandos disponibles para una validación posterior:

```powershell
# Backend con sus dependencias disponibles
docker compose exec backend php artisan test

# Desde frontend/
npm test
npm run build
```

La imagen PHP actual instala `pdo_mysql`, pero no declara la instalación de `pdo_sqlite`; se debe comprobar la disponibilidad de este último antes de ejecutar las pruebas que usan SQLite. No se afirma que las suites pasen: no fueron ejecutadas para esta documentación.

## 11. Consideraciones del estado actual

- Los contenedores sirven Angular y Laravel mediante servidores de desarrollo. Los archivos actuales describen un entorno local, no una configuración final de producción.
- Los servicios Angular contienen URLs locales de la API. Un despliegue en otro dominio requiere revisar esas direcciones junto con CORS y las cookies.
- El seeder incluye cuentas de demostración y contraseñas de desarrollo. Deben revisarse antes de publicar el sistema; este documento no copia secretos de `.env`.
- La generación de imágenes está implementada, pero su disponibilidad operativa depende de la configuración del proveedor.
- La documentación refleja archivos locales, no el estado de una base de datos activa ni una certificación de funcionamiento.

## 12. Fuentes dentro del repositorio

- [Dependencias del frontend](frontend/package.json) y [configuración Angular](frontend/angular.json).
- [Dependencias PHP](backend/composer.json) y [recursos frontend de Laravel](backend/package.json).
- [Docker Compose](docker-compose.yml), [Dockerfile PHP](backend/Dockerfile) y [Dockerfile Angular](frontend/Dockerfile).
- [Rutas de API](backend/routes/api.php) y [rutas de Angular](frontend/src/app/app.routes.ts).
- [Roles y permisos](backend/database/seeders/RolePermissionSeeder.php).
- [Variables de ejemplo](backend/.env.example) y [configuración de servicios](backend/config/services.php).
- [Integración de imágenes](backend/app/Http/Controllers/Api/V1/CakeImageController.php).
- [Configuración de pruebas](backend/phpunit.xml).
