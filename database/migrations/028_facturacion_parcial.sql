-- ============================================
-- 028 — Facturación parcial de pedidos (propietario)
-- ============================================
-- pedido_detalles.cantidad_facturada: cuánto de cada línea ya se facturó.
-- pedidos.estado añade 'parcial' (facturado a medias: falta restante por facturar).
-- Regla: tras facturación parcial el pedido no se modifica; solo se completa
-- lo restante o se cancela (lo ya facturado queda intacto).
-- ============================================

PRAGMA foreign_keys = OFF;

ALTER TABLE pedido_detalles ADD COLUMN cantidad_facturada REAL DEFAULT 0;

CREATE TABLE pedidos_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK(tipo IN ('mayorista', 'minorista')) DEFAULT 'mayorista',
  cliente_id INTEGER REFERENCES clientes(id),
  cliente_nombre TEXT,
  fecha DATE NOT NULL,
  fecha_vencimiento DATE,
  estado TEXT CHECK(estado IN ('pendiente', 'parcial', 'facturado', 'entregado', 'cancelado')) DEFAULT 'pendiente',
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
SELECT id, tipo, cliente_id, cliente_nombre, fecha, fecha_vencimiento, estado,
       subtotal, impuesto, total, pagado, estado_pago, venta_id, vendedor_id,
       observaciones, created_at, updated_at
FROM pedidos;

DROP TABLE pedidos;
ALTER TABLE pedidos_new RENAME TO pedidos;

CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_tipo ON pedidos(tipo);

PRAGMA foreign_keys = ON;
