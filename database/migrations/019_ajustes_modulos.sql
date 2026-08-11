-- ============================================
-- 019 — Ajustes de módulos (comentarios del propietario 2026-08-06)
-- ============================================
-- 1. proveedores.contrato: número de contrato firmado con el proveedor (si existe)
-- 2. configuracion_general → parametros_contables (renombre)
-- 3. DROP producto_costos: costo_base y precio_recomendado ya viven en productos (m017);
--    margen, gastos_fijos e impuesto se toman de parametros_contables cuando se necesitan.
-- ============================================

PRAGMA foreign_keys = OFF;

ALTER TABLE proveedores ADD COLUMN contrato TEXT;

ALTER TABLE configuracion_general RENAME TO parametros_contables;

DROP TABLE producto_costos;

PRAGMA foreign_keys = ON;
