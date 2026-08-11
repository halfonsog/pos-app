/**
 * Tests de Encargos minoristas (Sprint 6) + Fase 2 mayoristas (límite crédito, backorder).
 * BD temporal desde migraciones. NO toca la BD real.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const TEST_DB = path.join(os.tmpdir(), `pos3_encargos_test_${process.pid}.db`);
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

let prodId, clienteLimitadoId;

async function setupProducto() {
  const r = await request.post('/api/productos').set(auth())
    .field('codigo', 'ENC1').field('nombre', 'Producto Encargo').field('tipo', 'simple')
    .field('sub_tipo', 'reventa').field('unidad_venta_id', '1');
  prodId = r.body.id;
  const { getDb } = require('../src/backend/models/db');
  const db = await getDb();
  await db.run('UPDATE productos SET stock_actual = 10, precio_venta = 100 WHERE id = ?', [prodId]);
}

describe('Fase 2 mayoristas', () => {
  test('límite de crédito bloquea cuando se supera', async () => {
    await setupProducto();
    const c = await request.post('/api/clientes').set(auth())
      .send({ nombre: 'Cliente Limitado', limite_credito: 500 });
    clienteLimitadoId = c.body.id;

    // stock mayorista para facturar después
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    await db.run('UPDATE productos SET stock_mayorista = 100 WHERE id = ?', [prodId]);

    // pedido de 8 × 100 = 800 > 500 límite → 400
    const res = await request.post('/api/mayoristas/pedidos').set(auth())
      .send({ cliente_id: clienteLimitadoId, detalles: [{ producto_id: prodId, cantidad: 8 }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/crédito/i);

    // uno de 4 × 100 = 400 ≤ 500 → OK
    const ok = await request.post('/api/mayoristas/pedidos').set(auth())
      .send({ cliente_id: clienteLimitadoId, detalles: [{ producto_id: prodId, cantidad: 4 }] });
    expect(ok.status).toBe(201);
  });

  test('backorder: facturar con stock mayorista insuficiente queda en negativo con alerta', async () => {
    // pedido de 4 (stock mayorista actual = 100... tras el anterior? no se facturó → sigue 100)
    // forzamos stock mayorista bajo
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    await db.run('UPDATE productos SET stock_mayorista = 1 WHERE id = ?', [prodId]);

    const ped = await request.post('/api/mayoristas/pedidos').set(auth())
      .send({ cliente_id: clienteLimitadoId, detalles: [{ producto_id: prodId, cantidad: 1 }] });
    // ojo: con límite 500 y deuda 400 → solo cabe 100 → cantidad 1 × 100 = 100 OK

    const fac = await request.post(`/api/mayoristas/pedidos/${ped.body.id}/facturar`).set(auth());
    expect(fac.status).toBe(200);

    // ahora crear otro pedido que excede el stock (backorder) — quitar límite para probar
    await request.put(`/api/clientes/${clienteLimitadoId}`).set(auth()).send({ limite_credito: 0 });
    const ped2 = await request.post('/api/mayoristas/pedidos').set(auth())
      .send({ cliente_id: clienteLimitadoId, detalles: [{ producto_id: prodId, cantidad: 5 }] });
    const fac2 = await request.post(`/api/mayoristas/pedidos/${ped2.body.id}/facturar`).set(auth());
    expect(fac2.status).toBe(200);
    expect(fac2.body.alerta_backorder).toBeTruthy();

    const prod = await db.get('SELECT stock_mayorista FROM productos WHERE id = ?', [prodId]);
    expect(prod.stock_mayorista).toBeLessThan(0); // negativo = backorder
  });
});

describe('Encargos minoristas (Sprint 6)', () => {
  let encargoId;

  test('crear encargo minorista (sin cliente registrado, precio minorista)', async () => {
    const res = await request.post('/api/mayoristas/pedidos').set(auth())
      .send({ tipo: 'minorista', cliente_nombre: 'María del Carmen', detalles: [{ producto_id: prodId, cantidad: 2 }] });
    expect(res.status).toBe(201);
    encargoId = res.body.id;

    const det = await request.get(`/api/mayoristas/pedidos/${encargoId}`).set(auth());
    expect(det.body.tipo).toBe('minorista');
    expect(det.body.cliente_nombre).toBe('María del Carmen');
    expect(det.body.total).toBeCloseTo(200, 2); // 2 × 100 precio minorista
  });

  test('encargo sin nombre de cliente → 400', async () => {
    const res = await request.post('/api/mayoristas/pedidos').set(auth())
      .send({ tipo: 'minorista', detalles: [{ producto_id: prodId, cantidad: 1 }] });
    expect(res.status).toBe(400);
  });

  test('encargos no aparecen en pedidos mayoristas ni en sus cuentas por cobrar', async () => {
    const lista = await request.get('/api/mayoristas/pedidos?tipo=mayorista').set(auth());
    expect(lista.body.find(p => p.id === encargoId)).toBeUndefined();
  });

  test('entregar encargo: crea venta minorista en el turno abierto y descuenta stock minorista', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();

    // abrir turno para que cuente en el arqueo
    const turno = await db.run("INSERT INTO turnos (vendedor_id, monto_apertura, estado) VALUES (1, 0, 'abierto')");

    const res = await request.post(`/api/mayoristas/pedidos/${encargoId}/entregar`).set(auth())
      .send({ metodo_pago: 'efectivo' });
    expect(res.status).toBe(200);

    const pedido = await db.get('SELECT * FROM pedidos WHERE id = ?', [encargoId]);
    expect(pedido.estado).toBe('entregado');
    expect(pedido.estado_pago).toBe('pagado');

    const venta = await db.get('SELECT * FROM ventas WHERE id = ?', [pedido.venta_id]);
    expect(venta.tipo_venta).toBe('minorista');
    expect(venta.turno_id).toBe(turno.lastID);
    expect(venta.metodo_pago).toBe('efectivo');

    const prod = await db.get('SELECT stock_actual FROM productos WHERE id = ?', [prodId]);
    expect(prod.stock_actual).toBe(8); // 10 − 2
  });

  test('entregar encargo ya entregado → 400', async () => {
    const res = await request.post(`/api/mayoristas/pedidos/${encargoId}/entregar`).set(auth())
      .send({ metodo_pago: 'efectivo' });
    expect(res.status).toBe(400);
  });
});
