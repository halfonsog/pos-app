/**
 * Tests del CRUD de usuarios y empleados (Sprint 1, D18) y del filtro "mis ventas" (B9).
 * Corre contra una BD temporal construida desde las migraciones. NO toca la BD real.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const TEST_DB = path.join(os.tmpdir(), `pos3_usuarios_test_${process.pid}.db`);
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

  const resAdmin = await request.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  const resVend = await request.post('/api/auth/login').send({ username: 'vendedor', password: 'vendedor123' });
  adminToken = resAdmin.body.token;
  vendedorToken = resVend.body.token;
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

const admin = () => ({ Authorization: `Bearer ${adminToken}` });
const vend = () => ({ Authorization: `Bearer ${vendedorToken}` });

describe('Empleados (D18)', () => {
  test('vendedor no puede listar empleados → 403', async () => {
    const res = await request.get('/api/empleados').set(vend());
    expect(res.status).toBe(403);
  });

  test('admin lista empleados (los 2 sembrados)', async () => {
    const res = await request.get('/api/empleados').set(admin());
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].num_usuarios).toBeDefined();
  });

  test('crear empleado sin nombre → 400', async () => {
    const res = await request.post('/api/empleados').set(admin()).send({ cargo: 'otro' });
    expect(res.status).toBe(400);
  });

  test('empleado sin credenciales: se crea sin usuario asociado', async () => {
    const res = await request.post('/api/empleados').set(admin())
      .send({ nombre: 'Almacenero Sin Acceso', cargo: 'otro', salario_mensual: 2500 });
    expect(res.status).toBe(201);
    const lista = await request.get('/api/empleados').set(admin());
    const creado = lista.body.find(e => e.nombre === 'Almacenero Sin Acceso');
    expect(creado.num_usuarios).toBe(0);
  });
});

describe('CRUD de usuarios (D18)', () => {
  let empleadoId;

  test('vendedor no puede gestionar usuarios → 403', async () => {
    expect((await request.get('/api/usuarios').set(vend())).status).toBe(403);
    expect((await request.post('/api/usuarios').set(vend()).send({})).status).toBe(403);
  });

  test('crear usuario sin empleado → 400', async () => {
    const res = await request.post('/api/usuarios').set(admin())
      .send({ username: 'nuevo', password: '1234', nombre_completo: 'Nuevo', rol: 'vendedor' });
    expect(res.status).toBe(400);
  });

  test('crear usuario con empleado inexistente → 400', async () => {
    const res = await request.post('/api/usuarios').set(admin())
      .send({ username: 'nuevo', password: '1234', nombre_completo: 'Nuevo', rol: 'vendedor', empleado_id: 999 });
    expect(res.status).toBe(400);
  });

  test('crear usuario correcto → 201 y aparece en el listado', async () => {
    const emp = await request.post('/api/empleados').set(admin()).send({ nombre: 'María Vendedora', cargo: 'vendedor' });
    empleadoId = emp.body.id;

    const res = await request.post('/api/usuarios').set(admin())
      .send({ username: 'maria', password: '1234', nombre_completo: 'María Vendedora', rol: 'vendedor', empleado_id: empleadoId });
    expect(res.status).toBe(201);

    const lista = await request.get('/api/usuarios').set(admin());
    const maria = lista.body.find(u => u.username === 'maria');
    expect(maria).toBeTruthy();
    expect(maria.empleado_nombre).toBe('María Vendedora');
    expect(maria.password_hash).toBeUndefined(); // nunca exponer el hash
  });

  test('username duplicado → 400', async () => {
    const res = await request.post('/api/usuarios').set(admin())
      .send({ username: 'maria', password: '1234', nombre_completo: 'Otra María', rol: 'vendedor', empleado_id: empleadoId });
    expect(res.status).toBe(400);
  });

  test('un empleado puede tener varios usuarios (admin y vendedor)', async () => {
    const res = await request.post('/api/usuarios').set(admin())
      .send({ username: 'maria_admin', password: '1234', nombre_completo: 'María Vendedora', rol: 'admin', empleado_id: empleadoId });
    expect(res.status).toBe(201);
  });

  test('reset de contraseña: el nuevo password funciona en login', async () => {
    const lista = await request.get('/api/usuarios').set(admin());
    const maria = lista.body.find(u => u.username === 'maria');

    const res = await request.put(`/api/usuarios/${maria.id}/password`).set(admin()).send({ password: 'nueva123' });
    expect(res.status).toBe(200);

    const login = await request.post('/api/auth/login').send({ username: 'maria', password: 'nueva123' });
    expect(login.status).toBe(200);
  });

  test('un admin no puede desactivarse a sí mismo → 400', async () => {
    const res = await request.put('/api/usuarios/1').set(admin()).send({ activo: 0 });
    expect(res.status).toBe(400);
  });

  test('no se puede dejar el sistema sin admins activos → 400', async () => {
    // admin (id=1) es el único admin sembrado activo con ese nombre de usuario;
    // maria_admin también es admin, así que primero la desactivamos y luego
    // intentamos degradar a admin id=1 desde otra cuenta admin.
    const lista = await request.get('/api/usuarios').set(admin());
    const mariaAdmin = lista.body.find(u => u.username === 'maria_admin');

    // Login como maria_admin (tiene rol admin)
    await request.put(`/api/usuarios/${mariaAdmin.id}/password`).set(admin()).send({ password: 'maria123' });
    const loginMA = await request.post('/api/auth/login').send({ username: 'maria_admin', password: 'maria123' });
    const tokenMA = loginMA.body.token;

    // maria_admin degrada a admin(id=1) a vendedor → debe fallar: quedaría ella como única admin... 
    // primero que maria_admin se degrade a sí misma debe fallar (propio)
    const resPropio = await request.put(`/api/usuarios/${mariaAdmin.id}`).set('Authorization', `Bearer ${tokenMA}`).send({ rol: 'vendedor' });
    expect(resPropio.status).toBe(400);

    // maria_admin degrada a admin(id=1): permitido porque queda maria_admin como admin
    const resDegradar = await request.put('/api/usuarios/1').set('Authorization', `Bearer ${tokenMA}`).send({ rol: 'vendedor' });
    expect(resDegradar.status).toBe(200);

    // ahora maria_admin es la única admin: degradarla desde admin(id=1, ya vendedor) → 403; y ella misma → 400 (propio)
    const resUltima = await request.put(`/api/usuarios/${mariaAdmin.id}`).set('Authorization', `Bearer ${tokenMA}`).send({ activo: 0 });
    expect(resUltima.status).toBe(400);
  });
});

describe('Mis ventas (B9): el vendedor solo ve las suyas', () => {
  test('filtro por vendedor en listarVentas', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();

    // Turno cerrado por el vendedor (id=2) y otro por admin (id=1), con una venta cada uno
    const t1 = await db.run("INSERT INTO turnos (vendedor_id, monto_apertura, estado) VALUES (2, 0, 'cerrado')");
    const t2 = await db.run("INSERT INTO turnos (vendedor_id, monto_apertura, estado) VALUES (1, 0, 'cerrado')");
    await db.run(`INSERT INTO ventas (turno_id, vendedor_id, subtotal, impuesto, total, metodo_pago, estado)
                  VALUES (?, 2, 100, 15, 115, 'efectivo', 'completada')`, [t1.lastID]);
    await db.run(`INSERT INTO ventas (turno_id, vendedor_id, subtotal, impuesto, total, metodo_pago, estado)
                  VALUES (?, 1, 200, 30, 230, 'tarjeta', 'completada')`, [t2.lastID]);

    // El vendedor solo ve su venta
    const resVend = await request.get('/api/ventas').set(vend());
    expect(resVend.status).toBe(200);
    expect(resVend.body.length).toBe(1);
    expect(resVend.body[0].vendedor_id).toBe(2);

    // El admin ve ambas
    const resAdmin = await request.get('/api/ventas').set(admin());
    expect(resAdmin.body.length).toBe(2);
  });
});
