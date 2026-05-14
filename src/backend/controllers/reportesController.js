const { getDb } = require('../models/db');

const reportesController = {

  // GET /api/reportes/ventas-por-producto
  ventasPorProducto: async (req, res, next) => {
    try {
      const db = await getDb();
      const { inicio, fin } = req.query;

      const productos = await db.all(`
        SELECT 
          p.id, p.nombre, p.codigo,
          SUM(vd.cantidad) as cantidad_vendida,
          SUM(vd.total) as total_vendido,
          COUNT(DISTINCT v.id) as num_ventas,
          COALESCE(pc.costo_base, 0) as costo_unitario,
          COALESCE(pc.margen, 0) as margen_pct
        FROM venta_detalles vd
        JOIN ventas v ON vd.venta_id = v.id
        JOIN productos p ON vd.producto_id = p.id
        LEFT JOIN producto_costos pc ON p.id = pc.producto_id
        WHERE v.estado = 'completada'
          AND v.created_at >= ? AND v.created_at <= ?
        GROUP BY p.id
        ORDER BY total_vendido DESC
      `, [inicio, fin]);

      // Calcular ganancia para cada producto
      for (const p of productos) {
        p.costo_total = p.costo_unitario * p.cantidad_vendida;
        p.ganancia = p.total_vendido - p.costo_total;
        p.margen_real = p.total_vendido > 0 ? (p.ganancia / p.total_vendido) * 100 : 0;
      }

      // Totales
      const totales = {
        cantidad_total: productos.reduce((s, p) => s + p.cantidad_vendida, 0),
        venta_total: productos.reduce((s, p) => s + p.total_vendido, 0),
        costo_total: productos.reduce((s, p) => s + p.costo_total, 0),
        ganancia_total: productos.reduce((s, p) => s + p.ganancia, 0)
      };

      res.json({ productos, totales });

    } catch (error) {
      next(error);
    }
  },

  // GET /api/reportes/tendencia
  tendencia: async (req, res, next) => {
    try {
      const db = await getDb();
      const { inicio, fin, agrupar } = req.query; // agrupar: 'dia', 'semana', 'mes'

      let formato, groupBy;

      switch (agrupar) {
        case 'semana':
          formato = '%Y-%W'; // Año-Semana
          groupBy = "strftime('%Y-%W', created_at)";
          break;
        case 'mes':
          formato = '%Y-%m'; // Año-Mes
          groupBy = "strftime('%Y-%m', created_at)";
          break;
        default: // dia
          formato = '%Y-%m-%d';
          groupBy = "date(created_at)";
      }

      const datos = await db.all(`
      SELECT 
        ${groupBy} as periodo,
        COUNT(*) as num_ventas,
        COALESCE(SUM(total), 0) as total_vendido,
        COALESCE(SUM(impuesto), 0) as impuesto,
        COALESCE(SUM(ajuste_redondeo), 0) as ajuste
      FROM ventas
      WHERE estado = 'completada'
        AND created_at >= ? AND created_at <= ?
      GROUP BY periodo
      ORDER BY periodo
    `, [inicio, fin]);

      res.json(datos);

    } catch (error) {
      next(error);
    }
  },

  // GET /api/reportes/rentabilidad
  rentabilidad: async (req, res, next) => {
    try {
      const db = await getDb();
      const { inicio, fin } = req.query;

      const productos = await db.all(`
      SELECT 
        p.id, p.nombre, p.codigo, p.precio_venta,
        COALESCE(pc.costo_base, 0) as costo_base,
        COALESCE(pc.margen, 0) as margen_pct,
        COALESCE(pc.gastos_fijos, 0) as gastos_fijos_pct,
        SUM(vd.cantidad) as cantidad_vendida,
        SUM(vd.total) as total_vendido
      FROM venta_detalles vd
      JOIN ventas v ON vd.venta_id = v.id
      JOIN productos p ON vd.producto_id = p.id
      LEFT JOIN producto_costos pc ON p.id = pc.producto_id
      WHERE v.estado = 'completada'
        AND v.created_at >= ? AND v.created_at <= ?
      GROUP BY p.id
      HAVING cantidad_vendida > 0
      ORDER BY total_vendido DESC
    `, [inicio, fin]);

      for (const p of productos) {
        p.costo_total = p.costo_base * p.cantidad_vendida;
        p.ganancia_bruta = p.total_vendido - p.costo_total;
        p.margen_real = p.total_vendido > 0 ? (p.ganancia_bruta / p.total_vendido) * 100 : 0;

        // Gastos fijos asignados
        const pctGastos = (p.gastos_fijos_pct || 0) / 100;
        p.gastos_fijos = pctGastos > 0 ? p.costo_base * (pctGastos / (1 - pctGastos)) * p.cantidad_vendida : 0;
        p.ganancia_neta = p.ganancia_bruta - p.gastos_fijos;
      }

      res.json(productos);

    } catch (error) {
      next(error);
    }
  }
};

module.exports = reportesController;