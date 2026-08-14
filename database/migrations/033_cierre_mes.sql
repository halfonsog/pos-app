-- 033 — Cierre de mes persistido + aplicación del excedente a vencimientos (00-pendientes #2)
-- · cierres_mes: ficha de cierre por período (desglose por prioridades del mundo gravable)
-- · cierre_mes_aplicaciones: trazabilidad de cómo se aplicó el excedente a cada vencimiento

PRAGMA foreign_keys = OFF;

CREATE TABLE cierres_mes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mes INTEGER NOT NULL,
  anio INTEGER NOT NULL,
  recaudado REAL NOT NULL,
  venta_neta REAL NOT NULL,
  impuestos REAL NOT NULL,
  costo_base REAL NOT NULL,
  gastos_fijos_equiv REAL NOT NULL,
  prestamos_equiv REAL NOT NULL,
  inversiones_equiv REAL NOT NULL,
  margen REAL NOT NULL,
  ganancias REAL NOT NULL,
  excedente REAL NOT NULL,
  destino TEXT CHECK(destino IN ('inversiones', 'prestamos', 'ganancias')) NOT NULL,
  excedente_aplicado REAL NOT NULL DEFAULT 0,
  usuario_id INTEGER REFERENCES usuarios(id),
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(mes, anio)
);

CREATE TABLE cierre_mes_aplicaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cierre_mes_id INTEGER NOT NULL REFERENCES cierres_mes(id) ON DELETE CASCADE,
  registro_id INTEGER NOT NULL REFERENCES prestamos_inversiones(id),
  vencimiento_id INTEGER REFERENCES vencimientos(id),
  tipo_registro TEXT CHECK(tipo_registro IN ('inversion', 'prestamo')),
  monto_aplicado REAL NOT NULL,
  descripcion TEXT,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cierres_mes_periodo ON cierres_mes(mes, anio);
CREATE INDEX idx_cierre_apl_cierre ON cierre_mes_aplicaciones(cierre_mes_id);

PRAGMA foreign_keys = ON;