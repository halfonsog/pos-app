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

// Health check (público)
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

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

module.exports = router;
