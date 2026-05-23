const { getDb } = require('../models/db');
const path = require('path');
const fs = require('fs');
const { log } = require('../utils/logger');

const mantenimientoController = {

  // POST /api/mantenimiento/eliminar-inactivos
  eliminarInactivos: async (req, res, next) => {
    try {
      const db = await getDb();
      const usuario = req.usuario?.username || 'sistema';

      // Eliminar productos inactivos que NO tengan dependencias
      await db.run(`
        DELETE FROM recetas WHERE producto_padre_id IN (SELECT id FROM productos WHERE activo = 0)
      `);
      await db.run(`
        DELETE FROM recetas WHERE producto_hijo_id IN (SELECT id FROM productos WHERE activo = 0)
      `);
      await db.run(`
        DELETE FROM producto_costos WHERE producto_id IN (SELECT id FROM productos WHERE activo = 0)
      `);
      await db.run(`
        DELETE FROM productos WHERE activo = 0
      `);

      console.log(`🗑️ Productos inactivos eliminados por ${usuario}`);
      log('ELIMINAR_INACTIVOS', 'productos', '-', usuario, 'Productos inactivos eliminados');

      res.json({ message: 'Productos inactivos eliminados' });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/mantenimiento/eliminar-anio
  eliminarAnio: async (req, res, next) => {
    try {
      const db = await getDb();
      const { anio } = req.body;
      const usuario = req.usuario?.username || 'sistema';

      await db.run('DELETE FROM movimientos_stock WHERE created_at < ?', [`${anio}-12-31`]);
      await db.run('DELETE FROM venta_detalles WHERE venta_id IN (SELECT id FROM ventas WHERE created_at < ?)', [`${anio}-12-31`]);
      await db.run('DELETE FROM ventas WHERE created_at < ?', [`${anio}-12-31`]);
      await db.run('DELETE FROM compra_detalles WHERE compra_id IN (SELECT id FROM compras WHERE fecha_compra < ?)', [`${anio}-12-31`]);
      await db.run('DELETE FROM compras WHERE fecha_compra < ?', [`${anio}-12-31`]);

      console.log(`🗑️ Datos del año ${anio} eliminados por ${usuario}`);
      log('ELIMINAR_ANIO', 'datos', anio, usuario, `Datos del año ${anio} eliminados`);
      res.json({ message: `Datos del año ${anio} eliminados` });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/mantenimiento/eliminar-entidad
  eliminarEntidad: async (req, res, next) => {
    try {
      const db = await getDb();
      const { tipo, id } = req.body;
      const usuario = req.usuario?.username || 'sistema';

      switch (tipo) {
        case 'producto':
          await db.run('DELETE FROM recetas WHERE producto_padre_id = ? OR producto_hijo_id = ?', [id, id]);
          await db.run('DELETE FROM producto_costos WHERE producto_id = ?', [id]);
          await db.run('DELETE FROM movimientos_stock WHERE producto_id = ?', [id]);
          await db.run('DELETE FROM venta_detalles WHERE producto_id = ?', [id]);
          await db.run('DELETE FROM compra_detalles WHERE producto_id = ?', [id]);
          await db.run('DELETE FROM productos WHERE id = ?', [id]);
          break;
        case 'compra':
          await db.run('DELETE FROM compra_detalles WHERE compra_id = ?', [id]);
          await db.run('DELETE FROM compras WHERE id = ?', [id]);
          break;
        case 'venta':
          await db.run('DELETE FROM venta_detalles WHERE venta_id = ?', [id]);
          await db.run('DELETE FROM movimientos_stock WHERE referencia_id = ? AND tipo = ?', [id, 'venta']);
          await db.run('DELETE FROM ventas WHERE id = ?', [id]);
          break;
        case 'proveedor':
          await db.run('DELETE FROM proveedor_contactos WHERE proveedor_id = ?', [id]);
          await db.run('DELETE FROM proveedores WHERE id = ?', [id]);
          break;
      }

      console.log(`🗑️ ${tipo} #${id} eliminado por ${usuario}`);
      log('ELIMINAR_ENTIDAD', tipo, id, usuario, `${tipo} #${id} eliminado`);

      res.json({ message: `${tipo} #${id} eliminado` });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/mantenimiento/backup
  backup: async (req, res, next) => {
    try {
      const dbPath = path.join(__dirname, '../../../database/database.db');
      const backupPath = path.join(__dirname, '../../../database/backup.db');

      fs.copyFileSync(dbPath, backupPath);

      res.download(backupPath, `backup_${new Date().toISOString().split('T')[0]}.db`, () => {
        fs.unlinkSync(backupPath);
      });

      log('BACKUP', 'base de datos', '-', usuario, 'Salvaguarda de la base de datos');
    } catch (error) {
      next(error);
    }
  },

  // POST /api/mantenimiento/restaurar
  restaurar: async (req, res, next) => {
    try {
      const usuario = req.usuario?.username || 'sistema';

      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió archivo de backup' });
      }

      const dbPath = path.join(__dirname, '../../../database/database.db');
      const backupPath = req.file.path;

      // Hacer backup del estado actual
      const preRestoreBackup = dbPath + '.pre_restore_' + Date.now();
      fs.copyFileSync(dbPath, preRestoreBackup);

      // Copiar el backup subido
      fs.copyFileSync(backupPath, dbPath);

      // Eliminar archivo temporal
      fs.unlinkSync(backupPath);

      log('RESTAURAR', 'base_datos', '-', usuario, 'Restauración de backup');

      res.json({
        message: 'Backup restaurado. Debe reiniciar el servidor manualmente.',
        reiniciar: true
      });

    } catch (error) {
      console.error('Error restaurando:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/mantenimiento/reset
  reset: async (req, res, next) => {
    try {
      const db = await getDb();
      const usuario = req.usuario?.username || 'sistema';

      await db.run('DELETE FROM venta_detalles');
      await db.run('DELETE FROM ventas');
      await db.run('DELETE FROM movimientos_stock');
      await db.run('DELETE FROM compra_detalles');
      await db.run('DELETE FROM compras');
      await db.run('DELETE FROM recetas');
      await db.run('DELETE FROM producto_costos');
      await db.run('DELETE FROM productos');
      await db.run('DELETE FROM proveedor_contactos');
      await db.run('DELETE FROM proveedores');
      await db.run('DELETE FROM turnos');
      await db.run('DELETE FROM configuracion_gastos');
      await db.run("DELETE FROM sqlite_sequence");

      console.log(`⚠️ BD RESETEADA por ${usuario}`);
      log('RESET', 'base_datos', '-', usuario, 'Reset total de la BD');
      res.json({ message: 'Base de datos reseteada' });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/mantenimiento/logs
  verLogs: async (req, res, next) => {
    try {
      const logFile = getLogFile();
      if (!fs.existsSync(logFile)) {
        return res.json({ logs: [] });
      }

      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.trim().split('\n').reverse().slice(0, 100);

      res.json({ logs: lines });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = mantenimientoController;