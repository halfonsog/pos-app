-- ============================================
-- 024 — Pedidos unificados: encargos minoristas (Sprint 6)
-- ============================================
-- pedidos.tipo: 'mayorista' (defecto, Sprint 5) | 'minorista' (encargos).
-- Encargo minorista: sin cliente registrado (cliente_nombre libre), precio de venta
-- minorista, stock del inventario minorista, y al entregar genera la venta minorista
-- (con turno si hay uno abierto). Sin depósitos en v1 (evita doble conteo de caja).
-- ============================================

PRAGMA foreign_keys = OFF;

CREATE TABLE pedidos_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK(tipo IN ('mayorista', 'minorista')) DEFAULT 'mayorista',
  cliente_id INTEGER REFERENCES clientes(id),   -- obligatorio solo en mayorista
  cliente_nombre TEXT,                          -- encargos minoristas (nombre libre)
  fecha DATE NOT NULL,
  fecha_vencimiento DATE,
  estado TEXT CHECK(estado IN ('pendiente', 'facturado', 'entregado', 'cancelado')) DEFAULT 'pendiente',
  subtotal REAL DEFAULT 0,
  impuesto REAL DEFAULT 0,
  total REAL DEFAULT 0,
  pagado REAL DEFAULT 0,
  estado_pago TEXT CHECK(estado_pago IN ('pendiente', 'parcial', 'pagado')) DEFAULT 'pendiente',
  venta_id INTEGER REFERENCES ventas(id),
  vendedor_id INTEGER REFERENCES usuarios(id),
  observaciones TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

INSERT INTO pedidos_new (id, tipo, cliente_id, cliente_nombre, fecha, fecha_vencimiento, estado,
                         subtotal, impuesto, total, pagado, estado_pago, venta_id, vendedor_id,
                         observaciones, created_at, updated_at)
SELECT id, 'mayorista', cliente_id, NULL, fecha, fecha_vencimiento, estado,
       subtotal, impuesto, total, pagado, estado_pago, venta_id, vendedor_id,
       observaciones, created_at, updated_at
FROM pedidos;

DROP TABLE pedidos;
ALTER TABLE pedidos_new RENAME TO pedidos;

CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_tipo ON pedidos(tipo);

PRAGMA foreign_keys = ON;
