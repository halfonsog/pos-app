/**
 * compras.js - Módulo de gestión de compras
 */

var Compras = window.Compras || {};

Compras.dataTable = null;
Compras._detallesTemporales = [];
Compras._productosDisponibles = [];

// ============================================
// VISTA PRINCIPAL (INDEX - Cards Dashboard)
// ============================================
Compras.index = async function () {
  console.log('🛒 Cargando módulo de compras');

  try {
    const stats = await Compras.obtenerEstadisticas();
    const layout = Compras.renderIndexLayout(stats);

    $('#app').html(layout);
    Compras.bindIndexEvents();

  } catch (error) {
    console.error('Error cargando compras:', error);
  }
};

Compras.obtenerEstadisticas = async function () {
  try {
    const compras = await API.compras.listar();

    const pendientesPago = compras.filter(c => (c.total - (c.pagado || 0)) > 0);
    const pendientesStock = compras.filter(c => c.estado_inventario === 'pendiente');
    const totalCompras = compras.reduce((sum, c) => sum + c.total, 0);
    const totalPagado = compras.reduce((sum, c) => sum + (c.pagado || 0), 0);

    return {
      total: compras.length,
      pendientesPago: pendientesPago.length,
      pendientesStock: pendientesStock.length,
      totalCompras: totalCompras,
      totalPagado: totalPagado,
      saldoPendiente: totalCompras - totalPagado,
      comprasRecientes: compras.slice(-5).reverse(),
      pendientesDestacadas: pendientesPago.slice(0, 5)
    };
  } catch (error) {
    console.warn('Usando datos mock para compras');
    return {
      total: 0,
      pendientesPago: 0,
      pendientesStock: 0,
      totalCompras: 0,
      totalPagado: 0,
      saldoPendiente: 0,
      comprasRecientes: [],
      pendientesDestacadas: []
    };
  }
};

Compras.renderIndexLayout = function (stats) {
  const user = State.getUser();

  return `
    <div class="app-wrapper">
      ${Sidebar.render('compras')}
      <main class="main-content">
        ${Compras.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item active">Compras</li>
            </ol>
          </nav>
          
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="fas fa-shopping-cart me-2"></i>Gestión de Compras</h2>
            <div>
              <button class="btn btn-outline-secondary me-2" data-route="compras/listado">
                <i class="fas fa-list me-1"></i>Ver Listado
              </button>
              <button class="btn btn-primary" data-route="compras/nuevo">
                <i class="fas fa-plus me-1"></i>Nueva Compra
              </button>
            </div>
          </div>
          
          <!-- Cards de Resumen -->
          <div class="row g-3 mb-4">
            <div class="col-6 col-md-3">
              <div class="summary-mini-card">
                <h4>${stats.total}</h4>
                <p>Total Compras</p>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-mini-card text-warning">
                <h4>${stats.pendientesPago}</h4>
                <p>Pendientes Pago</p>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-mini-card text-info">
                <h4>${stats.pendientesStock}</h4>
                <p>Pendientes Stock</p>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-mini-card text-danger">
                <h4>${Utils.formatMoney(stats.saldoPendiente)}</h4>
                <p>Saldo Pendiente</p>
              </div>
            </div>
          </div>
          
          <div class="row g-4">
            <!-- Compras Pendientes de Pago -->
            <div class="col-lg-6">
              <div class="dashboard-card">
                <div class="card-header-custom d-flex justify-content-between align-items-center">
                  <h5><i class="fas fa-money-bill text-warning me-2"></i>Pagos Pendientes</h5>
                  <a href="#compras/listado?filtro=pago-pendiente" class="btn btn-sm btn-outline-warning">Ver todos</a>
                </div>
                <div class="stock-bajo-list">
                  ${stats.pendientesDestacadas.length > 0 ? stats.pendientesDestacadas.map(c => {
    const pendiente = c.total - (c.pagado || 0);
    return `
                      <div class="stock-item clickable" data-route="compras/ver/${c.id}">
                        <div class="stock-info">
                          <span class="stock-code">${c.codigo_factura || 'S/F'}</span>
                          <span class="stock-name">${c.proveedor_nombre || '-'}</span>
                        </div>
                        <div class="stock-level">
                          <span class="stock-text text-warning">${Utils.formatMoney(pendiente)}</span>
                        </div>
                      </div>
                    `;
  }).join('') : '<p class="text-muted text-center py-3">No hay pagos pendientes</p>'}
                </div>
              </div>
            </div>
            
            <!-- Últimas Compras -->
            <div class="col-lg-6">
              <div class="dashboard-card">
                <div class="card-header-custom">
                  <h5><i class="fas fa-clock me-2"></i>Últimas Compras</h5>
                </div>
                <div class="ultimos-list">
                  ${stats.comprasRecientes.length > 0 ? stats.comprasRecientes.map(c => `
                    <div class="ultimo-item clickable" data-route="compras/ver/${c.id}">
                      <div>
                        <span class="ultimo-code">${c.codigo_factura || 'S/F'}</span>
                        <span class="ultimo-name">${c.proveedor_nombre || '-'}</span>
                      </div>
                      <span class="ultimo-price">${Utils.formatMoney(c.total)}</span>
                    </div>
                  `).join('') : '<p class="text-muted text-center py-3">No hay compras recientes</p>'}
                </div>
              </div>
            </div>
          </div>
          
          <div class="row g-4 mt-2">
            <div class="col-12">
              <div class="dashboard-card">
                <div class="card-header-custom">
                  <h5><i class="fas fa-bolt me-2"></i>Acciones Rápidas</h5>
                </div>
                <div class="quick-actions-grid">
                  <div class="quick-action-item clickable" data-route="compras/nuevo">
                    <i class="fas fa-plus-circle"></i>
                    <span>Nueva Compra</span>
                  </div>
                  <div class="quick-action-item clickable" data-route="compras/listado?filtro=pago-pendiente">
                    <i class="fas fa-money-bill"></i>
                    <span>Pagos Pendientes</span>
                  </div>
                  <div class="quick-action-item clickable" data-route="compras/listado?filtro=stock-pendiente">
                    <i class="fas fa-warehouse"></i>
                    <span>Pendientes Stock</span>
                  </div>
                  <div class="quick-action-item clickable" data-route="proveedores/nuevo">
                    <i class="fas fa-truck"></i>
                    <span>Nuevo Proveedor</span>
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
// VISTA LISTADO (DataTable)
// ============================================
Compras.listado = async function (params) {
  console.log('📋 Cargando listado de compras', params);

  try {
    Utils.showLoading('Cargando compras...');

    const compras = await API.compras.listar();
    const layout = Compras.renderListadoLayout(compras, params);

    $('#app').html(layout);

    Compras.initDataTable(compras);
    Compras.bindListadoEvents(params);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Compras.renderListadoLayout = function (compras, params) {
  const user = State.getUser();
  const filtro = params.filtro || 'todos';

  return `
    <div class="app-wrapper">
      ${Sidebar.render('compras')}
      <main class="main-content">
        ${Compras.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#compras">Compras</a></li>
              <li class="breadcrumb-item active">Listado</li>
            </ol>
          </nav>
          
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="fas fa-list me-2"></i>Listado de Compras</h2>
            <div>
              <a href="#compras" class="btn btn-outline-secondary me-2">
                <i class="fas fa-th-large me-1"></i>Vista Cards
              </a>
              <button class="btn btn-primary" id="btnNuevaCompra">
                <i class="fas fa-plus me-1"></i>Nueva Compra
              </button>
            </div>
          </div>
          
          <!-- Filtros -->
          <div class="mb-3">
            <div class="btn-group">
              <button class="btn btn-outline-primary ${filtro === 'todos' ? 'active' : ''}" data-filtro="todos">
                <i class="fas fa-list me-1"></i>Todos
              </button>
              <button class="btn btn-outline-warning ${filtro === 'pago-pendiente' ? 'active' : ''}" data-filtro="pago-pendiente">
                <i class="fas fa-money-bill me-1"></i>Pago Pendiente
              </button>
              <button class="btn btn-outline-info ${filtro === 'stock-pendiente' ? 'active' : ''}" data-filtro="stock-pendiente">
                <i class="fas fa-warehouse me-1"></i>Stock Pendiente
              </button>
              <button class="btn btn-outline-success ${filtro === 'pagadas' ? 'active' : ''}" data-filtro="pagadas">
                <i class="fas fa-check-circle me-1"></i>Pagadas
              </button>
            </div>
          </div>
          
          <div class="table-responsive">
            <table class="table table-hover" id="comprasTable" style="width:100%">
              <thead class="table-light">
                <tr>
                  <th>Fecha</th>
                  <th>Factura</th>
                  <th>Proveedor</th>
                  <th class="text-end">Total</th>
                  <th class="text-end">Pagado</th>
                  <th class="text-end">Pendiente</th>
                  <th>Estado Pago</th>
                  <th>Estado Stock</th>
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

Compras.initDataTable = function (compras) {
  const self = this;

  if (this.dataTable) {
    this.dataTable.destroy();
  }

  $.fn.dataTable.ext.errMode = 'none';

  const tableData = compras.map(c => {
    const pendiente = c.total - (c.pagado || 0);
    const estadoPagoClass = c.estado_pago === 'pagado' ? 'success' :
      c.estado_pago === 'parcial' ? 'warning' : 'danger';
    const estadoPagoText = c.estado_pago === 'pagado' ? 'Pagado' :
      c.estado_pago === 'parcial' ? 'Parcial' : 'Pendiente';
    const estadoStockClass = c.estado_inventario === 'completado' ? 'success' : 'warning';
    const estadoStockText = c.estado_inventario === 'completado' ? 'En Stock' : 'Pendiente';

    return [
      Utils.formatDate(c.fecha_compra),                  // 0
      c.codigo_factura || '-',                           // 1
      c.proveedor_nombre || '-',                         // 2
      Utils.formatMoney(c.total),                        // 3
      Utils.formatMoney(c.pagado || 0),                  // 4
      `<span class="${pendiente > 0 ? 'text-warning fw-bold' : ''}">${Utils.formatMoney(pendiente)}</span>`, // 5
      `<span class="badge bg-${estadoPagoClass}">${estadoPagoText}</span>`,  // 6
      `<span class="badge bg-${estadoStockClass}">${estadoStockText}</span>`, // 7
      c.id,                                              // 8
      pendiente > 0 ? 'true' : 'false',                  // 9 - TienePendiente
      c.estado_inventario                                // 10 - EstadoStock
    ];
  });

  this.dataTable = $('#comprasTable').DataTable({
    data: tableData,
    columns: [
      { data: 0, title: 'Fecha' },
      { data: 1, title: 'Factura' },
      { data: 2, title: 'Proveedor' },
      { data: 3, title: 'Total', className: 'text-end' },
      { data: 4, title: 'Pagado', className: 'text-end' },
      { data: 5, title: 'Pendiente', className: 'text-end' },
      { data: 6, title: 'Estado Pago', className: 'text-center' },
      { data: 7, title: 'Estado Stock', className: 'text-center' },
      {
        data: null,
        orderable: false,
        className: 'text-center',
        render: function (data, type, row) {
          const id = row[8];
          const tienePendiente = row[9] === 'true';
          const estadoStock = row[10];

          return `
            <div class="dropdown">
              <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
                <i class="fas fa-ellipsis-v"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item" href="#compras/ver/${id}"><i class="fas fa-eye me-2"></i>Ver ficha</a></li>
                <li><a class="dropdown-item" href="#compras/editar/${id}"><i class="fas fa-edit me-2"></i>Editar</a></li>
                ${tienePendiente ? `
                  <li><a class="dropdown-item text-warning" href="#compras/pagar/${id}"><i class="fas fa-money-bill me-2"></i>Registrar Pago</a></li>
                ` : ''}
                ${estadoStock === 'pendiente' ? `
                  <li><a class="dropdown-item text-info inventariar-compra" href="#" data-id="${id}">
                    <i class="fas fa-warehouse me-2"></i>Llevar a Stock
                  </a></li>
                ` : ''}
              </ul>
            </div>
          `;
        }
      },
      { data: 8, title: 'ID', visible: false },
      { data: 9, title: 'TienePendiente', visible: false, searchable: true },
      { data: 10, title: 'EstadoStockFiltro', visible: false, searchable: true }
    ],
    order: [[0, 'desc']],
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
    columnDefs: [
      { targets: 8, responsivePriority: 1 },
      { targets: [0, 1, 2], responsivePriority: 1 },
      { targets: [3, 4, 5], responsivePriority: 2 },
      { targets: [6, 7], responsivePriority: 3 }
    ],
    drawCallback: function () {
      $('#comprasTable tbody tr').addClass('clickable-row');
    }
  });
};

Compras.bindListadoEvents = function (params) {
  const self = this;
  const filtroInicial = params.filtro || 'todos';

  $('#btnNuevaCompra').on('click', () => ViewManager.navegar('compras/nuevo'));

  $('[data-filtro]').on('click', function () {
    const filtro = $(this).data('filtro');

    $('[data-filtro]').removeClass('active');
    $(this).addClass('active');

    self.dataTable.search('').columns().search('');

    if (filtro === 'todos') {
      self.dataTable.draw();
    } else if (filtro === 'pago-pendiente') {
      // Columna TienePendiente está en la posición 10 de columns (índice 9 en datos)
      self.dataTable.column(10).search('true', true, false).draw();
    } else if (filtro === 'stock-pendiente') {
      // Columna EstadoStockFiltro está en la posición 11 de columns (índice 10 en datos)
      self.dataTable.column(11).search('pendiente', true, false).draw();
    } else if (filtro === 'pagadas') {
      self.dataTable.column(10).search('false', true, false).draw();
    }
  });

  if (filtroInicial !== 'todos') {
    $(`[data-filtro="${filtroInicial}"]`).trigger('click');
  }

  $('#comprasTable tbody').on('dblclick', 'tr', function () {
    const row = self.dataTable.row(this);
    const id = row.data()[8];
    ViewManager.navegar('compras/ver/' + id);
  });

  $('#comprasTable').on('click', '.inventariar-compra', async function (e) {
    e.preventDefault();
    const id = $(this).data('id');

    const confirmado = await Utils.confirm('¿Llevar esta compra a stock?', 'Confirmar');
    if (!confirmado) return;

    try {
      Utils.showLoading('Procesando...');
      await API.compras.inventariar(id);
      State.invalidateCache('compras');
      State.invalidateCache('productos');
      Utils.hideLoading();
      Toast.success('Compra llevada a stock');
      ViewManager.refresh();
    } catch (error) {
      Utils.hideLoading();
      console.error('Error:', error);
    }
  });

  Compras.bindCommonEvents();
};

// ============================================
// VISTA: FORMULARIO (NUEVO/EDITAR)
// ============================================
Compras.formulario = async function (params) {
  console.log('📝 Cargando formulario de compra', params);

  const id = params.id;
  const isEdit = !!id;

  try {
    Utils.showLoading('Cargando datos...');

    // Cargar proveedores y productos
    const [proveedores, productos] = await Promise.all([
      API.proveedores.listar(),
      API.productos.listar()
    ]);

    Compras._productosDisponibles = productos.filter(p => p.activo && p.tipo === 'simple');

    let compra = null;
    if (isEdit) {
      compra = await API.compras.obtener(id);
    }

    // ✅ INICIALIZAR _detallesTemporales
    if (compra && compra.detalles) {
      Compras._detallesTemporales = [...compra.detalles];
    } else {
      Compras._detallesTemporales = [];
    }

    console.log('📦 _detallesTemporales inicializado con', Compras._detallesTemporales.length, 'elementos');

    // ✅ RECUPERAR PRODUCTO SELECCIONADO DEL SELECTOR
    const seleccion = sessionStorage.getItem('selector-producto-seleccionado');
    console.log('🔍 Recuperando selección:', seleccion ? 'presente' : 'ausente');

    if (seleccion) {
      const data = JSON.parse(seleccion);
      console.log('📦 Datos de selección:', data);

      if (data.config && data.config.origen === 'compra') {
        const prod = data.producto;
        console.log('🛒 Agregando producto a compra:', prod.nombre);

        const existente = Compras._detallesTemporales.find(d => d.producto_id == prod.id);
        if (!existente) {
          Compras._detallesTemporales.push({
            producto_id: prod.id,
            producto_nombre: prod.nombre,
            unidad_compra: prod.unidad_compra || prod.unidad_venta,
            unidad_compra_id: prod.unidad_compra_id || prod.unidad_venta_id,
            cantidad: 1,
            precio_unitario: 0,
            total: 0
          });
          console.log('✅ Producto agregado. Total detalles:', Compras._detallesTemporales.length);
        } else {
          console.log('⚠️ Producto ya existe en la lista');
        }
      }

      sessionStorage.removeItem('selector-producto-seleccionado');
    }

    // ✅ RECUPERAR producto_id si venimos de crear un producto nuevo
    if (params.producto_id) {
      const producto = await API.productos.obtener(params.producto_id);

      const existente = Compras._detallesTemporales.find(d => d.producto_id == producto.id);
      if (!existente) {
        Compras._detallesTemporales.push({
          producto_id: producto.id,
          producto_nombre: producto.nombre,
          unidad_compra: producto.unidad_compra_nombre || producto.unidad_venta_nombre,
          unidad_compra_id: producto.unidad_compra_id || producto.unidad_venta_id,
          cantidad: 1,
          precio_unitario: 0,
          total: 0
        });
        console.log('✅ Producto nuevo agregado:', producto.nombre);
      }
    }

    // ✅ RECUPERAR estado guardado del formulario (FUSIONAR, no sobrescribir)
    const tempData = sessionStorage.getItem('compraFormTemp');
    const tempDetalles = sessionStorage.getItem('compraDetallesTemp');

    if (tempDetalles) {
      const detallesGuardados = JSON.parse(tempDetalles);
      console.log('📦 Detalles recuperados de temp:', detallesGuardados.length);

      // Fusionar: solo agregar productos que no existan ya
      detallesGuardados.forEach(d => {
        const existente = Compras._detallesTemporales.find(ex => ex.producto_id == d.producto_id);
        if (!existente) {
          Compras._detallesTemporales.push(d);
        }
      });

      sessionStorage.removeItem('compraDetallesTemp');
    }

    // Renderizar layout
    const layout = Compras.renderFormularioLayout(compra, proveedores, productos);
    $('#app').html(layout);

    // ✅ SIEMPRE renderizar la tabla después de que el DOM esté listo
    console.log('🎨 Llamando a renderizarDetalleTabla con', Compras._detallesTemporales.length, 'detalles');
    Compras.renderizarDetalleTabla();

    // Llenar formulario si es edición
    if (compra) {
      Compras.llenarFormulario(compra);
    }

    // Restaurar datos del formulario si existen
    // Restaurar datos del formulario si existen (solo si tienen valor)
    if (tempData && !id) {
      const data = JSON.parse(tempData);
      if (data.fecha_compra) $('#fechaCompra').val(data.fecha_compra);
      if (data.codigo_factura) $('#codigoFactura').val(data.codigo_factura);
      if (data.proveedor_id) $('#proveedorId').val(data.proveedor_id);
      if (data.pagoInicial) $('#pagoInicial').val(data.pagoInicial);
      if (data.metodoPago) $('#metodoPago').val(data.metodoPago);
      sessionStorage.removeItem('compraFormTemp');
    }

    if (params.proveedor_id) {
      $('#proveedorId').val(params.proveedor_id);
      Toast.success('Nuevo proveedor seleccionado');
    }

    Compras.bindFormularioEvents(id, productos);
    Compras.actualizarEstadoPago();

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Compras.renderFormularioLayout = function (compra, proveedores, productos) {
  const user = State.getUser();
  const isEdit = !!compra;
  const title = isEdit ? 'Editar Compra' : 'Nueva Compra';

  const proveedoresOptions = proveedores
    .filter(p => p.activo)
    .map(p => `<option value="${p.id}">${p.nombre}</option>`)
    .join('');

  return `
    <div class="app-wrapper">
      ${Sidebar.render('compras')}
      <main class="main-content">
        ${Compras.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Compras</a></li>
              <li class="breadcrumb-item active">${title}</li>
            </ol>
          </nav>
          
          <div class="d-flex align-items-center mb-4">
            <button class="btn btn-outline-secondary me-3" id="btnVolver">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </button>
            <h2 class="mb-0"><i class="fas fa-shopping-cart me-2"></i>${title}</h2>
          </div>
          
          <form id="compraForm">
            <input type="hidden" id="compraId" value="${isEdit ? compra.id : ''}">
            
            <div class="row g-3 mb-4">
              <div class="col-md-3">
                <label class="form-label">Fecha <span class="text-danger">*</span></label>
                <input type="date" class="form-control" id="fechaCompra" required 
                       value="${isEdit ? compra.fecha_compra : new Date().toISOString().split('T')[0]}">
              </div>
              <div class="col-md-3">
                <label class="form-label">Nº Factura</label>
                <input type="text" class="form-control" id="codigoFactura" 
                       value="${isEdit ? compra.codigo_factura || '' : ''}">
              </div>
              <div class="col-md-6">
                <label class="form-label">Proveedor <span class="text-danger">*</span></label>
                <div class="input-group">
                  <select class="form-select" id="proveedorId" required>
                    <option value="">Seleccione proveedor...</option>
                    ${proveedoresOptions}
                  </select>
                  <button class="btn btn-outline-secondary" type="button" id="btnNuevoProveedor">
                    <i class="fas fa-plus"></i>
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Detalle de productos -->
            <div class="card mb-4">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-box me-2"></i>Productos</h5>
                <button type="button" class="btn btn-sm btn-primary" id="btnAgregarProducto">
                  <i class="fas fa-plus me-1"></i>Agregar Producto
                </button>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table table-sm mb-0" id="detalleCompraTable">
                    <thead class="table-light">
                      <tr>
                        <th>Producto</th>
                        <th style="width: 120px;">Unidad Compra</th>
                        <th style="width: 100px;">Cantidad</th>
                        <th style="width: 120px;">Precio Unit.</th>
                        <th style="width: 120px;">Total</th>
                        <th style="width: 50px;"></th>
                      </tr>
                    </thead>
                    <tbody id="detalleCompraBody">
                      ${isEdit && compra.detalles ? compra.detalles.map((d, i) => `
                        <tr data-index="${i}">
                          <td>${d.producto_nombre}</td>
                          <td>${d.unidad_compra || '-'}</td>
                          <td>
                            <input type="number" class="form-control form-control-sm cantidad" 
                                   value="${d.cantidad}" step="0.01" min="0.01" data-index="${i}">
                          </td>
                          <td>
                            <input type="number" class="form-control form-control-sm precio" 
                                   value="${d.precio_unitario}" step="0.01" min="0" data-index="${i}">
                          </td>
                          <td class="text-end total-fila">${Utils.formatMoney(d.total)}</td>
                          <td class="text-center">
                            <button type="button" class="btn btn-sm btn-outline-danger eliminar-fila">
                              <i class="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      `).join('') : `
                        <tr>
                          <td colspan="6" class="text-center text-muted py-3">
                            No hay productos agregados
                          </td>
                        </tr>
                      `}
                    </tbody>
                    <tfoot class="table-light">
                      <tr>
                        <td colspan="4" class="text-end fw-bold">Total:</td>
                        <td class="text-end fw-bold" id="totalCompra">${isEdit ? Utils.formatMoney(compra.total) : '0.00'}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            
            <!-- Pago inicial -->
            <div class="row mb-4">
              <div class="col-md-4">
                <label class="form-label">Pago Inicial</label>
                <input type="number" class="form-control" id="pagoInicial" 
                       value="${isEdit ? (compra.pagado || 0) : 0}" step="0.01" min="0">
              </div>
              <div class="col-md-4">
                <label class="form-label">Método de Pago</label>
                <select class="form-select" id="metodoPago">
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">Estado de Pago</label>
                <input type="text" class="form-control" id="estadoPagoDisplay" readonly disabled 
                       value="${isEdit ? (compra.estado_pago === 'pagado' ? 'Pagado' : compra.estado_pago === 'parcial' ? 'Parcial' : 'Pendiente') : 'Pendiente'}">
              </div>
            </div>
            
            <!-- Opción de llevar a stock -->
            <div class="mb-4">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="llevarAStock">
                <label class="form-check-label">
                  <i class="fas fa-warehouse me-1"></i>Llevar a stock al guardar
                </label>
                <small class="text-muted d-block">Puedes llevar a stock más tarde desde la ficha de la compra</small>
              </div>
            </div>
            
            <div class="d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-secondary" id="btnCancelar">
                <i class="fas fa-times me-1"></i>Cancelar
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save me-1"></i>Guardar Compra
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  `;
};

Compras.llenarFormulario = function (compra) {
  $('#fechaCompra').val(compra.fecha_compra);
  $('#codigoFactura').val(compra.codigo_factura || '');
  $('#proveedorId').val(compra.proveedor_id);
  $('#pagoInicial').val(compra.pagado || 0);

  // NO sobrescribir _detallesTemporales aquí, ya se inicializó antes
  // Solo renderizar
  Compras.renderizarDetalleTabla();
  Compras.actualizarTotalCompra();
};

Compras.bindFormularioEvents = function (id, productos) {
  const self = this;
  Compras._detallesTemporales = Compras._detallesTemporales || [];

  // Actualizar estado de pago al cambiar pago inicial
  $('#pagoInicial').on('input', function () {
    Compras.actualizarEstadoPago();
  });

  // Nuevo proveedor - ABRIR VISTA
  $('#btnNuevoProveedor').on('click', function () {
    sessionStorage.setItem('compraFormTemp', JSON.stringify(Compras.recopilarDatosFormulario()));
    sessionStorage.setItem('compraDetallesTemp', JSON.stringify(Compras._detallesTemporales));

    const compraId = $('#compraId').val();
    const retorno = compraId ? `compras/editar/${compraId}` : 'compras/nuevo';
    ViewManager.navegar('proveedores/nuevo', { retorno });
  });

  // Agregar producto - ABRIR VISTA
  // Agregar producto - Usar SelectorProductos unificado
  $('#btnAgregarProducto').on('click', function () {
    // Guardar estado actual del formulario (solo campos visibles)
    const formData = {
      fecha_compra: $('#fechaCompra').val(),
      codigo_factura: $('#codigoFactura').val(),
      proveedor_id: $('#proveedorId').val(),
      pagoInicial: $('#pagoInicial').val(),
      metodoPago: $('#metodoPago').val()
    };
    sessionStorage.setItem('compraFormTemp', JSON.stringify(formData));
    sessionStorage.setItem('compraDetallesTemp', JSON.stringify(Compras._detallesTemporales));

    const compraId = $('#compraId').val();
    const retorno = compraId ? `compras/editar/${compraId}` : 'compras/nuevo';

    ViewManager.navegar('selector-productos', {
      origen: 'compra',
      retorno: retorno,
      titulo: 'Seleccionar Productos para Compra'
    });
  });

  // Eliminar fila
  $('#detalleCompraBody').on('click', '.eliminar-fila', function () {
    const row = $(this).closest('tr');
    const index = row.data('index');

    if (index !== undefined) {
      Compras._detallesTemporales.splice(index, 1);
    }

    Compras.renderizarDetalleTabla();
    Compras.actualizarEstadoPago();
  });

  // Actualizar cantidades y precios
  // Actualizar cantidades y precios - Sin reconstruir tabla
  $('#detalleCompraBody').on('input', '.cantidad, .precio', function () {
    const row = $(this).closest('tr');
    const index = row.data('index');
    const cantidad = parseFloat(row.find('.cantidad').val()) || 0;
    const precio = parseFloat(row.find('.precio').val()) || 0;

    if (index !== undefined && Compras._detallesTemporales[index]) {
      Compras._detallesTemporales[index].cantidad = cantidad;
      Compras._detallesTemporales[index].precio_unitario = precio;

      const subtotal = cantidad * precio;
      Compras._detallesTemporales[index].total = subtotal;

      // Actualizar SOLO la celda del total, sin reconstruir toda la tabla
      row.find('.total-fila').text(Utils.formatMoney(subtotal));

      // Actualizar el total general
      const total = Compras.calcularTotal();
      $('#totalCompra').text(Utils.formatMoney(total));
      Compras.actualizarEstadoPago();
    }
  });

  // Cancelar / Volver
  $('#btnCancelar, #btnVolver').on('click', function () {
    ViewManager.volver();
  });

  $('.breadcrumb-back').on('click', function (e) {
    e.preventDefault();
    ViewManager.volver();
  });

  // Submit formulario
  $('#compraForm').on('submit', async function (e) {
    e.preventDefault();

    if (!Compras.validarFormulario()) return;

    const data = Compras.recopilarDatosFormulario();

    try {
      Utils.showLoading('Guardando compra...');

      let result;
      if (id) {
        result = await API.compras.actualizar(id, data);
      } else {
        result = await API.compras.crear(data);
      }

      State.invalidateCache('compras');

      const nuevoId = id || result.id;

      if ($('#llevarAStock').is(':checked') && !id) {
        try {
          await API.compras.inventariar(nuevoId);
          State.invalidateCache('productos');
          Toast.success('Productos llevados a stock');
        } catch (e) {
          Toast.warning('Compra guardada pero hubo error al llevar a stock');
        }
      }

      Utils.hideLoading();
      Toast.success(result.message || 'Compra guardada correctamente');
      ViewManager.volver();

    } catch (error) {
      Utils.hideLoading();
      Toast.error('Error al guardar: ' + error.message);
      console.error(error);
    }
  });

  Compras.bindCommonEvents();
};

Compras.renderizarDetalleTabla = function () {
  const $tbody = $('#detalleCompraBody');
  const detalles = Compras._detallesTemporales || [];

  console.log('🎨 renderizarDetalleTabla - detalles:', detalles.length);
  console.log('🎨 ¿tbody existe?', $tbody.length);

  if (!$tbody.length) {
    console.error('❌ No se encontró #detalleCompraBody en el DOM');
    return;
  }

  if (detalles.length === 0) {
    $tbody.html('<tr><td colspan="6" class="text-center text-muted py-3">No hay productos agregados</td></tr>');
    $('#totalCompra').text('0.00');
    return;
  }

  let html = '';
  let total = 0;

  detalles.forEach((d, i) => {
    const cantidad = d.cantidad || 0;
    const precio = d.precio_unitario || 0;
    const subtotal = cantidad * precio;
    d.total = subtotal;
    total += subtotal;

    html += `
      <tr data-index="${i}">
        <td>${d.producto_nombre || 'Producto'}</td>
        <td>${d.unidad_compra || '-'}</td>
        <td>
          <input type="number" class="form-control form-control-sm cantidad" 
                 value="${cantidad}" step="0.01" min="0.01" data-index="${i}">
        </td>
        <td>
          <input type="number" class="form-control form-control-sm precio" 
                 value="${precio}" step="0.01" min="0" data-index="${i}">
        </td>
        <td class="text-end total-fila">${Utils.formatMoney(subtotal)}</td>
        <td class="text-center">
          <button type="button" class="btn btn-sm btn-outline-danger eliminar-fila">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

  $tbody.html(html);
  $('#totalCompra').text(Utils.formatMoney(total));

  console.log('✅ Tabla renderizada con', detalles.length, 'productos. Total:', Utils.formatMoney(total));
};

Compras.actualizarEstadoPago = function () {
  const total = Compras.calcularTotal();
  const pagado = parseFloat($('#pagoInicial').val()) || 0;

  let estado = 'pendiente';
  if (pagado >= total) {
    estado = 'pagado';
  } else if (pagado > 0) {
    estado = 'parcial';
  }

  const estadoText = estado === 'pagado' ? 'Pagado' : estado === 'parcial' ? 'Parcial' : 'Pendiente';
  $('#estadoPagoDisplay').val(estadoText);
};

Compras.actualizarTotalCompra = function () {
  const total = Compras.calcularTotal();
  $('#totalCompra').text(Utils.formatMoney(total));
  Compras.actualizarEstadoPago();
};

Compras.calcularTotal = function () {
  return Compras._detallesTemporales.reduce((sum, d) => sum + ((d.cantidad || 0) * (d.precio_unitario || 0)), 0);
};

Compras.validarFormulario = function () {
  if (!$('#fechaCompra').val()) {
    Toast.warning('La fecha es requerida');
    return false;
  }

  if (!$('#proveedorId').val()) {
    Toast.warning('Debe seleccionar un proveedor');
    return false;
  }

  if (Compras._detallesTemporales.length === 0) {
    Toast.warning('Debe agregar al menos un producto');
    return false;
  }

  for (const d of Compras._detallesTemporales) {
    if (!d.cantidad || d.cantidad <= 0) {
      Toast.warning(`La cantidad de ${d.producto_nombre} debe ser mayor a 0`);
      return false;
    }
    if (d.precio_unitario < 0) {
      Toast.warning(`El precio de ${d.producto_nombre} no puede ser negativo`);
      return false;
    }
  }

  return true;
};

Compras.recopilarDatosFormulario = function () {
  return {
    fecha_compra: $('#fechaCompra').val(),
    codigo_factura: $('#codigoFactura').val() || null,
    proveedor_id: parseInt($('#proveedorId').val()),
    pagado: parseFloat($('#pagoInicial').val()) || 0,
    metodo_pago: $('#metodoPago').val(),
    detalles: Compras._detallesTemporales.map(d => ({
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario
    }))
  };
};

// ============================================
// VISTA: SELECCIONAR PRODUCTOS
// ============================================
Compras.seleccionarProductos = async function (params) {
  console.log('🛍️ Cargando selector de productos', params);

  const retorno = params.retorno || 'compras/nuevo';

  try {
    Utils.showLoading('Cargando productos...');

    const productos = await API.productos.listar();
    const productosComprables = productos.filter(p =>
      p.activo && p.tipo === 'simple'
    );

    const layout = Compras.renderSeleccionProductosLayout(productosComprables, retorno);
    $('#app').html(layout);

    Compras.bindSeleccionProductosEvents(productosComprables, retorno);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Compras.renderSeleccionProductosLayout = function (productos, retorno) {
  const user = State.getUser();

  return `
    <div class="app-wrapper">
      ${Sidebar.render('compras')}
      <main class="main-content">
        ${Compras.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Compras</a></li>
              <li class="breadcrumb-item"><a href="#${retorno}">Compra</a></li>
              <li class="breadcrumb-item active">Seleccionar Productos</li>
            </ol>
          </nav>
          
          <div class="d-flex align-items-center mb-4">
            <button class="btn btn-outline-secondary me-3" id="btnVolver">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </button>
            <h2 class="mb-0"><i class="fas fa-box me-2"></i>Seleccionar Productos</h2>
            <button class="btn btn-outline-primary ms-auto" id="btnNuevoProducto">
              <i class="fas fa-plus me-1"></i>Nuevo Producto
            </button>
          </div>
          
          <div class="row mb-3">
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="fas fa-search"></i></span>
                <input type="text" class="form-control" id="buscarProducto" placeholder="Buscar por código o nombre...">
              </div>
            </div>
            <div class="col-md-6 text-end">
              <span class="text-muted">${productos.length} productos disponibles</span>
            </div>
          </div>
          
          <div class="row g-3" id="productosGrid">
            ${productos.map(p => `
              <div class="col-md-4 col-lg-3">
                <div class="card h-100 producto-select-card" data-id="${p.id}" 
                     data-nombre="${p.nombre}" data-codigo="${p.codigo}"
                     data-unidad="${p.unidad_compra_nombre || p.unidad_venta_nombre || ''}"
                     data-unidad-id="${p.unidad_compra_id || p.unidad_venta_id}">
                  <div class="card-body">
                    <div class="d-flex align-items-center mb-2">
                      <div style="width: 40px; height: 40px;" class="me-2">
                        ${p.foto
      ? `<img src="/uploads/productos/${p.foto}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">`
      : `<img src="${Utils.getProductPlaceholder(p, p.id, 40)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">`
    }
                      </div>
                      <div>
                        <h6 class="mb-0">${p.nombre}</h6>
                        <small class="text-muted">${p.codigo}</small>
                      </div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                      <span class="badge bg-secondary">${p.unidad_compra_abrev || p.unidad_venta_abrev || 'ud'}</span>
                      <button class="btn btn-sm btn-primary seleccionar-producto">
                        <i class="fas fa-plus"></i> Agregar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </main>
    </div>
  `;
};

Compras.bindSeleccionProductosEvents = function (productos, retorno) {
  // Volver
  $('#btnVolver').on('click', () => ViewManager.volver());
  $('.breadcrumb-back').on('click', (e) => { e.preventDefault(); ViewManager.volver(); });

  // Nuevo producto - SOLO SIMPLE, desde compras
  $('#btnNuevoProducto').on('click', () => {
    ViewManager.navegar('productos/nuevo', {
      tipo: 'simple',
      origen: 'compra',
      retorno: 'compras/seleccionar-productos',
      retornoParams: { retorno }
    });
  });

  // Búsqueda
  $('#buscarProducto').on('input', function () {
    const search = $(this).val().toLowerCase();
    $('.producto-select-card').each(function () {
      const nombre = $(this).data('nombre').toLowerCase();
      const codigo = $(this).data('codigo').toLowerCase();
      $(this).toggle(nombre.includes(search) || codigo.includes(search));
    });
  });

  // Seleccionar producto
  $('.seleccionar-producto').on('click', function () {
    const card = $(this).closest('.producto-select-card');
    const id = card.data('id');
    const nombre = card.data('nombre');
    const unidad = card.data('unidad');
    const unidadId = card.data('unidad-id');

    sessionStorage.setItem('productoSeleccionado', JSON.stringify({
      producto_id: id,
      producto_nombre: nombre,
      unidad_compra: unidad,
      unidad_compra_id: unidadId
    }));

    ViewManager.volver();
  });

  Compras.bindCommonEvents();
};

// ============================================
// VISTA: FICHA (VER COMPRA)
// ============================================
Compras.ficha = async function (params) {
  console.log('👁️ Cargando ficha de compra', params);

  const id = params.id;

  try {
    Utils.showLoading('Cargando compra...');

    const compra = await API.compras.obtener(id);
    const layout = Compras.renderFichaLayout(compra);

    $('#app').html(layout);
    Compras.bindFichaEvents(compra);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Compras.renderFichaLayout = function (compra) {
  const user = State.getUser();
  const pendiente = compra.total - (compra.pagado || 0);

  return `
    <div class="app-wrapper">
      ${Sidebar.render('compras')}
      <main class="main-content">
        ${Compras.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Compras</a></li>
              <li class="breadcrumb-item active">Compra #${compra.id}</li>
            </ol>
          </nav>
          
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div class="d-flex align-items-center">
              <button class="btn btn-outline-secondary me-3" id="btnVolver">
                <i class="fas fa-arrow-left me-1"></i>Volver
              </button>
              <h2 class="mb-0">Compra #${compra.id}</h2>
            </div>
            <div class="btn-group">
              ${pendiente > 0 ? `
                <button class="btn btn-warning" id="btnPagar">
                  <i class="fas fa-money-bill me-1"></i>Registrar Pago
                </button>
              ` : ''}
              ${compra.estado_inventario === 'pendiente' ? `
                <button class="btn btn-info" id="btnInventariar">
                  <i class="fas fa-warehouse me-1"></i>Llevar a Stock
                </button>
              ` : ''}
              <button class="btn btn-primary" id="btnEditar">
                <i class="fas fa-edit me-1"></i>Editar
              </button>
            </div>
          </div>
          
          <div class="row">
            <div class="col-lg-4">
              <div class="card mb-4">
                <div class="card-header">
                  <h5 class="mb-0"><i class="fas fa-info-circle me-2"></i>Información</h5>
                </div>
                <div class="card-body">
                  <div class="mb-3">
                    <label class="text-muted small">Fecha</label>
                    <p class="fs-5">${Utils.formatDate(compra.fecha_compra)}</p>
                  </div>
                  <div class="mb-3">
                    <label class="text-muted small">Factura</label>
                    <p>${compra.codigo_factura || '-'}</p>
                  </div>
                  <div class="mb-3">
                    <label class="text-muted small">Proveedor</label>
                    <p class="fw-bold">${compra.proveedor_nombre || '-'}</p>
                  </div>
                </div>
              </div>
              
              <div class="card mb-4">
                <div class="card-header">
                  <h5 class="mb-0"><i class="fas fa-dollar-sign me-2"></i>Estado de Pago</h5>
                </div>
                <div class="card-body">
                  <div class="d-flex justify-content-between mb-2">
                    <span>Total:</span>
                    <strong>${Utils.formatMoney(compra.total)}</strong>
                  </div>
                  <div class="d-flex justify-content-between mb-2">
                    <span>Pagado:</span>
                    <strong>${Utils.formatMoney(compra.pagado || 0)}</strong>
                  </div>
                  <hr>
                  <div class="d-flex justify-content-between">
                    <span class="fw-bold">Pendiente:</span>
                    <span class="fs-5 fw-bold ${pendiente > 0 ? 'text-warning' : 'text-success'}">
                      ${Utils.formatMoney(pendiente)}
                    </span>
                  </div>
                  <div class="mt-3">
                    <span class="badge bg-${compra.estado_pago === 'pagado' ? 'success' : compra.estado_pago === 'parcial' ? 'warning' : 'danger'}">
                      ${compra.estado_pago === 'pagado' ? 'Pagado' : compra.estado_pago === 'parcial' ? 'Parcial' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0"><i class="fas fa-warehouse me-2"></i>Estado de Stock</h5>
                </div>
                <div class="card-body">
                  <span class="badge bg-${compra.estado_inventario === 'completado' ? 'success' : 'warning'}">
                    ${compra.estado_inventario === 'completado' ? 'En Stock' : 'Pendiente de inventariar'}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="col-lg-8">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0"><i class="fas fa-box me-2"></i>Productos</h5>
                </div>
                <div class="card-body p-0">
                  <table class="table table-sm mb-0">
                    <thead class="table-light">
                      <tr>
                        <th>Producto</th>
                        <th class="text-end">Cantidad</th>
                        <th class="text-end">Precio Unit.</th>
                        <th class="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${compra.detalles && compra.detalles.length > 0 ? compra.detalles.map(d => `
                        <tr>
                          <td>${d.producto_nombre}</td>
                          <td class="text-end">${Utils.formatNumber(d.cantidad, 2)}</td>
                          <td class="text-end">${Utils.formatMoney(d.precio_unitario)}</td>
                          <td class="text-end">${Utils.formatMoney(d.total)}</td>
                        </tr>
                      `).join('') : `
                        <tr>
                          <td colspan="4" class="text-center text-muted py-3">No hay productos</td>
                        </tr>
                      `}
                    </tbody>
                    <tfoot class="table-light">
                      <tr>
                        <td colspan="3" class="text-end fw-bold">Total:</td>
                        <td class="text-end fw-bold">${Utils.formatMoney(compra.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
};

Compras.bindFichaEvents = function (compra) {
  const pendiente = compra.total - (compra.pagado || 0);

  $('#btnVolver').on('click', () => ViewManager.volver());
  $('.breadcrumb-back').on('click', (e) => { e.preventDefault(); ViewManager.volver(); });

  $('#btnEditar').on('click', () => ViewManager.navegar('compras/editar/' + compra.id));

  if (pendiente > 0) {
    $('#btnPagar').on('click', () => ViewManager.navegar('compras/pagar/' + compra.id));
  }

  if (compra.estado_inventario === 'pendiente') {
    $('#btnInventariar').on('click', async () => {
      const confirmado = await Utils.confirm('¿Llevar esta compra a stock?', 'Confirmar');
      if (!confirmado) return;

      try {
        Utils.showLoading('Procesando...');
        await API.compras.inventariar(compra.id);
        State.invalidateCache('compras');
        State.invalidateCache('productos');
        Utils.hideLoading();
        Toast.success('Compra llevada a stock');
        ViewManager.refresh();
      } catch (error) {
        Utils.hideLoading();
        console.log(error);
      }
    });
  }

  Compras.bindCommonEvents();
};

// ============================================
// VISTA: REGISTRAR PAGO
// ============================================
Compras.pagar = async function (params) {
  console.log('💰 Cargando registro de pago', params);

  const id = params.id;

  try {
    Utils.showLoading('Cargando...');

    const compra = await API.compras.obtener(id);
    const layout = Compras.renderPagarLayout(compra);

    $('#app').html(layout);
    Compras.bindPagarEvents(compra);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Compras.renderPagarLayout = function (compra) {
  const user = State.getUser();
  const pendiente = compra.total - (compra.pagado || 0);

  return `
    <div class="app-wrapper">
      ${Sidebar.render('compras')}
      <main class="main-content">
        ${Compras.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Compras</a></li>
              <li class="breadcrumb-item"><a href="#compras/ver/${compra.id}">Compra #${compra.id}</a></li>
              <li class="breadcrumb-item active">Registrar Pago</li>
            </ol>
          </nav>
          
          <div class="d-flex align-items-center mb-4">
            <button class="btn btn-outline-secondary me-3" id="btnVolver">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </button>
            <h2 class="mb-0"><i class="fas fa-money-bill me-2"></i>Registrar Pago</h2>
          </div>
          
          <div class="row">
            <div class="col-lg-6">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0">Información de la Compra</h5>
                </div>
                <div class="card-body">
                  <div class="mb-3">
                    <label class="text-muted small">Proveedor</label>
                    <p class="fw-bold">${compra.proveedor_nombre}</p>
                  </div>
                  <div class="mb-3">
                    <label class="text-muted small">Total Compra</label>
                    <p class="fs-5">${Utils.formatMoney(compra.total)}</p>
                  </div>
                  <div class="mb-3">
                    <label class="text-muted small">Pagado hasta ahora</label>
                    <p>${Utils.formatMoney(compra.pagado || 0)}</p>
                  </div>
                  <div class="mb-3">
                    <label class="text-muted small">Pendiente</label>
                    <p class="fs-4 fw-bold text-warning">${Utils.formatMoney(pendiente)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="col-lg-6">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0">Registrar Pago</h5>
                </div>
                <div class="card-body">
                  <form id="pagoForm">
                    <div class="mb-3">
                      <label class="form-label">Monto a Pagar</label>
                      <input type="number" class="form-control" id="montoPago" 
                             value="${pendiente}" step="0.01" min="0.01" max="${pendiente}" required>
                      <small class="text-muted">Máximo pendiente: ${Utils.formatMoney(pendiente)}</small>
                    </div>
                    
                    <div class="mb-3">
                      <label class="form-label">Método de Pago</label>
                      <select class="form-select" id="metodoPagoPagar">
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                      </select>
                    </div>
                    
                    <div class="mb-3">
                      <label class="form-label">Referencia (opcional)</label>
                      <input type="text" class="form-control" id="referenciaPago">
                    </div>
                    
                    <div class="d-grid">
                      <button type="submit" class="btn btn-success">
                        <i class="fas fa-check me-1"></i>Confirmar Pago
                      </button>
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
};

Compras.bindPagarEvents = function (compra) {
  const pendiente = compra.total - (compra.pagado || 0);

  $('#btnVolver').on('click', () => ViewManager.navegar('compras/ver/' + compra.id));
  $('.breadcrumb-back').on('click', (e) => { e.preventDefault(); ViewManager.volver(); });

  $('#pagoForm').on('submit', async function (e) {
    e.preventDefault();

    const monto = parseFloat($('#montoPago').val());

    if (!monto || monto <= 0) {
      Toast.warning('Ingrese un monto válido');
      return;
    }

    if (monto > pendiente) {
      Toast.warning(`El monto no puede exceder el pendiente (${Utils.formatMoney(pendiente)})`);
      return;
    }

    const data = {
      monto: monto,
      metodo_pago: $('#metodoPagoPagar').val(),
      referencia: $('#referenciaPago').val() || null
    };

    try {
      Utils.showLoading('Registrando pago...');
      await API.compras.pagar(compra.id, data);
      State.invalidateCache('compras');
      Utils.hideLoading();
      Toast.success('Pago registrado correctamente');
      ViewManager.volver();
    } catch (error) {
      Utils.hideLoading();
      Toast.error(error.message);
    }
  });

  Compras.bindCommonEvents();
};

// ============================================
// VISTA: INVENTARIAR
// ============================================
Compras.inventariar = async function (params) {
  console.log('📦 Cargando inventariar', params);

  const id = params.id;

  try {
    const confirmado = await Utils.confirm('¿Llevar esta compra a stock?', 'Confirmar');
    if (!confirmado) {
      ViewManager.navegar('compras/ver/' + id);
      return;
    }

    Utils.showLoading('Procesando...');
    await API.compras.inventariar(id);
    State.invalidateCache('compras');
    State.invalidateCache('productos');
    Utils.hideLoading();
    Toast.success('Compra llevada a stock');
    ViewManager.navegar('compras/ver/' + id);
  } catch (error) {
    Utils.hideLoading();
    console.log(error);
    ViewManager.navegar('compras/ver/' + id);
  }
};

// ============================================
// MÉTODOS AUXILIARES
// ============================================

Compras.renderNavbar = function (user) {
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

Compras.bindIndexEvents = function () {
  $('[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });

  $('.clickable[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });

  Compras.bindCommonEvents();
};

Compras.bindCommonEvents = function () {
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

window.Compras = Compras;