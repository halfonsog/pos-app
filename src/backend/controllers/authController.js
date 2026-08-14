const { getDb } = require('../models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES = '24h';

// S6: lockout en memoria contra fuerza bruta (sin dependencias nuevas).
// Máximo MAX_INTENTOS fallos por usuario en la ventana; luego bloquea LOCKOUT_MS.
const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;   // 15 min
const LOCKOUT_MS = 15 * 60 * 1000;   // 15 min
const loginIntentos = new Map(); // username → { fallos, primeraFalla, bloqueadoHasta }

function registrarFallo(username) {
  const ahora = Date.now();
  const reg = loginIntentos.get(username) || { fallos: 0, primeraFalla: ahora, bloqueadoHasta: 0 };
  if (ahora - reg.primeraFalla > VENTANA_MS) {
    reg.fallos = 0;
    reg.primeraFalla = ahora;
  }
  reg.fallos += 1;
  if (reg.fallos >= MAX_INTENTOS) {
    reg.bloqueadoHasta = ahora + LOCKOUT_MS;
    reg.fallos = 0; // reinicia contador; el bloqueo gobierna
  }
  loginIntentos.set(username, reg);
}

function verificarBloqueo(username) {
  const reg = loginIntentos.get(username);
  if (!reg) return 0;
  const ahora = Date.now();
  if (reg.bloqueadoHasta > ahora) {
    return Math.ceil((reg.bloqueadoHasta - ahora) / 1000);
  }
  if (reg.bloqueadoHasta > 0 && reg.bloqueadoHasta <= ahora) {
    // bloqueo expirado → limpiar
    loginIntentos.delete(username);
  }
  return 0;
}

const authController = {

  // POST /api/auth/login
  login: async (req, res, next) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
      }

      // S6: si el usuario está bloqueado, rechazar antes de verificar credenciales
      const segRestantes = verificarBloqueo(username);
      if (segRestantes > 0) {
        const mins = Math.ceil(segRestantes / 60);
        return res.status(429).json({
          error: `Demasiados intentos fallidos. Intenta de nuevo en ${mins} minuto(s).`
        });
      }

      const db = await getDb();

      // Verificar si la tabla usuarios existe
      const tableCheck = await db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'"
      );

      if (!tableCheck) {
        console.error('❌ Tabla usuarios no existe');
        return res.status(500).json({ error: 'Error de configuración: Tabla usuarios no encontrada' });
      }

      const user = await db.get(
        'SELECT * FROM usuarios WHERE username = ? AND activo = 1',
        [username]
      );

      if (!user) {
        registrarFallo(username);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        registrarFallo(username);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Login correcto → limpiar intentos de este usuario
      loginIntentos.delete(username);

      // Actualizar last_login (verificar si la columna existe)
      try {
        await db.run(
          'UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
          [user.id]
        );
      } catch (updateError) {
        console.warn('⚠️ No se pudo actualizar last_login:', updateError.message);
        // Continuar sin actualizar last_login
      }

      // Generar token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          rol: user.rol
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
      );

      // No enviar el hash de la contraseña
      delete user.password_hash;

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          nombre_completo: user.nombre_completo,
          rol: user.rol
        }
      });

    } catch (error) {
      console.error('❌ Error en login:', error);
      next(error);
    }
  },

  // POST /api/auth/logout
  logout: async (req, res, next) => {
    res.json({ message: 'Logout exitoso' });
  },

  // GET /api/auth/verify
  verify: async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
      }

      const decoded = jwt.verify(token, JWT_SECRET);

      const db = await getDb();
      const user = await db.get(
        'SELECT id, username, nombre_completo, rol, activo FROM usuarios WHERE id = ?',
        [decoded.id]
      );

      if (!user || !user.activo) {
        return res.status(401).json({ error: 'Usuario inactivo o no encontrado' });
      }

      res.json({ user });

    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token inválido' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
      }
      next(error);
    }
  },

  cambiarPassword: async (req, res, next) => {
    try {
      const db = await getDb();
      const usuario_id = req.usuario?.id;
      const { actual, nueva } = req.body;

      const user = await db.get('SELECT password_hash FROM usuarios WHERE id = ?', [usuario_id]);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      const valida = await bcrypt.compare(actual, user.password_hash);
      if (!valida) return res.status(400).json({ error: 'Contraseña actual incorrecta' });

      const newHash = await bcrypt.hash(nueva, 10);
      await db.run('UPDATE usuarios SET password_hash = ? WHERE id = ?', [newHash, usuario_id]);

      res.json({ message: 'Contraseña cambiada correctamente' });
    } catch (error) {
      next(error);
    }
  }

};

module.exports = authController;