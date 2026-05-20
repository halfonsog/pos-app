-- Configuración y Catálogos
CREATE TABLE IF NOT EXISTS terminos_pago (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    dias INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS unidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    abreviatura TEXT NOT NULL,
    tipo TEXT CHECK(tipo IN ('venta', 'compra', 'ambas'))
);

CREATE TABLE IF NOT EXISTS tipos_gasto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    porcentaje_default REAL
);

-- Entidades Principales
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    rol TEXT CHECK(rol IN ('admin', 'vendedor')) DEFAULT 'vendedor',
    activo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    id_fiscal TEXT,
    direccion TEXT,
    telefono TEXT,
    termino_pago_id INTEGER,
    activo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (termino_pago_id) REFERENCES terminos_pago(id)
);

CREATE TABLE IF NOT EXISTS proveedor_contactos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    cargo TEXT,
    telefono_movil TEXT,
    email TEXT,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);

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
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (unidad_venta_id) REFERENCES unidades(id),
    FOREIGN KEY (unidad_compra_id) REFERENCES unidades(id)
);

CREATE TABLE IF NOT EXISTS recetas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_padre_id INTEGER NOT NULL,
    producto_hijo_id INTEGER NOT NULL,
    cantidad REAL NOT NULL,
    FOREIGN KEY (producto_padre_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_hijo_id) REFERENCES productos(id),
    UNIQUE(producto_padre_id, producto_hijo_id)
);

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

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

CREATE TABLE IF NOT EXISTS movimientos_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL,
    tipo TEXT CHECK(tipo IN ('compra', 'venta', 'preparacion_entrada', 'preparacion_salida', 'merma', 'ajuste')),
    cantidad REAL NOT NULL,
    referencia_id INTEGER,
    usuario_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Índices para rendimiento
CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_compras_proveedor ON compras(proveedor_id);
CREATE INDEX idx_movimientos_producto ON movimientos_stock(producto_id);