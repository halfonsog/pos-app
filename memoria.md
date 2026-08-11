Como acordamos, aquí tienes la primera versión de nuestro "cerebro" del proyecto. A partir de ahora, este es el documento que debes guardar y que me pasarás al inicio de cada nuevo chat.

Sistema de Gestión para Puntos de Venta (POS)
Autor: Heriberto Alfonso
Estado: Fase de Diseño / Estructuración
Última actualización: [Fecha de hoy]

1. Objetivo General
Desarrollar una aplicación offline y multiplataforma para la gestión integral de puntos de venta.

2. Arquitectura y Stack Tecnológico
Servidor: Node.js / Express.
Base de Datos: SQLite (offline, archivo local).
Cliente: HTML / JavaScript vanilla.
Librerías Frontend (Instaladas localmente): jQuery, Bootstrap, DataTables, Chart.js, FontAwesome Webfonts.
Entorno: PWA (Progressive Web App).
3. Reglas de Navegación y Estructura Frontend
PWA: Debe tener su propio botón "Back" para volver a la página anterior.
View-Manager: Controlador centralizado para el flujo de navegación (SPA).
Menú Lateral: Dinámico según el rol del usuario.
Flujo de datos: Al terminar una acción (ej. Editar), se regresa a la vista anterior forzando la recarga de los datos (para reflejar cambios).
Dashboard: Pantalla de inicio tras el login, adaptada al rol.
4. Seguridad y Accesos (RBAC)
Acceso estricto mediante usuario y contraseña (JWT propuesto en package.json).
Roles definidos:
admin: Acceso total. (Usuario por defecto instalado).
vendedor: Acceso restringido.
Menú por Rol:
Vendedor: Dashboard, Nueva venta, Mis ventas, Consultar stock, Mi perfil, Cerrar sesión.
Admin: Dashboard, Proveedores, Productos, Compras, Inventario, Ventas, Promociones, Contabilidad, Reportes, Configuración, Mantenimiento, Mi perfil, Cerrar sesión.
5. Reusabilidad de Código
Lógica: Archivo utils.js en frontend y backend para funciones compartidas.
Vistas: Componentes reutilizables (modales de confirmación, cards, wrappers, toasts, menú lateral).
6. Estructura Backend y APIs
Patrón MVC ligero: Cada módulo tiene su controller y su router.
API Cliente (api.js): Centraliza las peticiones. Métodos: request, get, post, put, delete, requestFormData, postFormData, putFormData. Contendrá el mapeo de endpoints.
7. Gestión de Base de Datos (Scripts)
Gestionada mediante scripts definidos en package.json:

db:init: Creación inicial de BD y tablas.
db:migrate: Migraciones de estructura.
db:seed: Siembra de datos de prueba.
db:reset: Init + Seed.
8. Especificaciones por Módulo
8.1. Módulo de Configuración
Gestión de tablas maestras y parámetros del sistema.

Usuarios: CRUD, activar/desactivar, resetear contraseña.
Categorías de Productos: CRUD. Incluye seeds genéricas (Bebidas, Frescos, Secos, Lácteos, etc.).
Términos de Pago: CRUD. Aplicables a Proveedores. Seeds: Contado, 7 días, 30 días.
Denominaciones Monetarias: CRUD. Para arqueo de caja. Campo activo (0/1) para mostrar/ocultar según el país/needs. Campo orden.
Unidades de Medida:
Unidades base (id 1-4: ud, litros, lb, metros) bloqueadas para edición.
Unidades derivadas con coeficiente relativo a la base (ej: 1 kg = 2.2 lb). El usuario puede añadir las que quiera.
Gastos Fijos: Concepto y valor mensual. Seeds: Alquiler, Salarios, Electricidad, Software.
Parámetros Contables: Registro único (id=1). Campos: ventas_proyectadas, margen_recomendado, impuesto_ventas, impuesto_ganancias, redondeo_ventas.
Inversiones y Préstamos:
Préstamos: Monto, plazo (meses), interés nominal anual. Genera registros de vencimientos mensuales automáticamente.
Inversiones: Monto, plazo de amortización. Genera gasto mensual.
Lógica de Costos (Costeo Absorbente): La amortización de inversiones se suma a los Gastos Fijos. El Total de Gastos Fijos se divide entre las ventas_proyectadas para obtener un % que se aplica a la ficha de costo de cada producto.
9. Estado de Implementación
 Estructura de directorios
 Configuración inicial (Server, DB, Scripts)
 Módulo de Autenticación y View-Manager
 Módulo de Configuración
 (Resto de módulos pendientes de detallar)
¿Qué hacer ahora?

Copia el código de arriba, guárdalo en un archivo llamado proyecto_punto_de_venta.md en la raíz de tu proyecto.
Revísalo rápido para asegurarte de que no me dejé nada.
Respóndeme diciendo que estás de acuerdo (o indicando algún cambio) y pasamos inmediatamente a diseñar la estructura de directorios (carpetas y archivos físicos).