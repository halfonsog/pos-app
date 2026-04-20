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
                    ), 0) as saldo_pendiente
                FROM proveedores p
                LEFT JOIN terminos_pago tp ON p.termino_pago_id = tp.id
                ORDER BY saldo_pendiente DESC, p.nombre ASC
            `);

      res.json(proveedores);
    } catch (error) {
      next(error);
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
                    ), 0) as saldo_pendiente
                FROM proveedores p
                LEFT JOIN terminos_pago tp ON p.termino_pago_id = tp.id
                WHERE p.id = ?
            `, [id]);

      if (!proveedor) {
        return res.status(404).json({ error: 'Proveedor no encontrado' });
      }

      // Obtener contactos
      const contactos = await db.all(
        'SELECT * FROM proveedor_contactos WHERE proveedor_id = ?',
        [id]
      );

      proveedor.contactos = contactos;

      // Verificar si tiene compras asociadas
      const comprasCount = await db.get(
        'SELECT COUNT(*) as count FROM compras WHERE proveedor_id = ?',
        [id]
      );

      proveedor.tiene_compras = comprasCount.count > 0;

      res.json(proveedor);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/proveedores
  crear: async (req, res, next) => {
    try {
      const db = await getDb();
      const { nombre, id_fiscal, direccion, telefono, termino_pago_id, activo } = req.body;

      if (!nombre) {
        return res.status(400).json({ error: 'El nombre es requerido' });
      }

      const result = await db.run(`
                INSERT INTO proveedores (nombre, id_fiscal, direccion, telefono, termino_pago_id, activo)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [nombre, id_fiscal, direccion, telefono, termino_pago_id, activo !== false ? 1 : 0]);

      res.status(201).json({
        id: result.lastID,
        message: 'Proveedor creado exitosamente'
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/proveedores/:id
  actualizar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { nombre, id_fiscal, direccion, telefono, termino_pago_id, activo } = req.body;

      await db.run(`
                UPDATE proveedores 
                SET nombre = ?, id_fiscal = ?, direccion = ?, telefono = ?, 
                    termino_pago_id = ?, activo = ?
                WHERE id = ?
            `, [nombre, id_fiscal, direccion, telefono, termino_pago_id, activo ? 1 : 0, id]);

      res.json({ message: 'Proveedor actualizado exitosamente' });
    } catch (error) {
      next(error);
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

      // Eliminar contactos primero (por si acaso, aunque debería ser CASCADE)
      await db.run('DELETE FROM proveedor_contactos WHERE proveedor_id = ?', [id]);

      // Eliminar proveedor
      await db.run('DELETE FROM proveedores WHERE id = ?', [id]);

      res.json({ message: 'Proveedor eliminado exitosamente' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = proveedorController;