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
        SELECT COUNT(*) as count 
        FROM productos 
        WHERE activo = 1 AND stock_actual <= stock_minimo AND stock_minimo > 0
      `);

      // Compras pendientes de stock
      const comprasPendientes = await db.get(`
        SELECT COUNT(*) as count 
        FROM compras 
        WHERE estado_inventario = 'pendiente'
      `);

      // Preparaciones pendientes (compuestos con receta, requiere_preparacion=1, y componentes con stock)
      const preparacionesPendientes = await db.get(`
        SELECT COUNT(DISTINCT p.id) as count
        FROM productos p
        WHERE p.tipo = 'compuesto' 
          AND p.requiere_preparacion = 1 
          AND p.activo = 1
          AND EXISTS (SELECT 1 FROM recetas WHERE producto_padre_id = p.id)
      `);

      res.json({
        sin_ficha_costo: sinFichaCosto.count,
        stock_bajo: stockBajo.count,
        compras_pendientes: comprasPendientes.count,
        preparaciones_pendientes: preparacionesPendientes.count
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
            WHEN p.tipo = 'compuesto' AND p.requiere_preparacion = 1 THEN p.stock_actual
            WHEN p.tipo = 'compuesto' THEN COALESCE(sc.stock_efectivo, 0)
            ELSE p.stock_actual
          END as stock_actual,
          p.stock_minimo, p.precio_venta,
          p.requiere_preparacion, p.activo,
          c.nombre as categoria_nombre,
          uv.abreviatura as unidad_abrev,
          uv.tipo as unidad_venta_tipo,
          CASE WHEN p.precio_venta > 0 THEN 1 ELSE 0 END as tiene_ficha_costo,
          CASE 
            WHEN p.tipo = 'compuesto' AND p.requiere_preparacion = 1 
              AND EXISTS (SELECT 1 FROM recetas WHERE producto_padre_id = p.id)
            THEN 1 ELSE 0 
          END as es_preparable,
          CASE 
            WHEN p.tipo = 'compuesto' AND p.requiere_preparacion = 1 
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
        p.puede_venderse = p.tiene_ficha_costo === 1 && p.stock_actual > 0;
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
      LIMIT 100
    `);

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
        p.stock_actual, uv.abreviatura as unidad_abrev
      FROM productos p
      LEFT JOIN unidades uv ON p.unidad_venta_id = uv.id
      WHERE p.tipo = 'compuesto' 
        AND p.requiere_preparacion = 1 
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
  crearAjuste: async (req, res, next) => {
    try {
      const db = await getDb();
      const { producto_id, tipo, cantidad, observaciones } = req.body;
      const usuario_id = req.usuario?.id || 1;

      // Validaciones
      if (!producto_id || !tipo || !cantidad) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }

      // Para merma, donación, autoconsumo: la cantidad debe ser negativa (descuenta stock)
      // Para ajuste manual: puede ser positiva o negativa
      let cantidadFinal = parseFloat(cantidad);

      if (['merma', 'donacion', 'autoconsumo'].includes(tipo)) {
        cantidadFinal = -Math.abs(cantidadFinal);
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
          `Ajuste por ${tipo}${cantidadFinal < 0 ? ' (salida)' : ' (entrada)'}`;

        await db.run(`
        INSERT INTO movimientos_stock (producto_id, tipo, cantidad, usuario_id, observaciones)
        VALUES (?, ?, ?, ?, ?)
      `, [producto_id, tipo, cantidadFinal, usuario_id, observacionesFinal]);

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