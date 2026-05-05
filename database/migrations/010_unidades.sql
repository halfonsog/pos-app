-- Eliminar tabla antigua si existe
DROP TABLE IF EXISTS unidades;

-- Crear nueva tabla
CREATE TABLE unidades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT CHECK(tipo IN ('unidad', 'volumen', 'peso', 'longitud')) NOT NULL,
  nombre TEXT NOT NULL,
  abreviatura TEXT NOT NULL,
  coeficiente REAL NOT NULL DEFAULT 1,
  es_base BOOLEAN DEFAULT 0,
  activo BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insertar unidades base con IDs fijos (1-4)
INSERT INTO unidades (id, tipo, nombre, abreviatura, coeficiente, es_base) VALUES
  (1, 'unidad', 'Unidad', 'ud', 1, 1),
  (2, 'volumen', 'Litros', 'l', 1, 1),
  (3, 'peso', 'Libras', 'lb', 1, 1),
  (4, 'longitud', 'Metro', 'm', 1, 1);

-- Insertar unidades comunes
INSERT INTO unidades (id, tipo, nombre, abreviatura, coeficiente) VALUES
  (10,'peso', 'Kilogramos', 'kg', 2.2),
  (11,'peso', 'Arroba', '@', 25),
  (12,'peso', 'Quintal', 'q', 100),
  (13,'peso', 'Onza', 'oz', 0.0625),
  (14,'volumen', 'Onza fluida', 'fl-oz', 0.0296),
  (15,'volumen', 'Galón', 'gal', 3.785),
  (16,'volumen', 'Mililitro', 'ml', 0.001),
  (17,'longitud', 'Pulgada', 'in', 0.0254),
  (18,'longitud', 'Centímetro', 'cm', 0.01),
  (19,'longitud', 'Braza', 'braza', 1.83);

  -- Insertar unidades comunes
INSERT INTO unidades (tipo, nombre, abreviatura, coeficiente) VALUES
  ('unidad', 'Mazo', 'mazo', 1),
  ('unidad', 'Paquete', 'pq', 1);

-- Forzar que el siguiente ID sea 100
-- INSERT INTO sqlite_sequence (name, seq) VALUES ('unidades', 99);
UPDATE sqlite_sequence SET seq = 99 WHERE name = 'unidades';
