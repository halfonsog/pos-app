-- ============================================
-- 029 — Servicios (pagos/cobros) + tipo de venta por vendedor
-- ============================================
-- servicios: pagos y cobros por servicios (estiba, transporte...) con vínculo
-- opcional a una compra o pedido, y efecto en efectivo/banco según su cuenta.
-- usuarios.tipo_venta: un vendedor puede tener asignada minorista, mayorista o ambas.
-- ============================================

PRAGMA foreign_keys = OFF;

CREATE TABLE servicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  descripcion TEXT NOT NULL,
  tipo TEXT CHECK(tipo IN ('pago', 'cobro')) NOT NULL,   -- pago = sale dinero, cobro = entra
  monto REAL NOT NULL,
  moneda TEXT DEFAULT 'CUP',
  tasa_cambio REAL DEFAULT 1,
  cuenta TEXT CHECK(cuenta IN ('efectivo', 'banco')) DEFAULT 'efectivo',
  compra_id INTEGER REFERENCES compras(id),
  pedido_id INTEGER REFERENCES pedidos(id),
  referencia TEXT,
  usuario_id INTEGER REFERENCES usuarios(id),
  fecha DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_servicios_fecha ON servicios(fecha);
CREATE INDEX idx_servicios_tipo ON servicios(tipo);

ALTER TABLE usuarios ADD COLUMN tipo_venta TEXT CHECK(tipo_venta IN ('minorista', 'mayorista', 'ambas')) DEFAULT 'ambas';

PRAGMA foreign_keys = ON;
