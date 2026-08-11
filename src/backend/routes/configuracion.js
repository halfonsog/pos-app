const express = require('express');
const router = express.Router();
const configuracionController = require('../controllers/configuracionController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Todas las rutas requieren autenticación.
// Lecturas: cualquier rol (unidades, configuración general y denominaciones se usan en el POS).
// Escrituras: solo admin.
router.use(authMiddleware);
const admin = requireRole('admin');

// Parámetros generales
router.get('/general', configuracionController.obtenerGeneral);
router.put('/general', admin, configuracionController.actualizarGeneral);

// Gastos fijos
router.get('/gastos', configuracionController.listarGastos);
router.post('/gastos', admin, configuracionController.crearGasto);
router.put('/gastos/:id', admin, configuracionController.actualizarGasto);
router.delete('/gastos/:id', admin, configuracionController.eliminarGasto);

// Denominaciones
router.get('/denominaciones', configuracionController.listarDenominaciones);
router.get('/denominaciones/todas', configuracionController.listarDenominacionesTodas);
router.put('/denominaciones/:id', admin, configuracionController.actualizarDenominacion);

// Categorías
router.get('/categorias', configuracionController.listarCategorias);
router.post('/categorias', admin, configuracionController.crearCategoria);
router.put('/categorias/:id', admin, configuracionController.actualizarCategoria);

// Unidades
router.get('/unidades', configuracionController.listarUnidades);
router.post('/unidades', admin, configuracionController.crearUnidad);
router.put('/unidades/:id', admin, configuracionController.actualizarUnidad);

// Términos de pago
router.get('/terminos-pago', configuracionController.listarTerminosPago);
router.post('/terminos-pago', admin, configuracionController.crearTerminoPago);
router.put('/terminos-pago/:id', admin, configuracionController.actualizarTerminoPago);
router.delete('/terminos-pago/:id', admin, configuracionController.eliminarTerminoPago);

module.exports = router;
