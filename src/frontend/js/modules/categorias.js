/**
 * categorias.js - Módulo de gestión de categorías
 */

var Categorias = window.Categorias || {};

Categorias.formulario = async function (params) {
  console.log('📁 Cargando formulario de categoría', params);

  const retorno = params.retorno || 'productos';

  const layout = `
    <div class="app-wrapper">
      <nav class="sidebar bg-dark text-white p-3">
        <h4 class="text-white mb-4">POS Admin</h4>
        <div class="nav flex-column">
          <a class="nav-link text-white-50" href="#dashboard">Dashboard</a>
          <a class="nav-link text-white-50" href="#productos">Productos</a>
          <a class="nav-link text-white-50" href="#configuracion">Configuración</a>
        </div>
      </nav>
      <main class="main-content p-4">
        <div class="container" style="max-width: 600px;">
          <h2 class="mb-4"><i class="fas fa-folder-plus me-2"></i>Nueva Categoría</h2>
          
          <form id="categoriaForm">
            <div class="mb-3">
              <label class="form-label">Nombre <span class="text-danger">*</span></label>
              <input type="text" class="form-control" id="categoriaNombre" required autofocus>
            </div>
            
            <div class="mb-3">
              <label class="form-label">Descripción</label>
              <textarea class="form-control" id="categoriaDescripcion" rows="2"></textarea>
            </div>
            
            <div class="d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-secondary" id="btnCancelarCategoria">
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save me-1"></i>Guardar
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  `;

  $('#app').html(layout);

  // Eventos
  $('#btnCancelarCategoria').on('click', function () {
    ViewManager.navegar(retorno);
  });

  $('#categoriaForm').on('submit', async function (e) {
    e.preventDefault();

    const nombre = $('#categoriaNombre').val().trim();

    if (!nombre) {
      Toast.warning('El nombre es requerido');
      return;
    }

    try {
      Utils.showLoading('Guardando...');

      const result = await API.categorias.crear({
        nombre: nombre,
        descripcion: $('#categoriaDescripcion').val().trim() || null
      });

      State.invalidateCache('categorias');
      sessionStorage.setItem('nuevaCategoriaId', result.id);

      Utils.hideLoading();
      Toast.success('Categoría creada');

      ViewManager.navegar(retorno);

    } catch (error) {
      Utils.hideLoading();
      Toast.error(error.message);
    }
  });
};

window.Categorias = Categorias;