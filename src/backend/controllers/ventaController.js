const { getDb } = require('../models/db');

const ventaController = {

  // ============================================
  // TURNOS
  // ============================================

  // GET /api/ventas/turno-actual
  turnoActual: async (req, res, next) => {
    try {
      const db = await getDb();
      const turno = await db.get(`
        SELECT t.*, u.nombre_completo as vendedor_nombre
        FROM turnos t
        JOIN usuarios u ON t.vendedor_id = u.id
        WHERE t.estado = 'abierto'
        ORDER BY t.abierto_at DESC
        LIMIT 1
      `);

      if (!turno) {
        return res.json({ abierto: false });
      }

      // Calcular ventas del turno
      const ventas = await db.get(`
        SELECT 
          COUNT(*) as total_ventas,
          SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END) as total_efectivo,
          SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END) as total_tarjeta,
          SUM(total) as total_general
        FROM ventas
        WHERE turno_id = ? AND estado = 'completada'
      `, [turno.id]);

      turno.ventas = ventas;
      turno.abierto = true;

      res.json(turno);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/ventas/abrir-turno
  abrirTurno: async (req, res, next) => {
    try {
      const db = await getDb();
      const { vendedor_id, monto_apertura } = req.body;
      const usuario_id = req.usuario?.id || 1;

      // Verificar que no haya turno abierto
      const turnoAbierto = await db.get("SELECT id FROM turnos WHERE estado = 'abierto'");
      if (turnoAbierto) {
        return res.status(400).json({ error: 'Ya hay un turno abierto. Ciérrelo primero.' });
      }

      const result = await db.run(`
        INSERT INTO turnos (vendedor_id, monto_apertura)
        VALUES (?, ?)
      `, [vendedor_id || usuario_id, monto_apertura]);

      res.status(201).json({
        id: result.lastID,
        message: 'Turno abierto correctamente'
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/ventas/cerrar-turno
  cerrarTurno: async (req, res, next) => {
    try {
      const db = await getDb();
      const { monto_real, desglose } = req.body;

      const turno = await db.get("SELECT * FROM turnos WHERE estado = 'abierto'");
      if (!turno) {
        return res.status(400).json({ error: 'No hay turno abierto' });
      }

      // Calcular monto esperado (ventas en efectivo)
      const ventas = await db.get(`
        SELECT SUM(total) as total_efectivo
        FROM ventas
        WHERE turno_id = ? AND metodo_pago = 'efectivo' AND estado = 'completada'
      `, [turno.id]);

      const montoEsperado = (turno.monto_apertura || 0) + (ventas?.total_efectivo || 0);
      const diferencia = (monto_real || 0) - montoEsperado;

      await db.run(`
        UPDATE turnos 
        SET estado = 'cerrado', 
            monto_cierre_esperado = ?,
            monto_cierre_real = ?,
            diferencia = ?,
            cerrado_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [montoEsperado, monto_real, diferencia, turno.id]);

      res.json({
        message: 'Turno cerrado correctamente',
        monto_esperado: montoEsperado,
        monto_real: monto_real,
        diferencia: diferencia
      });
    } catch (error) {
      next(error);
    }
  },

  // ============================================
  // VENTAS
  // ============================================
  // POST /api/ventas
  crearVenta: async (req, res, next) => {
    try {
      const db = await getDb();
      const { detalles, metodo_pago } = req.body;
      const usuario_id = req.usuario?.id || 1;

      // Verificar turno abierto
      const turno = await db.get("SELECT id FROM turnos WHERE estado = 'abierto'");
      if (!turno) {
        return res.status(400).json({ error: 'No hay turno abierto. Abra un turno primero.' });
      }

      // Obtener impuesto y redondeo de configuración
      const config = await db.get('SELECT redondeo_venta, impuesto_ventas FROM configuracion_general WHERE id = 1');
      const impuestoRate = (config.impuesto_ventas) / 100;
      const REDONDEO = config.redondeo_venta;

      // Variables para la respuesta
      let ventaId, totalExacto, impuesto, totalRedondeado, ajusteRedondeo;

      // Validar stock y calcular totalExacto (fuera de transacción)
      totalExacto = 0;
      for (const d of detalles) {
        const producto = await db.get(
          'SELECT id, nombre, precio_venta, stock_actual, tipo, requiere_preparacion FROM productos WHERE id = ? AND activo = 1',
          [d.producto_id]
        );
        if (!producto) throw new Error(`Producto no encontrado: ${d.producto_id}`);
        if (producto.stock_actual < d.cantidad) throw new Error(`Stock insuficiente para: ${producto.nombre}`);
        totalExacto += d.cantidad * producto.precio_venta;
      }

      impuesto = totalExacto * impuestoRate;
      const subtotalExacto = totalExacto - impuesto;
      totalRedondeado = REDONDEO > 0 ? Math.ceil(totalExacto / REDONDEO) * REDONDEO : totalExacto;
      ajusteRedondeo = totalRedondeado - totalExacto;

      // TRANSACCIÓN
      await db.run('BEGIN TRANSACTION');

      try {
        // Insertar venta
        const result = await db.run(`
        INSERT INTO ventas (turno_id, vendedor_id, subtotal, impuesto, total, ajuste_redondeo, metodo_pago)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [turno.id, usuario_id, subtotalExacto, impuesto, totalRedondeado, ajusteRedondeo, metodo_pago]);

        ventaId = result.lastID;

        // UN SOLO BUCLE para insertar detalles y descontar stock
        for (const d of detalles) {
          const producto = await db.get(`
          SELECT p.id, p.nombre, p.tipo, p.requiere_preparacion, p.precio_venta, uv.abreviatura as unidad_abrev
          FROM productos p
          JOIN unidades uv ON p.unidad_venta_id = uv.id
          WHERE p.id = ?
        `, [d.producto_id]);

          if (!producto) throw new Error(`Producto no encontrado: ${d.producto_id}`);

          // 1. Insertar detalle de venta
          await db.run(`
          INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, total)
          VALUES (?, ?, ?, ?, ?)
        `, [ventaId, d.producto_id, d.cantidad, producto.precio_venta, d.cantidad * producto.precio_venta]);

          // 2. Descontar stock según tipo
          if (producto.tipo === 'compuesto' && !producto.requiere_preparacion) {
            // ============================================
            // COMPUESTO NO PREPARABLE
            // Descontar componentes según la receta
            // ============================================
            const receta = await db.all(`
            SELECT r.producto_hijo_id, r.cantidad, uv.abreviatura as unidad_abrev
            FROM recetas r
            JOIN productos pr ON r.producto_hijo_id = pr.id
            JOIN unidades uv ON pr.unidad_venta_id = uv.id
            WHERE r.producto_padre_id = ?
          `, [d.producto_id]);

            if (receta.length === 0) {
              throw new Error(`"${producto.nombre}" no tiene receta definida`);
            }

            const esUnidad = producto.unidad_abrev === 'ud' || producto.unidad_abrev === 'Unidad';

            for (const componente of receta) {
              let cantidadADescontar;

              if (!esUnidad && componente.unidad_abrev === producto.unidad_abrev) {
                cantidadADescontar = componente.cantidad * d.cantidad;
              } else if (!esUnidad) {
                cantidadADescontar = componente.cantidad;
              } else {
                cantidadADescontar = componente.cantidad * d.cantidad;
              }

              const stockComponente = await db.get(
                'SELECT stock_actual, nombre FROM productos WHERE id = ?',
                [componente.producto_hijo_id]
              );

              if (!stockComponente || stockComponente.stock_actual < cantidadADescontar) {
                throw new Error(
                  `Stock insuficiente de "${stockComponente?.nombre || 'componente'}" ` +
                  `para vender ${d.cantidad} ${producto.unidad_abrev} de "${producto.nombre}". ` +
                  `Necesita: ${cantidadADescontar} ${componente.unidad_abrev}, Hay: ${stockComponente?.stock_actual || 0} ${componente.unidad_abrev}`
                );
              }

              await db.run(
                'UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?',
                [cantidadADescontar, componente.producto_hijo_id]
              );

              await db.run(`
              INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id, observaciones)
              VALUES (?, 'venta', ?, ?, ?, ?)
            `, [componente.producto_hijo_id, -cantidadADescontar, ventaId, usuario_id,
              `Venta de ${d.cantidad} ${producto.unidad_abrev} de "${producto.nombre}"`]);
            }

          } else {
            // ============================================
            // SIMPLE O COMPUESTO PREPARABLE
            // ============================================
            const stockActual = await db.get(
              'SELECT stock_actual FROM productos WHERE id = ?',
              [d.producto_id]
            );

            if (!stockActual || stockActual.stock_actual < d.cantidad) {
              throw new Error(
                `Stock insuficiente de "${producto.nombre}". ` +
                `Necesita: ${d.cantidad} ${producto.unidad_abrev}, Hay: ${stockActual?.stock_actual || 0} ${producto.unidad_abrev}`
              );
            }

            await db.run(
              'UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?',
              [d.cantidad, d.producto_id]
            );

            await db.run(`
            INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id)
            VALUES (?, 'venta', ?, ?, ?)
          `, [d.producto_id, -d.cantidad, ventaId, usuario_id]);
          }
        }

        await db.run('COMMIT');

      } catch (innerError) {
        try { await db.run('ROLLBACK'); } catch (e) { /* ignorar */ }
        throw innerError;
      }

      // Respuesta FUERA de la transacción
      res.status(201).json({
        id: ventaId,
        subtotal: subtotalExacto,
        impuesto,
        total: totalRedondeado,
        ajuste_redondeo: ajusteRedondeo,
        message: 'Venta registrada correctamente'
      });

    } catch (error) {
      console.error('Error en crear venta:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/ventas
  listarVentas: async (req, res, next) => {
    try {
      const db = await getDb();
      const { inicio, fin, metodo_pago, busqueda } = req.query;

      let query = `
      SELECT v.*, u.nombre_completo as vendedor_nombre
      FROM ventas v
      LEFT JOIN usuarios u ON v.vendedor_id = u.id
      WHERE 1=1
    `;
      const params = [];

      if (inicio && fin) {
        query += ' AND v.created_at >= ? AND v.created_at <= ?';
        params.push(inicio, fin);
      }

      if (metodo_pago && metodo_pago !== 'todas') {
        query += ' AND v.metodo_pago = ?';
        params.push(metodo_pago);
      }

      if (busqueda) {
        query += ' AND (CAST(v.id AS TEXT) LIKE ? OR u.nombre_completo LIKE ?)';
        params.push(`%${busqueda}%`, `%${busqueda}%`);
      }

      query += ' ORDER BY v.created_at DESC LIMIT 100';

      const ventas = await db.all(query, params);
      res.json(ventas);

    } catch (error) {
      next(error);
    }
  },

  // GET /api/ventas/:id
  obtenerVenta: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      const venta = await db.get(`
        SELECT v.*, u.nombre_completo as vendedor_nombre
        FROM ventas v
        LEFT JOIN usuarios u ON v.vendedor_id = u.id
        WHERE v.id = ?
      `, [id]);

      if (!venta) {
        return res.status(404).json({ error: 'Venta no encontrada' });
      }

      venta.detalles = await db.all(`
        SELECT vd.*, p.nombre as producto_nombre, p.codigo
        FROM venta_detalles vd
        JOIN productos p ON vd.producto_id = p.id
        WHERE vd.venta_id = ?
      `, [id]);

      res.json(venta);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/ventas/resumen-turno/:id
  resumenTurno: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      const turno = await db.get(`
        SELECT t.*, u.nombre_completo as vendedor_nombre, (julianday(COALESCE(t.cerrado_at, datetime('now'))) - julianday(t.abierto_at)) * 24 as horas
        FROM turnos t
        JOIN usuarios u ON t.vendedor_id = u.id
        WHERE t.id = ?
      `, [id]);

      if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

      // Ventas por método de pago
      const ventasPorMetodo = await db.all(`
        SELECT metodo_pago, COUNT(*) as cantidad, SUM(total) as total
        FROM ventas WHERE turno_id = ? AND estado = 'completada'
        GROUP BY metodo_pago
      `, [id]);

      // Productos vendidos
      const productosVendidos = await db.all(`
        SELECT p.nombre, SUM(vd.cantidad) as cantidad_total, uv.abreviatura, SUM(vd.total) as total_vendido, pc.costo_base,pc.gastos_fijos
        FROM venta_detalles vd
        JOIN ventas v ON vd.venta_id = v.id
        JOIN productos p ON vd.producto_id = p.id
        JOIN unidades uv ON p.unidad_venta_id = uv.id
        LEFT JOIN producto_costos pc ON p.id = pc.producto_id
        WHERE v.turno_id = ? AND v.estado = 'completada'
        GROUP BY p.id ORDER BY total_vendido DESC
      `, [id]);

      // Totales de ventas
      const totales = await db.get(`
        SELECT 
          COUNT(*) as total_ventas,
          SUM(subtotal) as venta_neta,
          SUM(impuesto) as impuesto,
          SUM(COALESCE(ajuste_redondeo, 0)) as ajuste_redondeo,
          SUM(total) as total_cobrado
        FROM ventas WHERE turno_id = ? AND estado = 'completada'
      `, [id]);

      // Costo de ventas
      const costoVentas = {
        gastos_base: 0,
        gastos_fijos: 0
      };
      productosVendidos.forEach(p => {
        const cb = p.costo_base * p.cantidad_total;
        costoVentas.gastos_base += cb;
        costoVentas.gastos_fijos += (cb / (1 - p.gastos_fijos / 100)) - cb;
      });

      // Configuración
      const config = await db.get('SELECT * FROM configuracion_general WHERE id = 1');

      // Cálculos financieros
      const f = {
        ventaTotal: totales.venta_neta + totales.impuesto,
        impuestos: totales.impuesto,
        ventaNeta: totales.venta_neta,
        ajusteRedondeo: totales.ajuste_redondeo,
        totalCobrado: totales.total_cobrado,
        costoBase: costoVentas.gastos_base,
        gastosFijos: costoVentas.gastos_fijos,
        margen: 0,
        gananciaNeta: 0
      };

      f.margen = f.ventaNeta - f.costoBase - f.gastosFijos;
      f.gananciaNeta = f.margen + f.ajusteRedondeo;

      res.json({
        turno,
        ventasPorMetodo,
        totales,
        productosVendidos,
        financiero: f
      });

    } catch (error) {
      next(error);
    }
  }
};

module.exports = ventaController;