-- ============================================
-- Datos de prueba para desarrollo
-- ============================================

-- Términos de pago
INSERT INTO terminos_pago (nombre, dias) VALUES 
    ('Contado', 0),
    ('7 días', 7),
    ('15 días', 15),
    ('30 días', 30),
    ('45 días', 45);

-- Categorías
INSERT INTO categorias (nombre, descripcion) VALUES 
    ('Bebidas', 'Jugos, refrescos, aguas'),
    ('Frescos', 'Frutas, verduras, pulpas'),
    ('Elaborados', 'reposteria, cocinados, sandwishes'),
    ('Secos', 'granos, deshidratados'),
    ('Congelados', 'Alimentos congelados'),
    ('Especias', 'sal, vinagre, especias'),
    ('Insumos', 'Materias primas y suministros'),
    ('Empaques', 'Vasos, bolsas, envolturas');

-- Tipos de gasto
INSERT INTO tipos_gasto (nombre, descripcion, porcentaje_default) VALUES 
    ('Impuesto sobre venta', 'Impuesto directo sobre todas las ventas', 15.0),
    ('Margen mínimo', 'Margen de beneficio proyectado', 20.0),
    ('Gastos fijos', 'Electricidad, agua, alquiler', 15.0),
    ('Merma', 'Pérdida estimada por deterioro', 5.0);

-- Usuarios (contraseñas se hashean después)
INSERT INTO usuarios (username, password_hash, nombre_completo, rol) VALUES 
    ('admin', 'temp_hash_admin', 'Administrador del Sistema', 'admin'),
    ('vendedor', 'temp_hash_vendedor', 'Juan Pérez', 'vendedor');

-- Proveedores
INSERT INTO proveedores (nombre, id_fiscal, direccion, telefono, termino_pago_id) VALUES 
    ('PDL Finca La Suiza', 'J-12345678-9', 'Carretera a Ceballo 12 km 1-1/2', '+53 212 555-1234', 3),
    ('Controlpack Caribe S.A.', 'G-87654321-0', 'Zona Libra Mariel, Galpón 7', '+53 241 555-5678', 2),
    ('Aguas de Ciego', 'J-99887766-1', 'Av. Principal #123, Ciego de Ávila', '+53 414 123-4567', 1);

-- Contactos de proveedores
INSERT INTO proveedor_contactos (proveedor_id, nombre, cargo, telefono_movil, email) VALUES 
    (1, 'Pablo Alfonso', 'Director General', '+53 412 555-1111', 'crodriguez@economica.com'),
    (1, 'Heriberto Alfonso', 'Director Económico', '+53 412 555-2222', 'amartinez@economica.com'),
    (2, 'Luis Fernández', 'Representante comercial', '+53 414 555-3333', 'lfernandez@empaques.com'),
    (3, 'Pedro Ramírez', 'Propietario', '+53 416 555-4444', 'pramirez@frutas.com');

-- Unidades de medida de usuasio. Los IDs omienzan en 100
INSERT INTO unidades (tipo, nombre, abreviatura, coeficiente) VALUES
  ('unidad', 'Caja de frutas', 'caja', 45),
  ('unidad', 'Caja de bolsas', 'caja', 500),
  ('unidad', 'Caja de vasos', 'caja', 500),
  ('unidad', 'Rollo de nylon', 'rollo', 10000),
  ('unidad', 'Rollo de cinta de precios', 'rollo', 1000),
  ('unidad', 'Vaso 12oz', 'v12oz', 1);

-- ============================================
-- Productos Simples - A Granel
-- ============================================

-- Insumos líquidos (volumen) - unidad_venta=2 (l), unidad_compra=2 (l)
INSERT INTO productos (codigo, nombre, tipo, sub_tipo, categoria_id, unidad_venta_id, unidad_compra_id, precio_venta, stock_minimo, stock_actual) VALUES 
    ('INS001', 'Pulpa de Mango', 'simple', 'granel', 3, 2, 2, 0, 10, 0),
    ('INS002', 'Agua Tratada', 'simple', 'granel', 3, 2, 2, 0, 20, 0);

-- Insumos sólidos (peso) - unidad_venta=3 (lb), unidad_compra=10 (kg)
INSERT INTO productos (codigo, nombre, tipo, sub_tipo, categoria_id, unidad_venta_id, unidad_compra_id, precio_venta, stock_minimo, stock_actual) VALUES 
    ('INS003', 'Pulpa de Guayaba', 'simple', 'granel', 3, 3, 10, 0, 10, 0),
    ('INS004', 'Azúcar', 'simple', 'granel', 3, 3, 10, 0, 25, 0);

-- Frutas frescas (peso) - unidad_venta=3 (lb), unidad_compra=100 (caja)
INSERT INTO productos (codigo, nombre, tipo, sub_tipo, categoria_id, unidad_venta_id, unidad_compra_id, precio_venta, stock_minimo, stock_actual) VALUES 
    ('FRU001', 'Guayabas', 'simple', 'granel', 2, 3, 100, 0, 15, 0),
    ('FRU002', 'Mangos', 'simple', 'granel', 2, 3, 100, 0, 15, 0);

-- Empaques (unidad) - unidad_venta=1 (ud), unidad_compra=112 (caja)
INSERT INTO productos (codigo, nombre, tipo, sub_tipo, categoria_id, unidad_venta_id, unidad_compra_id, precio_venta, stock_minimo, stock_actual) VALUES 
    ('EMP001', 'Bolsa Plástica', 'simple', 'granel', 4, 1, 101, 0, 50, 0),
    ('EMP002', 'Vaso 12oz', 'simple', 'granel', 4, 1, 102, 0, 100, 0),
    ('EMP003', 'Cesta Pequeña', 'simple', 'granel', 4, 1, 1, 0, 10, 0);

-- Nylon (longitud) - unidad_venta=4 (m), unidad_compra=113 (rollo)
INSERT INTO productos (codigo, nombre, tipo, sub_tipo, categoria_id, unidad_venta_id, unidad_compra_id, precio_venta, stock_minimo, stock_actual) VALUES 
    ('EMP004', 'Nylon de Retractilar', 'simple', 'granel', 4, 4, 103, 0, 50, 0);

-- Etiqueta (unidad) - unidad_venta=1 (ud), unidad_compra=113 (rollo)
INSERT INTO productos (codigo, nombre, tipo, sub_tipo, categoria_id, unidad_venta_id, unidad_compra_id, precio_venta, stock_minimo, stock_actual) VALUES 
    ('EMP005', 'Etiqueta de Precio', 'simple', 'granel', 4, 1, 104, 0, 200, 0);
