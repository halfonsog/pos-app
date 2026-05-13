-- Añadir campo de ajuste por redondeo a ventas
ALTER TABLE ventas ADD COLUMN ajuste_redondeo REAL DEFAULT 0;

-- Añadir campo de redondeo a configuración general
ALTER TABLE configuracion_general ADD COLUMN redondeo_venta REAL DEFAULT 5;