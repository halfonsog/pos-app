const { getDb } = require('../models/db');
const bcrypt = require('bcrypt');

/**
 * CRUD de usuarios (solo admin).
 * D18: todo usuario pertenece a un empleado (empleado_id obligatorio).
 * No hay borrado físico: se desactiva (los usuarios tienen historial en ventas/compras/turnos).
 */
const usuarioController = {

  // GET /api/usuarios
  listar: async (req, res, next) => {
    try {
      const db = await getDb();
      const usuarios = await db.all(`
        SELECT u.id, u.username, u.nombre_completo, u.rol, u.activo,
               u.last_login, u.created_at, u.empleado_id, u.tipo_venta,
               e.nombre AS empleado_nombre, e.cargo AS empleado_cargo
        FROM usuarios u
        JOIN empleados e ON u.empleado_id = e.id
        ORDER BY u.activo DESC, u.username
      `);
      res.json(usuarios);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/usuarios  { username, password, nombre_completo, rol, empleado_id, tipo_venta? }
  crear: async (req, res, next) => {
    try {
      const db = await getDb();
      const { username, password, nombre_completo, rol, empleado_id, tipo_venta } = req.body;

      if (!username || !password || !nombre_completo || !empleado_id) {
        return res.status(400).json({ error: 'Usuario, contraseña, nombre y empleado son obligatorios' });
      }
      if (!['admin', 'vendedor'].includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido (admin o vendedor)' });
      }
      if (tipo_venta && !['minorista', 'mayorista', 'ambas'].includes(tipo_venta)) {
        return res.status(400).json({ error: 'Tipo de venta inválido (minorista, mayorista, ambas)' });
      }
      if (String(password).length < 4) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
      }

      const empleado = await db.get('SELECT id FROM empleados WHERE id = ?', [empleado_id]);
      if (!empleado) {
        return res.status(400).json({ error: 'El empleado indicado no existe' });
      }

      const existe = await db.get('SELECT id FROM usuarios WHERE username = ?', [username.trim()]);
      if (existe) {
        return res.status(400).json({ error: 'Ese nombre de usuario ya está en uso' });
      }

      const hash = await bcrypt.hash(String(password), 10);
      const result = await db.run(
        `INSERT INTO usuarios (username, password_hash, nombre_completo, rol, empleado_id, tipo_venta)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [username.trim(), hash, nombre_completo.trim(), rol, empleado_id, tipo_venta || 'ambas']
      );

      res.status(201).json({ id: result.lastID, message: 'Usuario creado correctamente' });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/usuarios/:id  { nombre_completo?, rol?, empleado_id?, activo? }
  actualizar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { nombre_completo, rol, empleado_id, activo } = req.body;

      const usuario = await db.get('SELECT * FROM usuarios WHERE id = ?', [id]);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (rol !== undefined && !['admin', 'vendedor'].includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido (admin o vendedor)' });
      }
      if (empleado_id !== undefined) {
        const empleado = await db.get('SELECT id FROM empleados WHERE id = ?', [empleado_id]);
        if (!empleado) {
          return res.status(400).json({ error: 'El empleado indicado no existe' });
        }
      }

      // Protecciones sobre uno mismo y sobre el último admin activo
      const afectaPropio = Number(id) === req.usuario.id;
      const bajaRolAdmin = rol !== undefined && rol !== 'admin' && usuario.rol === 'admin';
      const desactiva = activo !== undefined && !activo;

      if (afectaPropio && (bajaRolAdmin || desactiva)) {
        return res.status(400).json({ error: 'No puedes quitarte el rol de admin ni desactivarte a ti mismo' });
      }

      if ((bajaRolAdmin || desactiva) && usuario.rol === 'admin' && usuario.activo) {
        const admins = await db.get(
          "SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'admin' AND activo = 1 AND id != ?", [id]
        );
        if (admins.n === 0) {
          return res.status(400).json({ error: 'Debe quedar al menos un administrador activo' });
        }
      }

      const campos = [];
      const params = [];
      if (nombre_completo !== undefined) { campos.push('nombre_completo = ?'); params.push(String(nombre_completo).trim()); }
      if (rol !== undefined) {
        if (!['admin', 'vendedor'].includes(rol)) {
          return res.status(400).json({ error: 'Rol inválido (admin o vendedor)' });
        }
        campos.push('rol = ?'); params.push(rol);
      }
      if (empleado_id !== undefined) { campos.push('empleado_id = ?'); params.push(empleado_id); }
      if (req.body.tipo_venta !== undefined) {
        if (!['minorista', 'mayorista', 'ambas'].includes(req.body.tipo_venta)) {
          return res.status(400).json({ error: 'Tipo de venta inválido (minorista, mayorista, ambas)' });
        }
        campos.push('tipo_venta = ?'); params.push(req.body.tipo_venta);
      }
      if (activo !== undefined) { campos.push('activo = ?'); params.push(activo ? 1 : 0); }

      if (campos.length === 0) {
        return res.status(400).json({ error: 'No hay campos para actualizar' });
      }

      params.push(id);
      await db.run(`UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`, params);

      res.json({ message: 'Usuario actualizado correctamente' });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/usuarios/:id/password  { password }  — reseteo por el admin
  resetPassword: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { password } = req.body;

      if (!password || String(password).length < 4) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
      }

      const usuario = await db.get('SELECT id FROM usuarios WHERE id = ?', [id]);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const hash = await bcrypt.hash(String(password), 10);
      await db.run('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, id]);

      res.json({ message: 'Contraseña restablecida correctamente' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = usuarioController;
