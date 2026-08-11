-- ============================================
-- 025 — Soporte USD (dólar) paralelo al peso (00-pendientes, nuevas leyes)
-- ============================================
-- Regla del propietario: los precios siempre en CUP; cada operación en USD lleva
-- la tasa de cambio acordada EN ESE MOMENTO. Para el fisco solo cuenta el
-- equivalente total en CUP; el USD se gestiona solo internamente (cash y banco).
-- ============================================

PRAGMA foreign_keys = OFF;

-- 1. Movimientos de dinero: cuenta (banco/efectivo), moneda (CUP/USD) y tasa
ALTER TABLE movimientos_bancarios ADD COLUMN cuenta TEXT DEFAULT 'banco';
ALTER TABLE movimientos_bancarios ADD COLUMN moneda TEXT DEFAULT 'CUP';
ALTER TABLE movimientos_bancarios ADD COLUMN tasa_cambio REAL DEFAULT 1;

-- 2. Pagos de pedidos: moneda + tasa acordada en el momento del cobro
ALTER TABLE pagos_pedido ADD COLUMN moneda TEXT DEFAULT 'CUP';
ALTER TABLE pagos_pedido ADD COLUMN tasa_cambio REAL DEFAULT 1;

-- 3. Tasa de referencia USD (editable en Configuración → Parámetros; 0 = no definida)
ALTER TABLE parametros_contables ADD COLUMN tasa_cambio_usd REAL DEFAULT 0;

PRAGMA foreign_keys = ON;
