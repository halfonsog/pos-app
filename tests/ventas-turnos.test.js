/**
 * Tests del cierre de turno con arqueo persistido (B14).
 * BD temporal desde migraciones. NO toca la BD real.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const TEST_DB = path.join(os.tmpdir(), `pos3_turnos_test_${process.pid}.db`);
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

describe('Cierre de turno con arqueo (B14)', () => {
  test('al cerrar el turno se persiste el desglose por denominaciones', async () => {
    await request.post('/api/ventas/abrir-turno').set(auth()).send({ monto_apertura: 0 });

    const res = await request.post('/api/ventas/cerrar-turno').set(auth())
      .send({
        monto_real: 3000,
        desglose: [
          { valor: 1000, cantidad: 2 },
          { valor: 500, cantidad: 1 },
          { valor: 5, cantidad: 100 }
        ]
      });
    expect(res.status).toBe(200);

    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const turno = await db.get("SELECT * FROM turnos WHERE estado = 'cerrado' ORDER BY id DESC LIMIT 1");
    expect(turno).toBeTruthy();

    const arqueos = await db.all('SELECT * FROM arqueos WHERE turno_id = ? ORDER BY valor DESC', [turno.id]);
    expect(arqueos.length).toBe(3);
    expect(arqueos[0].valor).toBe(1000);
    expect(arqueos[0].cantidad).toBe(2);
    expect(arqueos[0].subtotal).toBe(2000);

    const totalArqueado = arqueos.reduce((s, a) => s + a.subtotal, 0);
    expect(totalArqueado).toBe(3000);
  });

  test('un arqueo vacío no deja filas', async () => {
    await request.post('/api/ventas/abrir-turno').set(auth()).send({ monto_apertura: 0 });
    await request.post('/api/ventas/cerrar-turno').set(auth()).send({ monto_real: 0 });

    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const turno = await db.get("SELECT * FROM turnos WHERE estado = 'cerrado' ORDER BY id DESC LIMIT 1");
    const n = await db.get('SELECT COUNT(*) AS n FROM arqueos WHERE turno_id = ?', [turno.id]);
    expect(n.n).toBe(0);
  });
});
