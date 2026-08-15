/**
 * sidebar.js - Componente compartido del menú lateral
 */

var Sidebar = window.Sidebar || {};

// Nombre del negocio (branding) desde la configuración cacheada.
Sidebar.nombreNegocio = function () {
  const config = State.getCache('configuracion') || {};
  return config.nombre_negocio || 'PuntoX';
};

// Logo del negocio (branding) o vacío.
Sidebar.logo = function () {
  const config = State.getCache('configuracion') || {};
  return config.logo || '';
};

// Fragmento para la barra superior: nombre del negocio a la izquierda.
Sidebar.brandNav = function () {
  return `<span class="me-3 fw-bold text-muted"><i class="fas fa-store me-1"></i>${Sidebar.nombreNegocio()}</span>`;
};

Sidebar.render = function (activeModule) {
  const isAdmin = State.isAdmin();

  // Branding: nombre de negocio y logo desde la configuración (cacheada al cargar).
  const config = State.getCache('configuracion') || {};
  const nombreNegocio = config.nombre_negocio || 'PuntoX';
  const logo = config.logo;

  const adminModules = [
    { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    { id: 'proveedores', icon: 'fa-truck', label: 'Proveedores' },
    { id: 'clientes', icon: 'fa-users', label: 'Clientes' },
    { id: 'productos', icon: 'fa-box', label: 'Productos' },
    { id: 'compras', icon: 'fa-shopping-cart', label: 'Compras' },
    { id: 'inventario', icon: 'fa-warehouse', label: 'Inventario' },
    { id: 'ventas', icon: 'fa-cash-register', label: 'Ventas' },
    { id: 'mayoristas', icon: 'fa-handshake', label: 'Mayoristas' },
    { id: 'reportes', icon: 'fa-chart-bar', label: 'Reportes' },
    { id: 'contabilidad', icon: 'fa-calculator', label: 'Contabilidad' },
    { id: 'configuracion', icon: 'fa-cog', label: 'Configuración' },
    { id: 'mantenimiento', icon: 'fa-tools', label: 'Mantenimiento' }
  ];

  const vendedorModules = [
    { id: 'vendedor', icon: 'fa-home', label: 'Inicio' },
    { id: 'ventas/pos', icon: 'fa-cash-register', label: 'Nueva Venta' },
    { id: 'ventas/listado', icon: 'fa-list', label: 'Mis Ventas' },
    { id: 'vendedor/stock', icon: 'fa-boxes', label: 'Consultar Stock' },
    { id: 'clientes', icon: 'fa-users', label: 'Clientes' }
  ];

  const modules = isAdmin ? adminModules : vendedorModules;

  const items = modules.map(m => {
    const isActive = activeModule === m.id || m.id.startsWith(activeModule + '/') || activeModule.startsWith(m.id + '/');
    return `
      <a class="nav-link text-white${isActive ? ' active' : '-50'}" href="#${m.id}">
        <i class="fas ${m.icon} me-2"></i>${m.label}
      </a>
    `;
  }).join('');

  const logoHtml = logo
    ? `<img src="${logo}" alt="${nombreNegocio}" class="img-fluid mb-2" style="max-height:60px;max-width:100%;object-fit:contain;">`
    : `<i class="fas fa-store fa-2x mb-2"></i>`;

  return `
    <nav class="sidebar bg-dark text-white p-3 d-flex flex-column" id="sidebar">
      <div class="text-center mb-4 border-bottom border-secondary pb-3">
        <div class="small text-white-50">Powered by</div>
        <div class="fw-bold fs-4">PuntoX</div>
      </div>
      <div class="nav flex-column">
        ${items}
        <hr class="bg-secondary my-3">
        <a class="manual-link text-white-50" href="/manual/index.html" target="_blank">
          <i class="fas fa-book me-2"></i>Ayuda
        </a>
        <a class="nav-link text-white-50" href="#vendedor/perfil">
          <i class="fas fa-user-circle me-2"></i>Mi Perfil
        </a>
        <a class="nav-link text-danger" href="#" id="btnLogout">
          <i class="fas fa-sign-out-alt me-2"></i>Cerrar Sesión
        </a>
      </div>
      <div class="mt-auto pt-3 text-center border-top border-secondary">
        ${logoHtml}
        <div class="small text-white-50">${nombreNegocio}</div>
      </div>
    </nav>
  `;
};

window.Sidebar = Sidebar;