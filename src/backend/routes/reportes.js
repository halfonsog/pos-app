const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Todos los reportes requieren autenticación
router.use(authMiddleware);

// Accesible a vendedores (el POS lo usa para ordenar productos por más vendidos)
router.get('/ventas-por-producto', reportesController.ventasPorProducto);

// Análisis del negocio: solo administradores
router.get('/tendencia', requireRole('admin'), reportesController.tendencia);
router.get('/rentabilidad', requireRole('admin'), reportesController.rentabilidad);
router.get('/contables', requireRole('admin'), reportesController.contables);
router.get('/resumen-anual', requireRole('admin'), reportesController.resumenAnual);

module.exports = router;
