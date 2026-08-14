/**
 * Tests del módulo de inventario (Sprint 3: D6, D7, D8).
 * - D7: catálogo tipos_movimiento + ajustes con nuevos tipos (donación entrada/salida)
 * - D6: intercambio reventa→granel (validaciones + movimiento de stock en ambos lados)
 * - D8: subcategorías (padre, anti-ciclo, listado jerárquico)
 * BD temporal desde migraciones. NO toca la BD real.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const TEST_DB = path.join(os.tmpdir(), `pos3_inventario_test_${process.pid}.db`);
process.env.DB_PATH = TEST_DB;
process.env.JWT_SECRET = 'pos3_test_secret';
process.env.NODE_ENV = 'test';

const { buildTestDb } = require('./helpers/testDb');

let request;
let adminToken;
let catId;

beforeAll(async () => {
  await buildTestDb(TEST_DB);
  const app = require('../src/backend/app');
  request = require('supertest')(app);
  const res = await request.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  adminToken = res.body.token;
  const { getDb } = require('../src/backend/models/db');
  const db = await getDb();
  const cat = await db.get('SELECT id FROM categorias WHERE gravable = 1 AND es_sistema = 0');
  catId = cat.id;
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

let reventaId, granelId;

async function crearProductosBase() {
  const r = await request.post('/api/productos').set(auth())
    .field('codigo', 'REV1').field('nombre', 'Botella Aceite 1L').field('tipo', 'simple')
    .field('sub_tipo', 'reventa').field('unidad_venta_id', '1')
    .field('categoria_id', String(catId));
  reventaId = r.body.id;

  const g = await request.post('/api/productos').set(auth())
    .field('codigo', 'GRA1').field('nombre', 'Aceite a granel').field('tipo', 'simple')
    .field('sub_tipo', 'granel').field('unidad_venta_id', '1').field('unidad_compra_id', '1')
    .field('categoria_id', String(catId));
  granelId = g.body.id;

  // Dar stock al reventa directamente en BD
  const { getDb } = require('../src/backend/models/db');
  const db = await getDb();
  await db.run('UPDATE productos SET stock_actual = 10 WHERE id = ?', [reventaId]);
}

describe('D7: catálogo de tipos de movimiento', () => {
  test('GET tipos-movimiento devuelve los 13 tipos con signo', async () => {
    const res = await request.get('/api/inventario/tipos-movimiento').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(13);
    const codigos = res.body.map(t => t.codigo);
    expect(codigos).toContain('intercambio_entrada');
    expect(codigos).toContain('donacion_salida');
    expect(codigos).toContain('transferencia');
    const venta = res.body.find(t => t.codigo === 'venta');
    expect(venta.signo).toBe('-');
  });

  test('ajuste donacion_entrada incrementa stock', async () => {
    await crearProductosBase();
    const res = await request.post('/api/inventario/ajuste').set(auth())
      .send({ producto_id: granelId, tipo: 'donacion_entrada', cantidad: 5 });
    expect(res.status).toBe(200);

    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const p = await db.get('SELECT stock_actual FROM productos WHERE id = ?', [granelId]);
    expect(p.stock_actual).toBe(5);

    const mov = await db.get("SELECT tipo, cantidad FROM movimientos_stock WHERE producto_id = ? ORDER BY id DESC LIMIT 1", [granelId]);
    expect(mov.tipo).toBe('donacion_entrada');
    expect(mov.cantidad).toBe(5);
  });

  test('ajuste donacion_salida descuenta stock aunque manden cantidad positiva', async () => {
    const res = await request.post('/api/inventario/ajuste').set(auth())
      .send({ producto_id: reventaId, tipo: 'donacion_salida', cantidad: 3 });
    expect(res.status).toBe(200);

    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const p = await db.get('SELECT stock_actual FROM productos WHERE id = ?', [reventaId]);
    expect(p.stock_actual).toBe(7);
  });

  test('tipo inválido → 400', async () => {
    const res = await request.post('/api/inventario/ajuste').set(auth())
      .send({ producto_id: reventaId, tipo: 'venta', cantidad: 1 });
    expect(res.status).toBe(400);
  });
});

describe('D6: intercambio reventa→granel', () => {
  test('destino que no es granel → 400', async () => {
    const res = await request.post('/api/inventario/intercambio').set(auth())
      .send({ producto_origen_id: reventaId, producto_destino_id: reventaId, cantidad_origen: 1, cantidad_destino: 1 });
    expect(res.status).toBe(400);
  });

  test('origen que no es reventa → 400', async () => {
    const res = await request.post('/api/inventario/intercambio').set(auth())
      .send({ producto_origen_id: granelId, producto_destino_id: granelId, cantidad_origen: 1, cantidad_destino: 1 });
    expect(res.status).toBe(400);
  });

  test('stock insuficiente en origen → 400', async () => {
    const res = await request.post('/api/inventario/intercambio').set(auth())
      .send({ producto_origen_id: reventaId, producto_destino_id: granelId, cantidad_origen: 999, cantidad_destino: 0.94 });
    expect(res.status).toBe(400);
  });

  test('intercambio correcto mueve stock en ambos lados y registra movimientos', async () => {
    // reventa tiene 7 (10 − 3 donados), granel tiene 5 (donación recibida)
    const res = await request.post('/api/inventario/intercambio').set(auth())
      .send({ producto_origen_id: reventaId, producto_destino_id: granelId, cantidad_origen: 2, cantidad_destino: 1.88 });
    expect(res.status).toBe(200);

    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const origen = await db.get('SELECT stock_actual FROM productos WHERE id = ?', [reventaId]);
    const destino = await db.get('SELECT stock_actual FROM productos WHERE id = ?', [granelId]);
    expect(origen.stock_actual).toBeCloseTo(5, 2);
    expect(destino.stock_actual).toBeCloseTo(6.88, 2);

    const salida = await db.get("SELECT cantidad, referencia_id FROM movimientos_stock WHERE tipo = 'intercambio_salida' AND producto_id = ?", [reventaId]);
    const entrada = await db.get("SELECT cantidad, referencia_id FROM movimientos_stock WHERE tipo = 'intercambio_entrada' AND producto_id = ?", [granelId]);
    expect(salida.cantidad).toBe(-2);
    expect(salida.referencia_id).toBe(granelId);
    expect(entrada.cantidad).toBeCloseTo(1.88, 2);
    expect(entrada.referencia_id).toBe(reventaId);
  });
});

describe('D8: subcategorías', () => {
  let padreId, hijaId;

  test('crear categoría padre y subcategoría', async () => {
    const padre = await request.post('/api/configuracion/categorias').set(auth())
      .send({ nombre: 'Bebidas' });
    expect(padre.status).toBe(201);
    padreId = padre.body.id;

    const hija = await request.post('/api/configuracion/categorias').set(auth())
      .send({ nombre: 'Bebidas calientes', padre_id: padreId });
    expect(hija.status).toBe(201);
    hijaId = hija.body.id;

    const lista = await request.get('/api/configuracion/categorias').set(auth());
    const hijaEnLista = lista.body.find(c => c.id === hijaId);
    expect(hijaEnLista.padre_nombre).toBe('Bebidas');
  });

  test('una categoría no puede ser su propia padre → 400', async () => {
    const res = await request.put(`/api/configuracion/categorias/${padreId}`).set(auth())
      .send({ nombre: 'Bebidas', padre_id: padreId });
    expect(res.status).toBe(400);
  });

  test('ciclo: padre no puede colgar de su propia hija → 400', async () => {
    const res = await request.put(`/api/configuracion/categorias/${padreId}`).set(auth())
      .send({ nombre: 'Bebidas', padre_id: hijaId });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ciclo/i);
  });

  test('padre inexistente → 400', async () => {
    const res = await request.post('/api/configuracion/categorias').set(auth())
      .send({ nombre: 'Huérfana', padre_id: 9999 });
    expect(res.status).toBe(400);
  });
});
