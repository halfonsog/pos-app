/**
 * mayoristas.js — Módulo de Ventas Mayoristas (diseño: docs/modulos/mayoristas.md)
 * Panel, clientes, pedidos, precios por volumen. Sin turnos: efectivo→caja (arqueo), tarjeta/transferencia→banco.
 */
var Mayoristas = window.Mayoristas || {};

// ═══════════════════════ PANEL ═══════════════════════
Mayoristas.index = async function () {
  try {
    Utils.showLoading('Cargando...');
    const resumen = await API.mayoristas.resumen();

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('mayoristas')}
        <main class="main-content">
          ${Mayoristas.renderNavbar()}
          <div class="container-fluid p-4">
            <h2 class="mb-4"><i class="fas fa-handshake me-2"></i>Ventas Mayoristas</h2>

            <div class="row g-3 mb-4">
              <div class="col-6 col-md-3">
                <div class="summary-card border-primary clickable" data-route="mayoristas/pedidos" style="cursor:pointer">
                  <div class="summary-content text-center">
                    <h3 class="summary-number text-primary">${Utils.formatMoney(resumen.ventas_mes, 0)}</h3>
                    <p class="summary-label"><i class="fas fa-chart-line me-1"></i>Ventas del Mes</p>
                  </div>
                  <div class="summary-details"><small>${resumen.ventas_mes_cantidad} pedidos</small></div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="summary-card border-warning clickable" data-route="mayoristas/pedidos?filtro=por-cobrar" style="cursor:pointer">
                  <div class="summary-content text-center">
                    <h3 class="summary-number text-warning">${Utils.formatMoney(resumen.por_cobrar, 0)}</h3>
                    <p class="summary-label"><i class="fas fa-hand-holding-usd me-1"></i>Por Cobrar</p>
                  </div>
                  <div class="summary-details"><small>${resumen.por_cobrar_cantidad} cuentas</small></div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="summary-card border-info clickable" data-route="mayoristas/pedidos?estado=pendiente" style="cursor:pointer">
                  <div class="summary-content text-center">
                    <h3 class="summary-number text-info">${resumen.pedidos_pendientes}</h3>
                    <p class="summary-label"><i class="fas fa-clock me-1"></i>Pendientes</p>
                  </div>
                  <div class="summary-details"><small>Por facturar</small></div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="summary-card border-${resumen.pedidos_vencidos > 0 ? 'danger' : 'success'} clickable" data-route="mayoristas/pedidos?filtro=vencidos" style="cursor:pointer">
                  <div class="summary-content text-center">
                    <h3 class="summary-number text-${resumen.pedidos_vencidos > 0 ? 'danger' : 'success'}">${resumen.pedidos_vencidos}</h3>
                    <p class="summary-label"><i class="fas fa-exclamation-triangle me-1"></i>Vencidos</p>
                  </div>
                  <div class="summary-details"><small>${resumen.pedidos_vencidos > 0 ? '¡Decidir: extender o cancelar!' : 'Al día ✓'}</small></div>
                </div>
              </div>
            </div>

            <div class="quick-actions-bar mb-4">
              <button class="btn btn-primary" data-route="mayoristas/nuevo"><i class="fas fa-plus me-1"></i>Nuevo Pedido</button>
              <button class="btn btn-outline-primary" data-route="mayoristas/clientes"><i class="fas fa-users me-1"></i>Clientes</button>
              <button class="btn btn-outline-primary" data-route="mayoristas/pedidos"><i class="fas fa-list me-1"></i>Pedidos</button>
              <button class="btn btn-outline-secondary" data-route="mayoristas/tramos"><i class="fas fa-layer-group me-1"></i>Precios por Volumen</button>
            </div>

            <div class="dashboard-card" id="porCobrarCard">
              <div class="card-header-custom"><h5><i class="fas fa-hand-holding-usd me-2"></i>Cuentas por Cobrar</h5></div>
              <div id="porCobrarContenido"><div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i></div></div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Mayoristas.bindCommonEvents();
    Mayoristas.cargarCuentasPorCobrar();
    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error(error);
    Toast.error('Error al cargar mayoristas');
  }
};

Mayoristas.cargarCuentasPorCobrar = async function () {
  try {
    const cuentas = await API.mayoristas.cuentasPorCobrar();
    const filas = cuentas.map(c => `
      <tr class="${c.dias_atraso > 0 ? 'table-danger' : ''}" style="cursor:pointer" onclick="ViewManager.navegar('mayoristas/pedidos/${c.id}')">
        <td><strong>${c.cliente_nombre}</strong><br><small class="text-muted">${c.contrato || ''}</small></td>
        <td>#${c.id} · ${Utils.formatearFecha(Utils.fechaISOToLocal(c.fecha), 'fecha')}</td>
        <td class="text-end">${Utils.formatMoney(c.total)}</td>
        <td class="text-end fw-bold">${Utils.formatMoney(c.pendiente)}</td>
        <td class="text-center">${c.dias_atraso > 0 ? `<span class="badge bg-danger">${c.dias_atraso} días de atraso</span>` : '<span class="badge bg-success">En plazo</span>'}</td>
      </tr>
    `).join('');

    $('#porCobrarContenido').html(cuentas.length === 0
      ? '<p class="text-muted text-center py-3 mb-0">No hay cuentas por cobrar 🎉</p>'
      : `<div class="table-responsive"><table class="table table-hover mb-0">
          <thead class="table-light"><tr><th>Cliente</th><th>Pedido</th><th class="text-end">Total</th><th class="text-end">Pendiente</th><th class="text-center">Estado</th></tr></thead>
          <tbody>${filas}</tbody></table></div>`);
  } catch (error) {
    $('#porCobrarContenido').html('<p class="text-danger text-center py-3 mb-0">Error al cargar cuentas</p>');
  }
};

// ═══════════════════════ PEDIDOS (LISTADO) ═══════════════════════
Mayoristas.pedidos = async function (params) {
  try {
    Utils.showLoading('Cargando...');
    const filtro = params.filtro || null;
    const estado = params.estado || null;
    let query = [];
    if (filtro) query.push(`filtro=${filtro}`);
    if (estado) query.push(`estado=${estado}`);
    const pedidos = await API.mayoristas.listarPedidos(query.length ? '?' + query.join('&') : '');

    const estadoBadge = {
      pendiente: '<span class="badge bg-warning text-dark">Pendiente</span>',
      parcial: '<span class="badge bg-info text-dark">Facturación parcial</span>',
      facturado: '<span class="badge bg-info">Facturado</span>',
      entregado: '<span class="badge bg-success">Entregado</span>',
      cancelado: '<span class="badge bg-secondary">Cancelado</span>'
    };
    const pagoBadge = {
      pendiente: '<span class="badge bg-danger">Sin cobrar</span>',
      parcial: '<span class="badge bg-warning text-dark">Parcial</span>',
      pagado: '<span class="badge bg-success">Pagado</span>'
    };

    const filas = pedidos.map(p => `
      <tr class="${p.vencido ? 'table-danger' : ''}" style="cursor:pointer" onclick="ViewManager.navegar('mayoristas/pedidos/${p.id}')">
        <td><strong>#${p.id}</strong>${p.vencido ? ' <span class="badge bg-danger">VENCIDO</span>' : ''}</td>
        <td>${p.cliente_nombre}</td>
        <td>${Utils.formatearFecha(Utils.fechaISOToLocal(p.fecha), 'fecha')}</td>
        <td>${p.fecha_vencimiento ? Utils.formatearFecha(Utils.fechaISOToLocal(p.fecha_vencimiento), 'fecha') : '—'}</td>
        <td class="text-center">${estadoBadge[p.estado] || p.estado}</td>
        <td class="text-center">${pagoBadge[p.estado_pago] || p.estado_pago}</td>
        <td class="text-end fw-bold">${Utils.formatMoney(p.total)}</td>
      </tr>
    `).join('');

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('mayoristas')}
        <main class="main-content">
          ${Mayoristas.renderNavbar()}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3"><ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#mayoristas">Mayoristas</a></li>
              <li class="breadcrumb-item active">Pedidos</li>
            </ol></nav>
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h2 class="mb-0"><i class="fas fa-file-invoice me-2"></i>Pedidos Mayoristas</h2>
              <button class="btn btn-primary" data-route="mayoristas/nuevo"><i class="fas fa-plus me-1"></i>Nuevo Pedido</button>
            </div>
            <div class="mb-3 btn-group flex-wrap">
              <button class="btn btn-outline-primary ${!filtro && !estado ? 'active' : ''}" data-route="mayoristas/pedidos">Todos</button>
              <button class="btn btn-outline-warning ${estado === 'pendiente' ? 'active' : ''}" data-route="mayoristas/pedidos?estado=pendiente">Pendientes</button>
              <button class="btn btn-outline-info ${estado === 'facturado' ? 'active' : ''}" data-route="mayoristas/pedidos?estado=facturado">Facturados</button>
              <button class="btn btn-outline-success ${estado === 'entregado' ? 'active' : ''}" data-route="mayoristas/pedidos?estado=entregado">Entregados</button>
              <button class="btn btn-outline-danger ${filtro === 'por-cobrar' ? 'active' : ''}" data-route="mayoristas/pedidos?filtro=por-cobrar">Por Cobrar</button>
              <button class="btn btn-outline-danger ${filtro === 'vencidos' ? 'active' : ''}" data-route="mayoristas/pedidos?filtro=vencidos">Vencidos</button>
            </div>
            <div class="card"><div class="card-body p-0">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr><th>#</th><th>Cliente</th><th>Fecha</th><th>Vence</th><th class="text-center">Estado</th><th class="text-center">Pago</th><th class="text-end">Total</th></tr>
                </thead>
                <tbody>${filas || '<tr><td colspan="7" class="text-center text-muted py-4">No hay pedidos con ese filtro</td></tr>'}</tbody>
              </table>
            </div></div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Mayoristas.bindCommonEvents();
    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error(error);
    Toast.error('Error al cargar pedidos');
  }
};

// ═══════════════════════ NUEVO PEDIDO ═══════════════════════
Mayoristas.nuevo = async function (params) {
  params = params || {};
  try {
    Utils.showLoading('Cargando...');
    const [clientes, productos] = await Promise.all([API.clientes.listar(), API.productos.listar()]);
    const productosValidos = productos.filter(p => p.activo && !(p.tipo === 'compuesto' && p.sub_tipo === 'conformado'));

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('mayoristas')}
        <main class="main-content">
          ${Mayoristas.renderNavbar()}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3"><ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#mayoristas">Mayoristas</a></li>
              <li class="breadcrumb-item"><a href="#mayoristas/pedidos">Pedidos</a></li>
              <li class="breadcrumb-item active">Nuevo</li>
            </ol></nav>
            <div class="d-flex align-items-center mb-4">
              <button class="btn btn-outline-secondary me-3" id="btnVolver"><i class="fas fa-arrow-left me-1"></i>Volver</button>
              <h2 class="mb-0"><i class="fas fa-plus-circle me-2"></i>Nuevo Pedido Mayorista</h2>
            </div>

            <div class="row">
              <div class="col-lg-8">
                <div class="card mb-3">
                  <div class="card-body">
                    <div class="row g-3">
                      <div class="col-md-5">
                        <label class="form-label">Cliente *</label>
                        <select class="form-select" id="pedidoCliente">
                          <option value="">— Seleccionar —</option>
                          ${clientes.filter(c => c.activo).map(c => `<option value="${c.id}" data-descuento="${c.descuento_global || 0}" ${params.cliente_id == c.id ? 'selected' : ''}>${c.nombre}${c.contrato ? ' (' + c.contrato + ')' : ''}</option>`).join('')}
                        </select>
                      </div>
                      <div class="col-md-2">
                        <label class="form-label">Fecha del pedido</label>
                        <input type="date" class="form-control" id="pedidoFecha">
                      </div>
                      <div class="col-md-2">
                        <label class="form-label">Vencimiento</label>
                        <input type="date" class="form-control" id="pedidoVencimiento">
                      </div>
                      <div class="col-md-3">
                        <label class="form-label">Nº de contrato del cliente</label>
                        <input type="text" class="form-control" id="pedidoContrato" readonly disabled>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="card mb-3">
                  <div class="card-header d-flex gap-2 align-items-end">
                    <div class="flex-grow-1">
                      <label class="form-label mb-1">Producto</label>
                      <select class="form-select form-select-sm" id="lineaProducto">
                        <option value="">— Agregar producto —</option>
                        ${productosValidos.map(p => `<option value="${p.id}" data-precio="${p.precio_venta}" data-stockm="${p.stock_mayorista || 0}" data-unidad="${p.unidad_compra_abrev || p.unidad_venta_abrev || ''}">${p.nombre} (${p.codigo})</option>`).join('')}
                      </select>
                    </div>
                    <div style="width:120px">
                      <label class="form-label mb-1">Cantidad</label>
                      <input type="number" class="form-control form-control-sm" id="lineaCantidad" step="0.01" min="0.01" value="1">
                    </div>
                    <button class="btn btn-sm btn-primary" id="btnAgregarLinea"><i class="fas fa-plus"></i></button>
                  </div>
                  <div class="card-body p-0">
                    <table class="table table-sm mb-0">
                      <thead class="table-light"><tr><th>Producto</th><th class="text-end">Cantidad</th><th class="text-end">Precio</th><th class="text-end">Total</th><th></th></tr></thead>
                      <tbody id="lineasBody"><tr id="lineasVacio"><td colspan="5" class="text-center text-muted py-3">Agrega productos al pedido</td></tr></tbody>
                    </table>
                    <div class="p-3 border-top">
                      <label class="form-label mb-1">Observaciones</label>
                      <textarea class="form-control" id="pedidoObs" rows="2" placeholder="Referencia, teléfono, notas del pedido..."></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-lg-4">
                <div class="card">
                  <div class="card-header"><strong>Resumen</strong></div>
                  <div class="card-body">
                    <div class="d-flex justify-content-between mb-2"><span>Subtotal:</span><strong id="resumenSubtotal">0.00</strong></div>
                    <div class="d-flex justify-content-between mb-2"><span>Descuento cliente:</span><strong id="resumenDescuento" class="text-danger">0%</strong></div>
                    <hr>
                    <div class="d-flex justify-content-between fs-5"><span>Total:</span><strong id="resumenTotal" class="text-primary">0.00</strong></div>
                    <div class="d-grid mt-3 gap-2">
                      <button class="btn btn-primary" id="btnGuardarPedido"><i class="fas fa-save me-1"></i>Guardar Pedido</button>
                      <button class="btn btn-info" id="btnGuardarYFacturar"><i class="fas fa-bolt me-1"></i>Crear y Facturar (venta directa)</button>
                    </div>
                    <small class="text-muted d-block mt-2">Los precios se calculan por tramos de volumen; sin tramo, precio minorista. Cantidades en unidad de compra (mayorista).</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Mayoristas.bindCommonEvents();
    $('#btnVolver').on('click', () => ViewManager.volver());

    // Fecha del pedido: hoy por defecto; vencimiento = fecha del pedido por defecto
    const hoy = new Date().toISOString().split('T')[0];
    $('#pedidoFecha').val(hoy);
    $('#pedidoVencimiento').val(hoy);
    $('#pedidoFecha').on('change', function () {
      if (!$('#pedidoVencimiento').data('tocado')) $('#pedidoVencimiento').val($(this).val());
    });
    $('#pedidoVencimiento').on('change', function () { $(this).data('tocado', true); });

    // Contrato del cliente seleccionado (informativo)
    const clienteSeleccionado = () => $('#pedidoCliente option:selected').text();
    $('#pedidoCliente').on('change', function () {
      $('#pedidoContrato').val(clienteSeleccionado().match(/\((.+)\)/)?.[1] || '');
      actualizarResumen();
    });

    Mayoristas._lineas = [];

    const actualizarResumen = () => {
      const subtotal = Mayoristas._lineas.reduce((s, l) => s + l.total, 0);
      const descuento = parseFloat($('#pedidoCliente option:selected').data('descuento')) || 0;
      const total = subtotal * (1 - descuento / 100);
      $('#resumenSubtotal').text(Utils.formatMoney(subtotal));
      $('#resumenDescuento').text(descuento + '%');
      $('#resumenTotal').text(Utils.formatMoney(total));
    };

    $('#pedidoCliente').on('change', actualizarResumen);
    $('#btnAgregarLinea').on('click', async function () {
      const prodId = parseInt($('#lineaProducto').val());
      const cantidad = parseFloat($('#lineaCantidad').val());
      if (!prodId || !cantidad || cantidad <= 0) return Toast.warning('Selecciona producto y cantidad');

      const opt = $('#lineaProducto option:selected');
      const existente = Mayoristas._lineas.find(l => l.producto_id === prodId);
      if (existente) {
        existente.cantidad += cantidad;
        Toast.info('Cantidad sumada a la línea existente');
      } else {
        Mayoristas._lineas.push({
          producto_id: prodId,
          nombre: opt.text(),
          unidad: opt.data('unidad'),
          cantidad,
          precio_unitario: parseFloat(opt.data('precio')),
          total: 0
        });
      }

      // Recalcular precios por tramo en el servidor (consulta rápida por línea)
      for (const l of Mayoristas._lineas) {
        const res = await API.get(`/mayoristas/tramos/${l.producto_id}`);
        let precio = parseFloat($('#lineaProducto option[value="' + l.producto_id + '"]').data('precio'));
        const tramo = (res.tramos || []).filter(t => l.cantidad >= t.desde && (t.hasta === null || l.cantidad <= t.hasta)).sort((a, b) => b.desde - a.desde)[0];
        l.precio_unitario = tramo ? tramo.precio : precio;
        l.total = l.precio_unitario * l.cantidad;
      }

      $('#lineasVacio').hide();
      $('#lineasBody').find('tr.linea').remove();
      Mayoristas._lineas.forEach((l, i) => {
        $('#lineasBody').append(`
          <tr class="linea">
            <td>${l.nombre}</td>
            <td class="text-end">${Utils.formatNumber(l.cantidad, 2)} ${l.unidad}</td>
            <td class="text-end">${Utils.formatMoney(l.precio_unitario)}</td>
            <td class="text-end fw-bold">${Utils.formatMoney(l.total)}</td>
            <td class="text-center"><button class="btn btn-sm btn-outline-danger quitar-linea" data-i="${i}"><i class="fas fa-times"></i></button></td>
          </tr>
        `);
      });

      $('.quitar-linea').on('click', function () {
        Mayoristas._lineas.splice(parseInt($(this).data('i')), 1);
        $(this).closest('tr').remove();
        if (Mayoristas._lineas.length === 0) $('#lineasVacio').show();
        actualizarResumen();
      });

      actualizarResumen();
    });

    $('#btnGuardarPedido').on('click', async function () {
      const clienteId = $('#pedidoCliente').val();
      if (!clienteId) return Toast.warning('Selecciona el cliente');
      if (Mayoristas._lineas.length === 0) return Toast.warning('Agrega al menos un producto');

      try {
        Utils.showLoading('Guardando...');
        const res = await API.mayoristas.crearPedido({
          cliente_id: parseInt(clienteId),
          fecha: $('#pedidoFecha').val() || undefined,
          fecha_vencimiento: $('#pedidoVencimiento').val() || null,
          observaciones: $('#pedidoObs').val().trim() || null,
          detalles: Mayoristas._lineas.map(l => ({ producto_id: l.producto_id, cantidad: l.cantidad }))
        });
        Utils.hideLoading();
        Toast.success('Pedido creado');
        ViewManager.navegar(`mayoristas/pedidos/${res.id}`);
      } catch (error) {
        Utils.hideLoading();
        Toast.error(error.message || 'Error al guardar el pedido');
      }
    });

    // Crear y Facturar (venta directa sin pedido previo)
    $('#btnGuardarYFacturar').on('click', async function () {
      const clienteId = $('#pedidoCliente').val();
      if (!clienteId) return Toast.warning('Selecciona el cliente');
      if (Mayoristas._lineas.length === 0) return Toast.warning('Agrega al menos un producto');
      if (!await Utils.confirm('¿Crear el pedido y facturarlo ahora mismo? (venta directa)', 'Confirmar')) return;

      try {
        Utils.showLoading('Creando y facturando...');
        const res = await API.mayoristas.crearPedido({
          cliente_id: parseInt(clienteId),
          fecha: $('#pedidoFecha').val() || undefined,
          fecha_vencimiento: $('#pedidoVencimiento').val() || null,
          observaciones: $('#pedidoObs').val().trim() || null,
          detalles: Mayoristas._lineas.map(l => ({ producto_id: l.producto_id, cantidad: l.cantidad }))
        });
        const fac = await API.mayoristas.facturarPedido(res.id);
        Utils.hideLoading();
        Toast.success(`Pedido creado y facturado (venta #${fac.venta_id})`);
        if (fac.alerta_backorder) Toast.warning(fac.alerta_backorder);
        ViewManager.navegar(`mayoristas/pedidos/${res.id}`);
      } catch (error) {
        Utils.hideLoading();
        Toast.error(error.message || 'Error al crear y facturar');
      }
    });

    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error(error);
    Toast.error('Error al cargar el formulario');
  }
};

// ═══════════════════════ FICHA DE PEDIDO ═══════════════════════
Mayoristas.pedidoFicha = async function (params) {
  try {
    Utils.showLoading('Cargando...');
    const p = await API.mayoristas.obtenerPedido(params.id);

    const estadoBadge = {
      pendiente: '<span class="badge bg-warning text-dark">Pendiente</span>',
      parcial: '<span class="badge bg-info text-dark">Facturación parcial</span>',
      facturado: '<span class="badge bg-info">Facturado</span>',
      entregado: '<span class="badge bg-success">Entregado</span>',
      cancelado: '<span class="badge bg-secondary">Cancelado</span>'
    };

    const vencido = p.fecha_vencimiento && ['pendiente', 'facturado'].includes(p.estado) &&
      new Date(p.fecha_vencimiento) < new Date(new Date().toDateString());

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('mayoristas')}
        <main class="main-content">
          ${Mayoristas.renderNavbar()}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3"><ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#mayoristas">Mayoristas</a></li>
              <li class="breadcrumb-item"><a href="#mayoristas/pedidos">Pedidos</a></li>
              <li class="breadcrumb-item active">#${p.id}</li>
            </ol></nav>
            <div class="d-flex align-items-center mb-4">
              <button class="btn btn-outline-secondary me-3" id="btnVolver"><i class="fas fa-arrow-left me-1"></i>Volver</button>
              <h2 class="mb-0 me-3">Pedido #${p.id}</h2>
              ${estadoBadge[p.estado]}
              ${vencido ? '<span class="badge bg-danger ms-2">VENCIDO</span>' : ''}
            </div>

            ${vencido ? `
              <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i><strong>Este pedido venció el ${Utils.formatearFecha(Utils.fechaISOToLocal(p.fecha_vencimiento), 'fecha')}.</strong>
                Debes decidir: <button class="btn btn-sm btn-warning ms-2" id="btnExtender"><i class="fas fa-calendar-plus me-1"></i>Extender vencimiento</button>
                <button class="btn btn-sm btn-danger ms-2" id="btnCancelarVencido"><i class="fas fa-ban me-1"></i>Cancelar pedido</button>
              </div>` : ''}

            <div class="row g-4">
              <div class="col-lg-7">
                <div class="card mb-3">
                  <div class="card-header"><strong><i class="fas fa-user me-1"></i>${p.cliente_nombre}</strong></div>
                  <div class="card-body">
                    <div class="row">
                      <div class="col-6"><small class="text-muted">Contrato</small><p>${p.cliente_contrato || '—'}</p></div>
                      <div class="col-6"><small class="text-muted">Condición de pago</small><p>${p.condicion_pago_nombre || 'Contado'}</p></div>
                      <div class="col-6"><small class="text-muted">Fecha</small><p>${Utils.formatearFecha(Utils.fechaISOToLocal(p.fecha), 'fecha')}</p></div>
                      <div class="col-6"><small class="text-muted">Vence</small><p>${p.fecha_vencimiento ? Utils.formatearFecha(Utils.fechaISOToLocal(p.fecha_vencimiento), 'fecha') : '—'}</p></div>
                      <div class="col-6"><small class="text-muted">Registrado por</small><p>${p.vendedor_nombre || '—'}</p></div>
                      <div class="col-6"><small class="text-muted">Observaciones</small><p>${p.observaciones || '—'}</p></div>
                    </div>
                  </div>
                </div>

                <div class="card">
                  <div class="card-header"><strong>Productos</strong></div>
                  <div class="card-body p-0">
                    <table class="table table-sm mb-0">
                      <thead class="table-light"><tr><th>Producto</th><th class="text-end">Cantidad</th><th class="text-end">Facturado</th><th class="text-end">Restante</th><th class="text-end">Precio</th><th class="text-end">Total</th></tr></thead>
                      <tbody>
                        ${p.detalles.map(d => `<tr>
                          <td>${d.producto_nombre} <small class="text-muted">${d.producto_codigo}</small></td>
                          <td class="text-end">${Utils.formatNumber(d.cantidad, 2)} ${d.unidad_abrev || ''}</td>
                          <td class="text-end ${d.cantidad_facturada > 0 ? 'text-success fw-bold' : 'text-muted'}">${d.cantidad_facturada > 0 ? Utils.formatNumber(d.cantidad_facturada, 2) : '—'}</td>
                          <td class="text-end ${d.restante > 0 ? 'text-warning fw-bold' : 'text-muted'}">${d.restante > 0 ? Utils.formatNumber(d.restante, 2) : '—'}</td>
                          <td class="text-end">${Utils.formatMoney(d.precio_unitario)}</td>
                          <td class="text-end">${Utils.formatMoney(d.total)}</td>
                        </tr>`).join('')}
                      </tbody>
                      <tfoot class="table-light">
                        <tr><th colspan="4"></th><th class="text-end">Subtotal (neto)</th><th class="text-end">${Utils.formatMoney(p.subtotal)}</th></tr>
                        <tr><th colspan="4"></th><th class="text-end">Impuesto incluido</th><th class="text-end">${Utils.formatMoney(p.impuesto)}</th></tr>
                        <tr><th colspan="4"></th><th class="text-end">TOTAL</th><th class="text-end fs-5">${Utils.formatMoney(p.total)}</th></tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              <div class="col-lg-5">
                <div class="card mb-3">
                  <div class="card-header"><strong><i class="fas fa-money-bill me-1"></i>Cobros</strong> (${Utils.formatMoney(p.pagado)} de ${Utils.formatMoney(p.total)})</div>
                  <div class="card-body">
                    ${p.pagos.length === 0 ? '<p class="text-muted mb-2">Sin cobros aún</p>' : p.pagos.map(pg => `
                      <div class="d-flex justify-content-between border-bottom py-1">
                        <span><span class="badge bg-${pg.metodo_pago === 'efectivo' ? 'success' : pg.metodo_pago === 'tarjeta' ? 'info' : 'primary'}">${pg.metodo_pago}</span> <small class="text-muted">${Utils.formatearFecha(Utils.fechaISOToLocal(pg.fecha), 'fecha')}</small></span>
                        <strong>${pg.moneda === 'USD' ? `$${Utils.formatNumber(pg.monto, 2)} <small class="text-muted">(tasa ${pg.tasa_cambio})</small>` : Utils.formatMoney(pg.monto)}</strong>
                      </div>
                    `).join('')}
                    ${p.estado !== 'cancelado' && p.estado_pago !== 'pagado' && p.estado !== 'pendiente' ? `
                      <div class="d-grid mt-3"><button class="btn btn-success" id="btnCobrar"><i class="fas fa-money-bill me-1"></i>Registrar Cobro (pendiente: ${Utils.formatMoney(p.total - p.pagado)})</button></div>
                    ` : ''}
                    ${p.estado === 'pendiente' ? '<small class="text-muted d-block mt-2">Factura primero el pedido para poder cobrar.</small>' : ''}
                  </div>
                </div>

                <div class="card">
                  <div class="card-header"><strong>Acciones</strong></div>
                  <div class="card-body d-grid gap-2">
                    ${['pendiente', 'parcial'].includes(p.estado) ? `
                      <button class="btn btn-info" id="btnFacturar"><i class="fas fa-file-invoice me-1"></i>Facturar ${p.estado === 'parcial' ? 'lo restante' : 'completo'}</button>
                      <button class="btn btn-outline-info" id="btnFacturarParcial"><i class="fas fa-cut me-1"></i>Facturación parcial...</button>
                    ` : ''}
                    ${p.estado === 'facturado' ? `<button class="btn btn-success" id="btnEntregar"><i class="fas fa-truck me-1"></i>Marcar Entregado</button>` : ''}
                    ${['pendiente', 'parcial', 'facturado'].includes(p.estado) ? `<button class="btn btn-outline-danger" id="btnCancelar"><i class="fas fa-ban me-1"></i>Cancelar Pedido</button>` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Mayoristas.bindCommonEvents();
    $('#btnVolver').on('click', () => ViewManager.volver());

    $('#btnFacturar').on('click', async function () {
      if (!await Utils.confirm('¿Facturar todo lo restante? Se descuenta el stock mayorista y entra en las ventas del día.', 'Confirmar facturación')) return;
      try {
        const res = await API.mayoristas.facturarPedido(p.id);
        Toast.success(res.message);
        if (res.alerta_backorder) Toast.warning(res.alerta_backorder);
        ViewManager.refresh();
      } catch (error) { Toast.error(error.message); }
    });

    // Facturación parcial por línea (con modal, no prompt)
    $('#btnFacturarParcial').on('click', async function () {
      const pendientes = p.detalles.filter(x => x.restante > 0);
      if (pendientes.length === 0) return Toast.warning('Nada pendiente por facturar');

      FormModal.show({
        title: 'Facturación parcial (cantidad a facturar por línea)',
        submitLabel: 'Facturar',
        fields: pendientes.map(d => ({
          id: `linea_${d.id}`,
          label: `${d.producto_nombre} (restante: ${Utils.formatNumber(d.restante, 2)} ${d.unidad_abrev || ''})`,
          type: 'number', value: d.restante, min: 0, step: 0.01
        })),
        onSubmit: async (v) => {
          const lineas = pendientes
            .map(d => ({ detalle_id: d.id, cantidad: v[`linea_${d.id}`] || 0 }))
            .filter(l => l.cantidad > 0);
          if (lineas.length === 0) { Toast.warning('Nada que facturar con esas cantidades'); return false; }
          try {
            const res = await API.mayoristas.facturarPedido(p.id, { lineas });
            Toast.success(res.message);
            if (res.alerta_backorder) Toast.warning(res.alerta_backorder);
            ViewManager.refresh();
          } catch (error) {
            Toast.error(error.message);
            return false;
          }
        }
      });
    });

    $('#btnEntregar').on('click', async function () {
      try {
        await API.mayoristas.entregarPedido(p.id);
        Toast.success('Pedido entregado');
        ViewManager.refresh();
      } catch (error) { Toast.error(error.message); }
    });

    const cancelar = async function () {
      if (!await Utils.confirm('¿Cancelar el pedido? Si estaba facturado, la venta se anula y el stock mayorista se devuelve.', 'Confirmar cancelación')) return;
      try {
        await API.mayoristas.cancelarPedido(p.id);
        Toast.success('Pedido cancelado');
        ViewManager.navegar('mayoristas/pedidos');
      } catch (error) { Toast.error(error.message); }
    };
    $('#btnCancelar, #btnCancelarVencido').on('click', cancelar);

    $('#btnExtender').on('click', async function () {
      FormModal.show({
        title: 'Extender vencimiento del pedido',
        submitLabel: 'Extender',
        fields: [{ id: 'fecha_vencimiento', label: 'Nueva fecha de vencimiento', type: 'date', value: p.fecha_vencimiento || '', required: true }],
        onSubmit: async (v) => {
          try {
            await API.mayoristas.extenderPedido(p.id, { fecha_vencimiento: v.fecha_vencimiento });
            Toast.success('Vencimiento extendido');
            ViewManager.refresh();
          } catch (error) {
            Toast.error(error.message);
            return false;
          }
        }
      });
    });

    $('#btnCobrar').on('click', async function () {
      const pendiente = p.total - p.pagado;
      FormModal.show({
        title: `Registrar cobro (pendiente: ${Utils.formatMoney(pendiente)} CUP)`,
        submitLabel: 'Registrar cobro',
        fields: [
          {
            id: 'moneda', label: 'Moneda', type: 'select', value: 'CUP', required: true,
            options: [{ value: 'CUP', label: 'CUP (pesos)' }, { value: 'USD', label: 'USD (dólares)' }]
          },
          { id: 'monto', label: 'Monto del cobro', type: 'number', value: pendiente.toFixed(2), min: 0.01, step: 0.01, required: true },
          { id: 'tasa_cambio', label: 'Tasa acordada (CUP por 1 USD)', type: 'number', min: 0.01, step: 0.01, showIf: { field: 'moneda', value: 'USD' } },
          {
            id: 'metodo_pago', label: 'Método de pago', type: 'select', value: 'efectivo', required: true,
            options: [{ value: 'efectivo', label: 'Efectivo' }, { value: 'tarjeta', label: 'Tarjeta' }, { value: 'transferencia', label: 'Transferencia' }]
          }
        ],
        onSubmit: async (v) => {
          if (v.moneda === 'USD' && (!v.tasa_cambio || v.tasa_cambio <= 0)) { Toast.warning('Indica la tasa de cambio acordada para el cobro en USD'); return false; }
          try {
            const res = await API.mayoristas.registrarPago(p.id, {
              monto: v.monto, metodo_pago: v.metodo_pago, moneda: v.moneda, tasa_cambio: v.tasa_cambio || 1
            });
            Toast.success(res.message);
            ViewManager.refresh();
          } catch (error) {
            Toast.error(error.message);
            return false;
          }
        }
      });
    });

    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error(error);
    Toast.error('Error al cargar el pedido');
  }
};

// ═══════════════════════ TRAMOS (PRECIOS POR VOLUMEN) ═══════════════════════
Mayoristas.tramos = async function () {
  try {
    Utils.showLoading('Cargando...');
    const productos = await API.productos.listar();
    // Solo simples o elaborados con precio minorista establecido (propietario)
    const validos = productos.filter(p => p.activo && p.precio_venta > 0 && !(p.tipo === 'compuesto' && p.sub_tipo === 'conformado'));

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('mayoristas')}
        <main class="main-content">
          ${Mayoristas.renderNavbar()}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3"><ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#mayoristas">Mayoristas</a></li>
              <li class="breadcrumb-item active">Precios por Volumen</li>
            </ol></nav>
            <h2 class="mb-4"><i class="fas fa-layer-group me-2"></i>Precios por Volumen (Tramos)</h2>
            <div class="row">
              <div class="col-lg-4">
                <div class="card">
                  <div class="card-header"><strong>Producto</strong></div>
                  <div class="card-body">
                    <select class="form-select" id="tramoProducto" size="12" style="font-size: 0.9rem">
                      ${validos.map(p => `<option value="${p.id}">${p.nombre} (${p.codigo})</option>`).join('')}
                    </select>
                  </div>
                </div>
              </div>
              <div class="col-lg-8" id="tramosContenido">
                <div class="card"><div class="card-body text-center text-muted py-5">Selecciona un producto para ver y editar sus tramos</div></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Mayoristas.bindCommonEvents();

    $('#tramoProducto').on('change', async function () {
      await Mayoristas.cargarTramosProducto(parseInt($(this).val()));
    });

    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error(error);
    Toast.error('Error al cargar tramos');
  }
};

Mayoristas.cargarTramosProducto = async function (productoId) {
  const res = await API.get(`/mayoristas/tramos/${productoId}`);
  const p = res.producto;
  const f = p.ficha || {};
  const tramos = res.tramos || [];
  const unidad = p.unidad_compra_abrev || p.unidad_venta_abrev || ''; // mayorista = unidad de compra (propietario)

  const margenTramo = (precio) => f.costo_base > 0 ? (((precio - f.costo_base) / f.costo_base) * 100).toFixed(1) + '%' : '—';

  $('#tramosContenido').html(`
    <div class="card mb-3">
      <div class="card-header"><strong>${p.nombre}</strong> — ficha de costo</div>
      <div class="card-body">
        <div class="row text-center g-2">
          <div class="col-4 col-md-2"><small class="text-muted">Precio base</small><h6 class="mb-0">${Utils.formatMoney(f.precio_base || 0)}</h6><small class="text-muted">costo + gastos</small></div>
          <div class="col-4 col-md-2"><small class="text-muted">Gastos (${f.pct_gastos}%)</small><h6 class="mb-0">${Utils.formatMoney(f.gastos_monto || 0)}</h6><small class="text-muted">fijos + financieros</small></div>
          <div class="col-4 col-md-2"><small class="text-muted">Margen (${f.margen_pct}%)</small><h6 class="mb-0">${Utils.formatMoney(f.margen_monto || 0)}</h6><small class="text-muted">beneficio</small></div>
          <div class="col-4 col-md-2"><small class="text-muted">Impuesto (${f.impuesto_pct}%)</small><h6 class="mb-0">${Utils.formatMoney(f.impuesto_monto || 0)}</h6><small class="text-muted">sobre ventas</small></div>
          <div class="col-4 col-md-2"><small class="text-muted">Recomendado</small><h6 class="mb-0 text-primary">${Utils.formatMoney(p.precio_recomendado || 0)}</h6><small class="text-muted">sugerido</small></div>
          <div class="col-4 col-md-2"><small class="text-muted">Precio minorista</small><h6 class="mb-0">${Utils.formatMoney(p.precio_venta || 0)}</h6><small class="text-muted">por ${p.unidad_venta_abrev || 'ud'}</small></div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><strong>Tramos <small class="text-muted">(cantidades en ${unidad} — unidad de compra/mayorista)</small></strong></div>
      <div class="card-body p-0">
        <table class="table table-sm mb-0">
          <thead class="table-light"><tr><th class="text-end">Desde (${unidad})</th><th class="text-end">Hasta (${unidad})</th><th class="text-end">Precio</th><th class="text-end">Margen sobre costo</th><th></th></tr></thead>
          <tbody>
            ${tramos.length === 0 ? '<tr><td colspan="5" class="text-center text-muted py-3">Sin tramos: se usa el precio minorista convertido</td></tr>' :
      tramos.map(t => `
              <tr>
                <td class="text-end">${Utils.formatNumber(t.desde, 0)}</td>
                <td class="text-end">${t.hasta === null ? '∞' : Utils.formatNumber(t.hasta, 0)}</td>
                <td class="text-end fw-bold">${Utils.formatMoney(t.precio)}</td>
                <td class="text-end ${t.precio > (f.costo_base || 0) ? 'text-success' : 'text-danger'}">${margenTramo(t.precio)}</td>
                <td class="text-center"><button class="btn btn-sm btn-outline-danger eliminar-tramo" data-id="${t.id}"><i class="fas fa-trash"></i></button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="card-footer">
        <div class="row g-2 align-items-end">
          <div class="col-3"><label class="form-label mb-0 small">Desde (${unidad})</label><input type="number" class="form-control form-control-sm" id="tramoDesde" min="0.01" step="0.01"></div>
          <div class="col-3"><label class="form-label mb-0 small">Hasta (${unidad}, vacío = sin tope)</label><input type="number" class="form-control form-control-sm" id="tramoHasta" min="0.01" step="0.01"></div>
          <div class="col-3"><label class="form-label mb-0 small">Precio (por ${unidad})</label><input type="number" class="form-control form-control-sm" id="tramoPrecio" min="0.01" step="0.01"></div>
          <div class="col-3"><button class="btn btn-sm btn-primary w-100" id="btnGuardarTramo"><i class="fas fa-plus me-1"></i>Guardar tramo</button></div>
        </div>
      </div>
    </div>
  `);

  $('#btnGuardarTramo').on('click', async function () {
    const desde = parseFloat($('#tramoDesde').val());
    const hasta = $('#tramoHasta').val() ? parseFloat($('#tramoHasta').val()) : null;
    const precio = parseFloat($('#tramoPrecio').val());
    if (!desde || !precio) return Toast.warning('Desde y precio son obligatorios');
    try {
      await API.post(`/mayoristas/tramos/${productoId}`, { desde, hasta, precio });
      Toast.success('Tramo guardado');
      Mayoristas.cargarTramosProducto(productoId);
    } catch (error) { Toast.error(error.message); }
  });

  $('.eliminar-tramo').on('click', async function () {
    if (!await Utils.confirm('¿Eliminar este tramo?', 'Confirmar')) return;
    try {
      await API.delete(`/mayoristas/tramos/${$(this).data('id')}`);
      Toast.success('Tramo eliminado');
      Mayoristas.cargarTramosProducto(productoId);
    } catch (error) { Toast.error(error.message); }
  });
};

// ═══════════════════════ COMUNES ═══════════════════════
Mayoristas.renderNavbar = function () {
  const user = State.getUser();
  return `
    <nav class="navbar navbar-light bg-white border-bottom px-3">
      <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
      <div class="d-flex align-items-center ms-auto">
        <span class="me-3"><i class="fas fa-user me-1"></i>${user?.nombre_completo || 'Admin'}</span>
      </div>
    </nav>
  `;
};

Mayoristas.bindCommonEvents = function () {
  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));
  $('#sidebar .nav-link').on('click', function (e) {
    e.preventDefault();
    const href = $(this).attr('href');
    if (href && href !== '#') ViewManager.navegar(href.substring(1), {}, { reset: true });
    if ($(window).width() < 768) $('#sidebar').removeClass('show');
  });
  $('#btnLogout').on('click', (e) => { e.preventDefault(); App.logout(); });
  $('[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });
};

window.Mayoristas = Mayoristas;