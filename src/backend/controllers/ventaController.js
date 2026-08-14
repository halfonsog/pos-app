const { getDb } = require('../models/db');
const costos = require('../utils/costos');

// Dinero del turno por moneda (CUP/USD) y cuenta (efectivo/banco):
//   ventas minoristas del turno + cobros mayoristas del turno + movimientos del turno.
async function dineroPorMoneda(db, turno) {
  const res = { CUP: { efectivo: 0, banco: 0 }, USD: { efectivo: 0, banco: 0 } };

  // Ventas minoristas del turno (efectivo → caja; tarjeta → banco). Solo CUP.
  const ventas = await db.all(`
    SELECT metodo_pago, COALESCE(SUM(total), 0) AS total
    FROM ventas WHERE turno_id = ? AND estado = 'completada'
    GROUP BY metodo_pago
  `, [turno.id]);
  for (const v of ventas) {
    if (v.metodo_pago === 'efectivo') res.CUP.efectivo += v.total;
    else if (v.metodo_pago === 'tarjeta') res.CUP.banco += v.total;
  }

  // Cobros de pedidos (mayoristas y encargos) dentro del turno, por método y moneda.
  const cobros = await db.all(`
    SELECT pp.metodo_pago, pp.moneda, COALESCE(SUM(pp.monto), 0) AS total
    FROM pagos_pedido pp
    WHERE pp.created_at >= ? AND pp.created_at <= COALESCE(?, CURRENT_TIMESTAMP)
    GROUP BY pp.metodo_pago, pp.moneda
  `, [turno.abierto_at, turno.cerrado_at]);
  for (const c of cobros) {
    const mon = c.moneda === 'USD' ? 'USD' : 'CUP';
    if (c.metodo_pago === 'efectivo') res[mon].efectivo += c.total;
    else if (c.metodo_pago === 'tarjeta' || c.metodo_pago === 'transferencia') res[mon].banco += c.total;
  }

  // Movimientos bancarios (depósitos/retiros/compra efectivo) dentro del turno.
  const movs = await db.all(`
    SELECT tipo, cuenta, moneda, COALESCE(SUM(monto), 0) AS total
    FROM movimientos_bancarios
    WHERE fecha >= date(?) AND fecha <= COALESCE(date(?), date('now', 'localtime'))
    GROUP BY tipo, cuenta, moneda
  `, [turno.abierto_at, turno.cerrado_at]);
  for (const m of movs) {
    const mon = m.moneda === 'USD' ? 'USD' : 'CUP';
    if (m.tipo === 'retiro' || m.tipo === 'compra_efectivo') res[mon][m.cuenta || 'efectivo'] -= m.total;
    else if (m.tipo === 'deposito') res[mon][m.cuenta || 'banco'] += m.total;
  }

  res.CUP.efectivo = Math.round(res.CUP.efectivo * 100) / 100;
  res.CUP.banco = Math.round(res.CUP.banco * 100) / 100;
  res.USD.efectivo = Math.round(res.USD.efectivo * 100) / 100;
  res.USD.banco = Math.round(res.USD.banco * 100) / 100;
  return res;
}

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
      // Un vendedor solo puede abrir turno a su nombre; un admin puede indicar otro vendedor
      const esAdmin = req.usuario.rol === 'admin';
      const vendedorTurno = (esAdmin && vendedor_id) ? vendedor_id : req.usuario.id;

      // Verificar que no haya turno abierto
      const turnoAbierto = await db.get("SELECT id FROM turnos WHERE estado = 'abierto'");
      if (turnoAbierto) {
        return res.status(400).json({ error: 'Ya hay un turno abierto. Ciérrelo primero.' });
      }

      const result = await db.run(`
        INSERT INTO turnos (vendedor_id, monto_apertura)
        VALUES (?, ?)
      `, [vendedorTurno, monto_apertura]);

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

      // Calcular monto esperado (ventas en efectivo + cobros mayoristas en efectivo del turno)
      const ventas = await db.get(`
        SELECT SUM(total) as total_efectivo
        FROM ventas
        WHERE turno_id = ? AND metodo_pago = 'efectivo' AND estado = 'completada'
      `, [turno.id]);

      // Cobros mayoristas en efectivo registrados durante este turno (caja física compartida)
      const cobrosMayoristas = await db.get(`
        SELECT COALESCE(SUM(pp.monto), 0) AS total
        FROM pagos_pedido pp
        WHERE pp.metodo_pago = 'efectivo'
          AND pp.created_at >= ? AND pp.created_at <= COALESCE(?, CURRENT_TIMESTAMP)
      `, [turno.abierto_at, turno.cerrado_at]);

      const montoEsperado = (turno.monto_apertura || 0) + (ventas?.total_efectivo || 0) + (cobrosMayoristas?.total || 0);
      const diferencia = (monto_real || 0) - montoEsperado;

      await db.run('BEGIN TRANSACTION');
      try {
        await db.run(`
          UPDATE turnos 
          SET estado = 'cerrado', 
              monto_cierre_esperado = ?,
              monto_cierre_real = ?,
              diferencia = ?,
              cerrado_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [montoEsperado, monto_real, diferencia, turno.id]);

        // B14: persistir el arqueo (desglose por denominaciones) si viene
        if (Array.isArray(desglose) && desglose.length > 0) {
          for (const d of desglose) {
            const valor = parseFloat(d.valor);
            const cantidad = parseFloat(d.cantidad) || 0;
            if (!isNaN(valor) && cantidad > 0) {
              await db.run(`
                INSERT INTO arqueos (turno_id, valor, cantidad, subtotal)
                VALUES (?, ?, ?, ?)
              `, [turno.id, valor, cantidad, Math.round(valor * cantidad * 100) / 100]);
            }
          }
        }

        await db.run('COMMIT');
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }

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

      // Tipo de venta asignado al vendedor (propietario): 'minorista'|'mayorista'|'ambas'
      if (req.usuario?.rol === 'vendedor') {
        const u = await db.get('SELECT tipo_venta FROM usuarios WHERE id = ?', [usuario_id]);
        if (u && !['minorista', 'ambas'].includes(u.tipo_venta || 'ambas')) {
          return res.status(403).json({ error: 'No tienes asignado el tipo de venta minorista' });
        }
      }

      // Verificar turno abierto
      const turno = await db.get("SELECT id FROM turnos WHERE estado = 'abierto'");
      if (!turno) {
        return res.status(400).json({ error: 'No hay turno abierto. Abra un turno primero.' });
      }

      // Obtener impuesto y redondeo de configuración
      const config = await db.get('SELECT redondeo_venta, impuesto_ventas FROM configuracion_contabilidad WHERE id = 1');
      const impuestoRate = (config.impuesto_ventas) / 100;
      const REDONDEO = config.redondeo_venta;

      // Calcular total exacto (el precio de venta YA incluye el impuesto — regla del propietario).
      totalExacto = 0;
      for (const d of detalles) {
        const producto = await db.get(
          'SELECT id, nombre, precio_venta, stock_actual, tipo, sub_tipo FROM productos WHERE id = ? AND activo = 1',
          [d.producto_id]
        );
        if (!producto) throw new Error(`Producto no encontrado: ${d.producto_id}`);

        // Verificar stock según tipo de producto
        if (producto.tipo === 'compuesto' && producto.sub_tipo === 'conformado') {
          // Para compuestos no preparables, verificar stock de componentes
          const receta = await db.all(`
            SELECT pr.stock_actual, r.cantidad, pr.nombre
            FROM recetas r
            JOIN productos pr ON r.producto_hijo_id = pr.id
            WHERE r.producto_padre_id = ?
          `, [d.producto_id]);
          for (const c of receta) {
            if (c.stock_actual < c.cantidad * d.cantidad) {
              throw new Error(`Stock insuficiente de "${c.nombre}" para vender "${producto.nombre}"`);
            }
          }
        } else {
          // Para simples y compuestos preparables
          if (producto.stock_actual < d.cantidad) {
            throw new Error(`Stock insuficiente para: ${producto.nombre}`);
          }
        }

        totalExacto += d.cantidad * producto.precio_venta;
      }

      // Regla del propietario (2026-08-12): el impuesto es el % (impuesto_ventas) del PRECIO
      // DE VENTA. precio_venta incluye el impuesto. Impuesto = total × tasa; neto = total − impuesto.
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
          SELECT p.id, p.nombre, p.tipo, p.sub_tipo, p.precio_venta, uv.abreviatura as unidad_abrev
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
          if (producto.tipo === 'compuesto' && producto.sub_tipo === 'conformado') {
            // ============================================
            // COMPUESTO CONFORMADO (se arma en la venta)
            // Descontar componentes según la receta
            // ============================================
            const receta = await db.all(`
              SELECT r.producto_hijo_id, r.cantidad, uv.abreviatura as unidad_abrev, uv.tipo as unidad_tipo
              FROM recetas r
              JOIN productos pr ON r.producto_hijo_id = pr.id
              JOIN unidades uv ON pr.unidad_venta_id = uv.id
              WHERE r.producto_padre_id = ?
            `, [d.producto_id]);

            if (receta.length === 0) {
              throw new Error(`"${producto.nombre}" no tiene receta definida`);
            }

            // Obtener el tipo de unidad del producto
            const productoInfo = await db.get(`
              SELECT uv.tipo as unidad_tipo
              FROM productos p
              JOIN unidades uv ON p.unidad_venta_id = uv.id
              WHERE p.id = ?
            `, [d.producto_id]);

            const esUnidad = productoInfo?.unidad_tipo === 'unidad';

            for (const componente of receta) {
              let cantidadADescontar;

              if (!esUnidad && componente.unidad_tipo === productoInfo.unidad_tipo) {
                // ✅ Mismo tipo → multiplicar
                cantidadADescontar = componente.cantidad * d.cantidad;
              } else if (!esUnidad) {
                // ✅ Diferente tipo → solo un paquete
                cantidadADescontar = componente.cantidad;
              } else {
                // ✅ Unidad → multiplicar
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
              INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id, observaciones)
              VALUES (?, 'venta', ?, ?, ?, ?)
            `, [d.producto_id, -d.cantidad, ventaId, usuario_id, `Venta de ${d.cantidad} ${producto.unidad_abrev} de "${producto.nombre}"`]);
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
      const usuario_id = req.usuario?.id;
      const isAdmin = req.usuario?.rol === 'admin';

      let query = `
        SELECT v.*, u.nombre_completo as vendedor_nombre, c.nombre as cliente_nombre
        FROM ventas v
        LEFT JOIN usuarios u ON v.vendedor_id = u.id
        LEFT JOIN clientes c ON v.cliente_id = c.id
        WHERE 1=1
      `;
      const params = [];

      // Filtro por tipo de venta (minorista/mayorista)
      if (req.query.tipo_venta && req.query.tipo_venta !== 'todas') {
        query += ' AND v.tipo_venta = ?';
        params.push(req.query.tipo_venta);
      }

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

      // El vendedor solo ve sus propias ventas; el admin las ve todas
      if (!isAdmin) {
        query += ' AND v.vendedor_id = ?';
        params.push(usuario_id);
      }

      // Límite configurable (por defecto 1000, máximo 5000) — D13
      const limite = Math.min(parseInt(req.query.limite) || 1000, 5000);
      query += ' ORDER BY v.created_at DESC LIMIT ?';
      params.push(limite);

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
        SELECT p.nombre, SUM(vd.cantidad) as cantidad_total, uv.abreviatura as unidad_venta_abrev, uv.tipo as unidad_venta_tipo, SUM(vd.total) as total_vendido, p.costo_base
        FROM venta_detalles vd
        JOIN ventas v ON vd.venta_id = v.id
        JOIN productos p ON vd.producto_id = p.id
        JOIN unidades uv ON p.unidad_venta_id = uv.id
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

      // % de gastos global (fórmula del propietario, D3)
      const params = await costos.obtenerParametros(db);

      // Costo de ventas
      const costoVentas = {
        gastos_base: 0,
        gastos_fijos: 0
      };
      productosVendidos.forEach(p => {
        const cb = p.costo_base * p.cantidad_total;
        costoVentas.gastos_base += cb;
        costoVentas.gastos_fijos += cb * params.pctGastos; // multiplicativa (propietario)
      });

      // Configuración
      const config = await db.get('SELECT * FROM configuracion_contabilidad WHERE id = 1');

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
        gananciaBruta: 0
      };

      f.margen = f.ventaNeta - f.costoBase - f.gastosFijos;
      f.gananciaBruta = f.margen + f.ajusteRedondeo;

      // Desglose del recaudado por prioridades (00-pendientes #3)
      // Período del turno: desde apertura hasta cierre (o ahora si sigue abierto)
      // Modo operativo: el cierre de turno NO aplica el porciento a declarar
      const inicioTurno = turno.abierto_at;
      const finTurno = turno.cerrado_at || new Date().toISOString().replace('T', ' ').slice(0, 19);
      const desglose = await costos.desglosePrioridades(db, inicioTurno, finTurno, { operativo: true });

      res.json({
        turno,
        ventasPorMetodo,
        totales,
        productosVendidos,
        financiero: f,
        desglose_prioridades: desglose,
        por_moneda: await dineroPorMoneda(db, turno)
      });

    } catch (error) {
      next(error);
    }
  },

  // GET /api/ventas/mi-turno
  miTurno: async (req, res, next) => {
    try {
      const db = await getDb();
      const usuario_id = req.usuario?.id || 1;

      const turno = await db.get(`
      SELECT * FROM turnos 
      WHERE vendedor_id = ? AND estado = 'abierto'
      ORDER BY abierto_at DESC LIMIT 1
    `, [usuario_id]);

      if (!turno) {
        return res.json({ abierto: false });
      }

      const ventas = await db.get(`
      SELECT COUNT(*) as total_ventas, COALESCE(SUM(total), 0) as total
      FROM ventas WHERE turno_id = ? AND estado = 'completada'
    `, [turno.id]);

      const ultimasVentas = await db.all(`
      SELECT id, total, metodo_pago, created_at
      FROM ventas WHERE turno_id = ? AND estado = 'completada'
      ORDER BY created_at DESC LIMIT 5
    `, [turno.id]);

      const masVendidos = await db.all(`
      SELECT p.nombre, SUM(vd.cantidad) as cantidad
      FROM venta_detalles vd
      JOIN ventas v ON vd.venta_id = v.id
      JOIN productos p ON vd.producto_id = p.id
      WHERE v.turno_id = ? AND v.estado = 'completada'
      GROUP BY p.id ORDER BY cantidad DESC LIMIT 5
    `, [turno.id]);

      res.json({
        abierto: true,
        turno,
        ventas,
        ultimasVentas,
        masVendidos
      });

    } catch (error) {
      next(error);
    }
  },

  // POST /api/ventas/:id/anular
  anularVenta: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const usuario_id = req.usuario?.id || 1;
      const usuario = req.usuario?.username || 'sistema';

      // Verificar que existe y no está anulada
      const venta = await db.get('SELECT * FROM ventas WHERE id = ?', [id]);
      if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
      if (venta.estado === 'anulada') return res.status(400).json({ error: 'Venta ya anulada' });

      await db.run('BEGIN TRANSACTION');

      try {
        // Cambiar estado
        await db.run('UPDATE ventas SET estado = ? WHERE id = ?', ['anulada', id]);

        // Devolver stock de cada producto
        const detalles = await db.all(`
        SELECT vd.producto_id, vd.cantidad, p.nombre, p.tipo, p.sub_tipo
        FROM venta_detalles vd
        JOIN productos p ON vd.producto_id = p.id
        WHERE vd.venta_id = ?
      `, [id]);

        for (const d of detalles) {
          if (d.tipo === 'compuesto' && d.sub_tipo === 'conformado') {
            // Para conformados, devolver stock a los componentes
            const receta = await db.all(`
            SELECT producto_hijo_id, cantidad, pr.nombre
            FROM recetas r
            JOIN productos pr ON r.producto_hijo_id = pr.id
            WHERE r.producto_padre_id = ?
          `, [d.producto_id]);

            for (const c of receta) {
              const cantidadDev = c.cantidad * d.cantidad;
              await db.run('UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
                [cantidadDev, c.producto_hijo_id]);

              await db.run(`
              INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id, observaciones)
              VALUES (?, 'devolucion', ?, ?, ?, ?)
            `, [c.producto_hijo_id, cantidadDev, id, usuario_id,
              `Devolución venta #${id} - "${d.nombre}" (componente)`]);
            }
          } else {
            // Para simples y preparables
            await db.run('UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
              [d.cantidad, d.producto_id]);

            await db.run(`
            INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id, observaciones)
            VALUES (?, 'devolucion', ?, ?, ?, ?)
          `, [d.producto_id, d.cantidad, id, usuario_id,
            `Devolución venta #${id} - "${d.nombre}"`]);
          }
        }

        await db.run('COMMIT');

        const { log } = require('../utils/logger');
        log('ANULAR', 'venta', id, usuario, `Venta anulada por ${usuario}`);

        res.json({ message: 'Venta anulada correctamente. Stock devuelto.' });

      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error anulando venta:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = ventaController;