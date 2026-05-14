-- Tabla de denominaciones para conteo de efectivo
CREATE TABLE IF NOT EXISTS denominaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  valor REAL NOT NULL,
  activo BOOLEAN DEFAULT 1,
  orden INTEGER DEFAULT 0
);

-- Insertar denominaciones por defecto
INSERT INTO denominaciones (valor, activo, orden) VALUES
  (10000, 0, 1),
  (5000, 0, 2),
  (1000, 1, 3),
  (500, 1, 4),
  (200, 1, 5),
  (100, 1, 6),
  (50, 1, 7),
  (20, 1, 8),
  (10, 1, 9),
  (5, 1, 10),
  (3, 0, 11),
  (1, 0, 12);