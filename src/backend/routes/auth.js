const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/verify
router.get('/verify', authController.verify);

// POST /api/auth/cambiar-password
router.post('/cambiar-password', authMiddleware, authController.cambiarPassword);

module.exports = router;