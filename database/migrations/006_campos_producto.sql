-- Añadir campos para receta y fotos
ALTER TABLE productos ADD COLUMN descripcion_preparacion TEXT;
ALTER TABLE productos ADD COLUMN foto TEXT;
ALTER TABLE productos ADD COLUMN updated_at DATETIME;

-- Actualizar registros existentes
UPDATE productos SET updated_at = created_at WHERE updated_at IS NULL;
