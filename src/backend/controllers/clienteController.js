const { getDb } = require('../models/db');

/**
 * CRUD de Clientes (ventas mayoristas).
 * Con saldo pendiente calculado desde pedidos no cancelados.
 */
const clienteController = {

  // GET /api/clientes
  listar: async (req, res, next) => {
    try {
      const db = await getDb();
      const clientes = await db.all(`
        SELECT c.*, tp.nombre AS condicion_pago_nombre, tp.dias AS condicion_dias,
               (SELECT COALESCE(SUM(p.total - p.pagado), 0) FROM pedidos p
                 WHERE p.cliente_id = c.id AND p.estado != 'cancelado' AND p.estado_pago != 'pagado') AS saldo_pendiente,
               (SELECT COUNT(*) FROM pedidos p WHERE p.cliente_id = c.id AND p.estado != 'cancelado') AS num_pedidos
        FROM clientes c
        LEFT JOIN terminos_pago tp ON c.condicion_pago_id = tp.id
        ORDER BY c.activo DESC, c.nombre
      `);
      res.json(clientes);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/clientes/:id
  obtener: async (req, res, next) => {
    try {
      const db = await getDb();
      const cliente = await db.get(`
        SELECT c.*, tp.nombre AS condicion_pago_nombre, tp.dias AS condicion_dias
        FROM clientes c LEFT JOIN terminos_pago tp ON c.condicion_pago_id = tp.id
        WHERE c.id = ?
      `, [req.params.id]);
      if (!cliente) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      cliente.pedidos = await db.all(`
        SELECT id, fecha, estado, total, pagado, estado_pago
        FROM pedidos WHERE cliente_id = ? ORDER BY fecha DESC LIMIT 20
      `, [req.params.id]);
      res.json(cliente);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/clientes
  crear: async (req, res, next) => {
    try {
      const db = await getDb();
      const { nombre, identificacion, telefono, direccion, contrato, condicion_pago_id, limite_credito, descuento_global } = req.body;

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'El nombre del cliente es obligatorio' });
      }

      const result = await db.run(`
        INSERT INTO clientes (nombre, identificacion, telefono, direccion, contrato, condicion_pago_id, limite_credito, descuento_global)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [nombre.trim(), identificacion || null, telefono || null, direccion || null, contrato || null,
          condicion_pago_id || null, limite_credito || 0, descuento_global || 0]);

      res.status(201).json({ id: result.lastID, message: 'Cliente creado correctamente' });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/clientes/:id
  actualizar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { nombre, identificacion, telefono, direccion, contrato, condicion_pago_id, limite_credito, descuento_global, activo } = req.body;

      const cliente = await db.get('SELECT id FROM clientes WHERE id = ?', [id]);
      if (!cliente) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      const campos = [];
      const params = [];
      if (nombre !== undefined) { campos.push('nombre = ?'); params.push(String(nombre).trim()); }
      if (identificacion !== undefined) { campos.push('identificacion = ?'); params.push(identificacion || null); }
      if (telefono !== undefined) { campos.push('telefono = ?'); params.push(telefono || null); }
      if (direccion !== undefined) { campos.push('direccion = ?'); params.push(direccion || null); }
      if (contrato !== undefined) { campos.push('contrato = ?'); params.push(contrato || null); }
      if (condicion_pago_id !== undefined) { campos.push('condicion_pago_id = ?'); params.push(condicion_pago_id || null); }
      if (limite_credito !== undefined) { campos.push('limite_credito = ?'); params.push(limite_credito || 0); }
      if (descuento_global !== undefined) { campos.push('descuento_global = ?'); params.push(descuento_global || 0); }
      if (activo !== undefined) { campos.push('activo = ?'); params.push(activo ? 1 : 0); }

      if (campos.length === 0) {
        return res.status(400).json({ error: 'No hay campos para actualizar' });
      }

      params.push(id);
      await db.run(`UPDATE clientes SET ${campos.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
      res.json({ message: 'Cliente actualizado correctamente' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = clienteController;
