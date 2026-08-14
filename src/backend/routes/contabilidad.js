// backend/routes/contabilidad.js
const express = require('express');
const router = express.Router();
const contabilidadController = require('../controllers/contabilidadController');
const nominaController = require('../controllers/nominaController');

const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Contabilidad: solo administradores
router.use(authMiddleware, requireRole('admin'));

// Rutas de contabilidad
router.post('/calcular-impuestos', contabilidadController.calcularImpuestos);
router.post('/registrar-pago', contabilidadController.registrarPago);
router.get('/historial', contabilidadController.getHistorial);
router.get('/balance', contabilidadController.getBalanceGeneral);
router.get('/estado-resultados', contabilidadController.getEstadoResultados);
router.get('/cierre-mes', contabilidadController.getCierreMes);
router.post('/cierre-mes', contabilidadController.cerrarMes);
router.get('/cierre-mes/:mes/:anio', contabilidadController.getCierreMesFicha);
router.get('/liquidacion-anual', contabilidadController.getLiquidacionAnual);
router.get('/banco', contabilidadController.getBanco);
router.post('/banco/movimiento', contabilidadController.registrarMovimientoBanco);
router.post('/cambio-divisas', contabilidadController.cambioDivisas);
router.get('/exportar', contabilidadController.exportarLiquidaciones);
router.get('/libro-diario', contabilidadController.getLibroDiario);

// Nóminas y bonos (m030)
router.get('/nominas', nominaController.listarNominas);
router.post('/nominas/generar', nominaController.generarNominas);
router.post('/nominas/:id/pagar-salario', nominaController.pagarSalario);
router.get('/bonos/ayuda', nominaController.ayudaBonos);
router.post('/bonos', nominaController.pagarBono);

module.exports = router;
