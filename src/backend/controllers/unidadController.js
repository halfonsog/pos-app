const { getDb } = require('../models/db');

const unidadController = {

  // GET /api/unidades
  listar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { tipo } = req.query;

      let query = 'SELECT * FROM unidades WHERE activo = 1';
      const params = [];

      if (tipo) {
        query += ' AND (tipo = ? OR tipo = "ambas")';
        params.push(tipo);
      }

      query += ' ORDER BY nombre';

      const unidades = await db.all(query, params);

      res.json(unidades);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/unidades/tipos
  listarTipos: async (req, res, next) => {
    try {
      // Tipos disponibles para unidades
      res.json([
        { value: 'venta', label: 'Venta' },
        { value: 'compra', label: 'Compra' },
        { value: 'ambas', label: 'Ambas' }
      ]);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = unidadController;