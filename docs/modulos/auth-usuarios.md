# Módulo: Autenticación y Usuarios

## Propósito
Control de acceso por usuario/contraseña con roles (admin / vendedor). Gestión de usuarios y empleados (Sprint 1 ✅). Incluye las vistas exclusivas del rol vendedor.

## Tablas
- `usuarios` (username, password_hash bcrypt-10, nombre_completo, rol, activo, last_login, **empleado_id NOT NULL → empleados**)
- `empleados` (nombre, identificacion, cargo, salario_mensual, activo...) — relación empleados 1—N usuarios (D18)

## Endpoints (ref: ../03-api.md)
- `POST /api/auth/login` → JWT 24h con payload `{id, username, rol}`
- `POST /api/auth/logout` — no-op (JWT stateless)
- `GET /api/auth/verify` — verifica token y usuario activo
- `POST /api/auth/cambiar-password`
- ✅ **CRUD `/api/usuarios`** (admin): listar, crear, actualizar (rol/empleado/activo), reset password. Sin borrado físico. Protecciones: no auto-desactivarse, no dejar el sistema sin admins.
- ✅ **`/api/empleados`** (admin): listar (con num_usuarios), crear, actualizar.

## Frontend
- `js/modules/auth.js` (95 l.) — pantalla de login (⚠ muestra "Demo: admin/admin123")
- `js/modules/vendedor.js` (328 l.) — home del vendedor (turno, sus ventas), consulta de stock, perfil + cambiar contraseña. ⚠ tiene su propio sidebar duplicado
- `js/modules/configuracion.js` → vista **Usuarios y Empleados** (Sprint 1): tabla de usuarios con acciones (editar, reset password, activar/desactivar) + tabla de empleados; creación de empleado inline desde el formulario de usuario.
- Menú lateral por rol (`components/sidebar.js`): admin ve 10 módulos, vendedor ve 4

## Reglas de negocio
- Login: bcrypt compare; solo usuarios `activo=1`; actualiza `last_login`.
- Token en `localStorage`; `API.js` lo envía como Bearer y gestiona 401 globalmente (sesión expirada → login).
- Menú lateral definido por rol en frontend. ✅ **Sprint 0**: el backend ya verifica roles (`requireRole`, matriz en ../03-api.md verificada por tests).
- ✅ **Sprint 1**: el vendedor solo ve SUS ventas (B9); solo abre turno a su nombre (B15); compras registran el usuario real (B5).
- **D18**: todo usuario pertenece a un empleado; un empleado puede tener varios usuarios o ninguno.
- Fase I: varios vendedores + 1 admin + **caja única**. Fase II: varias cajas, rol contable.

## Problemas conocidos (../05-problemas-conocidos.md)
~~S3~~ ✅, ~~S4~~ ✅ (Sprint 0). ~~B9~~ ✅, ~~B15~~ ✅ (Sprint 1). S5 (credenciales por defecto visibles), S6 (sin rate-limit).

## Decisiones aprobadas (../06-decisiones-y-roadmap.md)
D9 (RBAC ✅ Sprint 0; CRUD usuarios ✅ Sprint 1), D11 (tests), D18 (empleados 1—N usuarios).
