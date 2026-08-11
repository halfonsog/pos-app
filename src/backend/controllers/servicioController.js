const { getDb } = require('../models/db');

/**
 * Servicios: pagos y cobros por servicios (estiba de mercancía, transporte...).
 * Vínculo opcional a una compra o pedido. Efecto en el saldo según su cuenta.
 */
const servicioController = {

  // GET /api/servicios?tipo=
  listar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { tipo } = req.query;
      const servicios = await db.all(`
        SELECT s.*, u.nombre_completo AS usuario_nombre,
               c.codigo_factura AS compra_factura, p.id AS pedido_num
        FROM servicios s
        LEFT JOIN usuarios u ON s.usuario_id = u.id
        LEFT JOIN compras c ON s.compra_id = c.id
        LEFT JOIN pedidos p ON s.pedido_id = p.id
        ${tipo ? 'WHERE s.tipo = ?' : ''}
        ORDER BY s.fecha DESC, s.id DESC LIMIT 200
      `, tipo ? [tipo] : []);
      res.json(servicios);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/servicios { descripcion, tipo, monto, moneda?, tasa_cambio?, cuenta, compra_id?, pedido_id?, referencia? }
  crear: async (req, res, next) => {
    try {
      const db = await getDb();
      const { descripcion, tipo, monto, moneda, tasa_cambio, cuenta, compra_id, pedido_id, referencia } = req.body;

      if (!descripcion || !descripcion.trim()) {
        return res.status(400).json({ error: 'La descripción del servicio es obligatoria' });
      }
      if (!['pago', 'cobro'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo inválido: pago o cobro' });
      }
      const montoNum = parseFloat(monto);
      if (!montoNum || montoNum <= 0) {
        return res.status(400).json({ error: 'El monto debe ser mayor que cero' });
      }
      const cta = ['efectivo', 'banco'].includes(cuenta) ? cuenta : 'efectivo';
      const mon = moneda === 'USD' ? 'USD' : 'CUP';
      const tasa = parseFloat(tasa_cambio) || 0;
      if (mon === 'USD' && tasa <= 0) {
        return res.status(400).json({ error: 'Indica la tasa de cambio acordada para el servicio en USD' });
      }

      await db.run('BEGIN TRANSACTION');
      try {
        const result = await db.run(`
          INSERT INTO servicios (descripcion, tipo, monto, moneda, tasa_cambio, cuenta, compra_id, pedido_id, referencia, usuario_id, fecha)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now', 'localtime'))
        `, [descripcion.trim(), tipo, montoNum, mon, mon === 'USD' ? tasa : 1, cta,
            compra_id || null, pedido_id || null, referencia || null, req.usuario.id]);

        // Efecto en el saldo: pago sale, cobro entra (cuenta efectivo o banco)
        const tipoMov = tipo === 'pago' ? 'pago_servicio' : 'cobro_servicio';
        const signo = tipo === 'pago' ? -1 : 1;
        if (cta === 'banco' || tipo === 'pago') {
          // en banco siempre registramos movimiento; en efectivo solo pagos salen de caja vía movimiento negativo
          await db.run(`
            INSERT INTO movimientos_bancarios (tipo, monto, fecha, descripcion, cuenta, moneda, tasa_cambio, referencia, usuario_id)
            VALUES (?, ?, date('now', 'localtime'), ?, ?, ?, ?, ?, ?)
          `, [tipoMov, signo * montoNum, descripcion.trim(), cta, mon, mon === 'USD' ? tasa : 1, referencia || null, req.usuario.id]);
        }

        await db.run('COMMIT');
        res.status(201).json({ id: result.lastID, message: `Servicio registrado (${tipo === 'pago' ? 'pago' : 'cobro'})` });
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
};

module.exports = servicioController;
