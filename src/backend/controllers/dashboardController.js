const { getDb } = require('../models/db');

const dashboardController = {

  // GET /api/dashboard
  obtener: async (req, res, next) => {
    try {
      const db = await getDb();

      // Recibir la fecha del frontend 
      const inicio = req.query.inicio;
      const fin = req.query.fin;

      const ventasHoy = await db.get(`
        SELECT COUNT(*) as total_ventas, COALESCE(SUM(total), 0) as total
        FROM ventas WHERE created_at >= ? AND created_at <= ? AND estado = 'completada'
      `, [inicio, fin]);

      const stockBajo = await db.get(`
        WITH stock_componentes AS (
          SELECT r.producto_padre_id, MIN(pr.stock_actual / r.cantidad) as stock_efectivo
          FROM recetas r
          JOIN productos pr ON r.producto_hijo_id = pr.id
          WHERE pr.activo = 1
          GROUP BY r.producto_padre_id
        )
        SELECT COUNT(*) as count
        FROM productos p
        LEFT JOIN stock_componentes sc ON p.id = sc.producto_padre_id
        WHERE p.activo = 1 AND p.stock_minimo > 0 AND 
          CASE WHEN p.tipo = 'compuesto' AND p.sub_tipo = 'conformado' THEN COALESCE(sc.stock_efectivo, 0)
            ELSE p.stock_actual
          END <= p.stock_minimo
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
        SELECT p.nombre, SUM(vd.cantidad) as cantidad, u.abreviatura as unidad
        FROM venta_detalles vd
        JOIN ventas v ON vd.venta_id = v.id
        JOIN productos p ON vd.producto_id = p.id
        JOIN unidades u ON p.unidad_venta_id = u.id
        WHERE v.created_at >= ? AND v.created_at <= ? AND v.estado = 'completada'
        GROUP BY p.id ORDER BY cantidad DESC LIMIT 5
      `, [inicio, fin]);

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
        FROM ventas WHERE created_at >= ? AND created_at <= ? AND estado = 'completada'
        GROUP BY hora ORDER BY hora
      `, [inicio, fin]);

      // Pendientes de inventario (suma de alertas)
      const preparacionesPendientes = await db.get(`
        SELECT COUNT(DISTINCT p.id) as count
        FROM productos p
        WHERE p.tipo = 'compuesto' AND p.sub_tipo = 'elaborado' AND p.activo = 1
          AND EXISTS (SELECT 1 FROM recetas WHERE producto_padre_id = p.id)
      `);
      const pendientesInventario = stockBajo.count + comprasPendientesStock.count + preparacionesPendientes.count;

      // Encargos a entregar hoy (pedidos minoristas pendientes con vencimiento hoy o sin fecha)
      const encargosHoy = await db.get(`
        SELECT COUNT(*) as count FROM pedidos
        WHERE tipo = 'minorista' AND estado = 'pendiente'
          AND (fecha_vencimiento IS NULL OR fecha_vencimiento <= date('now', 'localtime'))
      `);

      // ¿Hoy es día de pagar bonos? (dia_pago_bonos configurado vs día de la semana actual)
      const configBono = await db.get('SELECT dia_pago_bonos FROM configuracion_contabilidad WHERE id = 1');
      const diaPagoBonos = configBono?.dia_pago_bonos ?? 5;
      const hoyDiaSemana = new Date().getDay(); // 0=domingo..6=sábado
      const esDiaBonos = hoyDiaSemana === diaPagoBonos;
      const empleadosActivos = (await db.get('SELECT COUNT(*) AS n FROM empleados WHERE activo = 1'))?.n || 0;

      // Pedidos y encargos activos (en vez de "últimas actividades")
      const pedidosActivos = await db.all(`
        SELECT p.id, p.tipo, p.fecha, p.fecha_vencimiento, p.estado, p.estado_pago, p.total, p.pagado,
               COALESCE(c.nombre, p.cliente_nombre) AS cliente_nombre,
          CASE WHEN p.fecha_vencimiento IS NOT NULL AND p.fecha_vencimiento < date('now', 'localtime')
                AND p.estado IN ('pendiente','parcial','facturado') THEN 1 ELSE 0 END AS vencido
        FROM pedidos p
        LEFT JOIN clientes c ON p.cliente_id = c.id
        WHERE p.estado IN ('pendiente', 'parcial', 'facturado')
        ORDER BY vencido DESC, p.fecha_vencimiento IS NULL, p.fecha_vencimiento ASC
        LIMIT 10
      `);

      // Alertas fiscales: liquidaciones pendientes/parciales y su vencimiento más próximo
      const impuestosPendientes = await db.get(`
        SELECT COUNT(*) as cantidad,
               COALESCE(SUM(lt.monto_calculado - COALESCE(lt.monto_pagado, 0)), 0) as monto_total,
               MIN(pf.fecha_limite_pago) as proximo_vencimiento
        FROM liquidaciones_tributos lt
        JOIN periodos_fiscales pf ON lt.periodo_fiscal_id = pf.id
        WHERE lt.estado IN ('pendiente', 'parcial')
      `);

      // Días restantes hasta el vencimiento más próximo (fecha_limite 'YYYY-MM-DD')
      let diasParaVencimiento = null;
      if (impuestosPendientes.proximo_vencimiento) {
        const fechaLimite = new Date(String(impuestosPendientes.proximo_vencimiento).slice(0, 10) + 'T23:59:59Z');
        diasParaVencimiento = Math.ceil((fechaLimite - new Date()) / (1000 * 60 * 60 * 24));
      }

      res.json({
        ventasHoy,
        stockBajo: stockBajo.count,
        sinFichaCosto: sinFichaCosto.count,
        comprasPendientesPago: comprasPendientesPago.count,
        comprasPendientesStock: comprasPendientesStock.count,
        preparacionesPendientes: preparacionesPendientes.count,
        pendientesInventario,
        encargosHoy: encargosHoy.count,
        bonos: { es_dia: esDiaBonos, dia_pago: diaPagoBonos, empleados: empleadosActivos },
        pedidosActivos,
        totalPendientes: sinFichaCosto.count + comprasPendientesPago.count + comprasPendientesStock.count + stockBajo.count,
        promocionesActivas: 0,
        impuestos: {
          pendientes: impuestosPendientes.cantidad,
          monto: impuestosPendientes.monto_total,
          dias: diasParaVencimiento,
          proximo_vencimiento: impuestosPendientes.proximo_vencimiento
        },
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