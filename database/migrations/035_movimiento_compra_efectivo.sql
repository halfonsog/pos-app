-- 035 — Soporte USD completo en pagos/cobros (efectivo y transferencia)
-- Añade el tipo 'compra_efectivo' para pagar compras en efectivo (CUP o USD),
-- descontando de la caja de la moneda indicada.

PRAGMA foreign_keys = OFF;

CREATE TABLE movimientos_bancarios_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT CHECK(tipo IN ('deposito', 'retiro', 'compra_transferencia', 'compra_efectivo', 'pago_impuesto', 'cambio_divisas', 'pago_servicio', 'cobro_servicio')) NOT NULL,
  monto REAL NOT NULL,
  fecha DATE NOT NULL,
  descripcion TEXT,
  referencia TEXT,
  usuario_id INTEGER,
  cuenta TEXT DEFAULT 'banco',
  moneda TEXT DEFAULT 'CUP',
  tasa_cambio REAL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO movimientos_bancarios_new (id, tipo, monto, fecha, descripcion, referencia, usuario_id, cuenta, moneda, tasa_cambio, created_at)
SELECT id, tipo, monto, fecha, descripcion, referencia, usuario_id, cuenta, moneda, tasa_cambio, created_at
FROM movimientos_bancarios;

DROP TABLE movimientos_bancarios;
ALTER TABLE movimientos_bancarios_new RENAME TO movimientos_bancarios;

CREATE INDEX idx_movbanco_tipo ON movimientos_bancarios(tipo);
CREATE INDEX idx_movbanco_fecha ON movimientos_bancarios(fecha);
CREATE INDEX idx_movbanco_cuenta_moneda ON movimientos_bancarios(cuenta, moneda);

PRAGMA foreign_keys = ON;