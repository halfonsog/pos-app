-- ============================================
-- 016 — Empleados 1:N Usuarios (D18)
-- ============================================
-- Regla de negocio (propietario, 2026-08-05):
--   · Puede haber empleados SIN credenciales de acceso.
--   · NO puede haber usuarios sin empleado asociado.
--   · Un empleado puede tener VARIOS usuarios (ej: admin y vendedor).
--
-- Cambios:
--   · usuarios.empleado_id INTEGER NOT NULL → empleados(id)
--   · empleados pierde usuario_id (la dirección correcta es usuarios.empleado_id)
--   · Backfill: un empleado por cada usuario existente
-- ============================================

PRAGMA foreign_keys = OFF;

-- 1. Recrear empleados SIN usuario_id
CREATE TABLE empleados_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  identificacion TEXT UNIQUE,
  cargo TEXT DEFAULT 'vendedor' CHECK(cargo IN ('vendedor', 'administrador', 'cajero', 'otro')),
  salario_mensual REAL NOT NULL DEFAULT 0,
  aporte_corto_plazo REAL DEFAULT 0,
  utilidades REAL DEFAULT 0,
  activo BOOLEAN DEFAULT 1,
  fecha_ingreso DATE,
  fecha_salida DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO empleados_new (id, nombre, identificacion, cargo, salario_mensual, aporte_corto_plazo, utilidades, activo, fecha_ingreso, fecha_salida, created_at)
SELECT id, nombre, identificacion, cargo, salario_mensual, aporte_corto_plazo, utilidades, activo, fecha_ingreso, fecha_salida, created_at
FROM empleados;

DROP TABLE empleados;
ALTER TABLE empleados_new RENAME TO empleados;

-- 2. Backfill: crear un empleado por cada usuario que no tenga uno (por nombre)
INSERT INTO empleados (nombre, cargo, activo)
SELECT u.nombre_completo,
       CASE WHEN u.rol = 'admin' THEN 'administrador' ELSE 'vendedor' END,
       1
FROM usuarios u
WHERE NOT EXISTS (SELECT 1 FROM empleados e WHERE e.nombre = u.nombre_completo);

-- 3. Recrear usuarios CON empleado_id NOT NULL
CREATE TABLE usuarios_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  rol TEXT CHECK(rol IN ('admin', 'vendedor')) DEFAULT 'vendedor',
  activo BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id)
);

INSERT INTO usuarios_new (id, username, password_hash, nombre_completo, rol, activo, created_at, last_login, empleado_id)
SELECT u.id, u.username, u.password_hash, u.nombre_completo, u.rol, u.activo, u.created_at, u.last_login,
       (SELECT e.id FROM empleados e WHERE e.nombre = u.nombre_completo LIMIT 1)
FROM usuarios u;

DROP TABLE usuarios;
ALTER TABLE usuarios_new RENAME TO usuarios;

-- 4. Recrear índices de usuarios + índice nuevo por empleado
CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_empleado ON usuarios(empleado_id);

PRAGMA foreign_keys = ON;
