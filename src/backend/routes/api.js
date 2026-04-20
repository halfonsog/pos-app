const express = require('express');
const router = express.Router();

// Importar rutas (asegurarse de que exportan un Router)
const proveedoresRoutes = require('./proveedores');
const productosRoutes = require('./productos');
const categoriasRoutes = require('./categorias');
const unidadesRoutes = require('./unidades');
const authRoutes = require('./auth');
const comprasRoutes = require('./compras');

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
router.use('/categorias', categoriasRoutes);
router.use('/unidades', unidadesRoutes);
router.use('/compras', comprasRoutes);

module.exports = router;