const { getDb } = require('../models/db');

const proveedorController = {

  // GET /api/proveedores
  listar: async (req, res, next) => {
    try {
      const db = await getDb();

      const proveedores = await db.all(`
        SELECT 
          p.*,
          tp.nombre as termino_pago_nombre,
          COALESCE((
            SELECT SUM(c.total - c.pagado) 
            FROM compras c 
            WHERE c.proveedor_id = p.id 
            AND c.estado_pago != 'pagado'
          ), 0) as saldo_pendiente,
          (SELECT COUNT(*) FROM compras WHERE proveedor_id = p.id) as total_compras
        FROM proveedores p
        LEFT JOIN terminos_pago tp ON p.termino_pago_id = tp.id
        ORDER BY saldo_pendiente DESC, p.nombre ASC
      `);

      res.json(proveedores);
    } catch (error) {
      console.error('Error en listar proveedores:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/proveedores/:id
  obtener: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      const proveedor = await db.get(`
        SELECT 
          p.*,
          tp.nombre as termino_pago_nombre,
          tp.dias as termino_pago_dias,
          COALESCE((
            SELECT SUM(c.total - c.pagado) 
            FROM compras c 
            WHERE c.proveedor_id = p.id 
            AND c.estado_pago != 'pagado'
          ), 0) as saldo_pendiente,
          (SELECT COUNT(*) FROM compras WHERE proveedor_id = p.id) as total_compras
        FROM proveedores p
        LEFT JOIN terminos_pago tp ON p.termino_pago_id = tp.id
        WHERE p.id = ?
      `, [id]);

      if (!proveedor) {
        return res.status(404).json({ error: 'Proveedor no encontrado' });
      }

      // Obtener contactos
      proveedor.contactos = await db.all(
        'SELECT * FROM proveedor_contactos WHERE proveedor_id = ? ORDER BY nombre',
        [id]
      );

      // Obtener últimas compras
      proveedor.ultimas_compras = await db.all(`
        SELECT id, fecha_compra, codigo_factura, total, pagado, estado_pago
        FROM compras 
        WHERE proveedor_id = ? 
        ORDER BY fecha_compra DESC 
        LIMIT 5
      `, [id]);

      proveedor.tiene_compras = proveedor.total_compras > 0;

      res.json(proveedor);
    } catch (error) {
      console.error('Error en obtener proveedor:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/proveedores
  crear: async (req, res, next) => {
    try {
      const db = await getDb();
      const { nombre, id_fiscal, direccion, telefono, termino_pago_id, contrato, activo } = req.body;

      if (!nombre) {
        return res.status(400).json({ error: 'El nombre es requerido' });
      }

      const result = await db.run(`
        INSERT INTO proveedores (nombre, id_fiscal, direccion, telefono, termino_pago_id, contrato, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [nombre, id_fiscal || null, direccion || null, telefono || null, termino_pago_id || null, contrato || null, activo !== false ? 1 : 0]);

      res.status(201).json({
        id: result.lastID,
        message: 'Proveedor creado exitosamente'
      });
    } catch (error) {
      console.error('Error en crear proveedor:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // PUT /api/proveedores/:id
  actualizar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { nombre, id_fiscal, direccion, telefono, termino_pago_id, contrato, activo } = req.body;

      await db.run(`
        UPDATE proveedores 
        SET nombre = ?, id_fiscal = ?, direccion = ?, telefono = ?, 
            termino_pago_id = ?, contrato = ?, activo = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [nombre, id_fiscal || null, direccion || null, telefono || null, termino_pago_id || null, contrato || null, activo !== false ? 1 : 0, id]);

      res.json({ message: 'Proveedor actualizado exitosamente' });
    } catch (error) {
      console.error('Error en actualizar proveedor:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // DELETE /api/proveedores/:id
  eliminar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      // Verificar dependencias
      const compras = await db.get(
        'SELECT COUNT(*) as count FROM compras WHERE proveedor_id = ?',
        [id]
      );

      if (compras.count > 0) {
        return res.status(400).json({
          error: 'No se puede eliminar: El proveedor tiene compras asociadas'
        });
      }

      // Eliminar contactos primero
      await db.run('DELETE FROM proveedor_contactos WHERE proveedor_id = ?', [id]);

      // Eliminar proveedor
      await db.run('DELETE FROM proveedores WHERE id = ?', [id]);

      res.json({ message: 'Proveedor eliminado exitosamente' });
    } catch (error) {
      console.error('Error en eliminar proveedor:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/proveedores/:id/contactos
  listarContactos: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      const contactos = await db.all(
        'SELECT * FROM proveedor_contactos WHERE proveedor_id = ? ORDER BY nombre',
        [id]
      );

      res.json(contactos);
    } catch (error) {
      console.error('Error en listar contactos:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/proveedores/:id/contactos
  crearContacto: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { nombre, cargo, telefono_movil, email } = req.body;

      if (!nombre) {
        return res.status(400).json({ error: 'El nombre del contacto es requerido' });
      }

      const result = await db.run(`
        INSERT INTO proveedor_contactos (proveedor_id, nombre, cargo, telefono_movil, email)
        VALUES (?, ?, ?, ?, ?)
      `, [id, nombre, cargo || null, telefono_movil || null, email || null]);

      res.status(201).json({
        id: result.lastID,
        message: 'Contacto agregado exitosamente'
      });
    } catch (error) {
      console.error('Error en crear contacto:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // PUT /api/proveedores/:id/contactos/:contactoId
  actualizarContacto: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id, contactoId } = req.params;
      const { nombre, cargo, telefono_movil, email } = req.body;

      await db.run(`
        UPDATE proveedor_contactos 
        SET nombre = ?, cargo = ?, telefono_movil = ?, email = ?
        WHERE id = ? AND proveedor_id = ?
      `, [nombre, cargo || null, telefono_movil || null, email || null, contactoId, id]);

      res.json({ message: 'Contacto actualizado exitosamente' });
    } catch (error) {
      console.error('Error en actualizar contacto:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // DELETE /api/proveedores/:id/contactos/:contactoId
  eliminarContacto: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id, contactoId } = req.params;

      await db.run(
        'DELETE FROM proveedor_contactos WHERE id = ? AND proveedor_id = ?',
        [contactoId, id]
      );

      res.json({ message: 'Contacto eliminado exitosamente' });
    } catch (error) {
      console.error('Error en eliminar contacto:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = proveedorController;