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
        // Crear por defecto
        await db.run('INSERT INTO configuracion_general (id, ventas_proyectadas, margen_recomendado, impuesto_ventas) VALUES (1, 10000, 20, 15)');
        config = await db.get('SELECT * FROM configuracion_general WHERE id = 1');
      }

      // Calcular % de gastos fijos
      const totalGastos = await db.get('SELECT SUM(valor_mensual) as total FROM configuracion_gastos WHERE activo = 1');
      const gastosTotales = totalGastos?.total || 0;
      const ventasProyectadas = config.ventas_proyectadas || 10000;

      config.total_gastos_fijos = gastosTotales;
      config.porcentaje_gastos = ventasProyectadas > 0 ? (gastosTotales / ventasProyectadas) * 100 : 0;

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

  // GET /api/unidades
  listarUnidades: async (req, res, next) => {
    try {
      const db = await getDb();
      const unidades = await db.all('SELECT * FROM unidades ORDER BY nombre');
      res.json(unidades);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/unidades
  crearUnidad: async (req, res, next) => {
    try {
      const db = await getDb();
      const { nombre, abreviatura, tipo } = req.body;
      if (!nombre || !abreviatura) return res.status(400).json({ error: 'Nombre y abreviatura requeridos' });

      const result = await db.run('INSERT INTO unidades (nombre, abreviatura, tipo) VALUES (?, ?, ?)', [nombre, abreviatura, tipo || 'ambas']);
      res.status(201).json({ id: result.lastID, message: 'Unidad creada' });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/unidades/:id
  actualizarUnidad: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { nombre, abreviatura, tipo } = req.body;
      await db.run('UPDATE unidades SET nombre = ?, abreviatura = ?, tipo = ? WHERE id = ?', [nombre, abreviatura, tipo, id]);
      res.json({ message: 'Unidad actualizada' });
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
      const db = await getDb();
      const terminos = await db.all('SELECT id, nombre, dias, activo FROM terminos_pago ORDER BY dias');
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