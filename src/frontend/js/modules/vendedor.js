var Vendedor = window.Vendedor || {};

// ============================================
// DASHBOARD DEL VENDEDOR
// ============================================
Vendedor.index = async function () {
  console.log('👤 Cargando dashboard del vendedor');

  try {
    Utils.showLoading('Cargando...');
    const turno = await API.ventas.miTurno();
    Utils.hideLoading();

    const layout = Vendedor.renderDashboard(turno);
    $('#app').html(layout);
    Vendedor.bindEvents();

  } catch (error) {
    Utils.hideLoading();
    console.error('Error:', error);
  }
};

Vendedor.renderDashboard = function (t) {
  const user = State.getUser();

  return `
    <div class="app-wrapper">
      ${Vendedor.renderSidebar('inicio')}
      <main class="main-content">
        <nav class="navbar navbar-light bg-white border-bottom px-3">
          <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
          <div class="d-flex align-items-center ms-auto">
            <span class="me-3"><i class="fas fa-user me-1"></i>${user?.nombre_completo || 'Vendedor'}</span>
          </div>
        </nav>
        
        <div class="container-fluid p-4">
          <h2 class="mb-1">Buenos días, ${user?.nombre_completo?.split(' ')[0] || 'Vendedor'} 👋</h2>
          <p class="text-muted mb-4">
            ${t.abierto
      ? '<span class="badge bg-success">🟢 Turno Abierto</span> ' + Vendedor.calcularDuracion(t.turno.abierto_at)
      : '<span class="badge bg-danger">🔴 Sin Turno - Pide al admin que abra turno</span>'}
          </p>
          
          <div class="row g-3 mb-4">
            <div class="col-6">
              <div class="summary-card border-primary">
                <div class="summary-content text-center">
                  <h3 class="summary-number text-primary">${Utils.formatMoney(t.ventas?.total || 0, 0)}</h3>
                  <p class="summary-label"><i class="fas fa-dollar-sign me-1"></i>Ventas del Turno</p>
                </div>
                <div class="summary-details"><small>${t.ventas?.total_ventas || 0} ventas</small></div>
              </div>
            </div>
            <div class="col-6">
              <div class="summary-card border-info">
                <div class="summary-content text-center">
                  <h3 class="summary-number text-info">${t.abierto ? Utils.formatMoney(t.turno.monto_apertura, 0) : '-'}</h3>
                  <p class="summary-label"><i class="fas fa-clock me-1"></i>Apertura</p>
                </div>
                <div class="summary-details"><small>${t.abierto ? 'Turno activo' : 'Sin turno'}</small></div>
              </div>
            </div>
          </div>
          
          <div class="quick-actions-bar mb-4">
            <button class="btn btn-primary btn-lg" data-route="ventas/pos">
              <i class="fas fa-cash-register me-1"></i>Nueva Venta
            </button>
            <button class="btn btn-outline-primary btn-lg" data-route="ventas/listado">
              <i class="fas fa-list me-1"></i>Mis Ventas
            </button>
          </div>
          
          <div class="row g-4">
            <div class="col-lg-6">
              <div class="dashboard-card">
                <div class="card-header-custom"><h5><i class="fas fa-clock me-2"></i>Últimas Ventas</h5></div>
                <div class="activity-list">
                  ${t.ultimasVentas && t.ultimasVentas.length > 0 ? t.ultimasVentas.map(v => `
                    <div class="activity-item">
                      <i class="fas fa-cash-register text-success activity-icon"></i>
                      <div class="activity-content">
                        <span class="activity-text">#${v.id} - ${v.metodo_pago === 'efectivo' ? 'Efectivo' : 'Tarjeta'}</span>
                        <span class="activity-time">${Utils.formatearFecha(Utils.fechaISOToLocal(v.created_at), 'corto')}</span>
                      </div>
                      <span class="activity-amount">${Utils.formatMoney(v.total)}</span>
                    </div>
                  `).join('') : '<p class="text-muted text-center py-3">Sin ventas aún</p>'}
                </div>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="dashboard-card">
                <div class="card-header-custom"><h5><i class="fas fa-fire me-2"></i>Más Vendidos Hoy</h5></div>
                <div class="top-products-list">
                  ${t.masVendidos && t.masVendidos.length > 0 ? t.masVendidos.map((p, i) => `
                    <div class="top-product-item">
                      <span class="rank">#${i + 1}</span>
                      <div class="product-info"><span class="product-name">${p.nombre}</span></div>
                      <span class="product-sales">${p.cantidad} uds</span>
                    </div>
                  `).join('') : '<p class="text-muted text-center py-3">Sin ventas aún</p>'}
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
// CONSULTA DE STOCK
// ============================================
Vendedor.stock = async function () {
  try {
    Utils.showLoading('Cargando...');
    const productos = await API.inventario.stock();
    Utils.hideLoading();

    const layout = `
      <div class="app-wrapper">
        ${Vendedor.renderSidebar('stock')}
        <main class="main-content">
          <nav class="navbar navbar-light bg-white border-bottom px-3">
            <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
            <div class="d-flex align-items-center ms-auto">
              <span class="me-3"><i class="fas fa-user me-1"></i>${State.getUser()?.nombre_completo}</span>
            </div>
          </nav>
          <div class="container-fluid p-4">
            <h2 class="mb-4"><i class="fas fa-boxes me-2"></i>Consulta de Stock</h2>
            
            <div class="mb-3">
              <input type="text" class="form-control" id="buscarStock" placeholder="Buscar producto...">
            </div>
            
            <div class="table-responsive">
              <table class="table table-hover" id="stockTable">
                <thead class="table-light">
                  <tr><th>Producto</th><th class="text-end">Stock</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  ${productos.map(p => `
                    <tr>
                      <td>${p.nombre} <small class="text-muted">${p.codigo}</small></td>
                      <td class="text-end ${p.stock_actual <= p.stock_minimo ? 'text-warning fw-bold' : ''}">
                        ${Utils.formatNumber(p.stock_actual, 2)} ${p.unidad_venta_abrev || ''}
                      </td>
                      <td>${p.stock_actual > 0 ? '<span class="badge bg-success">Disponible</span>' : '<span class="badge bg-danger">Agotado</span>'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);

    $('#buscarStock').on('input', function () {
      const search = $(this).val().toLowerCase();
      $('#stockTable tbody tr').each(function () {
        $(this).toggle($(this).text().toLowerCase().includes(search));
      });
    });

    Vendedor.bindCommonEvents();

  } catch (error) {
    Utils.hideLoading();
    console.error('Error:', error);
  }
};

// ============================================
// MI PERFIL
// ============================================
Vendedor.perfil = async function () {
  const user = State.getUser();

  const layout = `
    <div class="app-wrapper">
      ${Sidebar.render('perfil')}
      <main class="main-content">
        <nav class="navbar navbar-light bg-white border-bottom px-3">
          <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
        </nav>
        <div class="container p-4" style="max-width: 600px;">
          <h2 class="mb-4"><i class="fas fa-user-circle me-2"></i>Mi Perfil</h2>
          
          <div class="card mb-4">
            <div class="card-body">
              <div class="mb-3">
                <label class="text-muted small">Usuario</label>
                <p class="fw-bold">${user.username}</p>
              </div>
              <div class="mb-3">
                <label class="text-muted small">Nombre Completo</label>
                <p>${user.nombre_completo}</p>
              </div>
              <div class="mb-3">
                <label class="text-muted small">Rol</label>
                <p><span class="badge bg-${user.rol === 'admin' ? 'danger' : 'info'}">${user.rol === 'admin' ? 'Administrador' : 'Vendedor'}</span></p>
              </div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-header"><h5 class="mb-0">Cambiar Contraseña</h5></div>
            <div class="card-body">
              <form id="cambioPasswordForm">
                <div class="mb-3">
                  <label class="form-label">Contraseña Actual</label>
                  <input type="password" class="form-control" id="passwordActual" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Nueva Contraseña</label>
                  <input type="password" class="form-control" id="passwordNueva" required minlength="4">
                </div>
                <div class="mb-3">
                  <label class="form-label">Confirmar Nueva Contraseña</label>
                  <input type="password" class="form-control" id="passwordConfirmar" required minlength="4">
                </div>
                <button type="submit" class="btn btn-primary">
                  <i class="fas fa-save me-1"></i>Cambiar Contraseña
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  $('#app').html(layout);

  $('#cambioPasswordForm').on('submit', async function (e) {
    e.preventDefault();
    const actual = $('#passwordActual').val();
    const nueva = $('#passwordNueva').val();
    const confirmar = $('#passwordConfirmar').val();

    if (nueva !== confirmar) { Toast.warning('Las contraseñas no coinciden'); return; }
    if (nueva.length < 4) { Toast.warning('Mínimo 4 caracteres'); return; }

    try {
      Utils.showLoading('Cambiando...');
      await API.auth.cambiarPassword({ actual, nueva });
      Utils.hideLoading();
      Toast.success('Contraseña cambiada correctamente');
      $('#cambioPasswordForm')[0].reset();
    } catch (error) {
      Utils.hideLoading();
      Toast.warning(error.message);
    }
  });

  Vendedor.bindCommonEvents();
};

// ============================================
// MÉTODOS AUXILIARES
// ============================================
Vendedor.renderSidebar = function (active) {
  return `
    <nav class="sidebar bg-dark text-white p-3" id="sidebar">
      <h4 class="text-white mb-4"><i class="fas fa-store me-2"></i>POS Vendedor</h4>
      <div class="nav flex-column">
        <a class="nav-link text-white${active === 'inicio' ? ' active' : '-50'}" href="#vendedor">
          <i class="fas fa-home me-2"></i>Inicio
        </a>
        <a class="nav-link text-white-50" href="#ventas/pos">
          <i class="fas fa-cash-register me-2"></i>Nueva Venta
        </a>
        <a class="nav-link text-white-50" href="#ventas/listado">
          <i class="fas fa-list me-2"></i>Mis Ventas
        </a>
        <a class="nav-link text-white${active === 'stock' ? ' active' : '-50'}" href="#vendedor/stock">
          <i class="fas fa-boxes me-2"></i>Consultar Stock
        </a>
        <hr class="bg-secondary my-3">
        <a class="nav-link text-white${active === 'perfil' ? ' active' : '-50'}" href="#vendedor/perfil">
          <i class="fas fa-user-circle me-2"></i>Mi Perfil
        </a>
        <a class="nav-link text-danger" href="#" id="btnLogout">
          <i class="fas fa-sign-out-alt me-2"></i>Cerrar Sesión
        </a>
      </div>
    </nav>
  `;
};

Vendedor.calcularDuracion = function (desde) {
  const inicio = new Date(desde);
  const ahora = new Date();
  const diff = Math.floor((ahora - inicio) / 1000 / 60);
  const horas = Math.floor(diff / 60);
  const minutos = diff % 60;
  return `${horas}h ${minutos}m`;
};

Vendedor.bindEvents = function () {
  $('[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });
  Vendedor.bindCommonEvents();
};

Vendedor.bindCommonEvents = function () {
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

window.Vendedor = Vendedor;