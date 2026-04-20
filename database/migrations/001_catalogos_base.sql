-- ============================================
-- Catálogos Base (Tablas sin dependencias)
-- ============================================

-- Términos de pago
CREATE TABLE IF NOT EXISTS terminos_pago (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    dias INTEGER NOT NULL DEFAULT 0,
    activo BOOLEAN DEFAULT 1
);

-- Unidades de medida
CREATE TABLE IF NOT EXISTS unidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    abreviatura TEXT NOT NULL,
    tipo TEXT CHECK(tipo IN ('venta', 'compra', 'ambas')),
    activo BOOLEAN DEFAULT 1
);

-- Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tipos de gasto
CREATE TABLE IF NOT EXISTS tipos_gasto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    porcentaje_default REAL,
    activo BOOLEAN DEFAULT 1
);

-- Índices
CREATE INDEX idx_unidades_tipo ON unidades(tipo);
CREATE INDEX idx_categorias_activo ON categorias(activo);