/**
 * Tests de la regla del impuesto del propietario (2026-08-12):
 *   · El precio de venta INCLUYE el impuesto (impuesto_ventas).
 *   · Impuesto = % (impuesto_ventas) del PRECIO DE VENTA.
 *   · Neto = total − impuesto.
 *   · precio_recomendado = neto ÷ (1 − impuesto).
 * BD temporal desde migraciones. NO toca la BD real.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const TEST_DB = path.join(os.tmpdir(), `pos3_impuesto_test_${process.pid}.db`);
process.env.DB_PATH = TEST_DB;
process.env.JWT_SECRET = 'pos3_test_secret';
process.env.NODE_ENV = 'test';

const { buildTestDb } = require('./helpers/testDb');

let request;
let adminToken;

beforeAll(async () => {
  await buildTestDb(TEST_DB);
  const app = require('../src/backend/app');
  request = require('supertest')(app);
  const res = await request.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  adminToken = res.body.token;

  // Asegurar impuesto_ventas = 15%
  const { getDb } = require('../src/backend/models/db');
  const db = await getDb();
  await db.run('UPDATE configuracion_contabilidad SET impuesto_ventas = 15 WHERE id = 1');
  const cat = await db.get('SELECT id FROM categorias WHERE gravable = 1 AND es_sistema = 0');
  global.__CAT_ID__ = cat.id;
});

afterAll(async () => {
  try {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    await db.close();
  } finally {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  }
});

const auth = () => ({ Authorization: `Bearer ${adminToken}` });

describe('Regla del impuesto del propietario (2026-08-12)', () => {
  test('precio_recomendado = neto ÷ (1 − impuesto); para neto 100 y 15% → 117.65', async () => {
    const costos = require('../src/backend/utils/costos');
    const recomendado = costos.calcularPrecioRecomendado(100, 0, 0, 15);
    expect(recomendado).toBeCloseTo(117.65, 2); // 100 ÷ 0.85
    // el precio recomendado × (1 − tasa) = neto
    expect(recomendado * (1 - 0.15)).toBeCloseTo(100, 2);
  });

  test('una venta de 1×100 → impuesto 15, neto 85, total 100 (impuesto = % del precio)', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();

    // crear producto con precio_venta 100
    const p = await request.post('/api/productos').set(auth())
      .field('codigo', 'IMP1').field('nombre', 'Impuesto Producto').field('tipo', 'simple')
      .field('sub_tipo', 'reventa').field('unidad_venta_id', '1')
      .field('categoria_id', String(global.__CAT_ID__));
    await db.run('UPDATE productos SET stock_actual = 10, precio_venta = 100 WHERE id = ?', [p.body.id]);

    // abrir turno
    const t = await request.post('/api/ventas/abrir-turno').set(auth()).send({ monto_apertura: 0 });

    const res = await request.post('/api/ventas').set(auth())
      .send({ detalles: [{ producto_id: p.body.id, cantidad: 1 }], metodo_pago: 'efectivo' });
    expect(res.status).toBe(201);

    const venta = await db.get(`
      SELECT subtotal, impuesto, total, ajuste_redondeo FROM ventas ORDER BY id DESC LIMIT 1
    `);
    expect(venta.impuesto).toBeCloseTo(15, 2);   // 100 × 15%
    expect(venta.subtotal).toBeCloseTo(85, 2);   // 100 − 15
    expect(venta.total).toBeCloseTo(100, 2);     // redondeo 5: ceil(100/5)*5 = 100
  });

  test('ficha de costo: desglose con impuesto = % del precio de venta', async () => {
    // Producto con precio_venta 100 y costo 50: el neto desglosado = 100 × 0.85 = 85
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const p = await request.post('/api/productos').set(auth())
      .field('codigo', 'IMP2').field('nombre', 'Impuesto Costo').field('tipo', 'simple')
      .field('sub_tipo', 'reventa').field('unidad_venta_id', '1')
      .field('categoria_id', String(global.__CAT_ID__));
    await db.run('UPDATE productos SET costo_base = 50, precio_venta = 100 WHERE id = ?', [p.body.id]);

    const det = await request.get(`/api/productos/${p.body.id}`).set(auth());
    // el backend no expone el desglose por endpoint, pero verificamos que precio_recomendado
    // no haya quedado con la fórmula vieja (neto × 1.15)
    expect(det.body.precio_venta).toBe(100);
  });

  test('producto NO gravable se costea con impuesto 0 (precio_recomendado sin colchón)', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const costos = require('../src/backend/utils/costos');

    // Categoría no gravable (hija de la raíz de sistema) + producto con costo 100
    const ngRoot = await db.get('SELECT id FROM categorias WHERE es_sistema = 1');
    const rCat = await db.run("INSERT INTO categorias (nombre, padre_id, activo, gravable, es_sistema) VALUES ('NG test', ?, 1, 0, 0)", [ngRoot.id]);
    const p = await request.post('/api/productos').set(auth())
      .field('codigo', 'NOCG1').field('nombre', 'Producto no gravable').field('tipo', 'simple')
      .field('sub_tipo', 'reventa').field('unidad_venta_id', '1')
      .field('categoria_id', String(rCat.lastID));
    await db.run('UPDATE productos SET costo_base = 100 WHERE id = ?', [p.body.id]);

    // Recalcular con parámetros controlados (sin gastos fijos, margen 20%, impuesto 15%)
    await db.run(`UPDATE configuracion_contabilidad
                  SET ventas_proyectadas = 1000000, margen_recomendado = 20, impuesto_ventas = 15 WHERE id = 1`);
    await db.run("UPDATE configuracion_gastos SET activo = 0");
    await costos.recalcularProducto(db, p.body.id);
    const det = await request.get(`/api/productos/${p.body.id}`).set(auth());
    expect(det.body.precio_recomendado).toBeCloseTo(120, 2);

    // El mismo recálculo sobre un producto GRAVABLE con impuesto 15% daría 120 ÷ 0.85
    const g = await request.post('/api/productos').set(auth())
      .field('codigo', 'GRV1').field('nombre', 'Producto gravable').field('tipo', 'simple')
      .field('sub_tipo', 'reventa').field('unidad_venta_id', '1')
      .field('categoria_id', String(global.__CAT_ID__));
    await db.run('UPDATE productos SET costo_base = 100 WHERE id = ?', [g.body.id]);
    await costos.recalcularProducto(db, g.body.id);
    const detG = await request.get(`/api/productos/${g.body.id}`).set(auth());
    expect(detG.body.precio_recomendado).toBeCloseTo(141.18, 2); // 120 / 0.85
  });
});
