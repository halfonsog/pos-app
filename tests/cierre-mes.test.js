/**
 * Tests del Cierre de mes (00-pendientes #2): ficha persistida + aplicación del
 * excedente a vencimientos (inversiones primero con más vencimientos; préstamos
 * preservando las tarifas originales).
 * BD temporal desde migraciones. NO toca la BD real.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const TEST_DB = path.join(os.tmpdir(), `pos3_cierre_mes_test_${process.pid}.db`);
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

async function sembrarVentaGravable(monto, fecha) {
  const { getDb } = require('../src/backend/models/db');
  const db = await getDb();
  let catId = (await db.get("SELECT id FROM categorias WHERE gravable = 1 AND padre_id IS NULL"))?.id;
  if (!catId) {
    const r = await db.run("INSERT INTO categorias (nombre, activo, gravable, es_sistema) VALUES ('Ventas', 1, 1, 0)");
    catId = r.lastID;
  }
  const prod = await db.run(`
    INSERT INTO productos (codigo, nombre, tipo, sub_tipo, categoria_id, unidad_venta_id, costo_base, precio_venta, stock_actual, activo)
    VALUES (?, 'Producto', 'simple', 'reventa', ?, 1, 10, 10, 99999, 1)
  `, [`P${Date.now()}${Math.random()}`, catId]);
  const turno = await db.run("INSERT INTO turnos (vendedor_id, monto_apertura, estado) VALUES (1, 0, 'cerrado')");
  const v = await db.run(`
    INSERT INTO ventas (turno_id, vendedor_id, subtotal, impuesto, total, metodo_pago, estado, created_at)
    VALUES (?, 1, ?, 0, ?, 'efectivo', 'completada', ?)
  `, [turno.lastID, monto, monto, `${fecha} 12:00:00`]);
  await db.run(`
    INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, total)
    VALUES (?, ?, 1, ?, ?)
  `, [v.lastID, prod.lastID, monto, monto]);
}

describe('Cierre de mes — ficha persistida', () => {
  test('cerrar un mes → ficha guardada', async () => {
    await sembrarVentaGravable(1000, '2026-08-10');
    const res = await request.post('/api/contabilidad/cierre-mes').set(auth()).send({ mes: 8, anio: 2026 });
    expect(res.status).toBe(201);
    expect(res.body.data.ficha.mes).toBe(8);
    expect(res.body.data.aplicaciones).toEqual([]);
  });

  test('no se puede cerrar el mismo mes dos veces → 400', async () => {
    const res = await request.post('/api/contabilidad/cierre-mes').set(auth()).send({ mes: 8, anio: 2026 });
    expect(res.status).toBe(400);
  });

  test('la ficha persistida se recupera con su detalle', async () => {
    const res = await request.get('/api/contabilidad/cierre-mes/8/2026').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.ficha.recaudado).toBe(1000);
  });

  test('un mes sin cerrar → 404', async () => {
    const res = await request.get('/api/contabilidad/cierre-mes/1/2026').set(auth());
    expect(res.status).toBe(404);
  });
});

describe('Cierre de mes — aplicación del excedente', () => {
  test('aplicarExcedente: inversiones primero (más vencimientos), luego préstamos', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const { aplicarExcedente } = require('../src/backend/controllers/prestamoInversionController');

    const inv = await request.post('/api/config/prestamos-inversiones').set(auth())
      .send({ tipo: 'inversion', descripcion: 'Inversión A', capital_total: 12000, plazo_meses: 12, tasa_anual: 12, fecha_inicio: '2026-07-01' });
    const invId = inv.body.id;
    const pres = await request.post('/api/config/prestamos-inversiones').set(auth())
      .send({ tipo: 'prestamo', descripcion: 'Préstamo B', capital_total: 12000, plazo_meses: 12, tasa_anual: 12, fecha_inicio: '2026-07-01' });
    const presId = pres.body.id;

    // Total de tarifas originales del préstamo (referencia de preservación)
    const detPres = await request.get(`/api/config/prestamos-inversiones/${presId}`).set(auth());
    const totalTarifasOriginal = detPres.body.vencimientos.reduce((s, v) => s + v.tarifa, 0);

    // Aplicar excedente de 3000 (todos los registros activos, sin cancelaciones)
    const res = await aplicarExcedente(db, 3000);

    // Inversión primero
    expect(res.aplicaciones.length).toBeGreaterThan(0);
    expect(res.aplicaciones[0].tipo).toBe('inversion');
    expect(res.aplicado).toBeCloseTo(3000, 2);

    // La inversión reduce sus vencimientos pendientes
    const detInv = await request.get(`/api/config/prestamos-inversiones/${invId}`).set(auth());
    const pendInv = detInv.body.vencimientos.filter(v => v.estado !== 'pagado');
    expect(pendInv.length).toBeLessThan(12);
  });

  test('préstamo preserva las tarifas al adelantar capital', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const { aplicarExcedente } = require('../src/backend/controllers/prestamoInversionController');

    // Aislar: cancelar TODOS los registros activos para que el excedente vaya solo al préstamo C
    const activos = await request.get('/api/config/prestamos-inversiones').set(auth());
    for (const r of activos.body) {
      if (r.estado === 'activo') {
        await request.delete(`/api/config/prestamos-inversiones/${r.id}`).set(auth());
      }
    }

    const pres = await request.post('/api/config/prestamos-inversiones').set(auth())
      .send({ tipo: 'prestamo', descripcion: 'Préstamo C', capital_total: 6000, plazo_meses: 6, tasa_anual: 12, fecha_inicio: '2026-07-01' });
    const presId = pres.body.id;

    const detPres = await request.get(`/api/config/prestamos-inversiones/${presId}`).set(auth());
    const tarifasOriginal = detPres.body.vencimientos.map(v => v.tarifa);

    // Excedente de 3000 → cubre parte del capital → menos cuotas, MISMAS tarifas por ordinal
    const res = await aplicarExcedente(db, 3000);

    const detDespues = await request.get(`/api/config/prestamos-inversiones/${presId}`).set(auth());
    const pendientes = detDespues.body.vencimientos.filter(v => v.estado !== 'pagado');
    expect(pendientes.length).toBeLessThan(6);

    // Cada vencimiento pendiente dentro del ordinal original conserva su tarifa
    // (los ordinales más allá de la tabla original reutilizan la última tarifa conocida).
    for (const v of pendientes) {
      if (v.ordinal <= tarifasOriginal.length) {
        expect(v.tarifa).toBeCloseTo(tarifasOriginal[v.ordinal - 1], 2);
      }
    }
  });

  test('regresión: reajustarCuotas continúa desde la fecha del ÚLTIMO PAGO (no del MAX global)', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const { generarTablaVencimientos, reajustarCuotas } = require('../src/backend/controllers/prestamoInversionController');

    // Inversión 10000/10 meses, fecha_inicio 2026-01-01 → ordinales 2026-02-01..2026-11-01
    const r = await db.run(`
      INSERT INTO prestamos_inversiones (tipo, descripcion, capital_total, plazo_meses, tasa_anual, pago_capital, fecha_inicio)
      VALUES ('inversion', 'Regresión', 10000, 10, 0, 1000, '2026-01-01')
    `);
    const regId = r.lastID;
    const { vencimientos } = generarTablaVencimientos({ tipo: 'inversion', capital_total: 10000, plazo_meses: 10, tasa_anual: 0, fecha_inicio: '2026-01-01' });
    for (const v of vencimientos) {
      await db.run(`
        INSERT INTO vencimientos (prestamo_inversion_id, ordinal, fecha_vencimiento, capital, pago_capital, tarifa, aporte)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [regId, v.ordinal, v.fecha_vencimiento, v.capital, v.pago_capital, v.tarifa, v.aporte]);
    }

    // Pagar el ordinal 1 completo (aporte 1000) → el próximo debe seguir en 2026-03-01
    await request.post(`/api/config/prestamos-inversiones/${regId}/pagos`).set(auth())
      .send({ ordinal: 1, monto: 1000 });

    const det = await request.get(`/api/config/prestamos-inversiones/${regId}`).set(auth());
    const pend = det.body.vencimientos.filter(v => v.estado !== 'pagado');
    expect(pend.length).toBe(9);
    // El primer vencimiento pendiente debe ser el ordinal 2 en 2026-03-01 (NO saltar al futuro)
    expect(pend[0].ordinal).toBe(2);
    expect(pend[0].fecha_vencimiento).toBe('2026-03-01');
  });
});
