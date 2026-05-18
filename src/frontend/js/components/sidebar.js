/**
 * sidebar.js - Componente compartido del menú lateral
 */

var Sidebar = window.Sidebar || {};

Sidebar.render = function (activeModule) {
  const isAdmin = State.isAdmin();

  const adminModules = [
    { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    { id: 'inventario', icon: 'fa-warehouse', label: 'Inventario' },
    { id: 'compras', icon: 'fa-shopping-cart', label: 'Compras' },
    { id: 'ventas', icon: 'fa-cash-register', label: 'Ventas' },
    { id: 'productos', icon: 'fa-box', label: 'Productos' },
    { id: 'proveedores', icon: 'fa-truck', label: 'Proveedores' },
    { id: 'promociones', icon: 'fa-tags', label: 'Promociones' },
    { id: 'reportes', icon: 'fa-chart-bar', label: 'Reportes' },
    { id: 'configuracion', icon: 'fa-cog', label: 'Configuración' }
  ];

  const vendedorModules = [
    { id: 'vendedor', icon: 'fa-home', label: 'Inicio' },
    { id: 'ventas/pos', icon: 'fa-cash-register', label: 'Nueva Venta' },
    { id: 'ventas/listado', icon: 'fa-list', label: 'Mis Ventas' },
    { id: 'vendedor/stock', icon: 'fa-boxes', label: 'Consultar Stock' }
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
    <nav class="sidebar bg-dark text-white p-3" id="sidebar">
      <h4 class="text-white mb-4">
        <i class="fas fa-store me-2"></i>${isAdmin ? 'POS Admin' : 'POS Vendedor'}
      </h4>
      <div class="nav flex-column">
        ${items}
        <hr class="bg-secondary my-3">
        <a class="nav-link text-white-50" href="#vendedor/perfil">
          <i class="fas fa-user-circle me-2"></i>Mi Perfil
        </a>
        <a class="nav-link text-danger" href="#" id="btnLogout">
          <i class="fas fa-sign-out-alt me-2"></i>Cerrar Sesión
        </a>
      </div>
    </nav>
  `;
};

window.Sidebar = Sidebar;