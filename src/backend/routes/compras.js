const express = require('express');
const router = express.Router();
const compraController = require('../controllers/compraController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Gestión de compras: solo administradores
router.use(authMiddleware, requireRole('admin'));

router.get('/', compraController.listar);
router.get('/:id', compraController.obtener);
router.post('/', compraController.crear);
router.put('/:id', compraController.actualizar);
router.delete('/:id', compraController.eliminar);
router.post('/:id/inventariar', compraController.inventariar);
router.post('/:id/pagar', compraController.pagar);

module.exports = router;
