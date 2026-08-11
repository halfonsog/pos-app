const express = require('express');
const router = express.Router();
const empleadoController = require('../controllers/empleadoController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Gestión de empleados: solo administradores
router.use(authMiddleware, requireRole('admin'));

router.get('/', empleadoController.listar);
router.post('/', empleadoController.crear);
router.put('/:id', empleadoController.actualizar);

module.exports = router;
