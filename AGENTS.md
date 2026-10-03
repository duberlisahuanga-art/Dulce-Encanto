# Trabajo con Nexus Engine

- Usa Nexus Engine para la validación final de cambios en Dulce Encanto. En este entorno está en `../../nexus-engine`, desde la raíz de este repositorio.
- Durante las iteraciones, ejecuta `../../nexus-engine/.venv/bin/python ../../nexus-engine/main.py validate --config ../../nexus-engine/config/dulce_encanto.yaml --scope auto --json` desde la raíz de Dulce Encanto. Nexus ejecuta la validación completa si todavía no tiene una referencia válida o si no puede clasificar un cambio.
- Antes de entregar un cambio de código, ejecuta el mismo comando con `--scope full`. Lee el resumen JSON primero y abre el `report.json` o los logs de la ejecución solo cuando necesites más detalles.
- Nexus incluye pruebas de navegador para inicio, catálogo, detalle de producto y acceso al carrito. También prueba registro, cambios del carrito y un pedido de recojo con una base MySQL temporal que elimina al terminar. Requieren Chrome y las dependencias instaladas en `../../nexus-engine/e2e/` con `npm ci`.
- Si modificaste archivos de `backend/` que se copian a la imagen Docker, usa `--sync-backend` en esa validación para reconstruir el servicio antes de probarlo. Esta opción puede reiniciar el contenedor backend.
- Si Nexus informa un fallo, corrige los problemas relacionados con el cambio y vuelve a validarlo. Distingue los fallos del código de los problemas del entorno y comunica cualquier comprobación inconclusa.
- Evita repetir manualmente las mismas suites que Nexus ya ejecutó. Una prueba específica durante el desarrollo sí puede ayudarte a obtener una respuesta más rápida.
- No envíes logs completos ni credenciales en el resumen al usuario. Los logs de Nexus están en `.nexus/runs/` dentro de Nexus Engine.
