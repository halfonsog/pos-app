-- ============================================
-- 018 — Inventario: tipos de movimiento + subcategorías (D7, D8)
-- ============================================
-- D7: catálogo tipos_movimiento (sustituye al CHECK constraint perdido en m013).
--     Los filtros del frontend se alimentan de esta tabla.
-- D8: categorias.padre_id → subcategorías.
-- Normalización: los movimientos 'donacion' históricos pasan a 'donacion_salida'.
-- ============================================

PRAGMA foreign_keys = OFF;

-- 1. Catálogo de tipos de movimiento (D7)
CREATE TABLE tipos_movimiento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  signo TEXT CHECK(signo IN ('+', '-', '+-')) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT 1,
  orden INTEGER DEFAULT 0
);

INSERT INTO tipos_movimiento (codigo, nombre, signo, descripcion, orden) VALUES
  ('compra',              'Compra a proveedor',        '+',  'Entrada por compra inventariada', 1),
  ('venta',               'Venta',                     '-',  'Salida por venta', 2),
  ('devolucion',          'Devolución',                '+',  'Entrada por anulación de venta', 3),
  ('preparacion_entrada', 'Preparación (entrada)',     '+',  'Entrada de producto elaborado preparado', 4),
  ('preparacion_salida',  'Preparación (salida)',      '-',  'Consumo de ingredientes al preparar', 5),
  ('donacion_entrada',    'Donación recibida',         '+',  'Entrada por donación recibida', 6),
  ('donacion_salida',     'Donación entregada',        '-',  'Salida por donación entregada', 7),
  ('merma',               'Merma',                     '-',  'Salida por deterioro o pérdida', 8),
  ('autoconsumo',         'Autoconsumo',               '-',  'Salida por consumo interno', 9),
  ('intercambio_entrada', 'Intercambio (entrada)',     '+',  'Entrada por conversión reventa → granel (D6)', 10),
  ('intercambio_salida',  'Intercambio (salida)',      '-',  'Salida por conversión reventa → granel (D6)', 11),
  ('ajuste',              'Ajuste manual',             '+-', 'Ajuste libre de inventario (entrada o salida)', 12);

-- 2. Normalizar movimientos históricos: 'donacion' → 'donacion_salida'
UPDATE movimientos_stock SET tipo = 'donacion_salida' WHERE tipo = 'donacion';

-- 3. Subcategorías (D8)
ALTER TABLE categorias ADD COLUMN padre_id INTEGER REFERENCES categorias(id);
CREATE INDEX idx_categorias_padre ON categorias(padre_id);

PRAGMA foreign_keys = ON;
