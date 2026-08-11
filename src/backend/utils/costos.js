/**
 * costos.js — Servicio de costeo absorbente y recálculo de precios (D3).
 *
 * Fuentes de verdad:
 *   · productos.costo_base — último costo de compra (simples) o suma de receta (compuestos)
 *   · productos.precio_recomendado — costeo absorbente con margen_recomendado de configuración
 *
 * Fórmulas (del propietario, multiplicativa):
 *   %gastos (fracción) = Σ gastos fijos activos ÷ ventas_proyectadas
 *   precio_neto        = costo_base × (1 + %gastos) × (1 + margen_recomendado%)
 *   precio_recomendado = precio_neto × (1 + impuesto_ventas%)
 *
 * Recálculo:
 *   · recalcularPorIngrediente(db, id)  — tras compra/cambio de costo de un producto:
 *     recalcula ese producto y todos los compuestos que lo contienen (cascada hacia arriba).
 *   · recalcularTodosLosPrecios(db)     — tras cambio en parametros_contables.
 */

// Lee configuración y calcula el % de gastos fijos (fracción).
// Fórmula del propietario: %gastos = (Σ gastos activos + gasto financiero del mes) ÷ ventas_proyectadas
// El gasto financiero sale de los vencimientos del mes en curso (préstamos/inversiones, m020).
async function obtenerParametros(db) {
  const config = await db.get('SELECT * FROM parametros_contables WHERE id = 1');
  const gastos = await db.get(
    'SELECT COALESCE(SUM(valor_mensual), 0) AS total FROM configuracion_gastos WHERE activo = 1'
  );

  // Gasto financiero del mes en curso (préstamos e inversiones activos)
  const ahora = new Date();
  const { gastoFinancieroMes } = require('../controllers/prestamoInversionController');
  const gastoFinanciero = await gastoFinancieroMes(db, ahora.getFullYear(), ahora.getMonth() + 1);

  const ventasProy = config?.ventas_proyectadas || 0;
  const totalGastos = gastos.total + gastoFinanciero;
  const pctGastos = ventasProy > 0 ? totalGastos / ventasProy : 0; // fracción

  return {
    pctGastos,
    margen: config?.margen_recomendado ?? 20,   // %
    impuesto: config?.impuesto_ventas ?? 15,    // %
    gastoFinanciero                              // informativo (desglose)
  };
}

// Fórmula del propietario (multiplicativa):
//   precio_neto = costo_base × (1 + %gastos) × (1 + margen%)
//   precio_recomendado = precio_neto × (1 + impuesto%)
function calcularPrecioRecomendado(costoBase, pctGastos, margenPct, impuestoPct) {
  if (!costoBase || costoBase <= 0) return null;
  const precioNeto = costoBase * (1 + pctGastos) * (1 + margenPct / 100);
  return Math.round(precioNeto * (1 + impuestoPct / 100) * 100) / 100;
}

// Costo de un compuesto = Σ (cantidad_receta × costo del ingrediente). Recursivo.
// El guard `visitados` evita bucles infinitos (D2 previene ciclos; esto es cinturón y tirantes).
async function calcularCostoCompuesto(db, productoId, visitados = new Set()) {
  if (visitados.has(productoId)) return 0;
  visitados.add(productoId);

  const componentes = await db.all(`
    SELECT r.cantidad, r.producto_hijo_id, p.tipo, p.costo_base
    FROM recetas r
    JOIN productos p ON p.id = r.producto_hijo_id
    WHERE r.producto_padre_id = ?
  `, [productoId]);

  let total = 0;
  for (const c of componentes) {
    const costoHijo = c.tipo === 'compuesto'
      ? await calcularCostoCompuesto(db, c.producto_hijo_id, visitados)
      : (c.costo_base || 0);
    total += costoHijo * c.cantidad;
  }
  return Math.round(total * 100) / 100;
}

// Recalcula costo_base (compuestos) y precio_recomendado de UN producto
async function recalcularProducto(db, productoId, params = null) {
  const p = await db.get('SELECT id, tipo, costo_base FROM productos WHERE id = ?', [productoId]);
  if (!p) return;

  let costo = p.costo_base || 0;
  if (p.tipo === 'compuesto') {
    costo = await calcularCostoCompuesto(db, productoId);
  }

  if (!params) params = await obtenerParametros(db);
  const recomendado = calcularPrecioRecomendado(costo, params.pctGastos, params.margen, params.impuesto);

  await db.run(
    'UPDATE productos SET costo_base = ?, precio_recomendado = ? WHERE id = ?',
    [costo, recomendado, productoId]
  );
}

// Recalcula un producto y todos los compuestos que lo contienen (directa o indirectamente)
async function recalcularPorIngrediente(db, ingredienteId) {
  const params = await obtenerParametros(db);
  const procesados = new Set();
  const cola = [ingredienteId];

  while (cola.length > 0) {
    const actual = cola.shift();
    if (procesados.has(actual)) continue;
    procesados.add(actual);

    await recalcularProducto(db, actual, params);

    const padres = await db.all(
      'SELECT producto_padre_id FROM recetas WHERE producto_hijo_id = ?', [actual]
    );
    for (const p of padres) cola.push(p.producto_padre_id);
  }
}

// Recalcula SOLO precio_recomendado de todos los productos (cambio de configuración)
async function recalcularTodosLosPrecios(db) {
  const params = await obtenerParametros(db);
  const productos = await db.all('SELECT id, costo_base FROM productos WHERE costo_base > 0');
  for (const p of productos) {
    const recomendado = calcularPrecioRecomendado(p.costo_base, params.pctGastos, params.margen, params.impuesto);
    await db.run('UPDATE productos SET precio_recomendado = ? WHERE id = ?', [recomendado, p.id]);
  }
}

/**
 * Desglose del monto recaudado por prioridades (00-pendientes #3, propietario).
 * Para un período [inicio, fin) (turno o mes):
 *   1. impuestos sobre las ventas
 *   2. costos base
 *   3. gastos fijos (absorbente: costos × %gastos)
 *   4. préstamos (aporte del período)
 *   5. inversiones (aporte del período)
 *   6. ganancias (limitadas al margen_recomendado sobre costo+gastos)
 *   7. excedente → inversiones
 * Incluye la comparación %gastos proyectado vs real del período.
 */
async function desglosePrioridades(db, inicio, fin) {
  const params = await obtenerParametros(db);
  const { gastoFinancieroMes } = require('../controllers/prestamoInversionController');

  // Porciento a declarar (m030): escala ventas Y compras/gastos en lo fiscal
  const configPD = await db.get('SELECT porciento_declarar FROM parametros_contables WHERE id = 1');
  const pd = (configPD?.porciento_declarar ?? 100) / 100;

  // Ventas del período
  const ventas = await db.get(`
    SELECT COALESCE(SUM(total), 0) AS recaudado,
           COALESCE(SUM(impuesto), 0) AS impuestos,
           COALESCE(SUM(subtotal), 0) AS venta_neta
    FROM ventas
    WHERE created_at >= ? AND created_at < ? AND estado = 'completada'
  `, [inicio, fin]);
  // Montos fiscales (declarados): reales × PD
  ventas.recaudado = ventas.recaudado * pd;
  ventas.impuestos = ventas.impuestos * pd;
  ventas.venta_neta = ventas.venta_neta * pd;

  // Dinero que fue al banco (tarjeta) vs efectivo en caja
  const alBanco = await db.get(`
    SELECT COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) AS tarjeta,
           COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) AS efectivo
    FROM ventas
    WHERE created_at >= ? AND created_at < ? AND estado = 'completada'
  `, [inicio, fin]);

  // Costos base del período (declarados: reales × PD)
  const costosRow = await db.get(`
    SELECT COALESCE(SUM(vd.cantidad * p.costo_base), 0) AS total
    FROM venta_detalles vd
    JOIN productos p ON vd.producto_id = p.id
    JOIN ventas v ON vd.venta_id = v.id
    WHERE v.created_at >= ? AND v.created_at < ? AND v.estado = 'completada'
  `, [inicio, fin]);

  const costosBase = costosRow.total * pd;
  const gastosFijos = costosBase * params.pctGastos;

  // Gasto financiero del período (préstamos e inversiones por separado)
  const [anioI, mesI] = [Number(inicio.slice(0, 4)), Number(inicio.slice(5, 7))];
  const [anioF, mesF] = [Number(fin.slice(0, 4)), Number(fin.slice(5, 7))];
  let prestamos = 0, inversiones = 0;
  // Sumar mes a mes dentro del rango (normalmente 1 mes)
  let a = anioI, m = mesI;
  while (a < anioF || (a === anioF && m < mesF)) {
    const porTipo = await db.all(`
      SELECT pi.tipo, COALESCE(SUM(v.aporte), 0) AS total
      FROM vencimientos v
      JOIN prestamos_inversiones pi ON v.prestamo_inversion_id = pi.id
      WHERE pi.estado = 'activo' AND v.estado IN ('pendiente', 'parcial')
        AND strftime('%Y', v.fecha_vencimiento) = ? AND strftime('%m', v.fecha_vencimiento) = ?
      GROUP BY pi.tipo
    `, [String(a), String(m).padStart(2, '0')]);
    for (const t of porTipo) {
      if (t.tipo === 'prestamo') prestamos += t.total;
      else inversiones += t.total;
    }
    m++; if (m > 12) { m = 1; a++; }
  }

  // Ganancias limitadas al margen establecido sobre (costo + gastos)
  const gananciaObjetivo = (costosBase + gastosFijos) * (params.margen / 100);

  // Excedente → inversiones
  const excedente = ventas.recaudado - ventas.impuestos - costosBase - gastosFijos - prestamos - inversiones - gananciaObjetivo;

  // Comparación %gastos proyectado vs real (real = gastos del período ÷ venta neta)
  const pctReal = ventas.venta_neta > 0
    ? ((gastosFijos + prestamos + inversiones) / ventas.venta_neta) * 100
    : 0;

  // Pago a trabajadores del período (m030): salarios pagados por banco + bonos en efectivo
  const salariosPagados = (await db.get(`
    SELECT COALESCE(SUM(salario_bruto), 0) AS total, COUNT(*) AS cantidad
    FROM nominas
    WHERE estado = 'pagada' AND fecha_pago_salario >= ? AND fecha_pago_salario < ?
  `, [inicio.slice(0, 10), fin.slice(0, 10)]));
  const bonosPagados = (await db.get(`
    SELECT COALESCE(SUM(monto), 0) AS total, COUNT(*) AS cantidad
    FROM bonos
    WHERE fecha >= ? AND fecha < ?
  `, [inicio.slice(0, 10), fin.slice(0, 10)]));

  return {
    recaudado: ventas.recaudado,
    al_banco: {
      tarjeta: alBanco.tarjeta,
      efectivo: alBanco.efectivo,
      pct_tarjeta: ventas.recaudado > 0 ? Math.round((alBanco.tarjeta / ventas.recaudado) * 10000) / 100 : 0
    },
    prioridades: [
      { orden: 1, concepto: 'Impuestos sobre las ventas', monto: ventas.impuestos },
      { orden: 2, concepto: 'Costos base', monto: costosBase },
      { orden: 3, concepto: 'Gastos fijos', monto: gastosFijos },
      { orden: 4, concepto: 'Préstamos', monto: prestamos },
      { orden: 5, concepto: 'Inversiones', monto: inversiones },
      { orden: 6, concepto: `Ganancias (máx. ${params.margen}%)`, monto: gananciaObjetivo },
      { orden: 7, concepto: 'Excedente → Inversiones', monto: Math.max(0, excedente) }
    ],
    comparacion_gastos: {
      proyectado_pct: Math.round(params.pctGastos * 10000) / 100,
      real_pct: Math.round(pctReal * 100) / 100
    },
    porciento_declarar: Math.round(pd * 10000) / 100,
    pago_trabajadores: {
      salarios: salariosPagados.total,
      salarios_cantidad: salariosPagados.cantidad,
      bonos: bonosPagados.total,
      bonos_cantidad: bonosPagados.cantidad,
      total: salariosPagados.total + bonosPagados.total
    }
  };
}

module.exports = {
  obtenerParametros,
  calcularPrecioRecomendado,
  calcularCostoCompuesto,
  recalcularProducto,
  recalcularPorIngrediente,
  recalcularTodosLosPrecios,
  desglosePrioridades
};
