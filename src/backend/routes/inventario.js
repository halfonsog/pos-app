const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Todas las rutas requieren autenticación.
// Lecturas: cualquier rol (el vendedor consulta stock).
// Movimientos de stock: solo admin.
router.use(authMiddleware);
const admin = requireRole('admin');

router.get('/resumen', inventarioController.resumen);
router.get('/stock', inventarioController.listarStock);
router.get('/movimientos', inventarioController.listarMovimientos);
router.get('/preparables', inventarioController.listarPreparables);
router.get('/tipos-movimiento', inventarioController.listarTiposMovimiento);
router.post('/preparar/:id', admin, inventarioController.prepararProducto);
router.post('/ajuste', admin, inventarioController.crearAjuste);
router.post('/intercambio', admin, inventarioController.intercambio);
router.post('/transferencia', admin, inventarioController.transferencia);

module.exports = router;
