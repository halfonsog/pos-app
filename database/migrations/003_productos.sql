-- ============================================
-- Productos
-- ============================================

CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    tipo TEXT CHECK(tipo IN ('simple', 'compuesto')) NOT NULL,
    sub_tipo TEXT CHECK(sub_tipo IN ('reventa', 'granel')),
    requiere_preparacion BOOLEAN DEFAULT 0,
    categoria_id INTEGER,
    unidad_venta_id INTEGER NOT NULL,
    unidad_compra_id INTEGER,
    precio_venta REAL NOT NULL DEFAULT 0,
    stock_minimo REAL DEFAULT 0,
    stock_actual REAL DEFAULT 0,
    activo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (unidad_venta_id) REFERENCES unidades(id),
    FOREIGN KEY (unidad_compra_id) REFERENCES unidades(id)
);

-- Recetas
CREATE TABLE IF NOT EXISTS recetas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_padre_id INTEGER NOT NULL,
    producto_hijo_id INTEGER NOT NULL,
    cantidad REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_padre_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_hijo_id) REFERENCES productos(id),
    UNIQUE(producto_padre_id, producto_hijo_id)
);

-- Índices
CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_tipo ON productos(tipo);
CREATE INDEX idx_productos_activo ON productos(activo);
CREATE INDEX idx_recetas_padre ON recetas(producto_padre_id);