const express = require('express');
const router = express.Router();
const mayoristaController = require('../controllers/mayoristaController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Ventas mayoristas: solo administradores
router.use(authMiddleware, requireRole('admin'));

router.get('/resumen', mayoristaController.resumen);
router.get('/cuentas-por-cobrar', mayoristaController.cuentasPorCobrar);

// Tramos de precio por volumen
router.get('/tramos/:productoId', mayoristaController.listarTramos);
router.post('/tramos/:productoId', mayoristaController.crearTramo);
router.delete('/tramos/:id', mayoristaController.eliminarTramo);

// Pedidos
router.get('/pedidos', mayoristaController.listarPedidos);
router.get('/pedidos/:id', mayoristaController.obtenerPedido);
router.post('/pedidos', mayoristaController.crearPedido);
router.post('/pedidos/:id/facturar', mayoristaController.facturarPedido);
router.post('/pedidos/:id/entregar', mayoristaController.entregarPedido);
router.post('/pedidos/:id/cancelar', mayoristaController.cancelarPedido);
router.post('/pedidos/:id/extender', mayoristaController.extenderPedido);
router.post('/pedidos/:id/pagos', mayoristaController.registrarPago);

module.exports = router;
