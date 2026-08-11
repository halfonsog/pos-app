-- ============================================
-- 021 — Configuración de tributos faltante (vector fiscal del propietario, com.md)
-- ============================================
-- m015 solo creó configuracion_tributos para 5 de los 9 tributos.
-- Sin fila activa aquí, el motor nunca calcula: 0810132, 0820232, 0520522, 0730122.
-- Idempotente: solo inserta si no existe una fila para ese tributo.
-- ============================================

INSERT INTO configuracion_tributos (tributo_id, tasa, valor_fijo, escala_json, base_calculo, activo, vigencia_desde)
SELECT id, NULL, NULL, NULL, 'salarios', 1, '2026-01-01' FROM tributos
WHERE codigo = '0810132'
  AND NOT EXISTS (SELECT 1 FROM configuracion_tributos ct WHERE ct.tributo_id = tributos.id);

INSERT INTO configuracion_tributos (tributo_id, tasa, valor_fijo, escala_json, base_calculo, activo, vigencia_desde)
SELECT id, NULL, NULL, '[{"desde":0,"hasta":15000,"porcentaje":5},{"desde":15000.01,"hasta":null,"porcentaje":10}]', 'st_ut', 1, '2026-01-01' FROM tributos
WHERE codigo = '0820232'
  AND NOT EXISTS (SELECT 1 FROM configuracion_tributos ct WHERE ct.tributo_id = tributos.id);

INSERT INTO configuracion_tributos (tributo_id, tasa, valor_fijo, escala_json, base_calculo, activo, vigencia_desde)
SELECT id, NULL, NULL, '[{"desde":0,"hasta":null,"porcentaje":3}]', 'st', 1, '2026-01-01' FROM tributos
WHERE codigo = '0520522'
  AND NOT EXISTS (SELECT 1 FROM configuracion_tributos ct WHERE ct.tributo_id = tributos.id);

INSERT INTO configuracion_tributos (tributo_id, tasa, valor_fijo, escala_json, base_calculo, activo, vigencia_desde)
SELECT id, NULL, 30, NULL, 'documento', 1, '2026-01-01' FROM tributos
WHERE codigo = '0730122'
  AND NOT EXISTS (SELECT 1 FROM configuracion_tributos ct WHERE ct.tributo_id = tributos.id);
