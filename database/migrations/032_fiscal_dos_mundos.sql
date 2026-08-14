-- 032 — Modelo fiscal de dos mundos (D30–D36): categorías gravables + servicios con factura
-- · categorias.gravable: 1 = entra al mundo declarado, 0 = exclusión fiscal (heredada por ancestría)
-- · categorias.es_sistema: 1 = no editable/eliminable (raíz "No gravable")
-- · Categoría raíz de sistema "No gravable" (gravable=0) creada por migración
-- · servicios.tiene_factura: el servicio solo entra a lo declarado si tiene factura (D33)
-- · Se elimina porciento_declarar (PD, m030) — deprecado y sustituido por el modelo de dos mundos

ALTER TABLE categorias ADD COLUMN gravable INTEGER DEFAULT 1 CHECK(gravable IN (0, 1));
ALTER TABLE categorias ADD COLUMN es_sistema INTEGER DEFAULT 0 CHECK(es_sistema IN (0, 1));

INSERT INTO categorias (nombre, descripcion, activo, gravable, es_sistema)
VALUES ('No gravable',
        'Categoría de sistema: los productos bajo ella (directos o en subcategorías hijas) no entran en la declaración fiscal. Compra/venta sin factura.',
        1, 0, 1);

ALTER TABLE servicios ADD COLUMN tiene_factura INTEGER DEFAULT 1 CHECK(tiene_factura IN (0, 1));

ALTER TABLE configuracion_contabilidad DROP COLUMN porciento_declarar;