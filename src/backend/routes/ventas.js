const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/ventaController');
const authMiddleware = require('../middleware/auth');

// Proteger todas las rutas de ventas
router.use(authMiddleware);

// Turnos
router.get('/turno-actual', ventaController.turnoActual);
router.post('/abrir-turno', ventaController.abrirTurno);
router.post('/cerrar-turno', ventaController.cerrarTurno);
router.get('/resumen-turno/:id', ventaController.resumenTurno);

// Ventas
router.get('/', ventaController.listarVentas);
router.get('/:id', ventaController.obtenerVenta);
router.post('/', ventaController.crearVenta);

module.exports = router;