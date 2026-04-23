-- Tabla de parámetros generales
CREATE TABLE IF NOT EXISTS configuracion_general (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ventas_proyectadas REAL NOT NULL DEFAULT 10000,
  margen_recomendado REAL DEFAULT 20,
  impuesto_ventas REAL DEFAULT 15,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuración por defecto
INSERT OR IGNORE INTO configuracion_general (id, ventas_proyectadas, margen_recomendado, impuesto_ventas)
VALUES (1, 10000, 20, 15);

-- Tabla de gastos fijos
CREATE TABLE IF NOT EXISTS configuracion_gastos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  concepto TEXT NOT NULL,
  valor_mensual REAL NOT NULL DEFAULT 0,
  activo BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Gastos de ejemplo
INSERT OR IGNORE INTO configuracion_gastos (concepto, valor_mensual) VALUES 
  ('Alquiler', 500),
  ('Salarios', 800),
  ('Electricidad', 150),
  ('Agua', 50),
  ('Internet', 60);