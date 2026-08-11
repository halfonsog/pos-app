-- ============================================
-- 030 — Contabilidad nueva: porciento a declarar, nóminas y bonos
-- ============================================
-- porciento_declarar: % del total de ventas/compras que se declara al fisco (def 100).
-- dia_pago_bonos: día de la semana en que el negocio paga bonos (0=domingo..6=sábado).
-- nominas: salarios mensuales por empleado (se generan al cerrar el mes).
-- bonos: pagos semanales en efectivo por empleado (no se declaran como salarios).
-- ============================================

PRAGMA foreign_keys = OFF;

ALTER TABLE parametros_contables ADD COLUMN porciento_declarar REAL DEFAULT 100;
ALTER TABLE parametros_contables ADD COLUMN dia_pago_bonos INTEGER DEFAULT 5;

CREATE TABLE nominas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id),
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  salario_bruto REAL NOT NULL,
  estado TEXT CHECK(estado IN ('pendiente', 'pagada')) DEFAULT 'pendiente',
  fecha_pago_salario DATE,
  usuario_id INTEGER REFERENCES usuarios(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(empleado_id, anio, mes)
);

CREATE TABLE bonos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id),
  fecha DATE NOT NULL,
  monto REAL NOT NULL,
  usuario_id INTEGER REFERENCES usuarios(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nominas_periodo ON nominas(anio, mes);
CREATE INDEX idx_bonos_empleado ON bonos(empleado_id);
CREATE INDEX idx_bonos_fecha ON bonos(fecha);

PRAGMA foreign_keys = ON;
