const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const { upload, procesarImagen } = require('../middleware/upload');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Todas las rutas requieren autenticación.
// Lecturas: cualquier rol (el vendedor las necesita en el POS).
// Escrituras: solo admin.
router.use(authMiddleware);
const admin = requireRole('admin');

// GET /api/productos
router.get('/', productoController.listar);

// GET /api/productos/:id
router.get('/:id', productoController.obtener);

// POST /api/productos
router.post('/', admin, upload.single('foto'), procesarImagen, productoController.crear);

// PUT /api/productos/:id
router.put('/:id', admin, upload.single('foto'), procesarImagen, productoController.actualizar);

// DELETE /api/productos/:id
router.delete('/:id', admin, productoController.eliminar);

// Receta
router.get('/:id/receta', productoController.obtenerReceta);
router.post('/:id/receta', admin, productoController.agregarComponente);
router.delete('/:id/receta/:componenteId', admin, productoController.eliminarComponente);

// Ficha de costo
router.put('/:id/costo', admin, productoController.actualizarCosto);

//Trazabilidad
router.get('/:id/trazabilidad', productoController.trazabilidad);

module.exports = router;
