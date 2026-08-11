/**
 * clientes.js — Módulo de gestión de clientes (patrón estándar: index/listado/formulario/ficha)
 * Accesible a admin y vendedor (los vendedores venden a estos clientes).
 */
var Clientes = window.Clientes || {};

Clientes.dataTable = null;

// ============================================
// VISTA PRINCIPAL (INDEX)
// ============================================
Clientes.index = async function () {
  try {
    const clientes = await API.clientes.listar();
    const activos = clientes.filter(c => c.activo);
    const conSaldo = clientes.filter(c => c.saldo_pendiente > 0);
    const totalDeuda = conSaldo.reduce((s, c) => s + c.saldo_pendiente, 0);

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('clientes')}
        <main class="main-content">
          ${Clientes.renderNavbar()}

          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                <li class="breadcrumb-item active">Clientes</li>
              </ol>
            </nav>

            <div class="d-flex justify-content-between align-items-center mb-4">
              <h2><i class="fas fa-users me-2"></i>Clientes</h2>
              <div>
                <button class="btn btn-outline-secondary me-2" data-route="clientes/listado">
                  <i class="fas fa-list me-1"></i>Ver Listado
                </button>
                <button class="btn btn-primary" data-route="clientes/nuevo">
                  <i class="fas fa-plus me-1"></i>Nuevo Cliente
                </button>
              </div>
            </div>

            <div class="row g-3 mb-4">
              <div class="col-6 col-md-3">
                <div class="summary-card border-primary clickable" data-route="clientes/listado" style="cursor:pointer">
                  <div class="summary-content text-center">
                    <h3 class="summary-number text-primary">${clientes.length}</h3>
                    <p class="summary-label"><i class="fas fa-users me-1"></i>Total</p>
                  </div>
                  <div class="summary-details"><small>Clientes registrados</small></div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="summary-card border-success clickable" data-route="clientes/listado?filtro=activos" style="cursor:pointer">
                  <div class="summary-content text-center">
                    <h3 class="summary-number text-success">${activos.length}</h3>
                    <p class="summary-label"><i class="fas fa-check-circle me-1"></i>Activos</p>
                  </div>
                  <div class="summary-details"><small>Pueden comprar</small></div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="summary-card border-warning clickable" data-route="clientes/listado?filtro=con-deuda" style="cursor:pointer">
                  <div class="summary-content text-center">
                    <h3 class="summary-number text-warning">${conSaldo.length}</h3>
                    <p class="summary-label"><i class="fas fa-exclamation-circle me-1"></i>Con Deuda</p>
                  </div>
                  <div class="summary-details"><small>Por cobrar</small></div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="summary-card border-danger clickable" data-route="mayoristas/pedidos?filtro=por-cobrar" style="cursor:pointer">
                  <div class="summary-content text-center">
                    <h3 class="summary-number text-danger">${Utils.formatMoney(totalDeuda, 0)}</h3>
                    <p class="summary-label"><i class="fas fa-hand-holding-usd me-1"></i>Deuda Total</p>
                  </div>
                  <div class="summary-details"><small>Cuentas por cobrar</small></div>
                </div>
              </div>
            </div>

            <div class="row g-4">
              <div class="col-lg-6">
                <div class="dashboard-card">
                  <div class="card-header-custom"><h5><i class="fas fa-exclamation-circle me-2"></i>Mayor deuda</h5></div>
                  <div class="top-products-list">
                    ${conSaldo.sort((a, b) => b.saldo_pendiente - a.saldo_pendiente).slice(0, 5).map((c, i) => `
                      <div class="top-product-item clickable" data-route="clientes/ver/${c.id}">
                        <span class="rank">${i + 1}</span>
                        <div class="product-info">
                          <span class="product-name">${c.nombre}</span>
                          <span class="product-sales text-danger">${Utils.formatMoney(c.saldo_pendiente)} pendiente</span>
                        </div>
                      </div>
                    `).join('') || '<p class="text-muted text-center py-3 mb-0">Sin deudas 🎉</p>'}
                  </div>
                </div>
              </div>
              <div class="col-lg-6">
                <div class="dashboard-card">
                  <div class="card-header-custom"><h5><i class="fas fa-user-plus me-2"></i>Últimos agregados</h5></div>
                  <div class="top-products-list">
                    ${clientes.slice(-5).reverse().map(c => `
                      <div class="top-product-item clickable" data-route="clientes/ver/${c.id}">
                        <div class="product-info">
                          <span class="product-name">${c.nombre}</span>
                          <span class="product-sales text-muted">${c.contrato || ''} ${c.condicion_pago_nombre ? '· ' + c.condicion_pago_nombre : ''}</span>
                        </div>
                      </div>
                    `).join('') || '<p class="text-muted text-center py-3 mb-0">Sin clientes aún</p>'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Clientes.bindIndexEvents();
  } catch (error) {
    console.error('Error cargando clientes:', error);
  }
};

// ============================================
// LISTADO
// ============================================
Clientes.listado = async function (params) {
  try {
    Utils.showLoading('Cargando...');
    const clientes = await API.clientes.listar();
    const filtro = params.filtro || 'todos';

    const filas = clientes.map(c => `
      <tr class="${c.activo ? '' : 'text-muted'}">
        <td><strong>${c.nombre}</strong><br><small class="text-muted">${c.identificacion || ''}</small></td>
        <td>${c.contrato || '—'}</td>
        <td>${c.condicion_pago_nombre || 'Contado'}</td>
        <td class="text-center">${c.descuento_global > 0 ? c.descuento_global + '%' : '—'}</td>
        <td class="text-end">${c.saldo_pendiente > 0 ? `<span class="text-danger fw-bold">${Utils.formatMoney(c.saldo_pendiente)}</span>` : '—'}</td>
        <td class="text-center">${c.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
        <td class="text-center">
          <div class="dropdown">
            <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown"><i class="fas fa-ellipsis-v"></i></button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><a class="dropdown-item" href="#clientes/ver/${c.id}"><i class="fas fa-eye me-2"></i>Ver</a></li>
              <li><a class="dropdown-item" href="#clientes/editar/${c.id}"><i class="fas fa-edit me-2"></i>Editar</a></li>
              <li><a class="dropdown-item" href="#mayoristas/nuevo?cliente_id=${c.id}"><i class="fas fa-file-invoice me-2"></i>Nuevo Pedido</a></li>
            </ul>
          </div>
        </td>
      </tr>
    `).join('');

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('clientes')}
        <main class="main-content">
          ${Clientes.renderNavbar()}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                <li class="breadcrumb-item"><a href="#clientes">Clientes</a></li>
                <li class="breadcrumb-item active">Listado</li>
              </ol>
            </nav>
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h2 class="mb-0"><i class="fas fa-list me-2"></i>Listado de Clientes</h2>
              <button class="btn btn-primary" data-route="clientes/nuevo"><i class="fas fa-plus me-1"></i>Nuevo Cliente</button>
            </div>
            <div class="mb-3 btn-group">
              <button class="btn btn-outline-primary ${filtro === 'todos' ? 'active' : ''}" data-route="clientes/listado">Todos</button>
              <button class="btn btn-outline-success ${filtro === 'activos' ? 'active' : ''}" data-route="clientes/listado?filtro=activos">Activos</button>
              <button class="btn btn-outline-warning ${filtro === 'con-deuda' ? 'active' : ''}" data-route="clientes/listado?filtro=con-deuda">Con Deuda</button>
              <button class="btn btn-outline-secondary ${filtro === 'inactivos' ? 'active' : ''}" data-route="clientes/listado?filtro=inactivos">Inactivos</button>
            </div>
            <div class="card"><div class="card-body p-0">
              <table class="table table-hover" id="clientesTable" style="width:100%">
                <thead class="table-light">
                  <tr><th>Nombre</th><th>Contrato</th><th>Condición pago</th><th class="text-center">Dto.</th><th class="text-end">Saldo</th><th class="text-center">Estado</th><th class="text-center">Acciones</th></tr>
                </thead>
                <tbody>${filas}</tbody>
              </table>
            </div></div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Clientes.bindCommonEvents();
    Clientes.initDataTable(clientes, filtro);
    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error(error);
    Toast.error('Error al cargar clientes');
  }
};

Clientes.initDataTable = function (clientes, filtro) {
  if (Clientes.dataTable) Clientes.dataTable.destroy();
  const filtrados = filtro === 'activos' ? clientes.filter(c => c.activo)
    : filtro === 'con-deuda' ? clientes.filter(c => c.saldo_pendiente > 0)
    : filtro === 'inactivos' ? clientes.filter(c => !c.activo)
    : clientes;

  Clientes.dataTable = $('#clientesTable').DataTable({
    pageLength: 25,
    responsive: true,
    language: { url: '/lib/js/datatables-es.json' }
  });

  // Filtro client-side simple (la tabla ya viene filtrada por ruta)
  if (filtro !== 'todos') {
    Clientes.dataTable.search('').draw();
  }
};

// ============================================
// FORMULARIO (NUEVO / EDITAR)
// ============================================
Clientes.formulario = async function (params) {
  try {
    Utils.showLoading('Cargando...');
    const id = params.id || null;
    const isEdit = !!id;
    const cliente = isEdit ? await API.clientes.obtener(id) : null;
    const terminos = await API.get('/configuracion/terminos-pago');
    const clientePreseleccionado = params.cliente_id || (State.getCache('clientePreseleccionado') || null);

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('clientes')}
        <main class="main-content">
          ${Clientes.renderNavbar()}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                <li class="breadcrumb-item"><a href="#clientes">Clientes</a></li>
                <li class="breadcrumb-item active">${isEdit ? 'Editar' : 'Nuevo'} Cliente</li>
              </ol>
            </nav>
            <div class="d-flex align-items-center mb-4">
              <button class="btn btn-outline-secondary me-3" id="btnVolver"><i class="fas fa-arrow-left me-1"></i>Volver</button>
              <h2 class="mb-0"><i class="fas fa-user-plus me-2"></i>${isEdit ? 'Editar' : 'Nuevo'} Cliente</h2>
            </div>

            <div class="row">
              <div class="col-lg-8">
                <div class="card">
                  <div class="card-body">
                    <form id="clienteForm">
                      <div class="row g-3">
                        <div class="col-md-8">
                          <label class="form-label">Nombre / Razón Social <span class="text-danger">*</span></label>
                          <input type="text" class="form-control" id="nombre" value="${cliente?.nombre || ''}" required>
                        </div>
                        <div class="col-md-4">
                          <label class="form-label">Identificación</label>
                          <input type="text" class="form-control" id="identificacion" value="${cliente?.identificacion || ''}">
                        </div>
                        <div class="col-md-6">
                          <label class="form-label">Teléfono</label>
                          <input type="text" class="form-control" id="telefono" value="${cliente?.telefono || ''}">
                        </div>
                        <div class="col-md-6">
                          <label class="form-label">Nº de Contrato <small class="text-muted">(si existe)</small></label>
                          <input type="text" class="form-control" id="contrato" value="${cliente?.contrato || ''}">
                        </div>
                        <div class="col-12">
                          <label class="form-label">Dirección</label>
                          <textarea class="form-control" id="direccion" rows="2">${cliente?.direccion || ''}</textarea>
                        </div>
                        <div class="col-md-4">
                          <label class="form-label">Condición de Pago</label>
                          <select class="form-select" id="condicionPagoId">
                            <option value="">Contado</option>
                            ${terminos.map(t => `<option value="${t.id}" ${cliente?.condicion_pago_id === t.id ? 'selected' : ''}>${t.nombre}</option>`).join('')}
                          </select>
                        </div>
                        <div class="col-md-4">
                          <label class="form-label">Límite de Crédito ($)</label>
                          <input type="number" class="form-control" id="limiteCredito" value="${cliente?.limite_credito ?? 0}" step="0.01" min="0">
                          <small class="text-muted">0 = sin límite</small>
                        </div>
                        <div class="col-md-4">
                          <label class="form-label">Descuento Global (%)</label>
                          <input type="number" class="form-control" id="descuentoGlobal" value="${cliente?.descuento_global ?? 0}" step="0.1" min="0" max="100">
                        </div>
                        ${isEdit ? `
                        <div class="col-md-4">
                          <label class="form-label">Estado</label>
                          <div class="form-check form-switch mt-2">
                            <input class="form-check-input" type="checkbox" id="activo" ${cliente?.activo ? 'checked' : ''}>
                            <label class="form-check-label">Cliente Activo</label>
                          </div>
                        </div>` : ''}
                      </div>
                      <div class="mt-4 d-flex justify-content-end gap-2">
                        <button type="button" class="btn btn-secondary" id="btnCancelar"><i class="fas fa-times me-1"></i>Cancelar</button>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save me-1"></i>Guardar Cliente</button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Clientes.bindCommonEvents();
    $('#btnVolver, #btnCancelar').on('click', () => ViewManager.volver());

    $('#clienteForm').on('submit', async function (e) {
      e.preventDefault();
      const nombre = $('#nombre').val().trim();
      if (!nombre) return Toast.warning('El nombre es obligatorio');

      const data = {
        nombre,
        identificacion: $('#identificacion').val().trim() || null,
        telefono: $('#telefono').val().trim() || null,
        direccion: $('#direccion').val().trim() || null,
        contrato: $('#contrato').val().trim() || null,
        condicion_pago_id: $('#condicionPagoId').val() || null,
        limite_credito: parseFloat($('#limiteCredito').val()) || 0,
        descuento_global: parseFloat($('#descuentoGlobal').val()) || 0
      };

      try {
        Utils.showLoading('Guardando...');
        if (isEdit) {
          await API.clientes.actualizar(id, { ...data, activo: $('#activo').is(':checked') ? 1 : 0 });
          Toast.success('Cliente actualizado');
        } else {
          await API.clientes.crear(data);
          Toast.success('Cliente creado');
        }
        State.invalidateCache('clientes');
        Utils.hideLoading();
        ViewManager.volver();
      } catch (error) {
        Utils.hideLoading();
        Toast.error(error.message || 'Error al guardar');
      }
    });

    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error(error);
    Toast.error('Error al cargar el formulario');
  }
};

// ============================================
// FICHA (VER CLIENTE)
// ============================================
Clientes.ficha = async function (params) {
  try {
    Utils.showLoading('Cargando...');
    const c = await API.clientes.obtener(params.id);

    const estadoBadge = {
      pendiente: '<span class="badge bg-warning text-dark">Pendiente</span>',
      parcial: '<span class="badge bg-info text-dark">Parcial</span>',
      facturado: '<span class="badge bg-info">Facturado</span>',
      entregado: '<span class="badge bg-success">Entregado</span>',
      cancelado: '<span class="badge bg-secondary">Cancelado</span>'
    };
    const pagoBadge = {
      pendiente: '<span class="badge bg-danger">Sin cobrar</span>',
      parcial: '<span class="badge bg-warning text-dark">Parcial</span>',
      pagado: '<span class="badge bg-success">Pagado</span>'
    };

    const filasPedidos = (c.pedidos || []).map(p => `
      <tr style="cursor:pointer" onclick="ViewManager.navegar('mayoristas/pedidos/${p.id}')">
        <td>#${p.id}</td>
        <td>${Utils.formatearFecha(Utils.fechaISOToLocal(p.fecha), 'fecha')}</td>
        <td class="text-center">${estadoBadge[p.estado] || p.estado}</td>
        <td class="text-center">${pagoBadge[p.estado_pago] || p.estado_pago}</td>
        <td class="text-end fw-bold">${Utils.formatMoney(p.total)}</td>
      </tr>
    `).join('');

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('clientes')}
        <main class="main-content">
          ${Clientes.renderNavbar()}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                <li class="breadcrumb-item"><a href="#clientes">Clientes</a></li>
                <li class="breadcrumb-item active">${c.nombre}</li>
              </ol>
            </nav>
            <div class="d-flex align-items-center mb-4">
              <button class="btn btn-outline-secondary me-3" id="btnVolver"><i class="fas fa-arrow-left me-1"></i>Volver</button>
              <h2 class="mb-0"><i class="fas fa-user me-2"></i>${c.nombre}</h2>
            </div>

            <div class="row g-4">
              <div class="col-lg-5">
                <div class="card">
                  <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Información General</h5>
                    <a href="#clientes/editar/${c.id}" class="btn btn-sm btn-outline-primary"><i class="fas fa-edit me-1"></i>Editar</a>
                  </div>
                  <div class="card-body">
                    <div class="mb-3"><label class="text-muted small">Identificación</label><p>${c.identificacion || '—'}</p></div>
                    <div class="mb-3"><label class="text-muted small">Teléfono</label><p><i class="fas fa-phone me-1"></i>${c.telefono || '—'}</p></div>
                    <div class="mb-3"><label class="text-muted small">Dirección</label><p>${c.direccion || '—'}</p></div>
                    <div class="mb-3"><label class="text-muted small">Nº de Contrato</label><p><i class="fas fa-file-signature me-1"></i>${c.contrato || '—'}</p></div>
                    <div class="mb-3"><label class="text-muted small">Condición de Pago</label><p>${c.condicion_pago_nombre || 'Contado'}</p></div>
                    <div class="mb-3"><label class="text-muted small">Límite de Crédito</label><p>${c.limite_credito > 0 ? Utils.formatMoney(c.limite_credito) : 'Sin límite'}</p></div>
                    <div class="mb-3"><label class="text-muted small">Descuento Global</label><p>${c.descuento_global > 0 ? c.descuento_global + '%' : '—'}</p></div>
                    <div class="mb-3"><label class="text-muted small">Estado</label><p>${c.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</p></div>
                  </div>
                </div>
              </div>

              <div class="col-lg-7">
                <div class="card mb-3 border-${c.saldo_pendiente > 0 ? 'danger' : 'success'}">
                  <div class="card-body text-center">
                    <small class="text-muted">Saldo pendiente (cuentas por cobrar)</small>
                    <h3 class="mb-0 text-${c.saldo_pendiente > 0 ? 'danger' : 'success'}">${Utils.formatMoney(c.saldo_pendiente || 0)}</h3>
                  </div>
                </div>
                <div class="card">
                  <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0"><i class="fas fa-file-invoice me-1"></i>Pedidos</h5>
                    <a href="#mayoristas/nuevo?cliente_id=${c.id}" class="btn btn-sm btn-primary"><i class="fas fa-plus me-1"></i>Nuevo Pedido</a>
                  </div>
                  <div class="card-body p-0">
                    <table class="table table-hover mb-0">
                      <thead class="table-light"><tr><th>#</th><th>Fecha</th><th class="text-center">Estado</th><th class="text-center">Pago</th><th class="text-end">Total</th></tr></thead>
                      <tbody>${filasPedidos || '<tr><td colspan="5" class="text-center text-muted py-3">Sin pedidos aún</td></tr>'}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Clientes.bindCommonEvents();
    $('#btnVolver').on('click', () => ViewManager.volver());
    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error(error);
    Toast.error('Error al cargar el cliente');
  }
};

// ============================================
// COMUNES
// ============================================
Clientes.renderNavbar = function () {
  const user = State.getUser();
  return `
    <nav class="navbar navbar-light bg-white border-bottom px-3">
      <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
      <div class="d-flex align-items-center ms-auto">
        <span class="me-3"><i class="fas fa-user me-1"></i>${user?.nombre_completo || ''}</span>
      </div>
    </nav>
  `;
};

Clientes.bindIndexEvents = function () {
  $('[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });
  Clientes.bindCommonEvents();
};

Clientes.bindCommonEvents = function () {
  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));
  $('#sidebar .nav-link').on('click', function (e) {
    e.preventDefault();
    const href = $(this).attr('href');
    if (href && href !== '#') {
      ViewManager.navegar(href.substring(1), {}, { reset: true });
    }
    if ($(window).width() < 768) $('#sidebar').removeClass('show');
  });
  $('#btnLogout').on('click', (e) => { e.preventDefault(); App.logout(); });
};

window.Clientes = Clientes;
