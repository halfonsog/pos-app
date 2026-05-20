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

  // PUT /api/compras/:id
  actualizar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { fecha_compra, codigo_factura, proveedor_id, detalles, pagado } = req.body;

      // Verificar que no tenga dependencias de stock
      const compra = await db.get('SELECT estado_inventario FROM compras WHERE id = ?', [id]);
      if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
      if (compra.estado_inventario === 'completado') {
        return res.status(400).json({ error: 'No se puede editar: ya fue llevada a stock' });
      }

      await db.run('BEGIN TRANSACTION');
      try {
        // Recalcular total
        const total = detalles.reduce((sum, d) => sum + (d.cantidad * d.precio_unitario), 0);

        // Actualizar compra
        await db.run(`
        UPDATE compras SET fecha_compra = ?, codigo_factura = ?, proveedor_id = ?, total = ?, pagado = ?
        WHERE id = ?
      `, [fecha_compra, codigo_factura, proveedor_id, total, pagado || 0, id]);

        // Eliminar detalles antiguos
        await db.run('DELETE FROM compra_detalles WHERE compra_id = ?', [id]);

        // Insertar nuevos detalles
        for (const d of detalles) {
          await db.run(`
          INSERT INTO compra_detalles (compra_id, producto_id, cantidad, precio_unitario, total)
          VALUES (?, ?, ?, ?, ?)
        `, [id, d.producto_id, d.cantidad, d.precio_unitario, d.cantidad * d.precio_unitario]);
        }

        await db.run('COMMIT');
        res.json({ message: 'Compra actualizada' });
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/compras/:id
  eliminar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      const compra = await db.get('SELECT estado_inventario FROM compras WHERE id = ?', [id]);
      if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
      if (compra.estado_inventario === 'completado') {
        return res.status(400).json({ error: 'No se puede eliminar: ya fue llevada a stock' });
      }

      await db.run('DELETE FROM compra_detalles WHERE compra_id = ?', [id]);
      await db.run('DELETE FROM compras WHERE id = ?', [id]);

      res.json({ message: 'Compra eliminada' });
    } catch (error) {
      next(error);
    }
  },

  inventariar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      const detalles = await db.all(`
      SELECT producto_id, cantidad, precio_unitario
      FROM compra_detalles 
      WHERE compra_id = ?
    `, [id]);

      await db.run('BEGIN TRANSACTION');

      try {
        for (const d of detalles) {
          // ✅ Obtener unidades y coeficientes
          const producto = await db.get(`
          SELECT p.unidad_compra_id, p.unidad_venta_id,
                 uc.coeficiente as coef_compra, uv.coeficiente as coef_venta
          FROM productos p
          LEFT JOIN unidades uc ON p.unidad_compra_id = uc.id
          LEFT JOIN unidades uv ON p.unidad_venta_id = uv.id
          WHERE p.id = ?
        `, [d.producto_id]);

          let cantidadConvertida = d.cantidad;

          if (producto.unidad_compra_id && producto.unidad_venta_id &&
            producto.unidad_compra_id !== producto.unidad_venta_id &&
            producto.coef_compra && producto.coef_venta) {
            const factor = producto.coef_compra / producto.coef_venta;
            cantidadConvertida = d.cantidad * factor;
          }

          await db.run(
            'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
            [cantidadConvertida, d.producto_id]
          );

          await db.run(`
          INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id)
          VALUES (?, 'compra', ?, ?, 1)
        `, [d.producto_id, cantidadConvertida, id]);

          // Actualizar costo del producto
          const precioUnitarioVenta = producto.unidad_compra_id !== producto.unidad_venta_id && producto.coef_compra && producto.coef_venta
            ? d.precio_unitario / (producto.coef_compra / producto.coef_venta)
            : d.precio_unitario;

          await db.run(`
          INSERT INTO producto_costos (producto_id, costo_base) VALUES (?, ?) 
          ON CONFLICT(producto_id) DO UPDATE SET costo_base = excluded.costo_base
        `, [d.producto_id, precioUnitarioVenta]);
        }

        await db.run('UPDATE compras SET estado_inventario = ? WHERE id = ?', ['completado', id]);
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