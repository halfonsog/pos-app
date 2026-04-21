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

// Contactos
router.get('/:id/contactos', proveedorController.listarContactos);
router.post('/:id/contactos', proveedorController.crearContacto);
router.put('/:id/contactos/:contactoId', proveedorController.actualizarContacto);
router.delete('/:id/contactos/:contactoId', proveedorController.eliminarContacto);

module.exports = router;