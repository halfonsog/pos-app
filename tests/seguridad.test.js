/**
 * Tests de seguridad y matriz de acceso rol↔endpoint (Sprint 0).
 *
 * Verifica:
 * - Login (credenciales, bloqueo de inválidos)
 * - Endpoints públicos vs protegidos (401 sin token)
 * - Matriz de permisos según menú lateral:
 *   · vendedor: puede vender y consultar (productos, stock, config de lectura, su turno)
 *   · vendedor: NO puede administrar (escrituras, compras, proveedores, contabilidad,
 *     mantenimiento, anular ventas, reportes de negocio) → 403
 *   · admin: acceso total
 *
 * La app corre contra una BD temporal construida desde las migraciones.
 * NO toca la base de datos real.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

// Configurar entorno ANTES de requerir la app (db.js valida el archivo al cargar)
const TEST_DB = path.join(os.tmpdir(), `pos3_seguridad_test_${process.pid}.db`);
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

  // Login de ambos roles
  const resAdmin = await request.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  const resVendedor = await request.post('/api/auth/login').send({ username: 'vendedor', password: 'vendedor123' });
  adminToken = resAdmin.body.token;
  vendedorToken = resVendedor.body.token;
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

// ───────────────────────────── Login ─────────────────────────────

describe('Autenticación', () => {
  test('login sin credenciales → 400', async () => {
    const res = await request.post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  test('login con contraseña incorrecta → 401', async () => {
    const res = await request.post('/api/auth/login').send({ username: 'admin', password: 'incorrecta' });
    expect(res.status).toBe(401);
  });

  test('login admin correcto → token con rol admin', async () => {
    expect(adminToken).toBeTruthy();
    const res = await request.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.user.rol).toBe('admin');
  });

  test('login vendedor correcto → token con rol vendedor', async () => {
    expect(vendedorToken).toBeTruthy();
    const res = await request.post('/api/auth/login').send({ username: 'vendedor', password: 'vendedor123' });
    expect(res.status).toBe(200);
    expect(res.body.user.rol).toBe('vendedor');
  });

  test('verify con token válido → 200', async () => {
    const res = await request.get('/api/auth/verify').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('verify con token firmado con otro secreto → 401', async () => {
    const jwt = require('jsonwebtoken');
    const tokenFalso = jwt.sign({ id: 1, username: 'admin', rol: 'admin' }, 'otro_secreto');
    const res = await request.get('/api/auth/verify').set('Authorization', `Bearer ${tokenFalso}`);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────── Público vs protegido ───────────────────────

describe('Endpoints públicos', () => {
  test('GET /api/health → 200 sin token', async () => {
    const res = await request.get('/api/health');
    expect(res.status).toBe(200);
  });
});

describe('Sin token → 401 en rutas protegidas', () => {
  const rutas = [
    ['GET', '/api/dashboard'],
    ['GET', '/api/productos'],
    ['GET', '/api/reportes/ventas-por-producto?inicio=2026-01-01&fin=2026-12-31'],
    ['GET', '/api/reportes/rentabilidad?inicio=2026-01-01&fin=2026-12-31'],
    ['GET', '/api/mantenimiento/logs'],
    ['GET', '/api/mantenimiento/backup'],
    ['POST', '/api/mantenimiento/reset'],
    ['GET', '/api/contabilidad/historial'],
  ];

  test.each(rutas)('%s %s → 401', async (metodo, ruta) => {
    const res = await request[metodo.toLowerCase()](ruta);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────── Matriz: vendedor ───────────────────────

describe('Vendedor: accesos permitidos (según su menú)', () => {
  const rutas = [
    ['GET', '/api/productos'],
    ['GET', '/api/inventario/stock'],
    ['GET', '/api/configuracion/general'],
    ['GET', '/api/configuracion/unidades'],
    ['GET', '/api/configuracion/denominaciones'],
    ['GET', '/api/reportes/ventas-por-producto?inicio=2026-01-01&fin=2026-12-31'],
    ['GET', '/api/ventas/mi-turno'],
    ['GET', '/api/ventas/turno-actual'],
    ['GET', '/api/dashboard?inicio=2026-01-01&fin=2026-12-31'],
  ];

  test.each(rutas)('%s %s → no 401/403', async (metodo, ruta) => {
    const res = await request[metodo.toLowerCase()](ruta).set('Authorization', `Bearer ${vendedorToken}`);
    expect([401, 403]).not.toContain(res.status);
  });
});

describe('Vendedor: accesos denegados → 403', () => {
  const rutas = [
    // Productos: escrituras
    ['POST', '/api/productos'],
    ['PUT', '/api/productos/1'],
    ['DELETE', '/api/productos/1'],
    ['PUT', '/api/productos/1/costo'],
    ['POST', '/api/productos/1/receta'],
    // Compras y proveedores: todo
    ['GET', '/api/compras'],
    ['POST', '/api/compras'],
    ['GET', '/api/proveedores'],
    ['POST', '/api/proveedores'],
    // Inventario: movimientos
    ['POST', '/api/inventario/ajuste'],
    ['POST', '/api/inventario/preparar/1'],
    // Configuración: escrituras
    ['PUT', '/api/configuracion/general'],
    ['POST', '/api/configuracion/gastos'],
    ['POST', '/api/configuracion/categorias'],
    ['PUT', '/api/configuracion/unidades/100'],
    ['POST', '/api/configuracion/terminos-pago'],
    // Contabilidad: todo
    ['GET', '/api/contabilidad/historial'],
    ['POST', '/api/contabilidad/calcular-impuestos'],
    // Mantenimiento: todo
    ['GET', '/api/mantenimiento/logs'],
    ['GET', '/api/mantenimiento/backup'],
    ['POST', '/api/mantenimiento/reset'],
    ['POST', '/api/mantenimiento/eliminar-anio'],
    // Ventas: anular
    ['POST', '/api/ventas/1/anular'],
    // Reportes de negocio
    ['GET', '/api/reportes/rentabilidad?inicio=2026-01-01&fin=2026-12-31'],
    ['GET', '/api/reportes/tendencia?tipo=mes'],
    ['GET', '/api/reportes/contables?anio=2026&mes=1'],
    ['GET', '/api/reportes/resumen-anual?anio=2026'],
  ];

  test.each(rutas)('%s %s → 403', async (metodo, ruta) => {
    const res = await request[metodo.toLowerCase()](ruta)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({});
    expect(res.status).toBe(403);
  });
});

// ─────────────────────── Matriz: admin ───────────────────────

describe('Admin: acceso total (no 401/403)', () => {
  const rutas = [
    ['GET', '/api/compras'],
    ['GET', '/api/proveedores'],
    ['GET', '/api/reportes/rentabilidad?inicio=2026-01-01&fin=2026-12-31'],
    ['GET', '/api/reportes/contables?anio=2026&mes=1'],
    ['GET', '/api/contabilidad/historial'],
    ['GET', '/api/mantenimiento/logs'],
    ['GET', '/api/inventario/resumen'],
    ['POST', '/api/ventas/999/anular'], // 404/500 esperado (no existe), pero NO 403
  ];

  test.each(rutas)('%s %s → no 401/403', async (metodo, ruta) => {
    const res = await request[metodo.toLowerCase()](ruta)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect([401, 403]).not.toContain(res.status);
  });
});
