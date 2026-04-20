/**
 * Middleware para manejo de errores
 */

const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);

  // Error de SQLite
  if (err.code && err.code.startsWith('SQLITE_')) {
    return res.status(400).json({
      error: 'Error de base de datos',
      details: err.message
    });
  }

  // Error genérico
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

module.exports = errorHandler;