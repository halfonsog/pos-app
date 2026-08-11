
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

// Ruta de la BD: respeta DB_PATH (.env) si existe; si no, la ubicación por defecto.
// Las rutas relativas de DB_PATH se resuelven contra la raíz del proyecto.
const envPath = process.env.DB_PATH;
const dbPath = envPath
  ? (path.isAbsolute(envPath) ? envPath : path.resolve(__dirname, '../../../', envPath))
  : path.resolve(__dirname, '../../../database/database.db');

console.log('📁 Ruta absoluta de BD:', dbPath);

// Verificar que el archivo existe
if (!fs.existsSync(dbPath)) {
  console.error('❌ Archivo de BD no encontrado en:', dbPath);
  throw new Error(`Base de datos no encontrada: ${dbPath}`);
}

console.log('✅ Archivo de BD encontrado');

let db = null;

async function getDb() {
  if (!db) {
    console.log('🔌 Abriendo conexión a BD...');

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await db.run('PRAGMA foreign_keys = ON');
    console.log('✅ Base de datos conectada');

    // Verificar tablas disponibles
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('📋 Tablas en BD:', tables.map(t => t.name).join(', '));
  }
  return db;
}

module.exports = { getDb };