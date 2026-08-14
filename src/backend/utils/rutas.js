/**
 * rutas.js — Rutas de datos de la aplicación (BD y uploads).
 *
 * La app se puede distribuir instalada (ej. C:\Program Files\POS3) con los
 * ficheros fuente en solo lectura, y los DATOS en un directorio aparte
 * (ej. C:\ProgramData\POS3). Para ello:
 *   · DB_PATH  → ruta de la base de datos (variable de entorno / .env)
 *   · UPLOADS_DIR → carpeta de fotos de productos (variable de entorno / .env)
 *
 * En desarrollo (sin variables), se usa la ruta tradicional dentro del proyecto.
 */
const path = require('path');
const fs = require('fs');

// Ruta raíz del proyecto (sube desde utils/)
const ROOT = path.resolve(__dirname, '../../..');

// Base de datos: respeta DB_PATH si viene (absoluta) o se resuelve contra la raíz.
function getDbPath() {
  const env = process.env.DB_PATH;
  if (env) return path.isAbsolute(env) ? env : path.resolve(ROOT, env);
  return path.join(ROOT, 'database', 'database.db');
}

// Uploads (fotos de productos): respeta UPLOADS_DIR si viene; si no, la ruta clásica.
function getUploadsDir() {
  if (process.env.UPLOADS_DIR) return path.resolve(process.env.UPLOADS_DIR);
  return path.join(ROOT, 'src', 'frontend', 'uploads', 'productos');
}

// Asegura que el directorio de uploads exista.
function asegurarUploadsDir() {
  const dir = getUploadsDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = { getDbPath, getUploadsDir, asegurarUploadsDir, ROOT };
