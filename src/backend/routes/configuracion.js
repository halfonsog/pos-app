const express = require('express');
const router = express.Router();
const configuracionController = require('../controllers/configuracionController');
const authMiddleware = require('../middleware/auth');

// Proteger todas las rutas de ventas
router.use(authMiddleware);

// Parámetros generales
router.get('/general', configuracionController.obtenerGeneral);
router.put('/general', configuracionController.actualizarGeneral);

// Gastos fijos
router.get('/gastos', configuracionController.listarGastos);
router.post('/gastos', configuracionController.crearGasto);
router.put('/gastos/:id', configuracionController.actualizarGasto);
router.delete('/gastos/:id', configuracionController.eliminarGasto);

// Denominaciones
router.get('/denominaciones', configuracionController.listarDenominaciones);
router.get('/denominaciones/todas', configuracionController.listarDenominacionesTodas);
router.put('/denominaciones/:id', configuracionController.actualizarDenominacion);

// Categorías
router.get('/categorias', configuracionController.listarCategorias);
router.post('/categorias', configuracionController.crearCategoria);
router.put('/categorias/:id', configuracionController.actualizarCategoria);

// Unidades
router.get('/unidades', configuracionController.listarUnidades);
router.post('/unidades', configuracionController.crearUnidad);
router.put('/unidades/:id', configuracionController.actualizarUnidad);

// Términos de pago
router.get('/terminos-pago', configuracionController.listarTerminosPago);
router.post('/terminos-pago', configuracionController.crearTerminoPago);
router.put('/terminos-pago/:id', configuracionController.actualizarTerminoPago);
router.delete('/terminos-pago/:id', configuracionController.eliminarTerminoPago);

module.exports = router;