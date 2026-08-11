-- ============================================
-- 022 — Banco (movimientos bancarios)
-- ============================================
-- Saldo del banco = ventas por tarjeta (calculado) + depósitos − retiros
-- − compras pagadas por transferencia − pagos de impuestos por banco online.
-- Los movimientos manuales son depósitos y retiros; las compras por transferencia
-- y los pagos de impuestos se registran automáticamente al ocurrir.
-- ============================================

PRAGMA foreign_keys = OFF;

CREATE TABLE movimientos_bancarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT CHECK(tipo IN ('deposito', 'retiro', 'compra_transferencia', 'pago_impuesto')) NOT NULL,
  monto REAL NOT NULL,                 -- siempre positivo; el signo lo da el tipo
  fecha DATE NOT NULL,
  descripcion TEXT,
  referencia TEXT,                     -- nº de transferencia, comprobante, etc.
  usuario_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movbanco_tipo ON movimientos_bancarios(tipo);
CREATE INDEX idx_movbanco_fecha ON movimientos_bancarios(fecha);

PRAGMA foreign_keys = ON;
