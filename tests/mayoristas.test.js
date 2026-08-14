/**
 * Tests de Ventas Mayoristas (Sprint 5, docs/modulos/mayoristas.md).
 * Flujo: cliente + tramos → pedido → factura (venta mayorista + stock mayorista) → pagos → cancelación.
 * También: transferencias entre inventarios y rutas del dinero (banco/arqueo).
 * BD temporal desde migraciones. NO toca la BD real.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const TEST_DB = path.join(os.tmpdir(), `pos3_mayoristas_test_${process.pid}.db`);
process.env.DB_PATH = TEST_DB;
process.env.JWT_SECRET = 'pos3_test_secret';
process.env.NODE_ENV = 'test';

const { buildTestDb } = require('./helpers/testDb');

let request;
let adminToken;
let vendedorToken;
let catId;

beforeAll(async () => {
  await buildTestDb(TEST_DB);
  const app = require('../src/backend/app');
  request = require('supertest')(app);
  const resA = await request.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  const resV = await request.post('/api/auth/login').send({ username: 'vendedor', password: 'vendedor123' });
  adminToken = resA.body.token;
  vendedorToken = resV.body.token;
  const { getDb } = require('../src/backend/models/db');
  const db = await getDb();
  const cat = await db.get('SELECT id FROM categorias WHERE gravable = 1 AND es_sistema = 0');
  catId = cat.id;
  // Abrir turno: facturar/entregar pedidos requiere turno abierto (00-pendientes #1)
  await request.post('/api/ventas/abrir-turno').set({ Authorization: `Bearer ${adminToken}` }).send({ monto_apertura: 0 });
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

let clienteId, granelId, reventaId, conformadoId;

describe('Clientes y tramos', () => {
  test('crear cliente con condiciones comerciales', async () => {
    const res = await request.post('/api/clientes').set(auth())
      .send({ nombre: 'Distribuidora XYZ', contrato: 'CT-001', descuento_global: 5, limite_credito: 50000 });
    expect(res.status).toBe(201);
    clienteId = res.body.id;

    const lista = await request.get('/api/clientes').set(auth());
    expect(lista.body[0].nombre).toBe('Distribuidora XYZ');
    expect(lista.body[0].contrato).toBe('CT-001');
  });

  test('vendedor SÍ puede ver/crear clientes (regla del propietario), pero no editarlos', async () => {
    // GET y POST accesibles a vendedor (vende a estos clientes)
    expect((await request.get('/api/clientes').set({ Authorization: `Bearer ${vendedorToken}` })).status).toBe(200);
    const crear = await request.post('/api/clientes').set({ Authorization: `Bearer ${vendedorToken}` })
      .send({ nombre: 'Cliente del vendedor' });
    expect(crear.status).toBe(201);

    // pero EDITAR es solo admin → 403
    const editar = await request.put(`/api/clientes/${crear.body.id}`).set({ Authorization: `Bearer ${vendedorToken}` })
      .send({ nombre: 'Otro nombre' });
    expect(editar.status).toBe(403);
  });

  test('tramos de precio por volumen (con ficha de costo)', async () => {
    // Producto granel para vender por mayorista
    const g = await request.post('/api/productos').set(auth())
      .field('codigo', 'GM1').field('nombre', 'Cerveza Caja').field('tipo', 'simple')
      .field('sub_tipo', 'granel').field('unidad_venta_id', '1').field('unidad_compra_id', '1')
      .field('categoria_id', String(catId));
    granelId = g.body.id;

    // darle costo y stock mayorista directamente
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    await db.run('UPDATE productos SET costo_base = 8, stock_mayorista = 500 WHERE id = ?', [granelId]);

    // tramos: 1-50 → 10, 51+ → 9.5
    await request.post(`/api/mayoristas/tramos/${granelId}`).set(auth()).send({ desde: 1, hasta: 50, precio: 10 });
    await request.post(`/api/mayoristas/tramos/${granelId}`).set(auth()).send({ desde: 51, hasta: null, precio: 9.5 });

    const res = await request.get(`/api/mayoristas/tramos/${granelId}`).set(auth());
    expect(res.body.tramos.length).toBe(2);
    expect(res.body.producto.costo_base).toBe(8); // ficha de costo visible
  });
});

describe('Pedidos mayoristas', () => {
  let pedidoId;

  test('crear pedido: precio por tramo según cantidad + descuento global del cliente', async () => {
    const res = await request.post('/api/mayoristas/pedidos').set(auth())
      .send({
        cliente_id: clienteId,
        detalles: [{ producto_id: granelId, cantidad: 100 }] // tramo 51+ → 9.5
      });
    expect(res.status).toBe(201);
    pedidoId = res.body.id;

    const det = await request.get(`/api/mayoristas/pedidos/${pedidoId}`).set(auth());
    // 100 × 9.5 = 950, menos 5% descuento global = 902.5
    expect(det.body.detalles[0].precio_unitario).toBeCloseTo(9.5, 2);
    expect(det.body.total).toBeCloseTo(902.5, 2);
    expect(det.body.estado).toBe('pendiente');
  });

  test('conformado no se vende por mayorista → 400', async () => {
    const c = await request.post('/api/productos').set(auth())
      .field('codigo', 'CONF1').field('nombre', 'Café con leche').field('tipo', 'compuesto')
      .field('sub_tipo', 'conformado').field('unidad_venta_id', '1')
      .field('categoria_id', String(catId));
    conformadoId = c.body.id;

    const res = await request.post('/api/mayoristas/pedidos').set(auth())
      .send({ cliente_id: clienteId, detalles: [{ producto_id: conformadoId, cantidad: 10 }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/conformado/i);
  });

  test('facturar: crea venta mayorista y descuenta stock_mayorista', async () => {
    const res = await request.post(`/api/mayoristas/pedidos/${pedidoId}/facturar`).set(auth());
    expect(res.status).toBe(200);

    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();

    // stock mayorista descontado: 500 − 100 = 400
    const prod = await db.get('SELECT stock_mayorista, stock_actual FROM productos WHERE id = ?', [granelId]);
    expect(prod.stock_mayorista).toBeCloseTo(400, 2);
    expect(prod.stock_actual).toBe(0); // minorista intacto

    // venta creada con tipo mayorista y cliente
    const venta = await db.get('SELECT * FROM ventas WHERE id = ?', [(await db.get('SELECT venta_id FROM pedidos WHERE id = ?', [pedidoId])).venta_id]);
    expect(venta.tipo_venta).toBe('mayorista');
    expect(venta.cliente_id).toBe(clienteId);
    expect(venta.turno_id).toBeNull();
    expect(venta.total).toBeCloseTo(902.5, 2);

    // movimiento de stock con inventario mayorista
    const mov = await db.get("SELECT * FROM movimientos_stock WHERE producto_id = ? AND tipo = 'venta'", [granelId]);
    expect(mov.inventario).toBe('mayorista');
  });

  test('facturar dos veces → 400', async () => {
    const res = await request.post(`/api/mayoristas/pedidos/${pedidoId}/facturar`).set(auth());
    expect(res.status).toBe(400);
  });

  test('pagos parciales: efectivo → arqueo; transferencia → banco', async () => {
    // cobro 1: 500 efectivo
    const p1 = await request.post(`/api/mayoristas/pedidos/${pedidoId}/pagos`).set(auth())
      .send({ monto: 500, metodo_pago: 'efectivo' });
    expect(p1.body.estado_pago).toBe('parcial');

    // cobro 2: 402.5 transferencia → pagado
    const p2 = await request.post(`/api/mayoristas/pedidos/${pedidoId}/pagos`).set(auth())
      .send({ monto: 402.5, metodo_pago: 'transferencia', referencia: 'TRF-1' });
    expect(p2.body.estado_pago).toBe('pagado');

    // el banco incluye el cobro por transferencia
    const banco = await request.get('/api/contabilidad/banco').set(auth());
    expect(banco.body.data.desglose.cobros_mayoristas).toBeCloseTo(402.5, 2);

    // sobrepago rechazado
    const p3 = await request.post(`/api/mayoristas/pedidos/${pedidoId}/pagos`).set(auth())
      .send({ monto: 10, metodo_pago: 'efectivo' });
    expect(p3.status).toBe(400);
  });

  test('cuentas por cobrar ya no incluye el pedido pagado', async () => {
    const res = await request.get('/api/mayoristas/cuentas-por-cobrar').set(auth());
    expect(res.body.find(c => c.id === pedidoId)).toBeUndefined();
  });
});

describe('Transferencias entre inventarios', () => {
  test('mover stock minorista → mayorista y viceversa', async () => {
    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();

    // crear reventa con stock minorista
    const r = await request.post('/api/productos').set(auth())
      .field('codigo', 'REV9').field('nombre', 'Pomo Refresco').field('tipo', 'simple')
      .field('sub_tipo', 'reventa').field('unidad_venta_id', '1')
      .field('categoria_id', String(catId));
    reventaId = r.body.id;
    await db.run('UPDATE productos SET stock_actual = 50 WHERE id = ?', [reventaId]);

    const res = await request.post('/api/inventario/transferencia').set(auth())
      .send({ producto_id: reventaId, cantidad: 20, direccion: 'a_mayorista' });
    expect(res.status).toBe(200);

    const prod = await db.get('SELECT stock_actual, stock_mayorista FROM productos WHERE id = ?', [reventaId]);
    expect(prod.stock_actual).toBe(30);
    expect(prod.stock_mayorista).toBe(20);

    // volver
    await request.post('/api/inventario/transferencia').set(auth())
      .send({ producto_id: reventaId, cantidad: 5, direccion: 'a_minorista' });
    const prod2 = await db.get('SELECT stock_actual, stock_mayorista FROM productos WHERE id = ?', [reventaId]);
    expect(prod2.stock_actual).toBe(35);
    expect(prod2.stock_mayorista).toBe(15);

    // stock insuficiente
    const fail = await request.post('/api/inventario/transferencia').set(auth())
      .send({ producto_id: reventaId, cantidad: 999, direccion: 'a_mayorista' });
    expect(fail.status).toBe(400);
  });

  test('conformado no se transfiere → 400', async () => {
    const res = await request.post('/api/inventario/transferencia').set(auth())
      .send({ producto_id: conformadoId, cantidad: 1, direccion: 'a_mayorista' });
    expect(res.status).toBe(400);
  });
});

describe('Cancelación y vencidos', () => {
  test('cancelar pedido facturado: anula venta y devuelve stock mayorista', async () => {
    // crear y facturar otro pedido
    const ped = await request.post('/api/mayoristas/pedidos').set(auth())
      .send({ cliente_id: clienteId, detalles: [{ producto_id: granelId, cantidad: 50 }] });
    const pid = ped.body.id;
    await request.post(`/api/mayoristas/pedidos/${pid}/facturar`).set(auth());

    const res = await request.post(`/api/mayoristas/pedidos/${pid}/cancelar`).set(auth());
    expect(res.status).toBe(200);

    const { getDb } = require('../src/backend/models/db');
    const db = await getDb();
    const prod = await db.get('SELECT stock_mayorista FROM productos WHERE id = ?', [granelId]);
    expect(prod.stock_mayorista).toBeCloseTo(400, 2); // 400 − 50 + 50

    const venta = await db.get('SELECT estado FROM ventas WHERE id = (SELECT venta_id FROM pedidos WHERE id = ?)', [pid]);
    expect(venta.estado).toBe('anulada');
  });

  test('pedido vencido aparece en el filtro de vencidos', async () => {
    const ped = await request.post('/api/mayoristas/pedidos').set(auth())
      .send({ cliente_id: clienteId, fecha_vencimiento: '2026-01-01', detalles: [{ producto_id: granelId, cantidad: 1 }] });

    const res = await request.get('/api/mayoristas/pedidos?filtro=vencidos').set(auth());
    expect(res.body.find(p => p.id === ped.body.id)).toBeTruthy();

    // extender lo saca de vencidos
    await request.post(`/api/mayoristas/pedidos/${ped.body.id}/extender`).set(auth())
      .send({ fecha_vencimiento: '2030-01-01' });
    const res2 = await request.get('/api/mayoristas/pedidos?filtro=vencidos').set(auth());
    expect(res2.body.find(p => p.id === ped.body.id)).toBeUndefined();
  });
});
