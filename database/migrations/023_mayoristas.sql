-- ============================================
-- 023 — Ventas Mayoristas (diseño aprobado en docs/modulos/mayoristas.md)
-- ============================================
-- clientes · venta_tramos (precios por volumen) · pedidos + detalles + pagos
-- productos.stock_mayorista (inventario separado) · movimientos_stock.inventario
-- ventas: tipo_venta + cliente_id + metodo_pago ampliado (transferencia/mixta)
-- ============================================

PRAGMA foreign_keys = OFF;

-- 1. Clientes
CREATE TABLE clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  identificacion TEXT,
  telefono TEXT,
  direccion TEXT,
  contrato TEXT,                          -- nº de contrato (si existe)
  condicion_pago_id INTEGER REFERENCES terminos_pago(id),
  limite_credito REAL DEFAULT 0,
  descuento_global REAL DEFAULT 0,        -- % sobre el total del pedido
  activo BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

-- 2. Recrear ventas: tipo_venta + cliente_id + metodo_pago ampliado
CREATE TABLE ventas_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  turno_id INTEGER,
  vendedor_id INTEGER NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  tipo_venta TEXT NOT NULL CHECK(tipo_venta IN ('minorista', 'mayorista')) DEFAULT 'minorista',
  subtotal REAL NOT NULL,
  impuesto REAL NOT NULL,
  total REAL NOT NULL,
  ajuste_redondeo REAL DEFAULT 0,
  metodo_pago TEXT CHECK(metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'mixta')),
  estado TEXT CHECK(estado IN ('completada', 'anulada')) DEFAULT 'completada',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (turno_id) REFERENCES turnos(id),
  FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
);

INSERT INTO ventas_new (id, turno_id, vendedor_id, cliente_id, tipo_venta, subtotal, impuesto, total, ajuste_redondeo, metodo_pago, estado, created_at)
SELECT id, turno_id, vendedor_id, NULL, 'minorista', subtotal, impuesto, total, COALESCE(ajuste_redondeo, 0), metodo_pago, estado, created_at
FROM ventas;

DROP TABLE ventas;
ALTER TABLE ventas_new RENAME TO ventas;

CREATE INDEX idx_ventas_created ON ventas(created_at);
CREATE INDEX idx_ventas_turno ON ventas(turno_id);
CREATE INDEX idx_ventas_tipo ON ventas(tipo_venta);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);

-- 3. Tramos de precio por volumen
CREATE TABLE venta_tramos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  desde REAL NOT NULL,
  hasta REAL,                             -- NULL = sin tope
  precio REAL NOT NULL,
  UNIQUE(producto_id, desde)
);

-- 4. Pedidos mayoristas
CREATE TABLE pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  fecha DATE NOT NULL,
  fecha_vencimiento DATE,
  estado TEXT CHECK(estado IN ('pendiente', 'facturado', 'entregado', 'cancelado')) DEFAULT 'pendiente',
  subtotal REAL DEFAULT 0,
  impuesto REAL DEFAULT 0,
  total REAL DEFAULT 0,
  pagado REAL DEFAULT 0,
  estado_pago TEXT CHECK(estado_pago IN ('pendiente', 'parcial', 'pagado')) DEFAULT 'pendiente',
  venta_id INTEGER REFERENCES ventas(id),  -- asiento creado al facturar
  vendedor_id INTEGER REFERENCES usuarios(id),
  observaciones TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

CREATE TABLE pedido_detalles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  cantidad REAL NOT NULL,
  precio_unitario REAL NOT NULL,
  total REAL NOT NULL
);

CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedido_detalles_pedido ON pedido_detalles(pedido_id);

-- 5. Pagos de pedidos (parciales y/o mixtos)
CREATE TABLE pagos_pedido (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  monto REAL NOT NULL,
  metodo_pago TEXT CHECK(metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')) NOT NULL,
  referencia TEXT,
  usuario_id INTEGER REFERENCES usuarios(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pagos_pedido ON pagos_pedido(pedido_id);

-- 6. Inventario separado: stock mayorista en productos + inventario en movimientos
ALTER TABLE productos ADD COLUMN stock_mayorista REAL DEFAULT 0;
ALTER TABLE movimientos_stock ADD COLUMN inventario TEXT DEFAULT 'minorista';

-- 7. Nuevo tipo de movimiento: transferencia entre inventarios
INSERT INTO tipos_movimiento (codigo, nombre, signo, descripcion, orden)
VALUES ('transferencia', 'Transferencia entre inventarios', '+-', 'Movimiento de stock entre minorista y mayorista', 13);

PRAGMA foreign_keys = ON;
