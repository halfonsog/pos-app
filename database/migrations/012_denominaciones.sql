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
  (2000, 0, 3),
  (1000, 1, 4),
  (500, 1, 5),
  (200, 1, 6),
  (100, 1, 7),
  (50, 1, 8),
  (20, 1, 9),
  (10, 1, 10),
  (5, 1, 11),
  (3, 0, 12),
  (1, 0, 13);