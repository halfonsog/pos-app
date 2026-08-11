const { getDb } = require('../models/db');
const path = require('path');
const fs = require('fs');
const conversiones = require('../utils/conversiones');
const costos = require('../utils/costos');

const productoController = {

  // GET /api/productos
  listar: async (req, res, next) => {
    try {
      const db = await getDb();

      const productos = await db.all(`
      WITH stock_componentes AS (
        SELECT 
          r.producto_padre_id,
          MIN(pr.stock_actual / r.cantidad) as stock_efectivo
        FROM recetas r
        JOIN productos pr ON r.producto_hijo_id = pr.id
        WHERE pr.activo = 1
        GROUP BY r.producto_padre_id
      )
      SELECT 
        p.*,
        c.nombre as categoria_nombre,
        uv.nombre as unidad_venta_nombre,
        uv.abreviatura as unidad_venta_abrev,
        uv.tipo as unidad_venta_tipo,
        uc.nombre as unidad_compra_nombre,
        uc.abreviatura as unidad_compra_abrev,
        CASE 
          WHEN p.tipo = 'compuesto' AND p.sub_tipo = 'conformado' 
            THEN COALESCE(sc.stock_efectivo, 0)
          ELSE p.stock_actual
        END as stock_efectivo
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN unidades uv ON p.unidad_venta_id = uv.id
      LEFT JOIN unidades uc ON p.unidad_compra_id = uc.id
      LEFT JOIN stock_componentes sc ON p.id = sc.producto_padre_id
      ORDER BY p.nombre
    `);

      // Solo procesar puede_venderse (sin consultas adicionales)
      for (const p of productos) {
        p.puede_venderse = p.stock_efectivo > 0 && p.precio_venta > 0;
      }

      res.json(productos);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/productos/:id
  obtener: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      const producto = await db.get(`
      SELECT 
        p.*,
        c.nombre as categoria_nombre,
        uv.nombre as unidad_venta_nombre,
        uv.abreviatura as unidad_venta_abrev,
        uv.tipo as unidad_venta_tipo,
        uc.nombre as unidad_compra_nombre,
        uc.abreviatura as unidad_compra_abrev
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN unidades uv ON p.unidad_venta_id = uv.id
      LEFT JOIN unidades uc ON p.unidad_compra_id = uc.id
      WHERE p.id = ?
    `, [id]);

      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      // Obtener receta si es compuesto
      if (producto.tipo === 'compuesto') {
        producto.receta = await db.all(`
        SELECT 
          r.*,
          p.nombre as producto_nombre,
          p.codigo as producto_codigo,
          p.precio_venta,
          p.tipo,
          p.unidad_compra_id,
          p.unidad_venta_id,
          u.nombre as unidad_nombre,
          u.abreviatura as unidad_abrev,
          u.tipo as unidad_tipo,
          p.costo_base as costo_ficha
        FROM recetas r
        JOIN productos p ON r.producto_hijo_id = p.id
        JOIN unidades u ON p.unidad_venta_id = u.id
        WHERE r.producto_padre_id = ?
      `, [id]);

        // Para cada componente, obtener costo de última compra si no tiene ficha
        for (const c of producto.receta) {
          if (!c.costo_ficha || c.costo_ficha === 0) {
            const ultimaCompra = await db.get(`
            SELECT cd.precio_unitario
            FROM compra_detalles cd
            JOIN compras co ON cd.compra_id = co.id
            WHERE cd.producto_id = ? AND co.estado_inventario = 'completado'
            ORDER BY co.fecha_compra DESC LIMIT 1
          `, [c.producto_hijo_id]);

            if (ultimaCompra?.precio_unitario) {
              // ✅ Usar coeficiente de unidades 
              if (c.unidad_compra_id && c.unidad_venta_id && c.unidad_compra_id !== c.unidad_venta_id) {
                const uCompra = await db.get('SELECT coeficiente FROM unidades WHERE id = ?', [c.unidad_compra_id]);
                const uVenta = await db.get('SELECT coeficiente FROM unidades WHERE id = ?', [c.unidad_venta_id]);
                const factor = (uCompra && uVenta) ? uCompra.coeficiente / uVenta.coeficiente : 1;
                c.costo_unitario = ultimaCompra.precio_unitario / factor;
              } else {
                c.costo_unitario = ultimaCompra.precio_unitario;
              }
            } else {
              c.costo_unitario = 0;
            }
          } else {
            c.costo_unitario = c.costo_ficha;
          }
        }

        // Calcular costo base desde la receta si no tiene costo almacenado
        if (!producto.costo_base || producto.costo_base === 0) {
          producto.costo_base = await costos.calcularCostoCompuesto(db, producto.id);
        }
      }

      // Costo base para simples (última compra)
      if (producto.tipo === 'simple') {
        const ultimaCompra = await db.get(`
        SELECT cd.precio_unitario, c.fecha_compra
        FROM compra_detalles cd
        JOIN compras c ON cd.compra_id = c.id
        WHERE cd.producto_id = ? AND c.estado_inventario = 'completado'
        ORDER BY c.fecha_compra DESC LIMIT 1
      `, [id]);

        if (ultimaCompra && (!producto.costo_base || producto.costo_base === 0)) {
          // ✅ Usar coeficiente de unidades
          if (producto.unidad_compra_id && producto.unidad_venta_id &&
            producto.unidad_compra_id !== producto.unidad_venta_id) {
            const uCompra = await db.get('SELECT coeficiente FROM unidades WHERE id = ?', [producto.unidad_compra_id]);
            const uVenta = await db.get('SELECT coeficiente FROM unidades WHERE id = ?', [producto.unidad_venta_id]);
            const factor = (uCompra && uVenta) ? uCompra.coeficiente / uVenta.coeficiente : 1;
            producto.costo_base = ultimaCompra.precio_unitario / factor;
          } else {
            producto.costo_base = ultimaCompra.precio_unitario;
          }
        }
      }

      // Valores por defecto desde configuración (costeo absorbente — B12 corregido)
      const params = await costos.obtenerParametros(db);

      producto.costo_base = producto.costo_base || 0;
      producto.margen = producto.margen || params.margen;
      producto.gastos_fijos = producto.gastos_fijos || Math.round(params.pctGastos * 10000) / 100; // % con 2 decimales
      producto.impuesto = producto.impuesto || params.impuesto;

      // Dependencias
      const ventas = await db.get('SELECT COUNT(*) as count FROM movimientos_stock WHERE producto_id = ?', [id]);
      const compras = await db.get('SELECT COUNT(*) as count FROM compra_detalles WHERE producto_id = ?', [id]);
      const recetaPadre = await db.get('SELECT COUNT(*) as count FROM recetas WHERE producto_padre_id = ?', [id]);

      producto.tiene_ventas = ventas.count > 0;
      producto.tiene_compras = compras.count > 0;
      producto.tiene_dependencias = (ventas.count > 0 || compras.count > 0 || recetaPadre.count > 0);

      // Calcular factor de conversión para mostrar en ficha
      if (producto.tipo === 'simple' && producto.sub_tipo === 'granel' &&
        producto.unidad_compra_id && producto.unidad_venta_id &&
        producto.unidad_compra_id !== producto.unidad_venta_id) {
        const uCompra = await db.get('SELECT coeficiente FROM unidades WHERE id = ?', [producto.unidad_compra_id]);
        const uVenta = await db.get('SELECT coeficiente FROM unidades WHERE id = ?', [producto.unidad_venta_id]);
        producto.factor_conversion = (uCompra && uVenta) ? uCompra.coeficiente / uVenta.coeficiente : 1;
      } else {
        producto.factor_conversion = 1;
      }

      res.json(producto);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/productos
  crear: async (req, res, next) => {
    try {
      const db = await getDb();
      const data = req.body;

      // Validaciones básicas
      if (!data.codigo || !data.nombre) {
        return res.status(400).json({ error: 'Código y nombre requeridos' });
      }

      if (!data.unidad_venta_id) {
        return res.status(400).json({ error: 'Unidad de venta requerida' });
      }

      // Validar según tipo
      if (data.tipo === 'simple') {
        if (data.sub_tipo === 'granel') {
          if (!data.unidad_compra_id) {
            return res.status(400).json({ error: 'Unidad de compra requerida para productos a granel' });
          }
          // Validar mismo tipo
          const mismoTipo = await conversiones.mismoTipo(data.unidad_venta_id, data.unidad_compra_id);
          if (!mismoTipo) {
            return res.status(400).json({ error: 'Unidad de compra y venta deben ser del mismo tipo' });
          }
        } else {
          // Reventa: solo unidades
          data.unidad_compra_id = null;
          const tipoVenta = await conversiones.obtenerTipo(data.unidad_venta_id);
          if (tipoVenta !== 'unidad') {
            return res.status(400).json({ error: 'Productos de reventa solo usan unidades tipo "unidad"' });
          }
        }
      } else {
        // Compuesto: sin unidad de compra; sub_tipo obligatorio (D1)
        data.unidad_compra_id = null;
        if (!['elaborado', 'conformado'].includes(data.sub_tipo)) {
          return res.status(400).json({ error: 'Un producto compuesto debe ser sub_tipo "elaborado" o "conformado"' });
        }
      }

      const foto = req.file ? req.file.filename : null;

      const result = await db.run(`
        INSERT INTO productos (codigo, nombre, tipo, sub_tipo,
          categoria_id, unidad_venta_id, unidad_compra_id, stock_minimo, activo, descripcion_preparacion, foto)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.codigo, data.nombre, data.tipo, data.sub_tipo || null,
        data.categoria_id || null,
        data.unidad_venta_id, data.unidad_compra_id || null,
        data.stock_minimo || 0, data.activo !== false ? 1 : 0,
        data.descripcion_preparacion || null, foto
      ]);

      res.status(201).json({ id: result.lastID, message: 'Producto creado' });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/productos/:id
  // D4: solo campos seguros son editables. Los campos estructurales (tipo, sub_tipo,
  // unidades, stock_actual, costo_base, precio_recomendado) NUNCA por edición directa:
  // cambian por conversiones (D6), movimientos de stock o recálculo de costos (D3).
  actualizar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const data = req.body;

      // Rechazar campos no editables (D4)
      const noEditables = ['tipo', 'sub_tipo', 'unidad_venta_id', 'unidad_compra_id', 'stock_actual', 'costo_base', 'precio_recomendado', 'requiere_preparacion'];
      const intentados = noEditables.filter(c => data[c] !== undefined);
      if (intentados.length > 0) {
        return res.status(400).json({
          error: `Campos no editables directamente: ${intentados.join(', ')}. Use las vías controladas (conversiones, movimientos, costos).`
        });
      }

      const updates = [];
      const params = [];

      if (data.nombre !== undefined) { updates.push('nombre = ?'); params.push(data.nombre); }
      if (data.categoria_id !== undefined) { updates.push('categoria_id = ?'); params.push(data.categoria_id === '' ? null : data.categoria_id); }
      if (data.stock_minimo !== undefined) { updates.push('stock_minimo = ?'); params.push(data.stock_minimo); }
      if (data.precio_venta !== undefined) { updates.push('precio_venta = ?'); params.push(data.precio_venta); }
      if (data.activo !== undefined) { updates.push('activo = ?'); params.push(data.activo === 'false' || data.activo === false ? 0 : 1); }
      if (data.descripcion_preparacion !== undefined) { updates.push('descripcion_preparacion = ?'); params.push(data.descripcion_preparacion); }

      // Foto
      if (req.file) {
        updates.push('foto = ?'); params.push(req.file.filename);
        const old = await db.get('SELECT foto FROM productos WHERE id = ?', [id]);
        if (old?.foto) {
          const oldPath = path.join(__dirname, '../../frontend/uploads/productos', old.foto);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      } else if (data.eliminar_foto === 'true') {
        updates.push('foto = NULL');
        const old = await db.get('SELECT foto FROM productos WHERE id = ?', [id]);
        if (old?.foto) {
          const oldPath = path.join(__dirname, '../../frontend/uploads/productos', old.foto);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      await db.run(`UPDATE productos SET ${updates.join(', ')} WHERE id = ?`, params);

      res.json({ message: 'Producto actualizado' });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/productos/:id
  eliminar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      const movs = await db.get('SELECT COUNT(*) as count FROM movimientos_stock WHERE producto_id = ?', [id]);
      if (movs.count > 0) {
        return res.status(400).json({ error: 'No se puede eliminar: tiene movimientos de stock' });
      }

      await db.run('DELETE FROM recetas WHERE producto_padre_id = ? OR producto_hijo_id = ?', [id, id]);
      await db.run('DELETE FROM productos WHERE id = ?', [id]);

      res.json({ message: 'Producto eliminado' });
    } catch (error) {
      next(error);
    }
  },

  // Receta
  obtenerReceta: async (req, res, next) => {
    try {
      const db = await getDb();
      const receta = await db.all(`
        SELECT r.*, p.nombre as producto_nombre, p.codigo as producto_codigo,
               u.nombre as unidad_nombre, u.abreviatura as unidad_abrev, u.tipo as unidad_tipo
        FROM recetas r
        JOIN productos p ON r.producto_hijo_id = p.id
        JOIN unidades u ON p.unidad_venta_id = u.id
        WHERE r.producto_padre_id = ?
      `, [req.params.id]);

      res.json(receta);
    } catch (error) {
      next(error);
    }
  },

  agregarComponente: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { producto_hijo_id, cantidad } = req.body;
      const conversiones = require('../utils/conversiones');

      // Verificar que el padre sea compuesto
      const padre = await db.get(`
      SELECT p.id, p.nombre, p.tipo, uv.abreviatura as unidad_abrev, uv.tipo as unidad_tipo
      FROM productos p
      JOIN unidades uv ON p.unidad_venta_id = uv.id
      WHERE p.id = ?
    `, [id]);

      if (!padre || padre.tipo !== 'compuesto') {
        return res.status(400).json({ error: 'Solo productos compuestos pueden tener receta' });
      }

      // Verificar que el hijo sea a-granel o compuesto elaborado (D5)
      const hijo = await db.get(`
      SELECT p.id, p.nombre, p.tipo, p.sub_tipo,
             uv.abreviatura as unidad_abrev, uv.tipo as unidad_tipo
      FROM productos p
      JOIN unidades uv ON p.unidad_venta_id = uv.id
      WHERE p.id = ?
    `, [producto_hijo_id]);

      if (!hijo) {
        return res.status(400).json({ error: 'Producto no encontrado' });
      }

      const esValido = hijo.tipo === 'simple' && hijo.sub_tipo === 'granel' ||
        hijo.tipo === 'compuesto' && hijo.sub_tipo === 'elaborado';

      if (!esValido) {
        return res.status(400).json({
          error: 'Solo productos a granel o compuestos elaborados pueden ser ingredientes'
        });
      }

      // No puede ser componente de sí mismo
      if (parseInt(id) === parseInt(producto_hijo_id)) {
        return res.status(400).json({ error: 'Un producto no puede ser ingrediente de sí mismo' });
      }

      // Anti-ciclos (D2): el padre no puede aparecer entre los descendientes del hijo
      const ciclo = await db.get(`
        WITH RECURSIVE descendientes(pid) AS (
          SELECT producto_hijo_id AS pid FROM recetas WHERE producto_padre_id = ?
          UNION
          SELECT r.producto_hijo_id FROM recetas r
          JOIN descendientes d ON r.producto_padre_id = d.pid
        )
        SELECT pid FROM descendientes WHERE pid = ? LIMIT 1
      `, [producto_hijo_id, id]);

      if (ciclo) {
        return res.status(400).json({
          error: `No se puede: "${padre.nombre}" ya es ingrediente (directo o indirecto) de "${hijo.nombre}". Se formaría un ciclo.`
        });
      }

      // Insertar o actualizar
      const result = await db.run(`
      INSERT INTO recetas (producto_padre_id, producto_hijo_id, cantidad)
      VALUES (?, ?, ?)
      ON CONFLICT(producto_padre_id, producto_hijo_id) 
      DO UPDATE SET cantidad = ?
    `, [id, producto_hijo_id, cantidad, cantidad]);

      // ✅ Validar sumas si el padre NO se vende en "unidad"
      const esUnidad = padre.unidad_abrev === 'ud';

      if (!esUnidad) {
        // Obtener todos los componentes actuales
        const receta = await db.all(`
        SELECT r.cantidad, uv.tipo as unidad_tipo, uv.abreviatura
        FROM recetas r
        JOIN productos p ON r.producto_hijo_id = p.id
        JOIN unidades uv ON p.unidad_venta_id = uv.id
        WHERE r.producto_padre_id = ?
      `, [id]);

        // Verificar que al menos un componente sea del mismo tipo que el padre
        const mismoTipo = receta.filter(c => c.unidad_tipo === padre.unidad_tipo);

        if (mismoTipo.length === 0) {
          // No bloqueamos, solo advertimos (la validación final será al guardar)
          console.log('⚠️ La receta no tiene componentes del mismo tipo que el producto padre');
        }

        // Calcular suma de componentes del mismo tipo
        const suma = mismoTipo.reduce((s, c) => s + parseFloat(c.cantidad), 0);
        console.log(`📊 Suma de componentes del mismo tipo (${padre.unidad_abrev}): ${suma}`);

        if (suma > 1.0001) {
          return res.status(400).json({
            error: `La suma de componentes del mismo tipo (${padre.unidad_abrev}) no puede exceder 1. Actual: ${suma.toFixed(4)}`
          });
        }
      }

      res.json({ message: 'Componente agregado exitosamente' });

      // Recalcular costo del padre y de quienes lo contienen (D3) — tras responder, sin bloquear
      costos.recalcularPorIngrediente(db, parseInt(id)).catch(e => console.error('Error recalculando costos:', e));

    } catch (error) {
      next(error);
    }
  },

  eliminarComponente: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id, componenteId } = req.params;

      await db.run('DELETE FROM recetas WHERE producto_padre_id = ? AND producto_hijo_id = ?', [id, componenteId]);

      res.json({ message: 'Componente eliminado' });

      // Recalcular costo del padre y de quienes lo contienen (D3)
      costos.recalcularPorIngrediente(db, parseInt(id)).catch(e => console.error('Error recalculando costos:', e));
    } catch (error) {
      next(error);
    }
  },

  // Ficha de costo
  actualizarCosto: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { costo_base, precio_venta } = req.body;

      const producto = await db.get('SELECT tipo FROM productos WHERE id = ?', [id]);
      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      // D3: el costo_base vive en productos. Para compuestos se deriva de la receta
      // (no se acepta manual); para simples se acepta el costo manual de la ficha.
      // margen/gastos/impuesto se toman de parametros_contables (globales, m019).
      if (producto.tipo === 'simple' && costo_base !== undefined) {
        await db.run('UPDATE productos SET costo_base = ? WHERE id = ?', [costo_base || 0, id]);
      }

      if (precio_venta !== undefined) {
        await db.run('UPDATE productos SET precio_venta = ? WHERE id = ?', [precio_venta, id]);
      }

      // Recalcular este producto y los compuestos que lo contienen (D3)
      await costos.recalcularPorIngrediente(db, parseInt(id));

      res.json({ message: 'Ficha de costo actualizada' });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/productos/:id/trazabilidad 
  trazabilidad: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      // Obtener datos del producto
      const producto = await db.get(`
        WITH stock_componentes AS (
          SELECT r.producto_padre_id, MIN(pr.stock_actual / r.cantidad) as stock_efectivo
          FROM recetas r
          JOIN productos pr ON r.producto_hijo_id = pr.id
          WHERE pr.activo = 1
          GROUP BY r.producto_padre_id
        )
        SELECT p.nombre, p.tipo, p.sub_tipo,
              CASE 
                WHEN p.tipo = 'compuesto' AND p.sub_tipo = 'conformado' 
                  THEN COALESCE(sc.stock_efectivo, 0)
                ELSE p.stock_actual
              END as stock_actual,
              uv.abreviatura as unidad_abrev, uv.tipo as unidad_tipo
        FROM productos p
        JOIN unidades uv ON p.unidad_venta_id = uv.id
        LEFT JOIN stock_componentes sc ON p.id = sc.producto_padre_id
        WHERE p.id = ?
      `, [id]);

      if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

      // Compras (entradas)
      const compras = await db.all(`
        SELECT 'compra' as tipo, c.fecha_compra as fecha, 
                cd.cantidad * CASE 
                  WHEN p.unidad_compra_id IS NOT NULL AND p.unidad_compra_id != p.unidad_venta_id
                    THEN (uc.coeficiente / uv.coeficiente)
                  ELSE 1
                END as cantidad,
                c.codigo_factura, prov.nombre as proveedor_nombre
          FROM compra_detalles cd
          JOIN compras c ON cd.compra_id = c.id
          JOIN productos p ON cd.producto_id = p.id
          LEFT JOIN unidades uc ON p.unidad_compra_id = uc.id
          LEFT JOIN unidades uv ON p.unidad_venta_id = uv.id
          LEFT JOIN proveedores prov ON c.proveedor_id = prov.id
          WHERE cd.producto_id = ? AND c.estado_inventario = 'completado'
          ORDER BY c.fecha_compra DESC
        `, [id]);

      // Preparaciones (entradas para compuestos preparables)
      const preparaciones = await db.all(`
        SELECT 'preparacion' as tipo, m.created_at as fecha, m.cantidad, m.observaciones
        FROM movimientos_stock m
        WHERE m.producto_id = ? AND m.tipo = 'preparacion_entrada'
        ORDER BY m.created_at DESC
      `, [id]);

      // Para compuestos no preparables, mostrar las entradas de sus componentes
      const entradasComponentes = await db.all(`
        SELECT 'entrada_componente' as tipo, 
              SUM(m.cantidad) as cantidad, 
              p.nombre as componente_nombre, 
              uv.abreviatura as unidad_abrev,
              uv.tipo as unidad_tipo,
              p.id as producto_id
        FROM movimientos_stock m
        JOIN productos p ON m.producto_id = p.id
        JOIN unidades uv ON p.unidad_venta_id = uv.id
        WHERE m.tipo = 'compra' 
          AND m.producto_id IN (SELECT producto_hijo_id FROM recetas WHERE producto_padre_id = ?)
        GROUP BY p.id
      `, [id]);

      // Ventas (salidas) - incluyendo anuladas
      const ventas = await db.all(`
      SELECT 'venta' as tipo, v.created_at as fecha, 
             CASE WHEN v.estado = 'anulada' THEN vd.cantidad ELSE -vd.cantidad END as cantidad,
             v.id as venta_id, u.nombre_completo as vendedor_nombre, v.estado
      FROM venta_detalles vd
      JOIN ventas v ON vd.venta_id = v.id
      LEFT JOIN usuarios u ON v.vendedor_id = u.id
      WHERE vd.producto_id = ?
      ORDER BY v.created_at DESC
    `, [id]);

      // Calcular totales
      let totalEntradas = 0;
      const ret = {
        compras,
        preparaciones,
        entradasComponentes,
        ventas
      };

      // Total salidas (ventas no anuladas)
      const totalSalidas = ventas.filter(v => v.estado !== 'anulada').reduce((sum, v) => sum + Math.abs(v.cantidad), 0);
      // Total ajustes. ajustes, mermas, devoluciones, donaciones y autoconsumo
      let totalAjustes;

      if (producto.tipo === 'compuesto' && producto.sub_tipo === 'conformado') {
        // Encontrar el componente con menor total de entradas (Pmin)
        let pminComponente = null;
        let pminTotal = Infinity;
        let recetaCantidad = 1;

        for (const c of entradasComponentes) {
          const receta = await db.get(`SELECT cantidad FROM recetas WHERE producto_padre_id = ? AND producto_hijo_id = ?`, [id, c.producto_id]);

          if (receta && receta.cantidad > 0) {
            const disponible = c.cantidad / receta.cantidad;
            if (disponible < pminTotal) {
              pminTotal = c.cantidad;
              pminComponente = c;
              pminComponente.disponible = disponible;
              recetaCantidad = receta.cantidad;
            }
          }
        }

        // B4: si ningún componente tiene entradas, no hay Pmin — responder con ceros
        let ajustes = [];
        if (pminComponente) {
          ajustes = await db.all(`
            SELECT tipo, created_at as fecha, cantidad, ? as observaciones
            FROM movimientos_stock
            WHERE producto_id = ? 
              AND tipo IN ('merma', 'ajuste', 'devolucion', 'donacion', 'autoconsumo')
            ORDER BY created_at DESC
          `, ['producto: ' + (pminComponente.componente_nombre || ''), pminComponente.producto_id]);
        }

        // Usar ajustes de Pmin
        totalAjustes = ajustes.reduce((sum, a) => sum + a.cantidad, 0) / recetaCantidad;

        // Total entradas = cantidad del componente limitante (en su unidad)
        totalEntradas = pminComponente ? pminTotal : 0;
        // Stock esperado = PminTotal / cantidad en receta
        const stockEsperado = pminComponente ? pminComponente.disponible : 0;
        // Stock actual = stock_efectivo
        const stockActual = producto.stock_actual;
        // Diferencia = Stock actual - (Stock esperado - Total salidas)
        const diferencia = stockActual - (stockEsperado - totalSalidas + totalAjustes);
        // Guardar info adicional para mostrar
        producto.pminComponente = pminComponente;
        producto.pminTotal = pminComponente ? pminTotal : 0;
        producto.stockEsperadoCalculado = stockEsperado;
        producto.diferenciaCalculada = diferencia;
        ret.ajustes = ajustes;
        ret.totales = {
          entradas: totalEntradas,
          stockEsperado,
          stockActual,
          diferencia,
          pminNombre: pminComponente?.componente_nombre,
          pminUnidad: pminComponente?.unidad_abrev
        };
      } else {
        const ajustes = await db.all(`
          SELECT tipo, created_at as fecha, cantidad, observaciones
          FROM movimientos_stock
          WHERE producto_id = ? 
            AND tipo IN ('merma', 'ajuste', 'devolucion', 'donacion', 'autoconsumo')
          ORDER BY created_at DESC
        `, [id]);
        totalAjustes = ajustes.reduce((sum, a) => sum + a.cantidad, 0);

        if (producto.tipo === 'compuesto' && producto.sub_tipo === 'elaborado') {
          // Elaborados: sumar preparaciones
          totalEntradas = preparaciones.reduce((sum, p) => sum + p.cantidad, 0);
        } else {
          // Simples: sumar compras (ya convertidas a unidad de venta)
          totalEntradas = compras.reduce((sum, c) => sum + c.cantidad, 0);
        }
        // Stock esperado
        const stockEsperado = totalEntradas - totalSalidas + totalAjustes;
        ret.ajustes = ajustes;
        ret.totales = {
          entradas: totalEntradas,
          stockEsperado,
          stockActual: producto.stock_actual,
          diferencia: producto.stock_actual - stockEsperado
        };
      }
      ret.producto = producto;
      ret.totales.salidas = totalSalidas;
      ret.totales.ajustes = totalAjustes;
      res.json(ret);

    } catch (error) {
      next(error);
    }
  }
};

module.exports = productoController;