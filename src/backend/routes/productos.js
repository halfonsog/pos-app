const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const { upload, procesarImagen } = require('../middleware/upload');
const authMiddleware = require('../middleware/auth');

// Proteger todas las rutas de ventas
router.use(authMiddleware);

// GET /api/productos
router.get('/', productoController.listar);

// GET /api/productos/:id
router.get('/:id', productoController.obtener);

// POST /api/productos
router.post('/', upload.single('foto'), procesarImagen, productoController.crear);

// PUT /api/productos/:id
router.put('/:id', upload.single('foto'), procesarImagen, productoController.actualizar);
/*
router.put('/:id', (req, res, next) => {
  console.log('🛣️ Ruta PUT /:id alcanzada');
  console.log('🛣️ Content-Type:', req.get('Content-Type'));
  next();
}, upload.single('foto'), procesarImagen, productoController.actualizar);
*/

// DELETE /api/productos/:id
router.delete('/:id', productoController.eliminar);

// Receta
router.get('/:id/receta', productoController.obtenerReceta);
router.post('/:id/receta', productoController.agregarComponente);
router.delete('/:id/receta/:componenteId', productoController.eliminarComponente);

// Ficha de costo
router.put('/:id/costo', productoController.actualizarCosto);

//Trazabilidad
router.get('/:id/trazabilidad', productoController.trazabilidad);

module.exports = router;