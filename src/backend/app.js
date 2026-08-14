const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Para desarrollo local
}));
// CORS restringido (S10): la app es un monolito local (frontend y API en el mismo
// origen). No se envían cabeceras CORS, de modo que solo las peticiones del mismo
// origen (el propio frontend) son válidas; orígenes externos quedan bloqueados.
app.use(cors({ origin: false }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// API Routes
app.use('/api', apiRoutes);

// Ruta principal - SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error Handler
app.use(errorHandler);

module.exports = app;