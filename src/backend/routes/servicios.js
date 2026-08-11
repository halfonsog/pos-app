const express = require('express');
const router = express.Router();
const servicioController = require('../controllers/servicioController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Servicios (pagos/cobros): solo administradores
router.use(authMiddleware, requireRole('admin'));

router.get('/', servicioController.listar);
router.post('/', servicioController.crear);

module.exports = router;
