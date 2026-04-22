const { getDb } = require('../models/db');
const path = require('path');
const fs = require('fs');

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
        (SELECT COUNT(*) FROM movimientos_stock WHERE producto_id = p.id) as ventas_count,
        (SELECT COUNT(*) FROM compra_detalles WHERE producto_id = p.id) as compras_count,
        (SELECT COUNT(*) FROM recetas WHERE producto_padre_id = p.id) as receta_count
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN unidades uv ON p.unidad_venta_id = uv.id
      ORDER BY p.nombre
    `);

      // Añadir campo calculado
      productos.forEach(p => {
        p.tiene_dependencias = (p.ventas_count > 0 || p.compras_count > 0 || p.receta_count > 0);
      });

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

      // Valores por defecto si no hay configuración
      producto.costo_base = producto.costo_base || 0;
      producto.margen = producto.margen || 30;
      producto.gastos_fijos = producto.gastos_fijos || 15;
      producto.impuesto = producto.impuesto || 7;

      // Verificar dependencias
      const ventas = await db.get(
        'SELECT COUNT(*) as count FROM movimientos_stock WHERE producto_id = ?',
        [id]
      );

      const compras = await db.get(
        'SELECT COUNT(*) as count FROM compra_detalles WHERE producto_id = ?',
        [id]
      );

      const recetaPadre = await db.get(
        'SELECT COUNT(*) as count FROM recetas WHERE producto_padre_id = ?',
        [id]
      );

      producto.tiene_ventas = ventas.count > 0;
      producto.tiene_compras = compras.count > 0;
      producto.tiene_dependencias = (ventas.count > 0 || compras.count > 0 || recetaPadre.count > 0);

      res.json(producto);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/productos/:id/costo 
  actualizarCosto: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { costo_base, margen, gastos_fijos, impuesto, precio_venta } = req.body;

      // Actualizar o insertar configuración de costo
      await db.run(`
      INSERT INTO producto_costos (producto_id, costo_base, margen, gastos_fijos, impuesto)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(producto_id) DO UPDATE SET
        costo_base = excluded.costo_base,
        margen = excluded.margen,
        gastos_fijos = excluded.gastos_fijos,
        impuesto = excluded.impuesto,
        updated_at = CURRENT_TIMESTAMP
    `, [id, costo_base || 0, margen || 30, gastos_fijos || 15, impuesto || 7]);

      // Actualizar precio de venta en producto
      if (precio_venta !== undefined) {
        await db.run(
          'UPDATE productos SET precio_venta = ? WHERE id = ?',
          [precio_venta, id]
        );
      }

      res.json({ message: 'Ficha de costo actualizada exitosamente' });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/productos
  crear: async (req, res, next) => {
    try {
      const db = await getDb();
      const data = req.body;

      if (!data.codigo || !data.nombre) {
        return res.status(400).json({ error: 'Código y nombre son requeridos' });
      }

      // Verificar código único
      const existing = await db.get(
        'SELECT id FROM productos WHERE codigo = ?',
        [data.codigo]
      );

      if (existing) {
        return res.status(400).json({ error: 'Ya existe un producto con ese código' });
      }

      const result = await db.run(`
                INSERT INTO productos (
                    codigo, nombre, tipo, sub_tipo, requiere_preparacion,
                    categoria_id, unidad_venta_id, unidad_compra_id,
                    factor_conversion, stock_minimo, activo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
        data.codigo,
        data.nombre,
        data.tipo,
        data.sub_tipo || null,
        data.requiere_preparacion ? 1 : 0,
        data.categoria_id || null,
        data.unidad_venta_id,
        data.unidad_compra_id || null,
        data.factor_conversion || 1,
        data.stock_minimo || 0,
        data.activo !== false ? 1 : 0
      ]);

      if (req.file) {
        const fotoNombre = req.file.filename;
        await db.run('UPDATE productos SET foto = ? WHERE id = ?', [fotoNombre, result.lastID]);
      }

      res.status(201).json({
        id: result.lastID,
        message: 'Producto creado exitosamente'
      });

    } catch (error) {
      next(error);
    }
  },

  // POST /api/productos/:id/receta
  agregarComponente: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { producto_hijo_id, cantidad } = req.body;

      console.log('📝 [BACKEND] Agregando componente:', { id, producto_hijo_id, cantidad });

      // Verificar que el producto padre sea compuesto
      const padre = await db.get(
        'SELECT tipo, nombre FROM productos WHERE id = ?',
        [id]
      );

      console.log('📦 [BACKEND] Producto padre:', padre);

      if (!padre || padre.tipo !== 'compuesto') {
        console.log('❌ [BACKEND] El producto padre no es compuesto');
        return res.status(400).json({
          error: 'Solo productos compuestos pueden tener receta'
        });
      }

      // Verificar que el producto hijo existe
      const hijo = await db.get(
        'SELECT id, nombre FROM productos WHERE id = ?',
        [producto_hijo_id]
      );

      console.log('📦 [BACKEND] Producto hijo:', hijo);

      if (!hijo) {
        console.log('❌ [BACKEND] El producto hijo no existe');
        return res.status(400).json({
          error: 'El producto seleccionado no existe'
        });
      }

      // Verificar que no se agregue a sí mismo
      if (parseInt(id) === parseInt(producto_hijo_id)) {
        console.log('❌ [BACKEND] No puede agregarse a sí mismo');
        return res.status(400).json({
          error: 'Un producto no puede ser componente de sí mismo'
        });
      }

      // Insertar
      const result = await db.run(`
      INSERT INTO recetas (producto_padre_id, producto_hijo_id, cantidad)
      VALUES (?, ?, ?)
      ON CONFLICT(producto_padre_id, producto_hijo_id) 
      DO UPDATE SET cantidad = ?
    `, [id, producto_hijo_id, cantidad, cantidad]);

      console.log('✅ [BACKEND] Componente agregado. Filas afectadas:', result.changes);

      // Verificar que se guardó
      const verificacion = await db.get(`
      SELECT * FROM recetas 
      WHERE producto_padre_id = ? AND producto_hijo_id = ?
    `, [id, producto_hijo_id]);

      console.log('🔍 [BACKEND] Verificación:', verificacion);

      res.json({ message: 'Componente agregado exitosamente' });

    } catch (error) {
      console.error('❌ [BACKEND] Error en agregarComponente:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // DELETE /api/productos/:id/receta/:componenteId
  eliminarComponente: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id, componenteId } = req.params;

      await db.run(
        'DELETE FROM recetas WHERE producto_padre_id = ? AND producto_hijo_id = ?',
        [id, componenteId]
      );

      res.json({ message: 'Componente eliminado exitosamente' });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/productos/:id (ampliar para aceptar más campos)
  actualizar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const data = req.body;

      console.log('📝 Actualizando producto:', id);
      console.log('📸 req.file:', req.file ? req.file.filename : 'NINGUNO');
      console.log('📦 req.body:', data);

      const updates = [];
      const params = [];

      if (data.nombre !== undefined) {
        updates.push('nombre = ?');
        params.push(data.nombre);
      }
      if (data.categoria_id !== undefined) {
        updates.push('categoria_id = ?');
        params.push(data.categoria_id === '' ? null : data.categoria_id);
      }
      if (data.unidad_venta_id !== undefined) {
        updates.push('unidad_venta_id = ?');
        params.push(data.unidad_venta_id);
      }
      if (data.unidad_compra_id !== undefined) {
        updates.push('unidad_compra_id = ?');
        params.push(data.unidad_compra_id === '' ? null : data.unidad_compra_id);
      }
      if (data.factor_conversion !== undefined) {
        updates.push('factor_conversion = ?');
        params.push(data.factor_conversion);
      }
      if (data.stock_minimo !== undefined) {
        updates.push('stock_minimo = ?');
        params.push(data.stock_minimo);
      }
      if (data.activo !== undefined) {
        updates.push('activo = ?');
        params.push(data.activo === 'false' || data.activo === false ? 0 : 1);
      }
      if (data.descripcion_preparacion !== undefined) {
        updates.push('descripcion_preparacion = ?');
        params.push(data.descripcion_preparacion);
      }
      if (data.requiere_preparacion !== undefined) {
        updates.push('requiere_preparacion = ?');
        params.push(data.requiere_preparacion === 'true' || data.requiere_preparacion === true ? 1 : 0);
      }

      // ✅ Manejar foto NUEVA
      if (req.file) {
        updates.push('foto = ?');
        params.push(req.file.filename);
        console.log('✅ Foto nueva guardada:', req.file.filename);

        // Eliminar foto anterior
        const oldProduct = await db.get('SELECT foto FROM productos WHERE id = ?', [id]);
        if (oldProduct && oldProduct.foto) {
          const oldPath = path.join(__dirname, '../../frontend/uploads/productos', oldProduct.foto);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
            console.log('🗑️ Foto anterior eliminada:', oldProduct.foto);
          }
        }
      }
      // ✅ Manejar ELIMINAR foto
      else if (data.eliminar_foto === 'true') {
        updates.push('foto = NULL');
        // ⚠️ NO se añade ningún parámetro para NULL en SQLite con ??
        // La query debe ser: foto = NULL (sin placeholder)
        console.log('🗑️ Marca para eliminar foto');

        // Eliminar archivo físico
        const oldProduct = await db.get('SELECT foto FROM productos WHERE id = ?', [id]);
        if (oldProduct && oldProduct.foto) {
          const oldPath = path.join(__dirname, '../../frontend/uploads/productos', oldProduct.foto);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
            console.log('🗑️ Archivo físico eliminado:', oldProduct.foto);
          }
        }
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No hay campos para actualizar' });
      }

      params.push(id);

      const query = `UPDATE productos SET ${updates.join(', ')} WHERE id = ?`;
      console.log('📝 Query:', query);
      console.log('📝 Params:', params);
      console.log('📝 Nº updates:', updates.length, 'Nº params:', params.length);

      await db.run(query, params);

      res.json({ message: 'Producto actualizado exitosamente' });

    } catch (error) {
      console.error('❌ Error actualizando:', error);
      next(error);
    }
  },

  // DELETE /api/productos/:id
  eliminar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      console.log('🗑️ DELETE /api/productos/' + id);

      // Verificar dependencias
      const ventas = await db.get(
        'SELECT COUNT(*) as count FROM movimientos_stock WHERE producto_id = ? AND tipo = "venta"',
        [id]
      );
      console.log('📊 Ventas asociadas:', ventas.count);

      const compras = await db.get(
        'SELECT COUNT(*) as count FROM compra_detalles WHERE producto_id = ?',
        [id]
      );
      console.log('📊 Compras asociadas:', compras.count);

      const recetaPadre = await db.get(
        'SELECT COUNT(*) as count FROM recetas WHERE producto_padre_id = ?',
        [id]
      );
      console.log('📊 Es padre en recetas:', recetaPadre.count);

      const recetaHijo = await db.get(
        'SELECT COUNT(*) as count FROM recetas WHERE producto_hijo_id = ?',
        [id]
      );
      console.log('📊 Es hijo en recetas:', recetaHijo.count);

      if (ventas.count > 0 || compras.count > 0) {
        console.log('❌ No se puede eliminar: tiene movimientos');
        return res.status(400).json({
          error: 'No se puede eliminar: El producto tiene movimientos de stock o compras asociadas'
        });
      }

      // Eliminar recetas donde es hijo
      if (recetaHijo.count > 0) {
        await db.run('DELETE FROM recetas WHERE producto_hijo_id = ?', [id]);
        console.log('🗑️ Eliminado de recetas como hijo');
      }

      // Eliminar el producto
      const result = await db.run('DELETE FROM productos WHERE id = ?', [id]);
      console.log('🗑️ Resultado DELETE:', result.changes, 'filas afectadas');

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      res.json({ message: 'Producto eliminado exitosamente' });

    } catch (error) {
      console.error('❌ Error eliminando:', error);
      next(error);
    }
  },

  // GET /api/productos/:id/receta
  obtenerReceta: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      const receta = await db.all(`
                SELECT 
                    r.*,
                    p.nombre as producto_nombre,
                    p.codigo as producto_codigo,
                    u.abreviatura as unidad_abrev
                FROM recetas r
                JOIN productos p ON r.producto_hijo_id = p.id
                JOIN unidades u ON p.unidad_venta_id = u.id
                WHERE r.producto_padre_id = ?
            `, [id]);

      res.json(receta);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = productoController;