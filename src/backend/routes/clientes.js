const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Clientes: lectura y creación para cualquier usuario autenticado (los vendedores
// venden a estos clientes y pueden darlos de alta). Edición solo admin.
router.use(authMiddleware);
const admin = requireRole('admin');

router.get('/', clienteController.listar);
router.get('/:id', clienteController.obtener);
router.post('/', clienteController.crear);
router.put('/:id', admin, clienteController.actualizar);

module.exports = router;
