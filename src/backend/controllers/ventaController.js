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
      const usuario_id = 1; // TODO: Obtener del token

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
      const usuario_id = 1; // TODO: Obtener del token

      // Verificar turno abierto
      const turno = await db.get("SELECT id FROM turnos WHERE estado = 'abierto'");
      if (!turno) {
        return res.status(400).json({ error: 'No hay turno abierto. Abra un turno primero.' });
      }

      // Obtener impuesto de configuración
      const config = await db.get('SELECT impuesto_ventas FROM configuracion_general WHERE id = 1');
      const impuestoPorcentaje = (config.impuesto_ventas) / 100;

      await db.run('BEGIN TRANSACTION');

      try {
        let subtotal = 0;

        // Validar stock y calcular subtotal
        for (const d of detalles) {
          const producto = await db.get(
            'SELECT id, nombre, precio_venta, stock_actual, tipo FROM productos WHERE id = ? AND activo = 1',
            [d.producto_id]
          );

          if (!producto) throw new Error(`Producto no encontrado: ${d.producto_id}`);
          if (producto.stock_actual < d.cantidad) throw new Error(`Stock insuficiente para: ${producto.nombre}`);

          subtotal += d.cantidad * producto.precio_venta;
        }

        const impuesto = subtotal * impuestoPorcentaje;
        const total = subtotal + impuesto;

        // Insertar venta
        const result = await db.run(`
          INSERT INTO ventas (turno_id, vendedor_id, subtotal, impuesto, total, metodo_pago)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [turno.id, usuario_id, subtotal, impuesto, total, metodo_pago]);

        const ventaId = result.lastID;

        // Insertar detalles y descontar stock
        for (const d of detalles) {
          const producto = await db.get('SELECT precio_venta FROM productos WHERE id = ?', [d.producto_id]);

          await db.run(`
            INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, total)
            VALUES (?, ?, ?, ?, ?)
          `, [ventaId, d.producto_id, d.cantidad, producto.precio_venta, d.cantidad * producto.precio_venta]);

          // ***************************************************
          // Descontar stock según tipo de producto
          // ***************************************************
          for (const d of detalles) {
            const producto = await db.get(`
              SELECT p.id, p.nombre, p.tipo, p.requiere_preparacion, p.precio_venta, uv.abreviatura as unidad_abrev
              FROM productos p
              JOIN unidades uv ON p.unidad_venta_id = uv.id
              WHERE p.id = ?
            `, [d.producto_id]);

            if (!producto) throw new Error(`Producto no encontrado: ${d.producto_id}`);

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
                  // Misma unidad que el producto → multiplicar por cantidad vendida (peso/volumen)
                  cantidadADescontar = componente.cantidad * d.cantidad;
                } else if (!esUnidad) {
                  // Diferente unidad → solo un paquete/envoltura
                  cantidadADescontar = componente.cantidad;
                } else {
                  // Producto se vende por Unidad → multiplicar por unidades vendidas
                  cantidadADescontar = componente.cantidad * d.cantidad;
                }

                // Verificar stock del componente
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

                // Descontar componente
                await db.run(
                  'UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?',
                  [cantidadADescontar, componente.producto_hijo_id]
                );

                // Registrar movimiento
                await db.run(`
                  INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id, observaciones)
                  VALUES (?, 'venta', ?, ?, ?, ?)
                `, [componente.producto_hijo_id, -cantidadADescontar, ventaId, usuario_id,
                `Venta de ${d.cantidad} ${producto.unidad_abrev} de "${producto.nombre}"`]);
              }

            } else {
              // ============================================
              // SIMPLE O COMPUESTO PREPARABLE
              // Descontar el producto mismo
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

              // Registrar movimiento
              await db.run(`
                INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id)
                VALUES (?, 'venta', ?, ?, ?)
              `, [d.producto_id, -d.cantidad, ventaId, usuario_id]);
            }
          }
          await db.run(`
            INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id)
            VALUES (?, 'venta', ?, ?, ?)
          `, [d.producto_id, -d.cantidad, ventaId, usuario_id]);
        }

        await db.run('COMMIT');

        res.status(201).json({
          id: ventaId,
          subtotal,
          impuesto,
          total,
          message: 'Venta registrada correctamente'
        });

      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error en crear venta:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/ventas
  listarVentas: async (req, res, next) => {
    try {
      const db = await getDb();

      const ventas = await db.all(`
        SELECT v.*, u.nombre_completo as vendedor_nombre
        FROM ventas v
        LEFT JOIN usuarios u ON v.vendedor_id = u.id
        ORDER BY v.created_at DESC
        LIMIT 100
      `);

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
  }
};

module.exports = ventaController;