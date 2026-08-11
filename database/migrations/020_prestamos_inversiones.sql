-- ============================================
-- 020 — Préstamos e Inversiones (00-pendientes #3, especificación del propietario)
-- ============================================
-- Registro de seguimiento de préstamos e inversiones con su tabla de vencimientos.
-- El gasto financiero mensual (suma de aportes de vencimientos del mes en curso)
-- alimenta el costeo absorbente (%gastos) — ya no será un concepto fijo en gastos.
-- ============================================

PRAGMA foreign_keys = OFF;

CREATE TABLE prestamos_inversiones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT CHECK(tipo IN ('prestamo', 'inversion')) NOT NULL,
  descripcion TEXT NOT NULL,
  capital_total REAL NOT NULL,
  plazo_meses INTEGER NOT NULL,
  tasa_anual REAL DEFAULT 0,
  pago_capital REAL NOT NULL,          -- = capital_total / plazo_meses (redondeado a 2)
  fecha_inicio DATE NOT NULL,
  estado TEXT CHECK(estado IN ('activo', 'cancelado')) DEFAULT 'activo',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

CREATE TABLE vencimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prestamo_inversion_id INTEGER NOT NULL REFERENCES prestamos_inversiones(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,            -- 1..plazo_meses
  fecha_vencimiento DATE NOT NULL,     -- día 1 de cada mes; el primero = mes siguiente a fecha_inicio
  capital REAL NOT NULL,               -- capital restante al inicio del período
  pago_capital REAL NOT NULL,
  tarifa REAL NOT NULL,                -- tasa_mensual × capital_gravado
  aporte REAL NOT NULL,                -- pago_capital + tarifa
  monto_pagado REAL DEFAULT 0,
  estado TEXT CHECK(estado IN ('pendiente', 'pagado', 'parcial')) DEFAULT 'pendiente',
  fecha_pago DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(prestamo_inversion_id, ordinal)
);

CREATE INDEX idx_vencimientos_pi ON vencimientos(prestamo_inversion_id);
CREATE INDEX idx_vencimientos_fecha ON vencimientos(fecha_vencimiento);
CREATE INDEX idx_vencimientos_estado ON vencimientos(estado);

PRAGMA foreign_keys = ON;
