/**
 * Tests del modelo fiscal de dos mundos (D30–D36, m032).
 * BD temporal desde migraciones. NO toca la BD real.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const TEST_DB = path.join(os.tmpdir(), `pos3_fiscal2_test_${process.pid}.db`);
process.env.DB_PATH = TEST_DB;
process.env.JWT_SECRET = 'pos3_test_secret';
process.env.NODE_ENV = 'test';

const { buildTestDb } = require('./helpers/testDb');

let request;
let adminToken;
let catGravable;   // categoría gravable (para productos gravables)
let catNoGravable; // categoría no gravable (hija de la raíz de sistema)

beforeAll(async () => {
  await buildTestDb(TEST_DB);
  const app = require('../src/backend/app');
  request = require('supertest')(app);
  const res = await request.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  adminToken = res.body.token;

  const { getDb } = require('../src/backend/models/db');
  const db = await getDb();

  // Categorías de soporte del test
  const ngRoot = await db.get("SELECT id FROM categorias WHERE es_sistema = 1");
  const r1 = await db.run("INSERT INTO categorias (nombre, activo, gravable, es_sistema) VALUES ('Gravables test', 1, 1, 0)");
  catGravable = r1.lastID;
  const r2 = await db.run("INSERT INTO categorias (nombre, descripcion, padre_id, activo, gravable, es_sistema) VALUES ('Informales test', 'sub', ?, 1, 0, 0)", [ngRoot.id]);
  catNoGravable = r2.lastID;
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

async function crearProducto(codigo, nombre, categoriaId, tipo = 'simple', subTipo = 'reventa') {
  const { getDb } = require('../src/backend/models/db');
  const db = await getDb();
  const r = await db.run(`
    INSERT INTO productos (codigo, nombre, tipo, sub_tipo, categoria_id, unidad_venta_id, costo_base, precio_venta, stock_actual, activo)
    VALUES (?, ?, ?, ?, ?, 1, 50, 100, 1000, 1)
  `, [codigo, nombre, tipo, subTipo, categoriaId]);
  return r.lastID;
}

describe('Modelo fiscal de dos mundos (D30–D36)', () => {
  test('la migración crea la categoría de sistema "No gravable" (gravable=0, es_sistema=1)', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const c = await db.get("SELECT * FROM categorias WHERE es_sistema = 1");
    expect(c).toBeTruthy();
    expect(c.nombre).toBe('No gravable');
    expect(c.gravable).toBe(0);
  });

  test('no se puede editar la categoría de sistema → 403', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const c = await db.get("SELECT id FROM categorias WHERE es_sistema = 1");
    const res = await request.put(`/api/configuracion/categorias/${c.id}`).set(auth())
      .send({ nombre: 'Hack' });
    expect(res.status).toBe(403);
  });

  test('crear categoría con nombre duplicado → 400 con mensaje claro', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const ng = await db.get("SELECT id FROM categorias WHERE es_sistema = 1");
    // Primero crear una válida
    const r1 = await request.post('/api/configuracion/categorias').set(auth())
      .send({ nombre: 'Hija unicat', padre_id: String(ng.id) });
    expect(r1.status).toBe(201);
    // Intentar duplicar el nombre
    const r2 = await request.post('/api/configuracion/categorias').set(auth())
      .send({ nombre: 'Hija unicat', padre_id: String(ng.id) });
    expect(r2.status).toBe(400);
    expect(r2.body.error).toContain('Ya existe una categoría');
  });

  test('una categoría hija bajo "No gravable" hereda gravable=0', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const padre = await db.get("SELECT id FROM categorias WHERE es_sistema = 1");
    const res = await request.post('/api/configuracion/categorias').set(auth())
      .send({ nombre: 'Huevos informales', padre_id: padre.id });
    expect(res.status).toBe(201);
    const hija = await db.get('SELECT gravable FROM categorias WHERE id = ?', [res.body.id]);
    expect(hija.gravable).toBe(0);
  });

  test('una compra CON factura con productos no gravables se bloquea → 400', async () => {
    const ngId = await crearProducto('NG-1', 'Huevo informal', catNoGravable);
    const prov = await request.post('/api/proveedores').set(auth()).send({ nombre: 'Proveedor NG' });
    const compra = await request.post('/api/compras').set(auth())
      .send({
        fecha_compra: '2026-08-10',
        codigo_factura: 'F-001',
        proveedor_id: prov.body.id,
        detalles: [{ producto_id: ngId, cantidad: 1, precio_unitario: 100 }]
      });
    expect(compra.status).toBe(400);
    expect(compra.body.error).toContain('no gravable');
  });

  test('una compra SIN factura con productos no gravables SÍ se permite', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const ngProd = await db.get("SELECT id FROM productos WHERE codigo = 'NG-1'");
    const prov = await request.post('/api/proveedores').set(auth()).send({ nombre: 'Proveedor NG2' });
    const compra = await request.post('/api/compras').set(auth())
      .send({
        fecha_compra: '2026-08-10',
        proveedor_id: prov.body.id,
        detalles: [{ producto_id: ngProd.id, cantidad: 1, precio_unitario: 100 }]
      });
    expect(compra.status).toBe(201);
  });

  test('NO se permite MEZCLAR no gravables y gravables en la misma compra → 400', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const ngProd = await db.get("SELECT id FROM productos WHERE codigo = 'NG-1'");
    // Producto gravable para mezclar (carbón no gravable + guayabas gravables)
    const gravId = await crearProducto('GR-MEZCLA', 'Guayabas', catGravable);
    const prov = await request.post('/api/proveedores').set(auth()).send({ nombre: 'Proveedor mezcla' });
    const compra = await request.post('/api/compras').set(auth())
      .send({
        fecha_compra: '2026-08-11',
        proveedor_id: prov.body.id,
        detalles: [
          { producto_id: ngProd.id, cantidad: 2, precio_unitario: 50 },
          { producto_id: gravId, cantidad: 3, precio_unitario: 30 }
        ]
      });
    expect(compra.status).toBe(400);
    expect(compra.body.error).toContain('mezclar');
  });

  test('una receta no puede mezclar gravables y no gravables → 400', async () => {
    const compuestoId = await crearProducto('CMP-1', 'Compuesto gravable', catGravable, 'compuesto', 'elaborado');
    const ngIngId = await crearProducto('NG-ING', 'Ingrediente informal', catNoGravable, 'simple', 'granel');

    const res = await request.post(`/api/productos/${compuestoId}/receta`).set(auth())
      .send({ producto_hijo_id: ngIngId, cantidad: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('gravables y no gravables');
  });

  test('el desglose fiscal excluye las líneas no gravables (D32)', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const costos = require('../src/backend/utils/costos');

    const prodGId = await crearProducto('GR-1', 'Producto gravable', catGravable);
    const ngProd = await db.get("SELECT id FROM productos WHERE codigo = 'NG-1'");

    const turno = await db.run("INSERT INTO turnos (vendedor_id, monto_apertura, estado) VALUES (1, 0, 'cerrado')");

    // venta con una línea gravable (200) y una no gravable (100)
    const v = await db.run(`
      INSERT INTO ventas (turno_id, vendedor_id, subtotal, impuesto, total, metodo_pago, estado, created_at)
      VALUES (?, 1, 300, 0, 300, 'efectivo', 'completada', datetime('now'))
    `, [turno.lastID]);
    await db.run('INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, total) VALUES (?, ?, 2, 100, 200)', [v.lastID, prodGId]);
    await db.run('INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, total) VALUES (?, ?, 1, 100, 100)', [v.lastID, ngProd.id]);

    const ahora = new Date();
    const inicio = `${ahora.getFullYear()}-01-01 00:00:00`;
    const fin = `${ahora.getFullYear() + 1}-01-01 00:00:00`;

    const real = await costos.desglosePrioridades(db, inicio, fin, { operativo: true });
    const fiscal = await costos.desglosePrioridades(db, inicio, fin);

    // mundo real incluye todo (300); fiscal solo gravable (200)
    expect(real.venta_neta).toBe(300);
    expect(fiscal.venta_neta).toBe(200);
  });
});
