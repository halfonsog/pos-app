/**
 * proveedores.js - Módulo de gestión de proveedores
 */

var Proveedores = window.Proveedores || {};

Proveedores.dataTable = null;

// ============================================
// VISTA PRINCIPAL (INDEX - Cards Dashboard)
// ============================================
Proveedores.index = async function () {
  console.log('🚚 Cargando módulo de proveedores');

  try {
    const stats = await Proveedores.obtenerEstadisticas();
    const layout = Proveedores.renderIndexLayout(stats);

    $('#app').html(layout);
    Proveedores.bindIndexEvents();

  } catch (error) {
    console.error('Error cargando proveedores:', error);
    Toast.error('Error al cargar el módulo de proveedores');
  }
};

Proveedores.obtenerEstadisticas = async function () {
  try {
    const proveedores = await API.proveedores.listar();

    const activos = proveedores.filter(p => p.activo);
    const conDeuda = proveedores.filter(p => p.saldo_pendiente > 0);
    const totalDeuda = conDeuda.reduce((sum, p) => sum + p.saldo_pendiente, 0);

    return {
      total: proveedores.length,
      activos: activos.length,
      conDeuda: conDeuda.length,
      totalDeuda: totalDeuda,
      proveedoresDestacados: conDeuda.slice(0, 5),
      ultimosAgregados: proveedores.slice(-5).reverse()
    };
  } catch (error) {
    console.warn('Usando datos mock para proveedores');
    return {
      total: 4,
      activos: 4,
      conDeuda: 2,
      totalDeuda: 2650.50,
      proveedoresDestacados: [],
      ultimosAgregados: []
    };
  }
};

Proveedores.renderIndexLayout = function (stats) {
  const user = State.getUser();

  return `
    <div class="app-wrapper">
      ${Proveedores.renderSidebar()}
      <main class="main-content">
        ${Proveedores.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item active">Proveedores</li>
            </ol>
          </nav>
          
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="fas fa-truck me-2"></i>Gestión de Proveedores</h2>
            <div>
              <button class="btn btn-outline-secondary me-2" data-route="proveedores/listado">
                <i class="fas fa-list me-1"></i>Ver Listado
              </button>
              <button class="btn btn-primary" data-route="proveedores/nuevo">
                <i class="fas fa-plus me-1"></i>Nuevo Proveedor
              </button>
            </div>
          </div>
          
          <div class="row g-3 mb-4">
            <div class="col-6 col-md-3">
              <div class="summary-mini-card">
                <h4>${stats.total}</h4>
                <p>Total Proveedores</p>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-mini-card text-success">
                <h4>${stats.activos}</h4>
                <p>Activos</p>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-mini-card text-warning">
                <h4>${stats.conDeuda}</h4>
                <p>Con Deuda</p>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-mini-card text-danger">
                <h4>${Utils.formatMoney(stats.totalDeuda)}</h4>
                <p>Total Deuda</p>
              </div>
            </div>
          </div>
          
          <div class="row g-4">
            <div class="col-lg-6">
              <div class="dashboard-card">
                <div class="card-header-custom d-flex justify-content-between align-items-center">
                  <h5><i class="fas fa-money-bill text-warning me-2"></i>Proveedores con Deuda</h5>
                  <a href="#proveedores/listado?filtro=con-deuda" class="btn btn-sm btn-outline-warning">Ver todos</a>
                </div>
                <div class="stock-bajo-list">
                  ${stats.proveedoresDestacados.length > 0 ? stats.proveedoresDestacados.map(p => `
                    <div class="stock-item clickable" data-route="proveedores/ver/${p.id}">
                      <div class="stock-info">
                        <span class="stock-name">${p.nombre}</span>
                      </div>
                      <div class="stock-level">
                        <span class="stock-text text-warning">${Utils.formatMoney(p.saldo_pendiente)}</span>
                      </div>
                    </div>
                  `).join('') : '<p class="text-muted text-center py-3">No hay proveedores con deuda</p>'}
                </div>
              </div>
            </div>
            
            <div class="col-lg-6">
              <div class="dashboard-card">
                <div class="card-header-custom">
                  <h5><i class="fas fa-clock me-2"></i>Últimos Proveedores</h5>
                </div>
                <div class="ultimos-list">
                  ${stats.ultimosAgregados.length > 0 ? stats.ultimosAgregados.map(p => `
                    <div class="ultimo-item clickable" data-route="proveedores/ver/${p.id}">
                      <div>
                        <span class="ultimo-name">${p.nombre}</span>
                      </div>
                      <span class="${p.saldo_pendiente > 0 ? 'text-warning' : ''}">${Utils.formatMoney(p.saldo_pendiente)}</span>
                    </div>
                  `).join('') : '<p class="text-muted text-center py-3">No hay proveedores recientes</p>'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
};

// ============================================
// VISTA LISTADO (DataTable)
// ============================================
Proveedores.listado = async function (params) {
  console.log('📋 Cargando listado de proveedores', params);

  try {
    Utils.showLoading('Cargando proveedores...');

    const proveedores = await API.proveedores.listar();
    const layout = Proveedores.renderListadoLayout(proveedores, params);

    $('#app').html(layout);

    Proveedores.initDataTable(proveedores);
    Proveedores.bindListadoEvents(params);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    Toast.error('Error al cargar proveedores: ' + error.message);
    console.error(error);
  }
};

Proveedores.renderListadoLayout = function (proveedores, params) {
  const user = State.getUser();
  const filtro = params.filtro || 'todos';

  return `
    <div class="app-wrapper">
      ${Proveedores.renderSidebar()}
      <main class="main-content">
        ${Proveedores.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#proveedores">Proveedores</a></li>
              <li class="breadcrumb-item active">Listado</li>
            </ol>
          </nav>
          
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="fas fa-list me-2"></i>Listado de Proveedores</h2>
            <div>
              <a href="#proveedores" class="btn btn-outline-secondary me-2">
                <i class="fas fa-th-large me-1"></i>Vista Cards
              </a>
              <button class="btn btn-primary" id="btnNuevoProveedor">
                <i class="fas fa-plus me-1"></i>Nuevo Proveedor
              </button>
            </div>
          </div>
          
          <div class="mb-3">
            <div class="btn-group">
              <button class="btn btn-outline-primary ${filtro === 'todos' ? 'active' : ''}" data-filtro="todos">
                <i class="fas fa-list me-1"></i>Todos
              </button>
              <button class="btn btn-outline-success ${filtro === 'activos' ? 'active' : ''}" data-filtro="activos">
                <i class="fas fa-check-circle me-1"></i>Activos
              </button>
              <button class="btn btn-outline-warning ${filtro === 'con-deuda' ? 'active' : ''}" data-filtro="con-deuda">
                <i class="fas fa-money-bill me-1"></i>Con Deuda
              </button>
              <button class="btn btn-outline-secondary ${filtro === 'inactivos' ? 'active' : ''}" data-filtro="inactivos">
                <i class="fas fa-ban me-1"></i>Inactivos
              </button>
            </div>
          </div>
          
          <div class="table-responsive">
            <table class="table table-hover" id="proveedoresTable" style="width:100%">
              <thead class="table-light">
                <tr>
                  <th>Nombre</th>
                  <th>ID Fiscal</th>
                  <th>Teléfono</th>
                  <th>Término Pago</th>
                  <th class="text-end">Saldo Pendiente</th>
                  <th class="text-center">Estado</th>
                  <th class="text-center" style="width: 60px;"></th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `;
};

Proveedores.initDataTable = function (proveedores) {
  const self = this;

  if (this.dataTable) {
    this.dataTable.destroy();
  }

  $.fn.dataTable.ext.errMode = 'none';

  const tableData = proveedores.map(p => {
    const saldoPendiente = p.saldo_pendiente || 0;

    return [
      p.nombre,                                          // 0
      p.id_fiscal || '-',                                // 1
      p.telefono || '-',                                 // 2
      p.termino_pago_nombre || '-',                      // 3
      `<span class="${saldoPendiente > 0 ? 'text-warning fw-bold' : ''}">${Utils.formatMoney(saldoPendiente)}</span>`, // 4
      p.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>', // 5
      p.id,                                              // 6
      saldoPendiente > 0 ? 'true' : 'false',             // 7 - ConDeuda
      p.activo ? 'true' : 'false'                        // 8 - ActivoFiltro
    ];
  });

  this.dataTable = $('#proveedoresTable').DataTable({
    data: tableData,
    columns: [
      { data: 0, title: 'Nombre' },                                 // Col 0
      { data: 1, title: 'ID Fiscal' },                              // Col 1
      { data: 2, title: 'Teléfono' },                               // Col 2
      { data: 3, title: 'Término Pago' },                           // Col 3
      { data: 4, title: 'Saldo Pendiente', className: 'text-end' }, // Col 4
      { data: 5, title: 'Estado', className: 'text-center' },       // Col 5
      {
        data: null,
        orderable: false,
        className: 'text-center',
        render: function (data, type, row) {
          const id = row[6];
          return `
            <div class="dropdown">
              <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
                <i class="fas fa-ellipsis-v"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item" href="#proveedores/ver/${id}"><i class="fas fa-eye me-2"></i>Ver ficha</a></li>
                <li><a class="dropdown-item" href="#proveedores/editar/${id}"><i class="fas fa-edit me-2"></i>Editar</a></li>
                <li><a class="dropdown-item" href="#proveedores/contactos/${id}"><i class="fas fa-users me-2"></i>Contactos</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" data-eliminar="${id}"><i class="fas fa-trash me-2"></i>Eliminar</a></li>
              </ul>
            </div>
          `;
        }
      },                                                                    // Col 6 (acciones)
      { data: 6, title: 'ID', visible: false },                             // Col 7 (oculta)
      { data: 7, title: 'ConDeuda', visible: false, searchable: true },     // Col 8 (oculta)
      { data: 8, title: 'ActivoFiltro', visible: false, searchable: true }  // Col 9 (oculta)
    ],
    order: [[4, 'desc'], [0, 'asc']],
    language: {
      decimal: ",",
      thousands: ".",
      processing: "Procesando...",
      lengthMenu: "Mostrar _MENU_ registros",
      zeroRecords: "No se encontraron resultados",
      emptyTable: "Ningún dato disponible",
      info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
      infoEmpty: "Mostrando 0 a 0 de 0 registros",
      infoFiltered: "(filtrado de _MAX_ registros totales)",
      search: "Buscar:",
      searchPlaceholder: "Buscar...",
      paginate: {
        first: "Primero",
        last: "Último",
        next: "Siguiente",
        previous: "Anterior"
      }
    },
    pageLength: 25,
    responsive: true,
    drawCallback: function () {
      $('#proveedoresTable tbody tr').addClass('clickable-row');
    }
  });
};

Proveedores.bindListadoEvents = function (params) {
  const self = this;
  const filtroInicial = params.filtro || 'todos';

  $('#btnNuevoProveedor').on('click', () => ViewManager.navegar('proveedores/nuevo'));

  $('[data-filtro]').on('click', function () {
    const filtro = $(this).data('filtro');

    $('[data-filtro]').removeClass('active');
    $(this).addClass('active');

    self.dataTable.search('').columns().search('');

    if (filtro === 'todos') {
      self.dataTable.draw();
    } else if (filtro === 'activos') {
      self.dataTable.column(9).search('true', true, false).draw();  // Col 9 = ActivoFiltro
    } else if (filtro === 'con-deuda') {
      self.dataTable.column(8).search('true', true, false).draw();  // Col 8 = ConDeuda
    } else if (filtro === 'inactivos') {
      self.dataTable.column(9).search('false', true, false).draw(); // Col 9 = ActivoFiltro
    }
  });

  if (filtroInicial !== 'todos') {
    $(`[data-filtro="${filtroInicial}"]`).trigger('click');
  }

  $('#proveedoresTable tbody').on('dblclick', 'tr', function () {
    const row = self.dataTable.row(this);
    const id = row.data()[6];
    ViewManager.navegar('proveedores/ver/' + id);
  });

  $(document).on('click', '[data-eliminar]', async function (e) {
    const currentView = ViewManager.currentView || '';
    if (!currentView.startsWith('proveedores')) return;

    e.preventDefault();
    e.stopPropagation();

    const id = $(this).data('eliminar');

    const confirmado = await Utils.confirm('¿Está seguro de eliminar este proveedor?', 'Confirmar eliminación');
    if (!confirmado) return;

    try {
      Utils.showLoading('Eliminando proveedor...');
      await API.proveedores.eliminar(id);
      State.invalidateCache('proveedores');
      Utils.hideLoading();
      Toast.success('Proveedor eliminado');
      ViewManager.refresh();
    } catch (error) {
      Utils.hideLoading();
      Toast.error(error.message);
    }
  });

  Proveedores.bindCommonEvents();
};

// ============================================
// MÉTODOS AUXILIARES
// ============================================
Proveedores.renderSidebar = function () {
  return `
    <nav class="sidebar bg-dark text-white p-3" id="sidebar">
      <h4 class="text-white mb-4">
        <i class="fas fa-store me-2"></i>POS Admin
      </h4>
      <div class="nav flex-column">
        <a class="nav-link text-white-50" href="#dashboard">
          <i class="fas fa-tachometer-alt me-2"></i>Dashboard
        </a>
        <a class="nav-link text-white-50" href="#inventario">
          <i class="fas fa-warehouse me-2"></i>Inventario
        </a>
        <a class="nav-link text-white-50" href="#compras">
          <i class="fas fa-shopping-cart me-2"></i>Compras
        </a>
        <a class="nav-link text-white-50" href="#ventas">
          <i class="fas fa-cash-register me-2"></i>Ventas
        </a>
        <a class="nav-link text-white-50" href="#productos">
          <i class="fas fa-box me-2"></i>Productos
        </a>
        <a class="nav-link text-white active" href="#proveedores">
          <i class="fas fa-truck me-2"></i>Proveedores
        </a>
        <a class="nav-link text-white-50" href="#promociones">
          <i class="fas fa-tags me-2"></i>Promociones
        </a>
        <a class="nav-link text-white-50" href="#reportes">
          <i class="fas fa-chart-bar me-2"></i>Reportes
        </a>
        <a class="nav-link text-white-50" href="#configuracion">
          <i class="fas fa-cog me-2"></i>Configuración
        </a>
        <hr class="bg-secondary my-3">
        <a class="nav-link text-danger" href="#" id="btnLogout">
          <i class="fas fa-sign-out-alt me-2"></i>Cerrar Sesión
        </a>
      </div>
    </nav>
  `;
};

Proveedores.renderNavbar = function (user) {
  return `
    <nav class="navbar navbar-light bg-white border-bottom px-3">
      <button class="btn btn-link d-md-none" id="toggleSidebar">
        <i class="fas fa-bars"></i>
      </button>
      <div class="d-flex align-items-center ms-auto">
        <span class="me-3">
          <i class="fas fa-user me-1"></i>${user?.nombre_completo || 'Admin'}
        </span>
      </div>
    </nav>
  `;
};

Proveedores.bindIndexEvents = function () {
  $('[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });

  $('.clickable[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });

  Proveedores.bindCommonEvents();
};

Proveedores.bindCommonEvents = function () {
  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));

  $('#sidebar .nav-link').on('click', function (e) {
    e.preventDefault();
    const href = $(this).attr('href');
    if (href && href !== '#') {
      ViewManager.navegar(href.substring(1), {}, { replace: true });
    }
    if ($(window).width() < 768) $('#sidebar').removeClass('show');
  });

  $('#btnLogout').on('click', (e) => {
    e.preventDefault();
    App.logout();
  });
};

// ============================================
// VISTA: FORMULARIO (NUEVO/EDITAR)
// ============================================
Proveedores.formulario = async function (params) {
  console.log('📝 Cargando formulario de proveedor', params);

  const id = params.id;
  const isEdit = !!id;

  try {
    Utils.showLoading('Cargando datos...');

    // Cargar términos de pago
    const terminosPago = await API.get('/terminos-pago');

    let proveedor = null;
    if (isEdit) {
      proveedor = await API.proveedores.obtener(id);
    }

    const layout = Proveedores.renderFormularioLayout(proveedor, terminosPago);
    $('#app').html(layout);

    if (proveedor) {
      Proveedores.llenarFormulario(proveedor);
    }

    Proveedores.bindFormularioEvents(id, params);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    Toast.error('Error al cargar el formulario: ' + error.message);
    console.error(error);
  }
};

Proveedores.renderFormularioLayout = function (proveedor, terminosPago) {
  const user = State.getUser();
  const isEdit = !!proveedor;
  const title = isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor';

  const terminosOptions = terminosPago
    .map(t => `<option value="${t.id}">${t.nombre}</option>`)
    .join('');

  return `
    <div class="app-wrapper">
      ${Proveedores.renderSidebar()}
      <main class="main-content">
        ${Proveedores.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Proveedores</a></li>
              <li class="breadcrumb-item active">${title}</li>
            </ol>
          </nav>
          
          <div class="d-flex align-items-center mb-4">
            <button class="btn btn-outline-secondary me-3" id="btnVolver">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </button>
            <h2 class="mb-0"><i class="fas fa-truck me-2"></i>${title}</h2>
          </div>
          
          <div class="row">
            <div class="col-lg-8">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0"><i class="fas fa-info-circle me-2"></i>Información General</h5>
                </div>
                <div class="card-body">
                  <form id="proveedorForm">
                    <input type="hidden" id="proveedorId" value="${isEdit ? proveedor.id : ''}">
                    
                    <div class="row g-3">
                      <div class="col-md-12">
                        <label class="form-label">Nombre o Razón Social <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="nombre" required>
                      </div>
                      
                      <div class="col-md-6">
                        <label class="form-label">Identificación Fiscal</label>
                        <input type="text" class="form-control" id="idFiscal" placeholder="RUC / NIT / CIF">
                      </div>
                      
                      <div class="col-md-6">
                        <label class="form-label">Teléfono</label>
                        <input type="text" class="form-control" id="telefono">
                      </div>
                      
                      <div class="col-12">
                        <label class="form-label">Dirección</label>
                        <textarea class="form-control" id="direccion" rows="2"></textarea>
                      </div>
                      
                      <div class="col-md-6">
                        <label class="form-label">Término de Pago</label>
                        <select class="form-select" id="terminoPagoId">
                          <option value="">Seleccione...</option>
                          ${terminosOptions}
                        </select>
                      </div>
                      
                      <div class="col-md-6">
                        <label class="form-label">Estado</label>
                        <div class="form-check form-switch mt-2">
                          <input class="form-check-input" type="checkbox" id="activo" checked>
                          <label class="form-check-label" for="activo">Proveedor Activo</label>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            
            <div class="col-lg-4">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0"><i class="fas fa-info-circle me-2"></i>Información</h5>
                </div>
                <div class="card-body">
                  <p class="text-muted">
                    <i class="fas fa-check-circle text-success me-1"></i>
                    Los contactos se pueden agregar después de guardar el proveedor.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="mt-4 d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-secondary" id="btnCancelar">
              <i class="fas fa-times me-1"></i>Cancelar
            </button>
            <button type="button" class="btn btn-primary" id="btnGuardar">
              <i class="fas fa-save me-1"></i>Guardar Proveedor
            </button>
          </div>
        </div>
      </main>
    </div>
  `;
};

Proveedores.llenarFormulario = function (proveedor) {
  $('#nombre').val(proveedor.nombre);
  $('#idFiscal').val(proveedor.id_fiscal || '');
  $('#telefono').val(proveedor.telefono || '');
  $('#direccion').val(proveedor.direccion || '');
  $('#terminoPagoId').val(proveedor.termino_pago_id || '');
  $('#activo').prop('checked', proveedor.activo === 1);
};

Proveedores.bindFormularioEvents = function (id, params) {
  // Volver
  $('#btnVolver, #btnCancelar').on('click', () => ViewManager.volver());
  $('.breadcrumb-back').on('click', (e) => { e.preventDefault(); ViewManager.volver(); });

  // Guardar
  $('#btnGuardar').on('click', async function () {
    if (!Proveedores.validarFormulario()) return;

    const data = Proveedores.recopilarDatosFormulario();

    try {
      Utils.showLoading('Guardando proveedor...');

      let result;
      if (id) {
        result = await API.proveedores.actualizar(id, data);
      } else {
        result = await API.proveedores.crear(data);
      }

      State.invalidateCache('proveedores');

      Utils.hideLoading();
      Toast.success(result.message || 'Proveedor guardado correctamente');

      const nuevoId = id || result.id;

      // Si venimos de compras, volver allí
      if (params.retorno) {
        ViewManager.navegar(params.retorno);
      } else {
        ViewManager.navegar('proveedores/ver/' + nuevoId, {}, { replace: true });
      }

    } catch (error) {
      Utils.hideLoading();
      Toast.error('Error al guardar: ' + error.message);
      console.error(error);
    }
  });

  Proveedores.bindCommonEvents();
};

Proveedores.validarFormulario = function () {
  const nombre = $('#nombre').val().trim();
  if (!nombre) {
    Toast.warning('El nombre es requerido');
    $('#nombre').focus();
    return false;
  }
  return true;
};

Proveedores.recopilarDatosFormulario = function () {
  return {
    nombre: $('#nombre').val().trim(),
    id_fiscal: $('#idFiscal').val().trim() || null,
    telefono: $('#telefono').val().trim() || null,
    direccion: $('#direccion').val().trim() || null,
    termino_pago_id: $('#terminoPagoId').val() || null,
    activo: $('#activo').is(':checked')
  };
};

// ============================================
// VISTA: FICHA (VER PROVEEDOR)
// ============================================
Proveedores.ficha = async function (params) {
  console.log('👁️ Cargando ficha de proveedor', params);

  const id = params.id;

  try {
    Utils.showLoading('Cargando proveedor...');

    const proveedor = await API.proveedores.obtener(id);
    const layout = Proveedores.renderFichaLayout(proveedor);

    $('#app').html(layout);
    Proveedores.bindFichaEvents(proveedor);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    Toast.error('Error al cargar: ' + error.message);
    console.error(error);
  }
};

Proveedores.renderFichaLayout = function (proveedor) {
  const user = State.getUser();
  const tieneDeuda = proveedor.saldo_pendiente > 0;

  return `
    <div class="app-wrapper">
      ${Proveedores.renderSidebar()}
      <main class="main-content">
        ${Proveedores.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Proveedores</a></li>
              <li class="breadcrumb-item active">${proveedor.nombre}</li>
            </ol>
          </nav>
          
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div class="d-flex align-items-center">
              <button class="btn btn-outline-secondary me-3" id="btnVolver">
                <i class="fas fa-arrow-left me-1"></i>Volver
              </button>
              <h2 class="mb-0">${proveedor.nombre}</h2>
              ${proveedor.activo ? '<span class="badge bg-success ms-2">Activo</span>' : '<span class="badge bg-secondary ms-2">Inactivo</span>'}
            </div>
            <div class="btn-group">
              <button class="btn btn-primary" id="btnEditar">
                <i class="fas fa-edit me-1"></i>Editar
              </button>
              <button class="btn btn-outline-primary" id="btnContactos">
                <i class="fas fa-users me-1"></i>Contactos
              </button>
              <button class="btn btn-danger" id="btnEliminar" ${proveedor.tiene_compras ? 'disabled' : ''}>
                <i class="fas fa-trash me-1"></i>Eliminar
              </button>
            </div>
          </div>
          
          <div class="row">
            <div class="col-lg-4">
              <div class="card mb-4">
                <div class="card-header">
                  <h5 class="mb-0"><i class="fas fa-info-circle me-2"></i>Información General</h5>
                </div>
                <div class="card-body">
                  <div class="mb-3">
                    <label class="text-muted small">Nombre / Razón Social</label>
                    <p class="fs-5 fw-bold">${proveedor.nombre}</p>
                  </div>
                  <div class="mb-3">
                    <label class="text-muted small">Identificación Fiscal</label>
                    <p>${proveedor.id_fiscal || '-'}</p>
                  </div>
                  <div class="mb-3">
                    <label class="text-muted small">Teléfono</label>
                    <p><i class="fas fa-phone me-1"></i>${proveedor.telefono || '-'}</p>
                  </div>
                  <div class="mb-3">
                    <label class="text-muted small">Dirección</label>
                    <p><i class="fas fa-map-marker-alt me-1"></i>${proveedor.direccion || '-'}</p>
                  </div>
                  <div class="mb-3">
                    <label class="text-muted small">Término de Pago</label>
                    <p>${proveedor.termino_pago_nombre || 'No especificado'}</p>
                  </div>
                </div>
              </div>
              
              <div class="card mb-4 ${tieneDeuda ? 'border-warning' : ''}">
                <div class="card-header ${tieneDeuda ? 'bg-warning bg-opacity-10' : ''}">
                  <h5 class="mb-0"><i class="fas fa-dollar-sign me-2"></i>Estado de Cuenta</h5>
                </div>
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="fw-bold">Saldo Pendiente:</span>
                    <span class="fs-4 ${tieneDeuda ? 'text-warning fw-bold' : 'text-success'}">
                      ${Utils.formatMoney(proveedor.saldo_pendiente)}
                    </span>
                  </div>
                  <div class="mt-3">
                    <label class="text-muted small">Total Compras</label>
                    <p class="fs-5">${proveedor.total_compras || 0}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="col-lg-8">
              <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                  <h5 class="mb-0"><i class="fas fa-users me-2"></i>Contactos</h5>
                  <button class="btn btn-sm btn-outline-primary" id="btnAgregarContacto">
                    <i class="fas fa-plus me-1"></i>Agregar
                  </button>
                </div>
                <div class="card-body p-0">
                  ${proveedor.contactos && proveedor.contactos.length > 0 ? `
                    <div class="list-group list-group-flush">
                      ${proveedor.contactos.map(c => `
                        <div class="list-group-item">
                          <div class="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 class="mb-1">${c.nombre}</h6>
                              <p class="mb-1 text-muted small">${c.cargo || 'Sin cargo'}</p>
                              <small>
                                ${c.telefono_movil ? `<i class="fas fa-mobile-alt me-1"></i>${c.telefono_movil}` : ''}
                                ${c.email ? `<i class="fas fa-envelope ms-3 me-1"></i>${c.email}` : ''}
                              </small>
                            </div>
                            <div>
                              <button class="btn btn-sm btn-outline-primary editar-contacto" data-id="${c.id}" data-nombre="${c.nombre}" data-cargo="${c.cargo || ''}" data-telefono="${c.telefono_movil || ''}" data-email="${c.email || ''}">
                                <i class="fas fa-edit"></i>
                              </button>
                              <button class="btn btn-sm btn-outline-danger eliminar-contacto" data-id="${c.id}">
                                <i class="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  ` : `
                    <p class="text-muted text-center py-4">No hay contactos registrados</p>
                  `}
                </div>
              </div>
              
              ${proveedor.ultimas_compras && proveedor.ultimas_compras.length > 0 ? `
                <div class="card">
                  <div class="card-header">
                    <h5 class="mb-0"><i class="fas fa-history me-2"></i>Últimas Compras</h5>
                  </div>
                  <div class="card-body p-0">
                    <table class="table table-sm mb-0">
                      <thead class="table-light">
                        <tr>
                          <th>Fecha</th>
                          <th>Factura</th>
                          <th class="text-end">Total</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${proveedor.ultimas_compras.map(c => `
                          <tr class="clickable" data-route="compras/ver/${c.id}">
                            <td>${Utils.formatDate(c.fecha_compra)}</td>
                            <td>${c.codigo_factura || '-'}</td>
                            <td class="text-end">${Utils.formatMoney(c.total)}</td>
                            <td>
                              <span class="badge bg-${c.estado_pago === 'pagado' ? 'success' : c.estado_pago === 'parcial' ? 'warning' : 'danger'}">
                                ${c.estado_pago === 'pagado' ? 'Pagado' : c.estado_pago === 'parcial' ? 'Parcial' : 'Pendiente'}
                              </span>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </main>
    </div>
    
    <!-- Modal para Contacto -->
    <div class="modal fade" id="contactoModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="contactoModalTitle">Nuevo Contacto</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="contactoForm">
              <input type="hidden" id="contactoId">
              <div class="mb-3">
                <label class="form-label">Nombre <span class="text-danger">*</span></label>
                <input type="text" class="form-control" id="contactoNombre" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Cargo</label>
                <input type="text" class="form-control" id="contactoCargo">
              </div>
              <div class="mb-3">
                <label class="form-label">Teléfono Móvil</label>
                <input type="text" class="form-control" id="contactoTelefono">
              </div>
              <div class="mb-3">
                <label class="form-label">Email</label>
                <input type="email" class="form-control" id="contactoEmail">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btnGuardarContacto">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;
};

Proveedores.bindFichaEvents = function (proveedor) {
  let contactoModal;

  $('#btnVolver').on('click', () => ViewManager.volver());
  $('.breadcrumb-back').on('click', (e) => { e.preventDefault(); ViewManager.volver(); });

  $('#btnEditar').on('click', () => ViewManager.navegar('proveedores/editar/' + proveedor.id));
  $('#btnContactos').on('click', () => ViewManager.navegar('proveedores/contactos/' + proveedor.id));

  $('#btnEliminar').on('click', async function () {
    const confirmado = await Utils.confirm(`¿Eliminar al proveedor "${proveedor.nombre}"?`, 'Confirmar eliminación');
    if (!confirmado) return;

    try {
      Utils.showLoading('Eliminando...');
      await API.proveedores.eliminar(proveedor.id);
      State.invalidateCache('proveedores');
      Utils.hideLoading();
      Toast.success('Proveedor eliminado');
      ViewManager.volver();
    } catch (error) {
      Utils.hideLoading();
      Toast.error(error.message);
    }
  });

  // Modal de contacto
  contactoModal = new bootstrap.Modal('#contactoModal');

  $('#btnAgregarContacto').on('click', () => {
    $('#contactoModalTitle').text('Nuevo Contacto');
    $('#contactoId').val('');
    $('#contactoNombre').val('');
    $('#contactoCargo').val('');
    $('#contactoTelefono').val('');
    $('#contactoEmail').val('');
    contactoModal.show();
  });

  $('.editar-contacto').on('click', function () {
    const id = $(this).data('id');
    const nombre = $(this).data('nombre');
    const cargo = $(this).data('cargo');
    const telefono = $(this).data('telefono');
    const email = $(this).data('email');

    $('#contactoModalTitle').text('Editar Contacto');
    $('#contactoId').val(id);
    $('#contactoNombre').val(nombre);
    $('#contactoCargo').val(cargo);
    $('#contactoTelefono').val(telefono);
    $('#contactoEmail').val(email);
    contactoModal.show();
  });

  $('#btnGuardarContacto').on('click', async function () {
    const contactoId = $('#contactoId').val();
    const nombre = $('#contactoNombre').val().trim();

    if (!nombre) {
      Toast.warning('El nombre es requerido');
      return;
    }

    const data = {
      nombre: nombre,
      cargo: $('#contactoCargo').val().trim() || null,
      telefono_movil: $('#contactoTelefono').val().trim() || null,
      email: $('#contactoEmail').val().trim() || null
    };

    try {
      Utils.showLoading('Guardando contacto...');

      if (contactoId) {
        await API.proveedores.actualizarContacto(proveedor.id, contactoId, data);
      } else {
        await API.proveedores.crearContacto(proveedor.id, data);
      }

      // ✅ Forzar recarga de datos
      State.invalidateCache('proveedores');

      Utils.hideLoading();
      Toast.success('Contacto guardado');
      contactoModal.hide();

      // ✅ Recargar la vista completamente
      await ViewManager.refresh();

    } catch (error) {
      Utils.hideLoading();
      Toast.error(error.message);
    }
  });

  $('.eliminar-contacto').on('click', async function () {
    const contactoId = $(this).data('id');

    const confirmado = await Utils.confirm('¿Eliminar este contacto?', 'Confirmar');
    if (!confirmado) return;

    try {
      Utils.showLoading('Eliminando...');
      await API.proveedores.eliminarContacto(proveedor.id, contactoId);

      // ✅ Forzar recarga de datos
      State.invalidateCache('proveedores');

      Utils.hideLoading();
      Toast.success('Contacto eliminado');

      // ✅ Recargar la vista completamente
      await ViewManager.refresh();

    } catch (error) {
      Utils.hideLoading();
      Toast.error(error.message);
    }
  });

  $('.clickable[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });

  Proveedores.bindCommonEvents();
};

// ============================================
// VISTA: CONTACTOS (GESTIÓN DEDICADA)
// ============================================
Proveedores.contactos = async function (params) {
  console.log('👥 Cargando gestión de contactos', params);

  const id = params.id;

  try {
    Utils.showLoading('Cargando contactos...');

    const proveedor = await API.proveedores.obtener(id);
    const layout = Proveedores.renderContactosLayout(proveedor);

    $('#app').html(layout);
    Proveedores.bindContactosEvents(proveedor);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    Toast.error('Error al cargar: ' + error.message);
    console.error(error);
  }
};

Proveedores.renderContactosLayout = function (proveedor) {
  const user = State.getUser();

  return `
    <div class="app-wrapper">
      ${Proveedores.renderSidebar()}
      <main class="main-content">
        ${Proveedores.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Proveedores</a></li>
              <li class="breadcrumb-item"><a href="#proveedores/ver/${proveedor.id}">${proveedor.nombre}</a></li>
              <li class="breadcrumb-item active">Contactos</li>
            </ol>
          </nav>
          
          <div class="d-flex align-items-center mb-4">
            <button class="btn btn-outline-secondary me-3" id="btnVolver">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </button>
            <h2 class="mb-0"><i class="fas fa-users me-2"></i>Contactos de ${proveedor.nombre}</h2>
          </div>
          
          <div class="row">
            <div class="col-lg-5">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0"><i class="fas fa-list me-2"></i>Contactos</h5>
                </div>
                <div class="card-body p-0">
                  ${proveedor.contactos && proveedor.contactos.length > 0 ? `
                    <div class="list-group list-group-flush">
                      ${proveedor.contactos.map(c => `
                        <div class="list-group-item">
                          <div class="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 class="mb-1">${c.nombre}</h6>
                              <p class="mb-1 text-muted small">${c.cargo || 'Sin cargo'}</p>
                              <small>
                                ${c.telefono_movil ? `<i class="fas fa-mobile-alt me-1"></i>${c.telefono_movil}` : ''}
                                ${c.email ? `<i class="fas fa-envelope ms-3 me-1"></i>${c.email}` : ''}
                              </small>
                            </div>
                            <div>
                              <button class="btn btn-sm btn-outline-primary editar-contacto-vista" data-id="${c.id}" data-nombre="${c.nombre}" data-cargo="${c.cargo || ''}" data-telefono="${c.telefono_movil || ''}" data-email="${c.email || ''}">
                                <i class="fas fa-edit"></i>
                              </button>
                              <button class="btn btn-sm btn-outline-danger eliminar-contacto-vista" data-id="${c.id}">
                                <i class="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  ` : `
                    <p class="text-muted text-center py-4">No hay contactos registrados</p>
                  `}
                </div>
              </div>
            </div>
            
            <div class="col-lg-7">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0"><i class="fas fa-plus-circle me-2"></i>Agregar Contacto</h5>
                </div>
                <div class="card-body">
                  <form id="contactoVistaForm">
                    <div class="mb-3">
                      <label class="form-label">Nombre <span class="text-danger">*</span></label>
                      <input type="text" class="form-control" id="contactoVistaNombre" required>
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Cargo</label>
                      <input type="text" class="form-control" id="contactoVistaCargo">
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Teléfono Móvil</label>
                      <input type="text" class="form-control" id="contactoVistaTelefono">
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Email</label>
                      <input type="email" class="form-control" id="contactoVistaEmail">
                    </div>
                    <button type="submit" class="btn btn-primary">
                      <i class="fas fa-plus me-1"></i>Agregar Contacto
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
};

Proveedores.bindContactosEvents = function (proveedor) {
  $('#btnVolver').on('click', () => ViewManager.navegar('proveedores/ver/' + proveedor.id));
  $('.breadcrumb-back').on('click', (e) => { e.preventDefault(); ViewManager.volver(); });

  // Agregar contacto
  $('#contactoVistaForm').on('submit', async function (e) {
    e.preventDefault();

    const editingId = $(this).attr('data-editing-id');
    const nombre = $('#contactoVistaNombre').val().trim();

    if (!nombre) {
      Toast.warning('El nombre es requerido');
      return;
    }

    const data = {
      nombre: nombre,
      cargo: $('#contactoVistaCargo').val().trim() || null,
      telefono_movil: $('#contactoVistaTelefono').val().trim() || null,
      email: $('#contactoVistaEmail').val().trim() || null
    };

    try {
      Utils.showLoading(editingId ? 'Actualizando contacto...' : 'Agregando contacto...');

      if (editingId) {
        await API.proveedores.actualizarContacto(proveedor.id, editingId, data);
      } else {
        await API.proveedores.crearContacto(proveedor.id, data);
      }

      State.invalidateCache('proveedores');

      Utils.hideLoading();
      Toast.success(editingId ? 'Contacto actualizado' : 'Contacto agregado');

      // Limpiar formulario
      $('#contactoVistaNombre').val('');
      $('#contactoVistaCargo').val('');
      $('#contactoVistaTelefono').val('');
      $('#contactoVistaEmail').val('');
      $(this).removeAttr('data-editing-id');
      $('#contactoVistaForm button[type="submit"]').html('<i class="fas fa-plus me-1"></i>Agregar Contacto');

      await ViewManager.refresh();
    } catch (error) {
      Utils.hideLoading();
      Toast.error(error.message);
    }
  });

  // Editar contacto
  $('.editar-contacto-vista').on('click', function () {
    const id = $(this).data('id');
    const nombre = $(this).data('nombre');
    const cargo = $(this).data('cargo');
    const telefono = $(this).data('telefono');
    const email = $(this).data('email');

    $('#contactoVistaNombre').val(nombre);
    $('#contactoVistaCargo').val(cargo);
    $('#contactoVistaTelefono').val(telefono);
    $('#contactoVistaEmail').val(email);

    // Guardar ID en atributo data
    $('#contactoVistaForm').attr('data-editing-id', id);

    // Cambiar texto del botón
    $('#contactoVistaForm button[type="submit"]').html('<i class="fas fa-save me-1"></i>Actualizar Contacto');

    Toast.info('Modifica los campos y presiona Actualizar');
  });

  // Eliminar contacto
  $('.eliminar-contacto-vista').on('click', async function () {
    const contactoId = $(this).data('id');

    const confirmado = await Utils.confirm('¿Eliminar este contacto?', 'Confirmar');
    if (!confirmado) return;

    try {
      Utils.showLoading('Eliminando...');
      await API.proveedores.eliminarContacto(proveedor.id, contactoId);

      // ✅ Forzar recarga
      State.invalidateCache('proveedores');

      Utils.hideLoading();
      Toast.success('Contacto eliminado');

      await ViewManager.refresh();
    } catch (error) {
      Utils.hideLoading();
      Toast.error(error.message);
    }
  });

  Proveedores.bindCommonEvents();
};

window.Proveedores = Proveedores;