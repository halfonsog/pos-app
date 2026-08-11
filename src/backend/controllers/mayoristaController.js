const { getDb } = require('../models/db');

/**
 * Ventas Mayoristas: pedidos, tramos de precio por volumen, pagos, cuentas por cobrar.
 * Diseño: docs/modulos/mayoristas.md
 * - Sin turnos: efectivo → arqueo del turno; tarjeta/transferencia → banco.
 * - Al facturar: asiento en ventas (tipo_venta='mayorista') + descuento de stock_mayorista.
 */

// Precio por tramo de volumen EN UNIDAD DE COMPRA (la unidad de venta mayorista es
// la unidad de compra del producto — regla del propietario).
// Sin tramo: precio_venta (unidad de venta) convertido a unidad de compra.
async function precioPorCantidad(db, productoId, cantidad) {
  const tramo = await db.get(`
    SELECT precio FROM venta_tramos
    WHERE producto_id = ? AND ? >= desde AND (hasta IS NULL OR ? <= hasta)
    ORDER BY desde DESC LIMIT 1
  `, [productoId, cantidad, cantidad]);

  if (tramo) return tramo.precio;

  // Fallback: precio minorista (unidad de venta) → unidad de compra
  const p = await db.get(`
    SELECT p.precio_venta, uc.coeficiente AS coef_compra, uv.coeficiente AS coef_venta
    FROM productos p
    LEFT JOIN unidades uc ON p.unidad_compra_id = uc.id
    LEFT JOIN unidades uv ON p.unidad_venta_id = uv.id
    WHERE p.id = ?
  `, [productoId]);
  if (!p) return 0;
  if (p.coef_compra && p.coef_venta && p.coef_compra !== p.coef_venta) {
    return p.precio_venta * (p.coef_venta / p.coef_compra);
  }
  return p.precio_venta || 0;
}

const mayoristaController = {

  // ══════════════ TRAMOS DE PRECIO ══════════════

  // GET /api/mayoristas/tramos/:productoId — tramos del producto + ficha de costo completa
  listarTramos: async (req, res, next) => {
    try {
      const db = await getDb();
      const producto = await db.get(`
        SELECT p.id, p.codigo, p.nombre, p.costo_base, p.precio_venta, p.precio_recomendado,
               uv.abreviatura AS unidad_venta_abrev, uc.abreviatura AS unidad_compra_abrev
        FROM productos p
        LEFT JOIN unidades uv ON p.unidad_venta_id = uv.id
        LEFT JOIN unidades uc ON p.unidad_compra_id = uc.id
        WHERE p.id = ?
      `, [req.params.productoId]);
      if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

      // Ficha de costo desglosada (fórmula del propietario, multiplicativa)
      const costos = require('../utils/costos');
      const params = await costos.obtenerParametros(db);
      const costoBase = producto.costo_base || 0;
      const gastosMonto = Math.round(costoBase * params.pctGastos * 100) / 100;
      const precioBase = costoBase + gastosMonto;
      const margenMonto = Math.round(precioBase * (params.margen / 100) * 100) / 100;
      const precioNeto = precioBase + margenMonto;
      const impuestoMonto = Math.round(precioNeto * (params.impuesto / 100) * 100) / 100;

      producto.ficha = {
        costo_base: costoBase,
        gastos_monto: gastosMonto,
        pct_gastos: Math.round(params.pctGastos * 10000) / 100,
        precio_base: precioBase,
        margen_monto: margenMonto,
        margen_pct: params.margen,
        precio_neto: precioNeto,
        impuesto_monto: impuestoMonto,
        impuesto_pct: params.impuesto
      };

      const tramos = await db.all(
        'SELECT * FROM venta_tramos WHERE producto_id = ? ORDER BY desde', [req.params.productoId]
      );
      res.json({ producto, tramos });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/mayoristas/tramos/:productoId  { desde, hasta, precio }
  crearTramo: async (req, res, next) => {
    try {
      const db = await getDb();
      const { desde, hasta, precio } = req.body;
      const productoId = req.params.productoId;

      if (!desde || !precio || precio <= 0) {
        return res.status(400).json({ error: 'Desde y precio (> 0) son obligatorios' });
      }
      if (hasta && hasta < desde) {
        return res.status(400).json({ error: 'El tope (hasta) no puede ser menor que el inicio (desde)' });
      }

      await db.run(`
        INSERT INTO venta_tramos (producto_id, desde, hasta, precio) VALUES (?, ?, ?, ?)
        ON CONFLICT(producto_id, desde) DO UPDATE SET hasta = excluded.hasta, precio = excluded.precio
      `, [productoId, desde, hasta || null, precio]);

      res.status(201).json({ message: 'Tramo guardado' });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/mayoristas/tramos/:id
  eliminarTramo: async (req, res, next) => {
    try {
      const db = await getDb();
      await db.run('DELETE FROM venta_tramos WHERE id = ?', [req.params.id]);
      res.json({ message: 'Tramo eliminado' });
    } catch (error) {
      next(error);
    }
  },

  // ══════════════ PEDIDOS ══════════════

  // GET /api/mayoristas/resumen — panel del módulo
  resumen: async (req, res, next) => {
    try {
      const db = await getDb();
      const mesActual = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

      const ventasMes = await db.get(`
        SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS cantidad
        FROM pedidos WHERE tipo = 'mayorista' AND estado != 'cancelado' AND strftime('%Y-%m', fecha) = ?
      `, [mesActual]);

      const porCobrar = await db.get(`
        SELECT COALESCE(SUM(total - pagado), 0) AS total, COUNT(*) AS cantidad
        FROM pedidos WHERE tipo = 'mayorista' AND estado != 'cancelado' AND estado_pago != 'pagado'
      `);

      const pendientes = await db.get(
        "SELECT COUNT(*) AS n FROM pedidos WHERE tipo = 'mayorista' AND estado = 'pendiente'"
      );

      const vencidos = await db.get(`
        SELECT COUNT(*) AS n FROM pedidos 
        WHERE tipo = 'mayorista' AND estado IN ('pendiente', 'facturado') AND fecha_vencimiento IS NOT NULL 
          AND fecha_vencimiento < date('now', 'localtime')
      `);

      res.json({
        ventas_mes: ventasMes.total, ventas_mes_cantidad: ventasMes.cantidad,
        por_cobrar: porCobrar.total, por_cobrar_cantidad: porCobrar.cantidad,
        pedidos_pendientes: pendientes.n,
        pedidos_vencidos: vencidos.n
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/mayoristas/pedidos?estado=&filtro=&tipo=
  listarPedidos: async (req, res, next) => {
    try {
      const db = await getDb();
      const { estado, filtro, tipo } = req.query;

      let where = "p.estado != 'cancelado'";
      const params = [];

      if (tipo) { where += ' AND p.tipo = ?'; params.push(tipo); }
      if (estado) { where += ' AND p.estado = ?'; params.push(estado); }
      if (filtro === 'por-cobrar') { where += " AND p.estado_pago != 'pagado'"; }
      if (filtro === 'vencidos') {
        where += " AND p.estado IN ('pendiente','facturado') AND p.fecha_vencimiento IS NOT NULL AND p.fecha_vencimiento < date('now', 'localtime')";
      }

      const pedidos = await db.all(`
        SELECT p.*, COALESCE(c.nombre, p.cliente_nombre) AS cliente_nombre, tp.dias AS condicion_dias,
          CASE WHEN p.fecha_vencimiento IS NOT NULL AND p.fecha_vencimiento < date('now', 'localtime')
                    AND p.estado IN ('pendiente','facturado') THEN 1 ELSE 0 END AS vencido
        FROM pedidos p
        LEFT JOIN clientes c ON p.cliente_id = c.id
        LEFT JOIN terminos_pago tp ON c.condicion_pago_id = tp.id
        WHERE ${where}
        ORDER BY vencido DESC, p.fecha DESC
        LIMIT 500
      `, params);

      res.json(pedidos);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/mayoristas/pedidos/:id
  obtenerPedido: async (req, res, next) => {
    try {
      const db = await getDb();
      const pedido = await db.get(`
        SELECT p.*, COALESCE(c.nombre, p.cliente_nombre) AS cliente_nombre, c.contrato AS cliente_contrato,
               c.descuento_global, tp.nombre AS condicion_pago_nombre, tp.dias AS condicion_dias,
               u.nombre_completo AS vendedor_nombre
        FROM pedidos p
        LEFT JOIN clientes c ON p.cliente_id = c.id
        LEFT JOIN terminos_pago tp ON c.condicion_pago_id = tp.id
        LEFT JOIN usuarios u ON p.vendedor_id = u.id
        WHERE p.id = ?
      `, [req.params.id]);
      if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

      pedido.detalles = await db.all(`
        SELECT d.*, p.nombre AS producto_nombre, p.codigo AS producto_codigo, uv.abreviatura AS unidad_abrev,
               (d.cantidad - COALESCE(d.cantidad_facturada, 0)) AS restante
        FROM pedido_detalles d
        JOIN productos p ON d.producto_id = p.id
        LEFT JOIN unidades uv ON p.unidad_venta_id = uv.id
        WHERE d.pedido_id = ?
      `, [req.params.id]);

      pedido.pagos = await db.all(`
        SELECT pp.*, u.nombre_completo AS usuario_nombre
        FROM pagos_pedido pp LEFT JOIN usuarios u ON pp.usuario_id = u.id
        WHERE pp.pedido_id = ? ORDER BY pp.created_at DESC
      `, [req.params.id]);

      res.json(pedido);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/mayoristas/pedidos  — mayorista: { cliente_id, fecha?, ... } · minorista (encargo): { tipo:'minorista', cliente_nombre, ... }
  crearPedido: async (req, res, next) => {
    try {
      const db = await getDb();
      const { tipo, cliente_id, cliente_nombre, fecha, fecha_vencimiento, observaciones, detalles } = req.body;
      const esMinorista = tipo === 'minorista';

      // Tipo de venta asignado al vendedor (propietario)
      if (req.usuario?.rol === 'vendedor') {
        const u = await db.get('SELECT tipo_venta FROM usuarios WHERE id = ?', [req.usuario.id]);
        const tipoAsignado = u?.tipo_venta || 'ambas';
        if (esMinorista && !['minorista', 'ambas'].includes(tipoAsignado)) {
          return res.status(403).json({ error: 'No tienes asignado el tipo de venta minorista' });
        }
        if (!esMinorista && !['mayorista', 'ambas'].includes(tipoAsignado)) {
          return res.status(403).json({ error: 'No tienes asignado el tipo de venta mayorista' });
        }
      }

      if (!detalles || detalles.length === 0) {
        return res.status(400).json({ error: 'Agrega al menos un producto' });
      }
      if (esMinorista && !(cliente_nombre || '').trim()) {
        return res.status(400).json({ error: 'Indica el nombre del cliente del encargo' });
      }
      if (!esMinorista && !cliente_id) {
        return res.status(400).json({ error: 'Cliente es obligatorio en pedidos mayoristas' });
      }

      let cliente = null;
      if (!esMinorista) {
        cliente = await db.get('SELECT * FROM clientes WHERE id = ? AND activo = 1', [cliente_id]);
        if (!cliente) return res.status(400).json({ error: 'Cliente no encontrado o inactivo' });
      }

      // Calcular precios + totales (servidor): tramos en mayorista, precio_venta en minorista
      let subtotal = 0;
      const lineas = [];
      for (const d of detalles) {
        if (!d.producto_id || !d.cantidad || d.cantidad <= 0) {
          return res.status(400).json({ error: 'Cada línea necesita producto y cantidad > 0' });
        }
        const prod = await db.get(
          "SELECT id, nombre, tipo, sub_tipo, precio_venta FROM productos WHERE id = ? AND activo = 1", [d.producto_id]
        );
        if (!prod) return res.status(400).json({ error: `Producto no encontrado: ${d.producto_id}` });

        if (!esMinorista) {
          // Regla del propietario: los conformados no entran en mayoristas
          if (prod.tipo === 'compuesto' && prod.sub_tipo === 'conformado') {
            return res.status(400).json({ error: `"${prod.nombre}" es conformado: no se vende por mayorista` });
          }
        }

        const precio = esMinorista ? prod.precio_venta : await precioPorCantidad(db, d.producto_id, d.cantidad);
        const total = precio * d.cantidad;
        subtotal += total;
        lineas.push({ producto_id: d.producto_id, cantidad: d.cantidad, precio_unitario: precio, total });
      }

      // Descuento global (solo mayorista)
      const descuento = esMinorista ? 0 : (cliente.descuento_global || 0) / 100;
      const total = subtotal * (1 - descuento);

      // Límite de crédito (solo mayorista, Fase 2)
      if (!esMinorista && cliente.limite_credito > 0) {
        const saldo = await db.get(`
          SELECT COALESCE(SUM(total - pagado), 0) AS deuda
          FROM pedidos WHERE cliente_id = ? AND estado != 'cancelado' AND estado_pago != 'pagado'
        `, [cliente_id]);
        const deudaActual = saldo.deuda || 0;
        if (deudaActual + total > cliente.limite_credito) {
          return res.status(400).json({
            error: `Límite de crédito superado: deuda actual ${deudaActual.toFixed(2)} + este pedido ${total.toFixed(2)} = ${(deudaActual + total).toFixed(2)} > límite ${cliente.limite_credito.toFixed(2)}`
          });
        }
      }

      await db.run('BEGIN TRANSACTION');
      try {
        const result = await db.run(`
          INSERT INTO pedidos (tipo, cliente_id, cliente_nombre, fecha, fecha_vencimiento, subtotal, impuesto, total, vendedor_id, observaciones)
          VALUES (?, ?, ?, COALESCE(?, date('now', 'localtime')), ?, ?, 0, ?, ?, ?)
        `, [esMinorista ? 'minorista' : 'mayorista',
            esMinorista ? null : cliente_id, esMinorista ? cliente_nombre.trim() : null,
            fecha || null,
            fecha_vencimiento || null,
            Math.round(subtotal * 100) / 100, Math.round(total * 100) / 100,
            req.usuario.id, observaciones || null]);

        const pedidoId = result.lastID;
        for (const l of lineas) {
          await db.run(`
            INSERT INTO pedido_detalles (pedido_id, producto_id, cantidad, precio_unitario, total)
            VALUES (?, ?, ?, ?, ?)
          `, [pedidoId, l.producto_id, l.cantidad, l.precio_unitario, Math.round(l.total * 100) / 100]);
        }

        await db.run('COMMIT');
        res.status(201).json({ id: pedidoId, total, message: esMinorista ? 'Encargo creado' : 'Pedido creado' });
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  // POST /api/mayoristas/pedidos/:id/facturar { lineas?: [{detalle_id, cantidad}] }
  // Facturación total o PARCIAL por línea (m028): crea la venta por lo facturado.
  // Estado: 'parcial' mientras falte por facturar; 'facturado' al completarse.
  facturarPedido: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { lineas: lineasParciales } = req.body;

      const pedido = await db.get('SELECT * FROM pedidos WHERE id = ?', [id]);
      if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
      if (!['pendiente', 'parcial'].includes(pedido.estado)) {
        return res.status(400).json({ error: `Solo se puede facturar un pedido pendiente o parcial (estado actual: ${pedido.estado})` });
      }

      const detalles = await db.all(`
        SELECT d.*, p.nombre, p.stock_mayorista,
               uc.coeficiente AS coef_compra, uv.coeficiente AS coef_venta
        FROM pedido_detalles d
        JOIN productos p ON d.producto_id = p.id
        LEFT JOIN unidades uc ON p.unidad_compra_id = uc.id
        LEFT JOIN unidades uv ON p.unidad_venta_id = uv.id
        WHERE d.pedido_id = ?
      `, [id]);

      // Determinar cuánto facturar por línea (default: todo lo restante)
      const aFacturar = detalles.map(d => {
        const restante = d.cantidad - (d.cantidad_facturada || 0);
        let cantidad = restante;
        if (lineasParciales && Array.isArray(lineasParciales)) {
          const parcial = lineasParciales.find(l => l.detalle_id === d.id);
          cantidad = parcial ? parseFloat(parcial.cantidad) : 0;
        }
        return { ...d, restante, a_facturar: cantidad };
      });

      // Validaciones
      const totalAFacturar = aFacturar.reduce((s, d) => s + d.a_facturar, 0);
      if (totalAFacturar <= 0) {
        return res.status(400).json({ error: 'Nada que facturar: todo ya está facturado o las cantidades son cero' });
      }
      for (const d of aFacturar) {
        if (d.a_facturar < 0 || d.a_facturar > d.restante + 0.0001) {
          return res.status(400).json({ error: `Cantidad inválida para "${d.nombre}" (restante: ${d.restante})` });
        }
      }

      // Stock mayorista: backorder permitido (Fase 2, queda en negativo con alerta)
      const faltantes = aFacturar.filter(d => d.a_facturar > 0 && (d.stock_mayorista || 0) < d.a_facturar);
      const alertaBackorder = faltantes.length > 0
        ? faltantes.map(d => `"${d.nombre}" (quedará en ${((d.stock_mayorista || 0) - d.a_facturar).toFixed(2)})`).join(', ')
        : null;

      // Impuesto incluido sobre lo facturado, CON el descuento global del cliente (sin redondeo de caja)
      const config = await db.get('SELECT impuesto_ventas FROM parametros_contables WHERE id = 1');
      const tasa = (config?.impuesto_ventas ?? 15) / 100;
      const clientePedido = await db.get('SELECT descuento_global FROM clientes WHERE id = ?', [pedido.cliente_id]);
      const descuento = (clientePedido?.descuento_global || 0) / 100;
      const totalFacturaBruto = aFacturar.reduce((s, d) => s + d.a_facturar * d.precio_unitario, 0);
      const totalFactura = totalFacturaBruto * (1 - descuento);
      const impuesto = Math.round((totalFactura * tasa / (1 + tasa)) * 100) / 100;
      const subtotal = Math.round((totalFactura - impuesto) * 100) / 100;

      await db.run('BEGIN TRANSACTION');
      try {
        // Asiento en ventas (tipo mayorista, sin turno, con cliente)
        const venta = await db.run(`
          INSERT INTO ventas (turno_id, vendedor_id, cliente_id, tipo_venta, subtotal, impuesto, total, ajuste_redondeo, metodo_pago, estado)
          VALUES (NULL, ?, ?, 'mayorista', ?, ?, ?, 0, 'mixta', 'completada')
        `, [req.usuario.id, pedido.cliente_id, subtotal, impuesto, Math.round(totalFactura * 100) / 100]);

        const ventaId = venta.lastID;

        for (const d of aFacturar) {
          if (d.a_facturar <= 0) continue;

          // La unidad mayorista es la unidad de COMPRA del producto (propietario).
          // La venta/registro consolidado va en unidad de VENTA → convertir.
          const factor = (d.coef_compra && d.coef_venta && d.coef_compra !== d.coef_venta)
            ? d.coef_compra / d.coef_venta
            : 1;
          const cantidadVenta = Math.round(d.a_facturar * factor * 10000) / 10000;
          const precioVentaUnitario = Math.round((d.precio_unitario / factor) * 100) / 100;

          await db.run(`
            INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, total)
            VALUES (?, ?, ?, ?, ?)
          `, [ventaId, d.producto_id, cantidadVenta, precioVentaUnitario,
              Math.round(cantidadVenta * precioVentaUnitario * 100) / 100]);

          // Marcar lo facturado en la línea del pedido (en unidad de compra)
          await db.run('UPDATE pedido_detalles SET cantidad_facturada = cantidad_facturada + ? WHERE id = ?',
            [d.a_facturar, d.id]);

          // Descontar stock mayorista (en unidad de compra) + movimiento
          await db.run('UPDATE productos SET stock_mayorista = stock_mayorista - ? WHERE id = ?', [d.a_facturar, d.producto_id]);
          await db.run(`
            INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id, observaciones, inventario)
            VALUES (?, 'venta', ?, ?, ?, ?, 'mayorista')
          `, [d.producto_id, -d.a_facturar, ventaId, req.usuario.id, `Venta mayorista pedido #${id}`]);
        }

        // Estado del pedido: parcial si falta, facturado si completo
        const restanteTotal = await db.get(
          'SELECT COALESCE(SUM(cantidad - cantidad_facturada), 0) AS restante FROM pedido_detalles WHERE pedido_id = ?', [id]);
        const nuevoEstado = restanteTotal.restante > 0.0001 ? 'parcial' : 'facturado';

        await db.run(`
          UPDATE pedidos SET estado = ?, venta_id = ?, impuesto = impuesto + ?, subtotal = subtotal + ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [nuevoEstado, ventaId, impuesto, subtotal, id]);

        await db.run('COMMIT');
        res.json({
          message: nuevoEstado === 'parcial'
            ? `Facturación parcial registrada (venta #${ventaId}). Queda restante por facturar.`
            : `Pedido facturado por completo (venta #${ventaId})`,
          venta_id: ventaId,
          estado: nuevoEstado,
          restante: restanteTotal.restante,
          alerta_backorder: alertaBackorder ? `Stock mayorista en negativo (backorder): ${alertaBackorder}` : null
        });
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  // POST /api/mayoristas/pedidos/:id/entregar { metodo_pago? } — en minorista crea la venta y cobra
  entregarPedido: async (req, res, next) => {
    try {
      const db = await getDb();
      const pedido = await db.get('SELECT * FROM pedidos WHERE id = ?', [req.params.id]);
      if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

      // ── MAYORISTA: facturado → entregado ──
      if (pedido.tipo === 'mayorista') {
        if (pedido.estado !== 'facturado') {
          return res.status(400).json({ error: 'Solo se entrega un pedido facturado' });
        }
        await db.run("UPDATE pedidos SET estado = 'entregado', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
        return res.json({ message: 'Pedido marcado como entregado' });
      }

      // ── MINORISTA (encargo): pendiente → entregado+cobrado (crea la venta) ──
      if (pedido.estado !== 'pendiente') {
        return res.status(400).json({ error: `Solo se puede entregar un encargo pendiente (estado: ${pedido.estado})` });
      }

      const metodo_pago = req.body.metodo_pago || 'efectivo';
      if (!['efectivo', 'tarjeta'].includes(metodo_pago)) {
        return res.status(400).json({ error: 'Método de pago inválido (efectivo/tarjeta)' });
      }

      const detalles = await db.all(`
        SELECT d.*, p.nombre, p.stock_actual FROM pedido_detalles d
        JOIN productos p ON d.producto_id = p.id
        WHERE d.pedido_id = ?
      `, [pedido.id]);

      // Validar stock minorista disponible
      for (const d of detalles) {
        if ((d.stock_actual || 0) < d.cantidad) {
          return res.status(400).json({
            error: `Stock insuficiente para "${d.nombre}" (disponible: ${d.stock_actual || 0}, encargo: ${d.cantidad})`
          });
        }
      }

      // Impuesto incluido + redondeo de caja (igual que el POS minorista)
      const config = await db.get('SELECT impuesto_ventas, redondeo_venta FROM parametros_contables WHERE id = 1');
      const tasa = (config?.impuesto_ventas ?? 15) / 100;
      const redondeo = config?.redondeo_venta ?? 5;
      const totalExacto = pedido.total;
      const totalRedondeado = redondeo > 0 ? Math.ceil(totalExacto / redondeo) * redondeo : totalExacto;
      const ajusteRedondeo = Math.round((totalRedondeado - totalExacto) * 100) / 100;
      const impuesto = Math.round((totalRedondeado * tasa / (1 + tasa)) * 100) / 100;
      const subtotal = Math.round((totalRedondeado - impuesto) * 100) / 100;

      // Turno abierto (si lo hay) para que cuente en el arqueo
      const turno = await db.get("SELECT id FROM turnos WHERE estado = 'abierto'");

      await db.run('BEGIN TRANSACTION');
      try {
        const venta = await db.run(`
          INSERT INTO ventas (turno_id, vendedor_id, cliente_id, tipo_venta, subtotal, impuesto, total, ajuste_redondeo, metodo_pago, estado)
          VALUES (?, ?, NULL, 'minorista', ?, ?, ?, ?, ?, 'completada')
        `, [turno?.id || null, req.usuario.id, subtotal, impuesto, totalRedondeado, ajusteRedondeo, metodo_pago]);

        const ventaId = venta.lastID;

        for (const d of detalles) {
          await db.run(`
            INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, total)
            VALUES (?, ?, ?, ?, ?)
          `, [ventaId, d.producto_id, d.cantidad, d.precio_unitario, d.total]);

          await db.run('UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?', [d.cantidad, d.producto_id]);
          await db.run(`
            INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id, observaciones, inventario)
            VALUES (?, 'venta', ?, ?, ?, ?, 'minorista')
          `, [d.producto_id, -d.cantidad, ventaId, req.usuario.id, `Encargo entregado #${pedido.id}`]);
        }

        await db.run(`
          UPDATE pedidos SET estado = 'entregado', estado_pago = 'pagado', pagado = total, venta_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [ventaId, pedido.id]);

        await db.run('COMMIT');
        res.json({
          message: `Encargo entregado y cobrado por ${metodo_pago} (venta #${ventaId}${turno ? ', en el turno abierto' : ''})`,
          venta_id: ventaId
        });
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  // POST /api/mayoristas/pedidos/:id/cancelar
  // Regla (propietario): tras facturación parcial NO se modifica ni se revierte lo facturado;
  // solo se completa lo restante o se cancela (lo ya facturado queda intacto).
  cancelarPedido: async (req, res, next) => {
    try {
      const db = await getDb();
      const pedido = await db.get('SELECT * FROM pedidos WHERE id = ?', [req.params.id]);
      if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
      if (pedido.estado === 'entregado') {
        return res.status(400).json({ error: 'No se puede cancelar un pedido ya entregado' });
      }
      if (pedido.estado === 'cancelado') {
        return res.status(400).json({ error: 'El pedido ya está cancelado' });
      }

      // PARCIAL (facturado a medias): cancelar solo lo restante; lo facturado y lo pagado queda intacto
      if (pedido.estado === 'parcial') {
        await db.run("UPDATE pedidos SET estado = 'cancelado', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [pedido.id]);
        return res.json({
          message: 'Pedido cancelado. Lo ya facturado y cobrado queda intacto; lo pendiente no se facturará.'
        });
      }

      if (pedido.pagado > 0) {
        return res.status(400).json({ error: 'El pedido tiene pagos registrados; revisa los pagos antes de cancelar' });
      }

      await db.run('BEGIN TRANSACTION');
      try {
        // FACTURADO completo sin pagos: anular la venta y devolver stock mayorista
        if (pedido.estado === 'facturado' && pedido.venta_id) {
          await db.run("UPDATE ventas SET estado = 'anulada' WHERE id = ?", [pedido.venta_id]);
          const detalles = await db.all('SELECT producto_id, cantidad FROM pedido_detalles WHERE pedido_id = ?', [pedido.id]);
          for (const d of detalles) {
            await db.run('UPDATE productos SET stock_mayorista = stock_mayorista + ? WHERE id = ?', [d.cantidad, d.producto_id]);
            await db.run(`
              INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id, observaciones, inventario)
              VALUES (?, 'devolucion', ?, ?, ?, ?, 'mayorista')
            `, [d.producto_id, d.cantidad, pedido.venta_id, req.usuario.id, `Cancelación pedido mayorista #${pedido.id}`]);
          }
        }
        await db.run("UPDATE pedidos SET estado = 'cancelado', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [pedido.id]);
        await db.run('COMMIT');
        res.json({ message: 'Pedido cancelado' });
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  // POST /api/mayoristas/pedidos/:id/extender { fecha_vencimiento }
  extenderPedido: async (req, res, next) => {
    try {
      const db = await getDb();
      const { fecha_vencimiento } = req.body;
      if (!fecha_vencimiento) return res.status(400).json({ error: 'Nueva fecha de vencimiento requerida' });

      const pedido = await db.get('SELECT estado FROM pedidos WHERE id = ?', [req.params.id]);
      if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

      await db.run('UPDATE pedidos SET fecha_vencimiento = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [fecha_vencimiento, req.params.id]);
      res.json({ message: 'Vencimiento extendido' });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/mayoristas/pedidos/:id/pagos { monto, metodo_pago, moneda?, tasa_cambio?, referencia }
  registrarPago: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { monto, metodo_pago, referencia, moneda, tasa_cambio } = req.body;

      const montoNum = parseFloat(monto);
      if (!montoNum || montoNum <= 0) {
        return res.status(400).json({ error: 'El monto debe ser mayor que cero' });
      }
      if (!['efectivo', 'tarjeta', 'transferencia'].includes(metodo_pago)) {
        return res.status(400).json({ error: 'Método de pago inválido (efectivo/tarjeta/transferencia)' });
      }

      // Moneda (USD): la tasa se acuerda en cada operación (propietario, m025)
      const mon = moneda === 'USD' ? 'USD' : 'CUP';
      const tasa = parseFloat(tasa_cambio) || 0;
      if (mon === 'USD' && tasa <= 0) {
        return res.status(400).json({ error: 'Indica la tasa de cambio acordada para el pago en USD' });
      }
      // El pedido se salda en CUP equivalente
      const equivalenteCup = mon === 'USD' ? Math.round(montoNum * tasa * 100) / 100 : montoNum;

      const pedido = await db.get('SELECT * FROM pedidos WHERE id = ?', [id]);
      if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
      if (pedido.estado === 'cancelado') {
        return res.status(400).json({ error: 'No se puede cobrar un pedido cancelado' });
      }

      const pendiente = pedido.total - pedido.pagado;
      if (equivalenteCup > pendiente + 0.009) {
        return res.status(400).json({ error: `El monto excede lo pendiente (${pendiente.toFixed(2)})` });
      }

      await db.run('BEGIN TRANSACTION');
      try {
        await db.run(`
          INSERT INTO pagos_pedido (pedido_id, fecha, monto, metodo_pago, referencia, usuario_id, moneda, tasa_cambio)
          VALUES (?, date('now', 'localtime'), ?, ?, ?, ?, ?, ?)
        `, [id, montoNum, metodo_pago, referencia || null, req.usuario.id, mon, mon === 'USD' ? tasa : 1]);

        const nuevoPagado = Math.round((pedido.pagado + equivalenteCup) * 100) / 100;
        const estadoPago = nuevoPagado >= pedido.total ? 'pagado' : 'parcial';
        await db.run('UPDATE pedidos SET pagado = ?, estado_pago = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [nuevoPagado, estadoPago, id]);

        await db.run('COMMIT');

        res.json({
          message: `Cobro registrado: ${montoNum} ${mon}${mon === 'USD' ? ` (tasa ${tasa} = ${equivalenteCup} CUP)` : ''}. El dinero ${metodo_pago === 'efectivo' ? `cuenta en el arqueo (${mon})` : `entró al banco (${mon})`}.`,
          estado_pago: estadoPago
        });
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  // GET /api/mayoristas/cuentas-por-cobrar
  cuentasPorCobrar: async (req, res, next) => {
    try {
      const db = await getDb();
      const cuentas = await db.all(`
        SELECT p.id, p.fecha, p.total, p.pagado, (p.total - p.pagado) AS pendiente,
               p.estado, p.estado_pago, c.nombre AS cliente_nombre, c.contrato,
               tp.dias AS condicion_dias,
               CAST(julianday(date('now', 'localtime')) - julianday(p.fecha) AS INTEGER) AS dias_desde_pedido,
               CASE WHEN tp.dias IS NOT NULL 
                     AND (julianday(date('now', 'localtime')) - julianday(p.fecha)) > tp.dias
                    THEN CAST(julianday(date('now', 'localtime')) - julianday(p.fecha) - tp.dias AS INTEGER)
                    ELSE 0 END AS dias_atraso
        FROM pedidos p
        JOIN clientes c ON p.cliente_id = c.id
        LEFT JOIN terminos_pago tp ON c.condicion_pago_id = tp.id
        WHERE p.estado != 'cancelado' AND p.estado_pago != 'pagado'
        ORDER BY dias_atraso DESC, p.fecha
      `);
      res.json(cuentas);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = mayoristaController;
