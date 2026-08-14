/**
 * Tests del modelo de productos (Sprint 2: D1-D5).
 *
 * Cubre:
 * - D1: subtipos elaborado/conformado obligatorios en compuestos
 * - D2: anti-ciclos en recetas (directo y recursivo)
 * - D3: recálculo de costo_base y precio_recomendado (ficha, compra en cascada, config)
 * - D4: campos estructurales no editables
 * - D5: solo granel/elaborados como ingredientes
 *
 * BD temporal desde migraciones. NO toca la BD real.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const TEST_DB = path.join(os.tmpdir(), `pos3_productos_test_${process.pid}.db`);
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

// IDs que se van creando
let granelId, reventaId, elaboradoAId, elaboradoBId, conformadoId;

describe('D1: creación con subtipos', () => {
  test('crear simple granel → 201', async () => {
    const res = await request.post('/api/productos').set(auth())
      .field('codigo', 'G001').field('nombre', 'Azúcar').field('tipo', 'simple')
      .field('sub_tipo', 'granel').field('unidad_venta_id', '1').field('unidad_compra_id', '1')
      .field('categoria_id', String(catId));
    expect(res.status).toBe(201);
    granelId = res.body.id;
  });

  test('crear simple reventa → 201', async () => {
    const res = await request.post('/api/productos').set(auth())
      .field('codigo', 'R001').field('nombre', 'Refresco').field('tipo', 'simple')
      .field('sub_tipo', 'reventa').field('unidad_venta_id', '1')
      .field('categoria_id', String(catId));
    expect(res.status).toBe(201);
    reventaId = res.body.id;
  });

  test('crear compuesto sin sub_tipo → 400', async () => {
    const res = await request.post('/api/productos').set(auth())
      .field('codigo', 'C000').field('nombre', 'Sin subtipo').field('tipo', 'compuesto')
      .field('unidad_venta_id', '1')
      .field('categoria_id', String(catId));
    expect(res.status).toBe(400);
  });

  test('crear compuesto elaborado → 201', async () => {
    const res = await request.post('/api/productos').set(auth())
      .field('codigo', 'E001').field('nombre', 'Dulce base').field('tipo', 'compuesto')
      .field('sub_tipo', 'elaborado').field('unidad_venta_id', '1')
      .field('categoria_id', String(catId));
    expect(res.status).toBe(201);
    elaboradoAId = res.body.id;
  });

  test('crear compuesto conformado → 201', async () => {
    const res = await request.post('/api/productos').set(auth())
      .field('codigo', 'C001').field('nombre', 'Café con leche').field('tipo', 'compuesto')
      .field('sub_tipo', 'conformado').field('unidad_venta_id', '1')
      .field('categoria_id', String(catId));
    expect(res.status).toBe(201);
    conformadoId = res.body.id;
  });
});

describe('D5: regla de ingredientes', () => {
  test('reventa NO puede ser ingrediente → 400', async () => {
    const res = await request.post(`/api/productos/${elaboradoAId}/receta`).set(auth())
      .send({ producto_hijo_id: reventaId, cantidad: 1 });
    expect(res.status).toBe(400);
  });

  test('granel SÍ puede ser ingrediente → 200', async () => {
    const res = await request.post(`/api/productos/${elaboradoAId}/receta`).set(auth())
      .send({ producto_hijo_id: granelId, cantidad: 0.5 });
    expect(res.status).toBe(200);
  });

  test('elaborado SÍ puede ser ingrediente de otro compuesto', async () => {
    // Crear elaborado B que contiene a A
    const resB = await request.post('/api/productos').set(auth())
      .field('codigo', 'E002').field('nombre', 'Dulce premium').field('tipo', 'compuesto')
      .field('sub_tipo', 'elaborado').field('unidad_venta_id', '1')
      .field('categoria_id', String(catId));
    elaboradoBId = resB.body.id;

    const res = await request.post(`/api/productos/${elaboradoBId}/receta`).set(auth())
      .send({ producto_hijo_id: elaboradoAId, cantidad: 1 });
    expect(res.status).toBe(200);
  });
});

describe('D2: anti-ciclos', () => {
  test('un producto no puede ser ingrediente de sí mismo → 400', async () => {
    const res = await request.post(`/api/productos/${elaboradoAId}/receta`).set(auth())
      .send({ producto_hijo_id: elaboradoAId, cantidad: 1 });
    expect(res.status).toBe(400);
  });

  test('ciclo directo: B contiene A → A no puede contener B → 400', async () => {
    const res = await request.post(`/api/productos/${elaboradoAId}/receta`).set(auth())
      .send({ producto_hijo_id: elaboradoBId, cantidad: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ciclo/i);
  });
});

describe('D4: campos estructurales no editables', () => {
  test('editar sub_tipo → 400', async () => {
    const res = await request.put(`/api/productos/${granelId}`).set(auth())
      .field('sub_tipo', 'reventa');
    expect(res.status).toBe(400);
  });

  test('editar unidad_venta_id → 400', async () => {
    const res = await request.put(`/api/productos/${granelId}`).set(auth())
      .field('unidad_venta_id', '2');
    expect(res.status).toBe(400);
  });

  test('editar nombre y stock_minimo → 200', async () => {
    const res = await request.put(`/api/productos/${granelId}`).set(auth())
      .field('nombre', 'Azúcar Refinada').field('stock_minimo', '5');
    expect(res.status).toBe(200);

    const p = await request.get(`/api/productos/${granelId}`).set(auth());
    expect(p.body.nombre).toBe('Azúcar Refinada');
    expect(p.body.stock_minimo).toBe(5);
  });
});

describe('D3: recálculo de costos en cascada', () => {
  test('setup: configuración con parámetros sanos (los seeds traen gastos absurdos)', async () => {
    // Las migraciones siembran gastos de 99 200 con ventas proyectadas de 10 000,
    // lo que daría %gastos > 100% (sin precio recomendado posible). Configuramos algo realista.
    const res = await request.put('/api/configuracion/general').set(auth())
      .send({ ventas_proyectadas: 500000, margen_recomendado: 20, impuesto_ventas: 15, redondeo_venta: 5, impuesto_ganancia: 35 });
    expect(res.status).toBe(200);
  });

  test('ficha de costo del granel → recalcula el compuesto que lo contiene', async () => {
    // Azúcar: costo_base = 100
    const res = await request.put(`/api/productos/${granelId}/costo`).set(auth())
      .send({ costo_base: 100, margen: 20, gastos_fijos: 10, impuesto: 15 });
    expect(res.status).toBe(200);

    // Dulce base (elaborado A) = 0.5 × 100 = 50
    const pA = await request.get(`/api/productos/${elaboradoAId}`).set(auth());
    expect(pA.body.costo_base).toBeCloseTo(50, 2);
    expect(pA.body.precio_recomendado).toBeGreaterThan(50);

    // Dulce premium (elaborado B) = 1 × costo(A) = 50 (cascada hacia arriba)
    const pB = await request.get(`/api/productos/${elaboradoBId}`).set(auth());
    expect(pB.body.costo_base).toBeCloseTo(50, 2);
  });

  test('inventariar una compra actualiza costo_base y cascada', async () => {
    // Crear compra de azúcar a 200 la unidad
    const prov = await request.post('/api/proveedores').set(auth())
      .send({ nombre: 'Proveedor Test' });
    const compra = await request.post('/api/compras').set(auth()).send({
      fecha_compra: '2026-08-05',
      proveedor_id: prov.body.id,
      detalles: [{ producto_id: granelId, cantidad: 10, precio_unitario: 200 }]
    });
    expect(compra.status).toBe(201);

    const inv = await request.post(`/api/compras/${compra.body.id}/inventariar`).set(auth());
    expect(inv.status).toBe(200);

    // Azúcar ahora cuesta 200 → A = 0.5×200 = 100, B = 100
    const pG = await request.get(`/api/productos/${granelId}`).set(auth());
    expect(pG.body.costo_base).toBeCloseTo(200, 2);

    const pA = await request.get(`/api/productos/${elaboradoAId}`).set(auth());
    expect(pA.body.costo_base).toBeCloseTo(100, 2);

    const pB = await request.get(`/api/productos/${elaboradoBId}`).set(auth());
    expect(pB.body.costo_base).toBeCloseTo(100, 2);
  });

  test('cambio de configuración general recalcula todos los precio_recomendado', async () => {
    const antes = await request.get(`/api/productos/${granelId}`).set(auth());
    const recomendadoAntes = antes.body.precio_recomendado;

    // Subir margen recomendado de 20 → 50 (manteniendo ventas proyectadas altas)
    const res = await request.put('/api/configuracion/general').set(auth())
      .send({ ventas_proyectadas: 500000, margen_recomendado: 50, impuesto_ventas: 15, redondeo_venta: 5, impuesto_ganancia: 35 });
    expect(res.status).toBe(200);

    const despues = await request.get(`/api/productos/${granelId}`).set(auth());
    expect(despues.body.precio_recomendado).not.toBe(recomendadoAntes);
    expect(despues.body.precio_recomendado).toBeGreaterThan(recomendadoAntes);
  });
});

describe('Tema pendiente #1: cambio de categoría restringido al mismo grupo raíz', () => {
  let catA, catB, catSubA, catNG, prodId;

  test('setup: crear categorías (dos raíces gravables + una no gravable hija de sistema)', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const rA = await db.run("INSERT INTO categorias (nombre, activo, gravable, es_sistema) VALUES ('Raíz A', 1, 1, 0)");
    catA = rA.lastID;
    const rB = await db.run("INSERT INTO categorias (nombre, activo, gravable, es_sistema) VALUES ('Raíz B', 1, 1, 0)");
    catB = rB.lastID;
    const rSub = await db.run("INSERT INTO categorias (nombre, padre_id, activo, gravable, es_sistema) VALUES ('Sub A', ?, 1, 1, 0)", [catA]);
    catSubA = rSub.lastID;
    const ngRoot = await db.get("SELECT id FROM categorias WHERE es_sistema = 1");
    const rNG = await db.run("INSERT INTO categorias (nombre, padre_id, activo, gravable, es_sistema) VALUES ('Informal', ?, 1, 0, 0)", [ngRoot.id]);
    catNG = rNG.lastID;
  });

  test('crear producto en la raíz A', async () => {
    const res = await request.post('/api/productos').set(auth())
      .field('codigo', 'CAT-1').field('nombre', 'Producto categoría').field('tipo', 'simple')
      .field('sub_tipo', 'reventa').field('unidad_venta_id', '1').field('categoria_id', String(catA));
    expect(res.status).toBe(201);
    prodId = res.body.id;
  });

  test('cambiar a otra categoría de la MISMA raíz (subcategoría de A) → 200', async () => {
    const res = await request.put(`/api/productos/${prodId}`).set(auth()).send({ categoria_id: String(catSubA) });
    expect(res.status).toBe(200);
  });

  test('cambiar a una categoría de OTRA raíz (B) → 400', async () => {
    const res = await request.put(`/api/productos/${prodId}`).set(auth()).send({ categoria_id: String(catB) });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('misma categoría raíz');
  });

  test('cambiar a una categoría NO gravable (mundo distinto) → 400', async () => {
    const res = await request.put(`/api/productos/${prodId}`).set(auth()).send({ categoria_id: String(catNG) });
    expect(res.status).toBe(400);
  });

  test('quitar la categoría de un producto con categoría → 400', async () => {
    const res = await request.put(`/api/productos/${prodId}`).set(auth()).send({ categoria_id: '' });
    expect(res.status).toBe(400);
  });
});
