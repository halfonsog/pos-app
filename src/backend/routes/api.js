const express = require('express');
const router = express.Router();

// Importar rutas (asegurarse de que exportan un Router)
const proveedoresRoutes = require('./proveedores');
const productosRoutes = require('./productos');
const authRoutes = require('./auth');
const comprasRoutes = require('./compras');
const inventarioRoutes = require('./inventario');
const configuracionRoutes = require('./configuracion');
const ventasRoutes = require('./ventas');
const dashboardController = require('../controllers/dashboardController');
const reportesRoutes = require('./reportes');
const mantenimientoRoutes = require('./mantenimiento');
const contabilidadRoutes = require('./contabilidad');
const usuariosRoutes = require('./usuarios');
const empleadosRoutes = require('./empleados');
const prestamosInversionesRoutes = require('./prestamosInversiones');
const clientesRoutes = require('./clientes');
const mayoristasRoutes = require('./mayoristas');
const serviciosRoutes = require('./servicios');
const authMiddleware = require('../middleware/auth');

// Health check (público)
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Dashboard: requiere autenticación (cualquier rol)
router.get('/dashboard', authMiddleware, dashboardController.obtener);

// Rutas públicas
router.use('/auth', authRoutes);

// Rutas protegidas
router.use('/proveedores', proveedoresRoutes);
router.use('/productos', productosRoutes);
router.use('/compras', comprasRoutes);
router.use('/inventario', inventarioRoutes);
router.use('/configuracion', configuracionRoutes);
router.use('/ventas', ventasRoutes);
router.use('/reportes', reportesRoutes);
router.use('/mantenimiento', mantenimientoRoutes);
router.use('/contabilidad', contabilidadRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/empleados', empleadosRoutes);
router.use('/config/prestamos-inversiones', prestamosInversionesRoutes);
router.use('/clientes', clientesRoutes);
router.use('/mayoristas', mayoristasRoutes);
router.use('/servicios', serviciosRoutes);

module.exports = router;
