/**
 * Middleware para manejo de errores
 */

const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);

  // Errores HTTP explícitos (lanzados con err.status) pasan su mensaje al cliente
  if (err.status && err.expose !== false) {
    return res.status(err.status).json({ error: err.message });
  }

  // Error de SQLite: NO filtrar detalles internos al cliente (S7)
  if (err.code && err.code.startsWith('SQLITE_')) {
    return res.status(400).json({ error: 'Error de base de datos' });
  }

  // Error genérico: solo mensaje en desarrollo (S7)
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

module.exports = errorHandler;