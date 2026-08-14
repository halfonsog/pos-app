const { getDb } = require('../models/db');
const costos = require('../utils/costos');

// D36: valida la coherencia fiscal de una compra:
//  · NO se pueden mezclar productos gravables y no gravables en la MISMA compra
//    (regla del propietario: la línea informal va por separado).
//  · Una compra CON factura no puede contener productos no gravables.
// Devuelve { error } o null si la guarda pasa.
async function validarCoherenciaFiscalCompra(db, detalles, codigoFactura) {
  if (!detalles || detalles.length === 0) return null;
  const idsNoGrav = await costos.idsNoGravables(db);
  if (idsNoGrav.length === 0) return null;

  const placeholders = idsNoGrav.map(() => '?').join(',');
  const cols = await db.all(`
    SELECT p.id, p.nombre
    FROM productos p
    WHERE p.categoria_id IN (${placeholders})
  `, idsNoGrav);

  if (cols.length === 0) return null;
  const noGravSet = new Set(cols.map(c => c.id));
  const nombreNoGrav = new Map(cols.map(c => [c.id, c.nombre]));

  let hayNoGrav = false;
  let hayGrav = false;
  let primerNoGrav = null;
  let primerGrav = null;

  for (const d of detalles) {
    const pid = Number(d.producto_id);
    if (noGravSet.has(pid)) {
      hayNoGrav = true;
      if (!primerNoGrav) primerNoGrav = nombreNoGrav.get(pid);
    } else {
      hayGrav = true;
      if (!primerGrav) {
        const p = await db.get('SELECT nombre FROM productos WHERE id = ?', [pid]);
        primerGrav = p?.nombre || `#${pid}`;
      }
    }
  }

  // Regla del propietario: no mezclar gravables y no gravables en la misma compra
  if (hayNoGrav && hayGrav) {
    return {
      error: `No se puede mezclar en una misma compra productos no gravables ("${primerNoGrav}") con productos gravables ("${primerGrav}"). ` +
             'Registra la compra informal (no gravable) por separado, sin factura.'
    };
  }

  // Compra con factura + no gravables → incoherente
  if (hayNoGrav && codigoFactura) {
    return {
      error: `La compra tiene factura pero incluye el producto no gravable "${primerNoGrav}". ` +
             'Los productos no gravables se compran sin factura (nota interna).'
    };
  }

  return null;
}

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
        ORDER BY c.fecha_compra DESC, c.created_at DESC
      `);

      // Para cada compra, obtener sus detalles
      for (const compra of compras) {
        compra.detalles = await db.all(`
          SELECT 
            cd.*,
            pr.nombre as producto_nombre,
            pr.codigo as producto_codigo,
            pr.categoria_id
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
        pr.categoria_id,
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
      const usuario_id = req.usuario.id; // quién registra la compra (auditoría)

      // D36: coherencia fiscal — no mezclar gravables con no gravables;
      // compra con factura no puede incluir no gravables.
      const incoherencia = await validarCoherenciaFiscalCompra(db, detalles, codigo_factura);
      if (incoherencia) {
        return res.status(400).json({ error: incoherencia.error });
      }

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
          VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?)
        `, [fecha_compra, codigo_factura, proveedor_id, total, pagado || 0, estado_pago, usuario_id]);

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

      // D36: coherencia fiscal — no mezclar gravables con no gravables;
      // compra con factura no puede incluir no gravables.
      const incoherencia = await validarCoherenciaFiscalCompra(db, detalles, codigo_factura);
      if (incoherencia) {
        return res.status(400).json({ error: incoherencia.error });
      }

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

        // B10: recalcular estado_pago según el pagado nuevo (misma lógica que en crear)
        const pagadoNum = pagado || 0;
        let estado_pago = 'pendiente';
        if (pagadoNum >= total) estado_pago = 'pagado';
        else if (pagadoNum > 0) estado_pago = 'parcial';

        // Actualizar compra
        await db.run(`
        UPDATE compras SET fecha_compra = ?, codigo_factura = ?, proveedor_id = ?, total = ?, pagado = ?, estado_pago = ?
        WHERE id = ?
      `, [fecha_compra, codigo_factura, proveedor_id, total, pagadoNum, estado_pago, id]);

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

      // Split opcional entre inventarios (propietario): { distribuciones: { producto_id: cantidad_para_mayorista } }
      // Lo no asignado va al inventario minorista (stock_actual), como siempre.
      const distribuciones = req.body?.distribuciones || {};

      const detalles = await db.all(`
      SELECT producto_id, cantidad, precio_unitario
      FROM compra_detalles 
      WHERE compra_id = ?
    `, [id]);

      await db.run('BEGIN TRANSACTION');

      // Productos cuyo costo cambia en esta compra (para recálculo en cascada D3)
      const productosActualizados = new Set();

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

          let cantidadVentaTotal = d.cantidad;

          if (producto.unidad_compra_id && producto.unidad_venta_id &&
            producto.unidad_compra_id !== producto.unidad_venta_id &&
            producto.coef_compra && producto.coef_venta) {
            const factor = producto.coef_compra / producto.coef_venta;
            cantidadVentaTotal = d.cantidad * factor;
          }

          // Split entre inventarios (por defecto todo a minorista).
          // Mayorista trabaja en unidad de COMPRA (propietario); minorista en unidad de VENTA.
          const factorVenta = cantidadVentaTotal / d.cantidad; // cuántas unidades de venta por unidad de compra
          let cantMayorista = Math.min(parseFloat(distribuciones[d.producto_id]) || 0, d.cantidad); // en unidad de compra
          const cantMinoristaCompra = d.cantidad - cantMayorista; // resto en unidad de compra
          const cantMinoristaVenta = cantMinoristaCompra * factorVenta; // a unidad de venta

          if (cantMinoristaVenta > 0) {
            await db.run(
              'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
              [cantMinoristaVenta, d.producto_id]
            );
            await db.run(`
            INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id, inventario)
            VALUES (?, 'compra', ?, ?, ?, 'minorista')
          `, [d.producto_id, cantMinoristaVenta, id, req.usuario.id]);
          }

          if (cantMayorista > 0) {
            await db.run(
              'UPDATE productos SET stock_mayorista = stock_mayorista + ? WHERE id = ?',
              [cantMayorista, d.producto_id]
            );
            await db.run(`
            INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id, inventario)
            VALUES (?, 'compra', ?, ?, ?, 'mayorista')
          `, [d.producto_id, cantMayorista, id, req.usuario.id]);
          }

          // Actualizar costo del producto (D3: último costo vive en productos.costo_base)
          const precioUnitarioVenta = producto.unidad_compra_id !== producto.unidad_venta_id && producto.coef_compra && producto.coef_venta
            ? d.precio_unitario / (producto.coef_compra / producto.coef_venta)
            : d.precio_unitario;

          await db.run('UPDATE productos SET costo_base = ? WHERE id = ?', [precioUnitarioVenta, d.producto_id]);
          productosActualizados.add(d.producto_id);
        }

        await db.run('UPDATE compras SET estado_inventario = ? WHERE id = ?', ['completado', id]);
        await db.run('COMMIT');

        // Recálculo en cascada: compuestos que usan estos ingredientes (D3)
        for (const pid of productosActualizados) {
          await costos.recalcularPorIngrediente(db, pid);
        }

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

      // Validaciones (B13)
      const montoNum = parseFloat(monto);
      if (!montoNum || montoNum <= 0) {
        return res.status(400).json({ error: 'El monto debe ser mayor que cero' });
      }

      // Obtener compra actual
      const compra = await db.get('SELECT total, pagado FROM compras WHERE id = ?', [id]);

      if (!compra) {
        return res.status(404).json({ error: 'Compra no encontrada' });
      }

      const pendiente = compra.total - (compra.pagado || 0);
      if (montoNum > pendiente + 0.009) {
        return res.status(400).json({ error: `El monto excede lo pendiente (${pendiente.toFixed(2)})` });
      }

      const nuevoPagado = (compra.pagado || 0) + montoNum;
      let estado_pago = 'parcial';
      if (nuevoPagado >= compra.total) {
        estado_pago = 'pagado';
      }

      await db.run(
        'UPDATE compras SET pagado = ?, estado_pago = ? WHERE id = ?',
        [nuevoPagado, estado_pago, id]
      );

      // Movimiento de dinero: soporta CUP y USD, por efectivo o transferencia (m025/m035).
      const { moneda, tasa_cambio } = req.body;
      const mon = moneda === 'USD' ? 'USD' : 'CUP';
      const tasa = parseFloat(tasa_cambio) || 0;
      if (mon === 'USD' && tasa <= 0) {
        return res.status(400).json({ error: 'Indica la tasa de cambio acordada para el pago en USD' });
      }

      if (metodo_pago === 'transferencia') {
        // Sale del banco (CUP o USD)
        await db.run(`
          INSERT INTO movimientos_bancarios (tipo, monto, fecha, descripcion, cuenta, moneda, tasa_cambio, referencia, usuario_id)
          VALUES ('compra_transferencia', ?, date('now', 'localtime'), ?, 'banco', ?, ?, ?, ?)
        `, [montoNum, `Pago compra #${id}`, mon, mon === 'USD' ? tasa : 1, referencia || null, req.usuario.id]);
      } else {
        // Efectivo: sale de la caja de la moneda indicada (compra_efectivo)
        await db.run(`
          INSERT INTO movimientos_bancarios (tipo, monto, fecha, descripcion, cuenta, moneda, tasa_cambio, referencia, usuario_id)
          VALUES ('compra_efectivo', ?, date('now', 'localtime'), ?, 'efectivo', ?, ?, ?, ?)
        `, [montoNum, `Pago compra #${id}`, mon, mon === 'USD' ? tasa : 1, referencia || null, req.usuario.id]);
      }

      res.json({ message: 'Pago registrado exitosamente' });

    } catch (error) {
      console.error('Error en pagar:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = compraController;