const { getDb } = require('../models/db');

const configuracionController = {

  // ============================================
  // PARÁMETROS GENERALES
  // ============================================

  // GET /api/configuracion/general
  obtenerGeneral: async (req, res, next) => {
    try {
      const db = await getDb();
      const config = await db.get('SELECT * FROM configuracion_general WHERE id = 1');

      if (!config) {
        await db.run('INSERT INTO configuracion_general (id, ventas_proyectadas, margen_recomendado, impuesto_ventas) VALUES (1, 10000, 20, 15)');
        const nuevo = await db.get('SELECT * FROM configuracion_general WHERE id = 1');
        return res.json(nuevo);
      }

      const s = await db.get('SELECT SUM(valor_mensual) as total FROM configuracion_gastos WHERE activo = 1');
      const gastosFijos = s?.total || 0;
      const ventas = config.ventas_proyectadas || 10000;
      const margenRec = (config.margen_recomendado || 20) / 100;
      const impuesto = (config.impuesto_ventas || 15) / 100;

      // v = volumen de ventas - (impuesto + margen) * volumen de ventas
      const v = ventas - (impuesto + margenRec) * ventas;

      // % de gastos fijos = s / v * 100
      const porcentajeGastos = v > 0 ? (gastosFijos / v) * 100 : 0;

      config.total_gastos_fijos = gastosFijos;
      config.porcentaje_gastos = Math.round(porcentajeGastos * 100) / 100; // Redondear a 2 decimales

      res.json(config);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/configuracion/general
  actualizarGeneral: async (req, res, next) => {
    try {
      const db = await getDb();
      const { ventas_proyectadas, margen_recomendado, impuesto_ventas } = req.body;

      await db.run(`
        UPDATE configuracion_general 
        SET ventas_proyectadas = ?, margen_recomendado = ?, impuesto_ventas = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `, [ventas_proyectadas, margen_recomendado, impuesto_ventas]);

      res.json({ message: 'Configuración actualizada correctamente' });
    } catch (error) {
      next(error);
    }
  },

  // ============================================
  // GASTOS FIJOS
  // ============================================

  // GET /api/configuracion/gastos
  listarGastos: async (req, res, next) => {
    try {
      const db = await getDb();
      const gastos = await db.all(`
        SELECT id, concepto, valor_mensual, activo 
        FROM configuracion_gastos 
        ORDER BY activo DESC, concepto ASC
      `);

      const total = gastos.filter(g => g.activo).reduce((sum, g) => sum + g.valor_mensual, 0);

      res.json({ gastos, total });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/configuracion/gastos
  crearGasto: async (req, res, next) => {
    try {
      const db = await getDb();
      const { concepto, valor_mensual } = req.body;

      if (!concepto || valor_mensual === undefined) {
        return res.status(400).json({ error: 'Concepto y valor son requeridos' });
      }

      const result = await db.run(
        'INSERT INTO configuracion_gastos (concepto, valor_mensual) VALUES (?, ?)',
        [concepto, valor_mensual]
      );

      res.status(201).json({
        id: result.lastID,
        message: 'Gasto creado correctamente'
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/configuracion/gastos/:id
  actualizarGasto: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { concepto, valor_mensual, activo } = req.body;

      await db.run(`
        UPDATE configuracion_gastos 
        SET concepto = ?, valor_mensual = ?, activo = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [concepto, valor_mensual, activo ? 1 : 0, id]);

      res.json({ message: 'Gasto actualizado correctamente' });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/configuracion/gastos/:id
  eliminarGasto: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      await db.run('DELETE FROM configuracion_gastos WHERE id = ?', [id]);

      res.json({ message: 'Gasto eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  },

  // ============================================
  // CATEGORÍAS
  // ============================================

  // GET /api/categorias
  listarCategorias: async (req, res, next) => {
    try {
      const db = await getDb();
      const categorias = await db.all('SELECT * FROM categorias ORDER BY nombre');
      res.json(categorias);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/categorias
  crearCategoria: async (req, res, next) => {
    try {
      const db = await getDb();
      const { nombre, descripcion } = req.body;
      if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

      const result = await db.run('INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)', [nombre, descripcion || null]);
      res.status(201).json({ id: result.lastID, message: 'Categoría creada' });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/categorias/:id
  actualizarCategoria: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { nombre, descripcion } = req.body;
      await db.run('UPDATE categorias SET nombre = ?, descripcion = ? WHERE id = ?', [nombre, descripcion || null, id]);
      res.json({ message: 'Categoría actualizada' });
    } catch (error) {
      next(error);
    }
  },

  // ============================================
  // UNIDADES
  // ============================================

  // GET /api/configuracion/unidades
  listarUnidades: async (req, res, next) => {
    try {
      const db = await getDb();

      // Obtener todas las unidades de la BD (incluye las base y las personalizadas)
      const unidades = await db.all(
        'SELECT * FROM unidades WHERE activo = 1 ORDER BY tipo, coeficiente'
      );

      res.json(unidades);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/configuracion/unidades
  crearUnidad: async (req, res, next) => {
    try {
      const db = await getDb();
      const { tipo, nombre, abreviatura, coeficiente } = req.body;

      if (!tipo || !nombre || !abreviatura || !coeficiente) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
      }

      if (!['unidad', 'volumen', 'peso', 'longitud'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo inválido' });
      }

      const result = await db.run(
        'INSERT INTO unidades (tipo, nombre, abreviatura, coeficiente) VALUES (?, ?, ?, ?)',
        [tipo, nombre, abreviatura, coeficiente]
      );

      res.status(201).json({ id: result.lastID, message: 'Unidad creada' });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/configuracion/unidades/:id
  actualizarUnidad: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      // Proteger unidades base
      if (parseInt(id) <= 4) {
        return res.status(403).json({ error: 'Las unidades base no se pueden modificar' });
      }

      const { tipo, nombre, abreviatura, coeficiente, activo } = req.body;

      await db.run(
        'UPDATE unidades SET tipo = ?, nombre = ?, abreviatura = ?, coeficiente = ?, activo = ? WHERE id = ?',
        [tipo, nombre, abreviatura, coeficiente, activo ? 1 : 0, id]
      );

      res.json({ message: 'Unidad actualizada' });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/configuracion/unidades/:id
  eliminarUnidad: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      // Proteger unidades base
      if (parseInt(id) <= 4) {
        return res.status(403).json({ error: 'Las unidades base no se pueden eliminar' });
      }

      // Verificar que no esté en uso
      const enUso = await db.get(
        'SELECT COUNT(*) as count FROM productos WHERE unidad_venta_id = ? OR unidad_compra_id = ?',
        [id, id]
      );

      if (enUso.count > 0) {
        return res.status(400).json({ error: 'No se puede eliminar: hay productos que usan esta unidad' });
      }

      await db.run('DELETE FROM unidades WHERE id = ?', [id]);
      res.json({ message: 'Unidad eliminada' });
    } catch (error) {
      next(error);
    }
  },

  // ============================================
  // TÉRMINOS DE PAGO
  // ============================================

  // GET /api/configuracion/terminos-pago
  listarTerminosPago: async (req, res, next) => {
    try {
      console.log('cargando terminos de pago')
      const db = await getDb();
      const terminos = await db.all('SELECT id, nombre, dias, activo FROM terminos_pago ORDER BY dias');
      console.log('terminos: ', terminos)
      res.json(terminos);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/configuracion/terminos-pago
  crearTerminoPago: async (req, res, next) => {
    try {
      const db = await getDb();
      const { nombre, dias } = req.body;
      if (!nombre || dias === undefined) return res.status(400).json({ error: 'Nombre y días requeridos' });

      const result = await db.run('INSERT INTO terminos_pago (nombre, dias) VALUES (?, ?)', [nombre, dias]);
      res.status(201).json({ id: result.lastID, message: 'Término de pago creado' });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/configuracion/terminos-pago/:id
  actualizarTerminoPago: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { nombre, dias, activo } = req.body;
      await db.run('UPDATE terminos_pago SET nombre = ?, dias = ?, activo = ? WHERE id = ?',
        [nombre, dias, activo ? 1 : 0, id]);
      res.json({ message: 'Término de pago actualizado' });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/configuracion/terminos-pago/:id
  eliminarTerminoPago: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      await db.run('DELETE FROM terminos_pago WHERE id = ?', [id]);
      res.json({ message: 'Término de pago eliminado' });
    } catch (error) {
      next(error);
    }
  }


};

module.exports = configuracionController;