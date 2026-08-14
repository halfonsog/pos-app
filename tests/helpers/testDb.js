/**
 * Construye una base de datos de prueba temporal para los tests.
 *
 * - Crea un archivo SQLite nuevo en la ruta indicada.
 * - Aplica TODAS las migraciones de database/migrations/ en orden.
 * - Siembra los usuarios mínimos: admin/admin123 y vendedor/vendedor123.
 *
 * Uso: llamar ANTES de requerir la app (db.js exige que el archivo exista)
 * y con process.env.DB_PATH apuntando a la ruta indicada.
 */
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcrypt');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../database/migrations');

async function buildTestDb(dbPath) {
  // Empezar siempre de cero
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  await db.run('PRAGMA foreign_keys = ON');

  // Aplicar migraciones en orden alfabético (001, 002, ...)
  const archivos = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const archivo of archivos) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, archivo), 'utf8');
    await db.exec(sql);
  }

  // Sembrar empleados y usuarios de prueba (D18: todo usuario tiene empleado)
  await db.run(
    `INSERT INTO empleados (nombre, cargo, salario_mensual) VALUES
     ('Administrador Test', 'administrador', 0), ('Vendedor Test', 'vendedor', 0)`
  );

  // Categoría gravable por defecto para los tests (los productos se crean sin
  // categoría en muchos tests; se asignan a esta para pasar la validación).
  await db.run(
    "INSERT INTO categorias (nombre, activo, gravable, es_sistema) VALUES ('Ventas test', 1, 1, 0)"
  );

  const adminHash = bcrypt.hashSync('admin123', 10);
  const vendedorHash = bcrypt.hashSync('vendedor123', 10);

  await db.run(
    `INSERT INTO usuarios (username, password_hash, nombre_completo, rol, activo, empleado_id)
     VALUES (?, ?, ?, 'admin', 1, 1), (?, ?, ?, 'vendedor', 1, 2)`,
    ['admin', adminHash, 'Administrador Test',
     'vendedor', vendedorHash, 'Vendedor Test']
  );

  await db.close();
  return dbPath;
}

module.exports = { buildTestDb };
