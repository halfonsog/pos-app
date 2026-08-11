const { getDb } = require('../models/db');
const costos = require('../utils/costos');

const configuracionController = {

  // ============================================
  // PARÁMETROS GENERALES
  // ============================================

  // GET /api/configuracion/general
  obtenerGeneral: async (req, res, next) => {
    try {
      const db = await getDb();
      const config = await db.get('SELECT * FROM parametros_contables WHERE id = 1');

      if (!config) {
        await db.run('INSERT INTO parametros_contables (id, ventas_proyectadas, margen_recomendado, impuesto_ventas,impuesto_ganancia) VALUES (1, 250000, 20, 15, 35)');
        const nuevo = await db.get('SELECT * FROM parametros_contables WHERE id = 1');
        return res.json(nuevo);
      }

      const s = await db.get('SELECT SUM(valor_mensual) as total FROM configuracion_gastos WHERE activo = 1');
      const gastosFijos = s?.total || 0;
      const ventas = config.ventas_proyectadas || 250000;

      // % de gastos = (Σ gastos activos + gasto financiero del mes) ÷ ventas_proyectadas
      // (fórmula del propietario, D3; el gasto financiero = próximo vencimiento de préstamos/inversiones, m020)
      const { gastoFinancieroMes } = require('./prestamoInversionController');
      const gastoFinanciero = await gastoFinancieroMes(db);

      const porcentajeGastos = ventas > 0 ? ((gastosFijos + gastoFinanciero) / ventas) * 100 : 0;

      config.total_gastos_fijos = gastosFijos;
      config.gasto_financiero_mes = gastoFinanciero;
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
      const { ventas_proyectadas, margen_recomendado, impuesto_ventas, redondeo_venta, impuesto_ganancia,
              salario_minimo, base_contribucion_especial, limite_escala_retencion,
              porciento_declarar, dia_pago_bonos } = req.body;

      // Leer actuales para no pisar con undefined los campos no enviados
      const actual = await db.get('SELECT * FROM parametros_contables WHERE id = 1');

      await db.run(`
      UPDATE parametros_contables 
      SET ventas_proyectadas = ?, margen_recomendado = ?, impuesto_ventas = ?, 
          redondeo_venta = ?, impuesto_ganancia = ?,
          salario_minimo = ?, base_contribucion_especial = ?, limite_escala_retencion = ?,
          porciento_declarar = ?, dia_pago_bonos = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [
        ventas_proyectadas ?? actual.ventas_proyectadas,
        margen_recomendado ?? actual.margen_recomendado,
        impuesto_ventas ?? actual.impuesto_ventas,
        redondeo_venta ?? actual.redondeo_venta ?? 5,
        impuesto_ganancia ?? actual.impuesto_ganancia,
        salario_minimo ?? actual.salario_minimo,
        base_contribucion_especial ?? actual.base_contribucion_especial,
        limite_escala_retencion ?? actual.limite_escala_retencion,
        porciento_declarar ?? actual.porciento_declarar ?? 100,
        dia_pago_bonos ?? actual.dia_pago_bonos ?? 5
      ]);

      // D3: cambio de parámetros → recalcular precio_recomendado de todos los productos
      await costos.recalcularTodosLosPrecios(db);

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

      // D3: los gastos fijos alimentan el % de absorción → recalcular precios recomendados
      await costos.recalcularTodosLosPrecios(db);

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

      await costos.recalcularTodosLosPrecios(db);

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

      await costos.recalcularTodosLosPrecios(db);

      res.json({ message: 'Gasto eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  },

  // ============================================
  // DENOMINACIONES
  // ============================================

  // GET /api/configuracion/denominaciones
  listarDenominaciones: async (req, res, next) => {
    try {
      const db = await getDb();
      const denom = await db.all('SELECT * FROM denominaciones WHERE activo = 1 ORDER BY valor DESC');
      res.json(denom);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/configuracion/denominaciones/todas
  listarDenominacionesTodas: async (req, res, next) => {
    try {
      const db = await getDb();
      const denom = await db.all('SELECT * FROM denominaciones ORDER BY valor DESC');
      res.json(denom);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/configuracion/denominaciones/:id
  actualizarDenominacion: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { activo } = req.body;
      await db.run('UPDATE denominaciones SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
      res.json({ message: 'Denominación actualizada' });
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
      const categorias = await db.all(`
        SELECT c.*, p.nombre AS padre_nombre
        FROM categorias c
        LEFT JOIN categorias p ON c.padre_id = p.id
        ORDER BY COALESCE(c.padre_id, c.id), c.padre_id IS NOT NULL, c.nombre
      `);
      res.json(categorias);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/categorias
  crearCategoria: async (req, res, next) => {
    try {
      const db = await getDb();
      const { nombre, descripcion, padre_id } = req.body;
      if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

      if (padre_id) {
        const padre = await db.get('SELECT id FROM categorias WHERE id = ?', [padre_id]);
        if (!padre) return res.status(400).json({ error: 'La categoría padre no existe' });
      }

      const result = await db.run('INSERT INTO categorias (nombre, descripcion, padre_id) VALUES (?, ?, ?)',
        [nombre, descripcion || null, padre_id || null]);
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
      const { nombre, descripcion, padre_id } = req.body;

      if (padre_id !== undefined && padre_id !== null && padre_id !== '') {
        // Anti-ciclo: el padre no puede ser la propia categoría ni una descendiente (D8)
        if (parseInt(padre_id) === parseInt(id)) {
          return res.status(400).json({ error: 'Una categoría no puede ser su propia padre' });
        }
        const ciclo = await db.get(`
          WITH RECURSIVE ancestros(aid) AS (
            SELECT padre_id AS aid FROM categorias WHERE id = ?
            UNION
            SELECT c.padre_id FROM categorias c
            JOIN ancestros a ON c.id = a.aid
            WHERE c.padre_id IS NOT NULL
          )
          SELECT aid FROM ancestros WHERE aid = ? LIMIT 1
        `, [padre_id, id]);
        if (ciclo) {
          return res.status(400).json({ error: 'No se puede: se formaría un ciclo en las categorías' });
        }
      }

      await db.run('UPDATE categorias SET nombre = ?, descripcion = ?, padre_id = ? WHERE id = ?',
        [nombre, descripcion || null, (padre_id === '' || padre_id === undefined) ? null : padre_id, id]);
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
        'SELECT * FROM unidades WHERE activo = 1 ORDER BY nombre, tipo, coeficiente'
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

      if (parseFloat(coeficiente) <= 0) {
        return res.status(400).json({ error: 'El coeficiente de conversión respecto a la unidad base debe ser mayor que cero' });
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

      if (coeficiente !== undefined && parseFloat(coeficiente) <= 0) {
        return res.status(400).json({ error: 'El coeficiente debe ser mayor que cero' });
      }

      // Si la unidad está en uso por productos, NO se puede cambiar el tipo
      // (rompería las conversiones compra↔venta de esos productos)
      const actual = await db.get('SELECT tipo FROM unidades WHERE id = ?', [id]);
      if (!actual) {
        return res.status(404).json({ error: 'Unidad no encontrada' });
      }
      if (tipo !== undefined && tipo !== actual.tipo) {
        const enUso = await db.get(
          'SELECT COUNT(*) as count FROM productos WHERE unidad_venta_id = ? OR unidad_compra_id = ?',
          [id, id]
        );
        if (enUso.count > 0) {
          return res.status(400).json({
            error: 'No se puede cambiar el tipo: hay productos usando esta unidad. Crea una unidad nueva del tipo deseado.'
          });
        }
      }

      await db.run(
        'UPDATE unidades SET tipo = ?, nombre = ?, abreviatura = ?, coeficiente = ?, activo = ? WHERE id = ?',
        [tipo || actual.tipo, nombre, abreviatura, coeficiente, activo ? 1 : 0, id]
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