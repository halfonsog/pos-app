const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');

// Estas son las rutas que DEBEN existir en el controlador
router.get('/resumen', inventarioController.resumen);
router.get('/stock', inventarioController.listarStock);
router.get('/movimientos', inventarioController.listarMovimientos);
router.get('/preparables', inventarioController.listarPreparables);
router.post('/preparar/:id', inventarioController.prepararProducto);
router.post('/ajuste', inventarioController.crearAjuste);

module.exports = router;