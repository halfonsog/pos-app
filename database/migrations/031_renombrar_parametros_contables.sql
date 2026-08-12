-- 031 — Renombrar parametros_contables → configuracion_contabilidad (propietario, com.md #2a)
-- Evita confusión con el resto de parámetros. La tabla se consulta desde costeo, contabilidad,
-- ventas, mayoristas, reportes, dashboard y configuración (todas se actualizan en el mismo cambio).
ALTER TABLE parametros_contables RENAME TO configuracion_contabilidad;
