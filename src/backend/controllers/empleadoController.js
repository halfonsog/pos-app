const { getDb } = require('../models/db');

/**
 * Gestión mínima de empleados (Sprint 1): lo necesario para el CRUD de usuarios (D18).
 * Los campos laborales completos (salarios, aportes, utilidades...) se afinan en Sprint 4 (Contabilidad).
 */
const empleadoController = {

  // GET /api/empleados
  listar: async (req, res, next) => {
    try {
      const db = await getDb();
      const empleados = await db.all(`
        SELECT e.*,
               (SELECT COUNT(*) FROM usuarios u WHERE u.empleado_id = e.id) AS num_usuarios
        FROM empleados e
        ORDER BY e.activo DESC, e.nombre
      `);
      res.json(empleados);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/empleados  { nombre, identificacion?, cargo?, salario_mensual? }
  crear: async (req, res, next) => {
    try {
      const db = await getDb();
      const { nombre, identificacion, cargo, salario_mensual } = req.body;

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'El nombre del empleado es obligatorio' });
      }
      if (cargo !== undefined && !['vendedor', 'administrador', 'cajero', 'otro'].includes(cargo)) {
        return res.status(400).json({ error: 'Cargo inválido (vendedor, administrador, cajero, otro)' });
      }

      const result = await db.run(
        `INSERT INTO empleados (nombre, identificacion, cargo, salario_mensual)
         VALUES (?, ?, ?, ?)`,
        [nombre.trim(), identificacion || null, cargo || 'vendedor', salario_mensual || 0]
      );

      res.status(201).json({ id: result.lastID, message: 'Empleado creado correctamente' });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT' && String(error.message).includes('identificacion')) {
        return res.status(400).json({ error: 'Ya existe un empleado con esa identificación' });
      }
      next(error);
    }
  },

  // PUT /api/empleados/:id  { nombre?, identificacion?, cargo?, activo?, salario_mensual?, aporte_corto_plazo?, utilidades? }
  actualizar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { nombre, identificacion, cargo, activo, salario_mensual, aporte_corto_plazo, utilidades } = req.body;

      const empleado = await db.get('SELECT id FROM empleados WHERE id = ?', [id]);
      if (!empleado) {
        return res.status(404).json({ error: 'Empleado no encontrado' });
      }
      if (cargo !== undefined && !['vendedor', 'administrador', 'cajero', 'otro'].includes(cargo)) {
        return res.status(400).json({ error: 'Cargo inválido (vendedor, administrador, cajero, otro)' });
      }

      const campos = [];
      const params = [];
      if (nombre !== undefined) { campos.push('nombre = ?'); params.push(String(nombre).trim()); }
      if (identificacion !== undefined) { campos.push('identificacion = ?'); params.push(identificacion || null); }
      if (cargo !== undefined) { campos.push('cargo = ?'); params.push(cargo); }
      if (activo !== undefined) { campos.push('activo = ?'); params.push(activo ? 1 : 0); }
      if (salario_mensual !== undefined) { campos.push('salario_mensual = ?'); params.push(parseFloat(salario_mensual) || 0); }
      if (aporte_corto_plazo !== undefined) { campos.push('aporte_corto_plazo = ?'); params.push(parseFloat(aporte_corto_plazo) || 0); }
      if (utilidades !== undefined) { campos.push('utilidades = ?'); params.push(parseFloat(utilidades) || 0); }

      if (campos.length === 0) {
        return res.status(400).json({ error: 'No hay campos para actualizar' });
      }

      params.push(id);
      await db.run(`UPDATE empleados SET ${campos.join(', ')} WHERE id = ?`, params);

      res.json({ message: 'Empleado actualizado correctamente' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = empleadoController;
