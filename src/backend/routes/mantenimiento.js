const express = require('express');
const router = express.Router();
const mantenimientoController = require('../controllers/mantenimientoController');
const uploadBackup = require('../middleware/uploadBackup');

router.post('/eliminar-inactivos', mantenimientoController.eliminarInactivos);
router.post('/eliminar-anio', mantenimientoController.eliminarAnio);
router.post('/eliminar-entidad', mantenimientoController.eliminarEntidad);
router.get('/backup', mantenimientoController.backup);
router.post('/restaurar', uploadBackup.single('backup'), mantenimientoController.restaurar);
router.post('/reset', mantenimientoController.reset);
router.get('/logs', mantenimientoController.verLogs);

module.exports = router;
