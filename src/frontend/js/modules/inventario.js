/**
 * inventario.js - Módulo de gestión de inventario
 */

var Inventario = window.Inventario || {};

Inventario.dataTable = null;

// ============================================
// VISTA PRINCIPAL (INDEX - Cards Dashboard)
// ============================================
Inventario.index = async function () {
  console.log('📦 Cargando módulo de inventario');

  try {
    const stats = await Inventario.obtenerEstadisticas();
    const layout = Inventario.renderIndexLayout(stats);

    $('#app').html(layout);
    Inventario.bindIndexEvents();

  } catch (error) {
    console.error('Error cargando inventario:', error);
    Toast.error('Error al cargar el módulo de inventario');
  }
};

Inventario.obtenerEstadisticas = async function () {
  try {
    return await API.inventario.resumen();
  } catch (error) {
    console.warn('Usando datos mock para inventario');
    return {
      sin_ficha_costo: 2,
      stock_bajo: 3,
      compras_pendientes: 1,
      preparaciones_pendientes: 2
    };
  }
};

Inventario.renderIndexLayout = function (stats) {
  const user = State.getUser();

  return `
    <div class="app-wrapper">
      ${Inventario.renderSidebar()}
      <main class="main-content">
        ${Inventario.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item active">Inventario</li>
            </ol>
          </nav>
          
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="fas fa-warehouse me-2"></i>Gestión de Inventario</h2>
            <div>
              <button class="btn btn-outline-secondary me-2" data-route="inventario/stock">
                <i class="fas fa-list me-1"></i>Ver Stock
              </button>
              <button class="btn btn-outline-secondary me-2" data-route="inventario/movimientos">
                <i class="fas fa-history me-1"></i>Movimientos
              </button>
            </div>
          </div>
          
          <!-- Cards de Resumen -->
          <div class="row g-3 mb-4">
            <div class="col-6 col-md-3">
              <div class="summary-card border-danger clickable" data-route="inventario/stock?filtro=sin-costo" style="cursor: pointer;">
                <div class="summary-content text-center">
                  <h3 class="summary-number text-danger">${stats.sin_ficha_costo}</h3>
                  <p class="summary-label">
                    <i class="fas fa-calculator me-1"></i>Sin Ficha Costo
                  </p>
                </div>
                <div class="summary-details">
                  <small>No pueden venderse</small>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-card border-warning clickable" data-route="inventario/stock?filtro=stock-bajo" style="cursor: pointer;">
                <div class="summary-content text-center">
                  <h3 class="summary-number text-warning">${stats.stock_bajo}</h3>
                  <p class="summary-label">
                    <i class="fas fa-exclamation-triangle me-1"></i>Stock Bajo
                  </p>
                </div>
                <div class="summary-details">
                  <small>Por debajo del mínimo</small>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-card border-info clickable" data-route="compras/listado?filtro=stock-pendiente" style="cursor: pointer;">
                <div class="summary-content text-center">
                  <h3 class="summary-number text-info">${stats.compras_pendientes}</h3>
                  <p class="summary-label">
                    <i class="fas fa-truck me-1"></i>Compras Pendientes
                  </p>
                </div>
                <div class="summary-details">
                  <small>Sin llevar a stock</small>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-card border-success clickable" data-route="inventario/stock?filtro=preparables" style="cursor: pointer;">
                <div class="summary-content text-center">
                  <h3 class="summary-number text-success">${stats.preparaciones_pendientes}</h3>
                  <p class="summary-label">
                    <i class="fas fa-flask me-1"></i>Preparables
                  </p>
                </div>
                <div class="summary-details">
                  <small>Listos para preparar</small>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Acciones Rápidas -->
          <div class="row g-4 mt-2">
            <div class="col-12">
              <div class="dashboard-card">
                <div class="card-header-custom">
                  <h5><i class="fas fa-bolt me-2"></i>Acciones Rápidas</h5>
                </div>
                <div class="quick-actions-grid">
                  <div class="quick-action-item clickable" data-route="inventario/preparar" style="cursor: pointer;">
                    <i class="fas fa-flask"></i>
                    <span>Preparar Producto</span>
                  </div>
                  <div class="quick-action-item clickable" data-route="inventario/ajuste" style="cursor: pointer;">
                    <i class="fas fa-balance-scale"></i>
                    <span>Ajuste Manual</span>
                  </div>
                  <div class="quick-action-item clickable" data-route="compras/listado?filtro=stock-pendiente" style="cursor: pointer;">
                    <i class="fas fa-warehouse"></i>
                    <span>Inventariar Compra</span>
                  </div>
                  <div class="quick-action-item clickable" data-route="inventario/merma" style="cursor: pointer;">
                    <i class="fas fa-trash-alt"></i>
                    <span>Registrar Merma</span>
                  </div>
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
// VISTA LISTADO DE STOCK
// ============================================
Inventario.stock = async function (params) {
  console.log('📋 Cargando listado de stock', params);

  try {
    Utils.showLoading('Cargando stock...');

    const productos = await API.inventario.stock();
    const layout = Inventario.renderStockLayout(productos, params);

    $('#app').html(layout);

    Inventario.initStockTable(productos);
    Inventario.bindStockEvents(params);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    Toast.error('Error al cargar stock: ' + error.message);
    console.error(error);
  }
};

Inventario.renderStockLayout = function (productos, params) {
  const user = State.getUser();
  const filtro = params.filtro || 'todos';

  return `
    <div class="app-wrapper">
      ${Inventario.renderSidebar()}
      <main class="main-content">
        ${Inventario.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#inventario">Inventario</a></li>
              <li class="breadcrumb-item active">Stock Actual</li>
            </ol>
          </nav>
          
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="fas fa-boxes me-2"></i>Stock Actual</h2>
            <a href="#inventario" class="btn btn-outline-secondary">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </a>
          </div>
          
          <!-- Filtros -->
          <div class="mb-3">
            <div class="btn-group">
              <button class="btn btn-outline-primary ${filtro === 'todos' ? 'active' : ''}" data-filtro="todos">
                <i class="fas fa-list me-1"></i>Todos
              </button>
              <button class="btn btn-outline-success ${filtro === 'en-venta' ? 'active' : ''}" data-filtro="en-venta">
                <i class="fas fa-check-circle me-1"></i>En Venta
              </button>
              <button class="btn btn-outline-danger ${filtro === 'sin-costo' ? 'active' : ''}" data-filtro="sin-costo">
                <i class="fas fa-calculator me-1"></i>Sin Ficha Costo
              </button>
              <button class="btn btn-outline-warning ${filtro === 'stock-bajo' ? 'active' : ''}" data-filtro="stock-bajo">
                <i class="fas fa-exclamation-triangle me-1"></i>Stock Bajo
              </button>
              <button class="btn btn-outline-info ${filtro === 'preparables' ? 'active' : ''}" data-filtro="preparables">
                <i class="fas fa-flask me-1"></i>Preparables
              </button>
            </div>
          </div>
          
          <div class="table-responsive">
            <table class="table table-hover" id="stockTable" style="width:100%">
              <thead class="table-light">
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th class="text-end">Stock</th>
                  <th class="text-end">Mínimo</th>
                  <th class="text-center">¿En Venta?</th>
                  <th class="text-center">¿Preparable?</th>
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

Inventario.initStockTable = function (productos) {
  const self = this;

  if (this.dataTable) {
    this.dataTable.destroy();
  }

  $.fn.dataTable.ext.errMode = 'none';

  const tableData = productos.map(p => {
    return [
      p.codigo,                                                // 0
      p.nombre,                                                // 1
      p.categoria_nombre || '-',                               // 2
      `<span class="${p.stock_actual <= p.stock_minimo ? 'text-warning fw-bold' : ''}">${Utils.formatNumber(p.stock_actual, 2)} ${p.unidad_abrev || ''}</span>`, // 3
      `${Utils.formatNumber(p.stock_minimo, 2)} ${p.unidad_abrev || ''}`, // 4
      p.puede_venderse ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-secondary">No</span>', // 5
      p.es_preparable ? (p.puede_prepararse ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-warning">Sin componentes</span>') : '<span class="badge bg-secondary">No</span>', // 6
      p.id,                                                    // 7
      p.tiene_ficha_costo ? 'true' : 'false',                  // 8
      (p.stock_actual <= p.stock_minimo) ? 'true' : 'false',   // 9
      p.es_preparable ? 'true' : 'false',                      // 10
      p.puede_venderse ? 'true' : 'false',                     // 11
      p.puede_prepararse ? 'true' : 'false'                    // 12
    ];
  });

  this.dataTable = $('#stockTable').DataTable({
    data: tableData,
    columns: [
      { data: 0, title: 'Código' },
      { data: 1, title: 'Nombre' },
      { data: 2, title: 'Categoría' },
      { data: 3, title: 'Stock', className: 'text-end' },
      { data: 4, title: 'Mínimo', className: 'text-end' },
      { data: 5, title: '¿En Venta?', className: 'text-center' },
      { data: 6, title: '¿Preparable?', className: 'text-center' },
      {
        data: null,
        orderable: false,
        className: 'text-center',
        render: function (data, type, row) {
          const id = row[7];
          const esPreparable = row[10] === 'true';
          const puedePrepararse = row[12] === 'true';

          return `
              <div class="dropdown">
                <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
                  <i class="fas fa-ellipsis-v"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><a class="dropdown-item ver-producto" href="#" data-id="${id}"><i class="fas fa-eye me-2"></i>Ver producto</a></li>
                  ${esPreparable && puedePrepararse ? `
                    <li><a class="dropdown-item preparar-producto" href="#" data-id="${id}"><i class="fas fa-flask me-2"></i>Preparar</a></li>
                  ` : ''}
                  <li><a class="dropdown-item ajustar-producto" href="#" data-id="${id}"><i class="fas fa-balance-scale me-2"></i>Ajustar stock</a></li>
                </ul>
              </div>
            `;
        }
      },
      { data: 7, title: 'ID', visible: false },
      { data: 8, title: 'TieneCosto', visible: false, searchable: true },
      { data: 9, title: 'StockBajo', visible: false, searchable: true },
      { data: 10, title: 'EsPreparable', visible: false, searchable: true },
      { data: 11, title: 'EnVenta', visible: false, searchable: true },
      { data: 12, title: 'PuedePrepararse', visible: false, searchable: true }
    ],
    order: [[1, 'asc']],
    language: {
      decimal: ",",
      thousands: ".",
      processing: "Procesando...",
      lengthMenu: "Mostrar _MENU_ registros",
      zeroRecords: "No se encontraron resultados",
      emptyTable: "Ningún dato disponible",
      info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
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
      $('#stockTable tbody tr').addClass('clickable-row');
    }
  });
};

Inventario.bindStockEvents = function (params) {
  const self = this;
  const filtroInicial = params.filtro || 'todos';

  $('[data-filtro]').on('click', function () {
    const filtro = $(this).data('filtro');

    $('[data-filtro]').removeClass('active');
    $(this).addClass('active');

    self.dataTable.search('').columns().search('');

    if (filtro === 'todos') {
      self.dataTable.draw();
    } else if (filtro === 'en-venta') {
      self.dataTable.column(12).search('true', true, false).draw();
    } else if (filtro === 'sin-costo') {
      self.dataTable.column(9).search('false', true, false).draw();
    } else if (filtro === 'stock-bajo') {
      self.dataTable.column(10).search('true', true, false).draw();
    } else if (filtro === 'preparables') {
      self.dataTable.column(11).search('true', true, false).draw();
    }
  });

  if (filtroInicial !== 'todos') {
    $(`[data-filtro="${filtroInicial}"]`).trigger('click');
  }

  $('#stockTable tbody').on('dblclick', 'tr', function () {
    const row = self.dataTable.row(this);
    const id = row.data()[7];
    ViewManager.navegar('productos/ver/' + id);
  });

  // Ver producto
  $('#stockTable').on('click', '.ver-producto', function (e) {
    e.preventDefault();
    const id = $(this).data('id');
    ViewManager.navegar('productos/ver/' + id);
  });

  // Preparar producto
  $('#stockTable').on('click', '.preparar-producto', function (e) {
    e.preventDefault();
    const id = $(this).data('id');
    Toast.info('Preparación de productos - Próximamente');
    // ViewManager.navegar('inventario/preparar/' + id);
  });

  // Ajustar stock
  $('#stockTable').on('click', '.ajustar-producto', function (e) {
    e.preventDefault();
    const id = $(this).data('id');
    Toast.info('Ajuste de stock - Próximamente');
    // ViewManager.navegar('inventario/ajuste/' + id);
  });

  Inventario.bindCommonEvents();
};

// ============================================
// MÉTODOS AUXILIARES
// ============================================
Inventario.renderSidebar = function () {
  return `
    <nav class="sidebar bg-dark text-white p-3" id="sidebar">
      <h4 class="text-white mb-4">
        <i class="fas fa-store me-2"></i>POS Admin
      </h4>
      <div class="nav flex-column">
        <a class="nav-link text-white-50" href="#dashboard">
          <i class="fas fa-tachometer-alt me-2"></i>Dashboard
        </a>
        <a class="nav-link text-white active" href="#inventario">
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
        <a class="nav-link text-white-50" href="#proveedores">
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

Inventario.renderNavbar = function (user) {
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

Inventario.bindIndexEvents = function () {
  $('[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });

  $('.clickable[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });

  Inventario.bindCommonEvents();
};

Inventario.bindCommonEvents = function () {
  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));

  $('#sidebar .nav-link').on('click', function (e) {
    e.preventDefault();
    const href = $(this).attr('href');
    if (href && href !== '#') {
      ViewManager.navegar(href.substring(1), {}, { reset: true });
    }
    if ($(window).width() < 768) $('#sidebar').removeClass('show');
  });

  $('#btnLogout').on('click', (e) => {
    e.preventDefault();
    App.logout();
  });
};

// ============================================
// VISTA MOVIMIENTOS
// ============================================
Inventario.movimientos = async function (params) {
  console.log('📋 Cargando movimientos de inventario', params);

  try {
    Utils.showLoading('Cargando movimientos...');

    const movimientos = await API.inventario.movimientos();
    const layout = Inventario.renderMovimientosLayout(movimientos, params);

    $('#app').html(layout);

    Inventario.initMovimientosTable(movimientos);
    Inventario.bindMovimientosEvents(params);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    Toast.error('Error al cargar movimientos: ' + error.message);
    console.error(error);
  }
};

Inventario.renderMovimientosLayout = function (movimientos, params) {
  const user = State.getUser();
  const filtro = params.filtro || 'todos';

  return `
    <div class="app-wrapper">
      ${Inventario.renderSidebar()}
      <main class="main-content">
        ${Inventario.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#inventario">Inventario</a></li>
              <li class="breadcrumb-item active">Movimientos</li>
            </ol>
          </nav>
          
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="fas fa-history me-2"></i>Movimientos de Inventario</h2>
            <a href="#inventario" class="btn btn-outline-secondary">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </a>
          </div>
          
          <!-- Filtros -->
          <div class="mb-3">
            <div class="btn-group">
              <button class="btn btn-outline-primary ${filtro === 'todos' ? 'active' : ''}" data-filtro="todos">
                <i class="fas fa-list me-1"></i>Todos
              </button>
              <button class="btn btn-outline-success ${filtro === 'compra' ? 'active' : ''}" data-filtro="compra">
                <i class="fas fa-shopping-cart me-1"></i>Compras
              </button>
              <button class="btn btn-outline-info ${filtro === 'venta' ? 'active' : ''}" data-filtro="venta">
                <i class="fas fa-cash-register me-1"></i>Ventas
              </button>
              <button class="btn btn-outline-warning ${filtro === 'preparacion' ? 'active' : ''}" data-filtro="preparacion">
                <i class="fas fa-flask me-1"></i>Preparaciones
              </button>
              <button class="btn btn-outline-danger ${filtro === 'merma' ? 'active' : ''}" data-filtro="merma">
                <i class="fas fa-trash-alt me-1"></i>Mermas
              </button>
              <button class="btn btn-outline-secondary ${filtro === 'ajuste' ? 'active' : ''}" data-filtro="ajuste">
                <i class="fas fa-balance-scale me-1"></i>Ajustes
              </button>
            </div>
          </div>
          
          <div class="table-responsive">
            <table class="table table-hover" id="movimientosTable" style="width:100%">
              <thead class="table-light">
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th class="text-end">Cantidad</th>
                  <th>Usuario</th>
                  <th>Observaciones</th>
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

Inventario.initMovimientosTable = function (movimientos) {
  const self = this;

  if (this.dataTable) {
    this.dataTable.destroy();
  }

  $.fn.dataTable.ext.errMode = 'none';

  const tableData = movimientos.map(m => {
    let tipoBadge = '';
    switch (m.tipo) {
      case 'compra': tipoBadge = '<span class="badge bg-success">Compra</span>'; break;
      case 'venta': tipoBadge = '<span class="badge bg-info">Venta</span>'; break;
      case 'preparacion_entrada': tipoBadge = '<span class="badge bg-primary">Prep. Entrada</span>'; break;
      case 'preparacion_salida': tipoBadge = '<span class="badge bg-warning">Prep. Salida</span>'; break;
      case 'merma': tipoBadge = '<span class="badge bg-danger">Merma</span>'; break;
      case 'ajuste': tipoBadge = '<span class="badge bg-secondary">Ajuste</span>'; break;
      default: tipoBadge = `<span class="badge bg-secondary">${m.tipo}</span>`;
    }

    const cantidadClass = m.cantidad > 0 ? 'text-success' : 'text-danger';
    const cantidadSigno = m.cantidad > 0 ? '+' : '';

    return [
      Utils.formatDate(m.fecha, 'datetime'),
      `${m.producto_nombre} <small class="text-muted">${m.codigo}</small>`,
      tipoBadge,
      `<span class="${cantidadClass} fw-bold">${cantidadSigno}${Utils.formatNumber(m.cantidad, 2)}</span>`,
      m.usuario_nombre || 'Sistema',
      m.observaciones || '-',
      m.tipo
    ];
  });

  this.dataTable = $('#movimientosTable').DataTable({
    data: tableData,
    columns: [
      { data: 0, title: 'Fecha' },
      { data: 1, title: 'Producto' },
      { data: 2, title: 'Tipo' },
      { data: 3, title: 'Cantidad', className: 'text-end' },
      { data: 4, title: 'Usuario' },
      { data: 5, title: 'Observaciones' },
      { data: 6, title: 'TipoFiltro', visible: false, searchable: true }
    ],
    order: [[0, 'desc']],
    language: {
      decimal: ",",
      thousands: ".",
      processing: "Procesando...",
      lengthMenu: "Mostrar _MENU_ registros",
      zeroRecords: "No se encontraron resultados",
      emptyTable: "Ningún movimiento registrado",
      info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
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
      $('#movimientosTable tbody tr').addClass('clickable-row');
    }
  });
};

Inventario.bindMovimientosEvents = function (params) {
  const self = this;
  const filtroInicial = params.filtro || 'todos';

  $('[data-filtro]').on('click', function () {
    const filtro = $(this).data('filtro');

    $('[data-filtro]').removeClass('active');
    $(this).addClass('active');

    self.dataTable.search('').columns().search('');

    if (filtro === 'todos') {
      self.dataTable.draw();
    } else if (filtro === 'compra') {
      self.dataTable.column(6).search('compra', true, false).draw();
    } else if (filtro === 'venta') {
      self.dataTable.column(6).search('venta', true, false).draw();
    } else if (filtro === 'preparacion') {
      self.dataTable.column(6).search('preparacion', true, false).draw();
    } else if (filtro === 'merma') {
      self.dataTable.column(6).search('merma', true, false).draw();
    } else if (filtro === 'ajuste') {
      self.dataTable.column(6).search('ajuste', true, false).draw();
    }
  });

  if (filtroInicial !== 'todos') {
    $(`[data-filtro="${filtroInicial}"]`).trigger('click');
  }

  Inventario.bindCommonEvents();
};

// ============================================
// VISTA PREPARAR PRODUCTO
// ============================================
Inventario.preparar = async function (params) {
  console.log('🧪 Cargando preparación de productos');

  try {
    Utils.showLoading('Cargando productos preparables...');

    const productos = await API.inventario.preparables();
    const layout = Inventario.renderPrepararLayout(productos);

    $('#app').html(layout);
    Inventario.bindPrepararEvents(productos);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    Toast.error('Error al cargar: ' + error.message);
    console.error(error);
  }
};

Inventario.renderPrepararLayout = function (productos) {
  const user = State.getUser();
  const preparables = productos.filter(p => p.todos_suficientes);

  return `
    <div class="app-wrapper">
      ${Inventario.renderSidebar()}
      <main class="main-content">
        ${Inventario.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#inventario">Inventario</a></li>
              <li class="breadcrumb-item active">Preparar Producto</li>
            </ol>
          </nav>
          
          <div class="d-flex align-items-center mb-4">
            <a href="#inventario" class="btn btn-outline-secondary me-3">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </a>
            <h2 class="mb-0"><i class="fas fa-flask me-2"></i>Preparar Producto</h2>
          </div>
          
          ${preparables.length === 0 ? `
            <div class="alert alert-info">
              <i class="fas fa-info-circle me-2"></i>
              No hay productos listos para preparar en este momento.
            </div>
          ` : `
            <div class="row">
              <div class="col-lg-8">
                <div class="card">
                  <div class="card-header">
                    <h5 class="mb-0">Selecciona un producto para preparar</h5>
                  </div>
                  <div class="card-body">
                    <div class="row g-3">
                      ${preparables.map(p => `
                        <div class="col-md-6">
                          <div class="card producto-preparable" data-id="${p.id}" data-max="${p.cantidad_maxima}">
                            <div class="card-body">
                              <h6>${p.nombre}</h6>
                              <small class="text-muted">${p.codigo}</small>
                              <div class="mt-2">
                                <span class="badge bg-info">Stock actual: ${Utils.formatNumber(p.stock_actual, 2)} ${p.unidad_abrev}</span>
                                <span class="badge bg-success">Máx. preparable: ${p.cantidad_maxima}</span>
                              </div>
                              <div class="mt-3">
                                <label class="form-label">Cantidad a preparar</label>
                                <input type="number" class="form-control form-control-sm cantidad-preparar" 
                                       value="1" min="1" max="${p.cantidad_maxima}" step="1">
                              </div>
                              <button class="btn btn-primary w-100 mt-2 btn-preparar">
                                <i class="fas fa-flask me-1"></i>Preparar
                              </button>
                            </div>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `}
        </div>
      </main>
    </div>
  `;
};

Inventario.bindPrepararEvents = function (productos) {
  $('.btn-preparar').on('click', async function () {
    const card = $(this).closest('.producto-preparable');
    const id = card.data('id');
    const max = card.data('max');
    const cantidad = parseInt(card.find('.cantidad-preparar').val());

    if (!cantidad || cantidad < 1) {
      Toast.warning('Ingrese una cantidad válida');
      return;
    }

    if (cantidad > max) {
      Toast.warning(`La cantidad máxima es ${max}`);
      return;
    }

    const confirmado = await Utils.confirm(`¿Preparar ${cantidad} unidades?`, 'Confirmar preparación');
    if (!confirmado) return;

    try {
      Utils.showLoading('Preparando producto...');
      await API.inventario.preparar(id, { cantidad });

      State.invalidateCache('productos');
      State.invalidateCache('inventario');

      Utils.hideLoading();
      Toast.success('Producto preparado correctamente');

      // Recargar la vista
      const nuevosProductos = await API.inventario.preparables();
      const layout = Inventario.renderPrepararLayout(nuevosProductos);
      $('#app').html(layout);
      Inventario.bindPrepararEvents(nuevosProductos);

    } catch (error) {
      Utils.hideLoading();
      Toast.error(error.message);
    }
  });

  Inventario.bindCommonEvents();
};

// ============================================
// VISTA AJUSTE DE INVENTARIO
// ============================================
Inventario.ajuste = async function (params) {
  console.log('⚖️ Cargando ajuste de inventario', params);

  const productoId = params.id || null;

  try {
    Utils.showLoading('Cargando...');

    const productos = await API.productos.listar();
    const productosActivos = productos.filter(p => p.activo);

    const layout = Inventario.renderAjusteLayout(productosActivos, productoId);
    $('#app').html(layout);

    if (productoId) {
      $('#productoId').val(productoId);
      await Inventario.cargarInfoProducto(productoId);
    }

    Inventario.bindAjusteEvents();

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    Toast.error('Error al cargar: ' + error.message);
    console.error(error);
  }
};

Inventario.renderAjusteLayout = function (productos, productoSeleccionado) {
  const user = State.getUser();

  const productosOptions = productos
    .map(p => `<option value="${p.id}" ${productoSeleccionado == p.id ? 'selected' : ''}>${p.nombre} (${p.codigo})</option>`)
    .join('');

  return `
    <div class="app-wrapper">
      ${Inventario.renderSidebar()}
      <main class="main-content">
        ${Inventario.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#inventario">Inventario</a></li>
              <li class="breadcrumb-item active">Ajuste de Stock</li>
            </ol>
          </nav>
          
          <div class="d-flex align-items-center mb-4">
            <a href="#inventario" class="btn btn-outline-secondary me-3">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </a>
            <h2 class="mb-0"><i class="fas fa-balance-scale me-2"></i>Ajuste de Stock</h2>
          </div>
          
          <div class="row">
            <div class="col-lg-6">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0">Registrar Ajuste</h5>
                </div>
                <div class="card-body">
                  <form id="ajusteForm">
                    <div class="mb-3">
                      <label class="form-label">Producto <span class="text-danger">*</span></label>
                      <select class="form-select" id="productoId" required>
                        <option value="">Seleccione un producto...</option>
                        ${productosOptions}
                      </select>
                    </div>
                    
                    <div class="mb-3">
                      <label class="form-label">Stock Actual</label>
                      <input type="text" class="form-control" id="stockActual" readonly disabled>
                    </div>
                    
                    <div class="mb-3">
                      <label class="form-label">Tipo de Ajuste <span class="text-danger">*</span></label>
                      <select class="form-select" id="tipoAjuste" required>
                        <option value="">Seleccione tipo...</option>
                        <option value="merma">🗑️ Merma (pérdida)</option>
                        <option value="donacion">🎁 Donación (salida sin venta)</option>
                        <option value="autoconsumo">🍽️ Autoconsumo</option>
                        <option value="ajuste">⚖️ Ajuste Manual (+/-)</option>
                      </select>
                    </div>
                    
                    <div class="mb-3">
                      <label class="form-label">Cantidad <span class="text-danger">*</span></label>
                      <input type="number" class="form-control" id="cantidad" step="0.01" min="0.01" required>
                      <small class="text-muted" id="ayudaCantidad">Ingrese la cantidad (valor absoluto)</small>
                    </div>
                    
                    <div class="mb-3">
                      <label class="form-label">Observaciones</label>
                      <textarea class="form-control" id="observaciones" rows="2" placeholder="Motivo del ajuste..."></textarea>
                    </div>
                    
                    <div class="alert alert-warning" id="ajusteAlerta" style="display: none;">
                      <i class="fas fa-exclamation-triangle me-2"></i>
                      <span id="ajusteMensaje"></span>
                    </div>
                    
                    <div class="d-grid">
                      <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save me-1"></i>Registrar Ajuste
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            
            <div class="col-lg-6">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0"><i class="fas fa-info-circle me-2"></i>Información</h5>
                </div>
                <div class="card-body">
                  <ul class="mb-0">
                    <li class="mb-2"><strong>Merma:</strong> Pérdida de producto por deterioro, caducidad, etc. (descuenta stock)</li>
                    <li class="mb-2"><strong>Donación:</strong> Salida de producto sin contraprestación económica (descuenta stock)</li>
                    <li class="mb-2"><strong>Autoconsumo:</strong> Uso interno del producto (descuenta stock)</li>
                    <li class="mb-2"><strong>Ajuste Manual:</strong> Corrección de inventario. Puede ser positivo (entrada) o negativo (salida)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
};

Inventario.cargarInfoProducto = async function (productoId) {
  try {
    const producto = await API.productos.obtener(productoId);
    $('#stockActual').val(`${Utils.formatNumber(producto.stock_actual, 2)} ${producto.unidad_venta_abrev || ''}`);
    $('#stockActual').data('valor', producto.stock_actual);
  } catch (error) {
    console.error('Error cargando producto:', error);
  }
};

Inventario.bindAjusteEvents = function () {
  // Al cambiar producto, cargar su stock
  $('#productoId').on('change', async function () {
    const productoId = $(this).val();
    if (productoId) {
      await Inventario.cargarInfoProducto(productoId);
    } else {
      $('#stockActual').val('');
    }
    Inventario.validarAjuste();
  });

  // Al cambiar tipo o cantidad, validar
  $('#tipoAjuste, #cantidad').on('change input', function () {
    Inventario.validarAjuste();
  });

  // Submit del formulario
  $('#ajusteForm').on('submit', async function (e) {
    e.preventDefault();

    if (!Inventario.validarAjuste()) return;

    const productoId = $('#productoId').val();
    const tipo = $('#tipoAjuste').val();
    const cantidad = parseFloat($('#cantidad').val());
    const observaciones = $('#observaciones').val().trim();

    const confirmado = await Utils.confirm(
      `¿Registrar ${tipo} de ${cantidad} unidades?`,
      'Confirmar ajuste'
    );

    if (!confirmado) return;

    try {
      Utils.showLoading('Registrando ajuste...');

      await API.inventario.crearAjuste({
        producto_id: parseInt(productoId),
        tipo: tipo,
        cantidad: cantidad,
        observaciones: observaciones || null
      });

      State.invalidateCache('productos');
      State.invalidateCache('inventario');

      Utils.hideLoading();
      Toast.success('Ajuste registrado correctamente');

      // Limpiar formulario
      $('#productoId').val('');
      $('#stockActual').val('');
      $('#tipoAjuste').val('');
      $('#cantidad').val('');
      $('#observaciones').val('');
      $('#ajusteAlerta').hide();

    } catch (error) {
      Utils.hideLoading();
      Toast.error(error.message);
    }
  });

  Inventario.bindCommonEvents();
};

Inventario.validarAjuste = function () {
  const productoId = $('#productoId').val();
  const tipo = $('#tipoAjuste').val();
  const cantidad = parseFloat($('#cantidad').val());
  const stockActual = $('#stockActual').data('valor') || 0;

  if (!productoId || !tipo || !cantidad) {
    return false;
  }

  let esValido = true;
  let mensaje = '';

  // Para merma, donación, autoconsumo: la cantidad no puede superar el stock
  if (['merma', 'donacion', 'autoconsumo'].includes(tipo)) {
    if (cantidad > stockActual) {
      esValido = false;
      mensaje = `Stock insuficiente. Stock actual: ${stockActual}`;
    } else {
      mensaje = `Se descontarán ${cantidad} unidades del stock. Stock resultante: ${stockActual - cantidad}`;
    }
  }

  // Para ajuste manual: advertir si se descuenta más del stock
  if (tipo === 'ajuste') {
    const cantidadFinal = cantidad;
    if (cantidadFinal < 0 && Math.abs(cantidadFinal) > stockActual) {
      esValido = false;
      mensaje = `No se puede descontar más del stock actual (${stockActual})`;
    } else if (cantidadFinal > 0) {
      mensaje = `Se incrementará el stock en ${cantidad} unidades. Stock resultante: ${stockActual + cantidad}`;
    } else if (cantidadFinal < 0) {
      mensaje = `Se descontarán ${Math.abs(cantidad)} unidades. Stock resultante: ${stockActual - Math.abs(cantidad)}`;
    }
  }

  if (mensaje) {
    $('#ajusteMensaje').text(mensaje);
    $('#ajusteAlerta').show();
    $('#ajusteAlerta').removeClass('alert-warning alert-danger').addClass(esValido ? 'alert-warning' : 'alert-danger');
  } else {
    $('#ajusteAlerta').hide();
  }

  return esValido;
};

window.Inventario = Inventario;