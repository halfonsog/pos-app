/**
 * productos.js - Módulo de gestión de productos
 */

var Productos = window.Productos || {};

Productos.dataTable = null;
Productos._eliminarFoto = false;
Productos._origenActual = null;

// ============================================
// VISTA PRINCIPAL (INDEX)
// ============================================
Productos.index = async function () {
  console.log('📦 Cargando módulo de productos');
  try {
    const stats = await Productos.obtenerEstadisticas();
    $('#app').html(Productos.renderIndexLayout(stats));
    Productos.bindIndexEvents();
  } catch (error) {
    console.error('Error cargando productos:', error);
    Toast.error('Error al cargar el módulo de productos');
  }
};

Productos.obtenerEstadisticas = async function () {
  try {
    const productos = await API.productos.listar();
    const activos = productos.filter(p => p.activo);
    const stockBajo = activos.filter(p => p.stock_efectivo <= p.stock_minimo);
    const compuestos = activos.filter(p => p.tipo === 'compuesto');
    const simples = activos.filter(p => p.tipo === 'simple');
    const sinCosto = activos.filter(p => !p.precio_venta || p.precio_venta === 0);
    // Dashboard cards (propietario): Activos, En venta, Reventa, Preparables
    const enVenta = activos.filter(p => p.precio_venta > 0 && p.stock_efectivo > 0);
    const reventa = activos.filter(p => p.tipo === 'simple' && p.sub_tipo === 'reventa');
    const preparables = activos.filter(p => p.tipo === 'compuesto' && p.sub_tipo === 'elaborado');
    return {
      total: productos.length, activos: activos.length, stockBajo: stockBajo.length,
      compuestos: compuestos.length, simples: simples.length, sinCosto: sinCosto.length,
      enVenta: enVenta.length, reventa: reventa.length, preparables: preparables.length,
      productosDestacados: stockBajo.slice(0, 5),
      ultimosAgregados: productos.slice(-5).reverse()
    };
  } catch (error) {
    return { total: 0, activos: 0, stockBajo: 0, compuestos: 0, simples: 0, sinCosto: 0, enVenta: 0, reventa: 0, preparables: 0, productosDestacados: [], ultimosAgregados: [] };
  }
};

Productos.renderIndexLayout = function (stats) {
  const user = State.getUser();
  return `
    <div class="app-wrapper">
      ${Sidebar.render(State.isAdmin() ? 'productos' : 'vendedor/stock')}
      <main class="main-content">
        ${Productos.renderNavbar(user)}
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb"><li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li><li class="breadcrumb-item active">Productos</li></ol>
          </nav>
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="fas fa-box me-2"></i>Gestión de Productos</h2>
            <div>
              <button class="btn btn-outline-secondary me-2" data-route="productos/listado"><i class="fas fa-list me-1"></i>Ver Listado</button>
              <button class="btn btn-primary" data-route="productos/nuevo"><i class="fas fa-plus me-1"></i>Nuevo Producto</button>
            </div>
          </div>
          <div class="row g-3 mb-4">
            <div class="col-6 col-md-3">
              <div class="summary-card border-success clickable" data-route="productos/listado?filtro=activos" style="cursor:pointer">
                <div class="summary-content text-center">
                  <h3 class="summary-number text-success">${stats.activos}</h3>
                  <p class="summary-label"><i class="fas fa-check-circle me-1"></i>Activos</p>
                </div>
                <div class="summary-details"><small>de ${stats.total} registrados</small></div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-card border-primary clickable" data-route="productos/listado?filtro=activos" style="cursor:pointer">
                <div class="summary-content text-center">
                  <h3 class="summary-number text-primary">${stats.enVenta}</h3>
                  <p class="summary-label"><i class="fas fa-dollar-sign me-1"></i>En Venta</p>
                </div>
                <div class="summary-details"><small>con precio y stock</small></div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-card border-info clickable" data-route="productos/listado" style="cursor:pointer">
                <div class="summary-content text-center">
                  <h3 class="summary-number text-info">${stats.reventa}</h3>
                  <p class="summary-label"><i class="fas fa-box me-1"></i>Reventa</p>
                </div>
                <div class="summary-details"><small>se compran y venden</small></div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-card border-warning clickable" data-route="inventario/preparar" style="cursor:pointer">
                <div class="summary-content text-center">
                  <h3 class="summary-number text-warning">${stats.preparables}</h3>
                  <p class="summary-label"><i class="fas fa-flask me-1"></i>Preparables</p>
                </div>
                <div class="summary-details"><small>elaborados</small></div>
              </div>
            </div>
          </div>
          <div class="row g-4">
            <div class="col-lg-6">
              <div class="dashboard-card">
                <div class="card-header-custom d-flex justify-content-between align-items-center">
                  <h5><i class="fas fa-exclamation-triangle text-warning me-2"></i>Stock Bajo</h5>
                  <a href="#productos/listado?filtro=stock-bajo" class="btn btn-sm btn-outline-warning">Ver todos</a>
                </div>
                <div class="stock-bajo-list">
                  ${stats.productosDestacados.length > 0 ? stats.productosDestacados.map(p => `
                    <div class="stock-item clickable" data-route="productos/ver/${p.id}">
                      <div class="stock-info"><span class="stock-code">${p.codigo}</span><span class="stock-name">${p.nombre}</span></div>
                      <div class="stock-level"><div class="progress" style="height:6px"><div class="progress-bar bg-warning" style="width:${Math.min((p.stock_efectivo / p.stock_minimo) * 100, 100)}%"></div></div><span class="stock-text">${p.stock_efectivo}/${p.stock_minimo}</span></div>
                    </div>`).join('') : '<p class="text-muted text-center py-3">No hay productos con stock bajo</p>'}
                </div>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="dashboard-card">
                <div class="card-header-custom"><h5><i class="fas fa-clock me-2"></i>Últimos Agregados</h5></div>
                <div class="ultimos-list">
                  ${stats.ultimosAgregados.length > 0 ? stats.ultimosAgregados.map(p => `
                    <div class="ultimo-item clickable" data-route="productos/ver/${p.id}">
                      <div><span class="ultimo-code">${p.codigo}</span><span class="ultimo-name">${p.nombre}</span></div>
                      <span class="ultimo-price">${Utils.formatMoney(p.precio_venta)}</span>
                    </div>`).join('') : '<p class="text-muted text-center py-3">No hay productos recientes</p>'}
                </div>
              </div>
            </div>
          </div>
          <div class="row g-4 mt-2"><div class="col-12"><div class="dashboard-card"><div class="card-header-custom"><h5><i class="fas fa-bolt me-2"></i>Acciones Rápidas</h5></div>
            <div class="quick-actions-grid">
              <div class="quick-action-item clickable" data-route="productos/nuevo?tipo=simple"><i class="fas fa-cube"></i><span>Nuevo Simple</span></div>
              <div class="quick-action-item clickable" data-route="productos/nuevo?tipo=compuesto"><i class="fas fa-cubes"></i><span>Nuevo Compuesto</span></div>
              <div class="quick-action-item clickable" data-route="categorias/nuevo"><i class="fas fa-folder-plus"></i><span>Nueva Categoría</span></div>
              <div class="quick-action-item clickable" data-route="productos/listado?filtro=sin-costo"><i class="fas fa-calculator"></i><span>Fichas de Costo</span></div>
            </div>
          </div></div></div>
        </div>
      </main>
    </div>`;
};

// ============================================
// VISTA LISTADO
// ============================================
Productos.listado = async function (params) {
  console.log('📋 Cargando listado de productos', params);
  try {
    Utils.showLoading('Cargando...');
    const productos = await API.productos.listar();
    $('#app').html(Productos.renderListadoLayout(productos, params));
    Productos.initDataTable(productos);
    Productos.bindListadoEvents(params);
    Utils.hideLoading();
  } catch (error) { Utils.hideLoading(); console.error(error); }
};

Productos.renderListadoLayout = function (productos, params) {
  const user = State.getUser();
  const filtro = params.filtro || 'activos';
  return `
    <div class="app-wrapper">
      ${Sidebar.render(State.isAdmin() ? 'productos' : 'vendedor/stock')}
      <main class="main-content">
        ${Productos.renderNavbar(user)}
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3"><ol class="breadcrumb"><li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li><li class="breadcrumb-item"><a href="#productos">Productos</a></li><li class="breadcrumb-item active">Listado</li></ol></nav>
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="fas fa-list me-2"></i>Listado de Productos</h2>
            <div><a href="#productos" class="btn btn-outline-secondary me-2"><i class="fas fa-th-large me-1"></i>Vista Cards</a><button class="btn btn-primary" id="btnNuevoProducto"><i class="fas fa-plus me-1"></i>Nuevo Producto</button></div>
          </div>
          <div class="mb-3">
            <div class="btn-group">
              <button class="btn btn-outline-success ${filtro === 'activos' ? 'active' : ''}" data-filtro="activos">
                <i class="fas fa-check-circle me-1"></i>Activos
              </button>
              <button class="btn btn-outline-secondary ${filtro === 'inactivos' ? 'active' : ''}" data-filtro="inactivos">
                <i class="fas fa-ban me-1"></i>Inactivos
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
          <div class="table-responsive"><table class="table table-hover" id="productosTable" style="width:100%">
            <thead class="table-light"><tr><th style="width:50px"></th><th>Código</th><th>Nombre</th><th>Categoría</th><th>Tipo</th><th class="text-end">Precio</th><th class="text-end">Stock</th><th class="text-center">Estado</th><th class="text-center" style="width:60px"></th></tr></thead>
            <tbody></tbody>
          </table></div>
        </div>
      </main>
    </div>`;
};

Productos.initDataTable = function (productos) {
  if (this.dataTable) this.dataTable.destroy();
  $.fn.dataTable.ext.errMode = 'none';

  const tableData = productos.map(p => {
    const stockBajo = p.stock_efectivo <= p.stock_minimo;
    const sinCosto = !p.precio_venta || p.precio_venta === 0;

    return [
      p.foto ? `/uploads/productos/${p.foto}` : Utils.getProductPlaceholder(p, p.id, 40),
      p.codigo, p.nombre, p.categoria_nombre || '-',
      Productos.getTipoBadge(p),
      Utils.formatMoney(p.precio_venta),
      `${p.unidad_venta_tipo === 'unidad' ? Math.trunc(p.stock_efectivo) : Utils.formatNumber(p.stock_efectivo, 1)}  ${p.unidad_venta_abrev}`,
      p.activo ? '<span class="badge bg-success">Activo.</span>' : '<span class="badge bg-secondary">Inactivo</span>',
      p.id, stockBajo ? 'true' : 'false', sinCosto ? 'true' : 'false',
      p.tipo,
      p.tiene_dependencias ? 'true' : 'false',
      p.foto
    ];
  });

  this.dataTable = $('#productosTable').DataTable({
    data: tableData,
    columns: [
      { data: 0, orderable: false, className: 'text-center', render: d => `<img src="${d}" class="table-thumb" style="width:40px;height:40px;object-fit:cover;border-radius:6px">` },
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
        render: function (d, t, row) {
          const id = row[8], tipo = row[11], esCompuesto = tipo === 'compuesto', tieneDependencias = row[13] === 'true';
          return `<div class="dropdown"><button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown"><i class="fas fa-ellipsis-v"></i></button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><a class="dropdown-item ver-producto" href="#" data-id="${id}"><i class="fas fa-eye me-2"></i>Ver ficha</a></li>
            ${!tieneDependencias ? `
            <li><a class="dropdown-item editar-producto" href="#" data-id="${id}"><i class="fas fa-edit me-2"></i>Editar</a></li>
            ` : ''}
            <li><a class="dropdown-item costo-producto" href="#" data-id="${id}"><i class="fas fa-calculator me-2"></i>Ficha de costo</a></li>
            ${esCompuesto ? `<li><a class="dropdown-item receta-producto" href="#" data-id="${id}"><i class="fas fa-list-ul me-2"></i>Receta</a></li>` : ''}
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger eliminar-producto" href="#" data-id="${id}"><i class="fas fa-trash me-2"></i>Eliminar</a></li>
          </ul></div>`;
        }
      },
      { data: 8, title: 'ID', visible: false },
      { data: 9, title: 'StockBajo', visible: false, searchable: true },
      { data: 10, title: 'SinCosto', visible: false, searchable: true },
      { data: 11, title: 'TipoFiltro', visible: false, searchable: true },
      { data: 12, title: 'TieneDependencias', visible: false }
    ],
    search: { caseInsensitive: true },
    order: [[2, 'asc']],
    language: { decimal: ",", thousands: ".", processing: "Procesando...", lengthMenu: "Mostrar _MENU_ registros", zeroRecords: "No se encontraron resultados", emptyTable: "Ningún dato disponible", info: "Mostrando _START_ a _END_ de _TOTAL_ registros", search: "Buscar:", searchPlaceholder: "Buscar...", paginate: { first: "Primero", last: "Último", next: "Siguiente", previous: "Anterior" } },
    pageLength: 25, responsive: true,
    columnDefs: [
      { targets: 0, responsivePriority: 3 },
      { targets: 8, responsivePriority: 1 },
      { targets: [1, 2], responsivePriority: 1 },
      { targets: [3, 4, 5], responsivePriority: 4 },
      { targets: [6, 7], responsivePriority: 2 },
      // ✅ Excluir columnas de filtro del responsive
      { targets: [9, 10, 11, 12], responsivePriority: 0 }
    ],
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
      $('#productosTable tbody tr').addClass('clickable-row');
    }
  });
};

Productos.getTipoBadge = function (p) {
  if (p.tipo === 'simple') return `<span class="badge bg-info">${p.sub_tipo === 'granel' ? 'A Granel' : 'Reventa'}</span>`;
  return `<span class="badge bg-primary">Compuesto ${p.sub_tipo === 'elaborado' ? '· Elaborado' : '· Conformado'}</span>`;
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
    if (filtro === 'activos') {
      self.dataTable.column(7).search('Activo.').draw();
    } else if (filtro === 'inactivos') {
      self.dataTable.column(7).search('Inactivo').draw();
    } else if (filtro === 'simples') {
      self.dataTable.column(12).search('simple', true, false).draw();
    } else if (filtro === 'compuestos') {
      self.dataTable.column(12).search('compuesto', true, false).draw();
    } else if (filtro === 'stock-bajo') {
      self.dataTable.column(10).search('true', true, false).draw();
    } else if (filtro === 'sin-costo') {
      self.dataTable.column(11).search('true', true, false).draw();
    }
  });

  if (filtroInicial !== 'todos') {
    $(`[data-filtro="${filtroInicial}"]`).trigger('click');
  } else {
    $('[data-filtro="activos"]').trigger('click');
  }

  $('#productosTable tbody').on('dblclick', 'tr', function () {
    if ($(this).hasClass('empty-row')) return;  // ← Ignorar filas vacías

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

  // Eliminar desde el listado
  $('#productosTable').on('click', '.eliminar-producto', async function (e) {
    e.preventDefault();
    const id = $(this).data('id');

    const confirmado = await Utils.confirm('¿Está seguro de eliminar este producto?', 'Confirmar eliminación');
    if (!confirmado) return;

    try {
      Utils.showLoading('Eliminando producto...');
      await API.productos.eliminar(id);
      State.invalidateCache('productos');
      Utils.hideLoading();
      Toast.success('Producto eliminado');
      ViewManager.refresh();
    } catch (error) {
      Utils.hideLoading();
      console.error('❌ Error al eliminar:', error);
      Toast.error(error.message || 'No se pudo eliminar el producto');
    }
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
        Toast.error(error.message || 'No se pudo eliminar el producto');
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

// ============================================
// FORMULARIO (NUEVO/EDITAR)
// ============================================
/**
 * D4: los campos estructurales (tipo, subtipo, unidades, stock, costo) nunca se editan
 * directamente. Solo se permite: nombre, categoría, stock mínimo, precio y foto.
 */
Productos._aplicarRestriccionesDependencias = function () {
  // Deshabilitar campos estructurales
  $('#tipo').prop('disabled', true);
  $('#subTipo').prop('disabled', true);
  $('#unidadVentaId').prop('disabled', true);
  $('#unidadCompraId').prop('disabled', true);

  // Mostrar aviso visual
  const aviso = `
    <div class="alert alert-warning alert-sm mb-3">
      <i class="fas fa-info-circle me-1"></i>
      <strong>Edición restringida:</strong> Solo puedes modificar nombre, categoría, stock mínimo y foto.
      El producto tiene movimientos asociados.
    </div>
  `;

  // Insertar aviso al inicio del formulario
  $('#productoForm').prepend(aviso);
};

Productos.formulario = async function (params) {
  const id = params.id, isEdit = !!id, tipoInicial = params.tipo || 'simple';
  Productos._origenActual = params.origen || null;
  try {
    Utils.showLoading('Cargando...');
    const [catHtml, uniVentaHtml, uniCompraHtml] = await Promise.all([
      Productos._cargarCategorias(), Productos._cargarUnidadesVenta(isEdit), Productos._cargarUnidadesCompra()
    ]);
    let producto = null;
    if (isEdit) {
      producto = await API.productos.obtener(id);

      // ✅ Si tiene dependencias, redirigir con mensaje (ya no bloqueamos)
      if (producto && producto.tiene_dependencias) {
        console.log('⚠️ Producto con dependencias - Edición restringida');
      }
    }

    $('#app').html(Productos.renderFormularioLayout(producto, tipoInicial, { catHtml, uniVentaHtml, uniCompraHtml }));
    if (producto) Productos.llenarFormulario(producto);
    else { $('#placeholderFoto').hide(); $('#previewFotoContainer').append(`<img src="${Utils.getProductPlaceholder('Nuevo', 1, 120)}" class="default-placeholder" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`); }

    // D4: en edición los campos estructurales NUNCA se editan (tipo, subtipo, unidades)
    if (isEdit) {
      $('#subTipo').prop('disabled', true);
      $('#unidadVentaId').prop('disabled', true);
      $('#unidadCompraId').prop('disabled', true);
    }

    // ✅ Aplicar restricciones si tiene dependencias
    if (producto && producto.tiene_dependencias) {
      Productos._aplicarRestriccionesDependencias();
    }

    Productos._initTabs();
    Productos.configurarVisibilidadCampos();
    Productos.bindFormularioEvents(id, params);
    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Productos.renderFormularioLayout = function (producto, tipoInicial, htmlOpts) {
  const user = State.getUser(), isEdit = !!producto, title = isEdit ? 'Editar Producto' : 'Nuevo Producto';
  const origen = Productos._origenActual, tipoDisabled = isEdit || origen === 'compra', tipoForzado = origen === 'compra' ? 'simple' : tipoInicial;
  const { catHtml, uniVentaHtml, uniCompraHtml } = htmlOpts;

  return `
    <div class="app-wrapper">
      ${Sidebar.render('productos')}
      <main class="main-content">
        ${Productos.renderNavbar(user)}
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3"><ol class="breadcrumb"><li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li><li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Productos</a></li><li class="breadcrumb-item active">${title}</li></ol></nav>
          <div class="d-flex align-items-center mb-4"><button class="btn btn-outline-secondary me-3" id="btnVolver"><i class="fas fa-arrow-left me-1"></i>Volver</button><h2 class="mb-0">${title}</h2></div>
          <form id="productoForm"><input type="hidden" id="productoId" value="${isEdit ? producto.id : ''}">
            <ul class="nav nav-tabs mb-4" id="productoTabs" role="tablist">
              <li class="nav-item"><button class="nav-link active" id="generales-tab" data-bs-toggle="tab" data-bs-target="#generales" type="button"><i class="fas fa-info-circle me-1"></i>Datos Generales</button></li>
              <li class="nav-item"><button class="nav-link" id="receta-tab" data-bs-toggle="tab" data-bs-target="#receta" type="button"><i class="fas fa-list-ul me-1"></i>Receta</button></li>
              <li class="nav-item"><button class="nav-link" id="costo-tab" data-bs-toggle="tab" data-bs-target="#costo" type="button"><i class="fas fa-calculator me-1"></i>Ficha de Costo</button></li>
            </ul>
            <div class="tab-content">
              <div class="tab-pane fade show active" id="generales" role="tabpanel">
                <div class="row g-3">
                  <div class="col-md-6"><label class="form-label">Código <span class="text-danger">*</span></label><input type="text" class="form-control" id="codigo" required></div>
                  <div class="col-md-6"><label class="form-label">Nombre <span class="text-danger">*</span></label><input type="text" class="form-control" id="nombre" required></div>
                  <div class="col-md-6">
                    <label class="form-label">Tipo</label>
                    <select class="form-select" id="tipo" ${tipoDisabled ? 'disabled' : ''}>
                      <option value="simple" ${(producto ? producto.tipo : tipoForzado) === 'simple' ? 'selected' : ''}>Simple</option>
                      <option value="compuesto" ${(producto ? producto.tipo : tipoForzado) === 'compuesto' ? 'selected' : ''} ${origen === 'compra' ? 'disabled' : ''}>Compuesto</option>
                    </select>
                    ${origen === 'compra' ? '<small class="text-muted">Desde compras solo productos simples</small>' : ''}
                  </div>
                  <div class="col-md-6" id="rowSubTipo" style="display:none">
                    <label class="form-label">Sub-tipo</label>
                    <select class="form-select" id="subTipo">
                      <option value="reventa" ${producto && producto.sub_tipo === 'reventa' ? 'selected' : ''}>Reventa</option>
                      <option value="granel" ${producto && producto.sub_tipo === 'granel' ? 'selected' : ''}>A Granel</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Categoría</label>
                    <div class="input-group"><select class="form-select" id="categoriaId"><option value="">Seleccione...</option>${catHtml}</select><button class="btn btn-outline-secondary" type="button" id="btnNuevaCategoria"><i class="fas fa-plus"></i></button></div>
                  </div>
                  <!-- Unidad de Compra (solo a-granel) -->
                  <div class="col-md-4" id="rowUnidadCompra" style="display:none">
                    <label class="form-label">Unidad de Compra <span class="text-danger">*</span></label>
                    <select class="form-select" id="unidadCompraId"><option value="">Seleccione...</option>${uniCompraHtml}</select>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Unidad de Venta <span class="text-danger">*</span></label>
                    <select class="form-select" id="unidadVentaId" required><option value="">Seleccione...</option>${uniVentaHtml}</select>
                  </div>
                  <div class="col-md-4"><label class="form-label">Precio de Venta</label><input type="text" class="form-control" id="precioVenta" readonly disabled><small class="text-muted">Calculado en Ficha de Costo</small></div>
                  <div class="col-md-4"><label class="form-label">Stock Mínimo <small class="text-muted" id="stockMinimoUnidad">(unidad de venta)</small></label><input type="number" class="form-control" id="stockMinimo" value="0" step="0.01" min="0"></div>
                  <div class="col-md-4"><label class="form-label">Stock Actual</label><input type="text" class="form-control" id="stockActual" readonly disabled></div>
                  <div class="col-12"><label class="form-label"><i class="fas fa-camera me-1"></i>Foto</label><div class="d-flex align-items-start gap-3"><div id="previewFotoContainer" style="width:120px;height:120px;border:1px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#f8f9fa"><img id="previewFoto" src="" style="max-width:100%;max-height:100%;display:none"><i id="placeholderFoto" class="fas fa-image fa-3x text-muted"></i></div><div class="flex-grow-1"><input type="file" class="form-control" id="fotoProducto" name="foto" accept="image/*"><small class="text-muted">Máx. 2MB</small><button class="btn btn-sm btn-outline-danger mt-2" id="btnEliminarFoto" style="display:none"><i class="fas fa-trash me-1"></i>Eliminar foto</button></div></div></div>
                  <div class="col-12"><div class="form-check"><input class="form-check-input" type="checkbox" id="productoActivo" checked><label class="form-check-label">Producto Activo</label></div></div>
                </div>
              </div>
              <div class="tab-pane fade" id="receta" role="tabpanel">
                <div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>${isEdit ? 'Gestiona los componentes en la vista de receta' : 'Guarda el producto primero'}</div>
                ${isEdit ? `<a href="#productos/receta/${producto.id}" class="btn btn-primary"><i class="fas fa-list-ul me-1"></i>Gestionar Receta</a>` : ''}
              </div>
              <div class="tab-pane fade" id="costo" role="tabpanel">
                <div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>${isEdit ? 'Configura los parámetros en la ficha de costo' : 'Guarda el producto primero'}</div>
                ${isEdit ? `<a href="#productos/costo/${producto.id}" class="btn btn-primary"><i class="fas fa-calculator me-1"></i>Ir a Ficha de Costo</a>` : ''}
              </div>
            </div>
            <div class="mt-4 d-flex justify-content-end gap-2"><button type="button" class="btn btn-secondary" id="btnCancelar"><i class="fas fa-times me-1"></i>Cancelar</button><button type="submit" class="btn btn-primary"><i class="fas fa-save me-1"></i>Guardar Producto</button></div>
          </form>
        </div>
      </main>
    </div>`;
};

// Funciones auxiliares del formulario
Productos._cargarCategorias = async function () {
  try { let cats = State.getCache('categorias'); if (!cats) { cats = await API.categorias.listar(); State.setCache('categorias', cats); } return cats.filter(c => c.activo).map(c => `<option value="${c.id}">${c.nombre}</option>`).join(''); }
  catch (e) { return ''; }
};

Productos._cargarUnidadesVenta = async function (isEdit) {
  try {
    let units = State.getCache('unidades');
    if (!units) {
      units = await API.get('/configuracion/unidades');
      State.setCache('unidades', units);
    }

    if (isEdit) {
      return units.filter(u => u.activo).map(u => `<option value="${u.id}">${u.nombre} (${u.abreviatura})</option>`).join('');
    }
    else {
      // ✅ Reventa: solo unidades tipo "unidad"
      return units.filter(u => u.tipo === 'unidad' && u.activo).map(u => `<option value="${u.id}">${u.nombre} (${u.abreviatura})</option>`).join('');
    }
  }
  catch (e) { return ''; }
};

Productos._cargarUnidadesCompra = async function () {
  try {
    let units = State.getCache('unidades');
    if (!units) {
      units = await API.get('/configuracion/unidades');
      State.setCache('unidades', units);
    }
    return units.filter(u => u.activo).map(u => `<option value="${u.id}">${u.nombre} (${u.abreviatura})</option>`).join('');
  }
  catch (e) { return ''; }
};

Productos._initTabs = function () {
  document.querySelectorAll('#productoTabs button').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      new bootstrap.Tab(this).show();
    });
  });
};

Productos.configurarVisibilidadCampos = function () {
  const tipo = $('#tipo').val();
  const actual = $('#subTipo').val();

  if (tipo === 'simple') {
    // Subtipos de simple: reventa / granel
    $('#subTipo').html(`
      <option value="reventa">Reventa</option>
      <option value="granel">A Granel</option>
    `);
    if (['reventa', 'granel'].includes(actual)) $('#subTipo').val(actual);

    $('#rowSubTipo').show();
    $('#receta-tab').hide();
  } else {
    // Subtipos de compuesto (D1): elaborado / conformado
    $('#subTipo').html(`
      <option value="elaborado">Elaborado</option>
      <option value="conformado">Conformado (se arma en el momento de la venta)</option>
    `);
    if (['elaborado', 'conformado'].includes(actual)) $('#subTipo').val(actual);

    $('#rowSubTipo').show();
    $('#receta-tab').show();
  }

  // Regla de unidades del propietario (2026-08-11):
  //  * simple-reventa → compra y venta limitadas a tipo base "unidad"
  //  * si la lista de compra está visible → la venta es del mismo tipo base que la compra
  //  * si la lista de compra NO está visible → cualquier unidad de venta
  // Solo en creación (en edición los valores los fija llenarFormulario).
  if (!$('#productoId').val()) {
    Productos._aplicarFiltroUnidades();
  }
};

// Filtra el combo de unidad de venta (y la visibilidad de la de compra) según tipo/subtipo.
Productos._aplicarFiltroUnidades = function () {
  const todas = State.getCache('unidades') || [];
  const tipo = $('#tipo').val();
  const sub = $('#subTipo').val();
  const $venta = $('#unidadVentaId');
  const $compra = $('#unidadCompraId');
  const prevVenta = $venta.val();
  const existe = (list, v) => list.some(u => String(u.id) === String(v));

  // simple-reventa: compra y venta solo de tipo base "unidad"
  if (tipo === 'simple' && sub === 'reventa') {
    $('#rowUnidadCompra').hide();
    const list = todas.filter(u => u.tipo === 'unidad' && u.activo);
    $venta.empty().append('<option value="">Seleccione...</option>');
    list.forEach(u => $venta.append(`<option value="${u.id}">${u.nombre} (${u.abreviatura})</option>`));
    if (!existe(list, prevVenta)) {
      const def = list.find(u => u.abreviatura === 'ud') || list[0];
      if (def) $venta.val(def.id);
    }
    return;
  }

  // simple-granel: compra visible (cualquier tipo base); venta = mismo tipo base que la compra
  if (tipo === 'simple' && sub === 'granel') {
    $('#rowUnidadCompra').show();
    const compraId = $compra.val();
    const unidadCompra = todas.find(u => String(u.id) === String(compraId));
    if (unidadCompra) {
      const list = todas.filter(u => u.tipo === unidadCompra.tipo && u.activo);
      $venta.empty().append('<option value="">Seleccione...</option>');
      list.forEach(u => $venta.append(`<option value="${u.id}">${u.nombre} (${u.abreviatura})</option>`));
      if (!existe(list, prevVenta)) {
        if (list.length > 0) $venta.val(list[0].id);
      }
    } else {
      $venta.empty().append('<option value="">Seleccione...</option>');
    }
    return;
  }

  // compuesto (elaborado/conformado): compra oculta; cualquier unidad de venta
  $('#rowUnidadCompra').hide();
  const list = todas.filter(u => u.activo);
  $venta.empty().append('<option value="">Seleccione...</option>');
  list.forEach(u => $venta.append(`<option value="${u.id}">${u.nombre} (${u.abreviatura})</option>`));
  if (!existe(list, prevVenta)) {
    if (list.length > 0) $venta.val(list[0].id);
  }
};

Productos.llenarFormulario = function (p) {
  $('#codigo').val(p.codigo);
  $('#nombre').val(p.nombre);

  // Solo cambiar tipo si no está deshabilitado
  if (!$('#tipo').prop('disabled')) {
    $('#tipo').val(p.tipo);
  }
  // Reconstruir opciones de subtipo según el tipo y luego seleccionar la guardada
  Productos.configurarVisibilidadCampos();
  $('#subTipo').val(p.sub_tipo || (p.tipo === 'simple' ? 'reventa' : 'conformado'));

  $('#categoriaId').val(p.categoria_id || '');

  // Solo cambiar unidades si no están deshabilitadas
  if (!$('#unidadVentaId').prop('disabled')) {
    $('#unidadVentaId').val(p.unidad_venta_id);
  }
  if (!$('#unidadCompraId').prop('disabled')) {
    $('#unidadCompraId').val(p.unidad_compra_id || '');
  }

  $('#precioVenta').val(Utils.formatMoney(p.precio_venta));
  $('#stockMinimo').val(p.stock_minimo || 0);
  $('#stockMinimoUnidad').text(p.unidad_venta_abrev ? `(${p.unidad_venta_abrev})` : '(unidad de venta)');
  $('#stockActual').val(`${Utils.formatNumber(p.stock_actual, 1)} ${p.unidad_venta_abrev || ''}`);
  $('#productoActivo').prop('checked', p.activo === 1);

  // Foto
  if (p.foto) {
    $('#previewFoto').attr('src', `/uploads/productos/${p.foto}`).show();
    $('#placeholderFoto').hide();
    $('#btnEliminarFoto').show();
  } else {
    $('#previewFoto').hide();
    $('#btnEliminarFoto').hide();
    $('#placeholderFoto').hide();
    $('#previewFotoContainer').append(`<img src="${Utils.getProductPlaceholder(p, p.id, 120)}" class="default-placeholder" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`);
  }
};

Productos.bindFormularioEvents = function (id, params) {
  const self = this; Productos._eliminarFoto = false;
  const origen = params?.origen || Productos._origenActual || null;
  const retorno = params?.retorno || null, retornoParams = params?.retornoParams || {};

  $('#tipo').on('change', () => self.configurarVisibilidadCampos());
  // Al cambiar sub-tipo (reventa/granel/elaborado/conformado), aplicar regla de unidades
  $('#subTipo').on('change', function () {
    self.configurarVisibilidadCampos();
  });

  $('#fotoProducto').on('change', function (e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      Toast.warning('Máx 2MB'); return;
    }
    const r = new FileReader();
    r.onload = e => {
      $('#previewFoto').attr('src', e.target.result).show();
      $('#placeholderFoto').hide(); $('#btnEliminarFoto').show();
      $('#previewFotoContainer').find('.default-placeholder').remove();
    };
    r.readAsDataURL(f);
  });

  $('#btnEliminarFoto').on('click', () => {
    $('#fotoProducto').val('');
    $('#previewFoto').hide();
    $('#btnEliminarFoto').hide();
    Productos._eliminarFoto = true;
    $('#placeholderFoto').hide();
    $('#previewFotoContainer').append(`<img src="${Utils.getProductPlaceholder($('#nombre').val() || 'P', $('#productoId').val() || 1, 120)}" class="default-placeholder" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`);
  });

  $('#btnNuevaCategoria').on('click', () => {
    sessionStorage.setItem('productoFormTemp', JSON.stringify(Productos.recopilarDatosFormulario(!!id)));
    ViewManager.navegar('categorias/nuevo', { retorno: id ? `productos/editar/${id}` : 'productos/nuevo', origen, retornoParams });
  });

  $('#btnCancelar, #btnVolver').on('click', () => ViewManager.volver());
  $('.breadcrumb-back').on('click', e => { e.preventDefault(); ViewManager.volver(); });

  $('#productoForm').on('submit', async function (e) {
    e.preventDefault();
    if (!Productos.validarFormulario()) return;
    const data = Productos.recopilarDatosFormulario(!!id);
    const fd = new FormData();
    Object.keys(data).forEach(k => {
      if (data[k] !== null && data[k] !== undefined)
        fd.append(k, typeof data[k] === 'boolean' ? data[k].toString() : data[k]);
    });
    const foto = $('#fotoProducto')[0].files[0];
    if (foto) fd.append('foto', foto);
    if (Productos._eliminarFoto) fd.append('eliminar_foto', 'true');
    try {
      Utils.showLoading('Guardando...');
      let result;
      if (id)
        result = await API.productos.actualizar(id, fd);
      else
        result = await API.productos.crear(fd);
      State.invalidateCache('productos');
      Productos._eliminarFoto = false;
      Productos._origenActual = null;
      Utils.hideLoading();
      Toast.success('Producto guardado');
      const nId = id || result.id;
      if (retorno)
        ViewManager.navegar(retorno, { producto_id: nId, ...retornoParams });
      else
        ViewManager.volver();
    } catch (error) {
      Utils.hideLoading();
      console.error(error);
    }
  });

  // Al cambiar unidad de compra, filtrar unidad de venta por el mismo tipo base
  $('#unidadCompraId').on('change', function () {
    Productos._aplicarFiltroUnidades();
  });


  const temp = sessionStorage.getItem('productoFormTemp');
  if (temp) {
    const d = JSON.parse(temp);
    Object.keys(d).forEach(k => $(`#${k}`).val(d[k]));
    sessionStorage.removeItem('productoFormTemp');
    const nCat = sessionStorage.getItem('nuevaCategoriaId');
    if (nCat) {
      $('#categoriaId').val(nCat);
      sessionStorage.removeItem('nuevaCategoriaId');
    }
    // Al volver de crear categoría, reaplicar la regla de unidades (venta según compra)
    if (!$('#productoId').val()) {
      Productos._aplicarFiltroUnidades();
    }
  }

  Productos._bindCommon();
};

Productos.validarFormulario = function () {
  if (!$('#codigo').val().trim()) { Toast.warning('Código requerido'); return false; }
  if (!$('#nombre').val().trim()) { Toast.warning('Nombre requerido'); return false; }
  if (!$('#unidadVentaId').val()) { Toast.warning('Unidad de venta requerida'); return false; }
  const tipo = $('#tipo').val(), sub = $('#subTipo').val();
  if (tipo === 'simple' && sub === 'granel' && !$('#unidadCompraId').val()) {
    Toast.warning('Unidad de compra requerida');
    return false;
  }
  return true;
};

Productos.recopilarDatosFormulario = function (isEdit) {
  const data = {
    nombre: $('#nombre').val().trim(),
    categoria_id: $('#categoriaId').val() || null,
    stock_minimo: parseFloat($('#stockMinimo').val()) || 0,
    activo: $('#productoActivo').is(':checked')
  };

  if (!isEdit) {
    // D4: los campos estructurales solo se definen al CREAR
    const tipo = $('#tipo').val(), sub = $('#subTipo').val();
    data.codigo = $('#codigo').val().trim();
    data.tipo = tipo;
    data.sub_tipo = sub;
    data.unidad_venta_id = parseInt($('#unidadVentaId').val());
    data.unidad_compra_id = (tipo === 'simple' && sub === 'granel') ? parseInt($('#unidadCompraId').val()) : null;
  }

  return data;
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
    console.log('Producto', producto);
    const layout = await Productos.renderFichaLayout(producto);

    $('#app').html(layout);
    Productos.bindFichaEvents(producto);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Productos.renderFichaLayout = async function (producto) {
  const user = State.getUser();
  const config = await State.getConfig();
  console.log('renderFichaLayout. Config:', config);
  if (!config) {
    Toast.warning('Error al cargar la configuración. Intente de nuevo.');
    return;
  }

  return `
    <div class="app-wrapper">
      ${Sidebar.render('productos')}
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
              <h2 class="mb-0">${producto.nombre}</h2>&nbsp;
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
              <button class="btn btn-outline-info" id="btnTrazabilidad">
                <i class="fas fa-history me-1"></i>Trazabilidad
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
                    <strong>${Utils.formatNumber(producto.margen || config.margen_recomendado)}%</strong>
                  </div>
                  <div class="d-flex justify-content-between mb-2">
                    <span>Gastos Fijos:</span>
                    <strong>${Utils.formatNumber(producto.gastos_fijos || config.porcentaje_gastos)}%</strong>
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
      : `<span class="badge bg-primary">Compuesto · ${producto.sub_tipo === 'elaborado' ? 'Elaborado' : 'Conformado (se arma en la venta)'}</span>`
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
                        <label class="text-muted small">Conversión</label>
                        <p>1 ${producto.unidad_compra_abrev || ''} = ${producto.factor_conversion} ${producto.unidad_venta_abrev || ''}</p>
                      </div>
                    ` : ''}
                    <div class="col-md-6">
                      <label class="text-muted small">Stock Actual</label>
                      <p class="${producto.stock_actual <= producto.stock_minimo ? 'text-warning fw-bold' : ''}">
                        ${Utils.formatNumber(producto.stock_actual, 1)} ${producto.unidad_venta_abrev || ''}
                      </p>
                    </div>
                    <div class="col-md-6">
                      <label class="text-muted small">Stock Mínimo</label>
                      <p>${Utils.formatNumber(producto.stock_minimo, 1)} ${producto.unidad_venta_abrev || ''}</p>
                    </div>
                    <div class="col-md-6">
                      <label class="text-muted small">Estado</label>
                      <p>${producto.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</p>
                    </div>
                    <div class="col-md-6">
                      <label class="text-muted small">ID del Producto</label>
                      <p class="text-muted">#${producto.id}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              ${producto.tipo === 'compuesto' && producto.receta && producto.receta.length > 0 ? `
                <div class="card">
                  <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0"><i class="fas fa-list-ul me-2"></i>Receta</h5>
                    <span class="badge ${producto.sub_tipo === 'elaborado' ? 'bg-warning' : 'bg-info'}">
                      ${producto.sub_tipo === 'elaborado' ? 'Elaborado' : 'Conformado: se descuenta en venta'}
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

  $('#btnTrazabilidad').on('click', () => {
    ViewManager.navegar('productos/trazabilidad/' + producto.id);
  });

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
      Toast.error(error.message || 'No se pudo eliminar el producto');
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

Productos.trazabilidad = async function (params) {
  const id = params.id;

  try {
    Utils.showLoading('Cargando trazabilidad...');
    const data = await API.productos.trazabilidad(id);
    Utils.hideLoading();

    const layout = Productos.renderTrazabilidadLayout(data);
    $('#app').html(layout);
    Productos._bindCommon();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Productos.renderTrazabilidadLayout = function (data) {
  const { producto, compras, preparaciones, entradasComponentes, ventas, ajustes, totales } = data;
  const user = State.getUser();

  return `
    <div class="app-wrapper">
      ${Sidebar.render('productos')}
      <main class="main-content">
        ${Productos.renderNavbar(user)}
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Productos</a></li>
              <li class="breadcrumb-item"><a href="#productos/ver/${producto.id}">${producto.nombre}</a></li>
              <li class="breadcrumb-item active">Trazabilidad</li>
            </ol>
          </nav>
          
          <div class="d-flex align-items-center mb-4">
            <button class="btn btn-outline-secondary me-3" id="btnVolver">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </button>
            <h2 class="mb-0">
              <i class="fas fa-history me-2"></i>Trazabilidad: ${producto.nombre}
            </h2>
          </div>         
          <div class="row">
            <div class="col-lg-8">
              <!-- Entradas -->
              <div class="card mb-4">
                <div class="card-header bg-success bg-opacity-10">
                  <h5 class="mb-0">
                    ${producto.tipo === 'compuesto' && producto.sub_tipo === 'elaborado'
      ? '<i class="fas fa-flask me-1"></i>🧪 PREPARACIONES'
      : producto.tipo === 'compuesto'
        ? '<i class="fas fa-cubes me-1"></i>📦 ENTRADAS DE COMPONENTES'
        : '<i class="fas fa-truck me-1"></i>📦 COMPRAS'
    }
                    (${producto.tipo === 'compuesto' && producto.sub_tipo === 'elaborado'
      ? preparaciones.length
      : producto.tipo === 'compuesto'
        ? entradasComponentes.length
        : compras.length
    })
                  </h5>
                </div>
                <div class="card-body p-0">
                  <table class="table table-sm table-hover mb-0">
                    <thead class="table-success">
                      ${producto.tipo === 'compuesto' && producto.sub_tipo === 'elaborado' ? `
                        <tr><th>Fecha</th><th class="text-end">Cantidad</th><th>Observaciones</th></tr>
                      ` : producto.tipo === 'compuesto' ? `
                        <tr><th>Fecha</th><th class="text-end">Cantidad</th><th>Componente</th><th>Observaciones</th></tr>
                      ` : `
                        <tr><th>Fecha</th><th class="text-end">Cantidad</th><th>Factura</th><th>Proveedor</th></tr>
                      `}
                    </thead>
                    <tbody>
                      ${producto.tipo === 'compuesto' && producto.sub_tipo === 'elaborado' ?
      (preparaciones.length > 0 ? preparaciones.map(p => `
                          <tr>
                            <td>${Utils.formatearFecha(Utils.fechaISOToLocal(p.fecha), 'datetime')}</td>
                            <td class="text-end text-success">+${Utils.formatNumber(p.cantidad, 1)} ${producto.unidad_abrev}</td>
                            <td>${p.observaciones || '-'}</td>
                          </tr>
                        `).join('') : '<tr><td colspan="3" class="text-muted text-center py-3">Sin preparaciones</td></tr>')
      : producto.tipo === 'compuesto' ?
        (entradasComponentes.length > 0 ? entradasComponentes.map(e => `
                          <tr>
                            <td>${Utils.formatearFecha(Utils.fechaISOToLocal(e.fecha), 'datetime')}</td>
                            <td class="text-end text-success">+${Utils.formatNumber(e.cantidad, 1)} ${e.unidad_abrev}</td>
                            <td>${e.componente_nombre || '-'}</td>
                            <td>${e.observaciones || '-'}</td>
                          </tr>
                        `).join('') : '<tr><td colspan="4" class="text-muted text-center py-3">Sin entradas de componentes</td></tr>')
        :
        (compras.length > 0 ? compras.map(c => `
                          <tr>
                            <td>${Utils.formatearFecha(Utils.fechaISOToLocal(c.fecha), 'datetime')}</td>
                            <td class="text-end text-success">+${Utils.formatNumber(c.cantidad, 1)} ${producto.unidad_abrev}</td>
                            <td>${c.codigo_factura || '-'}</td>
                            <td>${c.proveedor_nombre || '-'}</td>
                          </tr>
                        `).join('') : '<tr><td colspan="4" class="text-muted text-center py-3">Sin compras</td></tr>')
    }
                    </tbody>
                  </table>
                </div>
              </div>
              <!-- Ventas -->
              <div class="card mb-4">
                <div class="card-header bg-danger bg-opacity-10">
                  <h5 class="mb-0"><i class="fas fa-arrow-up me-1"></i>💰 VENTAS (${ventas.length})</h5>
                </div>
                <div class="card-body p-0">
                  <table class="table table-sm table-hover mb-0">
                    <thead class="table-danger">
                      <tr><th>Fecha</th><th class="text-end">Cantidad</th><th>Venta</th><th>Vendedor</th><th>Estado</th></tr>
                    </thead>
                    <tbody>
                      ${ventas.length > 0 ? ventas.map(v => `
                        <tr class="${v.estado === 'anulada' ? 'text-muted' : ''}">
                          <td>${Utils.formatearFecha(Utils.fechaISOToLocal(v.fecha), 'datetime')}</td>
                          <td class="text-end ${v.estado === 'anulada' ? 'text-success' : 'text-danger'}">
                            ${v.estado === 'anulada' ? '+' : '-'}${Utils.formatNumber(Math.abs(v.cantidad), 1)} ${producto.unidad_abrev}
                          </td>
                          <td>#${v.venta_id}</td>
                          <td>${v.vendedor_nombre || '-'}</td>
                          <td>${v.estado === 'anulada' ? '❌ Anulada' : '✅'}</td>
                        </tr>
                      `).join('') : '<tr><td colspan="5" class="text-muted text-center py-3">Sin ventas</td></tr>'}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <!-- Ajustes -->
              <div class="card mb-4">
                <div class="card-header bg-warning bg-opacity-10">
                  <h5 class="mb-0"><i class="fas fa-balance-scale me-1"></i>🔄 AJUSTES (${ajustes.length})</h5>
                </div>
                <div class="card-body p-0">
                  <table class="table table-sm table-hover mb-0">
                    <thead class="table-warning">
                      <tr><th>Fecha</th><th class="text-end">Cantidad</th><th>Tipo</th><th>Observaciones</th></tr>
                    </thead>
                    <tbody>
                      ${ajustes.length > 0 ? ajustes.map(a => `
                        <tr>
                          <td>${Utils.formatearFecha(Utils.fechaISOToLocal(a.fecha), 'datetime')}</td>
                          <td class="text-end ${a.cantidad > 0 ? 'text-success' : 'text-danger'}">
                            ${a.cantidad > 0 ? '+' : ''}${Utils.formatNumber(a.cantidad, 1)} ${producto.tipo === 'compuesto' && producto.sub_tipo === 'conformado' ? totales.pminUnidad : producto.unidad_abrev}
                          </td>
                          <td>${a.tipo}</td>
                          <td>${a.observaciones || '-'}</td>
                        </tr>
                      `).join('') : '<tr><td colspan="4" class="text-muted text-center py-3">Sin ajustes</td></tr>'}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>            
            <div class="col-lg-4">
              <!-- Resumen -->
              <div class="card">
                <div class="card-header bg-primary text-white">
                  <h5 class="mb-0">📊 RESUMEN</h5>
                </div>
                <div class="card-body">
                ${producto.tipo === 'compuesto' && producto.sub_tipo === 'conformado' ? `
                  <!-- Resumen para compuestos NO preparables -->
                  <div class="d-flex justify-content-between mb-2">
                    <span>Componente limitante:</span>
                    <strong>${totales.pminNombre || '-'}</strong>
                  </div>
                  <div class="d-flex justify-content-between mb-2">
                    <span>Total entradas:</span>
                    <strong class="text-success">${Utils.formatNumber(totales.entradas, 1)} ${totales.pminUnidad || ''}</strong>
                  </div>
                ` : `
                  <!-- Resumen para simples y compuestos preparables -->
                  <div class="d-flex justify-content-between mb-2">
                    <span>Total entradas:</span>
                    <strong class="text-success">${Utils.formatNumber(totales.entradas, 1)} ${producto.unidad_abrev}</strong>
                  </div>
                `}
                  <hr>
                  <div class="d-flex justify-content-between mb-2">
                    <span>Stock esperado:</span>
                    <strong>${producto.unidad_tipo == 'unidad' ? Math.trunc(totales.stockEsperado) : Utils.formatNumber(totales.stockEsperado, 1)} ${producto.unidad_abrev}</strong>
                  </div>
                  <div class="d-flex justify-content-between mb-2">
                    <span>Total salidas:</span>
                    <strong class="text-danger">${producto.unidad_tipo == 'unidad' ? Math.trunc(totales.salidas) : Utils.formatNumber(totales.salidas, 1)} ${producto.unidad_abrev}</strong>
                  </div>
                  <div class="d-flex justify-content-between mb-2">
                    <span>Ajustes netos:</span>
                    <strong>${producto.unidad_tipo == 'unidad' ? Math.trunc(totales.ajustes) : Utils.formatNumber(totales.ajustes, 1)} ${producto.unidad_abrev}</strong>
                  </div>
                  <hr>
                  <div class="d-flex justify-content-between mb-2">
                    <span>Stock actual:</span>
                    <strong>${producto.unidad_tipo == 'unidad' ? Math.trunc(totales.stockActual) : Utils.formatNumber(totales.stockActual, 1)} ${producto.unidad_abrev}</strong>
                  </div>
                  <hr>
                  <div class="d-flex justify-content-between">
                    <span>Diferencia:</span>
                    <strong class="${totales.diferencia === 0 ? 'text-success' : 'text-danger'}">
                      ${totales.diferencia > 0 ? '+' : ''}${producto.unidad_tipo == 'unidad' ? Math.trunc(totales.diferencia) : Utils.formatNumber(totales.diferencia, 1)} ${producto.unidad_abrev} ${totales.diferencia === 0 ? ' ✅' : ' ⚠️'}
                    </strong>
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
// VISTA: FICHA DE COSTO
// ============================================
Productos.costo = async function (params) {
  console.log('💰 Cargando ficha de costo', params);

  const id = params.id;

  try {
    Utils.showLoading('Cargando ficha de costo...');

    const producto = await API.productos.obtener(id);
    const layout = await Productos.renderCostoLayout(producto);

    $('#app').html(layout);
    Productos.bindCostoEvents(producto);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Productos.renderCostoLayout = async function (producto) {
  const user = State.getUser();
  const config = await State.getConfig();
  console.log('renderCostoLayout. Config:', config);
  if (!config) {
    Toast.warning('Error al cargar la configuración. Intente de nuevo.');
    return;
  }
  const margenMaxRate = (config.margen_recomendado || 20) / 100;
  const impuestoDefRate = (config.impuesto_ventas || 15) / 100;
  const gastosDefRate = (config.porcentaje_gastos || 0) / 100;  // % gastos fijos global
  const costoBase = producto.costo_base || 0;

  // Desglose con la fórmula del propietario (multiplicativa):
  // precio_neto = costo × (1 + %gastos) × (1 + margen) · recomendado = neto × (1 + impuesto)
  let gastosFijosRate = gastosDefRate;
  let margenRate = margenMaxRate;
  let gastosFijosMonto = costoBase * gastosFijosRate;
  let precioBase = costoBase + gastosFijosMonto;   // costo + gastos
  let margenMonto = precioBase * margenRate;
  let precioNeto = precioBase + margenMonto;
  let impuestoMonto = precioNeto * impuestoDefRate;
  const precioRecomendado = precioNeto + impuestoMonto;

  // Desglose del precio actual (si tiene): descomponer multiplicativamente
  if (producto.precio_venta) {
    precioNeto = producto.precio_venta / (1 + impuestoDefRate);
    impuestoMonto = producto.precio_venta - precioNeto;
    precioBase = costoBase * (1 + gastosFijosRate);
    gastosFijosMonto = precioBase - costoBase;
    margenMonto = precioNeto - precioBase;
    margenRate = precioBase > 0 ? margenMonto / precioBase : 0;
  }

  return `
    <div class="app-wrapper">
      ${Sidebar.render('productos')}
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
          
          <!-- Componentes de la receta (solo compuestos) -->
          ${producto.tipo === 'compuesto' && producto.receta && producto.receta.length > 0 ? `
            <div class="card mb-4">
              <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-list-ul me-2"></i>Componentes de la Receta</h5>
              </div>
              <div class="card-body p-0">
                <table class="table table-sm mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Componente</th>
                      <th class="text-end">Cantidad</th>
                      <th class="text-end">Costo Unit.</th>
                      <th class="text-end">Costo Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${producto.receta.map(c => {
    const costoUnit = c.costo_unitario || (c.precio_venta ? c.precio_venta / 1.15 : 0);
    const costoTotal = costoUnit * c.cantidad;
    return `
                        <tr>
                          <td>${c.producto_nombre}</td>
                          <td class="text-end">${Utils.formatNumber(c.cantidad, 3)} ${c.unidad_abrev}</td>
                          <td class="text-end">${Utils.formatMoney(costoUnit)}</td>
                          <td class="text-end">${Utils.formatMoney(costoTotal)}</td>
                        </tr>
                      `;
  }).join('')}
                  </tbody>
                  <tfoot class="table-light">
                    <tr>
                      <th colspan="3" class="text-end">Costo Base Total:</th>
                      <th class="text-end">${Utils.formatMoney(costoBase)}</th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ` : ''}
          
          <form id="costoForm">
            <div class="row">
              <!-- Columna Izquierda: Parámetros -->
              <div class="col-lg-6">
                <div class="card mb-4">
                  <div class="card-header"><h5 class="mb-0"><i class="fas fa-sliders-h me-2"></i>Parámetros</h5></div>
                  <div class="card-body">

                      <div class="mb-2">
                        <div class="d-flex justify-content-between lh-1">
                          <span>Costo Base:</span>
                          <strong>$ ${Utils.formatMoney(costoBase)}</strong>
                        </div>
                        <small class="text-muted d-block">${producto.tipo === 'compuesto' ? 'Calculado a partir de la receta' : 'Basado en última compra'}</small>
                      </div>
                      <div class="mb-2">
                        <div class="d-flex justify-content-between lh-1">
                          <span>Impuestos sobre ventas:</span>
                          <strong>${Utils.formatNumber(impuestoDefRate * 100)} %</strong>
                        </div>
                        <small class="text-muted d-block">De configuracion general</small>
                      </div>
                      <div class="d-flex justify-content-between mb-2">
                        <span>Gastos fijos:</span>
                        <strong>${Utils.formatNumber(gastosFijosRate * 100)} %</strong>
                      </div>
                      <div class="d-flex justify-content-between mb-2">
                        <span>Margen máximo:</span>
                        <strong>${Utils.formatNumber(margenRate * 100)} %</strong>
                      </div>
                    <hr>
                    <div class="mb-3">
                      <label class="form-label fw-bold"><i class="fas fa-tag me-1"></i>Precio de Venta</label>
                      <div class="input-group">
                        <span class="input-group-text">$</span>
                        <input type="number" class="form-control form-control-lg" id="precioVenta" value="${producto.precio_venta || 0}" step="0.01" min="0" placeholder="0.00">
                      </div>
                      <small class="text-muted">Con impuestos incluidos</small>
                    </div>
                    <button type="submit" class="btn btn-success btn-lg w-100 py-3">
                  <i class="fas fa-check me-1"></i>Guardar Precio
                </button>
                  </div>
                </div>
              </div>
              
              <!-- Columna Derecha: Desglose -->
              <div class="col-lg-6">
                <div class="card mb-4">
                  <div class="card-header"><h5 class="mb-0"><i class="fas fa-receipt me-2"></i>Desglose del Precio</h5></div>
                  <div class="card-body">
                    <div class="bg-light p-3 rounded">
                      <div class="d-flex justify-content-between mb-2">
                        <span>Costo Base:</span>
                        <strong id="costoBaseDisplay">${Utils.formatMoney(costoBase)}</strong>
                      </div>
                      <div class="d-flex justify-content-between mb-2">
                        <span>+ Gastos Fijos (<span id="gastosPctDisplay">${Utils.formatNumber(gastosFijosRate * 100)}</span>%):</span>
                        <span id="gastosDisplay">${Utils.formatMoney(gastosFijosMonto)}</span>
                      </div>
                      <div class="d-flex justify-content-between mb-2">
                        <span>= Precio Base:</span>
                        <span id="precioBaseDisplay">${Utils.formatMoney(precioBase)}</span>
                      </div>
                      <div class="d-flex justify-content-between mb-2">
                        <span>+ Margen (<span id="margenValor">${Utils.formatNumber(margenRate * 100)}</span>%):</span>
                        <span id="margenDisplay">${Utils.formatMoney(margenMonto)}</span>
                      </div>
                      <div class="d-flex justify-content-between mb-2">
                        <span>= Precio Neto:</span>
                        <span id="precioNetoDisplay">${Utils.formatMoney(precioNeto)}</span>
                      </div>
                      <div class="d-flex justify-content-between mb-2">
                        <span>+ Impuesto (${impuestoDefRate * 100}%):</span>
                        <span id="impuestoDisplay">${Utils.formatMoney(impuestoMonto)}</span>
                      </div>
                      <hr>
                      <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="fw-bold fs-5">Precio Final:</span>
                        <span class="fs-4 fw-bold text-primary" id="precioFinalDisplay">${Utils.formatMoney(producto.precio_venta || 0)}</span>
                      </div>
                      
                      <!-- Precio Recomendado -->
                      <div class="alert alert-warning p-2 mb-0">
                        <div class="d-flex justify-content-between align-items-center">
                          <span><i class="fas fa-lightbulb me-1"></i>Recomendado:</span>
                          <span class="fw-bold">${Utils.formatMoney(precioRecomendado)}</span>
                        </div>
                        <small class="text-muted">Margen máx. ${Utils.formatNumber(margenMaxRate * 100)}% · Gastos fijos ${Utils.formatNumber(gastosDefRate * 100)}%</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
           </form>
        </div>
      </main>
    </div>
  `;
};

Productos.bindCostoEvents = async function (producto) {
  const config = await State.getConfig();
  console.log('bindCostoEvents. Config:', config);
  if (!config) {
    Toast.warning('Error al cargar la configuración. Intente de nuevo.');
    return;
  }
  const margenMaxRate = (config.margen_recomendado || 20) / 100; //margenMaximo
  const impuestoDefRate = (config.impuesto_ventas || 15) / 100; //  impuestoPct
  const costoBase = producto.costo_base || 0;
  const gastosDefRate = (config.porcentaje_gastos || 0) / 100;  // % gastos fijos global

  // Actualizar desglose visual (fórmula del propietario, multiplicativa)
  const actualizarDesglose = function (precioVenta) {
    // impuesto incluido en el precio
    const precioNeto = precioVenta / (1 + impuestoDefRate);
    const impuestoMonto = precioVenta - precioNeto;

    // costo + gastos (fijo, del % global)
    const precioBase = costoBase * (1 + gastosDefRate);
    const gastosFijosMonto = precioBase - costoBase;

    // el margen es la diferencia resultante
    const margenMonto = precioNeto - precioBase;
    const margenRate = precioBase > 0 ? margenMonto / precioBase : 0;

    // Actualizar UI
    $('#costoBaseDisplay').text(Utils.formatMoney(costoBase));
    $('#precioBaseDisplay').text(Utils.formatMoney(precioBase));
    $('#gastosDisplay').text(Utils.formatMoney(gastosFijosMonto));
    $('#gastosPctDisplay').text(Utils.formatNumber(gastosDefRate * 100));
    $('#precioNetoDisplay').text(Utils.formatMoney(precioNeto));
    $('#margenValor').text(Utils.formatNumber(margenRate * 100));
    $('#margenDisplay').text(Utils.formatMoney(margenMonto));
    $('#impuestoDisplay').text(Utils.formatMoney(impuestoMonto));
    $('#precioFinalDisplay').text(Utils.formatMoney(precioVenta));

    return { gastosFijosRate: gastosDefRate, margenRate };
  };

  $('#btnVolver').on('click', () => ViewManager.volver());
  $('.breadcrumb-back').on('click', (e) => { e.preventDefault(); ViewManager.volver(); });

  // Evento: cambiar precio de venta
  $('#precioVenta').on('input', function () {
    const precio = parseFloat($(this).val()) || 0;
    if (precio > 0) {
      const result = actualizarDesglose(precio);
      $('#margen').val(Utils.formatNumber(result.margenRate * 100));
    }
  });

  // Guardar
  $('#costoForm').on('submit', async function (e) {
    e.preventDefault();
    const precio = parseFloat($('#precioVenta').val()) || 0;
    const result = actualizarDesglose(precio);

    const data = {
      costo_base: costoBase,
      gastos_fijos: result.gastosFijosRate * 100,
      margen: result.margenRate * 100,
      impuesto: impuestoDefRate * 100,
      precio_venta: precio
    };

    try {
      Utils.showLoading('Guardando...');
      await API.productos.actualizarCosto(producto.id, data);
      State.invalidateCache('productos');
      Utils.hideLoading();
      Toast.success('Ficha de costo actualizada');
      ViewManager.volver();
    } catch (error) {
      Utils.hideLoading();
      console.error(error);
    }
  });

  Productos._bindCommon();
};

// ============================================
// VISTA: RECETA
// ============================================
Productos.receta = async function (params) {
  console.log('🧪 Cargando gestión de receta', params);

  const id = params.id;

  try {
    Utils.showLoading('Cargando receta...');

    const [producto, receta, todosProductos] = await Promise.all([
      API.productos.obtener(id),
      API.productos.obtenerReceta(id),
      API.productos.listar()
    ]);

    console.log('📦 Producto padre:', producto);
    console.log('📦 Todos los productos:', todosProductos.length);

    // ✅ Obtener IDs de componentes ya existentes en la receta
    const idsExistentes = receta.map(c => c.producto_hijo_id);

    // ✅ Filtrar solo productos válidos para receta
    const productosValidos = Productos._filtrarProductosParaReceta(todosProductos, producto.id, idsExistentes);

    console.log('📦 Productos válidos para receta:', productosValidos.length);
    console.log('📦 Productos válidos:', productosValidos.map(p => p.nombre));

    const layout = Productos.renderRecetaLayout(producto, productosValidos, receta);
    $('#app').html(layout);

    Productos.bindRecetaEvents(producto, receta);
    Productos.verificarSumaReceta(receta, producto);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    Toast.error('Error al cargar receta: ' + error.message);
    console.error(error);
  }
};

Productos.renderRecetaLayout = function (producto, productosDisponibles, componentesActuales) {
  const user = State.getUser();

  console.log('🎨 Renderizando receta. Productos disponibles:', productosDisponibles.length);

  // ✅ Asegurar que productosDisponibles es un array
  const productos = Array.isArray(productosDisponibles) ? productosDisponibles : [];

  const productosSimples = productos; // Ya vienen filtrados

  console.log('🎨 Productos para el select:', productosSimples.length);

  return `
    <div class="app-wrapper">
      ${Sidebar.render('productos')}
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
              <i class="fas fa-list-ul me-2"></i>Receta: 1 ${producto.unidad_venta_nombre || producto.unidad_venta_abrev || 'unidad'} de ${producto.nombre}
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
                         ${productosSimples.length > 0 ? productosSimples.map(p => `
                            <option value="${p.id}" 
                                    data-unidad="${p.unidad_venta_nombre}"
                                    data-abrev="${p.unidad_venta_abrev}"
                                    data-tipo="${p.unidad_venta_tipo}">
                              ${p.nombre} (${p.codigo}) - ${p.unidad_venta_abrev}
                            </option>
                          `).join('') : '<option value="" disabled>No hay productos disponibles</option>'}
                        </select>
                      </div>
                      
                      <div class="alert alert-info mt-3" id="infoSuma" style="display:none">
                        <i class="fas fa-calculator me-2"></i>
                        <span id="sumaText"></span>
                      </div>           

                      <div class="col-md-6">
                        <label class="form-label">Cantidad</label>
                        <input type="number" class="form-control" id="cantidadComponente" value="1" step="0.001" min="0.001" required>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">Unidad</label>
                        <input type="text" class="form-control" id="unidadComponente" readonly disabled value="-">
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
                  
                  <div class="mb-3">
                    <label class="form-label">Tipo de compuesto</label>
                    <p>
                      <span class="badge ${producto.sub_tipo === 'elaborado' ? 'bg-warning' : 'bg-info'} fs-6">
                        ${producto.sub_tipo === 'elaborado' ? 'Elaborado' : 'Conformado (se arma en la venta)'}
                      </span>
                    </p>
                    <small class="text-muted">El subtipo solo se define al crear el producto.</small>
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
  const self = this;
  const esUnidad = producto.unidad_venta_abrev === 'ud';

  // Volver
  $('#btnVolver').on('click', () => ViewManager.volver());
  $('.breadcrumb-back').on('click', (e) => {
    e.preventDefault();
    ViewManager.volver();
  });

  // Actualizar unidad al seleccionar producto
  $('#productoComponente').on('change', function () {
    const selected = $(this).find('option:selected');
    const unidad = selected.data('unidad') || '';
    const abrev = selected.data('abrev') || '';
    const tipo = selected.data('tipo') || '';

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

    if (!productoId) { Toast.warning('Seleccione un producto'); return; }
    if (!cantidad || cantidad <= 0) { Toast.warning('Ingrese una cantidad válida'); return; }

    try {
      Utils.showLoading('Agregando componente...');
      await API.productos.agregarComponente(producto.id, {
        producto_hijo_id: parseInt(productoId),
        cantidad: cantidad
      });

      State.invalidateCache('productos');
      Utils.hideLoading();
      Toast.success('Componente agregado');

      // ✅ Recargar con productos filtrados
      const [recetaActualizada, todosProductos] = await Promise.all([
        API.productos.obtenerReceta(producto.id),
        API.productos.listar()
      ]);

      const idsExistentes = recetaActualizada.map(c => c.producto_hijo_id);
      const productosValidos = Productos._filtrarProductosParaReceta(todosProductos, producto.id, idsExistentes);

      const layout = Productos.renderRecetaLayout(producto, productosValidos, recetaActualizada);
      $('#app').html(layout);
      Productos.bindRecetaEvents(producto, recetaActualizada);
      Productos.verificarSumaReceta(recetaActualizada, producto);

    } catch (error) {
      Utils.hideLoading();
      Toast.error(error.message);
    }
  });

  // Eliminar componente
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

      // ✅ Recargar la vista con productos filtrados
      const [recetaActualizada, todosProductos] = await Promise.all([
        API.productos.obtenerReceta(producto.id),
        API.productos.listar()
      ]);

      // ✅ Aplicar el mismo filtro que en Productos.receta
      const idsExistentes = recetaActualizada.map(c => c.producto_hijo_id);
      const productosValidos = Productos._filtrarProductosParaReceta(todosProductos, producto.id, idsExistentes);

      const layout = Productos.renderRecetaLayout(producto, productosValidos, recetaActualizada);
      $('#app').html(layout);
      Productos.bindRecetaEvents(producto, recetaActualizada);
      Productos.verificarSumaReceta(recetaActualizada, producto);

    } catch (error) {
      Utils.hideLoading();
      Toast.error(error.message);
    }
  });

  // Guardar descripción de preparación (el subtipo elaborado/conformado solo se define al crear — D4)
  $('#btnGuardarPreparacion').on('click', async function () {
    try {
      const data = {
        descripcion_preparacion: $('#descripcionPreparacionReceta').val()
      };

      Utils.showLoading('Guardando...');
      await API.productos.actualizarSimple(producto.id, data);
      State.invalidateCache('productos');
      Utils.hideLoading();
      Toast.success('Configuración guardada');
      ViewManager.volver();
    } catch (error) {
      Utils.hideLoading();
      Toast.error(error.message);
    }
  });

  // Verificar sumas al cargar
  Productos.verificarSumaReceta(componentesActuales, producto);

  // Sidebar y logout
  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));
  $('#sidebar .nav-link').on('click', function (e) {
    const href = $(this).attr('href');
    if (href && href !== '#') {
      e.preventDefault();
      ViewManager.navegar(href.substring(1), {}, { reset: true });
    }
  });
  $('#btnLogout').on('click', (e) => { e.preventDefault(); App.logout(); });
};

// Función informativa: las cantidades de la receta deben coincidir con la cantidad
// del producto a preparar (regla del propietario, 2026-08-11). No se valida la suma.
Productos.verificarSumaReceta = function (receta, producto) {
  if (!receta || receta.length === 0) {
    $('#infoSuma').hide();
    return;
  }

  const esUnidad = producto.unidad_venta_abrev === 'ud';

  if (esUnidad) {
    $('#infoSuma').hide();
    return;
  }

  $('#sumaText').html('⚠️ Las cantidades establecidas en la receta deben coincidir con la cantidad del producto a preparar.');
  $('#infoSuma').removeClass('alert-info').addClass('alert-warning');
  $('#infoSuma').show();
};

// ============================================
// MÉTODOS AUXILIARES
// ============================================

Productos.renderNavbar = function (user) {
  return `
  <nav class="navbar navbar-light bg-white border-bottom px-3">
    <button class="btn btn-link d-md-none" id="toggleSidebar">
      <i class="fas fa-bars"></i>
    </button>
    <div class="d-flex align-items-center ms-auto">
      <span class="me-3"><i class="fas fa-user me-1"></i>${user.nombre_completo}</span>
    </div>
  </nav>`;
};

/**
 * Filtra productos válidos para añadir a una receta
 * @param {Array} todosProductos - Todos los productos disponibles
 * @param {number} productoPadreId - ID del producto padre (no puede ser componente)
 * @param {Array} idsExistentes - IDs de productos que ya están en la receta
 * @returns {Array} Productos filtrados
 */
Productos._filtrarProductosParaReceta = function (todosProductos, productoPadreId, idsExistentes) {
  return todosProductos.filter(p => {
    if (!p.activo) return false;
    if (p.id == productoPadreId) return false;
    if (idsExistentes.includes(p.id)) return false;
    // D5: solo granel o compuestos elaborados pueden ser ingredientes
    const esGranel = p.tipo === 'simple' && p.sub_tipo === 'granel';
    const esCompuestoElaborado = p.tipo === 'compuesto' && p.sub_tipo === 'elaborado';
    return esGranel || esCompuestoElaborado;
  });
};

Productos.bindIndexEvents = function () {
  $('[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });
};

Productos._bindCommon = function () {
  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));
  $('#btnVolver').on('click', () => ViewManager.volver());
  $('.breadcrumb-back').on('click', (e) => { e.preventDefault(); ViewManager.volver(); });
  $('#sidebar .nav-link').on('click', function (e) {
    e.preventDefault();
    const h = $(this).attr('href');
    if (h && h !== '#') {
      ViewManager.navegar(h.substring(1), {}, { reset: true });
    }
    if ($(window).width() < 768) $('#sidebar').removeClass('show');
  });
  $('#btnLogout').on('click', e => { e.preventDefault(); App.logout(); });
};



window.Productos = Productos;