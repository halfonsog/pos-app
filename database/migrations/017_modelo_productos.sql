-- ============================================
-- 017 — Modelo de productos (D1, D3, D19)
-- ============================================
-- D1: subtipos de compuesto: 'elaborado' (se prepara) / 'conformado' (se arma en la venta).
--     Desaparece el booleano requiere_preparacion.
-- D3: productos.costo_base (último costo) y productos.precio_recomendado persistidos.
--     Se rellenan desde producto_costos + fórmula de costeo absorbente.
-- D19: drop factor_conversion (vive en unidades.coeficiente), drop tipos_gasto (sin uso).
-- Índices para las consultas más frecuentes de ventas.
-- ============================================

PRAGMA foreign_keys = OFF;

-- 1. Recrear productos con el nuevo modelo
CREATE TABLE productos_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT CHECK(tipo IN ('simple', 'compuesto')) NOT NULL,
  sub_tipo TEXT CHECK(sub_tipo IN ('reventa', 'granel', 'elaborado', 'conformado')),
  categoria_id INTEGER,
  unidad_venta_id INTEGER NOT NULL,
  unidad_compra_id INTEGER,
  costo_base REAL DEFAULT 0,
  precio_recomendado REAL,
  precio_venta REAL NOT NULL DEFAULT 0,
  stock_minimo REAL DEFAULT 0,
  stock_actual REAL DEFAULT 0,
  activo BOOLEAN DEFAULT 1,
  descripcion_preparacion TEXT,
  foto TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  FOREIGN KEY (unidad_venta_id) REFERENCES unidades(id),
  FOREIGN KEY (unidad_compra_id) REFERENCES unidades(id)
);

-- Backfill: compuestos → elaborado/conformado según requiere_preparacion;
-- costo_base desde producto_costos. Se eliminan requiere_preparacion y factor_conversion.
INSERT INTO productos_new (id, codigo, nombre, tipo, sub_tipo, categoria_id, unidad_venta_id, unidad_compra_id,
                           costo_base, precio_venta, stock_minimo, stock_actual, activo,
                           descripcion_preparacion, foto, created_at, updated_at)
SELECT p.id, p.codigo, p.nombre, p.tipo,
       CASE
         WHEN p.tipo = 'compuesto' THEN CASE WHEN p.requiere_preparacion = 1 THEN 'elaborado' ELSE 'conformado' END
         ELSE p.sub_tipo
       END,
       p.categoria_id, p.unidad_venta_id, p.unidad_compra_id,
       COALESCE(pc.costo_base, 0),
       p.precio_venta, p.stock_minimo, p.stock_actual, p.activo,
       p.descripcion_preparacion, p.foto, p.created_at, p.updated_at
FROM productos p
LEFT JOIN producto_costos pc ON pc.producto_id = p.id;

DROP TABLE productos;
ALTER TABLE productos_new RENAME TO productos;

CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_tipo ON productos(tipo);
CREATE INDEX idx_productos_activo ON productos(activo);

-- 2. precio_recomendado inicial (costeo absorbente con margen_recomendado de configuración)
--    precio_base = costo_base / (1 - %gastos)   ·   recomendado = base × (1+margen) × (1+impuesto)
UPDATE productos
SET precio_recomendado = ROUND(
  (costo_base / (1.0 - COALESCE((
    SELECT CASE WHEN (cfg.ventas_proyectadas * (1 - cfg.impuesto_ventas/100.0 - cfg.margen_recomendado/100.0)) > 0
                THEN COALESCE((SELECT SUM(valor_mensual) FROM configuracion_gastos WHERE activo = 1), 0)
                     / (cfg.ventas_proyectadas * (1 - cfg.impuesto_ventas/100.0 - cfg.margen_recomendado/100.0))
                ELSE 0 END
    FROM configuracion_general cfg WHERE cfg.id = 1
  ), 0)))
  * (1 + (SELECT margen_recomendado / 100.0 FROM configuracion_general WHERE id = 1))
  * (1 + (SELECT impuesto_ventas / 100.0 FROM configuracion_general WHERE id = 1))
, 2)
WHERE costo_base > 0;

-- 3. Eliminar tabla muerta tipos_gasto (D19)
DROP TABLE tipos_gasto;

-- 4. Índices de las consultas más frecuentes (listados de ventas, detalles, turnos)
CREATE INDEX idx_ventas_created ON ventas(created_at);
CREATE INDEX idx_ventas_turno ON ventas(turno_id);
CREATE INDEX idx_venta_detalles_venta ON venta_detalles(venta_id);
CREATE INDEX idx_venta_detalles_producto ON venta_detalles(producto_id);

PRAGMA foreign_keys = ON;
