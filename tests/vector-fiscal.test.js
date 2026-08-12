/**
 * Test del vector fiscal del propietario (docs/com.md) — ONAE, TCP con 1 empleado.
 *
 * Datos del vector: st=6000, at=0, ut=0, sm=3260, base_contribucion=2000
 * Ventas: Mar 30 000 · Abr 35 000 · May 37 500 · Jun 34 800 · Jul 37 241
 *
 * Se verifican los importes EXACTOS del vector para marzo (T1), junio (T2) y julio.
 * BD temporal desde migraciones. NO toca la BD real.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const TEST_DB = path.join(os.tmpdir(), `pos3_vector_fiscal_test_${process.pid}.db`);
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

  // Setup del vector: empleado con st=6000 y base_contribucion=2000
  const { getDb } = require('../src/backend/models/db');
  const db = await getDb();
  await db.run('UPDATE configuracion_contabilidad SET salario_minimo = 3260, base_contribucion_especial = 2000 WHERE id = 1');
  await db.run(
    "INSERT INTO empleados (nombre, cargo, salario_mensual, aporte_corto_plazo, utilidades, activo) VALUES ('Vendedor', 'vendedor', 6000, 0, 0, 1)"
  );

  // Turno para las ventas
  const turno = await db.run("INSERT INTO turnos (vendedor_id, monto_apertura, estado) VALUES (1, 0, 'cerrado')");

  // Ventas del vector: una venta agregada por mes (el motor usa SUM(total))
  const ventas = [
    ['2026-03-15', 30000], ['2026-04-15', 35000], ['2026-05-15', 37500],
    ['2026-06-15', 34800], ['2026-07-15', 37241]
  ];
  for (const [fecha, total] of ventas) {
    await db.run(`
      INSERT INTO ventas (turno_id, vendedor_id, subtotal, impuesto, total, metodo_pago, estado, created_at)
      VALUES (?, 1, ?, 0, ?, 'efectivo', 'completada', ?)
    `, [turno.lastID, total, total, `${fecha} 12:00:00`]);
  }
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

async function calcular(mes, anio) {
  const res = await request.post('/api/contabilidad/calcular-impuestos').set(auth()).send({ mes, anio });
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  const mapa = {};
  for (const imp of res.body.impuestos) mapa[imp.codigo] = imp.monto;
  return mapa;
}

describe('Vector fiscal del propietario (com.md)', () => {

  test('MARZO (T1): importes exactos del vector', async () => {
    const m = await calcular(3, 2026);
    expect(m['0114022']).toBeCloseTo(3000, 2);   // 10% × 30 000
    expect(m['0510122']).toBeCloseTo(1337, 2);   // (30 000 − 3 260) × 5%
    expect(m['0810132']).toBeCloseTo(750, 2);    // 12.5% × 6 000 (+1.5%×0)
    expect(m['0820232']).toBeCloseTo(300, 2);    // 5% × (6 000 + 0)
    expect(m['0520522']).toBeCloseTo(180, 2);    // 3% × 6 000
    expect(m['0610322']).toBeCloseTo(300, 2);    // T1: 5% × 6 000 × 1 mes con actividad
    expect(m['0820132']).toBeCloseTo(400, 2);    // T1: 20% × 2 000 × 1 mes
    expect(m['0730122']).toBeCloseTo(30, 2);     // puntual, primera vez
  });

  test('JUNIO (T2): importes exactos del vector', async () => {
    const m = await calcular(6, 2026);
    expect(m['0114022']).toBeCloseTo(3480, 2);   // 10% × 34 800
    expect(m['0510122']).toBeCloseTo(1577, 2);   // (34 800 − 3 260) × 5%
    expect(m['0810132']).toBeCloseTo(750, 2);
    expect(m['0820232']).toBeCloseTo(300, 2);
    expect(m['0520522']).toBeCloseTo(180, 2);
    expect(m['0610322']).toBeCloseTo(900, 2);    // T2: 5% × 6 000 × 3 meses
    expect(m['0820132']).toBeCloseTo(1200, 2);   // T2: 20% × 2 000 × 3 meses
    expect(m['0730122']).toBeUndefined();        // puntual: ya liquidado en marzo
  });

  test('JULIO: mensual sin trimestrales', async () => {
    const m = await calcular(7, 2026);
    expect(m['0114022']).toBeCloseTo(3724.10, 2);
    expect(m['0510122']).toBeCloseTo(1699.05, 2);
    expect(m['0810132']).toBeCloseTo(750, 2);
    expect(m['0820232']).toBeCloseTo(300, 2);
    expect(m['0520522']).toBeCloseTo(180, 2);
    expect(m['0610322']).toBeUndefined();        // no es fin de trimestre
    expect(m['0820132']).toBeUndefined();
  });

  test('ABRIL (no fin de trimestre): vector mensual', async () => {
    const m = await calcular(4, 2026);
    expect(m['0114022']).toBeCloseTo(3500, 2);
    expect(m['0510122']).toBeCloseTo(1587, 2);
    expect(m['0810132']).toBeCloseTo(750, 2);
    expect(m['0820232']).toBeCloseTo(300, 2);
    expect(m['0520522']).toBeCloseTo(180, 2);
  });

  test('no duplica liquidaciones al recalcular el mismo período', async () => {
    await calcular(5, 2026);
    await calcular(5, 2026);
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const n = await db.get(`
      SELECT COUNT(*) AS n FROM liquidaciones_tributos lt
      JOIN periodos_fiscales pf ON lt.periodo_fiscal_id = pf.id
      WHERE pf.anio = 2026 AND pf.mes = 5
    `);
    expect(n.n).toBe(5); // 5 mensuales de mayo (0114022, 0510122, 0810132, 0820232, 0520522)
  });
});
