const { getDb } = require('../models/db');

const catalogoController = {

  // GET /api/terminos-pago
  listarTerminosPago: async (req, res, next) => {
    try {
      const db = await getDb();
      const terminos = await db.all('SELECT id, nombre, dias FROM terminos_pago WHERE activo = 1 ORDER BY dias');
      res.json(terminos);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = catalogoController;