/**
 * productos.js - Módulo de gestión de productos
 */

var Productos = window.Productos || {};

Productos.dataTable = null;
Productos._eliminarFoto = false;

// ============================================
// VISTA PRINCIPAL (INDEX - Cards Dashboard)
// ============================================
Productos.index = async function () {
  console.log('📦 Cargando módulo de productos');

  try {
    const stats = await Productos.obtenerEstadisticas();
    const layout = Productos.renderIndexLayout(stats);

    $('#app').html(layout);
    Productos.bindIndexEvents();

  } catch (error) {
    console.error('Error cargando productos:', error);
  }
};

Productos.obtenerEstadisticas = async function () {
  try {
    const productos = await API.productos.listar();

    const activos = productos.filter(p => p.activo);
    const stockBajo = productos.filter(p => p.stock_actual <= p.stock_minimo);
    const compuestos = productos.filter(p => p.tipo === 'compuesto');
    const simples = productos.filter(p => p.tipo === 'simple');
    const sinCosto = productos.filter(p => !p.precio_venta || p.precio_venta === 0);

    return {
      total: productos.length,
      activos: activos.length,
      stockBajo: stockBajo.length,
      compuestos: compuestos.length,
      simples: simples.length,
      sinCosto: sinCosto.length,
      productosDestacados: stockBajo.slice(0, 5),
      ultimosAgregados: productos.slice(-5).reverse()
    };
  } catch (error) {
    console.warn('Usando datos mock para productos');
    return {
      total: 9,
      activos: 9,
      stockBajo: 3,
      compuestos: 3,
      simples: 6,
      sinCosto: 2,
      productosDestacados: [],
      ultimosAgregados: []
    };
  }
};

Productos.renderIndexLayout = function (stats) {
  const user = State.getUser();

  return `
    <div class="app-wrapper">
      ${Productos.renderSidebar('index')}
      <main class="main-content">
        ${Productos.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item active">Productos</li>
            </ol>
          </nav>
          
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="fas fa-box me-2"></i>Gestión de Productos</h2>
            <div>
              <button class="btn btn-outline-secondary me-2" data-route="productos/listado">
                <i class="fas fa-list me-1"></i>Ver Listado
              </button>
              <button class="btn btn-primary" data-route="productos/nuevo">
                <i class="fas fa-plus me-1"></i>Nuevo Producto
              </button>
            </div>
          </div>
          
          <div class="row g-3 mb-4">
            <div class="col-6 col-md-2">
              <div class="summary-mini-card">
                <h4>${stats.total}</h4>
                <p>Total Productos</p>
              </div>
            </div>
            <div class="col-6 col-md-2">
              <div class="summary-mini-card text-success">
                <h4>${stats.activos}</h4>
                <p>Activos</p>
              </div>
            </div>
            <div class="col-6 col-md-2">
              <div class="summary-mini-card text-warning">
                <h4>${stats.stockBajo}</h4>
                <p>Stock Bajo</p>
              </div>
            </div>
            <div class="col-6 col-md-2">
              <div class="summary-mini-card text-danger">
                <h4>${stats.sinCosto}</h4>
                <p>Sin Ficha Costo</p>
              </div>
            </div>
            <div class="col-6 col-md-2">
              <div class="summary-mini-card text-info">
                <h4>${stats.compuestos}</h4>
                <p>Compuestos</p>
              </div>
            </div>
            <div class="col-6 col-md-2">
              <div class="summary-mini-card text-secondary">
                <h4>${stats.simples}</h4>
                <p>Simples</p>
              </div>
            </div>
          </div>
          
          <div class="row g-4">
            <div class="col-lg-6">
              <div class="dashboard-card">
                <div class="card-header-custom d-flex justify-content-between align-items-center">
                  <h5><i class="fas fa-exclamation-triangle text-warning me-2"></i>Productos con Stock Bajo</h5>
                  <a href="#productos/listado?filtro=stock-bajo" class="btn btn-sm btn-outline-warning">Ver todos</a>
                </div>
                <div class="stock-bajo-list">
                  ${stats.productosDestacados.length > 0 ? stats.productosDestacados.map(p => `
                    <div class="stock-item clickable" data-route="productos/ver/${p.id}">
                      <div class="stock-info">
                        <span class="stock-code">${p.codigo}</span>
                        <span class="stock-name">${p.nombre}</span>
                      </div>
                      <div class="stock-level">
                        <div class="progress" style="height: 6px;">
                          <div class="progress-bar bg-warning" style="width: ${Math.min((p.stock_actual / p.stock_minimo) * 100, 100)}%"></div>
                        </div>
                        <span class="stock-text">${p.stock_actual} / ${p.stock_minimo}</span>
                      </div>
                    </div>
                  `).join('') : '<p class="text-muted text-center py-3">No hay productos con stock bajo</p>'}
                </div>
              </div>
            </div>
            
            <div class="col-lg-6">
              <div class="dashboard-card">
                <div class="card-header-custom">
                  <h5><i class="fas fa-clock me-2"></i>Últimos Productos Agregados</h5>
                </div>
                <div class="ultimos-list">
                  ${stats.ultimosAgregados.length > 0 ? stats.ultimosAgregados.map(p => `
                    <div class="ultimo-item clickable" data-route="productos/ver/${p.id}">
                      <div>
                        <span class="ultimo-code">${p.codigo}</span>
                        <span class="ultimo-name">${p.nombre}</span>
                      </div>
                      <span class="ultimo-price">${Utils.formatMoney(p.precio_venta)}</span>
                    </div>
                  `).join('') : '<p class="text-muted text-center py-3">No hay productos recientes</p>'}
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
                  <div class="quick-action-item clickable" data-route="productos/nuevo?tipo=simple">
                    <i class="fas fa-cube"></i>
                    <span>Nuevo Simple</span>
                  </div>
                  <div class="quick-action-item clickable" data-route="productos/nuevo?tipo=compuesto">
                    <i class="fas fa-cubes"></i>
                    <span>Nuevo Compuesto</span>
                  </div>
                  <div class="quick-action-item clickable" data-route="categorias/nuevo">
                    <i class="fas fa-folder-plus"></i>
                    <span>Nueva Categoría</span>
                  </div>
                  <div class="quick-action-item clickable" data-route="productos/listado?filtro=sin-costo">
                    <i class="fas fa-calculator"></i>
                    <span>Fichas de Costo</span>
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
Productos.listado = async function (params) {
  console.log('📋 Cargando listado de productos', params);

  try {
    Utils.showLoading('Cargando productos...');

    const productos = await API.productos.listar();
    const layout = Productos.renderListadoLayout(productos, params);

    $('#app').html(layout);

    Productos.initDataTable(productos);
    Productos.bindListadoEvents(params);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Productos.renderListadoLayout = function (productos, params) {
  const user = State.getUser();
  const filtro = params.filtro || 'todos';

  return `
    <div class="app-wrapper">
      ${Productos.renderSidebar('listado')}
      <main class="main-content">
        ${Productos.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#productos">Productos</a></li>
              <li class="breadcrumb-item active">Listado</li>
            </ol>
          </nav>
          
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="fas fa-list me-2"></i>Listado de Productos</h2>
            <div>
              <a href="#productos" class="btn btn-outline-secondary me-2">
                <i class="fas fa-th-large me-1"></i>Vista Cards
              </a>
              <button class="btn btn-primary" id="btnNuevoProducto">
                <i class="fas fa-plus me-1"></i>Nuevo Producto
              </button>
            </div>
          </div>
          
          <div class="mb-3">
            <div class="btn-group">
              <button class="btn btn-outline-primary ${filtro === 'todos' ? 'active' : ''}" data-filtro="todos">
                <i class="fas fa-list me-1"></i>Todos
              </button>
              <button class="btn btn-outline-primary ${filtro === 'simples' ? 'active' : ''}" data-filtro="simples">
                <i class="fas fa-cube me-1"></i>Simples
              </button>
              <button class="btn btn-outline-primary ${filtro === 'compuestos' ? 'active' : ''}" data-filtro="compuestos">
                <i class="fas fa-cubes me-1"></i>Compuestos
              </button>
              <button class="btn btn-outline-warning ${filtro === 'stock-bajo' ? 'active' : ''}" data-filtro="stock-bajo">
                <i class="fas fa-exclamation-triangle me-1"></i>Stock Bajo
              </button>
              <button class="btn btn-outline-danger ${filtro === 'sin-costo' ? 'active' : ''}" data-filtro="sin-costo">
                <i class="fas fa-calculator me-1"></i>Sin Ficha Costo
              </button>
            </div>
          </div>
          
          <div class="table-responsive">
            <table class="table table-hover" id="productosTable" style="width:100%">
              <thead class="table-light">
                <tr>
                  <th style="width: 50px;"></th>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th class="text-end">Precio</th>
                  <th class="text-end">Stock</th>
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

Productos.initDataTable = function (productos) {
  const self = this;

  if (this.dataTable) {
    this.dataTable.destroy();
  }

  $.fn.dataTable.ext.errMode = 'none';

  const tableData = productos.map(p => {
    const stockBajo = p.stock_actual <= p.stock_minimo;
    const sinCosto = !p.precio_venta || p.precio_venta === 0;

    return [
      p.foto ? `/uploads/productos/${p.foto}` : Utils.getProductPlaceholder(p, p.id, 40),
      p.codigo,
      p.nombre,
      p.categoria_nombre || '-',
      Productos.getTipoBadge(p),
      Utils.formatMoney(p.precio_venta),
      `${Utils.formatNumber(p.stock_actual, 2)} ${p.unidad_venta_abrev || ''}`,
      p.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>',
      p.id,
      stockBajo ? 'true' : 'false',
      sinCosto ? 'true' : 'false',
      p.tipo,
      p.tiene_dependencias || false  // ← NUEVA COLUMNA
    ];
  });

  this.dataTable = $('#productosTable').DataTable({
    data: tableData,
    columns: [
      {
        data: 0,
        orderable: false,
        className: 'text-center',
        render: function (data) {
          return `<img src="${data}" class="table-thumb" alt="" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;">`;
        }
      },
      { data: 1, title: 'Código' },
      { data: 2, title: 'Nombre' },
      { data: 3, title: 'Categoría' },
      { data: 4, title: 'Tipo' },
      { data: 5, title: 'Precio', className: 'text-end' },
      { data: 6, title: 'Stock', className: 'text-end' },
      { data: 7, title: 'Estado', className: 'text-center' },
      {
        data: null,
        orderable: false,
        className: 'text-center',
        render: function (data, type, row) {
          const id = row[8];
          const tipo = row[11];
          const esCompuesto = tipo === 'compuesto';
          const tieneDependencias = row[12];

          return `
          <div class="dropdown">
            <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><a class="dropdown-item ver-producto" href="#" data-id="${id}"><i class="fas fa-eye me-2"></i>Ver ficha</a></li>
              <li><a class="dropdown-item editar-producto" href="#" data-id="${id}"><i class="fas fa-edit me-2"></i>Editar</a></li>
              <li><a class="dropdown-item costo-producto" href="#" data-id="${id}"><i class="fas fa-calculator me-2"></i>Ficha de costo</a></li>
              ${esCompuesto ? `
                <li><a class="dropdown-item receta-producto" href="#" data-id="${id}"><i class="fas fa-list-ul me-2"></i>Receta</a></li>
              ` : ''}
              <li><hr class="dropdown-divider"></li>
                ${tieneDependencias
              ? `<span class="dropdown-item text-muted" style="cursor: not-allowed;" title="No se puede eliminar: tiene movimientos asociados">
                      <i class="fas fa-trash me-2"></i>Eliminar
                    </span>`
              : `<a class="dropdown-item text-danger eliminar-producto" href="#" data-id="${id}">
                      <i class="fas fa-trash me-2"></i>Eliminar
                    </a>`
            }
            </ul>
          </div>
        `;
        }
      },
      { data: 9, title: 'StockBajo', visible: false, searchable: true },
      { data: 10, title: 'SinCosto', visible: false, searchable: true },
      { data: 11, title: 'TipoFiltro', visible: false, searchable: true },
      { data: 12, title: 'TieneDependencias', visible: false }
    ],
    order: [[2, 'asc']],
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
      loadingRecords: "Cargando...",
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
      { targets: 0, responsivePriority: 3 },
      { targets: 8, responsivePriority: 1 },
      { targets: [1, 2], responsivePriority: 1 },
      { targets: [3, 4, 5], responsivePriority: 4 },
      { targets: [6, 7], responsivePriority: 2 }
    ],
    drawCallback: function () {
      $('#productosTable tbody tr').addClass('clickable-row');
    }
  });
};

Productos.getTipoBadge = function (producto) {
  if (producto.tipo === 'simple') {
    const subTipo = producto.sub_tipo === 'granel' ? 'A Granel' : 'Reventa';
    return `<span class="badge bg-info">${subTipo}</span>`;
  } else {
    const prep = producto.requiere_preparacion ? ' • Prep' : '';
    return `<span class="badge bg-primary">Compuesto${prep}</span>`;
  }
};

// ============================================
// VISTA: FORMULARIO (NUEVO/EDITAR)
// ============================================
Productos.formulario = async function (params) {
  console.log('📝 Cargando formulario de producto', params);

  const id = params.id;
  const isEdit = !!id;
  const tipoInicial = params.tipo || 'simple';
  const origen = params.origen || null;

  // Guardar origen en variable del módulo
  Productos._origenActual = origen;

  try {
    Utils.showLoading('Cargando datos...');

    const [categoriasHtml, unidadesVentaHtml, unidadesCompraHtml] = await Promise.all([
      Productos.cargarCategorias(),
      Productos.cargarUnidadesVenta(),
      Productos.cargarUnidadesCompra()
    ]);

    let producto = null;
    if (isEdit) {
      producto = await API.productos.obtener(id);
    }

    const layout = Productos.renderFormularioLayout(producto, tipoInicial, {
      categoriasHtml,
      unidadesVentaHtml,
      unidadesCompraHtml
    });

    $('#app').html(layout);

    if (producto) {
      Productos.llenarFormulario(producto);
    } else {
      const placeholderUrl = Utils.getProductPlaceholder('Nuevo producto', 1, 120);
      $('#previewFotoContainer').append(`<img src="${placeholderUrl}" class="default-placeholder" 
        style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`);
      $('#placeholderFoto').hide();
    }

    Productos.initTabs();
    Productos.configurarVisibilidadCampos();

    // ✅ Pasar params al bind
    Productos.bindFormularioEvents(id, params);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Productos.renderFormularioLayout = function (producto, tipoInicial, htmlOptions) {
  const user = State.getUser();
  const isEdit = !!producto;
  const title = isEdit ? 'Editar Producto' : 'Nuevo Producto';
  const { categoriasHtml, unidadesVentaHtml, unidadesCompraHtml } = htmlOptions;

  // Obtener origen de la variable del módulo
  const origen = Productos._origenActual;
  const tipoDisabled = isEdit ? true : (origen === 'compra');
  const tipoForzado = origen === 'compra' ? 'simple' : tipoInicial;

  return `
    <div class="app-wrapper">
      ${Productos.renderSidebar('form')}
      <main class="main-content">
        ${Productos.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Productos</a></li>
              <li class="breadcrumb-item active">${title}</li>
            </ol>
          </nav>
          
          <div class="d-flex align-items-center mb-4">
            <button class="btn btn-outline-secondary me-3" id="btnVolver">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </button>
            <h2 class="mb-0">${title}</h2>
          </div>
          
          <form id="productoForm">
            <input type="hidden" id="productoId" value="${isEdit ? producto.id : ''}">
            
            <ul class="nav nav-tabs mb-4" id="productoTabs" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link active" id="generales-tab" data-bs-toggle="tab" 
                        data-bs-target="#generales" type="button" role="tab">
                  <i class="fas fa-info-circle me-1"></i>Datos Generales
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="receta-tab" data-bs-toggle="tab" 
                        data-bs-target="#receta" type="button" role="tab">
                  <i class="fas fa-list-ul me-1"></i>Receta
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="costo-tab" data-bs-toggle="tab" 
                        data-bs-target="#costo" type="button" role="tab">
                  <i class="fas fa-calculator me-1"></i>Ficha de Costo
                </button>
              </li>
            </ul>
            
            <div class="tab-content">
              <div class="tab-pane fade show active" id="generales" role="tabpanel">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">Código <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="codigo" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Nombre <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="nombre" required>
                  </div>
                  
                  <div class="col-md-6">
                    <label class="form-label">Tipo</label>
                    <select class="form-select" id="tipo" ${isEdit ? 'disabled' : ''}>
                      <option value="simple" ${tipoInicial === 'simple' ? 'selected' : ''}>Simple</option>
                      <option value="compuesto" ${tipoInicial === 'compuesto' ? 'selected' : ''}>Compuesto</option>
                    </select>
                    ${isEdit ? '<small class="text-muted">El tipo no se puede modificar</small>' : ''}
                  </div>
                  
                  <div class="col-md-6" id="rowSubTipo" style="display: none;">
                    <label class="form-label">Sub-tipo</label>
                    <select class="form-select" id="subTipo">
                      <option value="reventa">Reventa</option>
                      <option value="granel">A Granel</option>
                    </select>
                  </div>
                  
                  <div class="col-md-8">
                    <label class="form-label">Categoría</label>
                    <div class="input-group">
                      <select class="form-select" id="categoriaId">
                        <option value="">Seleccione categoría...</option>
                        ${categoriasHtml}
                      </select>
                      <button class="btn btn-outline-secondary" type="button" id="btnNuevaCategoria">
                        <i class="fas fa-plus"></i>
                      </button>
                    </div>
                  </div>
                  
                  <div class="col-md-4">
                    <label class="form-label">Unidad de Venta <span class="text-danger">*</span></label>
                    <select class="form-select" id="unidadVentaId" required>
                      <option value="">Seleccione...</option>
                      ${unidadesVentaHtml}
                    </select>
                  </div>
                  
                  <div class="col-md-4" id="rowUnidadCompra" style="display: none;">
                    <label class="form-label">Unidad de Compra</label>
                    <select class="form-select" id="unidadCompraId">
                      <option value="">Seleccione...</option>
                      ${unidadesCompraHtml}
                    </select>
                  </div>
                  
                  <div class="col-md-4" id="rowFactorConversion" style="display: none;">
                    <label class="form-label">Factor Conversión</label>
                    <input type="number" class="form-control" id="factorConversion" value="1" step="0.01" min="0.01">
                    <small class="text-muted">1 unidad compra = ? unidad venta</small>
                  </div>
                  
                  <div class="col-md-4">
                    <label class="form-label">Precio de Venta</label>
                    <input type="text" class="form-control" id="precioVenta" readonly disabled>
                    <small class="text-muted">Calculado en Ficha de Costo</small>
                  </div>
                  
                  <div class="col-md-4">
                    <label class="form-label">Stock Mínimo</label>
                    <input type="number" class="form-control" id="stockMinimo" value="0" step="0.01" min="0">
                  </div>
                  
                  <div class="col-md-4">
                    <label class="form-label">Stock Actual</label>
                    <input type="text" class="form-control" id="stockActual" readonly disabled>
                  </div>
                  
                  <div class="col-12">
                    <label class="form-label"><i class="fas fa-camera me-1"></i>Foto del Producto</label>
                    <div class="d-flex align-items-start gap-3">
                      <div id="previewFotoContainer" style="width: 120px; height: 120px; border: 1px dashed #ccc; 
                                  border-radius: 8px; display: flex; align-items: center; justify-content: center; 
                                  overflow: hidden; background: #f8f9fa; position: relative;">
                        <img id="previewFoto" src="" alt="" style="max-width: 100%; max-height: 100%; display: none;">
                        <i id="placeholderFoto" class="fas fa-image fa-3x text-muted"></i>
                      </div>
                      <div class="flex-grow-1">
                        <input type="file" class="form-control" id="fotoProducto" name="foto" 
                               accept="image/jpeg,image/png,image/webp,image/gif">
                        <small class="text-muted d-block mt-1">Máx. 2MB</small>
                        <button type="button" class="btn btn-sm btn-outline-danger mt-2" id="btnEliminarFoto" style="display: none;">
                          <i class="fas fa-trash me-1"></i>Eliminar foto
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div class="col-12">
                    <div class="form-check">
                      <input class="form-check-input" type="checkbox" id="productoActivo" checked>
                      <label class="form-check-label">Producto Activo</label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="tab-pane fade" id="receta" role="tabpanel">
                <div class="alert alert-info">
                  <i class="fas fa-info-circle me-2"></i>
                  ${isEdit ? 'Gestiona los componentes en la vista de receta' : 'Guarda el producto primero para añadir componentes'}
                </div>
                ${isEdit ? `
                  <a href="#productos/receta/${producto.id}" class="btn btn-primary">
                    <i class="fas fa-list-ul me-1"></i>Gestionar Receta
                  </a>
                ` : ''}
              </div>
              
              <div class="tab-pane fade" id="costo" role="tabpanel">
                <div class="alert alert-info">
                  <i class="fas fa-info-circle me-2"></i>
                  ${isEdit ? 'Configura los parámetros en la ficha de costo' : 'Guarda el producto primero para configurar la ficha de costo'}
                </div>
                ${isEdit ? `
                  <a href="#productos/costo/${producto.id}" class="btn btn-primary">
                    <i class="fas fa-calculator me-1"></i>Ir a Ficha de Costo
                  </a>
                ` : ''}
              </div>
            </div>
            
            <div class="mt-4 d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-secondary" id="btnCancelar">
                <i class="fas fa-times me-1"></i>Cancelar
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save me-1"></i>Guardar Producto
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  `;
};

Productos.cargarCategorias = async function () {
  try {
    let categorias = State.getCache('categorias');
    if (!categorias) {
      categorias = await API.categorias.listar();
      State.setCache('categorias', categorias);
    }

    let optionsHtml = '';
    categorias.filter(c => c.activo).forEach(c => {
      optionsHtml += `<option value="${c.id}">${c.nombre}</option>`;
    });

    return optionsHtml;
  } catch (error) {
    console.error('Error cargando categorías:', error);
    return '';
  }
};

Productos.cargarUnidadesVenta = async function () {
  try {
    let unidades = State.getCache('unidades');
    if (!unidades) {
      unidades = await API.unidades.listar();
      State.setCache('unidades', unidades);
    }

    let optionsHtml = '';
    unidades.filter(u => u.tipo === 'venta' || u.tipo === 'ambas').forEach(u => {
      optionsHtml += `<option value="${u.id}">${u.nombre} (${u.abreviatura})</option>`;
    });

    return optionsHtml;
  } catch (error) {
    console.error('Error cargando unidades venta:', error);
    return '';
  }
};

Productos.cargarUnidadesCompra = async function () {
  try {
    let unidades = State.getCache('unidades');
    if (!unidades) {
      unidades = await API.unidades.listar();
      State.setCache('unidades', unidades);
    }

    let optionsHtml = '';
    unidades.filter(u => u.tipo === 'compra' || u.tipo === 'ambas').forEach(u => {
      optionsHtml += `<option value="${u.id}">${u.nombre} (${u.abreviatura})</option>`;
    });

    return optionsHtml;
  } catch (error) {
    console.error('Error cargando unidades compra:', error);
    return '';
  }
};

Productos.initTabs = function () {
  const triggerTabList = [].slice.call(document.querySelectorAll('#productoTabs button'));
  triggerTabList.forEach(function (triggerEl) {
    const tabTrigger = new bootstrap.Tab(triggerEl);
    triggerEl.addEventListener('click', function (event) {
      event.preventDefault();
      tabTrigger.show();
    });
  });
};

Productos.configurarVisibilidadCampos = function () {
  const tipo = $('#tipo').val();
  const subTipo = $('#subTipo').val();

  if (tipo === 'simple') {
    $('#rowSubTipo').show();
    $('#receta-tab').hide();

    if (subTipo === 'reventa') {
      $('#unidadVentaId').prop('disabled', false);
      $('#rowUnidadCompra').hide();
      $('#rowFactorConversion').hide();
    } else if (subTipo === 'granel') {
      $('#unidadVentaId').prop('disabled', false);
      $('#rowUnidadCompra').show();
      $('#rowFactorConversion').show();
    }
  } else {
    $('#rowSubTipo').hide();
    $('#receta-tab').show();
    $('#unidadVentaId').prop('disabled', false);
    $('#rowUnidadCompra').hide();
    $('#rowFactorConversion').hide();
  }
};

Productos.llenarFormulario = function (producto) {
  $('#codigo').val(producto.codigo);
  $('#nombre').val(producto.nombre);
  $('#tipo').val(producto.tipo);

  if (producto.tipo === 'simple') {
    $('#subTipo').val(producto.sub_tipo || 'reventa');
  }

  $('#categoriaId').val(producto.categoria_id || '');
  $('#unidadVentaId').val(producto.unidad_venta_id);
  $('#unidadCompraId').val(producto.unidad_compra_id || '');
  $('#factorConversion').val(producto.factor_conversion || 1);
  $('#precioVenta').val(Utils.formatMoney(producto.precio_venta));
  $('#stockMinimo').val(producto.stock_minimo || 0);
  $('#stockActual').val(`${Utils.formatNumber(producto.stock_actual, 2)} ${producto.unidad_venta_abrev || ''}`);
  $('#productoActivo').prop('checked', producto.activo === 1);

  if (producto.foto) {
    $('#previewFoto').attr('src', `/uploads/productos/${producto.foto}`).show();
    $('#placeholderFoto').hide();
    $('#btnEliminarFoto').show();
    $('#previewFotoContainer').find('.default-placeholder').remove();
  } else {
    $('#previewFoto').hide();
    $('#btnEliminarFoto').hide();
    $('#placeholderFoto').hide();

    const placeholderUrl = Utils.getProductPlaceholder(producto, producto.id, 120);
    $('#previewFotoContainer').find('.default-placeholder').remove();
    const placeholder = $(`<img src="${placeholderUrl}" class="default-placeholder" 
                           style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`);
    $('#previewFotoContainer').append(placeholder);
  }
};

Productos.bindFormularioEvents = function (id, params) {
  const self = this;
  Productos._eliminarFoto = false;

  // Obtener el origen desde params (si se pasó)
  const origen = params?.origen || Productos._origenActual || null;
  const retorno = params?.retorno || null;
  const retornoParams = params?.retornoParams || {};

  $('#tipo').on('change', function () {
    self.configurarVisibilidadCampos();
  });

  $('#subTipo').on('change', function () {
    self.configurarVisibilidadCampos();
  });

  $('#fotoProducto').on('change', function (e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        Toast.warning('La imagen no debe superar 2MB');
        $(this).val('');
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        $('#previewFoto').attr('src', e.target.result).show();
        $('#placeholderFoto').hide();
        $('#btnEliminarFoto').show();
        $('#previewFotoContainer').find('.default-placeholder').remove();
      };
      reader.readAsDataURL(file);
    }
  });

  $('#btnEliminarFoto').on('click', function () {
    $('#fotoProducto').val('');
    $('#previewFoto').hide();
    $('#btnEliminarFoto').hide();
    Productos._eliminarFoto = true;

    const nombre = $('#nombre').val() || 'Producto';
    const productoId = $('#productoId').val() || 1;
    const placeholderUrl = Utils.getProductPlaceholder(nombre, productoId, 120);

    $('#previewFotoContainer').find('.default-placeholder').remove();
    const placeholder = $(`<img src="${placeholderUrl}" class="default-placeholder" 
                           style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`);
    $('#previewFotoContainer').append(placeholder);
    $('#placeholderFoto').hide();
  });

  $('#btnNuevaCategoria').on('click', function () {
    sessionStorage.setItem('productoFormTemp', JSON.stringify(Productos.recopilarDatosFormulario()));

    // Construir retorno correcto
    const productoId = $('#productoId').val();
    const baseRetorno = productoId ? `productos/editar/${productoId}` : 'productos/nuevo';

    ViewManager.navegar('categorias/nuevo', {
      retorno: baseRetorno,
      origen: origen,
      retornoParams: retornoParams
    });
  });

  $('#btnCancelar, #btnVolver').on('click', function () {
    ViewManager.volver();
  });

  $('.breadcrumb-back').on('click', function (e) {
    e.preventDefault();
    ViewManager.volver();
  });

  $('#productoForm').on('submit', async function (e) {
    e.preventDefault();

    if (!Productos.validarFormulario()) return;

    const data = Productos.recopilarDatosFormulario();

    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        if (typeof data[key] === 'boolean') {
          formData.append(key, data[key].toString());
        } else {
          formData.append(key, data[key]);
        }
      }
    });

    const fotoFile = $('#fotoProducto')[0].files[0];
    if (fotoFile) {
      formData.append('foto', fotoFile);
    }

    if (Productos._eliminarFoto) {
      formData.append('eliminar_foto', 'true');
    }

    try {
      Utils.showLoading('Guardando producto...');

      let result;
      if (id) {
        result = await API.productos.actualizar(id, formData);
      } else {
        result = await API.productos.crear(formData);
      }

      State.invalidateCache('productos');
      Productos._eliminarFoto = false;
      Productos._origenActual = null; // Limpiar origen

      Utils.hideLoading();
      Toast.success(result.message || 'Producto guardado correctamente');

      const nuevoId = id || result.id;

      // ✅ Manejar retorno según origen
      if (retorno) {
        // Venimos de otra vista (ej: compras/seleccionar-productos)
        ViewManager.navegar(retorno, {
          producto_id: nuevoId,
          ...retornoParams
        });
      } else {
        // Flujo normal: ir a la ficha
        ViewManager.navegar('productos/ver/' + nuevoId, {}, { replace: true });
      }

    } catch (error) {
      Utils.hideLoading();
      console.error(error);
    }
  });

  // Recuperar estado si venimos de crear categoría
  const tempData = sessionStorage.getItem('productoFormTemp');
  if (tempData) {
    const data = JSON.parse(tempData);
    Object.keys(data).forEach(key => {
      $(`#${key}`).val(data[key]);
    });
    sessionStorage.removeItem('productoFormTemp');

    const nuevaCatId = sessionStorage.getItem('nuevaCategoriaId');
    if (nuevaCatId) {
      Productos.cargarCategorias().then(html => {
        $('#categoriaId').html('<option value="">Seleccione categoría...</option>' + html);
        $('#categoriaId').val(nuevaCatId);
        sessionStorage.removeItem('nuevaCategoriaId');
      });
    }
  }

  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));
  $('#sidebar .nav-link').on('click', function (e) {
    const href = $(this).attr('href');
    if (href && href !== '#') {
      e.preventDefault();
      ViewManager.navegar(href.substring(1), {}, { replace: true });
    }
  });
  $('#btnLogout').on('click', (e) => { e.preventDefault(); App.logout(); });
};

Productos.validarFormulario = function () {
  let isValid = true;

  const codigo = $('#codigo').val().trim();
  if (!codigo) {
    $('#codigo').addClass('is-invalid');
    Toast.warning('El código es requerido');
    isValid = false;
  } else {
    $('#codigo').removeClass('is-invalid').addClass('is-valid');
  }

  const nombre = $('#nombre').val().trim();
  if (!nombre) {
    $('#nombre').addClass('is-invalid');
    Toast.warning('El nombre es requerido');
    isValid = false;
  } else {
    $('#nombre').removeClass('is-invalid').addClass('is-valid');
  }

  if (!$('#unidadVentaId').val()) {
    Toast.warning('Debe seleccionar una unidad de venta');
    isValid = false;
  }

  const tipo = $('#tipo').val();
  const subTipo = $('#subTipo').val();

  if (tipo === 'simple' && subTipo === 'granel') {
    if (!$('#unidadCompraId').val()) {
      Toast.warning('Debe seleccionar una unidad de compra');
      isValid = false;
    }

    const factor = parseFloat($('#factorConversion').val());
    if (!factor || factor <= 0) {
      Toast.warning('El factor de conversión debe ser mayor a 0');
      isValid = false;
    }
  }

  return isValid;
};

Productos.recopilarDatosFormulario = function () {
  const tipo = $('#tipo').val();
  const subTipo = $('#subTipo').val();

  return {
    codigo: $('#codigo').val().trim(),
    nombre: $('#nombre').val().trim(),
    tipo: tipo,
    sub_tipo: tipo === 'simple' ? subTipo : null,
    requiere_preparacion: tipo === 'compuesto' ? $('#requierePreparacion').is(':checked') : false,
    categoria_id: $('#categoriaId').val() || null,
    unidad_venta_id: parseInt($('#unidadVentaId').val()),
    unidad_compra_id: (tipo === 'simple' && subTipo === 'granel') ? parseInt($('#unidadCompraId').val()) : null,
    factor_conversion: (tipo === 'simple' && subTipo === 'granel') ? parseFloat($('#factorConversion').val()) : 1,
    stock_minimo: parseFloat($('#stockMinimo').val()) || 0,
    activo: $('#productoActivo').is(':checked')
  };
};

// ============================================
// VISTA: FICHA (VER PRODUCTO)
// ============================================
Productos.ficha = async function (params) {
  console.log('👁️ Cargando ficha de producto', params);

  const id = params.id;

  try {
    Utils.showLoading('Cargando producto...');

    const producto = await API.productos.obtener(id);
    const layout = Productos.renderFichaLayout(producto);

    $('#app').html(layout);
    Productos.bindFichaEvents(producto);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Productos.renderFichaLayout = function (producto) {
  const user = State.getUser();

  return `
    <div class="app-wrapper">
      ${Productos.renderSidebar('ficha')}
      <main class="main-content">
        ${Productos.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Productos</a></li>
              <li class="breadcrumb-item active">${producto.nombre}</li>
            </ol>
          </nav>
          
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div class="d-flex align-items-center">
              <button class="btn btn-outline-secondary me-3" id="btnVolver">
                <i class="fas fa-arrow-left me-1"></i>Volver
              </button>
              <h2 class="mb-0">${producto.nombre}</h2>
              ${Productos.getTipoBadge(producto)}
            </div>
            <div class="btn-group">
              <button class="btn btn-primary" id="btnEditar">
                <i class="fas fa-edit me-1"></i>Editar
              </button>
              ${producto.tipo === 'compuesto' ? `
                <button class="btn btn-outline-primary" id="btnReceta">
                  <i class="fas fa-list-ul me-1"></i>Receta
                </button>
              ` : ''}
              <button class="btn btn-info" id="btnFichaCosto">
                <i class="fas fa-calculator me-1"></i>Ficha de Costo
              </button>
              <button class="btn btn-danger" id="btnEliminar" 
                ${producto.tiene_dependencias ? 'disabled title="No se puede eliminar: tiene movimientos asociados"' : ''}>
                <i class="fas fa-trash me-1"></i>Eliminar
              </button>
            </div>
          </div>
          
          <div class="row">
            <div class="col-lg-4">
              <div class="card mb-4">
                <div class="card-body text-center p-3">
                  ${producto.foto
      ? `<img src="/uploads/productos/${producto.foto}" alt="${producto.nombre}" 
                           style="width: 100%; max-height: 250px; object-fit: contain; border-radius: 8px;">`
      : `<img src="${Utils.getProductPlaceholder(producto, producto.id, 250)}" 
                           alt="${producto.nombre}" 
                           style="width: 100%; max-height: 250px; object-fit: contain; border-radius: 8px;">`
    }
                </div>
              </div>
              
              <div class="card mb-4">
                <div class="card-header">
                  <h5 class="mb-0"><i class="fas fa-calculator me-2"></i>Resumen de Costos</h5>
                </div>
                <div class="card-body">
                  <div class="d-flex justify-content-between mb-2">
                    <span>Costo Unitario:</span>
                    <strong>${Utils.formatMoney(producto.costo_unitario || producto.costo_base || 0)}</strong>
                  </div>
                  <div class="d-flex justify-content-between mb-2">
                    <span>Margen:</span>
                    <strong>${producto.margen || 30}%</strong>
                  </div>
                  <div class="d-flex justify-content-between mb-2">
                    <span>Gastos Fijos:</span>
                    <strong>${producto.gastos_fijos || 15}%</strong>
                  </div>
                  <hr>
                  <div class="d-flex justify-content-between">
                    <span class="fw-bold">Precio de Venta:</span>
                    <span class="fs-5 fw-bold text-primary">${Utils.formatMoney(producto.precio_venta)}</span>
                  </div>
                </div>
              </div>
              
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0"><i class="fas fa-tag me-2"></i>Promoción Activa</h5>
                </div>
                <div class="card-body">
                  <p class="text-muted text-center py-3">Sin promociones activas</p>
                </div>
              </div>
            </div>
            
            <div class="col-lg-8">
              <div class="card mb-4">
                <div class="card-header">
                  <h5 class="mb-0"><i class="fas fa-info-circle me-2"></i>Información General</h5>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="text-muted small">Código</label>
                      <p class="fs-5 fw-bold">${producto.codigo}</p>
                    </div>
                    <div class="col-md-6">
                      <label class="text-muted small">Categoría</label>
                      <p>${producto.categoria_nombre || '-'}</p>
                    </div>
                    
                    <div class="col-md-6">
                      <label class="text-muted small">Tipo de Producto</label>
                      <p>
                        ${producto.tipo === 'simple'
      ? `<span class="badge bg-info">Simple · ${producto.sub_tipo === 'granel' ? 'A Granel' : 'Reventa'}</span>`
      : `<span class="badge bg-primary">Compuesto${producto.requiere_preparacion ? ' · Requiere preparación' : ' · Venta directa'}</span>`
    }
                      </p>
                    </div>
                    
                    <div class="col-md-6">
                      <label class="text-muted small">Unidad de Venta</label>
                      <p>${producto.unidad_venta_nombre || '-'}</p>
                    </div>
                    <div class="col-md-6">
                      <label class="text-muted small">Precio de Venta</label>
                      <p class="fs-4 fw-bold text-primary">${Utils.formatMoney(producto.precio_venta)}</p>
                    </div>
                    ${producto.tipo === 'simple' && producto.sub_tipo === 'granel' ? `
                      <div class="col-md-6">
                        <label class="text-muted small">Unidad de Compra</label>
                        <p>${producto.unidad_compra_nombre || '-'}</p>
                      </div>
                      <div class="col-md-6">
                        <label class="text-muted small">Factor de Conversión</label>
                        <p>1 ${producto.unidad_compra_abrev || ''} = ${producto.factor_conversion} ${producto.unidad_venta_abrev || ''}</p>
                      </div>
                    ` : ''}
                    <div class="col-md-6">
                      <label class="text-muted small">Stock Actual</label>
                      <p class="${producto.stock_actual <= producto.stock_minimo ? 'text-warning fw-bold' : ''}">
                        ${Utils.formatNumber(producto.stock_actual, 2)} ${producto.unidad_venta_abrev || ''}
                      </p>
                    </div>
                    <div class="col-md-6">
                      <label class="text-muted small">Stock Mínimo</label>
                      <p>${Utils.formatNumber(producto.stock_minimo, 2)} ${producto.unidad_venta_abrev || ''}</p>
                    </div>
                    <div class="col-md-6">
                      <label class="text-muted small">Estado</label>
                      <p>${producto.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              ${producto.tipo === 'compuesto' && producto.receta && producto.receta.length > 0 ? `
                <div class="card">
                  <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0"><i class="fas fa-list-ul me-2"></i>Receta</h5>
                    <span class="badge ${producto.requiere_preparacion ? 'bg-warning' : 'bg-info'}">
                      ${producto.requiere_preparacion ? 'Requiere preparación' : 'Se descuenta en venta'}
                    </span>
                  </div>
                  <div class="card-body">
                    <table class="table table-sm">
                      <thead>
                        <tr>
                          <th>Componente</th>
                          <th class="text-end">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${producto.receta.map(item => `
                          <tr>
                            <td>${item.producto_nombre}</td>
                            <td class="text-end">${Utils.formatNumber(item.cantidad, 3)} ${item.unidad_abrev}</td>
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
  `;
};

Productos.bindFichaEvents = function (producto) {
  $('#btnVolver').on('click', () => ViewManager.volver());
  $('.breadcrumb-back').on('click', (e) => {
    e.preventDefault();
    ViewManager.volver();
  });

  $('#btnEditar').on('click', () => ViewManager.navegar('productos/editar/' + producto.id));
  $('#btnFichaCosto').on('click', () => ViewManager.navegar('productos/costo/' + producto.id));

  if (producto.tipo === 'compuesto') {
    $('#btnReceta').on('click', () => ViewManager.navegar('productos/receta/' + producto.id));
  }

  $('#btnEliminar').on('click', async function () {
    console.log('🗑️ Intentando eliminar producto:', producto.id);

    const confirmado = await Utils.confirm(
      `¿Está seguro de eliminar el producto "${producto.nombre}"?`,
      'Confirmar eliminación'
    );

    if (!confirmado) {
      console.log('❌ Eliminación cancelada por el usuario');
      return;
    }

    try {
      Utils.showLoading('Eliminando...');
      console.log('📤 Llamando a API.productos.eliminar:', producto.id);

      await API.productos.eliminar(producto.id);

      console.log('✅ Producto eliminado');
      State.invalidateCache('productos');
      Utils.hideLoading();
      Toast.success('Producto eliminado');
      ViewManager.volver();

    } catch (error) {
      Utils.hideLoading();
      console.error('❌ Error al eliminar:', error);
      console.log(error);
    }
  });

  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));
  $('#sidebar .nav-link').on('click', function (e) {
    const href = $(this).attr('href');
    if (href && href !== '#') {
      e.preventDefault();
      ViewManager.navegar(href.substring(1), {}, { replace: true });
    }
  });
  $('#btnLogout').on('click', (e) => { e.preventDefault(); App.logout(); });
};

// ============================================
// VISTA: FICHA DE COSTO
// ============================================
Productos.costo = async function (params) {
  console.log('💰 Cargando ficha de costo', params);

  const id = params.id;

  try {
    Utils.showLoading('Cargando ficha de costo...');

    const producto = await API.productos.obtener(id);
    const layout = Productos.renderCostoLayout(producto);

    $('#app').html(layout);
    Productos.bindCostoEvents(producto);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Productos.renderCostoLayout = function (producto) {
  const user = State.getUser();

  return `
    <div class="app-wrapper">
      ${Productos.renderSidebar('costo')}
      <main class="main-content">
        ${Productos.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Productos</a></li>
              <li class="breadcrumb-item"><a href="#productos/ver/${producto.id}">${producto.nombre}</a></li>
              <li class="breadcrumb-item active">Ficha de Costo</li>
            </ol>
          </nav>
          
          <div class="d-flex align-items-center mb-4">
            <button class="btn btn-outline-secondary me-3" id="btnVolver">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </button>
            <h2 class="mb-0"><i class="fas fa-calculator me-2"></i>Ficha de Costo - ${producto.nombre}</h2>
          </div>
          
          <div class="row">
            <div class="col-lg-8">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0">Cálculo de Precio</h5>
                </div>
                <div class="card-body">
                  <form id="costoForm">
                    <div class="mb-3">
                      <label class="form-label">Costo Base</label>
                      <input type="text" class="form-control" value="${Utils.formatMoney(producto.costo_base || 0)}" readonly disabled>
                      <small class="text-muted">
                        ${producto.tipo === 'compuesto' ? 'Calculado a partir de la receta' : producto.ultima_compra_precio ? `Basado en última compra: ${Utils.formatMoney(producto.ultima_compra_precio)} (${Utils.formatDate(producto.ultima_compra_fecha)})` : 'No hay compras registradas'}
                      </small>
                    </div>
                    <div class="row">
                      <div class="col-md-6 mb-3">
                        <label class="form-label">Margen de Beneficio (%)</label>
                        <input type="number" class="form-control" id="margen" value="${producto.margen || 30}" step="1" min="0" max="100">
                      </div>
                      <div class="col-md-6 mb-3">
                        <label class="form-label">Gastos Fijos</label>
                        <input type="number" class="form-control" id="gastosFijos" value="${producto.gastos_fijos || 15}" step="1" min="0" max="100">
                      </div>
                    </div>
                    
                    <div class="mb-3">
                      <label class="form-label">Impuesto sobre Venta (%)</label>
                      <input type="number" class="form-control" id="impuesto" value="${producto.impuesto || 7}" step="0.5" min="0" max="100">
                    </div>
                    
                    <hr>
                    
                    <div class="bg-light p-3 rounded mb-3">
                      <div class="d-flex justify-content-between mb-2">
                        <span>Costo Base:</span>
                        <span id="costoBaseDisplay">${Utils.formatMoney(producto.costo_base || 0)}</span>
                      </div>
                      <div class="d-flex justify-content-between mb-2">
                        <span>+ Margen (<span id="margenValor">${producto.margen || 30}</span>%):</span>
                        <span id="margenDisplay">${Utils.formatMoney((producto.costo_base || 0) * (producto.margen || 30) / 100)}</span>
                      </div>
                      <div class="d-flex justify-content-between mb-2">
                        <span>+ Gastos Fijos (<span id="gastosValor">${producto.gastos_fijos || 15}</span>%):</span>
                        <span id="gastosDisplay">${Utils.formatMoney((producto.costo_base || 0) * (producto.gastos_fijos || 15) / 100)}</span>
                      </div>
                      <div class="d-flex justify-content-between mb-2">
                        <span>+ Impuesto (<span id="impuestoValor">${producto.impuesto || 7}</span>%):</span>
                        <span id="impuestoDisplay">${Utils.formatMoney((producto.costo_base || 0) * (1 + (producto.margen || 30) / 100 + (producto.gastos_fijos || 15) / 100) * (producto.impuesto || 7) / 100)}</span>
                      </div>
                      <hr>
                      <div class="mb-3">
                        <label class="form-label">Precio de Venta Final</label>
                        <input type="number" class="form-control" id="precioVentaManual" 
                              value="${producto.precio_venta || 0}" step="0.01" min="0">
                        <small class="text-muted">Puedes ajustar manualmente el precio calculado</small>
                      </div>
                    </div>
                    
                    <div class="d-flex justify-content-end gap-2">
                      <button type="button" class="btn btn-outline-primary" id="btnCalcular">
                        <i class="fas fa-calculator me-1"></i>Calcular
                      </button>
                      <button type="submit" class="btn btn-success">
                        <i class="fas fa-check me-1"></i>Actualizar Precio
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

Productos.bindCostoEvents = function (producto) {
  $('#btnVolver').on('click', () => ViewManager.volver());
  $('.breadcrumb-back').on('click', (e) => {
    e.preventDefault();
    ViewManager.volver();
  });

  const calcularPrecio = function () {
    const costoBase = producto.costo_base || 0;
    const margen = parseFloat($('#margen').val()) || 0;       //%
    const gastos = parseFloat($('#gastosFijos').val()) || 0;
    const impuesto = parseFloat($('#impuesto').val()) || 0;   //%

    $('#margenValor').text(margen);
    $('#gastosValor').text(gastos);
    $('#impuestoValor').text(impuesto);

    //const subtotal = costoBase * (1 + margen / 100 + gastos / 100);
    //const total = subtotal * (1 + impuesto / 100);
    const subtotal = (costoBase + gastos) / (1 - (margen / 100));
    const total = subtotal / (1 - (impuesto / 100));

    // Solo actualizar si el usuario no ha modificado manualmente
    if (!precioModificadoManualmente) {
      $('#precioVentaManual').val(total.toFixed(2));
    }
    $('#precioSugerido').text(Utils.formatMoney(total));

    /*
    $('#costoBaseDisplay').text(Utils.formatMoney(costoBase));
    $('#margenDisplay').text(Utils.formatMoney(costoBase * margen / 100));
    $('#gastosDisplay').text(Utils.formatMoney(costoBase * gastos / 100));
    $('#impuestoDisplay').text(Utils.formatMoney(subtotal * impuesto / 100));
    $('#precioSugerido').text(Utils.formatMoney(total));
    */
    return total;
  };

  $('#margen, #gastosFijos, #impuesto').on('input', calcularPrecio);
  $('#btnCalcular').on('click', calcularPrecio);

  $('#costoForm').on('submit', async function (e) {
    e.preventDefault();

    const precioManual = parseFloat($('#precioVentaManual').val()) || calcularPrecio();

    const data = {
      costo_base: producto.costo_base || 0,
      margen: parseFloat($('#margen').val()) || 30,
      gastos_fijos: parseFloat($('#gastosFijos').val()) || 15,
      impuesto: parseFloat($('#impuesto').val()) || 7,
      precio_venta: precioManual  // ✅ Usar el valor manual
    };

    try {
      Utils.showLoading('Actualizando ficha de costo...');
      await API.productos.actualizarCosto(producto.id, data);
      State.invalidateCache('productos');
      Utils.hideLoading();
      Toast.success('Ficha de costo actualizada');
      ViewManager.navegar(`productos/ver/${producto.id}`);
    } catch (error) {
      Utils.hideLoading();
      console.log(error);
    }
  });

  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));
  $('#sidebar .nav-link').on('click', function (e) {
    const href = $(this).attr('href');
    if (href && href !== '#') {
      e.preventDefault();
      ViewManager.navegar(href.substring(1), {}, { replace: true });
    }
  });
  $('#btnLogout').on('click', (e) => { e.preventDefault(); App.logout(); });
};

// ============================================
// VISTA: RECETA
// ============================================
Productos.receta = async function (params) {
  console.log('🧪 Cargando gestión de receta', params);

  const id = params.id;

  try {
    Utils.showLoading('Cargando receta...');

    // ✅ Obtener producto, receta y productos disponibles
    const [producto, receta, productosDisponibles] = await Promise.all([
      API.productos.obtener(id),
      API.productos.obtenerReceta(id),  // ← ESTE ES EL ENDPOINT CORRECTO
      API.productos.listar()
    ]);

    console.log('📦 Receta obtenida:', receta);

    const layout = Productos.renderRecetaLayout(producto, productosDisponibles, receta);
    $('#app').html(layout);

    Productos.bindRecetaEvents(producto, receta);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Productos.renderRecetaLayout = function (producto, productosDisponibles, componentesActuales) {
  const user = State.getUser();

  const productosSimples = productosDisponibles.filter(p =>
    p.tipo === 'simple' && p.activo && p.id != producto.id
  );

  return `
    <div class="app-wrapper">
      ${Productos.renderSidebar('receta')}
      <main class="main-content">
        ${Productos.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Productos</a></li>
              <li class="breadcrumb-item"><a href="#productos/ver/${producto.id}">${producto.nombre}</a></li>
              <li class="breadcrumb-item active">Receta</li>
            </ol>
          </nav>
          
          <div class="d-flex align-items-center mb-4">
            <button class="btn btn-outline-secondary me-3" id="btnVolver">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </button>
            <h2 class="mb-0">
              <i class="fas fa-list-ul me-2"></i>Receta: ${producto.nombre}
            </h2>
          </div>
          
          <div class="row">
            <div class="col-lg-5">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0"><i class="fas fa-cubes me-2"></i>Componentes Actuales</h5>
                </div>
                <div class="card-body">
                  <div id="componentesActuales">
                    ${Productos.renderComponentesActuales(componentesActuales)}
                  </div>
                </div>
              </div>
            </div>
            
            <div class="col-lg-7">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0"><i class="fas fa-plus-circle me-2"></i>Añadir Componente</h5>
                </div>
                <div class="card-body">
                  <form id="agregarComponenteForm">
                    <div class="row g-3">
                      <div class="col-md-12">
                        <label class="form-label">Producto</label>
                        <select class="form-select" id="productoComponente" required>
                          <option value="">Seleccione un producto...</option>
                          ${productosSimples.map(p => `
                            <option value="${p.id}" 
                                    data-unidad="${p.unidad_venta_nombre || ''}"
                                    data-abrev="${p.unidad_venta_abrev || ''}">
                              ${p.nombre} (${p.codigo})
                            </option>
                          `).join('')}
                        </select>
                      </div>
                      
                      <div class="col-md-6">
                        <label class="form-label">Cantidad</label>
                        <input type="number" class="form-control" id="cantidadComponente" 
                               value="1" step="0.001" min="0.001" required>
                      </div>
                      
                      <div class="col-md-6">
                        <label class="form-label">Unidad</label>
                        <input type="text" class="form-control" id="unidadComponente" 
                               readonly disabled value="-">
                      </div>
                      
                      <div class="col-12">
                        <button type="submit" class="btn btn-primary w-100">
                          <i class="fas fa-plus me-1"></i>Agregar Componente
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
              
              <div class="card mt-4">
                <div class="card-header">
                  <h5 class="mb-0"><i class="fas fa-clipboard-list me-2"></i>Preparación</h5>
                </div>
                <div class="card-body">
                  <div class="mb-3">
                    <label class="form-label">Descripción</label>
                    <textarea class="form-control" id="descripcionPreparacionReceta" 
                              rows="3">${producto.descripcion_preparacion || ''}</textarea>
                  </div>
                  
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="requierePreparacionReceta" 
                           ${producto.requiere_preparacion ? 'checked' : ''}>
                    <label class="form-check-label">
                      <i class="fas fa-flask me-1"></i>Requiere elaboración previa
                    </label>
                  </div>
                  
                  <button class="btn btn-outline-primary w-100 mt-3" id="btnGuardarPreparacion">
                    <i class="fas fa-save me-1"></i>Guardar Configuración
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
};

Productos.renderComponentesActuales = function (componentes) {
  if (!componentes || componentes.length === 0) {
    return '<p class="text-muted text-center py-3">No hay componentes definidos</p>';
  }

  return `
    <div class="list-group">
      ${componentes.map(c => `
        <div class="list-group-item" data-componente-id="${c.producto_hijo_id}">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>${c.producto_nombre}</strong>
              <span class="badge bg-secondary ms-2">${c.producto_codigo || ''}</span>
              <div class="text-muted small">
                ${Utils.formatNumber(c.cantidad, 3)} ${c.unidad_abrev || 'uds'}
              </div>
            </div>
            <button class="btn btn-sm btn-outline-danger eliminar-componente-receta" 
                    data-id="${c.producto_hijo_id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
};

Productos.bindRecetaEvents = function (producto, componentesActuales) {
  $('#btnVolver').on('click', () => ViewManager.volver());
  $('.breadcrumb-back').on('click', (e) => {
    e.preventDefault();
    ViewManager.volver();
  });

  $('#productoComponente').on('change', function () {
    const selected = $(this).find('option:selected');
    const unidad = selected.data('unidad') || '';
    const abrev = selected.data('abrev') || '';

    if (unidad) {
      $('#unidadComponente').val(`${unidad} (${abrev})`);
    } else {
      $('#unidadComponente').val('-');
    }
  });

  $('#agregarComponenteForm').on('submit', async function (e) {
    e.preventDefault();

    const productoId = $('#productoComponente').val();
    const cantidad = parseFloat($('#cantidadComponente').val());

    if (!productoId) {
      Toast.warning('Seleccione un producto');
      return;
    }

    if (!cantidad || cantidad <= 0) {
      Toast.warning('Ingrese una cantidad válida');
      return;
    }

    try {
      Utils.showLoading('Agregando componente...');

      await API.productos.agregarComponente(producto.id, {
        producto_hijo_id: parseInt(productoId),
        cantidad: cantidad
      });

      State.invalidateCache('productos');

      Utils.hideLoading();
      Toast.success('Componente agregado');
      ViewManager.refresh();

    } catch (error) {
      Utils.hideLoading();
      console.log(error);
    }
  });

  $('#componentesActuales').on('click', '.eliminar-componente-receta', async function () {
    const componenteId = $(this).data('id');

    const confirmado = await Utils.confirm('¿Eliminar este componente?', 'Confirmar');
    if (!confirmado) return;

    try {
      Utils.showLoading('Eliminando...');
      await API.productos.eliminarComponente(producto.id, componenteId);
      State.invalidateCache('productos');
      Utils.hideLoading();
      Toast.success('Componente eliminado');
      ViewManager.refresh();
    } catch (error) {
      Utils.hideLoading();
      console.log(error);
    }
  });

  $('#btnGuardarPreparacion').on('click', async function () {
    try {
      const data = {
        descripcion_preparacion: $('#descripcionPreparacionReceta').val(),
        requiere_preparacion: $('#requierePreparacionReceta').is(':checked')
      };

      console.log('Guardando configuración de preparación:', data);
      Utils.showLoading('Guardando...');
      await API.productos.actualizarSimple(producto.id, data);
      //await API.productos.actualizar(producto.id, data);
      State.invalidateCache('productos');
      Utils.hideLoading();
      Toast.success('Configuración guardada');
    } catch (error) {
      Utils.hideLoading();
      console.log(error);
    }
  });

  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));
  $('#sidebar .nav-link').on('click', function (e) {
    const href = $(this).attr('href');
    if (href && href !== '#') {
      e.preventDefault();
      ViewManager.navegar(href.substring(1), {}, { replace: true });
    }
  });
  $('#btnLogout').on('click', (e) => { e.preventDefault(); App.logout(); });
};

// ============================================
// MÉTODOS AUXILIARES
// ============================================
Productos.renderSidebar = function (activeView) {
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
        <a class="nav-link text-white active" href="#productos">
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

Productos.renderNavbar = function (user) {
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

Productos.bindIndexEvents = function () {
  $('[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });

  $('.clickable[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });

  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));
  $('#sidebar .nav-link').on('click', function (e) {
    const href = $(this).attr('href');
    if (href && href !== '#') {
      e.preventDefault();
      ViewManager.navegar(href.substring(1), {}, { replace: true });
    }
    if ($(window).width() < 768) $('#sidebar').removeClass('show');
  });
  $('#btnLogout').on('click', (e) => { e.preventDefault(); App.logout(); });
};

Productos.bindListadoEvents = function (params) {
  const self = this;
  const filtroInicial = params.filtro || 'todos';

  $('#btnNuevoProducto').on('click', () => ViewManager.navegar('productos/nuevo'));

  $('[data-filtro]').on('click', function () {
    const filtro = $(this).data('filtro');

    $('[data-filtro]').removeClass('active');
    $(this).addClass('active');

    self.dataTable.search('').columns().search('');

    if (filtro === 'todos') {
      self.dataTable.draw();
    } else if (filtro === 'simples') {
      self.dataTable.column(11).search('simple', true, false).draw();
    } else if (filtro === 'compuestos') {
      self.dataTable.column(11).search('compuesto', true, false).draw();
    } else if (filtro === 'stock-bajo') {
      self.dataTable.column(9).search('true', true, false).draw();
    } else if (filtro === 'sin-costo') {
      self.dataTable.column(10).search('true', true, false).draw();
    }
  });

  if (filtroInicial !== 'todos') {
    $(`[data-filtro="${filtroInicial}"]`).trigger('click');
  }

  $('#productosTable tbody').on('dblclick', 'tr', function () {
    const row = self.dataTable.row(this);
    const id = row.data()[8];
    ViewManager.navegar('productos/ver/' + id);
  });

  // Ver producto
  $('#productosTable').on('click', '.ver-producto', function (e) {
    e.preventDefault();
    const id = $(this).data('id');
    ViewManager.navegar('productos/ver/' + id);
  });

  // Editar producto
  $('#productosTable').on('click', '.editar-producto', function (e) {
    e.preventDefault();
    const id = $(this).data('id');
    ViewManager.navegar('productos/editar/' + id);
  });

  // Ficha de costo
  $('#productosTable').on('click', '.costo-producto', function (e) {
    e.preventDefault();
    const id = $(this).data('id');
    ViewManager.navegar('productos/costo/' + id);
  });

  // Receta (solo compuestos)
  $('#productosTable').on('click', '.receta-producto', function (e) {
    e.preventDefault();
    const id = $(this).data('id');
    ViewManager.navegar('productos/receta/' + id);
  });

  // Eliminar
  $('#app').on('click', '[data-eliminar]', async function (e) {
    // Solo si estamos en el módulo de productos
    if (ViewManager.currentView?.startsWith('productos')) {
      console.log('🔥🔥🔥 CLICK EN ELIMINAR (delegado) 🔥🔥🔥');
      e.preventDefault();
      e.stopPropagation();

      const id = $(this).data('eliminar');
      console.log('🗑️ ID a eliminar:', id);

      const confirmado = await Utils.confirm('¿Está seguro de eliminar este producto?', 'Confirmar eliminación');
      console.log('❓ Confirmado:', confirmado);

      if (!confirmado) return;

      try {
        Utils.showLoading('Eliminando producto...');
        console.log('📤 Llamando a API.productos.eliminar...');

        const result = await API.productos.eliminar(id);
        console.log('✅ Resultado API:', result);

        State.invalidateCache('productos');
        Utils.hideLoading();
        Toast.success('Producto eliminado');
        ViewManager.refresh();
      } catch (error) {
        Utils.hideLoading();
        console.error('❌ Error en eliminación:', error);
        console.log(error);
      }
    }
  });

  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));
  $('#sidebar .nav-link').on('click', function (e) {
    const href = $(this).attr('href');
    if (href && href !== '#') {
      e.preventDefault();
      ViewManager.navegar(href.substring(1), {}, { replace: true });
    }
    if ($(window).width() < 768) $('#sidebar').removeClass('show');
  });
  $('#btnLogout').on('click', (e) => { e.preventDefault(); App.logout(); });
};

window.Productos = Productos;