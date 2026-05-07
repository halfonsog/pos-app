const { getDb } = require('../models/db');
const path = require('path');
const fs = require('fs');
const conversiones = require('../utils/conversiones');

const productoController = {

  // GET /api/productos
  listar: async (req, res, next) => {
    try {
      const db = await getDb();

      const productos = await db.all(`
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
        ORDER BY p.nombre
      `);

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
        uc.abreviatura as unidad_compra_abrev,
        pc.costo_base,
        pc.margen,
        pc.gastos_fijos,
        pc.impuesto
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN unidades uv ON p.unidad_venta_id = uv.id
      LEFT JOIN unidades uc ON p.unidad_compra_id = uc.id
      LEFT JOIN producto_costos pc ON p.id = pc.producto_id
      WHERE p.id = ?
    `, [id]);

      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      // Obtener receta si es compuesto (ANTES de calcular costo)
      if (producto.tipo === 'compuesto') {
        producto.receta = await db.all(`
          SELECT 
            r.*,
            p.nombre as producto_nombre,
            p.codigo as producto_codigo,
            p.precio_venta,
            p.tipo,
            u.nombre as unidad_nombre,
            u.abreviatura as unidad_abrev,
            u.tipo as unidad_tipo,
            pc.costo_base as costo_ficha
          FROM recetas r
          JOIN productos p ON r.producto_hijo_id = p.id
          JOIN unidades u ON p.unidad_venta_id = u.id
          LEFT JOIN producto_costos pc ON p.id = pc.producto_id
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

            c.costo_unitario = ultimaCompra?.precio_unitario || 0;
          } else {
            c.costo_unitario = c.costo_ficha;
          }
        }


        // Calcular costo base desde la receta si no tiene costo configurado
        if (!producto.costo_base || producto.costo_base === 0) {
          let costoTotal = 0;
          for (const c of producto.receta) {
            const costoComponente = c.costo_unitario || (c.precio_venta ? c.precio_venta / 1.15 : 0);
            costoTotal += costoComponente * c.cantidad;
          }
          producto.costo_base = Math.round(costoTotal * 100) / 100;
        }
      }

      // Costo base para simples (última compra)
      if (producto.tipo === 'simple') {
        const ultimaCompra = await db.get(`
        SELECT cd.precio_unitario, c.fecha_compra
        FROM compra_detalles cd
        JOIN compras c ON cd.compra_id = c.id
        WHERE cd.producto_id = ?
        ORDER BY c.fecha_compra DESC LIMIT 1
      `, [id]);

        if (ultimaCompra && (!producto.costo_base || producto.costo_base === 0)) {
          producto.costo_base = ultimaCompra.precio_unitario;
        }
      }

      // Valores por defecto desde configuración
      const config = await db.get('SELECT * FROM configuracion_general WHERE id = 1');

      producto.costo_base = producto.costo_base || 0;
      producto.margen = producto.margen || (config?.margen_recomendado || 20);
      producto.gastos_fijos = producto.gastos_fijos || (config?.porcentaje_gastos || 0);
      producto.impuesto = producto.impuesto || (config?.impuesto_ventas || 15);

      // Dependencias
      const ventas = await db.get('SELECT COUNT(*) as count FROM movimientos_stock WHERE producto_id = ?', [id]);
      const compras = await db.get('SELECT COUNT(*) as count FROM compra_detalles WHERE producto_id = ?', [id]);
      const recetaPadre = await db.get('SELECT COUNT(*) as count FROM recetas WHERE producto_padre_id = ?', [id]);

      producto.tiene_ventas = ventas.count > 0;
      producto.tiene_compras = compras.count > 0;
      producto.tiene_dependencias = (ventas.count > 0 || compras.count > 0 || recetaPadre.count > 0);

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

      let factor = 1;

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
          factor = await conversiones.obtenerCoeficienteConversion(data.unidad_compra_id, data.unidad_venta_id);
        } else {
          // Reventa: solo unidades
          data.unidad_compra_id = null;
          const tipoVenta = await conversiones.obtenerTipo(data.unidad_venta_id);
          if (tipoVenta !== 'unidad') {
            return res.status(400).json({ error: 'Productos de reventa solo usan unidades tipo "unidad"' });
          }
        }
      } else {
        // Compuesto: sin unidad de compra
        data.unidad_compra_id = null;
      }

      const foto = req.file ? req.file.filename : null;

      const result = await db.run(`
        INSERT INTO productos (codigo, nombre, tipo, sub_tipo, requiere_preparacion,
          categoria_id, unidad_venta_id, unidad_compra_id, factor_conversion, stock_minimo, activo, foto)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.codigo, data.nombre, data.tipo, data.sub_tipo || null,
        data.requiere_preparacion ? 1 : 0, data.categoria_id || null,
        data.unidad_venta_id, data.unidad_compra_id || null,
        data.stock_minimo || 0, data.activo !== false ? 1 : 0, foto
      ]);

      res.status(201).json({ id: result.lastID, message: 'Producto creado' });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/productos/:id
  actualizar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const data = req.body;

      const updates = [];
      const params = [];

      if (data.nombre !== undefined) { updates.push('nombre = ?'); params.push(data.nombre); }
      if (data.categoria_id !== undefined) { updates.push('categoria_id = ?'); params.push(data.categoria_id === '' ? null : data.categoria_id); }
      if (data.unidad_venta_id !== undefined) { updates.push('unidad_venta_id = ?'); params.push(data.unidad_venta_id); }
      if (data.unidad_compra_id !== undefined) { updates.push('unidad_compra_id = ?'); params.push(data.unidad_compra_id === '' ? null : data.unidad_compra_id); }
      if (data.stock_minimo !== undefined) { updates.push('stock_minimo = ?'); params.push(data.stock_minimo); }
      if (data.activo !== undefined) { updates.push('activo = ?'); params.push(data.activo === 'false' || data.activo === false ? 0 : 1); }
      if (data.requiere_preparacion !== undefined) { updates.push('requiere_preparacion = ?'); params.push(data.requiere_preparacion === 'true' || data.requiere_preparacion === true ? 1 : 0); }
      if (data.descripcion_preparacion !== undefined) { updates.push('descripcion_preparacion = ?'); params.push(data.descripcion_preparacion); }

      let factor = 1;
      if (data.unidad_compra_id && data.unidad_venta_id) {
        factor = await conversiones.obtenerCoeficienteConversion(data.unidad_compra_id, data.unidad_venta_id);
      }
      updates.push('factor_conversion = ?');
      params.push(factor);

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

      // Verificar que el hijo sea a-granel o compuesto/preparable
      const hijo = await db.get(`
      SELECT p.id, p.nombre, p.tipo, p.sub_tipo, p.requiere_preparacion,
             uv.abreviatura as unidad_abrev, uv.tipo as unidad_tipo
      FROM productos p
      JOIN unidades uv ON p.unidad_venta_id = uv.id
      WHERE p.id = ?
    `, [producto_hijo_id]);

      if (!hijo) {
        return res.status(400).json({ error: 'Producto no encontrado' });
      }

      const esValido = hijo.tipo === 'simple' && hijo.sub_tipo === 'granel' ||
        hijo.tipo === 'compuesto' && hijo.requiere_preparacion;

      if (!esValido) {
        return res.status(400).json({
          error: 'Solo productos a granel o compuestos preparables pueden ser componentes'
        });
      }

      // No puede ser componente de sí mismo
      if (parseInt(id) === parseInt(producto_hijo_id)) {
        return res.status(400).json({ error: 'Un producto no puede ser componente de sí mismo' });
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
    } catch (error) {
      next(error);
    }
  },

  // Ficha de costo
  actualizarCosto: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { costo_base, margen, gastos_fijos, impuesto, precio_venta } = req.body;

      await db.run(`
        INSERT INTO producto_costos (producto_id, costo_base, margen, gastos_fijos, impuesto)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(producto_id) DO UPDATE SET
          costo_base = excluded.costo_base,
          margen = excluded.margen,
          gastos_fijos = excluded.gastos_fijos,
          impuesto = excluded.impuesto,
          updated_at = CURRENT_TIMESTAMP
      `, [id, costo_base || 0, margen || 20, gastos_fijos || 0, impuesto || 15]);

      if (precio_venta !== undefined) {
        await db.run('UPDATE productos SET precio_venta = ? WHERE id = ?', [precio_venta, id]);
      }

      res.json({ message: 'Ficha de costo actualizada' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = productoController;