/**
 * Tests de Servicios (m029), tipo_venta por vendedor (m029) y exportación CSV.
 * BD temporal desde migraciones. NO toca la BD real.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const TEST_DB = path.join(os.tmpdir(), `pos3_servicios_test_${process.pid}.db`);
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

describe('Servicios (pagos/cobros por servicios)', () => {
  test('pago de servicio en banco resta del saldo; cobro suma', async () => {
    const pago = await request.post('/api/servicios').set(auth())
      .send({ descripcion: 'Flete camión', tipo: 'pago', monto: 500, cuenta: 'banco' });
    expect(pago.status).toBe(201);

    const cobro = await request.post('/api/servicios').set(auth())
      .send({ descripcion: 'Servicio prestado', tipo: 'cobro', monto: 200, cuenta: 'banco' });
    expect(cobro.status).toBe(201);

    const banco = await request.get('/api/contabilidad/banco').set(auth());
    expect(banco.body.data.saldos.CUP.banco).toBeCloseTo(-300, 2); // 200 − 500
  });

  test('servicio en USD requiere tasa', async () => {
    const res = await request.post('/api/servicios').set(auth())
      .send({ descripcion: 'Estiba', tipo: 'pago', monto: 10, cuenta: 'efectivo', moneda: 'USD' });
    expect(res.status).toBe(400);
  });

  test('servicio con vínculo a compra aparece en el listado', async () => {
    const prov = await request.post('/api/proveedores').set(auth()).send({ nombre: 'Prov S' });
    const compra = await request.post('/api/compras').set(auth())
      .send({ fecha_compra: '2026-08-07', proveedor_id: prov.body.id, detalles: [] });

    const res = await request.post('/api/servicios').set(auth())
      .send({ descripcion: 'Descarga mercancía', tipo: 'pago', monto: 50, cuenta: 'efectivo', compra_id: compra.body.id });
    expect(res.status).toBe(201);

    const lista = await request.get('/api/servicios').set(auth());
    const s = lista.body.find(x => x.descripcion === 'Descarga mercancía');
    expect(s).toBeTruthy();
    expect(s.compra_id).toBe(compra.body.id);
  });
});

describe('Tipo de venta por vendedor (m029)', () => {
  test('vendedor minorista no puede crear pedido mayorista → 403', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();

    // crear vendedor solo-minorista
    const emp = await db.get("SELECT id FROM empleados LIMIT 1");
    await request.post('/api/usuarios').set(auth())
      .send({ username: 'vend_min', password: '1234', nombre_completo: 'Vendedor Minorista', rol: 'vendedor', empleado_id: emp.id, tipo_venta: 'minorista' });

    const login = await request.post('/api/auth/login').send({ username: 'vend_min', password: '1234' });
    const tokenMin = login.body.token;

    const cli = await request.post('/api/clientes').set(auth()).send({ nombre: 'Cliente X' });
    const res = await request.post('/api/mayoristas/pedidos')
      .set({ Authorization: `Bearer ${tokenMin}` })
      .send({ cliente_id: cli.body.id, detalles: [{ producto_id: 1, cantidad: 1 }] });
    expect(res.status).toBe(403);
  });

  test('crear usuario con tipo_venta inválido → 400', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const emp = await db.get("SELECT id FROM empleados LIMIT 1");
    const res = await request.post('/api/usuarios').set(auth())
      .send({ username: 'x', password: '1234', nombre_completo: 'X', rol: 'vendedor', empleado_id: emp.id, tipo_venta: 'todo' });
    expect(res.status).toBe(400);
  });
});

describe('Exportar liquidaciones a CSV', () => {
  test('exportar devuelve CSV con cabecera y descarga', async () => {
    const res = await request.get('/api/contabilidad/exportar?mes=8&anio=2026').set(auth());
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/liquidaciones_2026-08\.csv/);
    expect(res.text).toContain('codigo_tributo;tributo;anio');
  });
});
