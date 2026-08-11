-- ============================================
-- 026 — Quitar tasa_cambio_usd de parametros_contables (propietario)
-- ============================================
-- La tasa cambia a diario: NO hay tasa general. Cada operación lleva la tasa
-- acordada en ese momento; el equivalente total se calcula con la última tasa usada.
-- ============================================

ALTER TABLE parametros_contables DROP COLUMN tasa_cambio_usd;
