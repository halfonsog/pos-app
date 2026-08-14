const { getDb } = require('../models/db');

/**
 * Préstamos e Inversiones (00-pendientes #3 — especificación del propietario).
 *
 * Registro de seguimiento (no paga deudas reales): genera la tabla de vencimientos
 * y el gasto financiero mensual que alimenta el costeo absorbente (%gastos).
 *
 * Fórmulas por vencimiento ordinal i (1..plazo):
 *   1. pago_capital base = capital_total / plazo_meses (redondeo a 2; el último absorbe)
 *   2. capital = capital_total − (i−1) × pago_capital
 *   3. capital_gravado = prestamo: capital − pago_capital
 *      inversion: 0 en el mes 1 (aporte a la par); i × pago_capital desde el mes 2
 *   4. tarifa = tasa_mensual × capital_gravado · tasa_mensual = tasa_anual/100/12
 *   5. aporte = pago_capital + tarifa
 *   6. gasto financiero del mes = Σ aportes del PRÓXIMO vencimiento pendiente de
 *      cada registro activo (los precios del mes cubren el próximo pago; el
 *      primer vencimiento cae el día 1 del mes siguiente a fecha_inicio)
 */

// Genera los vencimientos calculados de un registro (día 1 de cada mes;
// primer vencimiento = mes siguiente a fecha_inicio)
function generarTablaVencimientos({ tipo, capital_total, plazo_meses, tasa_anual, fecha_inicio }) {
  const pagoCapitalBase = Math.round((capital_total / plazo_meses) * 100) / 100;
  const tasaMensual = (tasa_anual || 0) / 100 / 12;
  const [anio, mes] = String(fecha_inicio).split('-').map(Number);

  const vencimientos = [];
  let capitalRestante = capital_total;

  for (let i = 1; i <= plazo_meses; i++) {
    const esUltimo = i === plazo_meses;
    const pagoCapital = esUltimo ? Math.round(capitalRestante * 100) / 100 : pagoCapitalBase;
    const capital = Math.round(capitalRestante * 100) / 100;
    let capitalGravado;
    if (tipo === 'prestamo') {
      capitalGravado = capital - pagoCapital;
    } else {
      // inversión: mes 1 sin devaluación (aporte a la par); desde mes 2: i × pago_capital
      capitalGravado = i === 1 ? 0 : i * pagoCapitalBase;
    }
    const tarifa = Math.round(tasaMensual * capitalGravado * 100) / 100;
    const aporte = Math.round((pagoCapital + tarifa) * 100) / 100;

    const fechaVenc = new Date(anio, mes - 1 + i, 1); // mes siguiente + (i−1)
    vencimientos.push({
      ordinal: i,
      fecha_vencimiento: fechaVenc.toISOString().split('T')[0],
      capital,
      pago_capital: pagoCapital,
      tarifa,
      aporte
    });

    capitalRestante = Math.round((capitalRestante - pagoCapital) * 100) / 100;
  }

  return { vencimientos, pagoCapitalBase };
}

async function insertarVencimientos(db, registroId, vencimientos) {
  for (const v of vencimientos) {
    await db.run(`
      INSERT INTO vencimientos (prestamo_inversion_id, ordinal, fecha_vencimiento, capital, pago_capital, tarifa, aporte)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [registroId, v.ordinal, v.fecha_vencimiento, v.capital, v.pago_capital, v.tarifa, v.aporte]);
  }
}

// Gasto financiero a repercutir en los precios del mes actual: Σ aportes del
// PRÓXIMO vencimiento pendiente de cada registro activo. Si el próximo pago es el
// 01/09, los precios del mes en curso deben cubrirlo (regla del propietario).
async function gastoFinancieroMes(db) {
  const sql = `
    SELECT COALESCE(SUM(v.aporte), 0) AS total
    FROM vencimientos v
    JOIN prestamos_inversiones pi ON v.prestamo_inversion_id = pi.id
    WHERE pi.estado = 'activo'
      AND v.estado IN ('pendiente', 'parcial')
      AND v.fecha_vencimiento = (
        SELECT MIN(v2.fecha_vencimiento)
        FROM vencimientos v2
        WHERE v2.prestamo_inversion_id = v.prestamo_inversion_id
          AND v2.estado IN ('pendiente', 'parcial')
      )
  `;
  const r = await db.get(sql);
  return r.total;
}

/**
 * Regenera los vencimientos PENDIENTES de un registro tras un abono de capital.
 *
 * - inversión: se recalculan las tarifas sobre el nuevo saldo (el inversor recibe
 *   menos intereses al devolver antes). Misma lógica que en registrarPago.
 * - préstamo (preservarTarifas): las cuotas restantes conservan la tarifa del
 *   ORDINAL ORIGINAL (el acreedor recibe el mismo total pactado aunque se
 *   adelante capital). Solo se acelera el capital (menos cuotas).
 *
 * Devuelve { cuotas_restantes, saldo } o null si no hay saldo.
 */
async function reajustarCuotas(db, registroId, preservarTarifas) {
  const registro = await db.get('SELECT * FROM prestamos_inversiones WHERE id = ?', [registroId]);
  if (!registro) return null;

  // Capital efectivamente pagado (capital del pago = monto_pagado − tarifa)
  const pagos = await db.all(
    'SELECT monto_pagado, tarifa FROM vencimientos WHERE prestamo_inversion_id = ? AND monto_pagado > 0', [registroId]
  );
  const capitalPagado = pagos.reduce((s, p) => s + Math.max(0, p.monto_pagado - p.tarifa), 0);
  const saldo = Math.round((registro.capital_total - capitalPagado) * 100) / 100;

  // Mapa ordinal → tarifa ORIGINAL (solo si preservamos las tarifas)
  let tarifasOriginales = null;
  if (preservarTarifas) {
    const orig = await db.all(`
      SELECT ordinal, tarifa FROM vencimientos
      WHERE prestamo_inversion_id = ? ORDER BY ordinal
    `, [registroId]);
    tarifasOriginales = new Map(orig.map(v => [v.ordinal, v.tarifa]));
  }

  // Último vencimiento CON PAGO: de ahí continúa el nuevo calendario (ordinal + 1 mes).
  const ultimoPago = await db.get(`
    SELECT ordinal, fecha_vencimiento FROM vencimientos
    WHERE prestamo_inversion_id = ? AND monto_pagado > 0
    ORDER BY ordinal DESC LIMIT 1
  `, [registroId]);
  const ultimoOrdinal = ultimoPago?.ordinal || 0;
  const ultimaFecha = ultimoPago?.fecha_vencimiento || (await db.get(
    'SELECT MIN(fecha_vencimiento) AS f FROM vencimientos WHERE prestamo_inversion_id = ?', [registroId]
  ))?.f;

  await db.run(
    "DELETE FROM vencimientos WHERE prestamo_inversion_id = ? AND estado = 'pendiente'", [registroId]
  );

  if (saldo <= 0.004) return { cuotas_restantes: 0, saldo };

  const cuotasRestantes = Math.ceil(saldo / registro.pago_capital);
  const [fa, fm] = ultimaFecha.split('-').map(Number);
  let capitalRestante = saldo;
  const tasaMensual = (registro.tasa_anual || 0) / 100 / 12;

  for (let j = 1; j <= cuotasRestantes; j++) {
    const esUltimo = j === cuotasRestantes;
    const pagoCapital = esUltimo ? Math.round(capitalRestante * 100) / 100 : registro.pago_capital;
    const ordinalGlobal = ultimoOrdinal + j;

    // Préstamo con preservación: tarifa del ordinal original; si no existe (ordinal
    // más allá de la tabla original), se mantiene la del último ordinal conocido.
    let tarifa;
    if (preservarTarifas) {
      tarifa = tarifasOriginales.get(ordinalGlobal);
      if (tarifa === undefined) {
        const maxOrd = Math.max(...tarifasOriginales.keys(), ordinalGlobal);
        tarifa = tarifasOriginales.get(maxOrd) ?? 0;
      }
    } else {
      const capitalGravado = ordinalGlobal * registro.pago_capital;
      tarifa = Math.round(tasaMensual * capitalGravado * 100) / 100;
    }
    tarifa = Math.round(tarifa * 100) / 100;

    const aporte = Math.round((pagoCapital + tarifa) * 100) / 100;
    const fechaVenc = new Date(fa, fm - 1 + j, 1);

    await db.run(`
      INSERT INTO vencimientos (prestamo_inversion_id, ordinal, fecha_vencimiento, capital, pago_capital, tarifa, aporte)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [registroId, ordinalGlobal, fechaVenc.toISOString().split('T')[0],
      Math.round(capitalRestante * 100) / 100, pagoCapital, tarifa, aporte]);

    capitalRestante = Math.round((capitalRestante - pagoCapital) * 100) / 100;
  }

  return { cuotas_restantes: cuotasRestantes, saldo };
}

const prestamoInversionController = {

  // GET /api/config/prestamos-inversiones
  listar: async (req, res, next) => {
    try {
      const db = await getDb();
      const registros = await db.all(`
        SELECT pi.*,
          (SELECT COUNT(*) FROM vencimientos v WHERE v.prestamo_inversion_id = pi.id AND v.estado != 'pagado') AS vencimientos_pendientes,
          (SELECT COALESCE(SUM(v.aporte), 0) FROM vencimientos v 
            WHERE v.prestamo_inversion_id = pi.id AND v.estado != 'pagado'
              AND strftime('%Y-%m', v.fecha_vencimiento) = strftime('%Y-%m', 'now', 'localtime')) AS aporte_mes_actual
        FROM prestamos_inversiones pi
        ORDER BY pi.estado = 'cancelado', pi.tipo, pi.fecha_inicio DESC
      `);
      res.json(registros);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/config/prestamos-inversiones/:id
  obtener: async (req, res, next) => {
    try {
      const db = await getDb();
      const registro = await db.get('SELECT * FROM prestamos_inversiones WHERE id = ?', [req.params.id]);
      if (!registro) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }
      registro.vencimientos = await db.all(
        'SELECT * FROM vencimientos WHERE prestamo_inversion_id = ? ORDER BY ordinal', [req.params.id]
      );
      res.json(registro);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/config/prestamos-inversiones
  crear: async (req, res, next) => {
    try {
      const db = await getDb();
      const { tipo, descripcion, capital_total, plazo_meses, tasa_anual, fecha_inicio } = req.body;

      if (!['prestamo', 'inversion'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo inválido: prestamo o inversion' });
      }
      if (!descripcion || !capital_total || !plazo_meses || !fecha_inicio) {
        return res.status(400).json({ error: 'Descripción, capital, plazo y fecha de inicio son obligatorios' });
      }
      if (capital_total <= 0 || plazo_meses <= 0) {
        return res.status(400).json({ error: 'Capital y plazo deben ser mayores que cero' });
      }

      const { vencimientos, pagoCapitalBase } = generarTablaVencimientos({
        tipo, capital_total: parseFloat(capital_total), plazo_meses: parseInt(plazo_meses),
        tasa_anual: parseFloat(tasa_anual) || 0, fecha_inicio
      });

      await db.run('BEGIN TRANSACTION');
      try {
        const result = await db.run(`
          INSERT INTO prestamos_inversiones (tipo, descripcion, capital_total, plazo_meses, tasa_anual, pago_capital, fecha_inicio)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [tipo, descripcion.trim(), capital_total, plazo_meses, tasa_anual || 0, pagoCapitalBase, fecha_inicio]);

        await insertarVencimientos(db, result.lastID, vencimientos);
        await db.run('COMMIT');

        res.status(201).json({ id: result.lastID, message: 'Registro creado con su tabla de vencimientos' });
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/config/prestamos-inversiones/:id
  // Si ya hay pagos, solo se puede editar descripcion/estado
  actualizar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { tipo, descripcion, capital_total, plazo_meses, tasa_anual, fecha_inicio, estado } = req.body;

      const registro = await db.get('SELECT * FROM prestamos_inversiones WHERE id = ?', [id]);
      if (!registro) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }

      const pagos = await db.get(
        'SELECT COUNT(*) AS n FROM vencimientos WHERE prestamo_inversion_id = ? AND monto_pagado > 0', [id]
      );

      if (pagos.n > 0) {
        // Con pagos: solo descripción y estado
        await db.run(
          'UPDATE prestamos_inversiones SET descripcion = ?, estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [descripcion ?? registro.descripcion, estado ?? registro.estado, id]
        );
        return res.json({ message: 'Actualizado (solo descripción/estado: el registro ya tiene pagos)' });
      }

      // Sin pagos: edición completa + regenerar vencimientos
      const nuevoTipo = tipo ?? registro.tipo;
      const nuevoCapital = capital_total ?? registro.capital_total;
      const nuevoPlazo = plazo_meses ?? registro.plazo_meses;
      const nuevaTasa = tasa_anual ?? registro.tasa_anual;
      const nuevaFecha = fecha_inicio ?? registro.fecha_inicio;

      const { vencimientos, pagoCapitalBase } = generarTablaVencimientos({
        tipo: nuevoTipo, capital_total: parseFloat(nuevoCapital), plazo_meses: parseInt(nuevoPlazo),
        tasa_anual: parseFloat(nuevaTasa) || 0, fecha_inicio: nuevaFecha
      });

      await db.run('BEGIN TRANSACTION');
      try {
        await db.run(`
          UPDATE prestamos_inversiones 
          SET tipo = ?, descripcion = ?, capital_total = ?, plazo_meses = ?, tasa_anual = ?, 
              pago_capital = ?, fecha_inicio = ?, estado = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [nuevoTipo, descripcion ?? registro.descripcion, nuevoCapital, nuevoPlazo, nuevaTasa,
          pagoCapitalBase, nuevaFecha, estado ?? registro.estado, id]);

        await db.run('DELETE FROM vencimientos WHERE prestamo_inversion_id = ?', [id]);
        await insertarVencimientos(db, id, vencimientos);
        await db.run('COMMIT');

        res.json({ message: 'Registro actualizado y vencimientos regenerados' });
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/config/prestamos-inversiones/:id — cancelar (deja sin efecto los vencimientos)
  cancelar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      const registro = await db.get('SELECT id FROM prestamos_inversiones WHERE id = ?', [id]);
      if (!registro) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }

      await db.run(
        "UPDATE prestamos_inversiones SET estado = 'cancelado', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]
      );
      res.json({ message: 'Registro cancelado' });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/config/prestamos-inversiones/:id/pagos  { ordinal, monto }
  registrarPago: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { ordinal, monto } = req.body;

      if (!ordinal || !monto || monto <= 0) {
        return res.status(400).json({ error: 'Ordinal y monto (> 0) son obligatorios' });
      }

      const registro = await db.get('SELECT * FROM prestamos_inversiones WHERE id = ?', [id]);
      if (!registro) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }
      if (registro.estado === 'cancelado') {
        return res.status(400).json({ error: 'El registro está cancelado' });
      }

      const venc = await db.get(
        'SELECT * FROM vencimientos WHERE prestamo_inversion_id = ? AND ordinal = ?', [id, ordinal]
      );
      if (!venc) {
        return res.status(404).json({ error: 'Vencimiento no encontrado' });
      }
      if (venc.estado === 'pagado') {
        return res.status(400).json({ error: 'Ese vencimiento ya está pagado' });
      }

      const nuevoPagado = Math.round((venc.monto_pagado + parseFloat(monto)) * 100) / 100;
      const nuevoEstado = nuevoPagado >= venc.aporte ? 'pagado' : 'parcial';
      const hoy = new Date().toISOString().split('T')[0];

      await db.run('BEGIN TRANSACTION');
      try {
        await db.run(
          'UPDATE vencimientos SET monto_pagado = ?, estado = ?, fecha_pago = ? WHERE id = ?',
          [nuevoPagado, nuevoEstado, hoy, venc.id]
        );

        // INVERSIONES: un pago de capital distinto al programado ajusta el número de
        // cuotas restantes (mantiene pago_capital base; la última absorbe el redondeo)
        if (registro.tipo === 'inversion') {
          await reajustarCuotas(db, id, false);
        }

        await db.run('COMMIT');
        res.json({ message: `Pago registrado (${nuevoEstado})`, estado: nuevoEstado });
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
};

/**
 * Aplica el excedente del cierre de mes a los registros activos (regla del propietario):
 *   1. Inversiones activas primero, priorizando las de MAYOR número de vencimientos
 *      pendientes. Cada una absorbe lo que pueda (abono sobre su próximo vencimiento
 *      pendiente) y se reajustan sus cuotas (menos vencimientos).
 *   2. Si queda excedente y no hay inversiones activas: préstamos activos, misma
 *      prioridad (más vencimientos primero), pero PRESERVANDO las tarifas originales
 *      (el acreedor recibe el mismo total pactado aunque se adelante capital).
 *   3. Si sobra, no se aplica (queda como ganancia).
 *
 * Devuelve { aplicaciones: [{registro_id, tipo, descripcion, monto}], aplicado }.
 */
async function aplicarExcedente(db, excedente) {
  const aplicaciones = [];
  let restante = Math.round(excedente * 100) / 100;
  if (restante <= 0) return { aplicaciones, aplicado: 0 };

  // Prioridad: inversiones activas con más vencimientos pendientes, luego préstamos.
  const activos = await db.all(`
    SELECT pi.*,
      (SELECT COUNT(*) FROM vencimientos v
        WHERE v.prestamo_inversion_id = pi.id AND v.estado != 'pagado') AS vencimientos_pendientes
    FROM prestamos_inversiones pi
    WHERE pi.estado = 'activo'
    ORDER BY pi.tipo = 'prestamo', vencimientos_pendientes DESC, pi.id
  `);

  for (const reg of activos) {
    if (restante <= 0) break;
    const preservarTarifas = reg.tipo === 'prestamo';
    let aplicadoRegistro = 0;

    // Consumir TODO el excedente posible en este registro (adelanta capital hasta
    // saldarlo o hasta agotar el excedente), antes de pasar al siguiente.
    for (;;) {
      if (restante <= 0) break;

      const prox = await db.get(`
        SELECT * FROM vencimientos
        WHERE prestamo_inversion_id = ? AND estado != 'pagado'
        ORDER BY ordinal ASC LIMIT 1
      `, [reg.id]);
      if (!prox) break;

      const monto = Math.min(restante, prox.aporte - (prox.monto_pagado || 0));
      if (monto <= 0) break;

      const nuevoPagado = Math.round(((prox.monto_pagado || 0) + monto) * 100) / 100;
      await db.run(
        'UPDATE vencimientos SET monto_pagado = ?, estado = ? WHERE id = ?',
        [nuevoPagado, nuevoPagado >= prox.aporte ? 'pagado' : 'parcial', prox.id]
      );

      await reajustarCuotas(db, reg.id, preservarTarifas);

      aplicadoRegistro = Math.round((aplicadoRegistro + monto) * 100) / 100;
      restante = Math.round((restante - monto) * 100) / 100;
    }

    if (aplicadoRegistro > 0) {
      aplicaciones.push({
        registro_id: reg.id,
        tipo: reg.tipo,
        descripcion: reg.descripcion,
        monto: aplicadoRegistro
      });
    }
  }

  return { aplicaciones, aplicado: Math.round((excedente - restante) * 100) / 100 };
}

module.exports = { prestamoInversionController, gastoFinancieroMes, generarTablaVencimientos, reajustarCuotas, aplicarExcedente };
