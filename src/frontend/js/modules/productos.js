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
    const stockBajo = productos.filter(p => p.stock_actual <= p.stock_minimo);
    const compuestos = productos.filter(p => p.tipo === 'compuesto');
    const simples = productos.filter(p => p.tipo === 'simple');
    const sinCosto = productos.filter(p => !p.precio_venta || p.precio_venta === 0);
    return {
      total: productos.length, activos: activos.length, stockBajo: stockBajo.length,
      compuestos: compuestos.length, simples: simples.length, sinCosto: sinCosto.length,
      productosDestacados: stockBajo.slice(0, 5),
      ultimosAgregados: productos.slice(-5).reverse()
    };
  } catch (error) {
    return { total: 0, activos: 0, stockBajo: 0, compuestos: 0, simples: 0, sinCosto: 0, productosDestacados: [], ultimosAgregados: [] };
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
            <div class="col-6 col-md-2"><div class="summary-mini-card"><h4>${stats.total}</h4><p>Total</p></div></div>
            <div class="col-6 col-md-2"><div class="summary-mini-card text-success"><h4>${stats.activos}</h4><p>Activos</p></div></div>
            <div class="col-6 col-md-2"><div class="summary-mini-card text-warning"><h4>${stats.stockBajo}</h4><p>Stock Bajo</p></div></div>
            <div class="col-6 col-md-2"><div class="summary-mini-card text-danger"><h4>${stats.sinCosto}</h4><p>Sin Ficha Costo</p></div></div>
            <div class="col-6 col-md-2"><div class="summary-mini-card text-info"><h4>${stats.compuestos}</h4><p>Compuestos</p></div></div>
            <div class="col-6 col-md-2"><div class="summary-mini-card text-secondary"><h4>${stats.simples}</h4><p>Simples</p></div></div>
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
                      <div class="stock-level"><div class="progress" style="height:6px"><div class="progress-bar bg-warning" style="width:${Math.min((p.stock_actual / p.stock_minimo) * 100, 100)}%"></div></div><span class="stock-text">${p.stock_actual}/${p.stock_minimo}</span></div>
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
  const filtro = params.filtro || 'todos';
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
          <div class="mb-3"><div class="btn-group">
            <button class="btn btn-outline-primary ${filtro === 'todos' ? 'active' : ''}" data-filtro="todos"><i class="fas fa-list me-1"></i>Todos</button>
            <button class="btn btn-outline-primary ${filtro === 'simples' ? 'active' : ''}" data-filtro="simples"><i class="fas fa-cube me-1"></i>Simples</button>
            <button class="btn btn-outline-primary ${filtro === 'compuestos' ? 'active' : ''}" data-filtro="compuestos"><i class="fas fa-cubes me-1"></i>Compuestos</button>
            <button class="btn btn-outline-warning ${filtro === 'stock-bajo' ? 'active' : ''}" data-filtro="stock-bajo"><i class="fas fa-exclamation-triangle me-1"></i>Stock Bajo</button>
            <button class="btn btn-outline-danger ${filtro === 'sin-costo' ? 'active' : ''}" data-filtro="sin-costo"><i class="fas fa-calculator me-1"></i>Sin Ficha Costo</button>
          </div></div>
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
    const stockBajo = p.stock_actual <= p.stock_minimo;
    const sinCosto = !p.precio_venta || p.precio_venta === 0;
    return [
      p.foto ? `/uploads/productos/${p.foto}` : Utils.getProductPlaceholder(p, p.id, 40),
      p.codigo, p.nombre, p.categoria_nombre || '-',
      Productos.getTipoBadge(p),
      Utils.formatMoney(p.precio_venta),
      `${Utils.formatNumber(p.stock_actual, 2)} ${p.unidad_venta_abrev || ''}`,
      p.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>',
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
    drawCallback: function () { $('#productosTable tbody tr').addClass('clickable-row'); }
  });
};

Productos.getTipoBadge = function (p) {
  if (p.tipo === 'simple') return `<span class="badge bg-info">${p.sub_tipo === 'granel' ? 'A Granel' : 'Reventa'}</span>`;
  return `<span class="badge bg-primary">Compuesto${p.requiere_preparacion ? ' • Prep' : ''}</span>`;
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

/*
Productos.bindListadoEvents = function (params) {
  const self = this, filtroInicial = params.filtro || 'todos';
  $('#btnNuevoProducto').on('click', () => ViewManager.navegar('productos/nuevo'));


  $('[data-filtro]').on('click', function () {
    const f = $(this).data('filtro');

    console.log('🔥 Filtro clickeado:', f);  // ← Añade esto
    console.log('🔥 Elemento:', this);        // ← Y esto
    return;
    $('[data-filtro]').removeClass('active');
    $(this).addClass('active');
    self.dataTable.search('').columns().search('');
    if (f === 'todos') self.dataTable.draw();
    else if (f === 'simples') {
      console.log('Filtrando por simples!');
      //console.log('Columnas: ', self.dataTable.columns());
      self.dataTable.column(11).search('simple', true, false).draw();
    }
    else if (f === 'compuestos') self.dataTable.column(11).search('compuesto', true, false).draw();
    else if (f === 'stock-bajo') self.dataTable.column(9).search('true', true, false).draw();
    else if (f === 'sin-costo') self.dataTable.column(10).search('true', true, false).draw();
  });


  if (filtroInicial !== 'todos') $(`[data-filtro="${filtroInicial}"]`).trigger('click');

  $('#productosTable').on('click', '.ver-producto', function (e) { e.preventDefault(); ViewManager.navegar('productos/ver/' + $(this).data('id')); });
  $('#productosTable').on('click', '.editar-producto', function (e) { e.preventDefault(); ViewManager.navegar('productos/editar/' + $(this).data('id')); });
  $('#productosTable').on('click', '.costo-producto', function (e) { e.preventDefault(); ViewManager.navegar('productos/costo/' + $(this).data('id')); });
  $('#productosTable').on('click', '.receta-producto', function (e) { e.preventDefault(); ViewManager.navegar('productos/receta/' + $(this).data('id')); });

  $('#productosTable tbody').on('dblclick', 'tr', function () { ViewManager.navegar('productos/ver/' + self.dataTable.row(this).data()[8]); });

  $(document).on('click', '[data-eliminar]', async function (e) {
    const cv = ViewManager.currentView || '';
    if (!cv.startsWith('productos')) return;
    e.preventDefault();
    e.stopPropagation();
    const id = $(this).data('eliminar');
    if (!await Utils.confirm('¿Eliminar este producto?', 'Confirmar')) return;
    try {
      Utils.showLoading('Eliminando...');
      await API.productos.eliminar(id);
      State.invalidateCache('productos'); Utils.hideLoading(); Toast.success('Producto eliminado');
      ViewManager.refresh();
    }
    catch (error) {
      Utils.hideLoading();
      console.error(error);
    }
  });
  Productos._bindCommon();
};
*/

// ============================================
// FORMULARIO (NUEVO/EDITAR)
// ============================================
/**
 * Deshabilita campos críticos para productos con dependencias
 * Solo permite editar: código, nombre, categoría, stock mínimo, foto
 */
Productos._aplicarRestriccionesDependencias = function () {
  // Deshabilitar campos críticos
  $('#tipo').prop('disabled', true);
  $('#subTipo').prop('disabled', true);
  $('#unidadVentaId').prop('disabled', true);
  $('#unidadCompraId').prop('disabled', true);

  // Si hay checkbox de requiere_preparacion, deshabilitarlo
  if ($('#requierePreparacion').length) {
    $('#requierePreparacion').prop('disabled', true);
  }

  // Deshabilitar pestaña de receta
  $('#receta-tab').addClass('disabled').css('pointer-events', 'none');

  // Mostrar aviso visual
  const aviso = `
    <div class="alert alert-warning alert-sm mb-3">
      <i class="fas fa-info-circle me-1"></i>
      <strong>Edición restringida:</strong> Solo puedes modificar código, nombre, categoría, stock mínimo y foto.
      Los demás campos están bloqueados porque el producto tiene movimientos asociados.
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

      // Si es edición y es a-granel, filtrar unidad de compra por el tipo guardado
      if (producto && producto.tipo === 'simple' && producto.sub_tipo === 'granel' && producto.unidad_compra_id) {
        const unidadCompra = Utils.getUnidad(producto.unidad_compra_id);
        if (unidadCompra) {
          const todas = State.getCache('unidades') || [];
          const filtradas = todas.filter(u => u.tipo === unidadCompra.tipo && u.activo);

          // Actualizar combo de unidad de venta
          const $venta = $('#unidadVentaId');
          $venta.empty().append('<option value="">Seleccione...</option>');
          filtradas.forEach(u => $venta.append(`<option value="${u.id}">${u.nombre} (${u.abreviatura})</option>`));
          $venta.val(producto.unidad_venta_id);
        }
      }
    }

    $('#app').html(Productos.renderFormularioLayout(producto, tipoInicial, { catHtml, uniVentaHtml, uniCompraHtml }));
    if (producto) Productos.llenarFormulario(producto);
    else { $('#placeholderFoto').hide(); $('#previewFotoContainer').append(`<img src="${Utils.getProductPlaceholder('Nuevo', 1, 120)}" class="default-placeholder" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`); }

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
                  <div class="col-md-4"><label class="form-label">Stock Mínimo</label><input type="number" class="form-control" id="stockMinimo" value="0" step="0.01" min="0"></div>
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
  const subTipo = $('#subTipo').val();

  if (tipo === 'simple') {
    $('#rowSubTipo').show();
    $('#receta-tab').hide();

    if (subTipo === 'reventa') {
      $('#rowUnidadCompra').hide();
      // Disparar cambio para filtrar unidades
      $('#subTipo').trigger('change');
    } else if (subTipo === 'granel') {
      $('#rowUnidadCompra').show();
      $('#subTipo').trigger('change');
    }
  } else {
    $('#rowSubTipo').hide();
    $('#receta-tab').show();
    $('#rowUnidadCompra').hide();
  }
};

Productos.llenarFormulario = function (p) {
  $('#codigo').val(p.codigo);
  $('#nombre').val(p.nombre);

  // Solo cambiar tipo si no está deshabilitado
  if (!$('#tipo').prop('disabled')) {
    $('#tipo').val(p.tipo);
    if (p.tipo === 'simple') $('#subTipo').val(p.sub_tipo || 'reventa');
  }

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
  $('#stockActual').val(`${Utils.formatNumber(p.stock_actual, 2)} ${p.unidad_venta_abrev || ''}`);
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
  // Al cambiar sub-tipo, filtrar unidades
  $('#subTipo').on('change', function () {
    const subTipo = $(this).val();
    const todasUnidades = State.getCache('unidades') || [];

    if (subTipo === 'reventa') {
      // ✅ Reventa: solo unidades tipo "unidad"
      const unidadesTipo = todasUnidades.filter(u => u.tipo === 'unidad' && u.activo);

      // Actualizar unidad de venta
      const $venta = $('#unidadVentaId');
      $venta.empty().append('<option value="">Seleccione...</option>');
      unidadesTipo.forEach(u => $venta.append(`<option value="${u.id}">${u.nombre} (${u.abreviatura})</option>`));

      // Seleccionar "Unidad" por defecto
      const unidadDefault = unidadesTipo.find(u => u.abreviatura === 'ud');
      if (unidadDefault) $venta.val(unidadDefault.id);

      // Ocultar unidad de compra
      $('#rowUnidadCompra').hide();

    } else if (subTipo === 'granel') {
      // ✅ Granel: mostrar unidad de compra con todas las unidades
      $('#rowUnidadCompra').show();

      // Cargar todas las unidades en unidad de compra
      const $compra = $('#unidadCompraId');
      $compra.empty().append('<option value="">Seleccione...</option>');
      todasUnidades.filter(u => u.activo).forEach(u =>
        $compra.append(`<option value="${u.id}">${u.nombre} (${u.abreviatura})</option>`)
      );

      // Al cambiar unidad de compra, filtrar unidad de venta por el mismo tipo
      $('#unidadCompraId').off('change').on('change', function () {
        const compraId = $(this).val();
        if (!compraId) {
          $('#unidadVentaId').empty().append('<option value="">Seleccione...</option>');
          return;
        }

        const unidadCompra = todasUnidades.find(u => u.id == compraId);
        if (!unidadCompra) return;

        const filtradas = todasUnidades.filter(u => u.tipo === unidadCompra.tipo && u.activo);

        const $venta = $('#unidadVentaId');
        $venta.empty().append('<option value="">Seleccione...</option>');
        filtradas.forEach(u => $venta.append(`<option value="${u.id}">${u.nombre} (${u.abreviatura})</option>`));

        if (filtradas.length > 0) $venta.val(filtradas[0].id);
      });
    }
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
    sessionStorage.setItem('productoFormTemp', JSON.stringify(Productos.recopilarDatosFormulario()));
    ViewManager.navegar('categorias/nuevo', { retorno: id ? `productos/editar/${id}` : 'productos/nuevo', origen, retornoParams });
  });

  $('#btnCancelar, #btnVolver').on('click', () => ViewManager.volver());
  $('.breadcrumb-back').on('click', e => { e.preventDefault(); ViewManager.volver(); });

  $('#productoForm').on('submit', async function (e) {
    e.preventDefault();
    if (!Productos.validarFormulario()) return;
    const data = Productos.recopilarDatosFormulario();
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

  // Al cambiar unidad de compra, filtrar unidad de venta por el mismo tipo
  $('#unidadCompraId').on('change', function () {
    const $venta = $('#unidadVentaId');
    $venta.empty().append('<option value="">Seleccione...</option>');
    const compraId = $(this).val();
    if (!compraId) {
      return;
    }

    const unidadCompra = Utils.getUnidad(compraId);
    if (!unidadCompra) return;

    const todasUnidades = State.getCache('unidades') || [];

    // Filtrar solo unidades del mismo tipo
    const filtradas = todasUnidades.filter(u => u.tipo === unidadCompra.tipo && u.activo);

    filtradas.forEach(u => $venta.append(`<option value="${u.id}">${u.nombre} (${u.abreviatura})</option>`));

    // Seleccionar la primera por defecto si hay opciones
    if (filtradas.length > 0) {
      $venta.val(filtradas[0].id);
    }
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

Productos.recopilarDatosFormulario = function () {
  const tipo = $('#tipo').val(), sub = $('#subTipo').val();
  return {
    codigo: $('#codigo').val().trim(), nombre: $('#nombre').val().trim(), tipo,
    sub_tipo: tipo === 'simple' ? sub : null,
    requiere_preparacion: tipo === 'compuesto' ? $('#requierePreparacion').is(':checked') : false,
    categoria_id: $('#categoriaId').val() || null, unidad_venta_id: parseInt($('#unidadVentaId').val()),
    unidad_compra_id: (tipo === 'simple' && sub === 'granel') ? parseInt($('#unidadCompraId').val()) : null,
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
    console.log('Producto', producto);
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
  const config = State.getConfig();

  console.log('preparing for render. User:', user);

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
                        <label class="text-muted small">Conversión</label>
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
  const config = State.getConfig();
  const margenMaxRate = (config.margen_recomendado || 20) / 100;
  const impuestoDefRate = (config.impuesto_ventas || 15) / 100;
  const gastosDefRate = (config.porcentaje_gastos || 0) / 100;  //gastos fijos
  const costoBase = producto.costo_base || 0;

  // Cálculos para Precio Recomendado (con margen maximo recomendado)
  let margenRate = margenMaxRate, gastosFijosRate = gastosDefRate;

  let precioBase = costoBase / (1 - gastosFijosRate);
  let gastosFijosMonto = precioBase * gastosFijosRate;
  let precioNeto = precioBase / (1 - margenRate);
  let margen, margenMonto = precioNeto * margenRate;
  const precioRecomendado = precioNeto / (1 - impuestoDefRate);
  let impuestoMonto = precioRecomendado * impuestoDefRate;
  console.log('Cálculos iniciales:', { costoBase, precioBase, gastosFijosRate, gastosFijosMonto, precioNeto, margenRate, margenMonto, precioRecomendado, impuestoMonto });

  // Cálculo del precio actual
  if (producto.precio_venta) {
    impuestoMonto = producto.precio_venta * impuestoDefRate;
    precioNeto = producto.precio_venta - impuestoMonto;
    const diffRate = (precioNeto - precioBase) / precioNeto;
    margenMonto = (diffRate < margenMaxRate) ? precioNeto * diffRate : precioNeto * margenMaxRate;
    margenRate = margenMonto / precioNeto;
    const diffMonto = (precioNeto - precioBase) - (precioNeto * margenMaxRate);
    precioBase = (diffMonto > 0) ? precioBase + diffMonto : precioBase;
    gastosFijosMonto = precioBase - costoBase;
    gastosFijosRate = gastosFijosMonto / precioBase;

    console.log('Cálculos ajustados al precio actual:', { precioNeto, impuestoMonto, diffRate, margenMonto, margenRate, diffMonto, precioBase, gastosFijosMonto, gastosFijosRate });
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

Productos.bindCostoEvents = function (producto) {
  const config = State.getConfig();
  const margenMaxRate = (config.margen_recomendado || 20) / 100; //margenMaximo
  const impuestoDefRate = (config.impuesto_ventas || 15) / 100; //  impuestoPct
  const costoBase = producto.costo_base || 0;
  const gastosDefRate = (config.porcentaje_gastos || 0) / 100;  //gastos fijos
  const precioBaseDef = costoBase / (1 - gastosDefRate);

  // Actualizar desglose visual
  const actualizarDesglose = function (precioVenta) {
    const impuestoMonto = precioVenta * impuestoDefRate;
    const precioNeto = precioVenta - impuestoMonto;

    const diffRate = (precioNeto - precioBaseDef) / precioNeto;
    const margenMonto = (diffRate < margenMaxRate) ? precioNeto * diffRate : precioNeto * margenMaxRate;
    const margenRate = margenMonto / precioNeto;
    const diffMonto = (precioNeto - precioBaseDef) - (precioNeto * margenMaxRate);
    const precioBase = (diffMonto > 0) ? precioBaseDef + diffMonto : precioBaseDef;

    const gastosFijosMonto = precioBase - costoBase;
    const gastosFijosRate = gastosFijosMonto / precioBase;

    // Actualizar UI
    $('#costoBaseDisplay').text(Utils.formatMoney(costoBase));
    $('#precioBaseDisplay').text(Utils.formatMoney(precioBase));
    $('#gastosDisplay').text(Utils.formatMoney(gastosFijosMonto));
    $('#gastosPctDisplay').text(Utils.formatNumber(gastosFijosRate * 100));
    $('#precioNetoDisplay').text(Utils.formatMoney(precioNeto));
    $('#margenValor').text(Utils.formatNumber(margenRate * 100));
    $('#margenDisplay').text(Utils.formatMoney(margenMonto));
    $('#impuestoDisplay').text(Utils.formatMoney(impuestoMonto));
    $('#precioFinalDisplay').text(Utils.formatMoney(precioVenta));

    return { gastosFijosRate, margenRate };
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

  // Guardar configuración de preparación
  $('#btnGuardarPreparacion').on('click', async function () {
    try {
      const data = {
        descripcion_preparacion: $('#descripcionPreparacionReceta').val(),
        requiere_preparacion: $('#requierePreparacionReceta').is(':checked')
      };

      console.log('Guardando configuración de preparación:', data);

      Utils.showLoading('Guardando...');
      await API.productos.actualizarSimple(producto.id, data);
      State.invalidateCache('productos');
      Utils.hideLoading();
      Toast.success('Configuración guardada');

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

// Función auxiliar para verificar sumas
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

  // Agrupar por tipo de unidad
  const porTipo = {};
  receta.forEach(c => {
    const tipo = c.unidad_tipo || 'otro';
    if (!porTipo[tipo]) {
      porTipo[tipo] = { suma: 0, abrev: c.unidad_abrev };
    }
    porTipo[tipo].suma += parseFloat(c.cantidad);
  });

  // Mostrar info para el tipo del producto padre
  const tipoPadre = producto.unidad_venta_tipo;
  const sumaPadre = porTipo[tipoPadre]?.suma || 0;
  const abrevPadre = producto.unidad_venta_abrev;

  if (Math.abs(sumaPadre - 1) > 0.001) {
    $('#sumaText').html(`⚠️ La suma de componentes en ${abrevPadre} es <strong>${sumaPadre.toFixed(4)}</strong>. Debe ser 1 para que la receta sea válida.`);
    $('#infoSuma').removeClass('alert-info').addClass('alert-warning');
  } else {
    $('#sumaText').html(`✅ Suma de componentes en ${abrevPadre}: <strong>${sumaPadre.toFixed(4)}</strong>. Receta válida.`);
    $('#infoSuma').removeClass('alert-warning').addClass('alert-info');
  }
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
    const esGranel = p.tipo === 'simple' && p.sub_tipo === 'granel';
    const esCompuestoPreparable = p.tipo === 'compuesto' && p.requiere_preparacion;
    return esGranel || esCompuestoPreparable;
  });
};

Productos.bindIndexEvents = function () {
  $('.clickable[data-route]').on('click', function () {
    const r = $(this).data('route');
    if (r) ViewManager.navegar(r);
  });
  $('[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });
};

Productos._bindCommon = function () {
  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));
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