# Dulce Encanto

Sistema web autoadministrable para pastelería y repostería.

La [documentación técnica y funcional](DOCUMENTACION.md) detalla las tecnologías,
la arquitectura, los módulos, los datos, la API y la configuración del proyecto.

## Tecnologías

- Angular 22 y Node.js 24 para el frontend.
- Laravel 13 y PHP 8.4 para la API.
- MySQL 8.4 LTS para la base de datos.
- Docker Compose para frontend, backend y base de datos.

## Puesta en marcha

1. Clonar este repositorio privado e iniciar Docker Desktop.
2. Copiar `backend/.env.example` a `backend/.env` y generar un `APP_KEY` local
   si es una instalación nueva (ver la
   [guía de configuración](DOCUMENTACION.md#9-configuración-y-entorno-local)).
   No copiar `backend/.env` de otra máquina: contiene credenciales locales.
   Copiar `backend/.env.gemini.example` a `backend/.env.gemini` y completar
   localmente la clave de Gemini. Este archivo está ignorado por Git.
   Levantar el backend y la base de datos:

   ```powershell
   docker compose up -d --build backend mysql
   docker compose exec backend php artisan migrate --seed
   ```

3. Levantar Angular en otra terminal o con `docker compose up -d frontend`:

   ```powershell
   Set-Location frontend
   npm install
   npm start
   ```

4. Abrir `http://localhost:4200`.

La API está disponible en `http://localhost:8000/api/v1` y MySQL se expone
en `localhost:3307` para no interferir con XAMPP.

## Autenticación y roles

El cliente puede registrarse directamente desde `http://localhost:4200/registro`.
Por seguridad, todo registro público recibe únicamente el rol `cliente`, aunque se
intente enviar otro rol desde el navegador.

El sistema queda preparado con cinco roles internos:

- `superadministrador`: propietario con acceso total.
- `administrador`: administra el negocio, excepto roles y usuarios internos.
- `vendedor`: consulta de catálogo y promociones, gestión de pedidos, asignación de repartidor y aprobación o rechazo de pagos.
- `repartidor`: consulta de delivery y actualización del estado de entregas.
- `cliente`: cuenta pública y compras.

Para desarrollo se crea este acceso al ejecutar los seeders:

```text
Correo: admin@dulceencanto.test
Contraseña: Cambiar123!
```

Estas credenciales se configuran en `backend/.env` y deben cambiarse antes de
publicar el sistema.

Endpoints disponibles:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

## Catálogo autoadministrable

El catálogo público está disponible en `http://localhost:4200/catalogo`. Los
usuarios con el permiso `catalogo.gestionar` pueden acceder a
`http://localhost:4200/administracion/catalogo` para:

- Crear, editar, ordenar, ocultar y eliminar categorías vacías.
- Crear, editar y eliminar productos.
- Cambiar precios y disponibilidad.
- Subir imágenes JPG, PNG o WebP de hasta 3 MB.
- Ocultar productos sin eliminarlos.

La API pública expone `GET /api/v1/catalog/categories` y
`GET /api/v1/catalog/products`. El CRUD privado se encuentra bajo
`/api/v1/admin/categories` y `/api/v1/admin/products`.

## Asistente de compra con Gemini

El botón «Te ayudo a elegir» está disponible en Inicio, Catálogo, Zona fría y
las fichas de producto. El panel recomienda hasta tres productos del catálogo
según la ocasión y el presupuesto indicado. Laravel envía a Gemini solo productos
activos y disponibles, comprueba los identificadores devueltos y valida el
presupuesto antes de mostrar las sugerencias. Agregar un producto al carrito
requiere que el cliente inicie sesión.

La clave de Gemini se guarda localmente en `backend/.env.gemini`, un archivo
ignorado por Git. Docker Compose la carga solo en el backend; el archivo queda
fuera de la imagen Docker y el navegador no recibe la clave. Para usar el
proyecto en otro equipo, copia `.env.gemini.example`, completa la clave desde
un gestor de contraseñas y no la publiques en el repositorio.
El modelo predeterminado es
`gemini-3.5-flash-lite`; puedes cambiarlo con `GEMINI_MODEL`. Después de editar
el entorno, recrea el contenedor backend con `docker compose up -d --force-recreate backend`.
Sin una clave, el asistente muestra un mensaje de configuración y no hace
llamadas a Gemini. El endpoint público es `POST /api/v1/catalog/recommendations`
y tiene límites de cinco solicitudes por minuto y treinta por día por dirección IP
para controlar el consumo.

## Diseña tu torta

El configurador está disponible en `http://localhost:4200/disena-tu-torta`.
Permite seleccionar tamaño, sabor, relleno, cobertura, color, decoración,
extras, temática, dedicatoria y fecha de entrega. El precio aproximado siempre
se recalcula en Laravel usando los valores vigentes de la base de datos.

El propietario y los administradores pueden modificar todas las opciones desde
`http://localhost:4200/administracion/opciones-torta` sin tocar código.

El módulo incluye una vista previa referencial y código para generar imágenes
mediante OpenAI. La integración requiere `OPENAI_API_KEY` y permite configurar
`OPENAI_IMAGE_MODEL` y `OPENAI_IMAGE_QUALITY`. Su funcionamiento con el proveedor
no se verificó durante la elaboración de la documentación.

## Comandos de comprobación

```powershell
docker compose ps
docker compose exec backend php -v
docker compose exec backend composer --version
docker compose exec backend php artisan test
Invoke-RestMethod http://localhost:8000/api/v1/health
```
