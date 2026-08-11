const express = require('express');
const router = express.Router();
const { prestamoInversionController } = require('../controllers/prestamoInversionController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Préstamos e Inversiones: solo administradores
router.use(authMiddleware, requireRole('admin'));

router.get('/', prestamoInversionController.listar);
router.get('/:id', prestamoInversionController.obtener);
router.post('/', prestamoInversionController.crear);
router.put('/:id', prestamoInversionController.actualizar);
router.delete('/:id', prestamoInversionController.cancelar);
router.post('/:id/pagos', prestamoInversionController.registrarPago);

module.exports = router;
