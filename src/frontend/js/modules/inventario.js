/**
 * inventario.js - Módulo de gestión de inventario
 */

var Inventario = window.Inventario || {};

Inventario.dataTable = null;
Inventario.selProduct = null;

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
      ${Sidebar.render('inventario')}
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
          
          <!-- Cards de Resumen (propietario: bajo stock, compras pendientes, stock negativo, por preparar) -->
          <div class="row g-3 mb-4">
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
              <div class="summary-card border-danger clickable" data-route="inventario/stock" style="cursor: pointer;">
                <div class="summary-content text-center">
                  <h3 class="summary-number text-danger">${stats.backorders_mayorista || 0}</h3>
                  <p class="summary-label">
                    <i class="fas fa-arrow-trend-down me-1"></i>Stock Negativo
                  </p>
                </div>
                <div class="summary-details">
                  <small>Backorders mayoristas</small>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-card border-success clickable" data-route="inventario/preparar" style="cursor: pointer;">
                <div class="summary-content text-center">
                  <h3 class="summary-number text-success">${stats.preparaciones_pendientes}</h3>
                  <p class="summary-label">
                    <i class="fas fa-flask me-1"></i>Por Preparar
                  </p>
                </div>
                <div class="summary-details">
                  <small>Elaborados listos</small>
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
                  <div class="quick-action-item clickable" data-route="inventario/intercambio" style="cursor: pointer;">
                    <i class="fas fa-exchange-alt"></i>
                    <span>Intercambio Reventa→Granel</span>
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
    console.error(error);
  }
};

Inventario.renderStockLayout = function (productos, params) {
  const user = State.getUser();
  const filtro = params.filtro || 'todos';

  return `
    <div class="app-wrapper">
      ${Sidebar.render('inventario')}
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
              <a href="#inventario" class="btn btn-outline-secondary me-2"><i class="fas fa-th-large me-1"></i>Vista Cards</a>
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
      `<span class="${p.stock_efectivo <= p.stock_minimo ? 'text-warning fw-bold' : ''}">${p.unidad_venta_tipo === 'unidad' ? Math.floor(p.stock_efectivo) : Utils.formatNumber(p.stock_efectivo, 1)} ${p.unidad_abrev}</span>`, // 3
      `${p.unidad_venta_tipo === 'unidad' ? Math.floor(p.stock_minimo) : Utils.formatNumber(p.stock_minimo, 1)} ${p.unidad_abrev}`, // 4
      p.puede_venderse ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-secondary">No</span>', // 5
      p.es_preparable ? (p.puede_prepararse ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-warning">Sin componentes</span>') : '<span class="badge bg-secondary">No</span>',  // 6
      p.id,                                                    // 7
      p.tiene_ficha_costo ? 'true' : 'false',                  // 8
      (p.stock_efectivo <= p.stock_minimo) ? 'true' : 'false',   // 9
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
      const $table = $(this);
      const rows = $table.DataTable().rows({ page: 'current' }).count();

      // Eliminar filas vacías anteriores
      $table.find('.empty-row').remove();

      // Si hay menos de 5 filas, añadir vacías
      if (rows > 0 && rows < 5) {
        const tbody = $table.find('tbody');
        const emptyRows = 5 - rows;
        const colCount = $table.find('thead th').length;
        for (let i = 0; i < emptyRows; i++) {
          tbody.append(`<tr class="empty-row" style="height: 45px;"><td colspan="${colCount}">&nbsp;</td></tr>`);
        }
      }
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
    if ($(this).hasClass('empty-row')) return;  // ← Ignorar filas vacías

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
    ViewManager.navegar('inventario/preparar/' + id);
  });

  // Ajustar stock
  $('#stockTable').on('click', '.ajustar-producto', function (e) {
    e.preventDefault();
    const id = $(this).data('id');
    ViewManager.navegar('inventario/ajuste/' + id);
  });

  Inventario.bindCommonEvents();
};

// ============================================
// MÉTODOS AUXILIARES
// ============================================

Inventario.renderNavbar = function (user) {
  return `
    <nav class="navbar navbar-light bg-white border-bottom px-3">
      <button class="btn btn-link d-md-none" id="toggleSidebar">
        <i class="fas fa-bars"></i>
      </button>
            ${Sidebar.brandNav()}
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

    const [movimientos, tipos] = await Promise.all([
      API.inventario.movimientos(),
      API.inventario.tiposMovimiento()
    ]);
    Inventario._tiposMovimiento = tipos;

    const layout = Inventario.renderMovimientosLayout(movimientos, params, tipos);

    $('#app').html(layout);

    Inventario.initMovimientosTable(movimientos, tipos);
    Inventario.bindMovimientosEvents(params);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Inventario.renderMovimientosLayout = function (movimientos, params, tipos = []) {
  const user = State.getUser();
  const filtro = params.filtro || 'todos';

  // Botones de filtro generados desde el catálogo de tipos (D7)
  const botonesFiltro = tipos.map(t => `
    <button class="btn btn-outline-secondary ${filtro === t.codigo ? 'active' : ''}" data-filtro="${t.codigo}">
      ${t.nombre}
    </button>
  `).join('');

  return `
    <div class="app-wrapper">
      ${Sidebar.render('inventario')}
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
            <a href="#inventario" class="btn btn-outline-secondary me-2"><i class="fas fa-th-large me-1"></i>Vista Cards</a>
          </div>
          
          <!-- Filtros (desde catálogo tipos_movimiento, D7) -->
          <div class="mb-3">
            <div class="btn-group flex-wrap">
              <button class="btn btn-outline-primary ${filtro === 'todos' ? 'active' : ''}" data-filtro="todos">
                <i class="fas fa-list me-1"></i>Todos
              </button>
              ${botonesFiltro}
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

Inventario.initMovimientosTable = function (movimientos, tipos = []) {
  const self = this;

  if (this.dataTable) {
    this.dataTable.destroy();
  }

  $.fn.dataTable.ext.errMode = 'none';

  // Badges desde el catálogo (D7): color por signo
  const badgePorTipo = {};
  tipos.forEach(t => {
    const color = t.signo === '+' ? 'success' : t.signo === '-' ? 'danger' : 'secondary';
    badgePorTipo[t.codigo] = `<span class="badge bg-${color}">${t.nombre}</span>`;
  });

  const tableData = movimientos.map(m => {
    const tipoBadge = badgePorTipo[m.tipo] || `<span class="badge bg-secondary">${m.tipo}</span>`;

    const cantidadClass = m.cantidad > 0 ? 'text-success' : 'text-danger';
    const cantidadSigno = m.cantidad > 0 ? '+' : '';

    return [
      Utils.formatearFecha(Utils.fechaISOToLocal(m.fecha), 'datetime'),
      `${m.producto_nombre} <small class="text-muted">${m.codigo}</small>`,
      tipoBadge,
      `<span class="${cantidadClass} fw-bold">${cantidadSigno}${Utils.formatNumber(m.cantidad, 1)}</span>`,
      m.usuario_nombre || 'Sistema',
      m.observaciones || '-',
      m.tipo,
      m.referencia_id || ''
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
      const $table = $(this);
      const rows = $table.DataTable().rows({ page: 'current' }).count();

      // Eliminar filas vacías anteriores
      $table.find('.empty-row').remove();

      // Si hay menos de 5 filas, añadir vacías
      if (rows > 0 && rows < 5) {
        const tbody = $table.find('tbody');
        const emptyRows = 5 - rows;
        const colCount = $table.find('thead th').length;
        for (let i = 0; i < emptyRows; i++) {
          tbody.append(`<tr class="empty-row" style="height: 45px;"><td colspan="${colCount}">&nbsp;</td></tr>`);
        }
      }
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
    } else {
      // Filtro genérico por código de tipo (catálogo D7); 'preparacion' agrupa entrada+salida
      const patron = filtro === 'preparacion' ? 'preparacion' : `^${filtro}$`;
      self.dataTable.column(6).search(patron, true, false).draw();
    }
  });

  $('#movimientosTable tbody').on('dblclick', 'tr', function () {
    if ($(this).hasClass('empty-row')) return;  // ← Ignorar filas vacías

    const row = self.dataTable.row(this).data();
    const tipo = row[6]; // Índice del TipoFiltro
    const refId = row[7]; // Índice del ReferenciaID

    if (refId) {
      if (tipo === 'compra') {
        ViewManager.navegar('compras/ver/' + refId);
      } else if (tipo === 'venta') {
        ViewManager.navegar('ventas/ver/' + refId);
      }
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

    const productos = await API.inventario.preparables();  // ← Este endpoint

    const layout = Inventario.renderPrepararLayout(productos);
    $('#app').html(layout);

    Inventario.bindPrepararEvents(productos);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Inventario.renderPrepararLayout = function (productos) {
  const user = State.getUser();

  // Separar productos
  const listos = productos.filter(p => p.todos_suficientes);
  const pendientes = productos.filter(p => !p.todos_suficientes && p.componentes.length > 0);

  return `
    <div class="app-wrapper">
      ${Sidebar.render('inventario')}
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
          
          <!-- ✅ LISTOS PARA PREPARAR -->
          ${listos.length > 0 ? `
            <h4 class="mb-3"><i class="fas fa-check-circle text-success me-2"></i>Listos para preparar</h4>
            <div class="row g-3 mb-4">
              ${listos.map(p => `
                <div class="col-md-6">
                  <div class="card producto-preparable" data-id="${p.id}" data-max="${p.cantidad_maxima}" data-unidad="${p.unidad_nombre || p.unidad_abrev || ''}">
                    <div class="card-body">
                      <h6>${p.nombre} <span class="badge bg-success">${p.cantidad_maxima} preparables</span></h6>
                      <small class="text-muted">${p.codigo}</small>
                      <div class="mt-3">
                        <label class="form-label">${p.unidad_nombre || p.unidad_abrev || 'unidad de venta'} a preparar</label>
                        <input type="number" class="form-control form-control-sm cantidad-preparar" value="1" min="1" max="${p.cantidad_maxima}" step="1">
                      </div>
                      <button class="btn btn-primary w-100 mt-2 btn-preparar">
                        <i class="fas fa-flask me-1"></i>Preparar
                      </button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <!-- ⚠️ PENDIENTES DE STOCK -->
          ${pendientes.length > 0 ? `
            <h4 class="mb-3"><i class="fas fa-exclamation-triangle text-warning me-2"></i>Pendientes de stock</h4>
            <div class="row g-3">
              ${pendientes.map(p => `
                <div class="col-md-6">
                  <div class="card border-warning">
                    <div class="card-body">
                      <h6>${p.nombre}</h6>
                      <small class="text-muted">${p.codigo}</small>
                      <div class="mt-2">
                        <span class="badge bg-warning">Stock insuficiente</span>
                      </div>
                      <div class="mt-2 small">
                        <strong>Componentes faltantes:</strong>
                        <ul class="mb-2 mt-1">
                          ${p.componentes.filter(c => !c.suficiente).map(c => `
                            <li>${c.nombre}: necesita ${c.cantidad}, hay ${c.stock_actual}</li>
                          `).join('')}
                        </ul>
                      </div>
                      <a href="#productos/receta/${p.id}" class="btn btn-outline-primary btn-sm w-100">
                        <i class="fas fa-list-ul me-1"></i>Ver receta
                      </a>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${listos.length === 0 && pendientes.length === 0 ? `
            <div class="alert alert-info">
              <i class="fas fa-info-circle me-2"></i>
              No hay productos compuestos que requieran preparación.
            </div>
          ` : ''}
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

    const confirmado = await Utils.confirm(`¿Preparar ${cantidad} ${card.data('unidad') || 'unidades'}?`, 'Confirmar preparación');
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
      console.log(error);
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
  const tipoInicial = params.tipo || '';  // ✅ Recibir tipo


  try {
    Utils.showLoading('Cargando...');

    Inventario.selProduct = null;
    const productos = await API.productos.listar();
    const productosAjustables = productos.filter(p => p.activo && (p.tipo === 'simple' || (p.tipo === 'compuesto' && p.sub_tipo === 'elaborado')));
    const layout = Inventario.renderAjusteLayout(productosAjustables, productoId, tipoInicial);

    $('#app').html(layout);

    if (productoId) {
      $('#productoId').val(productoId);
      await Inventario.cargarInfoProducto(productoId);
    }

    // ✅ Seleccionar tipo si viene en params
    if (tipoInicial) {
      $('#tipoAjuste').val(tipoInicial);
      Inventario.validarAjuste();
    }

    Inventario.bindAjusteEvents();

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Inventario.renderAjusteLayout = function (productos, productoSeleccionado, tipoInicial) {
  const user = State.getUser();

  const productosOptions = productos
    .map(p => `<option value="${p.id}" ${productoSeleccionado == p.id ? 'selected' : ''}>${p.nombre} (${p.codigo})</option>`)
    .join('');

  return `
    <div class="app-wrapper">
      ${Sidebar.render('inventario')}
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
                        <option value="merma" ${tipoInicial === 'merma' ? 'selected' : ''}>🗑️ Merma (salida por pérdida)</option>
                        <option value="donacion_salida" ${tipoInicial === 'donacion_salida' ? 'selected' : ''}>🎁 Donación entregada (salida)</option>
                        <option value="donacion_entrada" ${tipoInicial === 'donacion_entrada' ? 'selected' : ''}>🎁 Donación recibida (entrada)</option>
                        <option value="autoconsumo" ${tipoInicial === 'autoconsumo' ? 'selected' : ''}>🍽️ Autoconsumo (salida)</option>
                        <option value="ajuste" ${tipoInicial === 'ajuste' ? 'selected' : ''}>⚖️ Ajuste Manual (+/-)</option>
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
                    <li class="mb-2"><strong>Donación entregada:</strong> Salida de producto sin contraprestación (descuenta stock)</li>
                    <li class="mb-2"><strong>Donación recibida:</strong> Entrada de producto sin contraprestación (incrementa stock)</li>
                    <li class="mb-2"><strong>Autoconsumo:</strong> Uso interno del producto (descuenta stock)</li>
                    <li class="mb-2"><strong>Ajuste Manual:</strong> Corrección de inventario. Puede ser positivo (entrada) o negativo (salida)</li>
                    <li class="mb-2"><strong>Intercambio (reventa→granel):</strong> desde la acción "Intercambio" en Inventario</li>
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
    Inventario.selProduct = await API.productos.obtener(productoId);
    $('#stockActual').val(`${Utils.formatNumber(Inventario.selProduct.stock_actual, 1)} ${Inventario.selProduct.unidad_venta_abrev || ''}`);
    $('#stockActual').data('valor', Inventario.selProduct.stock_actual);
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
      console.log(error);
    }
  });

  Inventario.bindCommonEvents();
};

Inventario.validarAjuste = function () {
  const productoId = $('#productoId').val();
  const productos = State.getCache('productos');
  const tipo = $('#tipoAjuste').val();
  const cantidad = parseFloat($('#cantidad').val());
  const stockActual = $('#stockActual').data('valor') || 0;

  if (!productoId || !tipo || !cantidad) {
    return false;
  }
  const p = Inventario.selProduct;

  let esValido = true;
  let mensaje = '';

  // Salidas (merma, donación entregada, autoconsumo): la cantidad no puede superar el stock
  if (['merma', 'donacion_salida', 'autoconsumo'].includes(tipo)) {
    if (cantidad > stockActual) {
      esValido = false;
      mensaje = `Stock insuficiente. Stock actual: ${stockActual}`;
    } else {
      const stk = stockActual - cantidad;
      mensaje = `Se descontarán ${cantidad} ${p.unidad_venta_abrev} del stock. Stock resultante: ${p.unidad_venta_tipo === 'unidad' ? Math.floor(stk) : Utils.formatNumber(stk, 1)} ${p.unidad_venta_abrev}`;
    }
  }

  // Entradas (donación recibida): siempre válidas
  if (tipo === 'donacion_entrada') {
    mensaje = `Se incrementará el stock en ${cantidad} ${p.unidad_venta_abrev}. Stock resultante: ${p.unidad_venta_tipo === 'unidad' ? Math.floor(stockActual + cantidad) : Utils.formatNumber(stockActual + cantidad, 1)} ${p.unidad_venta_abrev}`;
  }

  // Para ajuste manual: advertir si se descuenta más del stock
  if (tipo === 'ajuste') {
    const cantidadFinal = cantidad;
    if (cantidadFinal < 0 && Math.abs(cantidadFinal) > stockActual) {
      esValido = false;
      mensaje = `No se puede descontar más del stock actual (${stockActual})`;
    } else if (cantidadFinal > 0) {
      mensaje = `Se incrementará el stock en ${cantidad} ${p.unidad_venta_abrev}. Stock resultante: ${p.unidad_venta_tipo === 'unidad' ? Math.floor(stockActual + cantidad) : Utils.formatNumber(stockActual + cantidad, 1)} ${p.unidad_venta_abrev}`;
    } else if (cantidadFinal < 0) {
      mensaje = `Se descontarán ${Math.abs(cantidad)} ${p.unidad_venta_abrev}. Stock resultante: ${p.unidad_venta_tipo === 'unidad' ? Math.floor(stockActual - Math.abs(cantidad)) : Utils.formatNumber(stockActual - Math.abs(cantidad), 1)} ${p.unidad_venta_abrev}`;
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

// ============================================
// VISTA INTERCAMBIO (D6): conversión reventa → granel
// El usuario define las cantidades equivalentes y es responsable de ellas.
// ============================================
Inventario.intercambio = async function (params) {
  console.log('🔄 Cargando intercambio reventa→granel');

  try {
    Utils.showLoading('Cargando...');

    const productos = await API.productos.listar();
    const origenes = productos.filter(p => p.activo && p.tipo === 'simple' && p.sub_tipo === 'reventa' && p.stock_actual > 0);
    const destinos = productos.filter(p => p.activo && p.tipo === 'simple' && p.sub_tipo === 'granel');

    const opciones = (lista, conStock) => lista.map(p =>
      `<option value="${p.id}">${p.nombre} (${p.codigo})${conStock ? ` — stock: ${Utils.formatNumber(p.stock_actual, 1)} ${p.unidad_venta_abrev || ''}` : ''}</option>`
    ).join('');

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('inventario')}
        <main class="main-content">
          ${Inventario.renderNavbar(State.getUser())}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                <li class="breadcrumb-item"><a href="#inventario">Inventario</a></li>
                <li class="breadcrumb-item active">Intercambio</li>
              </ol>
            </nav>
            <div class="d-flex align-items-center mb-4">
              <button class="btn btn-outline-secondary me-3" id="btnVolver"><i class="fas fa-arrow-left me-1"></i>Volver</button>
              <h2 class="mb-0"><i class="fas fa-exchange-alt me-2"></i>Intercambio: Reventa → Granel</h2>
            </div>

            <div class="row">
              <div class="col-lg-7">
                <div class="card">
                  <div class="card-body">
                    <div class="alert alert-danger">
                      <i class="fas fa-exclamation-triangle me-2"></i>
                      <strong>Atención:</strong> tú defines las cantidades equivalentes y el sistema no puede validarlas.
                      <strong>Eres el único responsable</strong> de la corrección del inventario de ambos productos tras esta operación.
                    </div>
                    <form id="intercambioForm">
                      <div class="row g-3">
                        <div class="col-12">
                          <label class="form-label">Producto origen (reventa) <span class="text-danger">*</span></label>
                          <select class="form-select" id="intercambioOrigen" required>
                            <option value="">Seleccione...</option>${opciones(origenes, true)}
                          </select>
                        </div>
                        <div class="col-md-6">
                          <label class="form-label">Cantidad que sale (ud. reventa) <span class="text-danger">*</span></label>
                          <input type="number" class="form-control" id="intercambioCantOrigen" step="0.01" min="0.01" required>
                        </div>
                        <div class="col-12">
                          <label class="form-label">Producto destino (a granel) <span class="text-danger">*</span></label>
                          <select class="form-select" id="intercambioDestino" required>
                            <option value="">Seleccione...</option>${opciones(destinos, false)}
                          </select>
                        </div>
                        <div class="col-md-6">
                          <label class="form-label">Cantidad que entra (ud. granel) <span class="text-danger">*</span></label>
                          <input type="number" class="form-control" id="intercambioCantDestino" step="0.01" min="0.01" required>
                        </div>
                        <div class="col-12">
                          <label class="form-label">Observaciones</label>
                          <textarea class="form-control" id="intercambioObs" rows="2" placeholder="Ej: 1 botella de aceite 1L → 0.94 kg a granel..."></textarea>
                        </div>
                        <div class="col-12 d-grid">
                          <button type="submit" class="btn btn-danger"><i class="fas fa-exchange-alt me-1"></i>Registrar Intercambio</button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              <div class="col-lg-5">
                <div class="card">
                  <div class="card-header"><h5 class="mb-0"><i class="fas fa-info-circle me-2"></i>¿Cómo funciona?</h5></div>
                  <div class="card-body">
                    <p>Convierte stock de un producto de <strong>reventa</strong> en stock de un producto <strong>a granel</strong> ya existente (para poder usarlo como ingrediente, por ejemplo).</p>
                    <ul>
                      <li>Se descuenta la cantidad del producto reventa (movimiento <em>intercambio_salida</em>).</li>
                      <li>Se incrementa la cantidad del producto a granel (movimiento <em>intercambio_entrada</em>).</li>
                      <li>Ambos movimientos quedan enlazados en el historial.</li>
                    </ul>
                    <p class="text-muted mb-0">Si el producto a granel aún no existe, créalo primero en Productos.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);

    $('#btnVolver').on('click', () => ViewManager.volver());

    $('#intercambioForm').on('submit', async function (e) {
      e.preventDefault();

      const origenId = parseInt($('#intercambioOrigen').val());
      const destinoId = parseInt($('#intercambioDestino').val());
      const cantOrigen = parseFloat($('#intercambioCantOrigen').val());
      const cantDestino = parseFloat($('#intercambioCantDestino').val());
      const obs = $('#intercambioObs').val().trim();

      if (!origenId || !destinoId || !cantOrigen || !cantDestino) {
        return Toast.warning('Completa productos y cantidades');
      }
      if (origenId === destinoId) {
        return Toast.warning('El origen y el destino deben ser productos distintos');
      }

      const nombreOrigen = $('#intercambioOrigen option:selected').text();
      const nombreDestino = $('#intercambioDestino option:selected').text();
      const confirmado = await Utils.confirm(
        `¿Confirmas el intercambio?\n\n−${cantOrigen} × ${nombreOrigen}\n+${cantDestino} × ${nombreDestino}\n\nRecuerda: las cantidades equivalentes son tu responsabilidad.`,
        'Confirmar intercambio'
      );
      if (!confirmado) return;

      try {
        Utils.showLoading('Registrando intercambio...');
        await API.inventario.intercambio({
          producto_origen_id: origenId,
          producto_destino_id: destinoId,
          cantidad_origen: cantOrigen,
          cantidad_destino: cantDestino,
          observaciones: obs || null
        });
        State.invalidateCache('productos');
        Utils.hideLoading();
        Toast.success('Intercambio registrado correctamente');
        ViewManager.navegar('inventario/movimientos?filtro=intercambio_salida');
      } catch (error) {
        Utils.hideLoading();
        Toast.error(error.message || 'Error al registrar el intercambio');
      }
    });

    Inventario.bindCommonEvents();
    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error(error);
    Toast.error('Error al cargar el intercambio');
  }
};

// ============================================
// VISTA MERMA (llama a ajuste con tipo=merma)
// ============================================
Inventario.merma = async function (params) {
  console.log('🗑️ Cargando registro de merma');

  // Simplemente llamar a ajuste con el tipo predefinido
  params.tipo = 'merma';
  await Inventario.ajuste(params);
};

window.Inventario = Inventario;