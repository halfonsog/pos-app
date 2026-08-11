/**
 * Tests del Banco (m022): saldo = ventas tarjeta + depósitos − retiros − transferencias − impuestos.
 * BD temporal desde migraciones. NO toca la BD real.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const TEST_DB = path.join(os.tmpdir(), `pos3_banco_test_${process.pid}.db`);
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

async function saldo() {
  const res = await request.get('/api/contabilidad/banco').set(auth());
  expect(res.status).toBe(200);
  return res.body.data.saldo;
}

describe('Banco', () => {
  test('vendedor no tiene acceso → 403', async () => {
    const res = await request.get('/api/contabilidad/banco').set({ Authorization: `Bearer ${vendedorToken}` });
    expect(res.status).toBe(403);
  });

  test('saldo inicial 0; depósito suma; retiro resta', async () => {
    expect(await saldo()).toBe(0);

    await request.post('/api/contabilidad/banco/movimiento').set(auth())
      .send({ tipo: 'deposito', monto: 1000, descripcion: 'Depósito inicial' });
    expect(await saldo()).toBe(1000);

    await request.post('/api/contabilidad/banco/movimiento').set(auth())
      .send({ tipo: 'retiro', monto: 250, descripcion: 'Retiro para cambio' });
    expect(await saldo()).toBe(750);
  });

  test('venta por tarjeta suma al banco; por efectivo no', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const turno = await db.run("INSERT INTO turnos (vendedor_id, monto_apertura, estado) VALUES (1, 0, 'cerrado')");
    await db.run(`INSERT INTO ventas (turno_id, vendedor_id, subtotal, impuesto, total, metodo_pago, estado)
                  VALUES (?, 1, 400, 0, 400, 'tarjeta', 'completada')`, [turno.lastID]);
    await db.run(`INSERT INTO ventas (turno_id, vendedor_id, subtotal, impuesto, total, metodo_pago, estado)
                  VALUES (?, 1, 300, 0, 300, 'efectivo', 'completada')`, [turno.lastID]);

    expect(await saldo()).toBe(1150); // 750 + 400 (solo la de tarjeta)
  });

  test('pago de impuesto por banco resta del saldo', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();

    // Crear período + liquidación pendiente directamente
    const per = await db.run(`INSERT INTO periodos_fiscales (tipo_periodo, anio, mes, fecha_inicio, fecha_fin) VALUES ('mensual', 2026, 8, '2026-08-01', '2026-09-01')`);
    const tributo = await db.get("SELECT id FROM tributos WHERE codigo = '0114022'");
    const liq = await db.run(`INSERT INTO liquidaciones_tributos (tributo_id, periodo_fiscal_id, base_calculo, monto_calculado, estado) VALUES (?, ?, 1000, 100, 'pendiente')`, [tributo.id, per.lastID]);

    const res = await request.post('/api/contabilidad/registrar-pago').set(auth())
      .send({ liquidacion_id: liq.lastID, monto_pagado: 100, comprobante: 'TRX-001' });
    expect(res.status).toBe(200);

    expect(await saldo()).toBe(1050); // 1150 − 100

    const mov = await db.get("SELECT * FROM movimientos_bancarios WHERE tipo = 'pago_impuesto'");
    expect(mov.monto).toBe(100);
    expect(mov.referencia).toBe('TRX-001');
  });

  test('pago de compra por transferencia resta del saldo', async () => {
    const prov = await request.post('/api/proveedores').set(auth()).send({ nombre: 'Prov Banco' });
    const compra = await request.post('/api/compras').set(auth()).send({
      fecha_compra: '2026-08-06',
      proveedor_id: prov.body.id,
      detalles: []
    });
    // ajustar total a mano para la prueba
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    await db.run('UPDATE compras SET total = 500 WHERE id = ?', [compra.body.id]);

    const res = await request.post(`/api/compras/${compra.body.id}/pagar`).set(auth())
      .send({ monto: 500, metodo_pago: 'transferencia', referencia: 'TRF-99' });
    expect(res.status).toBe(200);

    expect(await saldo()).toBe(550); // 1050 − 500
  });

  test('sobrepago es rechazado (B13)', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const compra = await db.get('SELECT id, total, pagado FROM compras ORDER BY id DESC LIMIT 1');
    const res = await request.post(`/api/compras/${compra.id}/pagar`).set(auth())
      .send({ monto: 1, metodo_pago: 'efectivo' }); // ya está pagada del todo
    expect(res.status).toBe(400);
  });
});
