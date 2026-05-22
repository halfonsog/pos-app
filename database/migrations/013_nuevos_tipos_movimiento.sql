-- Crear nueva tabla sin restricción CHECK
CREATE TABLE movimientos_stock_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  cantidad REAL NOT NULL,
  referencia_id INTEGER,
  usuario_id INTEGER NOT NULL,
  observaciones TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Copiar datos existentes
INSERT INTO movimientos_stock_new SELECT * FROM movimientos_stock;

-- Eliminar tabla antigua
DROP TABLE movimientos_stock;

-- Renombrar
ALTER TABLE movimientos_stock_new RENAME TO movimientos_stock;

-- Recrear índices
CREATE INDEX idx_movimientos_producto ON movimientos_stock(producto_id);
CREATE INDEX idx_movimientos_tipo ON movimientos_stock(tipo);
CREATE INDEX idx_movimientos_fecha ON movimientos_stock(created_at);