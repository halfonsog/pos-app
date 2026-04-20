const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');

// GET /api/categorias
router.get('/', categoriaController.listar);

// GET /api/categorias/:id
router.get('/:id', categoriaController.obtener);

// POST /api/categorias
router.post('/', categoriaController.crear);

// PUT /api/categorias/:id
router.put('/:id', categoriaController.actualizar);

// DELETE /api/categorias/:id
router.delete('/:id', categoriaController.eliminar);

module.exports = router;