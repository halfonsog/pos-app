/**
 * selector-productos.js - Componente reutilizable para seleccionar productos
 */

var SelectorProductos = window.SelectorProductos || {};

SelectorProductos._config = {};

// Devuelve true si el producto es GRAVABLE (entra a la declaración fiscal).
// El estado se hereda de su categoría: es no gravable si ELLA o alguna ancestra
// tiene gravable=0 (misma lógica que costos.idsNoGravables del backend).
SelectorProductos._esGravable = function (p) {
  if (!p || !p.categoria_id) return true; // sin categoría = gravable por defecto
  const cats = State.getCache('categorias') || [];
  const porId = new Map(cats.map(c => [Number(c.id), c]));
  let cat = porId.get(Number(p.categoria_id));
  let visitados = new Set();
  while (cat && !visitados.has(Number(cat.id))) {
    if (cat.gravable === 0) return false;
    visitados.add(Number(cat.id));
    cat = cat.padre_id ? porId.get(Number(cat.padre_id)) : null;
  }
  return true;
};

SelectorProductos.index = async function (params) {
  console.log('🛍️ Cargando selector de productos', params);

  const config = {
    origen: params.origen || 'general',
    retorno: params.retorno || 'dashboard',
    titulo: params.titulo || 'Seleccionar Productos',
    productoYaSeleccionado: params.productoYaSeleccionado || null,
    gravableRequerido: params.gravableRequerido, // 1 o 0 si ya hay un primer producto elegido
    retornoParams: params.retornoParams || {}
  };

  SelectorProductos._config = config;

  try {
    Utils.showLoading('Cargando productos...');

    // Asegurar caché de categorías para el filtro gravable (D36)
    if (!State.getCache('categorias')) {
      try {
        State.setCache('categorias', await API.categorias.listar());
      } catch (e) { /* sin categorías */ }
    }

    let productos = await API.productos.listar();

    // Aplicar filtros según origen
    if (config.origen === 'compra') {
      productos = productos.filter(p => p.activo && p.tipo === 'simple');
    } else if (config.origen === 'receta') {
      // D5: solo productos a granel o compuestos elaborados pueden ser ingredientes
      productos = productos.filter(p => p.activo &&
        ((p.tipo === 'simple' && p.sub_tipo === 'granel') ||
          (p.tipo === 'compuesto' && p.sub_tipo === 'elaborado')));
      if (config.productoYaSeleccionado) {
        productos = productos.filter(p => p.id != config.productoYaSeleccionado);
      }
    }

    // D36: si ya hay un primer producto (compra o receta), restringir el selector
    // a productos del MISMO estado fiscal (gravable / no gravable).
    if (config.gravableRequerido !== undefined && config.gravableRequerido !== null) {
      const requerido = Number(config.gravableRequerido);
      productos = productos.filter(p => (SelectorProductos._esGravable(p) ? 1 : 0) === requerido);
    }

    const layout = SelectorProductos.renderLayout(productos, config);
    $('#app').html(layout);

    SelectorProductos.bindEvents(productos, config);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

SelectorProductos.renderLayout = function (productos, config) {
  const user = State.getUser();

  return `
    <div class="app-wrapper">
      <nav class="sidebar bg-dark text-white p-3" id="sidebar">
        <h4 class="text-white mb-4"><i class="fas fa-store me-2"></i>POS Admin</h4>
        <div class="nav flex-column">
          <a class="nav-link text-white-50" href="#dashboard"><i class="fas fa-tachometer-alt me-2"></i>Dashboard</a>
          <a class="nav-link text-white-50" href="#compras"><i class="fas fa-shopping-cart me-2"></i>Compras</a>
          <a class="nav-link text-white-50" href="#productos"><i class="fas fa-box me-2"></i>Productos</a>
          <hr class="bg-secondary my-3">
          <a class="nav-link text-danger" href="#" id="btnLogout"><i class="fas fa-sign-out-alt me-2"></i>Cerrar Sesión</a>
        </div>
      </nav>
      <main class="main-content">
        <nav class="navbar navbar-light bg-white border-bottom px-3">
          <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
          <div class="d-flex align-items-center ms-auto">
            <span class="me-3"><i class="fas fa-user me-1"></i>${user?.nombre_completo || 'Admin'}</span>
          </div>
        </nav>
        
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Volver</a></li>
              <li class="breadcrumb-item active">${config.titulo}</li>
            </ol>
          </nav>
          
          <div class="d-flex align-items-center mb-4">
            <button class="btn btn-outline-secondary me-3" id="btnVolver">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </button>
            <h2 class="mb-0"><i class="fas fa-box me-2"></i>${config.titulo}</h2>
            ${config.origen === 'compra' ? `
              <button class="btn btn-outline-primary ms-auto" id="btnNuevoProducto">
                <i class="fas fa-plus me-1"></i>Nuevo Producto
              </button>
            ` : ''}
          </div>
          
          <div class="row mb-3">
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="fas fa-search"></i></span>
                <input type="text" class="form-control" id="buscarProducto" placeholder="Buscar...">
              </div>
            </div>
            <div class="col-md-6 text-end">
              <span class="text-muted">${productos.length} productos</span>
            </div>
          </div>

          ${config.gravableRequerido !== undefined && config.gravableRequerido !== null ? `
            <div class="alert alert-${config.gravableRequerido == 1 ? 'success' : 'secondary'} py-2 mb-3">
              <i class="fas fa-${config.gravableRequerido == 1 ? 'eye' : 'eye-slash'} me-1"></i>
              Solo se muestran productos <strong>${config.gravableRequerido == 1 ? 'gravables' : 'no gravables'}</strong> (mismo grupo fiscal que el primer producto elegido).
            </div>
          ` : ''}
          
          <div class="row g-3" id="productosGrid">
            ${productos.length === 0 ? `
              <div class="col-12">
                <p class="text-muted text-center py-4">No hay productos disponibles</p>
              </div>
            ` : productos.map(p => `
              <div class="col-6 col-md-4 col-lg-3">
                <div class="card h-100 producto-select-card" data-id="${p.id}" 
                     data-nombre="${p.nombre}" data-codigo="${p.codigo}"
                     data-precio="${p.precio_venta || 0}"
                     data-unidad="${p.unidad_venta_nombre || ''}"
                     data-unidad-id="${p.unidad_venta_id}"
                     data-unidad-compra="${p.unidad_compra_nombre || ''}"
                     data-unidad-compra-id="${p.unidad_compra_id || ''}"
                     data-stock="${p.stock_actual || 0}"
                     data-categoria="${p.categoria_id || ''}">
                  <div class="card-body">
                    <div class="d-flex align-items-start mb-2">
                      <div style="width: 50px; height: 50px;" class="me-2 flex-shrink-0">
                        ${p.foto
      ? `<img src="/uploads/productos/${p.foto}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`
      : `<img src="${Utils.getProductPlaceholder(p, p.id, 50)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`
    }
                      </div>
                      <div class="flex-grow-1">
                        <h6 class="mb-0">${p.nombre}</h6>
                        <small class="text-muted">${p.codigo}</small>
                        <div class="mt-1">
                          ${p.tipo === 'compuesto'
      ? '<span class="badge bg-primary">Compuesto</span>'
      : '<span class="badge bg-info">Simple</span>'}
                        </div>
                      </div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                      <div>
                        <small class="text-muted">Stock:</small>
                        <span>${Utils.formatNumber(p.stock_actual, 2)}</span>
                      </div>
                      <button class="btn btn-sm btn-primary seleccionar-producto">
                        <i class="fas fa-plus"></i> Seleccionar
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

SelectorProductos.bindEvents = function (productos, config) {
  $('#btnVolver').on('click', () => ViewManager.volver());
  $('.breadcrumb-back').on('click', (e) => { e.preventDefault(); ViewManager.volver(); });

  if (config.origen === 'compra') {
    $('#btnNuevoProducto').on('click', () => {
      ViewManager.navegar('productos/nuevo', {
        tipo: 'simple',
        origen: 'compra',
        retorno: 'selector-productos',
        retornoParams: config
      });
    });
  }

  $('#buscarProducto').on('input', function () {
    const search = $(this).val().toLowerCase();
    $('.producto-select-card').each(function () {
      const nombre = $(this).data('nombre').toLowerCase();
      const codigo = $(this).data('codigo').toLowerCase();
      $(this).toggle(nombre.includes(search) || codigo.includes(search));
    });
  });

  $('.seleccionar-producto').on('click', function () {
    const card = $(this).closest('.producto-select-card');
    const producto = {
      id: card.data('id'),
      nombre: card.data('nombre'),
      codigo: card.data('codigo'),
      precio: card.data('precio'),
      unidad_venta: card.data('unidad'),
      unidad_venta_id: card.data('unidad-id'),
      unidad_compra: card.data('unidad-compra'),
      unidad_compra_id: card.data('unidad-compra-id'),
      stock: card.data('stock'),
      categoria_id: card.data('categoria') || null
    };

    sessionStorage.setItem('selector-producto-seleccionado', JSON.stringify({
      producto: producto,
      config: config
    }));

    ViewManager.volver();
  });

  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));
  $('#sidebar .nav-link').on('click', (e) => {
    const href = $(e.currentTarget).attr('href');
    if (href && href !== '#') {
      e.preventDefault();
      ViewManager.navegar(href.substring(1), {}, { replace: true });
    }
  });
  $('#btnLogout').on('click', (e) => { e.preventDefault(); App.logout(); });
};

window.SelectorProductos = SelectorProductos;