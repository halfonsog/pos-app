-- Tabla para configuración de ficha de costo por producto
CREATE TABLE IF NOT EXISTS producto_costos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL UNIQUE,
  costo_base REAL DEFAULT 0,
  margen REAL DEFAULT 30,
  gastos_fijos REAL DEFAULT 15,
  impuesto REAL DEFAULT 7,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Insertar configuración por defecto para productos existentes
INSERT OR IGNORE INTO producto_costos (producto_id, costo_base, margen, gastos_fijos, impuesto)
SELECT id, 0, 30, 15, 7 FROM productos;