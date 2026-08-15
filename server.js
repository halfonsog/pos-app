require('dotenv').config();
const app = require('./src/backend/app');
const os = require('os');

const PORT = process.env.PORT || 3000;

// Escuchar en 0.0.0.0 para permitir acceso desde otras PCs de la misma red local
// (p. ej. http://<IP-de-esta-PC>:3000). En localhost normal sigue funcionando.
app.listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter(i => i.family === 'IPv4' && !i.internal)
    .map(i => i.address);

  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  if (ips.length) {
    console.log(`🌐 Accesible desde la red local en: http://${ips[0]}:${PORT}`);
  }
});