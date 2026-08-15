-- 036 — Branding configurable (nombre de negocio y logo)
-- Permite personalizar la app por instalación: el nombre del negocio aparece en la
-- barra superior y el logo en el menú lateral. Se guardan en configuracion_contabilidad.

ALTER TABLE configuracion_contabilidad ADD COLUMN nombre_negocio TEXT DEFAULT 'PuntoX';
ALTER TABLE configuracion_contabilidad ADD COLUMN logo TEXT;