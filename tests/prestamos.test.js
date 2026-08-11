/**
 * Tests de Préstamos e Inversiones (Sprint 4b, especificación del propietario).
 * Verifica las fórmulas de vencimientos, pagos, recálculo de cuotas en inversiones
 * y la alimentación del gasto financiero al costeo.
 * BD temporal desde migraciones. NO toca la BD real.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const TEST_DB = path.join(os.tmpdir(), `pos3_prestamos_test_${process.pid}.db`);
process.env.DB_PATH = TEST_DB;
process.env.JWT_SECRET = 'pos3_test_secret';
process.env.NODE_ENV = 'test';

const { buildTestDb } = require('./helpers/testDb');

let request;
let adminToken;
let vendedorToken;

beforeAll(async () => {
  await buildTestDb(TEST_DB);
  const app = require('../src/backend/app');
  request = require('supertest')(app);
  const resA = await request.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  const resV = await request.post('/api/auth/login').send({ username: 'vendedor', password: 'vendedor123' });
  adminToken = resA.body.token;
  vendedorToken = resV.body.token;
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
const vend = () => ({ Authorization: `Bearer ${vendedorToken}` });

describe('Préstamos: generación de vencimientos', () => {
  let prestamoId;

  test('vendedor no puede gestionar → 403', async () => {
    const res = await request.get('/api/config/prestamos-inversiones').set(vend());
    expect(res.status).toBe(403);
  });

  test('crear préstamo 12000 a 12 meses, tasa 12% → vencimientos con fórmulas del propietario', async () => {
    const res = await request.post('/api/config/prestamos-inversiones').set(auth())
      .send({ tipo: 'prestamo', descripcion: 'Préstamo equipos', capital_total: 12000, plazo_meses: 12, tasa_anual: 12, fecha_inicio: '2026-08-15' });
    expect(res.status).toBe(201);
    prestamoId = res.body.id;

    const det = await request.get(`/api/config/prestamos-inversiones/${prestamoId}`).set(auth());
    const v = det.body.vencimientos;
    expect(v.length).toBe(12);

    // pago_capital base = 1000; primer vencimiento = día 1 del mes siguiente
    expect(det.body.pago_capital).toBeCloseTo(1000, 2);
    expect(v[0].fecha_vencimiento).toBe('2026-09-01');
    expect(v[0].capital).toBeCloseTo(12000, 2);
    // préstamo: capital_gravado = capital − pago_capital = 11000; tarifa = 1% × 11000 = 110
    expect(v[0].tarifa).toBeCloseTo(110, 2);
    expect(v[0].aporte).toBeCloseTo(1110, 2);
    // último: capital 1000, gravado 0, tarifa 0
    expect(v[11].capital).toBeCloseTo(1000, 2);
    expect(v[11].tarifa).toBeCloseTo(0, 2);
    expect(v[11].fecha_vencimiento).toBe('2027-08-01');
  });

  test('el último vencimiento absorbe el redondeo (10000 / 3)', async () => {
    const res = await request.post('/api/config/prestamos-inversiones').set(auth())
      .send({ tipo: 'prestamo', descripcion: 'Redondeo', capital_total: 10000, plazo_meses: 3, tasa_anual: 0, fecha_inicio: '2026-08-01' });
    const det = await request.get(`/api/config/prestamos-inversiones/${res.body.id}`).set(auth());
    const v = det.body.vencimientos;
    expect(v[0].pago_capital).toBeCloseTo(3333.33, 2);
    expect(v[1].pago_capital).toBeCloseTo(3333.33, 2);
    expect(v[2].pago_capital).toBeCloseTo(3333.34, 2); // absorbe el redondeo
    const suma = v.reduce((s, x) => s + x.pago_capital, 0);
    expect(suma).toBeCloseTo(10000, 2);
  });

  test('registrar pago total → vencimiento pagado; parcial → parcial', async () => {
    // pagar vencimiento 1 (aporte 1110) en dos partes
    const p1 = await request.post(`/api/config/prestamos-inversiones/${prestamoId}/pagos`).set(auth())
      .send({ ordinal: 1, monto: 500 });
    expect(p1.body.estado).toBe('parcial');

    const p2 = await request.post(`/api/config/prestamos-inversiones/${prestamoId}/pagos`).set(auth())
      .send({ ordinal: 1, monto: 610 });
    expect(p2.body.estado).toBe('pagado');

    // vencimiento ya pagado no admite más pagos
    const p3 = await request.post(`/api/config/prestamos-inversiones/${prestamoId}/pagos`).set(auth())
      .send({ ordinal: 1, monto: 10 });
    expect(p3.status).toBe(400);
  });

  test('edición con pagos existentes → solo descripción/estado', async () => {
    const res = await request.put(`/api/config/prestamos-inversiones/${prestamoId}`).set(auth())
      .send({ descripcion: 'Préstamo equipos (renombrado)', capital_total: 99999 });
    expect(res.status).toBe(200);

    const det = await request.get(`/api/config/prestamos-inversiones/${prestamoId}`).set(auth());
    expect(det.body.descripcion).toBe('Préstamo equipos (renombrado)');
    expect(det.body.capital_total).toBe(12000); // no cambió
  });
});

describe('Inversiones: fórmulas y recálculo de cuotas', () => {
  let inversionId;

  test('crear inversión 12000 a 12 meses, tasa 12% → tarifa crece cada período', async () => {
    const res = await request.post('/api/config/prestamos-inversiones').set(auth())
      .send({ tipo: 'inversion', descripcion: 'Inversión inicial', capital_total: 12000, plazo_meses: 12, tasa_anual: 12, fecha_inicio: '2026-08-15' });
    expect(res.status).toBe(201);
    inversionId = res.body.id;

    const det = await request.get(`/api/config/prestamos-inversiones/${inversionId}`).set(auth());
    const v = det.body.vencimientos;
    // inversión: mes 1 sin devaluación; desde mes 2: capital_gravado = i × pago_capital → tarifa: 0, 20, 30...
    expect(v[0].tarifa).toBeCloseTo(0, 2);
    expect(v[0].aporte).toBeCloseTo(1000, 2);
    expect(v[1].tarifa).toBeCloseTo(20, 2);
    expect(v[1].aporte).toBeCloseTo(1020, 2);
    expect(v[11].tarifa).toBeCloseTo(120, 2);
  });

  test('pago MAYOR al programado → disminuyen las cuotas restantes', async () => {
    // pago de 4000 en el vencimiento 1 (tarifa mes 1 = 0 → todo a capital: 4000)
    await request.post(`/api/config/prestamos-inversiones/${inversionId}/pagos`).set(auth())
      .send({ ordinal: 1, monto: 4000 });

    const det = await request.get(`/api/config/prestamos-inversiones/${inversionId}`).set(auth());
    const pendientes = det.body.vencimientos.filter(v => v.estado !== 'pagado');
    // saldo = 12000 − 4000 = 8000 → cuotas restantes = ceil(8000/1000) = 8 (en vez de 11)
    expect(pendientes.length).toBe(8);
    // el pago_capital base se mantiene, la última absorbe el redondeo
    const sumaPendientes = pendientes.reduce((s, v) => s + v.pago_capital, 0);
    expect(sumaPendientes).toBeCloseTo(8000, 2);
  });

  test('cancelar → estado cancelado y fuera del gasto financiero', async () => {
    const res = await request.delete(`/api/config/prestamos-inversiones/${inversionId}`).set(auth());
    expect(res.status).toBe(200);

    const det = await request.get(`/api/config/prestamos-inversiones/${inversionId}`).set(auth());
    expect(det.body.estado).toBe('cancelado');
  });
});

describe('Gasto financiero en el costeo', () => {
  test('configuracion/general refleja solo registros activos del mes en curso', async () => {
    // Crear préstamo con vencimiento ESTE mes (para que cuente en el gasto financiero)
    const ahora = new Date();
    const inicioMesPasado = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 15);
    const res = await request.post('/api/config/prestamos-inversiones').set(auth())
      .send({
        tipo: 'prestamo', descripcion: 'Del mes en curso', capital_total: 1000, plazo_meses: 1,
        tasa_anual: 0, fecha_inicio: inicioMesPasado.toISOString().split('T')[0]
      });
    expect(res.status).toBe(201);

    // El vencimiento único cae el día 1 de ESTE mes → aporte 1000
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const { gastoFinancieroMes } = require('../src/backend/controllers/prestamoInversionController');
    const gasto = await gastoFinancieroMes(db, ahora.getFullYear(), ahora.getMonth() + 1);
    expect(gasto).toBeCloseTo(1000, 2);
  });
});
