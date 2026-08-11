const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Gestión de usuarios: solo administradores
router.use(authMiddleware, requireRole('admin'));

router.get('/', usuarioController.listar);
router.post('/', usuarioController.crear);
router.put('/:id', usuarioController.actualizar);
router.put('/:id/password', usuarioController.resetPassword);

module.exports = router;
