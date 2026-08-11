# Módulo: Autenticación y Usuarios

## Propósito
Control de acceso por usuario/contraseña con roles (admin / vendedor). Gestión de usuarios y empleados. Incluye las vistas exclusivas del rol vendedor.

## Tablas
- `usuarios` (username, password_hash bcrypt-10, nombre_completo, rol, activo, last_login, **empleado_id NOT NULL → empleados**, tipo_venta) — `002`, `016`, `029`
- `empleados` (nombre, identificacion, cargo, salario_mensual, aporte_corto_plazo, utilidades, activo...) — `015`, `016`, `030` (relación empleados 1—N usuarios, D18)

## Endpoints (ref: ../03-api.md)
- `POST /api/auth/login` → JWT 24h con payload `{id, username, rol}`
- `POST /api/auth/logout` — no-op (JWT stateless)
- `GET /api/auth/verify` — verifica token y usuario activo
- `POST /api/auth/cambiar-password`
- **CRUD `/api/usuarios`** (admin): listar, crear, actualizar (rol/empleado/tipo_venta/activo), reset password. Sin borrado físico. Protecciones: no auto-desactivarse, no dejar el sistema sin admins.
- **`/api/empleados`** (admin): listar (con num_usuarios), crear, actualizar (incl. salario_mensual, aporte_corto_plazo, utilidades).

## Frontend
- `js/modules/auth.js` — pantalla de login (⚠ muestra "Demo: admin/admin123" — S5).
- `js/modules/vendedor.js` — home del vendedor (turno, sus ventas), consulta de stock, perfil + cambiar contraseña. ⚠ tiene su propio sidebar duplicado.
- `js/modules/configuracion.js` → vista **Usuarios y Empleados** (empleado-céntrica): la vista principal es la lista de empleados; desde ahí se crean; cada ficha permite editar datos del empleado y gestionar sus usuarios (añadir, activar/desactivar, reset, cambiar rol).
- Menú lateral por rol (`components/sidebar.js`): admin ve 12 módulos, vendedor ve 5 (Inicio, Nueva Venta, Mis Ventas, Consultar Stock, Clientes).

## Reglas de negocio
- Login: bcrypt compare; solo usuarios `activo=1`; actualiza `last_login`.
- Token en `localStorage`; `API.js` lo envía como Bearer y gestiona 401 globalmente (sesión expirada → login).
- Menú lateral definido por rol en frontend; el **backend verifica roles** (`requireRole`, matriz en ../03-api.md).
- El vendedor solo ve SUS ventas; solo abre turno a su nombre; compras registran el usuario real.
- **D18**: todo usuario pertenece a un empleado (NOT NULL); un empleado puede tener varios usuarios o ninguno.
- `tipo_venta` (minorista/mayorista/ambas) limita la operativa del vendedor; admin siempre ambas.
- Fase I: varios vendedores + 1 admin + **caja única**. Fase II: varias cajas, rol contable.

## Problemas conocidos (../05-problemas-conocidos.md)
S5 (credenciales por defecto visibles), S6 (sin rate-limit en login). `vendedor.js` con sidebar duplicado (ver 04 §6).