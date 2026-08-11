const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/ventaController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Todas las rutas de ventas requieren autenticación (cualquier rol puede vender)
router.use(authMiddleware);

// Turnos
router.get('/turno-actual', ventaController.turnoActual);
router.post('/abrir-turno', ventaController.abrirTurno);
router.post('/cerrar-turno', ventaController.cerrarTurno);
router.get('/resumen-turno/:id', ventaController.resumenTurno);
router.get('/mi-turno', ventaController.miTurno);

// Ventas
router.get('/', ventaController.listarVentas);
router.get('/:id', ventaController.obtenerVenta);
router.post('/', ventaController.crearVenta);

// Anular una venta (revierte stock): solo admin
router.post('/:id/anular', requireRole('admin'), ventaController.anularVenta);

module.exports = router;
