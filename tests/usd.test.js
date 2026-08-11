/**
 * Tests de soporte USD (m025-m027) y facturación parcial (m028).
 * BD temporal desde migraciones. NO toca la BD real.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const TEST_DB = path.join(os.tmpdir(), `pos3_usd_test_${process.pid}.db`);
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

let prodId, clienteId, pedidoId;

async function setup() {
  const p = await request.post('/api/productos').set(auth())
    .field('codigo', 'USD1').field('nombre', 'Caja Ron').field('tipo', 'simple')
    .field('sub_tipo', 'reventa').field('unidad_venta_id', '1');
  prodId = p.body.id;
  const { getDb } = require('../src/backend/models/db');
  const db = await getDb();
  await db.run('UPDATE productos SET stock_mayorista = 100, precio_venta = 50 WHERE id = ?', [prodId]);

  const c = await request.post('/api/clientes').set(auth()).send({ nombre: 'Cliente USD' });
  clienteId = c.body.id;
}

describe('Soporte USD', () => {
  test('cobro en USD requiere tasa; se salda en CUP equivalente', async () => {
    await setup();
    const ped = await request.post('/api/mayoristas/pedidos').set(auth())
      .send({ cliente_id: clienteId, detalles: [{ producto_id: prodId, cantidad: 4 }] }); // total 200 CUP
    pedidoId = ped.body.id;
    await request.post(`/api/mayoristas/pedidos/${pedidoId}/facturar`).set(auth());

    // USD sin tasa → 400
    const sinTasa = await request.post(`/api/mayoristas/pedidos/${pedidoId}/pagos`).set(auth())
      .send({ monto: 10, metodo_pago: 'transferencia', moneda: 'USD' });
    expect(sinTasa.status).toBe(400);

    // 2 USD a tasa 100 = 200 CUP → pagado completo
    const ok = await request.post(`/api/mayoristas/pedidos/${pedidoId}/pagos`).set(auth())
      .send({ monto: 2, metodo_pago: 'transferencia', moneda: 'USD', tasa_cambio: 100 });
    expect(ok.status).toBe(200);
    expect(ok.body.estado_pago).toBe('pagado');

    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    // El cobro USD queda en pagos_pedido (los saldos se calculan desde ahí)
    const pago = await db.get("SELECT * FROM pagos_pedido WHERE moneda = 'USD'");
    expect(pago.monto).toBe(2);
    expect(pago.tasa_cambio).toBe(100);
    expect(pago.metodo_pago).toBe('transferencia');
  });

  test('saldos por moneda + equivalente total con última tasa', async () => {
    const banco = await request.get('/api/contabilidad/banco').set(auth());
    const d = banco.body.data;
    expect(d.saldos.USD.banco).toBe(2);          // los 2 USD del cobro
    expect(d.ultima_tasa_usd).toBe(100);         // última tasa usada
    expect(d.total_equivalente_cup).toBeCloseTo(200, 2); // 2 USD × 100
  });

  test('cambio de divisas: USD → CUP mueve los saldos', async () => {
    const res = await request.post('/api/contabilidad/cambio-divisas').set(auth())
      .send({ de: 'USD', monto: 1, tasa: 120, cuenta: 'banco' });
    expect(res.status).toBe(201);

    const banco = await request.get('/api/contabilidad/banco').set(auth());
    const d = banco.body.data;
    expect(d.saldos.USD.banco).toBeCloseTo(1, 2);   // 2 − 1
    expect(d.saldos.CUP.banco).toBeCloseTo(120, 2); // +120 CUP
    expect(d.ultima_tasa_usd).toBe(120);
    expect(d.total_equivalente_cup).toBeCloseTo(240, 2); // 120 + 1×120
  });
});

describe('Facturación parcial (m028)', () => {
  let pedidoParcialId;

  test('facturar solo una parte del pedido → estado parcial y restante visible', async () => {
    // stock para el producto
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    await db.run('UPDATE productos SET stock_mayorista = 100 WHERE id = ?', [prodId]);

    const ped = await request.post('/api/mayoristas/pedidos').set(auth())
      .send({ cliente_id: clienteId, detalles: [{ producto_id: prodId, cantidad: 10 }] }); // 10 × 50 = 500
    pedidoParcialId = ped.body.id;

    const detalle = await db.get('SELECT id FROM pedido_detalles WHERE pedido_id = ?', [pedidoParcialId]);

    // facturar solo 4
    const res = await request.post(`/api/mayoristas/pedidos/${pedidoParcialId}/facturar`).set(auth())
      .send({ lineas: [{ detalle_id: detalle.id, cantidad: 4 }] });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('parcial');
    expect(res.body.restante).toBeCloseTo(6, 2);

    // la venta es solo por lo facturado
    const venta = await db.get('SELECT * FROM ventas WHERE id = ?', [res.body.venta_id]);
    expect(venta.total).toBeCloseTo(200, 2); // 4 × 50

    const prod = await db.get('SELECT stock_mayorista FROM productos WHERE id = ?', [prodId]);
    expect(prod.stock_mayorista).toBeCloseTo(96, 2); // 100 − 4
  });

  test('facturar el resto → estado facturado', async () => {
    const res = await request.post(`/api/mayoristas/pedidos/${pedidoParcialId}/facturar`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('facturado');
  });

  test('facturar de nuevo cuando ya está completo → 400', async () => {
    const res = await request.post(`/api/mayoristas/pedidos/${pedidoParcialId}/facturar`).set(auth());
    expect(res.status).toBe(400);
  });

  test('cancelar pedido parcial: lo facturado queda intacto', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();

    const ped = await request.post('/api/mayoristas/pedidos').set(auth())
      .send({ cliente_id: clienteId, detalles: [{ producto_id: prodId, cantidad: 10 }] });
    const pid = ped.body.id;
    const detalle = await db.get('SELECT id FROM pedido_detalles WHERE pedido_id = ?', [pid]);
    const fac = await request.post(`/api/mayoristas/pedidos/${pid}/facturar`).set(auth())
      .send({ lineas: [{ detalle_id: detalle.id, cantidad: 3 }] });
    const ventaId = fac.body.venta_id;

    const cancel = await request.post(`/api/mayoristas/pedidos/${pid}/cancelar`).set(auth());
    expect(cancel.status).toBe(200);

    // la venta facturada queda completada (NO anulada)
    const venta = await db.get('SELECT estado FROM ventas WHERE id = ?', [ventaId]);
    expect(venta.estado).toBe('completada');

    // el stock facturado NO se devuelve (96 − 6 (resto) − 3 (este pedido) = 87)
    const prod = await db.get('SELECT stock_mayorista FROM productos WHERE id = ?', [prodId]);
    expect(prod.stock_mayorista).toBeCloseTo(87, 2);
  });
});
