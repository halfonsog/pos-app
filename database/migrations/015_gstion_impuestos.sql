-- =====================================================
-- MIGRACIÓN: 015_gestion_impuestos.sql
-- DESCRIPCIÓN: Agrega tablas para gestión de impuestos cubanos
-- FECHA: 2026-06-03
-- =====================================================

-- 1. Extender configuracion_general
ALTER TABLE configuracion_general ADD COLUMN salario_minimo REAL DEFAULT 3260;
ALTER TABLE configuracion_general ADD COLUMN base_contribucion_especial REAL DEFAULT 0;
ALTER TABLE configuracion_general ADD COLUMN limite_escala_retencion REAL DEFAULT 15000;

-- 2. Tabla: tributos (catálogo de impuestos)
CREATE TABLE IF NOT EXISTS "tributos" (
	"id"	INTEGER,
	"codigo"	TEXT NOT NULL UNIQUE,
	"nombre"	TEXT NOT NULL,
	"descripcion"	TEXT,
	"periodo"	TEXT NOT NULL CHECK("periodo" IN ('mensual', 'trimestral', 'anual', 'puntual')),
	"tipo_calculo"	TEXT NOT NULL CHECK("tipo_calculo" IN ('porcentaje_ventas', 'porcentaje_ingreso', 'escala_salario', 'fija', 'formula_libre')),
	"expresion_formula"	TEXT,
	"dias_limite_pago"	INTEGER DEFAULT 15,
	"activo"	BOOLEAN DEFAULT 1,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME,
	PRIMARY KEY("id" AUTOINCREMENT)
);

-- 3. Tabla: configuracion_tributos (parámetros por tributo)
CREATE TABLE IF NOT EXISTS "configuracion_tributos" (
	"id"	INTEGER,
	"tributo_id"	INTEGER NOT NULL,
	"tasa"	REAL,
	"valor_fijo"	REAL,
	"escala_json"	TEXT,
	"base_calculo"	TEXT,
	"activo"	BOOLEAN DEFAULT 1,
	"vigencia_desde"	DATE,
	"vigencia_hasta"	DATE,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("tributo_id") REFERENCES "tributos"("id") ON DELETE CASCADE
);

-- 4. Tabla: empleados (con enlace a usuarios)
CREATE TABLE IF NOT EXISTS "empleados" (
	"id"	INTEGER,
	"usuario_id"	INTEGER UNIQUE,
	"nombre"	TEXT NOT NULL,
	"identificacion"	TEXT UNIQUE,
	"cargo"	TEXT DEFAULT 'vendedor' CHECK("cargo" IN ('vendedor', 'administrador', 'cajero', 'otro')),
	"salario_mensual"	REAL NOT NULL,
	"aporte_corto_plazo"	REAL DEFAULT 0,
	"utilidades"	REAL DEFAULT 0,
	"activo"	BOOLEAN DEFAULT 1,
	"fecha_ingreso"	DATE,
	"fecha_salida"	DATE,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL
);

-- 5. Tabla: tributos_empleados (relación muchos a muchos opcional)
CREATE TABLE IF NOT EXISTS "tributos_empleados" (
	"id"	INTEGER,
	"tributo_id"	INTEGER NOT NULL,
	"empleado_id"	INTEGER NOT NULL,
	"aplica"	BOOLEAN DEFAULT 1,
	"tasa_personalizada"	REAL,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("tributo_id") REFERENCES "tributos"("id") ON DELETE CASCADE,
	FOREIGN KEY("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE,
	UNIQUE("tributo_id", "empleado_id")
);

-- 6. Tabla: periodos_fiscales
CREATE TABLE IF NOT EXISTS "periodos_fiscales" (
	"id"	INTEGER,
	"tipo_periodo"	TEXT NOT NULL CHECK("tipo_periodo" IN ('mensual', 'trimestral', 'anual')),
	"anio"	INTEGER NOT NULL,
	"mes"	INTEGER,
	"trimestre"	INTEGER,
	"fecha_inicio"	DATE NOT NULL,
	"fecha_fin"	DATE NOT NULL,
	"fecha_limite_pago"	DATE,
	"cerrado"	BOOLEAN DEFAULT 0,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT),
	UNIQUE("tipo_periodo", "anio", "mes", "trimestre")
);

-- 7. Tabla: liquidaciones_tributos
CREATE TABLE IF NOT EXISTS "liquidaciones_tributos" (
	"id"	INTEGER,
	"tributo_id"	INTEGER NOT NULL,
	"periodo_fiscal_id"	INTEGER NOT NULL,
	"base_calculo"	REAL NOT NULL,
	"monto_calculado"	REAL NOT NULL,
	"monto_pagado"	REAL DEFAULT 0,
	"fecha_pago"	DATE,
	"comprobante_pago"	TEXT,
	"estado"	TEXT DEFAULT 'pendiente' CHECK("estado" IN ('pendiente', 'pagado', 'parcial', 'exento')),
	"observaciones"	TEXT,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("tributo_id") REFERENCES "tributos"("id"),
	FOREIGN KEY("periodo_fiscal_id") REFERENCES "periodos_fiscales"("id")
);

-- 8. Tabla: configuracion_tributos_historial (auditoría)
CREATE TABLE IF NOT EXISTS "configuracion_tributos_historial" (
	"id"	INTEGER,
	"configuracion_tributo_id"	INTEGER NOT NULL,
	"tasa_anterior"	REAL,
	"tasa_nueva"	REAL,
	"fecha_cambio"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"usuario_id"	INTEGER,
	"motivo"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("configuracion_tributo_id") REFERENCES "configuracion_tributos"("id"),
	FOREIGN KEY("usuario_id") REFERENCES "usuarios"("id")
);

-- =====================================================
-- DATOS INICIALES (Tributos cubanos)
-- =====================================================
INSERT INTO "tributos" ("codigo", "nombre", "descripcion", "periodo", "tipo_calculo", "expresion_formula", "dias_limite_pago") VALUES
('0114022', 'Impuesto sobre ventas y servicios', '10% sobre total de ventas', 'mensual', 'porcentaje_ventas', 'tv * 0.10', 15),
('0510122', 'Impuesto sobre ingresos personales', '(tv - sm) * 5%', 'mensual', 'formula_libre', '(tv - sm) * 0.05', 15),
('0810132', 'Contribución a la seguridad social (TCP)', '1.5%*at + 12.5%*st', 'mensual', 'formula_libre', '(at * 0.015) + (st * 0.125)', 15),
('0820232', 'Retención a trabajadores para seguridad social', '[5% hasta 15000, 10%] * (st+ut)', 'mensual', 'escala_salario', NULL, 15),
('0520522', 'Retención TCP a ingresos de empleados', '[3% ~ 20%] * st', 'mensual', 'escala_salario', NULL, 15),
('0610322', 'Impuesto por utilización de fuerza de trabajo', '5% del total remuneraciones empleados', 'trimestral', 'porcentaje_ingreso', 'total_remuneraciones * 0.05', 20),
('0820132', 'Contribución especial TCP a seguridad social', '20% de base contribución', 'trimestral', 'porcentaje_ingreso', 'base_contribucion * 0.20', 20),
('0530222', 'Liquidación adicional anual (Declaración Jurada)', 'Ganancia neta * 35% (menos 5% si paga antes)', 'anual', 'formula_libre', 'ganancia_neta * 0.35', 60),
('0730122', 'Impuesto sobre documentos', 'Según tipo de documento', 'puntual', 'fija', NULL, 0);

-- Configuración inicial de tasas
INSERT INTO "configuracion_tributos" ("tributo_id", "tasa", "base_calculo", "vigencia_desde") 
SELECT id, 
       CASE codigo 
           WHEN '0114022' THEN 0.10 
           WHEN '0510122' THEN 0.05 
           WHEN '0610322' THEN 0.05 
           WHEN '0820132' THEN 0.20 
           WHEN '0530222' THEN 0.35 
       END,
       CASE codigo 
           WHEN '0114022' THEN 'total_ventas'
           WHEN '0510122' THEN 'excedente_sm'
           WHEN '0610322' THEN 'total_remuneraciones'
           WHEN '0820132' THEN 'base_contribucion'
       END,
       '2026-01-01'
FROM tributos 
WHERE codigo IN ('0114022', '0510122', '0610322', '0820132', '0530222');

-- Escala para retención 0820232
UPDATE configuracion_tributos 
SET escala_json = '[{"desde":0,"hasta":15000,"porcentaje":5},{"desde":15000.01,"hasta":null,"porcentaje":10}]'
WHERE tributo_id = (SELECT id FROM tributos WHERE codigo = '0820232');

-- Escala para retención 0520522 (ejemplo básico, se ajustará después)
UPDATE configuracion_tributos 
SET escala_json = '[{"desde":0,"hasta":15000,"porcentaje":3},{"desde":15000.01,"hasta":30000,"porcentaje":10},{"desde":30000.01,"hasta":null,"porcentaje":20}]'
WHERE tributo_id = (SELECT id FROM tributos WHERE codigo = '0520522');

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================