/**
 * configuracion.js - Módulo de configuración
 */

var Configuracion = window.Configuracion || {};

Configuracion.index = async function () {
  console.log('⚙️ Cargando configuración');

  try {
    // Obtener datos para las cards (pueden venir de API)
    const stats = await Configuracion.obtenerEstadisticas();

    const layout = DashboardCard.renderLayout({
      title: 'Configuración del Sistema',
      subtitle: 'Gestiona los parámetros y catálogos',
      cards: [
        {
          icon: 'fa-folder',
          title: 'Categorías',
          badge: { value: stats.categorias, class: 'bg-info' },
          stats: [
            { value: stats.categoriasActivas, label: 'Activas' },
            { value: stats.categoriasProductos, label: 'Con productos' }
          ],
          details: `Últimas añadidas: ${stats.ultimasCategorias || 'Ninguna'}`,
          actions: [
            { label: 'Gestionar', route: 'categorias', class: 'btn-primary' }
          ],
          route: 'categorias'
        },
        {
          icon: 'fa-ruler',
          title: 'Unidades de Medida',
          badge: { value: stats.unidades, class: 'bg-success' },
          stats: [
            { value: stats.unidadesVenta, label: 'Venta' },
            { value: stats.unidadesCompra, label: 'Compra' }
          ],
          details: 'Venta: Unidad, Kg, Litro, Vaso | Compra: Saco, Caja',
          actions: [
            { label: 'Gestionar', route: 'unidades', class: 'btn-primary' }
          ],
          route: 'unidades'
        },
        {
          icon: 'fa-credit-card',
          title: 'Términos de Pago',
          badge: { value: stats.terminosPago, class: 'bg-warning' },
          details: `Más usado: ${stats.terminoMasUsado || 'Contado'} (${stats.porcentajeUso || 0}%)`,
          actions: [
            { label: 'Gestionar', route: 'config/terminos', class: 'btn-primary' }
          ],
          route: 'config/terminos'
        },
        {
          icon: 'fa-calculator',
          title: 'Tipos de Gasto',
          badge: { value: stats.tiposGasto, class: 'bg-secondary' },
          details: 'Incluye: Impuestos, Margen mínimo, Gastos fijos, Merma',
          actions: [
            { label: 'Gestionar', route: 'config/gastos', class: 'btn-primary' }
          ],
          route: 'config/gastos'
        },
        {
          icon: 'fa-users',
          title: 'Usuarios / Vendedores',
          badge: { value: stats.usuarios, class: 'bg-primary' },
          stats: [
            { value: stats.usuariosActivos, label: 'Activos' },
            { value: stats.usuariosAdmin, label: 'Admin' }
          ],
          details: `Vendedores activos: ${stats.vendedoresActivos || 0}`,
          actions: [
            { label: 'Gestionar', route: 'config/usuarios', class: 'btn-primary' }
          ],
          route: 'config/usuarios'
        },
        {
          icon: 'fa-cog',
          title: 'Configuración General',
          details: 'Impuestos, apertura de caja, salario mínimo, etc.',
          actions: [
            { label: 'Configurar', route: 'config/general', class: 'btn-primary' }
          ],
          route: 'config/general'
        }
      ],
      quickActions: [
        { icon: 'fa-plus', label: 'Nueva Categoría', route: 'categorias/nuevo', class: 'btn-outline-primary' },
        { icon: 'fa-plus', label: 'Nueva Unidad', route: 'unidades/nuevo', class: 'btn-outline-primary' },
        { icon: 'fa-user-plus', label: 'Nuevo Usuario', route: 'config/usuarios/nuevo', class: 'btn-outline-primary' }
      ]
    });

    $('#app').html(Configuracion.wrapInMainLayout(layout));

    Configuracion.bindEvents();

  } catch (error) {
    console.error('Error cargando configuración:', error);
    Toast.error('Error al cargar la configuración');
  }
};

Configuracion.obtenerEstadisticas = async function () {
  // Por ahora, datos mock (luego vendrán de API)
  return {
    categorias: 7,
    categoriasActivas: 7,
    categoriasProductos: 5,
    ultimasCategorias: 'Bebidas, Snacks, Postres',
    unidades: 11,
    unidadesVenta: 6,
    unidadesCompra: 5,
    terminosPago: 5,
    terminoMasUsado: 'Contado',
    porcentajeUso: 65,
    tiposGasto: 4,
    usuarios: 3,
    usuariosActivos: 3,
    usuariosAdmin: 1,
    vendedoresActivos: 2
  };
};

Configuracion.wrapInMainLayout = function (content) {
  const user = State.getUser();

  return `
        <div class="app-wrapper">
            ${this.renderSidebar()}
            <main class="main-content">
                <nav class="navbar navbar-light bg-white border-bottom px-3">
                    <button class="btn btn-link d-md-none" id="toggleSidebar">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div class="d-flex align-items-center ms-auto">
                        <span class="me-3">
                            <i class="fas fa-user me-1"></i>${user?.nombre_completo || 'Admin'}
                        </span>
                        <button class="btn btn-outline-secondary btn-sm" id="btnLogout">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                </nav>
                <div class="container-fluid p-4">
                    <nav aria-label="breadcrumb" class="mb-3">
                        <ol class="breadcrumb">
                            <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                            <li class="breadcrumb-item active">Configuración</li>
                        </ol>
                    </nav>
                    ${content}
                </div>
            </main>
        </div>
    `;
};

Configuracion.renderSidebar = function () {
  return `
        <nav class="sidebar bg-dark text-white p-3" id="sidebar">
            <h4 class="text-white mb-4">
                <i class="fas fa-store me-2"></i>POS Admin
            </h4>
            <div class="nav flex-column">
                <a class="nav-link text-white-50" href="#dashboard">
                    <i class="fas fa-tachometer-alt me-2"></i>Dashboard
                </a>
                <a class="nav-link text-white-50" href="#inventario">
                    <i class="fas fa-warehouse me-2"></i>Inventario
                </a>
                <a class="nav-link text-white-50" href="#compras">
                    <i class="fas fa-shopping-cart me-2"></i>Compras
                </a>
                <a class="nav-link text-white-50" href="#ventas">
                    <i class="fas fa-cash-register me-2"></i>Ventas
                </a>
                <a class="nav-link text-white-50" href="#productos">
                    <i class="fas fa-box me-2"></i>Productos
                </a>
                <a class="nav-link text-white-50" href="#proveedores">
                    <i class="fas fa-truck me-2"></i>Proveedores
                </a>
                <a class="nav-link text-white-50" href="#promociones">
                    <i class="fas fa-tags me-2"></i>Promociones
                </a>
                <a class="nav-link text-white-50" href="#reportes">
                    <i class="fas fa-chart-bar me-2"></i>Reportes
                </a>
                <a class="nav-link text-white" href="#configuracion">
                    <i class="fas fa-cog me-2"></i>Configuración
                </a>
            </div>
        </nav>
    `;
};

Configuracion.bindEvents = function () {
  // Cards clickeables
  $('.dashboard-card.clickable').on('click', function () {
    const route = $(this).data('route');
    if (route) {
      ViewManager.navegar(route);
    }
  });

  // Quick actions
  $('[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) {
      ViewManager.navegar(route);
    }
  });

  // Toggle sidebar móvil
  $('#toggleSidebar').on('click', function () {
    $('#sidebar').toggleClass('show');
  });

  // Cerrar sidebar al navegar en móvil
  $('#sidebar .nav-link').on('click', function () {
    if ($(window).width() < 768) {
      $('#sidebar').removeClass('show');
    }
  });

  // Logout
  $('#btnLogout').on('click', function (e) {
    e.preventDefault();
    App.logout();
  });
};

window.Configuracion = Configuracion;