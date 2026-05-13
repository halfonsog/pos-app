const { getDb } = require('../models/db');

const dashboardController = {

  // GET /api/dashboard
  obtener: async (req, res, next) => {
    try {
      const db = await getDb();

      // Recibir la fecha del frontend (o usar la actual del sistema)
      const hoy = req.query.fecha || new Date().toISOString().split('T')[0];
      const ahora = new Date();
      console.log('Ahora: ', ahora);
      console.log('process.env.TZ', process.env.TZ);

      const ventasHoy = await db.get(`
        SELECT COUNT(*) as total_ventas, COALESCE(SUM(total), 0) as total
        FROM ventas WHERE date(created_at) = ? AND estado = 'completada'
      `, [hoy]);

      const stockBajo = await db.get(`
        SELECT COUNT(*) as count FROM productos WHERE activo = 1 AND stock_actual <= stock_minimo AND stock_minimo > 0
      `);

      const sinFichaCosto = await db.get(`
        SELECT COUNT(*) as count FROM productos WHERE activo = 1 AND (precio_venta = 0 OR precio_venta IS NULL)
      `);

      const comprasPendientesPago = await db.get(`
        SELECT COUNT(*) as count FROM compras WHERE estado_pago != 'pagado'
      `);

      const comprasPendientesStock = await db.get(`
        SELECT COUNT(*) as count FROM compras WHERE estado_inventario = 'pendiente'
      `);

      const masVendidos = await db.all(`
        SELECT p.nombre, SUM(vd.cantidad) as cantidad
        FROM venta_detalles vd
        JOIN ventas v ON vd.venta_id = v.id
        JOIN productos p ON vd.producto_id = p.id
        WHERE date(v.created_at) = ? AND v.estado = 'completada'
        GROUP BY p.id ORDER BY cantidad DESC LIMIT 5
      `, [hoy]);

      const ultimasActividades = await db.all(`
        SELECT * FROM (
          SELECT 'venta' as tipo, v.id, v.total, v.metodo_pago, v.created_at,
                u.nombre_completo as usuario
          FROM ventas v JOIN usuarios u ON v.vendedor_id = u.id WHERE v.estado = 'completada'
          UNION ALL
          SELECT 'compra' as tipo, c.id, c.total, 'compra' as metodo_pago, c.created_at,
                p.nombre as usuario
          FROM compras c JOIN proveedores p ON c.proveedor_id = p.id
        ) ORDER BY created_at DESC LIMIT 5
      `);

      const ventasPorHora = await db.all(`
        SELECT CAST(strftime('%H', created_at) AS INTEGER) as hora,
               COUNT(*) as ventas, COALESCE(SUM(total), 0) as total
        FROM ventas WHERE date(created_at) = ? AND estado = 'completada'
        GROUP BY hora ORDER BY hora
      `, [hoy]);

      res.json({
        ventasHoy,
        stockBajo: stockBajo.count,
        sinFichaCosto: sinFichaCosto.count,
        comprasPendientesPago: comprasPendientesPago.count,
        comprasPendientesStock: comprasPendientesStock.count,
        totalPendientes: sinFichaCosto.count + comprasPendientesPago.count + comprasPendientesStock.count + stockBajo.count,
        promocionesActivas: 0,
        masVendidos,
        ultimasActividades,
        ventasPorHora
      });

    } catch (error) {
      next(error);
    }
  }
};

module.exports = dashboardController;