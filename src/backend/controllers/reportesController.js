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
          COALESCE(p.costo_base, 0) as costo_unitario,
          (SELECT margen_recomendado FROM parametros_contables WHERE id = 1) as margen_pct
        FROM venta_detalles vd
        JOIN ventas v ON vd.venta_id = v.id
        JOIN productos p ON vd.producto_id = p.id
        WHERE v.estado = 'completada'
          AND v.created_at >= ? AND v.created_at <= ?
        GROUP BY p.id
        ORDER BY total_vendido DESC
      `, [inicio, fin]);

      // Calcular ganancia para cada producto
      for (const p of productos) {
        p.costo_total = p.costo_unitario * p.cantidad_vendida;
        p.ganancia = p.total_vendido * p.margen_pct / 100;
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
        COALESCE(p.costo_base, 0) as costo_base,
        (SELECT margen_recomendado FROM parametros_contables WHERE id = 1) as margen_pct,
        SUM(vd.cantidad) as cantidad_vendida,
        SUM(vd.total) as total_vendido
      FROM venta_detalles vd
      JOIN ventas v ON vd.venta_id = v.id
      JOIN productos p ON vd.producto_id = p.id
      WHERE v.estado = 'completada'
        AND v.created_at >= ? AND v.created_at <= ?
      GROUP BY p.id
      HAVING cantidad_vendida > 0
      ORDER BY total_vendido DESC
    `, [inicio, fin]);

      for (const p of productos) {
        p.costo_total = p.costo_base * p.cantidad_vendida;
        p.ganancia_bruta = p.total_vendido * p.margen_pct / 100;

        // Gastos fijos asignados
        //const gastos_pct = (p.gastos_fijos_pct || 0) / 100;
        //p.gastos_fijos = gastos_pct > 0 ? p.costo_base * (pctGastos / (1 - gastos_pct)) * p.cantidad_vendida : 0;
        p.gastos_fijos = p.total_vendido * p.gastos_fijos_pct / 100;
      }

      res.json(productos);

    } catch (error) {
      next(error);
    }
  },

  // GET /api/reportes/contables
  contables: async (req, res, next) => {
    try {
      const db = await getDb();
      const { tipo, mes, anio } = req.query;

      const inicio = new Date(anio, mes - 1, 1).toISOString();
      const fin = new Date(anio, mes, 0, 23, 59, 59, 999).toISOString();

      let resultado = {};

      if (tipo === 'ventas' || tipo === 'todas') {
        // Ventas del mes
        const ventas = await db.get(`
        SELECT 
          COUNT(*) as total_ventas,
          SUM(total - COALESCE(ajuste_redondeo, 0)) as venta_total,
          SUM(impuesto) as impuesto_cobrado,
          SUM(COALESCE(ajuste_redondeo, 0)) as ajuste_redondeo,
          SUM(total) as total_cobrado
        FROM ventas
        WHERE estado = 'completada'
          AND created_at >= ? AND created_at <= ?
      `, [inicio, fin]);

        // Ventas por método
        const ventasPorMetodo = await db.all(`
        SELECT metodo_pago, COUNT(*) as cantidad, SUM(total) as total
        FROM ventas
        WHERE estado = 'completada'
          AND created_at >= ? AND created_at <= ?
        GROUP BY metodo_pago
      `, [inicio, fin]);

        resultado.ventas = { ...ventas, porMetodo: ventasPorMetodo };
      }

      if (tipo === 'compras' || tipo === 'todas') {
        // Compras del mes
        const compras = await db.get(`
        SELECT 
          COUNT(*) as total_compras,
          SUM(total) as total_comprado,
          SUM(pagado) as total_pagado,
          SUM(total - pagado) as pendiente_pago
        FROM compras
        WHERE fecha_compra >= ? AND fecha_compra <= ?
      `, [inicio, fin]);

        // Compras por proveedor
        const comprasPorProveedor = await db.all(`
        SELECT p.nombre, COUNT(*) as cantidad, SUM(c.total) as total
        FROM compras c
        JOIN proveedores p ON c.proveedor_id = p.id
        WHERE c.fecha_compra >= ? AND c.fecha_compra <= ?
        GROUP BY c.proveedor_id
        ORDER BY total DESC
      `, [inicio, fin]);

        resultado.compras = { ...compras, porProveedor: comprasPorProveedor };
      }

      if (tipo === 'rentabilidad' || tipo === 'todas') {
        // Costo de ventas
        const costoVentas = await db.get(`
        SELECT SUM(COALESCE(p.costo_base, 0) * vd.cantidad) as total
        FROM venta_detalles vd
        JOIN ventas v ON vd.venta_id = v.id
        JOIN productos p ON vd.producto_id = p.id
        WHERE v.estado = 'completada'
          AND v.created_at >= ? AND v.created_at <= ?
      `, [inicio, fin]);

        const ventasMes = resultado.ventas || await db.get(`
          SELECT 
            SUM(total - COALESCE(ajuste_redondeo, 0)) as venta_total, SUM(impuesto) as impuesto_cobrado, SUM(COALESCE(ajuste_redondeo, 0)) as ajuste_redondeo
          FROM ventas
          WHERE estado = 'completada' AND created_at >= ? AND created_at <= ?`, [inicio, fin]);

        // Obtener total compras del mes (para proveedores)
        const totalCompras = await db.get(`SELECT SUM(total) as total FROM compras WHERE fecha_compra >= ? AND fecha_compra <= ?`, [inicio, fin]);

        // Impuesto a la ganancia desde configuración
        const config = await db.get('SELECT * FROM parametros_contables WHERE id = 1');
        const impuestoGananciaPct = config?.impuesto_ganancia || 35;
        const { gastosFijos: gastosFijosMensuales } = await require('../utils/costos').obtenerGastosFijos(db);
        const gastosMensuales = { total: gastosFijosMensuales };

        // Cálculos
        const ventaNeta = (ventasMes.venta_total || 0) - (ventasMes.impuesto_cobrado || 0);
        const costoTotal = costoVentas?.total || 0;
        const gastosFijos = gastosMensuales?.total || 0;
        const gananciaBruta = ventaNeta - costoTotal;
        const gananciaAntesImpuestos = gananciaBruta - gastosFijos + (ventasMes.ajuste_redondeo || 0);
        const impuestoGanancia = gananciaAntesImpuestos > 0 ? gananciaAntesImpuestos * (impuestoGananciaPct / 100) : 0;
        const gananciaNeta = gananciaAntesImpuestos - impuestoGanancia;

        resultado.rentabilidad = {
          ventaTotal: ventasMes.venta_total || 0,
          impuestoCobrado: ventasMes.impuesto_cobrado || 0,
          ventaNeta,
          costoTotal,
          proveedores: totalCompras?.total || 0,
          gananciaBruta,
          gastosFijos,
          ajusteRedondeo: ventasMes.ajuste_redondeo || 0,
          gananciaAntesImpuestos,
          impuestoGananciaPct,
          impuestoGanancia,
          gananciaNeta,
          margen: ventaNeta > 0 ? (gananciaNeta / ventaNeta) * 100 : 0
        };
      }

      res.json(resultado);

    } catch (error) {
      next(error);
    }
  },

  // GET /api/reportes/resumen-anual
  resumenAnual: async (req, res, next) => {
    try {
      const db = await getDb();
      const { anio } = req.query;

      const resumen = await db.all(`
      SELECT 
        strftime('%m', created_at) as mes,
        COUNT(*) as total_ventas,
        SUM(total) as total_cobrado,
        SUM(impuesto) as impuesto,
        SUM(COALESCE(ajuste_redondeo, 0)) as ajuste
      FROM ventas
      WHERE estado = 'completada'
        AND strftime('%Y', created_at) = ?
      GROUP BY mes
      ORDER BY mes
    `, [anio.toString()]);

      // Nombres de meses
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

      resumen.forEach(r => {
        r.mes_nombre = meses[parseInt(r.mes) - 1];
      });

      res.json(resumen);

    } catch (error) {
      next(error);
    }
  }

};
module.exports = reportesController;