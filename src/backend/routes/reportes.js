const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');

router.get('/ventas-por-producto', reportesController.ventasPorProducto);
router.get('/tendencia', reportesController.tendencia);
router.get('/rentabilidad', reportesController.rentabilidad);
router.get('/contables', reportesController.contables);
router.get('/resumen-anual', reportesController.resumenAnual);

module.exports = router;