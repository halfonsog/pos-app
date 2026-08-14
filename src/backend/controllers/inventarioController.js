const { getDb } = require('../models/db');

const inventarioController = {

  // GET /api/inventario/resumen
  resumen: async (req, res, next) => {
    try {
      const db = await getDb();

      // Productos sin ficha de costo
      const sinFichaCosto = await db.get(`
        SELECT COUNT(*) as count 
        FROM productos 
        WHERE activo = 1 AND (precio_venta = 0 OR precio_venta IS NULL)
      `);

      // Stock bajo
      const stockBajo = await db.get(`
        WITH stock_componentes AS (
          SELECT r.producto_padre_id,
                MIN(pr.stock_actual / r.cantidad) as stock_efectivo
          FROM recetas r
          JOIN productos pr ON r.producto_hijo_id = pr.id
          WHERE pr.activo = 1
          GROUP BY r.producto_padre_id
        )
        SELECT COUNT(*) as count
        FROM productos p
        LEFT JOIN stock_componentes sc ON p.id = sc.producto_padre_id
        WHERE p.activo = 1 
          AND p.stock_minimo > 0
          AND CASE 
            WHEN p.tipo = 'compuesto' AND p.sub_tipo = 'conformado' 
              THEN COALESCE(sc.stock_efectivo, 0)
            ELSE p.stock_actual
          END <= p.stock_minimo
      `);

      // Compras pendientes de stock
      const comprasPendientes = await db.get(`
        SELECT COUNT(*) as count 
        FROM compras 
        WHERE estado_inventario = 'pendiente'
      `);

      // Preparaciones pendientes (compuestos elaborados con receta y componentes con stock)
      const preparacionesPendientes = await db.get(`
        SELECT COUNT(DISTINCT p.id) as count
        FROM productos p
        WHERE p.tipo = 'compuesto' 
          AND p.sub_tipo = 'elaborado' 
          AND p.activo = 1
          AND EXISTS (SELECT 1 FROM recetas WHERE producto_padre_id = p.id)
      `);

      // Backorders mayoristas: stock mayorista en negativo (ventas con faltante)
      const backorders = await db.get(`
        SELECT COUNT(*) as count FROM productos WHERE stock_mayorista < 0
      `);

      res.json({
        sin_ficha_costo: sinFichaCosto.count,
        stock_bajo: stockBajo.count,
        compras_pendientes: comprasPendientes.count,
        preparaciones_pendientes: preparacionesPendientes.count,
        backorders_mayorista: backorders.count
      });
    } catch (error) {
      console.error('Error en resumen inventario:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/inventario/stock
  listarStock: async (req, res, next) => {
    try {
      const db = await getDb();

      const productos = await db.all(`
        WITH stock_componentes AS (
          SELECT 
            r.producto_padre_id,
            MIN(pr.stock_actual / r.cantidad) as stock_efectivo,
            MIN(CASE WHEN pr.stock_actual >= r.cantidad THEN 1 ELSE 0 END) as todos_disponibles
          FROM recetas r
          JOIN productos pr ON r.producto_hijo_id = pr.id
          WHERE pr.activo = 1
          GROUP BY r.producto_padre_id
        )
        SELECT 
          p.id, p.codigo, p.nombre, p.tipo, p.sub_tipo,
          CASE 
            WHEN p.tipo = 'compuesto' AND p.sub_tipo = 'elaborado' THEN p.stock_actual
            WHEN p.tipo = 'compuesto' THEN COALESCE(sc.stock_efectivo, 0)
            ELSE p.stock_actual
          END as stock_efectivo,
          p.stock_minimo, p.precio_venta,
          p.activo,
          c.nombre as categoria_nombre,
          uv.abreviatura as unidad_abrev,
          uv.tipo as unidad_venta_tipo,
          CASE WHEN p.precio_venta > 0 THEN 1 ELSE 0 END as tiene_ficha_costo,
          CASE 
            WHEN p.tipo = 'compuesto' AND p.sub_tipo = 'elaborado' 
              AND EXISTS (SELECT 1 FROM recetas WHERE producto_padre_id = p.id)
            THEN 1 ELSE 0 
          END as es_preparable,
          CASE 
            WHEN p.tipo = 'compuesto' AND p.sub_tipo = 'elaborado' 
              AND sc.todos_disponibles = 1
            THEN 1 ELSE 0 
          END as puede_prepararse
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN unidades uv ON p.unidad_venta_id = uv.id
        LEFT JOIN stock_componentes sc ON p.id = sc.producto_padre_id
        WHERE p.activo = 1
        ORDER BY p.nombre
      `);

      // Procesar resultados
      for (const p of productos) {
        p.puede_venderse = p.tiene_ficha_costo === 1 && p.stock_efectivo > 0;
        p.es_preparable = p.es_preparable === 1;
        p.puede_prepararse = p.puede_prepararse === 1;
        p.tiene_ficha_costo = p.tiene_ficha_costo === 1;
      }
      res.json(productos);
    } catch (error) {
      console.error('Error en listar stock:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/inventario/movimientos
  listarMovimientos: async (req, res, next) => {
    try {
      const db = await getDb();

      // Límite configurable (por defecto 1000, máximo 5000) — D13
      const limite = Math.min(parseInt(req.query.limite) || 1000, 5000);

      const movimientos = await db.all(`
      SELECT 
        m.id, m.tipo, m.cantidad, m.created_at as fecha,
        m.observaciones, m.referencia_id,
        p.id as producto_id, p.codigo, p.nombre as producto_nombre,
        u.username as usuario_nombre
      FROM movimientos_stock m
      JOIN productos p ON m.producto_id = p.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      ORDER BY m.created_at DESC
      LIMIT ?
    `, [limite]);

      res.json(movimientos);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/inventario/preparables
  listarPreparables: async (req, res, next) => {
    try {
      const db = await getDb();

      const productos = await db.all(`
      SELECT 
        p.id, p.codigo, p.nombre,
        p.stock_actual, uv.abreviatura as unidad_abrev, uv.nombre as unidad_nombre
      FROM productos p
      LEFT JOIN unidades uv ON p.unidad_venta_id = uv.id
      WHERE p.tipo = 'compuesto' 
        AND p.sub_tipo = 'elaborado' 
        AND p.activo = 1
        AND EXISTS (SELECT 1 FROM recetas WHERE producto_padre_id = p.id)
      ORDER BY p.nombre
    `);

      // Para cada producto, obtener componentes
      for (const p of productos) {
        const componentes = await db.all(`
        SELECT 
          pr.id, pr.nombre, pr.stock_actual, r.cantidad,
          CASE WHEN pr.stock_actual >= r.cantidad THEN 1 ELSE 0 END as suficiente
        FROM recetas r
        JOIN productos pr ON r.producto_hijo_id = pr.id
        WHERE r.producto_padre_id = ?
      `, [p.id]);

        p.componentes = componentes;
        p.todos_suficientes = componentes.every(c => c.suficiente === 1);

        if (p.todos_suficientes) {
          const maxPorComponente = componentes.map(c => Math.floor(c.stock_actual / c.cantidad));
          p.cantidad_maxima = Math.min(...maxPorComponente);
        } else {
          p.cantidad_maxima = 0;
        }
      }

      res.json(productos);
    } catch (error) {
      console.error('Error en listar preparables:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/inventario/preparar/:id
  prepararProducto: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { cantidad } = req.body;
      const usuario_id = req.usuario?.id || 1;

      await db.run('BEGIN TRANSACTION');

      try {
        // Obtener receta
        const componentes = await db.all(`
        SELECT producto_hijo_id, cantidad
        FROM recetas
        WHERE producto_padre_id = ?
      `, [id]);

        // Verificar stock suficiente
        for (const c of componentes) {
          const stock = await db.get(
            'SELECT stock_actual FROM productos WHERE id = ?',
            [c.producto_hijo_id]
          );

          if (stock.stock_actual < c.cantidad * cantidad) {
            throw new Error(`Stock insuficiente para el componente`);
          }
        }

        // Descontar componentes
        for (const c of componentes) {
          await db.run(
            'UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?',
            [c.cantidad * cantidad, c.producto_hijo_id]
          );

          await db.run(`
          INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id, observaciones)
          VALUES (?, 'preparacion_salida', ?, ?, ?, 'Preparación de producto')
        `, [c.producto_hijo_id, -c.cantidad * cantidad, id, usuario_id]);
        }

        // Aumentar stock del producto preparado
        await db.run(
          'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
          [cantidad, id]
        );

        await db.run(`
        INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id, observaciones)
        VALUES (?, 'preparacion_entrada', ?, ?, ?, 'Producto preparado')
      `, [id, cantidad, id, usuario_id]);

        await db.run('COMMIT');

        res.json({ message: `Se prepararon ${cantidad} unidades correctamente` });

      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error en preparar producto:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/inventario/ajuste
  // GET /api/inventario/tipos-movimiento — catálogo D7 (alimenta filtros del frontend)
  listarTiposMovimiento: async (req, res, next) => {
    try {
      const db = await getDb();
      const tipos = await db.all(
        'SELECT id, codigo, nombre, signo, descripcion FROM tipos_movimiento WHERE activo = 1 ORDER BY orden'
      );
      res.json(tipos);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/inventario/intercambio — D6: conversión reventa → granel entre dos productos
  // El usuario define libremente las cantidades equivalentes y es responsable de ellas.
  intercambio: async (req, res, next) => {
    try {
      const db = await getDb();
      const { producto_origen_id, producto_destino_id, cantidad_origen, cantidad_destino, observaciones } = req.body;
      const usuario_id = req.usuario.id;

      if (!producto_origen_id || !producto_destino_id || !cantidad_origen || !cantidad_destino) {
        return res.status(400).json({ error: 'Faltan datos: productos y cantidades son obligatorios' });
      }
      if (parseInt(producto_origen_id) === parseInt(producto_destino_id)) {
        return res.status(400).json({ error: 'El producto origen y destino deben ser distintos' });
      }

      const cantOrigen = parseFloat(cantidad_origen);
      const cantDestino = parseFloat(cantidad_destino);
      if (cantOrigen <= 0 || cantDestino <= 0) {
        return res.status(400).json({ error: 'Las cantidades deben ser mayores que cero' });
      }

      const origen = await db.get('SELECT * FROM productos WHERE id = ? AND activo = 1', [producto_origen_id]);
      const destino = await db.get('SELECT * FROM productos WHERE id = ? AND activo = 1', [producto_destino_id]);

      if (!origen) return res.status(404).json({ error: 'Producto origen no encontrado' });
      if (!destino) return res.status(404).json({ error: 'Producto destino no encontrado' });

      // D6: origen = simple reventa, destino = simple granel
      if (!(origen.tipo === 'simple' && origen.sub_tipo === 'reventa')) {
        return res.status(400).json({ error: `El origen debe ser un producto simple de reventa ("${origen.nombre}" no lo es)` });
      }
      if (!(destino.tipo === 'simple' && destino.sub_tipo === 'granel')) {
        return res.status(400).json({ error: `El destino debe ser un producto simple a granel ("${destino.nombre}" no lo es)` });
      }
      if (origen.stock_actual < cantOrigen) {
        return res.status(400).json({ error: `Stock insuficiente en "${origen.nombre}". Disponible: ${origen.stock_actual}` });
      }

      await db.run('BEGIN TRANSACTION');
      try {
        const obsBase = observaciones ||
          `Intercambio: ${cantOrigen} × "${origen.nombre}" → ${cantDestino} × "${destino.nombre}"`;

        // Salida del reventa
        await db.run('UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?', [cantOrigen, origen.id]);
        await db.run(`
          INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id, observaciones)
          VALUES (?, 'intercambio_salida', ?, ?, ?, ?)
        `, [origen.id, -cantOrigen, destino.id, usuario_id, obsBase]);

        // Entrada al granel
        await db.run('UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?', [cantDestino, destino.id]);
        await db.run(`
          INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_id, usuario_id, observaciones)
          VALUES (?, 'intercambio_entrada', ?, ?, ?, ?)
        `, [destino.id, cantDestino, origen.id, usuario_id, obsBase]);

        await db.run('COMMIT');

        res.json({
          message: `Intercambio realizado: −${cantOrigen} "${origen.nombre}" → +${cantDestino} "${destino.nombre}"`
        });
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  // POST /api/inventario/transferencia — mueve stock entre minorista y mayorista
  // { producto_id, cantidad, direccion: 'a_mayorista' | 'a_minorista' }
  transferencia: async (req, res, next) => {
    try {
      const db = await getDb();
      const { producto_id, cantidad, direccion } = req.body;
      const usuario_id = req.usuario.id;

      if (!producto_id || !cantidad || !direccion) {
        return res.status(400).json({ error: 'Producto, cantidad y dirección son obligatorios' });
      }
      if (!['a_mayorista', 'a_minorista'].includes(direccion)) {
        return res.status(400).json({ error: 'Dirección inválida: a_mayorista o a_minorista' });
      }
      const cant = parseFloat(cantidad);
      if (cant <= 0) {
        return res.status(400).json({ error: 'La cantidad debe ser mayor que cero' });
      }

      const p = await db.get(`
        SELECT p.*, uc.coeficiente AS coef_compra, uv.coeficiente AS coef_venta
        FROM productos p
        LEFT JOIN unidades uc ON p.unidad_compra_id = uc.id
        LEFT JOIN unidades uv ON p.unidad_venta_id = uv.id
        WHERE p.id = ? AND p.activo = 1
      `, [producto_id]);
      if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
      if (p.tipo === 'compuesto' && p.sub_tipo === 'conformado') {
        return res.status(400).json({ error: 'Los conformados no tienen stock mayorista (se arman en la venta)' });
      }

      // Conversión: stock_actual en unidad de VENTA, stock_mayorista en unidad de COMPRA (propietario)
      const factor = (p.coef_compra && p.coef_venta && p.coef_compra !== p.coef_venta)
        ? p.coef_compra / p.coef_venta
        : 1;

      const stockOrigen = direccion === 'a_mayorista' ? (p.stock_actual || 0) : (p.stock_mayorista || 0);
      if (stockOrigen < cant) {
        return res.status(400).json({
          error: `Stock insuficiente en el inventario ${direccion === 'a_mayorista' ? 'minorista' : 'mayorista'} (disponible: ${stockOrigen})`
        });
      }

      // Cantidad destino convertida a la unidad del inventario destino
      const cantDestino = direccion === 'a_mayorista'
        ? Math.round((cant / factor) * 10000) / 10000   // venta → compra
        : Math.round((cant * factor) * 10000) / 10000;  // compra → venta

      await db.run('BEGIN TRANSACTION');
      try {
        if (direccion === 'a_mayorista') {
          await db.run('UPDATE productos SET stock_actual = stock_actual - ?, stock_mayorista = stock_mayorista + ? WHERE id = ?', [cant, cantDestino, producto_id]);
        } else {
          await db.run('UPDATE productos SET stock_mayorista = stock_mayorista - ?, stock_actual = stock_actual + ? WHERE id = ?', [cant, cantDestino, producto_id]);
        }

        await db.run(`
          INSERT INTO movimientos_stock (producto_id, tipo, cantidad, usuario_id, observaciones, inventario)
          VALUES (?, 'transferencia', ?, ?, ?, ?)
        `, [producto_id, cant, usuario_id,
          `Transferencia a ${direccion === 'a_mayorista' ? 'mayorista' : 'minorista'} (${cant} → ${cantDestino} en destino)`,
          direccion === 'a_mayorista' ? 'minorista' : 'mayorista']);

        await db.run('COMMIT');
        res.json({
          message: `Transferidos ${cant} a inventario ${direccion === 'a_mayorista' ? 'mayorista' : 'minorista'}${factor !== 1 ? ` (quedan ${cantDestino} en la unidad destino)` : ''}`
        });
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  crearAjuste: async (req, res, next) => {
    try {
      const db = await getDb();
      const { producto_id, tipo, cantidad, observaciones } = req.body;
      const usuario_id = req.usuario.id;

      // Validaciones
      if (!producto_id || !tipo || !cantidad) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }

      // Alias legacy: 'donacion' → 'donacion_salida'
      const tipoNormalizado = tipo === 'donacion' ? 'donacion_salida' : tipo;

      // Validar contra el catálogo de tipos (D7): solo tipos de ajuste manual
      const tiposPermitidos = ['merma', 'donacion_salida', 'donacion_entrada', 'autoconsumo', 'ajuste'];
      if (!tiposPermitidos.includes(tipoNormalizado)) {
        return res.status(400).json({ error: `Tipo de ajuste inválido. Permitidos: ${tiposPermitidos.join(', ')}` });
      }

      // Signo según tipo: salidas fuerzan negativo, entradas fuerzan positivo, ajuste es libre
      let cantidadFinal = parseFloat(cantidad);

      if (['merma', 'donacion_salida', 'autoconsumo'].includes(tipoNormalizado)) {
        cantidadFinal = -Math.abs(cantidadFinal);
      } else if (tipoNormalizado === 'donacion_entrada') {
        cantidadFinal = Math.abs(cantidadFinal);
      }

      // Verificar stock suficiente para descuentos
      if (cantidadFinal < 0) {
        const producto = await db.get(
          'SELECT stock_actual, nombre FROM productos WHERE id = ?',
          [producto_id]
        );

        if (!producto) {
          return res.status(404).json({ error: 'Producto no encontrado' });
        }

        if (producto.stock_actual < Math.abs(cantidadFinal)) {
          return res.status(400).json({
            error: `Stock insuficiente. Stock actual: ${producto.stock_actual}`
          });
        }
      }

      await db.run('BEGIN TRANSACTION');

      try {
        // Actualizar stock
        await db.run(
          'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
          [cantidadFinal, producto_id]
        );

        // Registrar movimiento
        const observacionesFinal = observaciones ||
          `Ajuste por ${tipoNormalizado}${cantidadFinal < 0 ? ' (salida)' : ' (entrada)'}`;

        await db.run(`
        INSERT INTO movimientos_stock (producto_id, tipo, cantidad, usuario_id, observaciones)
        VALUES (?, ?, ?, ?, ?)
      `, [producto_id, tipoNormalizado, cantidadFinal, usuario_id, observacionesFinal]);

        await db.run('COMMIT');

        const accion = cantidadFinal > 0 ? 'incrementó' : 'decrementó';
        res.json({
          message: `Stock ${accion} en ${Math.abs(cantidadFinal)} unidades correctamente`
        });

      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error en crear ajuste:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = inventarioController;