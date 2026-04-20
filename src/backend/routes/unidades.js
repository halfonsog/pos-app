const express = require('express');
const router = express.Router();
const unidadController = require('../controllers/unidadController');

// GET /api/unidades
router.get('/', unidadController.listar);

// GET /api/unidades/tipos
router.get('/tipos', unidadController.listarTipos);

module.exports = router;