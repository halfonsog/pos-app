-- ============================================
-- Datos iniciales para producción
-- Sin datos de prueba, solo catálogos básicos
-- ============================================

-- Términos de pago
INSERT INTO terminos_pago (nombre, dias) VALUES 
    ('Contado', 0),
    ('7 días', 7),
    ('15 días', 15),
    ('30 días', 30),
    ('45 días', 45);

-- Categorías básicas
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
    ('Impuesto sobre venta', 'IVA/IGIC', 7.0),
    ('Margen mínimo', 'Margen de beneficio proyectado', 30.0),
    ('Gastos fijos', 'Electricidad, agua, alquiler', 15.0),
    ('Merma', 'Pérdida estimada por deterioro', 5.0);

-- Empleado del propietario (todo usuario pertenece a un empleado — D18)
INSERT INTO empleados (nombre, cargo, salario_mensual) VALUES ('Administrador', 'administrador', 0);

-- Usuario administrador (contraseña se hashea después: admin123)
INSERT INTO usuarios (username, password_hash, nombre_completo, rol, empleado_id) VALUES 
    ('admin', 'temp_hash_admin', 'Administrador', 'admin', 1);

--Especial para Jas --------------------------------------------------------------------
-- Proveedores
INSERT INTO proveedores (nombre, id_fiscal, direccion, telefono, termino_pago_id) VALUES 
    ('PDL Finca La Suiza', 'J-12345678-9', 'Carretera a Ceballo 12 km 1-1/2', '+53 212 555-1234', 3),
    ('Controlpack Caribe S.A.', 'G-87654321-0', 'Zona Libra Mariel, Galpón 7', '+53 241 555-5678', 2);

-- Contactos de proveedores
INSERT INTO proveedor_contactos (proveedor_id, nombre, cargo, telefono_movil, email) VALUES 
    (1, 'Pablo Alfonso', 'Director General', '+53 412 555-1111', 'crodriguez@economica.com'),
    (1, 'Heriberto Alfonso', 'Director Económico', '+53 412 555-2222', 'amartinez@economica.com');

-- Unidades de medida de usuasio. Los IDs omienzan en 100
INSERT INTO unidades (tipo, nombre, abreviatura, coeficiente) VALUES
  ('peso', 'Caja de frutas', 'caja', 45),
  ('unidad', 'Caja de vasos', 'caja', 1000),
  ('unidad', 'Rollo de nylon', 'rollo', 10000),
  ('unidad', 'Rollo de cinta de precios', 'rollo', 1000),
  ('unidad', 'Vaso 12oz', 'v12oz', 1);