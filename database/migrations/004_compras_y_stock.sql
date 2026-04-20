-- ============================================
-- Compras y Movimientos de Stock
-- ============================================

-- Compras
CREATE TABLE IF NOT EXISTS compras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor_id INTEGER NOT NULL,
    fecha_compra DATE NOT NULL,
    codigo_factura TEXT,
    total REAL NOT NULL,
    pagado REAL DEFAULT 0,
    estado_pago TEXT CHECK(estado_pago IN ('pendiente', 'parcial', 'pagado')) DEFAULT 'pendiente',
    estado_inventario TEXT CHECK(estado_inventario IN ('pendiente', 'completado')) DEFAULT 'pendiente',
    usuario_id INTEGER NOT NULL,
    observaciones TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Detalles de compra
CREATE TABLE IF NOT EXISTS compra_detalles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    compra_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad REAL NOT NULL,
    precio_unitario REAL NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Movimientos de stock
CREATE TABLE IF NOT EXISTS movimientos_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL,
    tipo TEXT CHECK(tipo IN ('compra', 'venta', 'preparacion_entrada', 'preparacion_salida', 'merma', 'ajuste')) NOT NULL,
    cantidad REAL NOT NULL,
    referencia_id INTEGER,
    usuario_id INTEGER NOT NULL,
    observaciones TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Índices
CREATE INDEX idx_compras_proveedor ON compras(proveedor_id);
CREATE INDEX idx_compras_fecha ON compras(fecha_compra);
CREATE INDEX idx_compras_estado_pago ON compras(estado_pago);
CREATE INDEX idx_compra_detalles_compra ON compra_detalles(compra_id);
CREATE INDEX idx_compra_detalles_producto ON compra_detalles(producto_id);
CREATE INDEX idx_movimientos_producto ON movimientos_stock(producto_id);
CREATE INDEX idx_movimientos_tipo ON movimientos_stock(tipo);
CREATE INDEX idx_movimientos_fecha ON movimientos_stock(created_at);