var Categorias = window.Categorias || {};

Categorias.formulario = async function (params) {
  const retorno = params.retorno || 'productos';
  const id = params.id || null;
  const nombreInicial = params.nombre || '';
  const descripcionInicial = params.descripcion || '';
  const isEdit = !!id;

  const layout = `
    <div class="app-wrapper">
      ${Sidebar.render('productos')}
      <main class="main-content">
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Categorías</a></li>
              <li class="breadcrumb-item active">${isEdit ? 'Editar' : 'Nueva'} Categoría</li>
            </ol>
          </nav>
          
          <div class="d-flex align-items-center mb-4">
            <button class="btn btn-outline-secondary me-3" id="btnVolver">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </button>
            <h2 class="mb-0"><i class="fas fa-folder-plus me-2"></i>${isEdit ? 'Editar' : 'Nueva'} Categoría</h2>
          </div>
          
          <div class="row">
            <div class="col-lg-6">
              <div class="card">
                <div class="card-body">
                  <form id="categoriaForm">
                    ${isEdit ? `<input type="hidden" id="categoriaId" value="${id}">` : ''}
                    <div class="mb-3">
                      <label class="form-label">Nombre <span class="text-danger">*</span></label>
                      <input type="text" class="form-control" id="categoriaNombre" 
                             value="${nombreInicial}" required autofocus>
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Descripción</label>
                      <textarea class="form-control" id="categoriaDescripcion" rows="2">${descripcionInicial}</textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">
                      <i class="fas fa-save me-1"></i>${isEdit ? 'Actualizar' : 'Guardar'} Categoría
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

  $('#app').html(layout);

  // Eventos
  $('#btnVolver').on('click', () => ViewManager.volver());
  $('.breadcrumb-back').on('click', (e) => { e.preventDefault(); ViewManager.volver(); });

  $('#categoriaForm').on('submit', async function (e) {
    e.preventDefault();
    const nombre = $('#categoriaNombre').val().trim();
    if (!nombre) { Toast.warning('Nombre requerido'); return; }

    const data = {
      nombre,
      descripcion: $('#categoriaDescripcion').val().trim() || null
    };

    try {
      Utils.showLoading('Guardando...');

      if (isEdit) {
        await API.categorias.actualizar(id, data);
      } else {
        const result = await API.categorias.crear(data);
        sessionStorage.setItem('nuevaCategoriaId', result.id);
      }

      State.invalidateCache('categorias');
      Utils.hideLoading();
      Toast.success(isEdit ? 'Categoría actualizada' : 'Categoría creada');
      ViewManager.volver();
    } catch (error) {
      Utils.hideLoading();
      console.error(error);
    }
  });

  Categorias.bindCommonEvents();
};

// Listado de categorías (para Configuración)
Categorias.listado = async function () {
  try {
    Utils.showLoading('Cargando...');
    const categorias = await API.categorias.listar();

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('configuracion')}
        <main class="main-content">
          ${Categorias.renderNavbar(State.getUser())}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Configuración</a></li>
                <li class="breadcrumb-item active">Categorías</li>
              </ol>
            </nav>
            
            <div class="d-flex justify-content-between align-items-center mb-4">
              <div class="d-flex align-items-center">
                <button class="btn btn-outline-secondary me-3" id="btnVolver">
                  <i class="fas fa-arrow-left me-1"></i>Volver
                </button>
                <h2 class="mb-0"><i class="fas fa-folder me-2"></i>Categorías</h2>
              </div>
              <button class="btn btn-primary" id="btnNuevaCategoria">
                <i class="fas fa-plus me-1"></i>Nueva Categoría
              </button>
            </div>
            
            <div class="row">
              <div class="col-lg-8">
                <div class="card">
                  <div class="card-body p-0">
                    <table class="table table-hover mb-0">
                      <thead class="table-light">
                        <tr><th>Nombre</th><th>Descripción</th><th class="text-center">Activo</th><th class="text-center">Acciones</th></tr>
                      </thead>
                      <tbody>
                        ${categorias.map(c => `
                          <tr class="${c.activo ? '' : 'text-muted'}">
                            <td>${c.nombre}</td>
                            <td>${c.descripcion || '-'}</td>
                            <td class="text-center">${c.activo ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-secondary">No</span>'}</td>
                            <td class="text-center">
                              <button class="btn btn-sm btn-outline-primary editar-categoria" 
                                data-id="${c.id}" data-nombre="${c.nombre}" data-descripcion="${c.descripcion || ''}">
                                <i class="fas fa-edit"></i>
                              </button>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
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
    Categorias.bindListadoEvents();
    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

Categorias.bindListadoEvents = function () {
  $('#btnVolver').on('click', () => ViewManager.volver());
  $('.breadcrumb-back').on('click', (e) => { e.preventDefault(); ViewManager.volver(); });

  $('#btnNuevaCategoria').on('click', () => {
    ViewManager.navegar('categorias/nuevo', { retorno: 'configuracion/categorias' });
  });

  $('.editar-categoria').on('click', function () {
    const id = $(this).data('id');
    const nombre = $(this).data('nombre');
    const descripcion = $(this).data('descripcion');
    // Abrir formulario de edición (puede ser el mismo que nuevo)
    ViewManager.navegar('categorias/nuevo', {
      retorno: 'configuracion/categorias',
      id, nombre, descripcion
    });
  });

  Categorias.bindCommonEvents();
};

Categorias.bindCommonEvents = function () {
  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));
  $('#sidebar .nav-link').on('click', function (e) {
    e.preventDefault();
    const href = $(this).attr('href');
    if (href && href !== '#') {
      ViewManager.navegar(href.substring(1), {}, { reset: true });
    }
  });
  $('#btnLogout').on('click', (e) => { e.preventDefault(); App.logout(); });
};

Categorias.renderNavbar = function (user) {
  return `
    <nav class="navbar navbar-light bg-white border-bottom px-3">
      <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
      <div class="d-flex align-items-center ms-auto">
        <span class="me-3"><i class="fas fa-user me-1"></i>${user?.nombre_completo || 'Admin'}</span>
      </div>
    </nav>
  `;
};

window.Categorias = Categorias;