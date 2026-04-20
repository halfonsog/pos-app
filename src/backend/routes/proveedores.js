const express = require('express');
const router = express.Router();
const proveedorController = require('../controllers/proveedorController');

// GET /api/proveedores
router.get('/', proveedorController.listar);

// GET /api/proveedores/:id
router.get('/:id', proveedorController.obtener);

// POST /api/proveedores
router.post('/', proveedorController.crear);

// PUT /api/proveedores/:id
router.put('/:id', proveedorController.actualizar);

// DELETE /api/proveedores/:id
router.delete('/:id', proveedorController.eliminar);

module.exports = router;