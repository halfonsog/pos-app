/**
 * costos.js — Servicio de costeo absorbente y recálculo de precios (D3).
 *
 * Fuentes de verdad:
 *   · productos.costo_base — último costo de compra (simples) o suma de receta (compuestos)
 *   · productos.precio_recomendado — costeo absorbente con margen_recomendado de configuración
 *
 * Fórmulas (del propietario, multiplicativa — regla 2026-08-12):
 *   %gastos (fracción) = Σ gastos fijos activos ÷ ventas_proyectadas
 *   precio_neto        = costo_base × (1 + %gastos) × (1 + margen_recomendado%)
 *   precio_recomendado = precio_neto ÷ (1 − impuesto_ventas%)
 *   (el precio de venta INCLUYE el impuesto; impuesto = % del precio de venta)
 *
 * Recálculo:
 *   · recalcularPorIngrediente(db, id)  — tras compra/cambio de costo de un producto:
 *     recalcula ese producto y todos los compuestos que lo contienen (cascada hacia arriba).
 *   · recalcularTodosLosPrecios(db)     — tras cambio en configuracion_contabilidad.
 */

/**
 * Gastos fijos mensuales del negocio (regla del propietario, 2026-08-11):
 *   Σ configuracion_gastos activos + Σ salario_mensual de empleados activos.
 * Usado en el % de gastos a repercutir en los precios y en los reportes fiscales.
 */
async function obtenerGastosFijos(db) {
  const gastos = await db.get(
    'SELECT COALESCE(SUM(valor_mensual), 0) AS total FROM configuracion_gastos WHERE activo = 1'
  );
  const salarios = await db.get(
    'SELECT COALESCE(SUM(salario_mensual), 0) AS total FROM empleados WHERE activo = 1'
  );
  return {
    gastosFijos: (gastos?.total || 0) + (salarios?.total || 0),
    gastosConfigurados: gastos?.total || 0,
    salarios: salarios?.total || 0
  };
}

// Lee configuración y calcula el % de gastos fijos (fracción).
// Fórmula del propietario: %gastos = (gastos fijos + gasto financiero del mes) ÷ ventas_proyectadas
//   gastos fijos = Σ configuracion_gastos + Σ salarios de empleados activos
//   gasto financiero del mes = próximo vencimiento pendiente de préstamos/inversiones (m020)
async function obtenerParametros(db) {
  const config = await db.get('SELECT * FROM configuracion_contabilidad WHERE id = 1');
  const { gastosFijos } = await obtenerGastosFijos(db);

  // Gasto financiero del mes (préstamos e inversiones activos; próximo vencimiento pendiente)
  const { gastoFinancieroMes } = require('../controllers/prestamoInversionController');
  const gastoFinanciero = await gastoFinancieroMes(db);

  const ventasProy = config?.ventas_proyectadas || 0;
  const totalGastos = gastosFijos + gastoFinanciero;
  const pctGastos = ventasProy > 0 ? totalGastos / ventasProy : 0; // fracción

  return {
    pctGastos,
    margen: config?.margen_recomendado ?? 20,   // %
    impuesto: config?.impuesto_ventas ?? 15,    // %
    gastosFijos,                                  // + salarios (regla del propietario)
    gastoFinanciero                               // informativo (desglose)
  };
}

// Fórmula del propietario (multiplicativa, regla 2026-08-12):
//   precio_neto = costo_base × (1 + %gastos) × (1 + margen%)
//   precio_recomendado = precio_neto ÷ (1 − impuesto%)
// El precio de venta INCLUYE el impuesto, y el impuesto es el % (impuesto_ventas) del
// precio de venta. Por tanto: precio = neto ÷ (1 − impuesto)  ⇔  impuesto = precio × impuesto.
function calcularPrecioRecomendado(costoBase, pctGastos, margenPct, impuestoPct) {
  if (!costoBase || costoBase <= 0) return null;
  const precioNeto = costoBase * (1 + pctGastos) * (1 + margenPct / 100);
  const denominador = 1 - impuestoPct / 100;
  if (denominador <= 0) return null;
  return Math.round((precioNeto / denominador) * 100) / 100;
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
  const p = await db.get('SELECT id, tipo, costo_base, categoria_id FROM productos WHERE id = ?', [productoId]);
  if (!p) return;

  let costo = p.costo_base || 0;
  if (p.tipo === 'compuesto') {
    costo = await calcularCostoCompuesto(db, productoId);
  }

  if (!params) params = await obtenerParametros(db);
  const impuesto = await impuestoDeProducto(db, p.categoria_id, params);
  const recomendado = calcularPrecioRecomendado(costo, params.pctGastos, params.margen, impuesto);

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
  const productos = await db.all('SELECT id, categoria_id, costo_base FROM productos WHERE costo_base > 0');
  for (const p of productos) {
    const impuesto = await impuestoDeProducto(db, p.categoria_id, params);
    const recomendado = calcularPrecioRecomendado(p.costo_base, params.pctGastos, params.margen, impuesto);
    await db.run('UPDATE productos SET precio_recomendado = ? WHERE id = ?', [recomendado, p.id]);
  }
}

/**
 * idsNoGravables( D31/D32 ): devuelve los ids de todas las categorías NO gravables,
 * incluyendo la raíz "No gravable" (gravable=0) y TODAS sus descendientes por ancestría.
 * Un producto es gravable si su categoria_id NO está en este conjunto.
 */
async function idsNoGravables(db) {
  const rows = await db.all(`
    WITH RECURSIVE no_grav(id) AS (
      SELECT id FROM categorias WHERE gravable = 0
      UNION
      SELECT c.id FROM categorias c JOIN no_grav ng ON c.padre_id = ng.id
    )
    SELECT id FROM no_grav
  `);
  return rows.map(r => r.id);
}

// Cláusula SQL + params para filtrar líneas de producto a solo líneas GRAVABLES (D32).
// Uso: const { sql, params } = await filtroGravableLineas(db, 'p'); y concatenar sql+params
// en un query que tenga un WHERE previo.
async function filtroGravableLineas(db, aliasProducto = 'p') {
  const ids = await idsNoGravables(db);
  if (ids.length === 0) return { sql: '', params: [] };
  return {
    sql: ` AND ${aliasProducto}.categoria_id NOT IN (${ids.map(() => '?').join(',')}) `,
    params: ids
  };
}

// Impuesto a aplicar en el costeo de UN producto: los NO gravables se costean sin
// impuesto (muestran el margen real en la ficha); los gravables usan el impuesto global.
async function impuestoDeProducto(db, categoriaId, params) {
  const ids = await idsNoGravables(db);
  if (ids.length === 0) return params.impuesto;
  return ids.includes(categoriaId) ? 0 : params.impuesto;
}

/**
 * Ventas (reales u gravables) de un período [inicio, fin).
 * gravable=false → todas las ventas (mundo real, cierre de turno).
 * gravable=true  → solo la parte fiscal: por cada venta, la proporción de su subtotal
 *                  correspondiente a líneas de productos gravables (D32). El impuesto,
 *                  redondeo y recaudado se reparten en esa misma proporción, porque se
 *                  calcularon a nivel de ticket sobre el subtotal.
 */
async function obtenerVentasPeriodo(db, inicio, fin, gravable) {
  const R2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

  if (!gravable) {
    const ventas = await db.get(`
      SELECT COALESCE(SUM(total), 0) AS recaudado,
             COALESCE(SUM(impuesto), 0) AS impuestos,
             COALESCE(SUM(subtotal), 0) AS venta_neta,
             COALESCE(SUM(ajuste_redondeo), 0) AS ajuste_redondeo
      FROM ventas
      WHERE created_at >= ? AND created_at < ? AND estado = 'completada'
    `, [inicio, fin]);
    return {
      recaudado: R2(ventas.recaudado),
      impuestos: R2(ventas.impuestos),
      venta_neta: R2(ventas.venta_neta),
      ajuste_redondeo: R2(ventas.ajuste_redondeo)
    };
  }

  // Modo fiscal: repartir por proporción de línea gravable (D32)
  const f = await filtroGravableLineas(db, 'p2');
  const filas = f.sql
    ? await db.all(`
        SELECT v.subtotal, v.impuesto, v.total, v.ajuste_redondeo,
               (SELECT COALESCE(SUM(vd2.total), 0)
                FROM venta_detalles vd2
                JOIN productos p2 ON vd2.producto_id = p2.id
                WHERE vd2.venta_id = v.id ${f.sql}) AS gravable_lineal
        FROM ventas v
        WHERE v.created_at >= ? AND v.created_at < ? AND v.estado = 'completada'
      `, [...f.params, inicio, fin])
    : [];

  let recaudado = 0, impuestos = 0, ventaNeta = 0, ajuste = 0, gravableLineal = 0;
  for (const v of filas) {
    const base = v.subtotal || 0;
    const ratio = base > 0 ? Math.min(1, (v.gravable_lineal || 0) / base) : 0;
    ventaNeta += (v.subtotal || 0) * ratio;
    impuestos += (v.impuesto || 0) * ratio;
    ajuste += (v.ajuste_redondeo || 0) * ratio;
    recaudado += (v.total || 0) * ratio;
    gravableLineal += v.gravable_lineal || 0;
  }

  return {
    recaudado: R2(recaudado),
    impuestos: R2(impuestos),
    venta_neta: R2(ventaNeta),
    ajuste_redondeo: R2(ajuste),
    gravable_lineal: R2(gravableLineal)
  };
}

/**
 * Compras de un período [inicio, fin): total gravable (solo líneas de productos
 * gravables, D32) o total real (todas las líneas).
 * Retorna { total }.
 */
async function obtenerComprasPeriodo(db, inicio, fin, gravable) {
  const R2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
  const cf = gravable ? await filtroGravableLineas(db, 'p') : { sql: '', params: [] };
  const row = cf.sql
    ? await db.get(`
        SELECT COALESCE(SUM(cd.total), 0) AS total
        FROM compra_detalles cd
        JOIN productos p ON cd.producto_id = p.id
        JOIN compras c ON cd.compra_id = c.id
        WHERE c.fecha_compra >= ? AND c.fecha_compra < ? ${cf.sql}
      `, [inicio, fin, ...cf.params])
    : await db.get(`
        SELECT COALESCE(SUM(total), 0) AS total
        FROM compras
        WHERE fecha_compra >= ? AND fecha_compra < ?
      `, [inicio, fin]);
  return { total: R2(row?.total || 0) };
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
 *
 * opciones:
 *   · operativo (turno): usa el MUNDO REAL (todas las ventas, sin exclusión fiscal).
 *   · (defecto: cierre de mes / fiscal) — usa SOLO líneas gravables (D30/D32).
 */
async function desglosePrioridades(db, inicio, fin, opciones = {}) {
  const operativo = !!opciones.operativo;
  const params = await obtenerParametros(db);
  const { gastoFinancieroMes } = require('../controllers/prestamoInversionController');

  // Redondeo consistente a centavos (evita diferencias por flotantes)
  const R2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

  // Ventas del período (reales en turno; solo gravables en fiscal)
  const ventas = await obtenerVentasPeriodo(db, inicio, fin, !operativo);

  // Dinero que fue al banco (tarjeta) vs efectivo en caja — MUNDO REAL siempree
  const alBanco = await db.get(`
    SELECT COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) AS tarjeta,
           COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) AS efectivo
    FROM ventas
    WHERE created_at >= ? AND created_at < ? AND estado = 'completada'
  `, [inicio, fin]);

  // Costos base del período: solo productos gravables en fiscal (D32)
  const cf = await filtroGravableLineas(db, 'p');
  const costosRow = cf.sql
    ? await db.get(`
        SELECT COALESCE(SUM(vd.cantidad * p.costo_base), 0) AS total
        FROM venta_detalles vd
        JOIN productos p ON vd.producto_id = p.id
        JOIN ventas v ON vd.venta_id = v.id
        WHERE v.created_at >= ? AND v.created_at < ? AND v.estado = 'completada' ${cf.sql}
      `, [inicio, fin, ...cf.params])
    : { total: 0 };

  const costosBase = costosRow.total;
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

  // ── Componentes equivalentes del período (fórmula del propietario) ──
  //   % gastos total revertido en el precio =
  //     (gastos fijos [config + salarios] + gastos financieros) / ventas_proyectadas
  //   Por tanto, el componente equivalente del período es la venta neta × (%/componente).
  const configCierre = await db.get('SELECT ventas_proyectadas FROM configuracion_contabilidad WHERE id = 1');
  const ventasProy = configCierre?.ventas_proyectadas || 0;
  const factor = ventasProy > 0 ? ventas.venta_neta / ventasProy : 0;

  const financieroPorTipo = await db.all(`
    SELECT pi.tipo, COALESCE(SUM(v.aporte), 0) AS total
    FROM vencimientos v
    JOIN prestamos_inversiones pi ON v.prestamo_inversion_id = pi.id
    WHERE pi.estado = 'activo'
      AND v.estado IN ('pendiente', 'parcial')
      AND v.fecha_vencimiento = (
        SELECT MIN(v2.fecha_vencimiento) FROM vencimientos v2
        WHERE v2.prestamo_inversion_id = v.prestamo_inversion_id
          AND v2.estado IN ('pendiente', 'parcial'))
    GROUP BY pi.tipo
  `);
  const prestamosMensual = financieroPorTipo.find(t => t.tipo === 'prestamo')?.total || 0;
  const inversionesMensual = financieroPorTipo.find(t => t.tipo === 'inversion')?.total || 0;

  const gastosFijosEquiv = R2(params.gastosFijos * factor);
  const prestamosEquiv = R2(prestamosMensual * factor);
  const inversionesEquiv = R2(inversionesMensual * factor);

  // Valores redondeados a centavos que son los QUE SE MUESTRAN en el card.
  // Todo el encadenamiento margen→ganancias→excedente se calcula sobre ellos
  // para que la suma visible cuadre al céntimo (sin diferencias de flotantes)
  const rRecaudado = R2(ventas.recaudado);
  const rImpuestos = R2(ventas.impuestos);
  const rCostosBase = R2(costosBase);
  const rVentaNeta = R2(ventas.venta_neta);
  const rAjusteRedondeo = R2(ventas.ajuste_redondeo);

  // Margen (antes del reajuste del excedente): sobra tras cubrir todo lo fijo y financiero
  const margen = R2(rRecaudado - rImpuestos - rCostosBase - gastosFijosEquiv - prestamosEquiv - inversionesEquiv);

  // Ganancias limitadas al margen establecido sobre (costo + gastos) equivalentes
  const baseGanancia = rCostosBase + gastosFijosEquiv + prestamosEquiv + inversionesEquiv;
  const gananciaMax = baseGanancia * (params.margen / 100);
  const ganancias = R2(Math.min(Math.max(0, margen), R2(gananciaMax)));
  const excedenteReajustado = R2(Math.max(0, margen - ganancias));

  // Regla del propietario: el excedente cubre gastos financieros. Primero
  // inversiones, si no préstamos, y si tampoco hay préstamos → ganancias.
  let destinoExcedente = 'ganancias';
  if (inversionesEquiv > 0) destinoExcedente = 'inversiones';
  else if (prestamosEquiv > 0) destinoExcedente = 'prestamos';

  // Comparación %gastos proyectado vs real. El % real del período incluye el
  // excedente cuando este se destina a cubrir GASTOS (inversiones/préstamos);
  // si el excedente es ganancia, no suma a gastos.
  const excedenteAGasto = (destinoExcedente === 'inversiones' || destinoExcedente === 'prestamos') ? excedenteReajustado : 0;
  const pctReal = rVentaNeta > 0
    ? ((gastosFijosEquiv + prestamosEquiv + inversionesEquiv + excedenteAGasto) / rVentaNeta) * 100
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

  // Servicios del período (D35): cobros y pagos que movieron caja/banco
  // en el mundo real (nunca se excluyen por lo fiscal; son movimientos de dinero)
  const servicios = await db.all(`
    SELECT tipo, moneda, COALESCE(SUM(monto), 0) AS total
    FROM servicios
    WHERE fecha >= ? AND fecha < ?
    GROUP BY tipo, moneda
  `, [inicio.slice(0, 10), fin.slice(0, 10)]);
  const servCup = { cobros: 0, pagos: 0 };
  for (const s of servicios) {
    if (s.moneda !== 'CUP') continue;
    if (s.tipo === 'cobro') servCup.cobros += s.total;
    else servCup.pagos += s.total;
  }

  return {
    recaudado: rRecaudado,
    venta_neta: rVentaNeta,
    impuestos: rImpuestos,
    costo_base: rCostosBase,
    ajuste_redondeo: rAjusteRedondeo,
    al_banco: {
      tarjeta: R2(alBanco.tarjeta),
      efectivo: R2(alBanco.efectivo),
      pct_tarjeta: ventas.recaudado > 0 ? Math.round((alBanco.tarjeta / ventas.recaudado) * 10000) / 100 : 0
    },
    prioridades: [
      { orden: 1, concepto: 'Impuestos sobre las ventas', monto: rImpuestos },
      { orden: 2, concepto: 'Costos base', monto: rCostosBase },
      { orden: 3, concepto: 'Gastos fijos', monto: R2(gastosFijos) },
      { orden: 4, concepto: 'Préstamos', monto: R2(prestamos) },
      { orden: 5, concepto: 'Inversiones', monto: R2(inversiones) },
      { orden: 6, concepto: `Ganancias (máx. ${params.margen}%)`, monto: R2(gananciaObjetivo) },
      { orden: 7, concepto: 'Excedente → Inversiones', monto: R2(Math.max(0, excedente)) }
    ],
    comparacion_gastos: {
      proyectado_pct: Math.round(params.pctGastos * 10000) / 100,
      real_pct: Math.round(pctReal * 100) / 100
    },
    equivalentes: {
      gastos_fijos: gastosFijosEquiv,
      prestamos: prestamosEquiv,
      inversiones: inversionesEquiv,
      financieros_total: R2(prestamosEquiv + inversionesEquiv)
    },
    margen,
    ganancias,
    excedente_reajustado: excedenteReajustado,
    destino_excedente: destinoExcedente,
    servicios: {
      cobros: R2(servCup.cobros),
      pagos: R2(servCup.pagos),
      neto: R2(servCup.cobros - servCup.pagos)
    },
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
  obtenerGastosFijos,
  calcularPrecioRecomendado,
  calcularCostoCompuesto,
  recalcularProducto,
  recalcularPorIngrediente,
  recalcularTodosLosPrecios,
  desglosePrioridades,
  idsNoGravables,
  filtroGravableLineas,
  impuestoDeProducto,
  obtenerVentasPeriodo,
  obtenerComprasPeriodo
};
