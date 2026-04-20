const { getDb } = require('../models/db');

const compraController = {

  // GET /api/compras
  listar: async (req, res, next) => {
    try {
      const db = await getDb();

      const compras = await db.all(`
      SELECT 
        c.*,
        p.nombre as proveedor_nombre
      FROM compras c
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      ORDER BY c.fecha_compra DESC
    `);

      // Para cada compra, obtener sus detalles
      for (const compra of compras) {
        compra.detalles = await db.all(`
        SELECT 
          cd.*,
          pr.nombre as producto_nombre,
          pr.codigo as producto_codigo
        FROM compra_detalles cd
        JOIN productos pr ON cd.producto_id = pr.id
        WHERE cd.compra_id = ?
      `, [compra.id]);
      }

      res.json(compras);
    } catch (error) {
      console.error('Error en listar compras:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/compras/:id
  obtener: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      const compra = await db.get(`
      SELECT c.*, p.nombre as proveedor_nombre
      FROM compras c
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      WHERE c.id = ?
    `, [id]);

      if (!compra) {
        return res.status(404).json({ error: 'Compra no encontrada' });
      }

      // ✅ CORREGIDO: Quitar pr.unidad_venta_abrev y usar solo lo que existe
      compra.detalles = await db.all(`
      SELECT 
        cd.*,
        pr.nombre as producto_nombre,
        pr.codigo as producto_codigo,
        uc.abreviatura as unidad_compra_abrev
      FROM compra_detalles cd
      JOIN productos pr ON cd.producto_id = pr.id
      LEFT JOIN unidades uc ON pr.unidad_compra_id = uc.id
      WHERE cd.compra_id = ?
    `, [id]);

      res.json(compra);
    } catch (error) {
      console.error('Error en obtener compra:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/compras
  crear: async (req, res, next) => {
    try {
      const db = await getDb();
      const { fecha_compra, codigo_factura, proveedor_id, pagado, detalles } = req.body;

      await db.run('BEGIN TRANSACTION');

      try {
        // Calcular total
        const total = detalles.reduce((sum, d) => sum + (d.cantidad * d.precio_unitario), 0);

        // Determinar estado de pago
        let estado_pago = 'pendiente';
        if (pagado >= total) {
          estado_pago = 'pagado';
        } else if (pagado > 0) {
          estado_pago = 'parcial';
        }

        // Insertar compra
        const result = await db.run(`
          INSERT INTO compras (fecha_compra, codigo_factura, proveedor_id, total, pagado, estado_pago, estado_inventario, usuario_id)
          VALUES (?, ?, ?, ?, ?, ?, 'pendiente', 1)
        `, [fecha_compra, codigo_factura, proveedor_id, total, pagado || 0, estado_pago]);

        const compraId = result.lastID;

        // Insertar detalles
        for (const d of detalles) {
          await db.run(`
            INSERT INTO compra_detalles (compra_id, producto_id, cantidad, precio_unitario, total)
            VALUES (?, ?, ?, ?, ?)
          `, [compraId, d.producto_id, d.cantidad, d.precio_unitario, d.cantidad * d.precio_unitario]);
        }

        await db.run('COMMIT');

        res.status(201).json({
          id: compraId,
          message: 'Compra creada exitosamente'
        });

      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error en crear compra:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/compras/:id/inventariar
  inventariar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      // Obtener detalles de la compra
      const detalles = await db.all(`
        SELECT producto_id, cantidad 
        FROM compra_detalles 
        WHERE compra_id = ?
      `, [id]);

      await db.run('BEGIN TRANSACTION');

      try {
        // Actualizar stock de cada producto
        for (const d of detalles) {
          // Obtener factor de conversión del producto
          const producto = await db.get(
            'SELECT factor_conversion FROM productos WHERE id = ?',
            [d.producto_id]
          );

          const cantidadConvertida = d.cantidad * (producto?.factor_conversion || 1);

          // Actualizar stock
          await db.run(
            'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
            [cantidadConvertida, d.producto_id]
          );

          // Registrar movimiento
          await db.run(`
            INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id)
            VALUES (?, 'compra', ?, ?, 1)
          `, [d.producto_id, cantidadConvertida, id]);
        }

        // Actualizar estado de la compra
        await db.run(
          'UPDATE compras SET estado_inventario = ? WHERE id = ?',
          ['completado', id]
        );

        await db.run('COMMIT');

        res.json({ message: 'Compra llevada a stock exitosamente' });

      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error en inventariar:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/compras/:id/pagar
  pagar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { monto, metodo_pago, referencia } = req.body;

      // Obtener compra actual
      const compra = await db.get('SELECT total, pagado FROM compras WHERE id = ?', [id]);

      if (!compra) {
        return res.status(404).json({ error: 'Compra no encontrada' });
      }

      const nuevoPagado = (compra.pagado || 0) + monto;
      let estado_pago = 'parcial';
      if (nuevoPagado >= compra.total) {
        estado_pago = 'pagado';
      }

      await db.run(
        'UPDATE compras SET pagado = ?, estado_pago = ? WHERE id = ?',
        [nuevoPagado, estado_pago, id]
      );

      // Aquí podrías registrar el pago en una tabla de pagos

      res.json({ message: 'Pago registrado exitosamente' });

    } catch (error) {
      console.error('Error en pagar:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = compraController;