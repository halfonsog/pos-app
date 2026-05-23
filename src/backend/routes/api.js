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

// Health check (público)
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

router.get('/dashboard', dashboardController.obtener);

// Rutas públicas
router.use('/auth', authRoutes);

// Middleware de autenticación (a implementar después)
// router.use(require('../middleware/auth'));

// Rutas protegidas
router.use('/proveedores', proveedoresRoutes);
router.use('/productos', productosRoutes);
router.use('/compras', comprasRoutes);
router.use('/inventario', inventarioRoutes);
router.use('/configuracion', configuracionRoutes);
router.use('/ventas', ventasRoutes);
router.use('/reportes', reportesRoutes);
router.use('/mantenimiento', mantenimientoRoutes);

module.exports = router;
