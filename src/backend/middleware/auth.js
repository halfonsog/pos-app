const jwt = require('jsonwebtoken');

// Secreto ÚNICO para firmar y verificar tokens (firma y verificación deben usar el mismo).
// En producción debe venir de JWT_SECRET en .env (cadena larga y aleatoria).
const JWT_SECRET = process.env.JWT_SECRET || 'pos3_secreto_desarrollo_no_usar_en_produccion';

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Exige que el usuario autenticado tenga uno de los roles indicados.
// Usar DESPUÉS de authMiddleware. Respuesta 403 (autenticado pero sin permiso).
const requireRole = (...roles) => (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  if (!roles.includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'No tiene permisos para realizar esta acción' });
  }
  next();
};

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
module.exports.JWT_SECRET = JWT_SECRET;
