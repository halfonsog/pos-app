/**
 * Tests de la nueva Contabilidad (m030): Porciento a declarar, nóminas, bonos, libro diario.
 * BD temporal desde migraciones. NO toca la BD real.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const TEST_DB = path.join(os.tmpdir(), `pos3_contab_test_${process.pid}.db`);
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

  // Setup: empleado con salario, ventas gravables del mes
  const { getDb } = require('../src/backend/models/db');
  const db = await getDb();
  await db.run('UPDATE configuracion_contabilidad SET salario_minimo = 3260 WHERE id = 1');
  await db.run("UPDATE empleados SET salario_mensual = 6000 WHERE id = 1");
  const turno = await db.run("INSERT INTO turnos (vendedor_id, monto_apertura, estado) VALUES (1, 0, 'cerrado')");

  // Producto gravable (D32: solo cuentan líneas gravables)
  await db.run("INSERT INTO categorias (nombre, activo, gravable, es_sistema) VALUES ('Ventas', 1, 1, 0)");
  await db.run(`
    INSERT INTO productos (codigo, nombre, tipo, sub_tipo, categoria_id, unidad_venta_id, costo_base, precio_venta, stock_actual, activo)
    VALUES ('CNV-1', 'Producto contabilidad', 'simple', 'reventa', (SELECT MAX(id) FROM categorias), 1, 100, 100, 99999, 1)
  `);
  const prod = await db.get("SELECT id FROM productos WHERE codigo = 'CNV-1'");

  const r = await db.run(`INSERT INTO ventas (turno_id, vendedor_id, subtotal, impuesto, total, metodo_pago, estado, created_at)
                VALUES (?, 1, 40000, 0, 40000, 'efectivo', 'completada', datetime('now'))`, [turno.lastID]);
  await db.run(`
    INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, total)
    VALUES (?, ?, 1, 40000, 40000)
  `, [r.lastID, prod.id]);
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

describe('Vector fiscal (mundo declarado = solo gravables)', () => {
  test('el vector fiscal se calcula sobre las ventas gravables', async () => {
    const ahora = new Date();
    const res = await request.post('/api/contabilidad/calcular-impuestos').set(auth())
      .send({ mes: ahora.getMonth() + 1, anio: ahora.getFullYear() });
    expect(res.status).toBe(200);
    expect(res.body.total_ventas).toBeCloseTo(40000, 2); // 100% gravable

    const mapa = {};
    for (const imp of res.body.impuestos) mapa[imp.codigo] = imp.monto;
    expect(mapa['0114022']).toBeCloseTo(4000, 2);  // 10% × 40000
    expect(mapa['0510122']).toBeCloseTo(1837, 2);   // (40000 − 3260) × 5%
  });

  test('libro diario muestra las ventas gravables del período', async () => {
    const ahora = new Date();
    const res = await request.get(`/api/contabilidad/libro-diario?mes=${ahora.getMonth() + 1}&anio=${ahora.getFullYear()}`).set(auth());
    expect(res.status).toBe(200);
    const hoy = res.body.data[0];
    expect(hoy.ventas_gravables).toBeCloseTo(40000, 2);
  });
});

describe('Nóminas y bonos', () => {
  test('generar nóminas del mes (sin duplicar)', async () => {
    const ahora = new Date();
    const res = await request.post('/api/contabilidad/nominas/generar').set(auth())
      .send({ mes: ahora.getMonth() + 1, anio: ahora.getFullYear() });
    expect(res.status).toBe(201);
    expect(res.body.creadas).toBeGreaterThan(0);

    // de nuevo → no duplica
    const res2 = await request.post('/api/contabilidad/nominas/generar').set(auth())
      .send({ mes: ahora.getMonth() + 1, anio: ahora.getFullYear() });
    expect(res2.body.creadas).toBe(0);

    const lista = await request.get(`/api/contabilidad/nominas?mes=${ahora.getMonth() + 1}&anio=${ahora.getFullYear()}`).set(auth());
    expect(lista.body.length).toBeGreaterThan(0);
    expect(lista.body[0].salario_bruto).toBe(6000);
  });

  test('pagar salario por banco', async () => {
    const ahora = new Date();
    const lista = await request.get(`/api/contabilidad/nominas?mes=${ahora.getMonth() + 1}&anio=${ahora.getFullYear()}`).set(auth());
    const nomina = lista.body[0];

    const res = await request.post(`/api/contabilidad/nominas/${nomina.id}/pagar-salario`).set(auth());
    expect(res.status).toBe(200);

    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const mov = await db.get("SELECT * FROM movimientos_bancarios WHERE referencia = ?", [`nomina:${nomina.id}`]);
    expect(mov.monto).toBe(-6000);
    expect(mov.cuenta).toBe('banco');

    // no se puede pagar dos veces
    const res2 = await request.post(`/api/contabilidad/nominas/${nomina.id}/pagar-salario`).set(auth());
    expect(res2.status).toBe(400);
  });

  test('ayuda de bonos por empleado y pago en efectivo', async () => {
    const ayuda = await request.get('/api/contabilidad/bonos/ayuda').set(auth());
    expect(ayuda.status).toBe(200);
    expect(ayuda.body.empleados.length).toBeGreaterThan(0);
    const emp = ayuda.body.empleados[0];
    expect(emp.salario_mensual).toBe(6000);
    expect(emp.total_a_recibir_mes).toBe(6000);

    const pago = await request.post('/api/contabilidad/bonos').set(auth())
      .send({ empleado_id: emp.empleado_id, monto: 500 });
    expect(pago.status).toBe(201);

    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const mov = await db.get("SELECT * FROM movimientos_bancarios WHERE tipo = 'pago_servicio' AND cuenta = 'efectivo' ORDER BY id DESC LIMIT 1");
    expect(mov.monto).toBe(-500);

    // el bono NO entra en la base salarial del vector fiscal (no se declara como salario)
    const ayuda2 = await request.get('/api/contabilidad/bonos/ayuda').set(auth());
    expect(ayuda2.body.empleados[0].bonos_pagados_mes).toBe(500);
    expect(ayuda2.body.empleados[0].total_a_recibir_mes).toBe(6500);
  });
});
