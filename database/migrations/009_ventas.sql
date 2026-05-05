-- Tabla de turnos
CREATE TABLE IF NOT EXISTS turnos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendedor_id INTEGER NOT NULL,
  monto_apertura REAL NOT NULL,
  monto_cierre_esperado REAL,
  monto_cierre_real REAL,
  diferencia REAL,
  estado TEXT CHECK(estado IN ('abierto', 'cerrado')) DEFAULT 'abierto',
  abierto_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  cerrado_at DATETIME,
  FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
);

-- Tabla de ventas
CREATE TABLE IF NOT EXISTS ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  turno_id INTEGER,
  vendedor_id INTEGER NOT NULL,
  subtotal REAL NOT NULL,
  impuesto REAL NOT NULL,
  total REAL NOT NULL,
  metodo_pago TEXT CHECK(metodo_pago IN ('efectivo', 'tarjeta')) NOT NULL,
  estado TEXT CHECK(estado IN ('completada', 'anulada')) DEFAULT 'completada',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (turno_id) REFERENCES turnos(id),
  FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
);

-- Tabla de detalles de venta
CREATE TABLE IF NOT EXISTS venta_detalles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  cantidad REAL NOT NULL,
  precio_unitario REAL NOT NULL,
  total REAL NOT NULL,
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);