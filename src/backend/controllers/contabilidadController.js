// backend/controllers/contabilidadController.js
const { getDb } = require('../models/db');
const costos = require('../utils/costos');

// Porciento a declarar (m030): factor que escala ventas Y compras/gastos en lo fiscal.
// Devuelve 1 si no está configurado (= declarar el 100%).
async function factorDeclaracion(db) {
  const config = await db.get('SELECT porciento_declarar FROM parametros_contables WHERE id = 1');
  return (config?.porciento_declarar ?? 100) / 100;
}

const contabilidadController = {
  /**
   * Calcular liquidación de impuestos para un período específico
   * POST /api/contabilidad/calcular-impuestos
   * Body: { mes: 5, anio: 2026 }
   */
  calcularImpuestos: async (req, res, next) => {
    const db = await getDb();

    try {
      const { mes, anio } = req.body;

      if (!mes || !anio) {
        return res.status(400).json({
          success: false,
          error: 'Mes y año son requeridos'
        });
      }

      // Calcular rangos UTC (B3: diciembre pasa correctamente a enero del año siguiente)
      const mesNum = parseInt(mes);
      const anioNum = parseInt(anio);
      const siguiente = mesNum === 12 ? { anio: anioNum + 1, mes: 1 } : { anio: anioNum, mes: mesNum + 1 };
      const fechaInicioUTC = `${anioNum}-${mesNum.toString().padStart(2, '0')}-01 00:00:00`;
      const fechaFinUTC = `${siguiente.anio}-${siguiente.mes.toString().padStart(2, '0')}-01 00:00:00`;

      // 1. Obtener total de ventas del período (usando UTC)
      const ventasResult = await db.get(`
                SELECT 
                    COALESCE(SUM(total), 0) as total_ventas,
                    COALESCE(SUM(impuesto), 0) as total_impuesto_ventas,
                    COUNT(*) as cantidad_ventas
                FROM ventas 
                WHERE created_at >= datetime(?, 'utc')
                  AND created_at < datetime(?, 'utc')
                  AND estado = 'completada'
            `, [fechaInicioUTC, fechaFinUTC]);

      const totalVentasReal = ventasResult?.total_ventas || 0;

      // Porciento a declarar (propietario, m030): todo lo fiscal se calcula sobre
      // ventas Y compras/gastos reales × (porciento_declarar / 100)
      const configPD = await db.get('SELECT porciento_declarar FROM parametros_contables WHERE id = 1');
      const factorDeclaracion = (configPD?.porciento_declarar ?? 100) / 100;
      const totalVentas = totalVentasReal * factorDeclaracion;

      // 2. Obtener empleados activos (con usuario, si tienen credenciales — D18)
      const empleados = await db.all(`
                SELECT 
                    e.*,
                    u.username,
                    u.nombre_completo
                FROM empleados e
                LEFT JOIN usuarios u ON u.empleado_id = e.id
                WHERE e.activo = 1
            `);

      // 3. Obtener configuración general (salario mínimo, etc.)
      const config = await db.get(`
                SELECT salario_minimo, base_contribucion_especial, limite_escala_retencion
                FROM parametros_contables 
                WHERE id = 1
            `);

      const salarioMinimo = config?.salario_minimo || 3260;
      const baseContribucion = config?.base_contribucion_especial || 0;

      // 4. Obtener TODOS los tributos activos desde la BD
      const tributosActivos = await db.all(`
                SELECT 
                    t.*,
                    ct.tasa,
                    ct.valor_fijo,
                    ct.escala_json,
                    ct.base_calculo,
                    ct.vigencia_desde
                FROM tributos t
                JOIN configuracion_tributos ct ON t.id = ct.tributo_id
                WHERE t.activo = 1 
                  AND ct.activo = 1
                  AND (ct.vigencia_hasta IS NULL OR ct.vigencia_hasta >= date('now'))
                  AND t.periodo IN ('mensual', 'trimestral', 'puntual')
            `);

      // 5. Calcular cada tributo según el vector fiscal del propietario (docs/com.md)
      const impuestos = [];

      // Meses con actividad (ventas) en el trimestre que cierra este mes (para tributos trimestrales)
      const esFinTrimestre = [3, 6, 9, 12].includes(mesNum);
      let mesesActividadTrimestre = 0;
      if (esFinTrimestre) {
        const mesesTrimestre = [mesNum - 2, mesNum - 1, mesNum];
        for (const m of mesesTrimestre) {
          const hay = await db.get(`
            SELECT 1 FROM ventas 
            WHERE estado = 'completada' AND strftime('%Y', created_at) = ? AND strftime('%m', created_at) = ?
            LIMIT 1
          `, [String(anioNum), String(m).padStart(2, '0')]);
          if (hay) mesesActividadTrimestre++;
        }
      }

      // Fecha límite de pago: día X del mes siguiente (según dias_limite_pago del tributo)
      const fechaLimite = (dias) => `${siguiente.anio}-${siguiente.mes.toString().padStart(2, '0')}-${String(dias || 15).padStart(2, '0')}`;

      const totalSalarios = empleados.reduce((sum, e) => sum + (parseFloat(e.salario_mensual) || 0), 0);

      for (const tributo of tributosActivos) {
        let baseCalculo = 0;
        let monto = 0;

        switch (tributo.codigo) {
          case '0114022': // Impuesto sobre ventas y servicios: 10% × tv
            baseCalculo = totalVentas;
            monto = totalVentas * (tributo.tasa || 0.10);
            break;

          case '0510122': // Impuesto sobre ingresos personales: (tv − sm) × 5%
            baseCalculo = Math.max(0, totalVentas - salarioMinimo);
            monto = baseCalculo * (tributo.tasa || 0.05);
            break;

          case '0810132': // Contribución seguridad social TCP: 1.5%×at + 12.5%×st
            let totalAportesTCP = 0;
            for (const emp of empleados) {
              const aportesCP = parseFloat(emp.aporte_corto_plazo) || 0;
              const salario = parseFloat(emp.salario_mensual) || 0;
              totalAportesTCP += (aportesCP * 0.015) + (salario * 0.125);
            }
            baseCalculo = totalSalarios;
            monto = totalAportesTCP;
            break;

          case '0820232': // Retención a trabajadores: escala × (st + ut)
            let totalRetenciones = 0;
            const escalaData = tributo.escala_json
              ? JSON.parse(tributo.escala_json)
              : [{ desde: 0, hasta: 15000, porcentaje: 5 }, { desde: 15000.01, hasta: null, porcentaje: 10 }];

            for (const emp of empleados) {
              const salario = parseFloat(emp.salario_mensual) || 0;
              const utilidades = parseFloat(emp.utilidades) || 0;
              const base = salario + utilidades;

              let porcentaje = escalaData.find(r =>
                (r.desde <= base) && (r.hasta === null || base <= r.hasta)
              )?.porcentaje || 5;

              totalRetenciones += base * (porcentaje / 100);
            }
            baseCalculo = totalSalarios;
            monto = totalRetenciones;
            break;

          case '0520522': // Retención TCP a ingresos de empleados: [3%~20%] × st
            let totalRetTCP = 0;
            const escalaTCP = tributo.escala_json
              ? JSON.parse(tributo.escala_json)
              : [{ desde: 0, hasta: null, porcentaje: 3 }]; // por defecto el tramo mínimo

            for (const emp of empleados) {
              const salario = parseFloat(emp.salario_mensual) || 0;
              const porcentaje = escalaTCP.find(r =>
                (r.desde <= salario) && (r.hasta === null || salario <= r.hasta)
              )?.porcentaje || 3;
              totalRetTCP += salario * (porcentaje / 100);
            }
            baseCalculo = totalSalarios;
            monto = totalRetTCP;
            break;

          case '0610322': // Impuesto utilización fuerza de trabajo (trimestral): 5% × Σ salarios del trimestre
            if (esFinTrimestre && mesesActividadTrimestre > 0) {
              baseCalculo = totalSalarios * mesesActividadTrimestre;
              monto = baseCalculo * (tributo.tasa || 0.05);
            }
            break;

          case '0820132': // Contribución especial TCP (trimestral): 20% × base × meses del trimestre
            if (esFinTrimestre && baseContribucion > 0 && mesesActividadTrimestre > 0) {
              baseCalculo = baseContribucion * mesesActividadTrimestre;
              monto = baseCalculo * (tributo.tasa || 0.20);
            }
            break;

          case '0730122': // Impuesto sobre documentos (puntual, monto fijo, una sola vez)
            {
              const yaLiquidado = await db.get(`
                SELECT 1 FROM liquidaciones_tributos lt
                JOIN tributos t ON lt.tributo_id = t.id
                WHERE t.codigo = '0730122' LIMIT 1
              `);
              if (!yaLiquidado && tributo.valor_fijo > 0) {
                baseCalculo = tributo.valor_fijo;
                monto = tributo.valor_fijo;
              }
            }
            break;

          case '0530222': // Liquidación anual (Declaración Jurada) — se maneja aparte
            break;

          default:
            break;
        }

        if (monto > 0) {
          impuestos.push({
            codigo: tributo.codigo,
            nombre: tributo.nombre,
            base_calculo: Math.round(baseCalculo * 100) / 100,
            monto: Math.round(monto * 100) / 100,
            periodo: tributo.periodo,
            fecha_limite: fechaLimite(tributo.dias_limite_pago),
            formula: tributo.expresion_formula || `Tasa: ${(tributo.tasa || 0) * 100}%`
          });
        }
      }

      const totalImpuestos = impuestos.reduce((sum, imp) => sum + imp.monto, 0);

      // Guardar período fiscal y liquidaciones (período según el tipo del tributo)
      const guardarLiquidacion = async (codigo, imp, periodoId) => {
        const tributo = await db.get('SELECT id FROM tributos WHERE codigo = ?', [codigo]);
        if (!tributo) return;

        const existente = await db.get(`
          SELECT id FROM liquidaciones_tributos 
          WHERE tributo_id = ? AND periodo_fiscal_id = ?
        `, [tributo.id, periodoId]);

        if (!existente) {
          await db.run(`
            INSERT INTO liquidaciones_tributos 
            (tributo_id, periodo_fiscal_id, base_calculo, monto_calculado, estado)
            VALUES (?, ?, ?, ?, 'pendiente')
          `, [tributo.id, periodoId, imp.base_calculo, imp.monto]);
        }
      };

      for (const imp of impuestos) {
        let periodoId;

        if (imp.periodo === 'trimestral') {
          const trimestre = Math.ceil(mesNum / 3);
          let periodo = await db.get(
            "SELECT id FROM periodos_fiscales WHERE tipo_periodo = 'trimestral' AND anio = ? AND trimestre = ?",
            [anioNum, trimestre]
          );
          if (!periodo) {
            const r = await db.run(`
              INSERT INTO periodos_fiscales (tipo_periodo, anio, trimestre, fecha_inicio, fecha_fin, fecha_limite_pago)
              VALUES ('trimestral', ?, ?, datetime(?, 'utc'), datetime(?, 'utc'), ?)
            `, [anioNum, trimestre, fechaInicioUTC, fechaFinUTC, imp.fecha_limite]);
            periodoId = r.lastID;
          } else {
            periodoId = periodo.id;
          }
        } else {
          // mensual (los tributos 'puntual' también cuelgan del período mensual en curso;
          // solo se liquidan una vez gracias al guard de "yaLiquidado")
          const periodoExistente = await db.get(`
            SELECT id FROM periodos_fiscales 
            WHERE tipo_periodo = 'mensual' AND anio = ? AND mes = ?
          `, [anioNum, mesNum]);

          if (!periodoExistente) {
            const result = await db.run(`
              INSERT INTO periodos_fiscales 
              (tipo_periodo, anio, mes, fecha_inicio, fecha_fin, fecha_limite_pago)
              VALUES ('mensual', ?, ?, datetime(?, 'utc'), datetime(?, 'utc'), ?)
            `, [anioNum, mesNum, fechaInicioUTC, fechaFinUTC, imp.fecha_limite]);
            periodoId = result.lastID;
          } else {
            periodoId = periodoExistente.id;
          }
        }

        await guardarLiquidacion(imp.codigo, imp, periodoId);
      }

      res.json({
        success: true,
        periodo: `${mes}/${anio}`,
        total_ventas: totalVentas,
        total_ventas_real: totalVentasReal,
        porciento_declarar: configPD?.porciento_declarar ?? 100,
        salario_minimo: salarioMinimo,
        empleados_count: empleados.length,
        impuestos: impuestos,
        total_impuestos: totalImpuestos
      });

    } catch (error) {
      console.error('Error al calcular impuestos:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Registrar pago de un tributo
   * POST /api/contabilidad/registrar-pago
   * Body: { liquidacion_id, monto_pagado, comprobante, fecha_pago }
   */
  registrarPago: async (req, res, next) => {
    const db = await getDb();

    try {
      const { liquidacion_id, monto_pagado, comprobante, fecha_pago, por_banco } = req.body;

      if (!liquidacion_id || !monto_pagado) {
        return res.status(400).json({
          success: false,
          error: 'Liquidación ID y monto pagado son requeridos'
        });
      }

      const liquidacion = await db.get('SELECT id, tributo_id FROM liquidaciones_tributos WHERE id = ?', [liquidacion_id]);
      if (!liquidacion) {
        return res.status(404).json({ success: false, error: 'Liquidación no encontrada' });
      }

      await db.run(`
                UPDATE liquidaciones_tributos 
                SET monto_pagado = ?,
                    comprobante_pago = ?,
                    fecha_pago = ?,
                    estado = CASE 
                        WHEN ? >= monto_calculado THEN 'pagado'
                        ELSE 'parcial'
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [monto_pagado, comprobante || null, fecha_pago || new Date().toISOString().split('T')[0], monto_pagado, liquidacion_id]);

      // Los pagos de impuestos se suelen hacer por banco online (propietario):
      // registrar salida del banco salvo que se indique lo contrario
      if (por_banco !== false) {
        const tributo = await db.get('SELECT codigo, nombre FROM tributos WHERE id = ?', [liquidacion.tributo_id]);
        await db.run(`
          INSERT INTO movimientos_bancarios (tipo, monto, fecha, descripcion, referencia, usuario_id)
          VALUES ('pago_impuesto', ?, date('now', 'localtime'), ?, ?, ?)
        `, [monto_pagado, `Pago impuesto ${tributo?.codigo || ''} — ${tributo?.nombre || ''}`.trim(), comprobante || null, req.usuario.id]);
      }

      res.json({
        success: true,
        message: 'Pago registrado correctamente'
      });

    } catch (error) {
      console.error('Error al registrar pago:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Obtener historial de liquidaciones
   * GET /api/contabilidad/historial
   */
  getHistorial: async (req, res, next) => {
    const db = await getDb();

    try {
      const historial = await db.all(`
                SELECT 
                    lt.*,
                    t.codigo,
                    t.nombre as tributo_nombre,
                    pf.anio,
                    pf.mes,
                    pf.trimestre,
                    pf.tipo_periodo
                FROM liquidaciones_tributos lt
                JOIN tributos t ON lt.tributo_id = t.id
                JOIN periodos_fiscales pf ON lt.periodo_fiscal_id = pf.id
                ORDER BY pf.anio DESC, pf.mes DESC, pf.trimestre DESC
                LIMIT 100
            `);

      res.json({
        success: true,
        data: historial
      });

    } catch (error) {
      console.error('Error al obtener historial:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Obtener balance general
   * GET /api/contabilidad/balance?anio=2026&mes=5
   */
  getBalanceGeneral: async (req, res, next) => {
    const db = await getDb();

    try {
      const { anio, mes } = req.query;

      // Ingresos totales del período
      const ingresos = await db.get(`
                SELECT 
                    COALESCE(SUM(total), 0) as total_ingresos,
                    COALESCE(SUM(impuesto), 0) as total_impuestos,
                    COUNT(*) as num_ventas
                FROM ventas 
                WHERE strftime('%Y', created_at) = ?
                AND (strftime('%m', created_at) = ? OR ? IS NULL)
                AND estado = 'completada'
            `, [anio, mes?.toString().padStart(2, '0') || '', mes || null]);

      // Gastos fijos mensuales (configuracion_gastos + salarios de empleados activos)
      const { gastosFijos: gastosFijosBalance } = await costos.obtenerGastosFijos(db);
      const gastos = { total_gastos: gastosFijosBalance };

      // Compras del período
      const compras = await db.get(`
                SELECT COALESCE(SUM(total), 0) as total_compras
                FROM compras 
                WHERE strftime('%Y', fecha_compra) = ?
                AND (strftime('%m', fecha_compra) = ? OR ? IS NULL)
            `, [anio, mes?.toString().padStart(2, '0') || '', mes || null]);

      const pd = await factorDeclaracion(db);

      res.json({
        success: true,
        data: {
          ingresos: ingresos,
          ingresos_declarados: Math.round((ingresos?.total_ingresos || 0) * pd * 100) / 100,
          gastos_fijos: gastos?.total_gastos || 0,
          gastos_declarados: Math.round((gastos?.total_gastos || 0) * pd * 100) / 100,
          compras: compras?.total_compras || 0,
          compras_declaradas: Math.round((compras?.total_compras || 0) * pd * 100) / 100,
          porciento_declarar: pd * 100,
          ganancia_bruta: ((ingresos?.total_ingresos || 0) - (compras?.total_compras || 0)) * pd,
          ganancia_neta: ((ingresos?.total_ingresos || 0) - (compras?.total_compras || 0) - (gastos?.total_gastos || 0)) * pd
        }
      });

    } catch (error) {
      console.error('Error al obtener balance:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Obtener estado de resultados (PyG)
   * GET /api/contabilidad/estado-resultados?anio=2026&mes=5
   */
  getEstadoResultados: async (req, res, next) => {
    const db = await getDb();

    try {
      const { anio, mes } = req.query;

      // Ventas totales
      const ventas = await db.get(`
                SELECT 
                    COALESCE(SUM(subtotal), 0) as ventas_netas,
                    COALESCE(SUM(impuesto), 0) as impuestos_ventas,
                    COALESCE(SUM(total), 0) as ventas_brutas
                FROM ventas 
                WHERE strftime('%Y', created_at) = ?
                AND (strftime('%m', created_at) = ? OR ? IS NULL)
                AND estado = 'completada'
            `, [anio, mes?.toString().padStart(2, '0') || '', mes || null]);

      // Costo de ventas (último costo almacenado en productos)
      const costoVentas = await db.get(`
                SELECT COALESCE(SUM(vd.cantidad * p.costo_base), 0) as total_costo
                FROM venta_detalles vd
                JOIN productos p ON vd.producto_id = p.id
                JOIN ventas v ON vd.venta_id = v.id
                WHERE strftime('%Y', v.created_at) = ?
                AND (strftime('%m', v.created_at) = ? OR ? IS NULL)
                AND v.estado = 'completada'
            `, [anio, mes?.toString().padStart(2, '0') || '', mes || null]);

      // Gastos operativos (configuracion_gastos + salarios de empleados activos)
      const { gastosFijos: gastosFijosOperativos } = await costos.obtenerGastosFijos(db);
      const gastosOperativos = { total_gastos: gastosFijosOperativos };

      const pd = await factorDeclaracion(db);
      const ventasDecl = (ventas?.ventas_netas || 0) * pd;
      const costoDecl = (costoVentas?.total_costo || 0) * pd;
      const gastosDecl = (gastosOperativos?.total_gastos || 0) * pd;

      const gananciaBruta = ventasDecl - costoDecl;
      const gananciaNeta = gananciaBruta - gastosDecl;

      res.json({
        success: true,
        data: {
          ventas: ventas,
          ventas_declaradas: Math.round(ventasDecl * 100) / 100,
          costo_ventas: costoVentas?.total_costo || 0,
          costo_declarado: Math.round(costoDecl * 100) / 100,
          ganancia_bruta: gananciaBruta,
          gastos_operativos: gastosOperativos?.total_gastos || 0,
          gastos_declarados: gastosDecl,
          ganancia_neta: gananciaNeta,
          porciento_declarar: pd * 100,
          margen_bruto: gananciaBruta / (ventasDecl || 1) * 100,
          margen_neto: gananciaNeta / (ventasDecl || 1) * 100
        }
      });

    } catch (error) {
      console.error('Error al obtener estado de resultados:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Cierre de mes: desglose del recaudado por prioridades + comparación %gastos
   * GET /api/contabilidad/cierre-mes?mes=8&anio=2026
   */
  getCierreMes: async (req, res, next) => {
    const db = await getDb();

    try {
      const { mes, anio } = req.query;
      if (!mes || !anio) {
        return res.status(400).json({ success: false, error: 'Mes y año son requeridos' });
      }

      const mesNum = parseInt(mes);
      const anioNum = parseInt(anio);
      const siguiente = mesNum === 12 ? { anio: anioNum + 1, mes: 1 } : { anio: anioNum, mes: mesNum + 1 };
      const inicio = `${anioNum}-${mesNum.toString().padStart(2, '0')}-01 00:00:00`;
      const fin = `${siguiente.anio}-${siguiente.mes.toString().padStart(2, '0')}-01 00:00:00`;

      const costos = require('../utils/costos');
      const desglose = await costos.desglosePrioridades(db, inicio, fin);

      res.json({
        success: true,
        periodo: `${mesNum}/${anioNum}`,
        data: desglose
      });

      } catch (error) {
        console.error('Error en cierre de mes:', error);
        res.status(500).json({ success: false, error: error.message });
      }
  },

  /**
   * Liquidación anual — 0530222 (Declaración Jurada del TCP)
   * GET /api/contabilidad/liquidacion-anual?anio=2026
   * ganancia_neta = ventas_netas − costo_ventas − gastos del año
   * monto = ganancia_neta × impuesto_ganancia (35%)
   * 5% de descuento si se paga antes del 28/02 del año siguiente
   */
  getLiquidacionAnual: async (req, res, next) => {
    const db = await getDb();

    try {
      const anio = parseInt(req.query.anio);
      if (!anio) {
        return res.status(400).json({ success: false, error: 'Año requerido' });
      }

      const inicio = `${anio}-01-01 00:00:00`;
      const fin = `${anio + 1}-01-01 00:00:00`;

      // Ventas del año
      const ventas = await db.get(`
        SELECT COALESCE(SUM(subtotal), 0) AS ventas_netas,
               COALESCE(SUM(impuesto), 0) AS impuestos,
               COALESCE(SUM(total), 0) AS recaudado
        FROM ventas
        WHERE created_at >= ? AND created_at < ? AND estado = 'completada'
      `, [inicio, fin]);

      // Costo de ventas del año
      const costoRow = await db.get(`
        SELECT COALESCE(SUM(vd.cantidad * p.costo_base), 0) AS total
        FROM venta_detalles vd
        JOIN productos p ON vd.producto_id = p.id
        JOIN ventas v ON vd.venta_id = v.id
        WHERE v.created_at >= ? AND v.created_at < ? AND v.estado = 'completada'
      `, [inicio, fin]);

      // Meses con actividad en el año
      const mesesActividad = (await db.get(`
        SELECT COUNT(DISTINCT strftime('%m', created_at)) AS n
        FROM ventas
        WHERE created_at >= ? AND created_at < ? AND estado = 'completada'
      `, [inicio, fin]))?.n || 0;

      // Gastos fijos (mensuales × meses con actividad) + gasto financiero del año
      // Gastos fijos mensuales = configuracion_gastos + salarios de empleados activos
      const { gastosFijos: gastosFijosAnuales } = await costos.obtenerGastosFijos(db);
      const gastosMes = gastosFijosAnuales;

      const financieroAnio = (await db.get(`
        SELECT COALESCE(SUM(v.aporte), 0) AS total
        FROM vencimientos v
        JOIN prestamos_inversiones pi ON v.prestamo_inversion_id = pi.id
        WHERE pi.estado = 'activo' AND strftime('%Y', v.fecha_vencimiento) = ?
      `, [String(anio)]))?.total || 0;

      const gastosAnio = (gastosMes * mesesActividad) + financieroAnio;

      // Ganancia neta y monto (declarados: ventas Y gastos × PD, m030)
      const pd = await factorDeclaracion(db);
      const ventasDecl = ventas.ventas_netas * pd;
      const gastosDecl = gastosAnio * pd;
      const gananciaNeta = ventasDecl - costoRow.total * pd - gastosDecl;
      const config = await db.get('SELECT impuesto_ganancia FROM parametros_contables WHERE id = 1');
      const tasa = (config?.impuesto_ganancia ?? 35) / 100;
      const monto = Math.max(0, gananciaNeta) * tasa;
      const montoConDescuento = monto * 0.95; // 5% dto. si se paga antes del 28/02 del año siguiente
      const fechaLimite = `${anio + 1}-02-28`;

      // Persistir liquidación anual (sin duplicar)
      const tributo = await db.get("SELECT id FROM tributos WHERE codigo = '0530222'");
      if (tributo && monto > 0) {
        let periodo = await db.get(
          "SELECT id FROM periodos_fiscales WHERE tipo_periodo = 'anual' AND anio = ?", [anio]
        );
        let periodoId;
        if (!periodo) {
          const r = await db.run(`
            INSERT INTO periodos_fiscales (tipo_periodo, anio, fecha_inicio, fecha_fin, fecha_limite_pago)
            VALUES ('anual', ?, ?, ?, ?)
          `, [anio, `${anio}-01-01`, `${anio}-12-31`, fechaLimite]);
          periodoId = r.lastID;
        } else {
          periodoId = periodo.id;
        }

        const existente = await db.get(
          'SELECT id FROM liquidaciones_tributos WHERE tributo_id = ? AND periodo_fiscal_id = ?',
          [tributo.id, periodoId]
        );
        if (!existente) {
          await db.run(`
            INSERT INTO liquidaciones_tributos (tributo_id, periodo_fiscal_id, base_calculo, monto_calculado, estado)
            VALUES (?, ?, ?, ?, 'pendiente')
          `, [tributo.id, periodoId, Math.round(gananciaNeta * 100) / 100, Math.round(monto * 100) / 100]);
        }
      }

      res.json({
        success: true,
        anio,
        data: {
          ventas_netas: ventas.ventas_netas,
          ventas_declaradas: Math.round(ventasDecl * 100) / 100,
          costo_ventas: costoRow.total,
          gastos_fijos: gastosMes * mesesActividad,
          gastos_declarados: Math.round(gastosDecl * 100) / 100,
          gasto_financiero: financieroAnio,
          meses_con_actividad: mesesActividad,
          ganancia_neta: Math.round(gananciaNeta * 100) / 100,
          porciento_declarar: pd * 100,
          tasa: tasa * 100,
          monto: Math.round(monto * 100) / 100,
          monto_con_descuento: Math.round(montoConDescuento * 100) / 100,
          descuento_nota: 'Paga antes del 28/02 y obtén un 5% de descuento. Recuerda: hay que justificar el 80% de los gastos.',
          fecha_limite: fechaLimite
        }
      });

    } catch (error) {
      console.error('Error en liquidación anual:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * Banco y Efectivo por moneda (USD incluido, m025)
   * Saldos: efectivo/banco × CUP/USD + total equivalente en CUP (última tasa usada).
   * GET /api/contabilidad/banco
   */
  getBanco: async (req, res, next) => {
    const db = await getDb();

    try {
      // Ventas minoristas por método (completadas − anuladas)
      const ventas = await db.all(`
        SELECT metodo_pago,
               COALESCE(SUM(CASE WHEN estado = 'completada' THEN total ELSE 0 END), 0)
             - COALESCE(SUM(CASE WHEN estado = 'anulada' THEN total ELSE 0 END), 0) AS total
        FROM ventas GROUP BY metodo_pago
      `);
      const vPorMetodo = {};
      ventas.forEach(v => vPorMetodo[v.metodo_pago] = v.total);

      // Cobros mayoristas por método y moneda
      const cobros = await db.all(`
        SELECT metodo_pago, moneda, COALESCE(SUM(monto), 0) AS total
        FROM pagos_pedido GROUP BY metodo_pago, moneda
      `);
      const cPor = (m, mon) => cobros.find(c => c.metodo_pago === m && c.moneda === mon)?.total || 0;

      // Movimientos manuales por tipo y moneda
      const movs = await db.all(`
        SELECT tipo, moneda, COALESCE(SUM(monto), 0) AS total
        FROM movimientos_bancarios GROUP BY tipo, moneda
      `);
      const mPor = (t, mon) => movs.find(m => m.tipo === t && m.moneda === mon)?.total || 0;

      const saldos = {};
      for (const mon of ['CUP', 'USD']) {
        const efectivo = mon === 'CUP'
          ? (vPorMetodo['efectivo'] || 0) + cPor('efectivo', 'CUP') - mPor('deposito', 'CUP') + mPor('retiro', 'CUP')
          : cPor('efectivo', 'USD') - mPor('deposito', 'USD') + mPor('retiro', 'USD');

        const banco = (mon === 'CUP' ? (vPorMetodo['tarjeta'] || 0) : 0)
          + cPor('tarjeta', mon) + cPor('transferencia', mon)
          + mPor('deposito', mon) - mPor('retiro', mon)
          - mPor('compra_transferencia', mon) - mPor('pago_impuesto', mon);

        // Cambios de divisas y servicios en esa cuenta/moneda (monto con signo)
        const cambiosEfec = await db.get(
          "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_bancarios WHERE tipo = 'cambio_divisas' AND cuenta = 'efectivo' AND moneda = ?", [mon]);
        const cambiosBanco = await db.get(
          "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_bancarios WHERE tipo = 'cambio_divisas' AND cuenta = 'banco' AND moneda = ?", [mon]);
        const serviciosEfec = await db.get(
          "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_bancarios WHERE tipo IN ('cobro_servicio', 'pago_servicio') AND cuenta = 'efectivo' AND moneda = ?", [mon]);
        const serviciosBanco = await db.get(
          "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_bancarios WHERE tipo IN ('cobro_servicio', 'pago_servicio') AND cuenta = 'banco' AND moneda = ?", [mon]);

        saldos[mon] = {
          efectivo: Math.round((efectivo + (cambiosEfec?.total || 0) + (serviciosEfec?.total || 0)) * 100) / 100,
          banco: Math.round((banco + (cambiosBanco?.total || 0) + (serviciosBanco?.total || 0)) * 100) / 100
        };
      }

      // Última tasa usada (la más fresca) para el equivalente total
      const ultPago = await db.get(`
        SELECT tasa_cambio AS t, created_at AS c FROM pagos_pedido
        WHERE moneda = 'USD' AND tasa_cambio > 0 ORDER BY id DESC LIMIT 1
      `);
      const ultMov = await db.get(`
        SELECT tasa_cambio AS t, created_at AS c FROM movimientos_bancarios
        WHERE moneda = 'USD' AND tasa_cambio > 0 ORDER BY id DESC LIMIT 1
      `);
      let ultimaTasa = 0;
      if (ultPago && ultMov) {
        // En empate de segundo, el cambio de divisas es la operación de fijación de tasa
        ultimaTasa = ultMov.c >= ultPago.c ? ultMov.t : ultPago.t;
      } else {
        ultimaTasa = ultMov?.t || ultPago?.t || 0;
      }

      const totalEquivalente = saldos.CUP.efectivo + saldos.CUP.banco + (saldos.USD.efectivo + saldos.USD.banco) * ultimaTasa;

      // Desglose en CUP equivalente (compat con versiones anteriores / reportes)
      const desglose = {
        ventas_tarjeta: vPorMetodo['tarjeta'] || 0,
        cobros_mayoristas: (cPor('tarjeta', 'CUP') + cPor('transferencia', 'CUP'))
          + (cPor('tarjeta', 'USD') + cPor('transferencia', 'USD')) * ultimaTasa,
        depositos: mPor('deposito', 'CUP') + mPor('deposito', 'USD') * ultimaTasa,
        retiros: mPor('retiro', 'CUP') + mPor('retiro', 'USD') * ultimaTasa,
        compras_transferencia: mPor('compra_transferencia', 'CUP') + mPor('compra_transferencia', 'USD') * ultimaTasa,
        pagos_impuestos: mPor('pago_impuesto', 'CUP') + mPor('pago_impuesto', 'USD') * ultimaTasa
      };

      const movimientos = await db.all(`
        SELECT m.*, u.nombre_completo AS usuario_nombre
        FROM movimientos_bancarios m
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        ORDER BY m.created_at DESC LIMIT 100
      `);

      res.json({
        success: true,
        data: {
          saldo: saldos.CUP.banco, // compat con la UI actual
          saldos,
          desglose,
          ultima_tasa_usd: ultimaTasa,
          total_equivalente_cup: Math.round(totalEquivalente * 100) / 100,
          movimientos
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Cambio de divisas: mover dinero entre USD y CUP a una tasa acordada
   * POST /api/contabilidad/cambio-divisas { de: 'USD'|'CUP', monto, tasa, cuenta?: 'banco'|'efectivo' }
   * Ej: de USD, monto 100, tasa 320 → −100 USD, +32 000 CUP en la misma cuenta.
   */
  cambioDivisas: async (req, res, next) => {
    const db = await getDb();
    try {
      const { de, monto, tasa, cuenta } = req.body;
      const cta = ['banco', 'efectivo'].includes(cuenta) ? cuenta : 'banco';

      if (!['USD', 'CUP'].includes(de)) {
        return res.status(400).json({ success: false, error: 'Origen inválido: USD o CUP' });
      }
      const montoNum = parseFloat(monto);
      const tasaNum = parseFloat(tasa);
      if (!montoNum || montoNum <= 0 || !tasaNum || tasaNum <= 0) {
        return res.status(400).json({ success: false, error: 'Monto y tasa deben ser mayores que cero' });
      }

      const origen = de;
      const destino = de === 'USD' ? 'CUP' : 'USD';
      const montoDestino = origen === 'USD' ? montoNum * tasaNum : montoNum / tasaNum;
      const hoy = new Date().toISOString().split('T')[0];

      await db.run('BEGIN TRANSACTION');
      try {
        await db.run(`
          INSERT INTO movimientos_bancarios (tipo, monto, fecha, descripcion, cuenta, moneda, tasa_cambio, usuario_id)
          VALUES ('cambio_divisas', ?, ?, ?, ?, ?, ?, ?)
        `, [-montoNum, hoy, `Cambio ${origen} → ${destino} (tasa ${tasaNum})`, cta, origen, tasaNum, req.usuario.id]);

        await db.run(`
          INSERT INTO movimientos_bancarios (tipo, monto, fecha, descripcion, cuenta, moneda, tasa_cambio, usuario_id)
          VALUES ('cambio_divisas', ?, ?, ?, ?, ?, ?, ?)
        `, [Math.round(montoDestino * 100) / 100, hoy, `Cambio ${origen} → ${destino} (tasa ${tasaNum})`, cta, destino, tasaNum, req.usuario.id]);

        await db.run('COMMIT');
        res.status(201).json({
          success: true,
          message: `Cambio registrado: −${montoNum} ${origen} → +${Math.round(montoDestino * 100) / 100} ${destino} (cuenta ${cta}, tasa ${tasaNum})`
        });
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * Registrar depósito o retiro manual
   * POST /api/contabilidad/banco/movimiento { tipo: 'deposito'|'retiro', monto, descripcion, referencia }
   */
  registrarMovimientoBanco: async (req, res, next) => {
    const db = await getDb();

    try {
      const { tipo, monto, descripcion, referencia } = req.body;

      if (!['deposito', 'retiro'].includes(tipo)) {
        return res.status(400).json({ success: false, error: 'Tipo inválido: deposito o retiro' });
      }
      const montoNum = parseFloat(monto);
      if (!montoNum || montoNum <= 0) {
        return res.status(400).json({ success: false, error: 'El monto debe ser mayor que cero' });
      }

      await db.run(`
        INSERT INTO movimientos_bancarios (tipo, monto, fecha, descripcion, referencia, usuario_id)
        VALUES (?, ?, date('now', 'localtime'), ?, ?, ?)
      `, [tipo, montoNum, descripcion || null, referencia || null, req.usuario.id]);

      res.status(201).json({
        success: true,
        message: tipo === 'deposito' ? 'Depósito registrado' : 'Retiro registrado'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Exportar liquidaciones del período a CSV (para software contable certificado, ej: Versat Sarasola)
   * GET /api/contabilidad/exportar?mes=8&anio=2026
   */
  exportarLiquidaciones: async (req, res, next) => {
    const db = await getDb();

    try {
      const { mes, anio } = req.query;
      if (!mes || !anio) {
        return res.status(400).json({ success: false, error: 'Mes y año son requeridos' });
      }

      const liquidaciones = await db.all(`
        SELECT t.codigo, t.nombre AS tributo, pf.anio, pf.mes, pf.trimestre, pf.tipo_periodo,
               lt.base_calculo, lt.monto_calculado, lt.monto_pagado, lt.estado, lt.fecha_pago, lt.comprobante_pago
        FROM liquidaciones_tributos lt
        JOIN tributos t ON lt.tributo_id = t.id
        JOIN periodos_fiscales pf ON lt.periodo_fiscal_id = pf.id
        WHERE (pf.anio = ? AND (pf.mes = ? OR ? IS NULL))
        ORDER BY pf.tipo_periodo, t.codigo
      `, [anio, mes, mes || null]);

      const esc = (v) => {
        const s = String(v ?? '');
        return s.includes(';') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      };

      const lineas = [
        'codigo_tributo;tributo;anio;mes;trimestre;tipo_periodo;base_calculo;monto_calculado;monto_pagado;estado;fecha_pago;comprobante'
      ];
      for (const l of liquidaciones) {
        lineas.push([
          l.codigo, esc(l.tributo), l.anio, l.mes ?? '', l.trimestre ?? '', l.tipo_periodo,
          l.base_calculo, l.monto_calculado, l.monto_pagado || 0, l.estado, l.fecha_pago || '', esc(l.comprobante_pago || '')
        ].join(';'));
      }

      const csv = '﻿' + lineas.join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="liquidaciones_${anio}-${String(mes).padStart(2, '0')}.csv"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Libro diario: ventas y gastos por día del período (real y declarado × PD, m030)
   * GET /api/contabilidad/libro-diario?mes=8&anio=2026
   */
  getLibroDiario: async (req, res, next) => {
    const db = await getDb();

    try {
      const { mes, anio } = req.query;
      if (!mes || !anio) {
        return res.status(400).json({ success: false, error: 'Mes y año son requeridos' });
      }
      const mesNum = parseInt(mes);
      const anioNum = parseInt(anio);
      const siguiente = mesNum === 12 ? { anio: anioNum + 1, mes: 1 } : { anio: anioNum, mes: mesNum + 1 };
      const inicio = `${anioNum}-${mesNum.toString().padStart(2, '0')}-01 00:00:00`;
      const fin = `${siguiente.anio}-${siguiente.mes.toString().padStart(2, '0')}-01 00:00:00`;
      const pd = await factorDeclaracion(db);

      const ventasPorDia = await db.all(`
        SELECT date(created_at) AS dia,
               COUNT(*) AS cantidad,
               COALESCE(SUM(subtotal), 0) AS ventas_netas,
               COALESCE(SUM(total), 0) AS ventas_brutas
        FROM ventas
        WHERE created_at >= ? AND created_at < ? AND estado = 'completada'
        GROUP BY dia ORDER BY dia
      `, [inicio, fin]);

      const gastosPorDia = await db.all(`
        SELECT dia, SUM(total) AS gastos FROM (
          SELECT date(c.fecha_compra) AS dia, COALESCE(SUM(c.total), 0) AS total
          FROM compras c
          WHERE c.fecha_compra >= ? AND c.fecha_compra < ?
          GROUP BY dia
          UNION ALL
          SELECT date(s.fecha) AS dia, COALESCE(SUM(s.monto), 0) AS total
          FROM servicios s
          WHERE s.tipo = 'pago' AND s.fecha >= ? AND s.fecha < ?
          GROUP BY dia
        ) GROUP BY dia ORDER BY dia
      `, [inicio.slice(0, 10), fin.slice(0, 10), inicio.slice(0, 10), fin.slice(0, 10)]);

      const gastosMap = {};
      gastosPorDia.forEach(g => gastosMap[g.dia] = g.gastos);

      const libro = ventasPorDia.map(v => {
        const gastos = gastosMap[v.dia] || 0;
        return {
          dia: v.dia,
          cantidad_ventas: v.cantidad,
          ventas_reales: v.ventas_netas,
          ventas_declaradas: Math.round(v.ventas_netas * pd * 100) / 100,
          gastos_reales: gastos,
          gastos_declarados: Math.round(gastos * pd * 100) / 100
        };
      });

      res.json({
        success: true,
        periodo: `${mesNum}/${anioNum}`,
        porciento_declarar: pd * 100,
        data: libro
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = contabilidadController;