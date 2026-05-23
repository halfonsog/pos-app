var Mantenimiento = window.Mantenimiento || {};

Mantenimiento.index = async function () {
  const user = State.getUser();

  const layout = `
    <div class="app-wrapper">
      ${Sidebar.render('configuracion')}
      <main class="main-content">
        ${Mantenimiento.renderNavbar(user)}
        <div class="container-fluid p-4">
          <h2 class="mb-4"><i class="fas fa-tools me-2"></i>Mantenimiento</h2>
          
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>Precaución:</strong> Estas operaciones son irreversibles. Se registrarán en el log del sistema.
          </div>
          
          <!-- Limpieza General -->
          <div class="card mb-4">
            <div class="card-header"><h5 class="mb-0"><i class="fas fa-broom me-2"></i>Limpieza General</h5></div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <button class="btn btn-outline-danger w-100" id="btnEliminarInactivos">
                    <i class="fas fa-box me-1"></i>Eliminar Productos Inactivos
                  </button>
                </div>
                <div class="col-md-6">
                  <button class="btn btn-outline-danger w-100" id="btnEliminarAnio">
                    <i class="fas fa-calendar me-1"></i>Eliminar Datos de Año Anterior
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Entidades Específicas -->
          <div class="card mb-4">
            <div class="card-header"><h5 class="mb-0"><i class="fas fa-trash me-2"></i>Eliminar Entidad Específica</h5></div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label">Tipo de Entidad</label>
                  <select class="form-select" id="tipoEntidad">
                    <option value="">Seleccione...</option>
                    <option value="producto">Producto</option>
                    <option value="compra">Compra</option>
                    <option value="proveedor">Proveedor</option>
                    <option value="venta">Venta</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">ID de la Entidad</label>
                  <input type="number" class="form-control" id="idEntidad" min="1">
                </div>
                <div class="col-md-4 d-flex align-items-end">
                  <button class="btn btn-outline-danger w-100" id="btnEliminarEntidad" disabled>
                    <i class="fas fa-trash me-1"></i>Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Backup y Restauración -->
          <div class="card mb-4">
            <div class="card-header"><h5 class="mb-0"><i class="fas fa-database me-2"></i>Backup y Restauración</h5></div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <button class="btn btn-outline-primary w-100" id="btnBackup">
                    <i class="fas fa-download me-1"></i>Descargar Backup
                  </button>
                </div>
                <div class="col-md-6">
                  <button class="btn btn-outline-warning w-100" id="btnRestaurar">
                    <i class="fas fa-upload me-1"></i>Restaurar Backup
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Reset Total -->
          <div class="card border-danger">
            <div class="card-header bg-danger bg-opacity-10"><h5 class="mb-0 text-danger"><i class="fas fa-skull me-2"></i>Reset Total</h5></div>
            <div class="card-body">
              <p class="text-danger">Elimina TODOS los datos. Solo mantiene catálogos y configuración.</p>
              <button class="btn btn-danger w-100" id="btnReset">
                <i class="fas fa-radiation me-1"></i>Resetear Base de Datos
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  $('#app').html(layout);
  Mantenimiento.bindEvents();
};

Mantenimiento.bindEvents = function () {
  // Habilitar botón cuando se selecciona tipo e ID
  $('#tipoEntidad, #idEntidad').on('change input', function () {
    const tipo = $('#tipoEntidad').val();
    const id = $('#idEntidad').val();
    $('#btnEliminarEntidad').prop('disabled', !tipo || !id);
  });

  // Eliminar inactivos
  $('#btnEliminarInactivos').on('click', async () => {
    if (!await Utils.confirm('¿Eliminar TODOS los productos inactivos?', '⚠️ Confirmar')) return;
    if (!await Utils.confirm('Esta acción NO se puede deshacer. ¿Está completamente seguro?', '⚠️ Última advertencia')) return;

    try {
      Utils.showLoading('Eliminando...');
      await API.mantenimiento.eliminarInactivos();
      Utils.hideLoading();
      Toast.success('Productos inactivos eliminados');
    } catch (error) {
      Utils.hideLoading();
      console.error(error);
    }
  });

  // Eliminar año anterior
  $('#btnEliminarAnio').on('click', async () => {
    const anio = new Date().getFullYear() - 1;
    if (!await Utils.confirm(`¿Eliminar TODOS los datos del año ${anio}?`, '⚠️ Confirmar')) return;

    try {
      Utils.showLoading('Eliminando...');
      await API.mantenimiento.eliminarAnio(anio);
      Utils.hideLoading();
      Toast.success(`Datos del año ${anio} eliminados`);
    } catch (error) {
      Utils.hideLoading();
      console.error(error);
    }
  });

  // Eliminar entidad específica
  $('#btnEliminarEntidad').on('click', async () => {
    const tipo = $('#tipoEntidad').val();
    const id = $('#idEntidad').val();

    if (!await Utils.confirm(`¿Eliminar ${tipo} #${id} y todas sus dependencias?`, '⚠️ Confirmar')) return;

    try {
      Utils.showLoading('Eliminando...');
      await API.mantenimiento.eliminarEntidad(tipo, id);
      Utils.hideLoading();
      Toast.success(`${tipo} #${id} eliminado`);
    } catch (error) {
      Utils.hideLoading();
      console.error(error);
    }
  });

  // Backup
  $('#btnBackup').on('click', async () => {
    window.open('/api/mantenimiento/backup', '_blank');
  });

  // Restaurar
  $('#btnRestaurar').on('click', async () => {
    if (!await Utils.confirm('¿Restaurar backup? Los datos actuales se PERDERÁN.', '⚠️ Confirmar')) return;

    // Crear input de archivo
    const input = $('<input type="file" accept=".db">');
    input.on('change', async function () {
      const file = this.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('backup', file);

      try {
        Utils.showLoading('Restaurando...');
        await API.mantenimiento.restaurar(formData);
        Utils.hideLoading();
        await Utils.confirm(
          '⚠️ El backup ha sido restaurado correctamente.\n\n' +
          'DEBE REINICIAR EL SERVIDOR AHORA:\n' +
          '1. Cierre la ventana negra (Ctrl+C)\n' +
          '2. Vuelva a ejecutar: npm run dev\n' +
          '3. Recargue esta página\n\n' +
          '¿Entendido?',
          '✅ Backup Restaurado - Acción Requerida'
        );

        // Recargar la página después de confirmar
        location.reload();

      } catch (error) {
        Utils.hideLoading();
        console.error(error);
      }
    });
    input.click();
  });

  // Reset total
  $('#btnReset').on('click', async () => {
    if (!await Utils.confirm('¿ELIMINAR TODOS LOS DATOS?', '⚠️⚠️⚠️ CONFIRMAR')) return;
    if (!await Utils.confirm('ESTO NO SE PUEDE DESHACER. Escriba "ELIMINAR" para confirmar:', '⚠️⚠️⚠️ ÚLTIMA ADVERTENCIA')) return;

    try {
      Utils.showLoading('Reseteando...');
      await API.mantenimiento.reset();
      Utils.hideLoading();
      await Utils.confirm(
        '✅ Base de datos reseteada.\n\n' +
        'Todos los datos han sido eliminados.\n' +
        'Los catálogos y configuración se mantienen.',
        '✅ Reset Completado'
      );

      location.reload();
    } catch (error) {
      Utils.hideLoading();
      console.error(error);
    }
  });

  Mantenimiento.bindCommonEvents();
};

Mantenimiento.renderNavbar = function (user) {
  return `<nav class="navbar navbar-light bg-white border-bottom px-3">
    <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
    <div class="d-flex align-items-center ms-auto">
      <span class="me-3"><i class="fas fa-user me-1"></i>${user?.nombre_completo || 'Admin'}</span>
    </div>
  </nav>`;
};

Mantenimiento.bindCommonEvents = function () {
  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));
  $('#sidebar .nav-link').on('click', function (e) {
    e.preventDefault();
    const href = $(this).attr('href');
    if (href && href !== '#') ViewManager.navegar(href.substring(1), {}, { reset: true });
  });
  $('#btnLogout').on('click', (e) => { e.preventDefault(); App.logout(); });
};

Mantenimiento.logs = async function () {
  try {
    Utils.showLoading('Cargando...');
    const data = await API.mantenimiento.verLogs();
    Utils.hideLoading();

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('configuracion')}
        <main class="main-content">
          ${Mantenimiento.renderNavbar(State.getUser())}
          <div class="container-fluid p-4">
            <h2 class="mb-4"><i class="fas fa-history me-2"></i>Registro de Actividad</h2>
            
            <div class="card">
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table table-sm mb-0">
                    <tbody>
                      ${data.logs.length > 0 ? data.logs.map(l => `
                        <tr><td class="text-muted small">${l}</td></tr>
                      `).join('') : '<tr><td class="text-center text-muted py-3">Sin actividad registrada</td></tr>'}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Mantenimiento.bindCommonEvents();
  } catch (error) {
    Utils.hideLoading();
    console.error(error);
  }
};

window.Mantenimiento = Mantenimiento;