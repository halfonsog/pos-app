const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../../logs');

// Crear directorio si no existe
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function getLogFile() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return path.join(LOG_DIR, `sistema_${year}_${month}.log`);
}

function log(accion, entidad, entidadId, usuario, detalles = '') {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${accion} | ${entidad} #${entidadId} | por ${usuario} | ${detalles}\n`;

  try {
    fs.appendFileSync(getLogFile(), line);
  } catch (error) {
    console.error('Error escribiendo log:', error.message);
  }

  console.log(`📝 ${line.trim()}`);
}

function getLogs(limite = 100) {
  try {
    const logFile = getLogFile();
    if (!fs.existsSync(logFile)) return [];

    const content = fs.readFileSync(logFile, 'utf8');
    return content.trim().split('\n').reverse().slice(0, limite);
  } catch (error) {
    console.error('Error leyendo logs:', error.message);
    return [];
  }
}

module.exports = { log, getLogs };