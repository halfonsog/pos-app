const { getDb } = require('../models/db');

/**
 * Nóminas y bonos (m030, definición acordada con el propietario).
 * - Nómina mensual por empleado: se genera al cerrar el mes; el salario se paga por BANCO.
 * - Bonos semanales en EFECTIVO (no se declaran como salarios); la app ayuda a decidir
 *   el monto mostrando por empleado: días trabajados de la semana, bonos ya pagados del mes,
 *   salario de fin de mes y ventas por día (vendedores).
 */
const nominaController = {

  // GET /api/contabilidad/nominas?mes&anio
  listarNominas: async (req, res, next) => {
    try {
      const db = await getDb();
      const { mes, anio } = req.query;
      const nominas = await db.all(`
        SELECT n.*, e.nombre AS empleado_nombre, e.cargo, u.username
        FROM nominas n
        JOIN empleados e ON n.empleado_id = e.id
        LEFT JOIN usuarios u ON e.id IN (SELECT empleado_id FROM usuarios)
        WHERE n.anio = ? AND n.mes = ?
        ORDER BY e.nombre
      `, [anio, mes]);
      res.json(nominas);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/contabilidad/nominas/generar { mes, anio } — generar al cerrar el mes
  generarNominas: async (req, res, next) => {
    try {
      const db = await getDb();
      const { mes, anio } = req.body;
      if (!mes || !anio) {
        return res.status(400).json({ error: 'Mes y año son requeridos' });
      }

      const empleados = await db.all(
        'SELECT id, nombre, salario_mensual FROM empleados WHERE activo = 1'
      );

      let creadas = 0;
      for (const emp of empleados) {
        const existe = await db.get(
          'SELECT id FROM nominas WHERE empleado_id = ? AND anio = ? AND mes = ?',
          [emp.id, anio, mes]
        );
        if (!existe) {
          await db.run(
            'INSERT INTO nominas (empleado_id, anio, mes, salario_bruto) VALUES (?, ?, ?, ?)',
            [emp.id, anio, mes, emp.salario_mensual || 0]
          );
          creadas++;
        }
      }

      res.status(201).json({
        message: creadas > 0 ? `${creadas} nómina(s) generada(s) para ${mes}/${anio}` : 'Las nóminas de ese período ya estaban generadas',
        creadas
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/contabilidad/nominas/:id/pagar-salario — paga el salario por BANCO
  pagarSalario: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      const nomina = await db.get(`
        SELECT n.*, e.nombre FROM nominas n JOIN empleados e ON n.empleado_id = e.id WHERE n.id = ?
      `, [id]);
      if (!nomina) return res.status(404).json({ error: 'Nómina no encontrada' });
      if (nomina.estado === 'pagada') {
        return res.status(400).json({ error: 'Esa nómina ya está pagada' });
      }

      await db.run('BEGIN TRANSACTION');
      try {
        await db.run(`
          UPDATE nominas SET estado = 'pagada', fecha_pago_salario = date('now', 'localtime'), usuario_id = ? WHERE id = ?
        `, [req.usuario.id, id]);

        // El salario sale del banco (medio bancario, propietario)
        await db.run(`
          INSERT INTO movimientos_bancarios (tipo, monto, fecha, descripcion, cuenta, moneda, referencia, usuario_id)
          VALUES ('pago_servicio', ?, date('now', 'localtime'), ?, 'banco', 'CUP', ?, ?)
        `, [-nomina.salario_bruto, `Salario ${nomina.mes}/${nomina.anio} — ${nomina.nombre}`, `nomina:${id}`, req.usuario.id]);

        await db.run('COMMIT');
        res.json({ message: `Salario de ${nomina.nombre} pagado por banco (${nomina.salario_bruto})` });
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  // GET /api/contabilidad/bonos/ayuda — ayuda a decidir el bono semanal por empleado
  ayudaBonos: async (req, res, next) => {
    try {
      const db = await getDb();

      // Semana actual (lunes a hoy)
      const hoy = new Date();
      const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay();
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - (diaSemana - 1));
      const lunesStr = lunes.toISOString().split('T')[0];
      const hoyStr = hoy.toISOString().split('T')[0];
      const mesActual = hoy.toISOString().slice(0, 7);

      const empleados = await db.all(`
        SELECT e.id, e.nombre, e.cargo, e.salario_mensual,
               (SELECT COUNT(*) FROM usuarios u WHERE u.empleado_id = e.id AND u.activo = 1) AS num_usuarios
        FROM empleados e
        WHERE e.activo = 1
        ORDER BY e.nombre
      `);

      const resultado = [];
      for (const emp of empleados) {
        // Días trabajados esta semana (actividad en la app de sus usuarios)
        const diasTrabajados = (await db.get(`
          SELECT COUNT(DISTINCT fecha) AS n FROM (
            SELECT date(v.created_at) AS fecha FROM ventas v
            JOIN usuarios u ON v.vendedor_id = u.id
            JOIN empleados e ON u.empleado_id = e.id
            WHERE e.id = ? AND date(v.created_at) >= ? AND date(v.created_at) <= ? AND v.estado = 'completada'
            UNION
            SELECT date(m.created_at) FROM movimientos_stock m
            JOIN usuarios u ON m.usuario_id = u.id
            JOIN empleados e ON u.empleado_id = e.id
            WHERE e.id = ? AND date(m.created_at) >= ? AND date(m.created_at) <= ?
            UNION
            SELECT date(c.created_at) FROM compras c
            JOIN usuarios u ON c.usuario_id = u.id
            JOIN empleados e ON u.empleado_id = e.id
            WHERE e.id = ? AND date(c.created_at) >= ? AND date(c.created_at) <= ?
          )
        `, [emp.id, lunesStr, hoyStr, emp.id, lunesStr, hoyStr, emp.id, lunesStr, hoyStr]))?.n || 0;

        // Bonos ya pagados este mes
        const bonosMes = (await db.get(`
          SELECT COALESCE(SUM(monto), 0) AS total, COUNT(*) AS veces
          FROM bonos WHERE empleado_id = ? AND strftime('%Y-%m', fecha) = ?
        `, [emp.id, mesActual]));

        // Ventas por día esta semana (de sus usuarios vendedores)
        const ventasDia = await db.all(`
          SELECT date(v.created_at) AS dia, COUNT(*) AS cantidad, COALESCE(SUM(v.total), 0) AS total
          FROM ventas v
          JOIN usuarios u ON v.vendedor_id = u.id
          JOIN empleados e ON u.empleado_id = e.id
          WHERE e.id = ? AND date(v.created_at) >= ? AND date(v.created_at) <= ? AND v.estado = 'completada'
          GROUP BY dia ORDER BY dia
        `, [emp.id, lunesStr, hoyStr]);

        resultado.push({
          empleado_id: emp.id,
          nombre: emp.nombre,
          cargo: emp.cargo,
          salario_mensual: emp.salario_mensual,
          dias_trabajados_semana: diasTrabajados,
          bonos_pagados_mes: bonosMes.total,
          bonos_veces_mes: bonosMes.veces,
          total_a_recibir_mes: (emp.salario_mensual || 0) + bonosMes.total,
          ventas_por_dia: ventasDia
        });
      }

      res.json({
        semana: { desde: lunesStr, hasta: hoyStr },
        mes_actual: mesActual,
        empleados: resultado
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/contabilidad/bonos { empleado_id, monto } — paga bono semanal en EFECTIVO
  pagarBono: async (req, res, next) => {
    try {
      const db = await getDb();
      const { empleado_id, monto } = req.body;

      const montoNum = parseFloat(monto);
      if (!empleado_id || !montoNum || montoNum <= 0) {
        return res.status(400).json({ error: 'Empleado y monto (> 0) son obligatorios' });
      }

      const emp = await db.get('SELECT id, nombre FROM empleados WHERE id = ? AND activo = 1', [empleado_id]);
      if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' });

      await db.run('BEGIN TRANSACTION');
      try {
        const result = await db.run(
          'INSERT INTO bonos (empleado_id, fecha, monto, usuario_id) VALUES (?, date(\'now\', \'localtime\'), ?, ?)',
          [empleado_id, montoNum, req.usuario.id]
        );

        // El bono sale del efectivo (cash, propietario); no se declara como salario
        await db.run(`
          INSERT INTO movimientos_bancarios (tipo, monto, fecha, descripcion, cuenta, moneda, referencia, usuario_id)
          VALUES ('pago_servicio', ?, date('now', 'localtime'), ?, 'efectivo', 'CUP', ?, ?)
        `, [-montoNum, `Bono semanal — ${emp.nombre}`, `bono:${result.lastID}`, req.usuario.id]);

        await db.run('COMMIT');
        res.status(201).json({ message: `Bono de ${montoNum} pagado a ${emp.nombre} en efectivo` });
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
};

module.exports = nominaController;
