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
          await db.run('DELETE FROM movimientos_stock WHERE producto_id = ?', [id]);
          await db.run('DELETE FROM venta_detalles WHERE producto_id = ?', [id]);
          await db.run('DELETE FROM compra_detalles WHERE producto_id = ?', [id]);
          await db.run('DELETE FROM venta_tramos WHERE producto_id = ?', [id]);
          await db.run('DELETE FROM pedido_detalles WHERE producto_id = ?', [id]);
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
        case 'pedido':
          await db.run('DELETE FROM pedido_detalles WHERE pedido_id = ?', [id]);
          await db.run('DELETE FROM pagos_pedido WHERE pedido_id = ?', [id]);
          await db.run('DELETE FROM pedidos WHERE id = ?', [id]);
          break;
        case 'cliente':
          // Eliminar primero los pedidos del cliente (y sus hijos)
          const pedidosCliente = await db.all('SELECT id FROM pedidos WHERE cliente_id = ?', [id]);
          for (const p of pedidosCliente) {
            await db.run('DELETE FROM pedido_detalles WHERE pedido_id = ?', [p.id]);
            await db.run('DELETE FROM pagos_pedido WHERE pedido_id = ?', [p.id]);
          }
          await db.run('DELETE FROM pedidos WHERE cliente_id = ?', [id]);
          await db.run('DELETE FROM clientes WHERE id = ?', [id]);
          break;
        case 'prestamo_inversion':
          await db.run('DELETE FROM vencimientos WHERE prestamo_inversion_id = ?', [id]);
          await db.run('DELETE FROM prestamos_inversiones WHERE id = ?', [id]);
          break;
        case 'servicio':
          await db.run('DELETE FROM servicios WHERE id = ?', [id]);
          break;
        case 'nomina':
          await db.run('DELETE FROM nominas WHERE id = ?', [id]);
          break;
        case 'bono':
          await db.run('DELETE FROM bonos WHERE id = ?', [id]);
          break;
        default:
          return res.status(400).json({ error: `Tipo de entidad inválido: ${tipo}` });
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
      const usuario = req.usuario?.username || 'sistema';
      const db = await getDb();

      // VACUUM INTO: snapshot consistente de la BD (seguro aunque haya escrituras en curso).
      // Nombre temporal único por petición (evita colisiones entre backups simultáneos).
      const tempDir = path.join(__dirname, '../../../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const backupPath = path.join(tempDir, `backup_${Date.now()}.db`);

      await db.run(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);

      const fecha = new Date().toISOString().split('T')[0];
      res.download(backupPath, `pos_backup_${fecha}.db`, (err) => {
        if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
        if (err) next(err);
      });

      log('BACKUP', 'base de datos', '-', usuario, 'Salvaguarda de la base de datos (VACUUM INTO)');
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

      // 1. Validar que es un fichero SQLite (cabecera mágica "SQLite format 3")
      const header = Buffer.alloc(16);
      const fd = fs.openSync(backupPath, 'r');
      fs.readSync(fd, header, 0, 16, 0);
      fs.closeSync(fd);
      if (header.toString('utf8', 0, 15) !== 'SQLite format 3') {
        fs.unlinkSync(backupPath);
        return res.status(400).json({ error: 'El archivo no es una base de datos SQLite válida' });
      }

      // 2. Validar integridad abriéndolo y chequeando PRAGMA integrity_check
      const sqlite3 = require('sqlite3').verbose();
      const { open } = require('sqlite');
      let testDb;
      try {
        testDb = await open({ filename: backupPath, driver: sqlite3.Database });
        const check = await testDb.get('PRAGMA integrity_check');
        await testDb.close();
        if (check.integrity_check !== 'ok') {
          fs.unlinkSync(backupPath);
          return res.status(400).json({ error: `El backup está corrupto (integrity_check: ${check.integrity_check})` });
        }
      } catch (e) {
        if (testDb) await testDb.close().catch(() => {});
        fs.unlinkSync(backupPath);
        return res.status(400).json({ error: 'No se pudo abrir el archivo como base de datos SQLite' });
      }

      // 3. Backup del estado actual antes de sobrescribir
      const preRestoreBackup = dbPath + '.pre_restore_' + Date.now();
      fs.copyFileSync(dbPath, preRestoreBackup);

      // 4. Copiar el backup validado sobre la BD viva
      fs.copyFileSync(backupPath, dbPath);

      // Eliminar archivo temporal
      fs.unlinkSync(backupPath);

      log('RESTAURAR', 'base_datos', '-', usuario, 'Restauración de backup (validado)');

      res.json({
        message: 'Backup restaurado y validado. Debe reiniciar el servidor manualmente.',
        backup_anterior: preRestoreBackup
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

      // Reset total de la operativa (catálogos y configuración se conservan)
      const tablasOperativas = [
        'venta_detalles', 'ventas', 'movimientos_stock',
        'compra_detalles', 'compras',
        'pedido_detalles', 'pagos_pedido', 'pedidos', 'clientes', 'venta_tramos',
        'recetas', 'productos',
        'proveedor_contactos', 'proveedores',
        'turnos',
        'movimientos_bancarios', 'servicios',
        'nominas', 'bonos',
        'vencimientos', 'prestamos_inversiones',
        'liquidaciones_tributos', 'periodos_fiscales',
        'configuracion_gastos'
      ];

      for (const tabla of tablasOperativas) {
        await db.run(`DELETE FROM ${tabla}`);
      }
      await db.run("DELETE FROM sqlite_sequence");

      console.log(`⚠️ BD RESETEADA por ${usuario}`);
      log('RESET', 'base_datos', '-', usuario, 'Reset total de la BD');
      res.json({ message: 'Base de datos reseteada (operativa completa; catálogos y configuración conservados)' });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/mantenimiento/logs
  verLogs: async (req, res, next) => {
    try {
      const { getLogs } = require('../utils/logger');
      const logs = getLogs(100);
      res.json({ logs });
    } catch (error) {
      next(error);
    }
  }
  /*
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
  */
};

module.exports = mantenimientoController;