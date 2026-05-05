-- Añadir campos para receta y fotos
ALTER TABLE productos ADD COLUMN descripcion_preparacion TEXT;
ALTER TABLE productos ADD COLUMN foto TEXT;
