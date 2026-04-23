/**
 * dashboard.js - Módulo del dashboard principal
 */

var Dashboard = window.Dashboard || {};

Dashboard.index = async function () {
  console.log('📊 Cargando dashboard principal');

  try {
    const stats = await Dashboard.obtenerEstadisticas();
    const layout = Dashboard.renderLayout(stats);

    $('#app').html(layout);

    Dashboard.bindEvents();
    Dashboard.initCharts(stats);

  } catch (error) {
    console.error('Error cargando dashboard:', error);
  }
};

Dashboard.obtenerEstadisticas = async function () {
  // Simular datos - luego vendrán de API
  return {
    pendientes: {
      pagos: 3,
      productosSinCosto: 2,
      comprasSinStock: 1
    },
    ventasHoy: 1250.00,
    stockBajo: 3,
    promocionesActivas: 2,
    productosEnVenta: 45,
    ultimasActividades: [
      { icon: 'fa-shopping-cart', text: 'Compra #123 - Distribuidora El Sol', time: 'Hace 2 horas', amount: '$450.00' },
      { icon: 'fa-cash-register', text: 'Venta #456 - Efectivo', time: 'Hace 1 hora', amount: '$12.50' },
      { icon: 'fa-box', text: 'Producto "Jugo 12oz" stock bajo', time: 'Hace 30 min', amount: 'Quedan 3' },
      { icon: 'fa-truck', text: 'Nuevo proveedor registrado', time: 'Ayer', amount: 'Lácteos del Valle' }
    ],
    ventasPorHora: {
      labels: ['8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm'],
      data: [120, 250, 380, 420, 350, 280, 150]
    },
    productosTop: [
      { nombre: 'Jugo de Mango 12oz', ventas: 45, total: 112.50 },
      { nombre: 'Café Americano 12oz', ventas: 38, total: 68.40 },
      { nombre: 'Batido de Fresa 12oz', ventas: 25, total: 75.00 },
      { nombre: 'Vaso 12oz', ventas: 120, total: 60.00 }
    ]
  };
};

Dashboard.renderLayout = function (stats) {
  const user = State.getUser();
  const totalPendientes = stats.pendientes.pagos + stats.pendientes.productosSinCosto + stats.pendientes.comprasSinStock;

  return `
    <div class="app-wrapper">
      ${Sidebar.render('dashboard')}
      <main class="main-content">
        ${Dashboard.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="fas fa-tachometer-alt me-2"></i>Dashboard</h2>
            <span class="text-muted">${Utils.formatDate(new Date(), 'long')}</span>
          </div>
          
          <!-- Cards de Resumen -->
          <div class="row g-4 mb-4">
            <div class="col-6 col-md-3">
              <div class="summary-card border-warning">
                <div class="summary-content text-center">
                  <h3 class="summary-number">${totalPendientes}</h3>
                  <p class="summary-label">
                    <i class="fas fa-exclamation-triangle me-1"></i>Pendientes
                  </p>
                </div>
                <div class="summary-details">
                  <small>${stats.pendientes.pagos} pagos • ${stats.pendientes.productosSinCosto} sin costo</small>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-card border-success">
                <div class="summary-content text-center">
                  <h3 class="summary-number">${Utils.formatMoney(stats.ventasHoy)}</h3>
                  <p class="summary-label">
                    <i class="fas fa-dollar-sign me-1"></i>Ventas Hoy
                  </p>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-card border-danger">
                <div class="summary-content text-center">
                  <h3 class="summary-number">${stats.stockBajo}</h3>
                  <p class="summary-label">
                    <i class="fas fa-box me-1"></i>Stock Bajo
                  </p>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-card border-info">
                <div class="summary-content text-center">
                  <h3 class="summary-number">${stats.promocionesActivas}</h3>
                  <p class="summary-label">
                    <i class="fas fa-tags me-1"></i>Promociones
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Acciones Rápidas -->
          <div class="quick-actions-bar mb-4">
            <button class="btn btn-primary" data-route="ventas/nueva">
              <i class="fas fa-cash-register me-2"></i>Nueva Venta
            </button>
            <button class="btn btn-outline-primary" data-route="compras/nueva">
              <i class="fas fa-shopping-cart me-2"></i>Nueva Compra
            </button>
            <button class="btn btn-outline-primary" data-route="inventario/preparacion">
              <i class="fas fa-flask me-2"></i>Preparar Producto
            </button>
            <button class="btn btn-outline-primary" data-route="productos/nuevo">
              <i class="fas fa-plus me-2"></i>Nuevo Producto
            </button>
          </div>
          
          <div class="row g-4">
            <!-- Gráfico de Ventas -->
            <div class="col-lg-8">
              <div class="dashboard-card">
                <div class="card-header-custom">
                  <h5><i class="fas fa-chart-line me-2"></i>Ventas por Hora</h5>
                </div>
                <div class="chart-container">
                  <canvas id="ventasChart"></canvas>
                </div>
              </div>
            </div>
            
            <!-- Productos Más Vendidos -->
            <div class="col-lg-4">
              <div class="dashboard-card">
                <div class="card-header-custom">
                  <h5><i class="fas fa-fire me-2"></i>Más Vendidos Hoy</h5>
                </div>
                <div class="top-products-list">
                  ${stats.productosTop.map((p, i) => `
                    <div class="top-product-item">
                      <span class="rank">#${i + 1}</span>
                      <div class="product-info">
                        <span class="product-name">${p.nombre}</span>
                        <span class="product-sales">${p.ventas} uds</span>
                      </div>
                      <span class="product-total">${Utils.formatMoney(p.total)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
          
          <div class="row g-4 mt-2">
            <!-- Últimas Actividades -->
            <div class="col-lg-6">
              <div class="dashboard-card">
                <div class="card-header-custom">
                  <h5><i class="fas fa-clock me-2"></i>Últimas Actividades</h5>
                </div>
                <div class="activity-list">
                  ${stats.ultimasActividades.map(a => `
                    <div class="activity-item">
                      <i class="fas ${a.icon} activity-icon"></i>
                      <div class="activity-content">
                        <span class="activity-text">${a.text}</span>
                        <span class="activity-time">${a.time}</span>
                      </div>
                      <span class="activity-amount">${a.amount}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
            
            <!-- Pendientes -->
            <div class="col-lg-6">
              <div class="dashboard-card">
                <div class="card-header-custom">
                  <h5><i class="fas fa-list-check me-2"></i>Pendientes de Atención</h5>
                </div>
                <div class="pending-list">
                  ${stats.pendientes.pagos > 0 ? `
                    <a href="#compras?filtro=pagos-pendientes" class="pending-card">
                      <div class="pending-icon bg-warning bg-opacity-10 text-warning">
                        <i class="fas fa-money-bill"></i>
                      </div>
                      <div class="pending-info">
                        <h6>Pagos pendientes</h6>
                        <p>${stats.pendientes.pagos} facturas por pagar</p>
                      </div>
                      <i class="fas fa-chevron-right text-muted"></i>
                    </a>
                  ` : ''}
                  
                  ${stats.pendientes.productosSinCosto > 0 ? `
                    <a href="#productos?filtro=sin-costo" class="pending-card">
                      <div class="pending-icon bg-danger bg-opacity-10 text-danger">
                        <i class="fas fa-calculator"></i>
                      </div>
                      <div class="pending-info">
                        <h6>Fichas de costo</h6>
                        <p>${stats.pendientes.productosSinCosto} productos sin configurar</p>
                      </div>
                      <i class="fas fa-chevron-right text-muted"></i>
                    </a>
                  ` : ''}
                  
                  ${stats.pendientes.comprasSinStock > 0 ? `
                    <a href="#compras?filtro=sin-stock" class="pending-card">
                      <div class="pending-icon bg-info bg-opacity-10 text-info">
                        <i class="fas fa-warehouse"></i>
                      </div>
                      <div class="pending-info">
                        <h6>Compras sin stock</h6>
                        <p>${stats.pendientes.comprasSinStock} compras pendientes de inventariar</p>
                      </div>
                      <i class="fas fa-chevron-right text-muted"></i>
                    </a>
                  ` : ''}
                  
                  ${totalPendientes === 0 ? `
                    <div class="text-center py-4 text-muted">
                      <i class="fas fa-check-circle fa-2x mb-2 text-success"></i>
                      <p>¡No hay pendientes! Todo al día</p>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
};

Dashboard.renderNavbar = function (user) {
  return `
    <nav class="navbar navbar-light bg-white border-bottom px-3">
      <button class="btn btn-link d-md-none" id="toggleSidebar">
        <i class="fas fa-bars"></i>
      </button>
      <div class="d-flex align-items-center ms-auto">
        <span class="me-3">
          <i class="fas fa-user me-1"></i>${user?.nombre_completo || 'Admin'}
        </span>
        <div class="dropdown">
          <button class="btn btn-link dropdown-toggle" data-bs-toggle="dropdown">
            <i class="fas fa-bell"></i>
            <span class="badge bg-danger notification-badge">3</span>
          </button>
          <div class="dropdown-menu dropdown-menu-end">
            <h6 class="dropdown-header">Notificaciones</h6>
            <a class="dropdown-item" href="#">Stock bajo: Jugo 12oz</a>
            <a class="dropdown-item" href="#">Pago vence mañana</a>
            <a class="dropdown-item" href="#">Compra sin inventariar</a>
          </div>
        </div>
      </div>
    </nav>
  `;
};

Dashboard.initCharts = function (stats) {
  const ctx = document.getElementById('ventasChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: stats.ventasPorHora.labels,
      datasets: [{
        label: 'Ventas ($)',
        data: stats.ventasPorHora.data,
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      }
    }
  });
};

Dashboard.bindEvents = function () {
  $('[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });

  $('#toggleSidebar').on('click', function () {
    $('#sidebar').toggleClass('show');
  });

  $('#sidebar .nav-link').on('click', function (e) {
    const href = $(this).attr('href');
    if (href && href !== '#') {
      e.preventDefault();
      ViewManager.navegar(href.substring(1));
    }
    if ($(window).width() < 768) {
      $('#sidebar').removeClass('show');
    }
  });

  $('#btnLogout').on('click', function (e) {
    e.preventDefault();
    App.logout();
  });
};

window.Dashboard = Dashboard;