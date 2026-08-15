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
  return '/img/logo.png';
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
  const logo = Sidebar.logo();

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

  return `
    <nav class="sidebar bg-dark text-white p-2 d-flex flex-column" id="sidebar">
      <div class="text-center mb-1 border-bottom border-secondary pb-1">
        <img src="/img/pb.png" alt="Sistema de Gestion y Punto de Venta" class="img-fluid" style="max-height:70px;object-fit:contain;">
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
      <div class="text-center mb-1 border-bottom border-secondary pb-1">
        <img src="${logo}" alt="${nombreNegocio}" class="img-fluid" style="max-height:150px;object-fit:contain;">
      </div>
    </nav>
  `;
};

window.Sidebar = Sidebar;