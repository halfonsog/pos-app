const express = require('express');
const router = express.Router();
const compraController = require('../controllers/compraController');

router.get('/', compraController.listar);
router.get('/:id', compraController.obtener);
router.post('/', compraController.crear);
router.post('/:id/inventariar', compraController.inventariar);
router.post('/:id/pagar', compraController.pagar);

module.exports = router;