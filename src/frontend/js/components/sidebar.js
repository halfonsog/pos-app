/**
 * sidebar.js - Componente compartido del menú lateral
 */

var Sidebar = window.Sidebar || {};

Sidebar.render = function (activeModule) {
  const modules = [
    { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    { id: 'ventas', icon: 'fa-cash-register', label: 'Ventas' },
    { id: 'productos', icon: 'fa-box', label: 'Productos' },
    { id: 'proveedores', icon: 'fa-truck', label: 'Proveedores' },
    { id: 'compras', icon: 'fa-shopping-cart', label: 'Compras' },
    { id: 'inventario', icon: 'fa-warehouse', label: 'Inventario' },
    { id: 'promociones', icon: 'fa-tags', label: 'Promociones' },
    { id: 'reportes', icon: 'fa-chart-bar', label: 'Reportes' },
    { id: 'configuracion', icon: 'fa-cog', label: 'Configuración' }
  ];

  const items = modules.map(m => `
    <a class="nav-link text-white${activeModule === m.id ? ' active' : '-50'}" href="#${m.id}">
      <i class="fas ${m.icon} me-2"></i>${m.label}
    </a>
  `).join('');

  return `
    <nav class="sidebar bg-dark text-white p-3" id="sidebar">
      <h4 class="text-white mb-4">
        <i class="fas fa-store me-2"></i>POS Admin
      </h4>
      <div class="nav flex-column">
        ${items}
        <hr class="bg-secondary my-3">
        <a class="nav-link text-danger" href="#" id="btnLogout">
          <i class="fas fa-sign-out-alt me-2"></i>Cerrar Sesión
        </a>
      </div>
    </nav>
  `;
};

window.Sidebar = Sidebar;