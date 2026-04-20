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

-- Unidades de medida
INSERT INTO unidades (nombre, abreviatura, tipo) VALUES 
    ('Unidad', 'ud', 'ambas'),
    ('Kilogramo', 'kg', 'ambas'),
    ('Litro', 'L', 'ambas'),
    ('Gramo', 'g', 'ambas'),
    ('Mililitro', 'ml', 'ambas'),
    ('Saco 25kg', 'sac25', 'compra'),
    ('Caja 12 unidades', 'cj12', 'compra'),
    ('Bidón 20L', 'bid20', 'compra'),
    ('Vaso 12oz', 'v12oz', 'venta'),
    ('Vaso 16oz', 'v16oz', 'venta'),
    ('Paquete', 'pq', 'venta');

-- Categorías
INSERT INTO categorias (nombre, descripcion) VALUES 
    ('Bebidas Frías', 'Jugos, refrescos, aguas'),
    ('Bebidas Calientes', 'Café, té, chocolate'),
    ('Alimentos', 'Comidas preparadas'),
    ('Insumos', 'Materias primas y suministros'),
    ('Frutas y Verduras', 'Productos frescos'),
    ('Lácteos', 'Leche, queso, yogurt'),
    ('Empaques', 'Vasos, bolsas, envolturas');

-- Tipos de gasto
INSERT INTO tipos_gasto (nombre, descripcion, porcentaje_default) VALUES 
    ('Impuesto sobre venta', 'IVA/IGIC', 7.0),
    ('Margen mínimo', 'Margen de beneficio proyectado', 30.0),
    ('Gastos fijos', 'Electricidad, agua, alquiler', 15.0),
    ('Merma', 'Pérdida estimada por deterioro', 5.0);

-- Usuarios (contraseñas se hashean después)
INSERT INTO usuarios (username, password_hash, nombre_completo, rol) VALUES 
    ('admin', 'temp_hash_admin', 'Administrador del Sistema', 'admin'),
    ('vendedor', 'temp_hash_vendedor', 'Juan Pérez', 'vendedor'),
    ('maria', 'temp_hash_maria', 'María González', 'vendedor');

-- Proveedores de ejemplo
INSERT INTO proveedores (nombre, id_fiscal, direccion, telefono, termino_pago_id) VALUES 
    ('Distribuidora El Sol', 'J-12345678-9', 'Av. Principal #123, Ciudad', '+58 212 555-1234', 3),
    ('Lácteos del Valle', 'G-87654321-0', 'Calle Comercio #45, Valencia', '+58 241 555-5678', 2),
    ('Importadora La Ganga', 'V-11223344-5', 'Zona Industrial, Galpón 7', '+58 212 555-9012', 1),
    ('Frutas y Verduras Selectas', 'J-99887766-1', 'Mercado Mayorista, Nave C', '+58 414 123-4567', 1);

-- Contactos de proveedores
INSERT INTO proveedor_contactos (proveedor_id, nombre, cargo, telefono_movil, email) VALUES 
    (1, 'Carlos Rodríguez', 'Gerente de Ventas', '+58 412 555-1111', 'crodriguez@elsol.com'),
    (1, 'Ana Martínez', 'Asistente', '+58 412 555-2222', 'amartinez@elsol.com'),
    (2, 'Luis Fernández', 'Propietario', '+58 414 555-3333', 'lfernandez@lacteos.com'),
    (3, 'Pedro Ramírez', 'Representante', '+58 416 555-4444', 'pramirez@laganga.com');

-- Productos de ejemplo
INSERT INTO productos (codigo, nombre, tipo, sub_tipo, categoria_id, unidad_venta_id, unidad_compra_id, factor_conversion, precio_venta, stock_minimo, stock_actual) VALUES 
    -- Reventa
    ('PRD001', 'Vaso 12oz', 'simple', 'reventa', 7, 1, NULL, 1, 0.50, 100, 500),
    ('PRD002', 'Tapa para vaso 12oz', 'simple', 'reventa', 7, 1, NULL, 1, 0.10, 100, 500),
    ('PRD003', 'Pitillo', 'simple', 'reventa', 7, 1, NULL, 1, 0.05, 200, 1000),
    
    -- A granel
    ('PRD004', 'Azúcar', 'simple', 'granel', 4, 2, 6, 25, 45.00, 50, 150),
    ('PRD005', 'Pulpa de Mango', 'simple', 'granel', 4, 2, 6, 25, 120.00, 25, 75),
    ('PRD006', 'Leche en Polvo', 'simple', 'granel', 6, 2, 6, 25, 180.00, 20, 60),
    
    -- Compuestos
    ('PRD007', 'Jugo de Mango 12oz', 'compuesto', NULL, 1, 9, NULL, 1, 2.50, 20, 30),
    ('PRD008', 'Batido de Fresa 12oz', 'compuesto', NULL, 1, 9, NULL, 1, 3.00, 15, 25),
    ('PRD009', 'Café Americano 12oz', 'compuesto', NULL, 2, 9, NULL, 1, 1.80, 30, 50);

-- Recetas para productos compuestos
INSERT INTO recetas (producto_padre_id, producto_hijo_id, cantidad) VALUES 
    -- Jugo de Mango 12oz
    (7, 5, 0.150),  -- 150g de pulpa de mango
    (7, 4, 0.030),  -- 30g de azúcar
    (7, 1, 1),      -- 1 vaso 12oz
    (7, 2, 1),      -- 1 tapa
    (7, 3, 1),      -- 1 pitillo
    
    -- Batido de Fresa 12oz
    (8, 5, 0.100),  -- 100g de pulpa de fresa (usando mango como ejemplo)
    (8, 6, 0.050),  -- 50g de leche en polvo
    (8, 4, 0.020),  -- 20g de azúcar
    (8, 1, 1),      -- 1 vaso 12oz
    (8, 2, 1),      -- 1 tapa
    (8, 3, 1);     -- 1 pitillo

-- Compras de ejemplo
INSERT INTO compras (proveedor_id, fecha_compra, codigo_factura, total, pagado, estado_pago, estado_inventario, usuario_id) VALUES 
    (1, date('now', '-30 days'), 'FAC-001-2024', 1250.00, 1250.00, 'pagado', 'completado', 1),
    (2, date('now', '-15 days'), 'FAC-045-2024', 850.50, 500.00, 'parcial', 'completado', 1),
    (1, date('now', '-7 days'), 'FAC-089-2024', 2300.00, 0, 'pendiente', 'pendiente', 1),
    (3, date('now', '-3 days'), 'FAC-112-2024', 450.75, 450.75, 'pagado', 'completado', 1);

-- Detalles de compras
INSERT INTO compra_detalles (compra_id, producto_id, cantidad, precio_unitario, total) VALUES 
    (1, 1, 1000, 0.35, 350.00),
    (1, 2, 1000, 0.07, 70.00),
    (1, 3, 2000, 0.03, 60.00),
    (1, 4, 5, 38.00, 190.00),
    (1, 5, 4, 110.00, 440.00),
    (1, 6, 2, 170.00, 340.00),
    
    (2, 4, 3, 40.00, 120.00),
    (2, 5, 3, 115.00, 345.00),
    (2, 6, 2, 175.00, 350.00),
    (2, 1, 500, 0.36, 180.00),
    
    (3, 1, 2000, 0.34, 680.00),
    (3, 2, 2000, 0.08, 160.00),
    (3, 3, 5000, 0.03, 150.00),
    (3, 4, 10, 39.00, 390.00),
    (3, 5, 8, 112.00, 896.00),
    
    (4, 1, 500, 0.35, 175.00),
    (4, 2, 500, 0.07, 35.00),
    (4, 3, 1000, 0.04, 40.00);

-- Movimientos de stock (se generan automáticamente al completar compras)
INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id, observaciones) VALUES 
    (1, 'compra', 1000, 1, 1, 'Compra FAC-001-2024'),
    (2, 'compra', 1000, 1, 1, 'Compra FAC-001-2024'),
    (3, 'compra', 2000, 1, 1, 'Compra FAC-001-2024'),
    (4, 'compra', 125, 1, 1, 'Compra FAC-001-2024'), -- 5 sacos x 25kg
    (5, 'compra', 100, 1, 1, 'Compra FAC-001-2024'), -- 4 sacos x 25kg
    (6, 'compra', 50, 1, 1, 'Compra FAC-001-2024');  -- 2 sacos x 25kg