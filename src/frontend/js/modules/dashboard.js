/**
 * dashboard.js - Módulo del dashboard principal
 */

var Dashboard = window.Dashboard || {};

Dashboard.index = async function () {
  console.log('📊 Cargando dashboard');

  try {
    Utils.showLoading('Cargando...');
    const rango = Utils.rangoHoy();
    const datos = await API.dashboard.obtener(rango.inicio, rango.fin);

    Utils.hideLoading();

    const layout = Dashboard.renderLayout(datos);
    $('#app').html(layout);
    Dashboard.bindEvents();
    Dashboard.initCharts(datos);

  } catch (error) {
    Utils.hideLoading();
    console.error('Error cargando dashboard:', error);
    Toast.error('Error al cargar el dashboard');
  }
};

Dashboard.renderLayout = function (d) {
  const user = State.getUser();
  console.log('masVendidos', d.masVendidos);

  return `
    <div class="app-wrapper">
      ${Sidebar.render('dashboard')}
      <main class="main-content">
        <nav class="navbar navbar-light bg-white border-bottom px-3">
          <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
          <div class="d-flex align-items-center ms-auto">
            <span class="me-3"><i class="fas fa-user me-1"></i>${user?.nombre_completo || 'Admin'}</span>
            <span class="text-muted"><i class="fas fa-calendar me-1"></i>${Utils.formatDate(new Date(), 'long')}</span>
          </div>
        </nav>
        
        <div class="container-fluid p-4">
          <h2 class="mb-1">Bienvenido, ${user?.nombre_completo?.split(' ')[0] || 'Admin'} 👋</h2>
          <p class="text-muted mb-4">Resumen del día</p>
          
          <!-- Cards de resumen -->
          <div class="row g-3 mb-4">
            <div class="col-6 col-md-3">
              <div class="summary-card border-primary clickable" data-route="ventas" style="cursor:pointer">
                <div class="summary-content text-center">
                  <h3 class="summary-number text-primary">${Utils.formatMoney(d.ventasHoy?.total || 0, 0)}</h3>
                  <p class="summary-label"><i class="fas fa-dollar-sign me-1"></i>Ventas Hoy</p>
                </div>
                <div class="summary-details"><small>${d.ventasHoy?.total_ventas || 0} ventas</small></div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-card border-warning clickable" data-route="inventario" style="cursor:pointer">
                <div class="summary-content text-center">
                  <h3 class="summary-number text-warning">${d.pendientesInventario || 0}</h3>
                  <p class="summary-label"><i class="fas fa-warehouse me-1"></i>Pendiente Inventario</p>
                </div>
                <div class="summary-details"><small>Alertas de stock por atender</small></div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-card border-info clickable" data-route="ventas/encargos" style="cursor:pointer">
                <div class="summary-content text-center">
                  <h3 class="summary-number text-info">${d.encargosHoy || 0}</h3>
                  <p class="summary-label"><i class="fas fa-bookmark me-1"></i>Encargos Hoy</p>
                </div>
                <div class="summary-details"><small>A entregar hoy</small></div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="summary-card border-${d.impuestos?.pendientes > 0 ? (d.impuestos.dias !== null && d.impuestos.dias <= 5 ? 'danger' : 'warning') : 'success'} clickable" data-route="contabilidad" style="cursor:pointer">
                <div class="summary-content text-center">
                  <h3 class="summary-number text-${d.impuestos?.pendientes > 0 ? (d.impuestos.dias !== null && d.impuestos.dias <= 5 ? 'danger' : 'warning') : 'success'}">${Utils.formatMoney(d.impuestos?.monto || 0, 0)}</h3>
                  <p class="summary-label"><i class="fas fa-file-invoice-dollar me-1"></i>Impuestos</p>
                </div>
                <div class="summary-details"><small>${d.impuestos?.pendientes > 0
                    ? `${d.impuestos.pendientes} pendientes · vence en ${d.impuestos.dias ?? '—'} días`
                    : 'Al día ✓'}</small></div>
              </div>
            </div>
          </div>
          
          <div class="row g-4">
            <!-- Ventas por hora -->
            <div class="col-lg-8">
              <div class="dashboard-card">
                <div class="card-header-custom"><h5><i class="fas fa-chart-line me-2"></i>Ventas por Hora (Hoy)</h5></div>
                <div class="chart-container" style="height:250px">
                  <canvas id="ventasChart"></canvas>
                </div>
              </div>
            </div>
            
            <!-- Más vendidos -->
            <div class="col-lg-4">
              <div class="dashboard-card">
                <div class="card-header-custom"><h5><i class="fas fa-fire me-2"></i>Más Vendidos Hoy</h5></div>
                <div class="top-products-list">
                  ${d.masVendidos && d.masVendidos.length > 0 ? d.masVendidos.map((p, i) => `
                    <div class="top-product-item">
                      <span class="rank">#${i + 1}</span>
                      <div class="product-info">
                        <span class="product-name">${p.nombre}</span>
                      </div>
                      <span class="product-sales">${p.cantidad} ${p.unidad}</span>
                    </div>
                  `).join('') : '<p class="text-muted text-center py-3">Sin ventas hoy</p>'}
                </div>
              </div>
            </div>
          </div>
          
          <div class="row g-4 mt-2">
            <!-- Pendientes -->
            <div class="col-lg-6">
              <div class="dashboard-card">
                <div class="card-header-custom"><h5><i class="fas fa-list-check me-2"></i>Pendientes de Atención</h5></div>
                <div class="pending-list">
                  ${d.sinFichaCosto > 0 ? `
                    <a href="#inventario/stock?filtro=sin-costo" class="pending-card">
                      <div class="pending-icon bg-danger bg-opacity-10 text-danger"><i class="fas fa-calculator"></i></div>
                      <div class="pending-info"><h6>Fichas de costo</h6><p>${d.sinFichaCosto} productos sin configurar</p></div>
                      <i class="fas fa-chevron-right text-muted"></i>
                    </a>` : ''}
                  ${d.comprasPendientesPago > 0 ? `
                    <a href="#compras/listado?filtro=pago-pendiente" class="pending-card">
                      <div class="pending-icon bg-warning bg-opacity-10 text-warning"><i class="fas fa-money-bill"></i></div>
                      <div class="pending-info"><h6>Pagos pendientes</h6><p>${d.comprasPendientesPago} facturas por pagar</p></div>
                      <i class="fas fa-chevron-right text-muted"></i>
                    </a>` : ''}
                  ${d.comprasPendientesStock > 0 ? `
                    <a href="#compras/listado?filtro=stock-pendiente" class="pending-card">
                      <div class="pending-icon bg-info bg-opacity-10 text-info"><i class="fas fa-warehouse"></i></div>
                      <div class="pending-info"><h6>Compras sin stock</h6><p>${d.comprasPendientesStock} pendientes de inventariar</p></div>
                      <i class="fas fa-chevron-right text-muted"></i>
                    </a>` : ''}
                  ${d.stockBajo > 0 ? `
                    <a href="#inventario/stock?filtro=stock-bajo" class="pending-card">
                      <div class="pending-icon bg-danger bg-opacity-10 text-danger"><i class="fas fa-box-open"></i></div>
                      <div class="pending-info"><h6>Stock bajo</h6><p>${d.stockBajo} productos por debajo del mínimo</p></div>
                      <i class="fas fa-chevron-right text-muted"></i>
                    </a>` : ''}
                  ${d.preparacionesPendientes > 0 ? `
                    <a href="#inventario/preparar" class="pending-card">
                      <div class="pending-icon bg-success bg-opacity-10 text-success"><i class="fas fa-flask"></i></div>
                      <div class="pending-info"><h6>Por preparar</h6><p>${d.preparacionesPendientes} elaborados con ingredientes listos</p></div>
                      <i class="fas fa-chevron-right text-muted"></i>
                    </a>` : ''}
                  ${d.bonos?.es_dia && d.bonos.empleados > 0 ? `
                    <a href="#contabilidad" class="pending-card">
                      <div class="pending-icon bg-primary bg-opacity-10 text-primary"><i class="fas fa-hand-holding-usd"></i></div>
                      <div class="pending-info"><h6>Pagar bonos</h6><p>Hoy es día de bonos · ${d.bonos.empleados} empleado(s)</p></div>
                      <i class="fas fa-chevron-right text-muted"></i>
                    </a>` : ''}
                  ${(d.pendientesInventario || 0) + (d.comprasPendientesPago || 0) + (d.sinFichaCosto || 0) === 0 ? '<p class="text-muted text-center py-3">✅ ¡Todo al día!</p>' : ''}
                </div>
              </div>
            </div>
            
            <!-- Pedidos y encargos activos (en vez de últimas actividades) -->
            <div class="col-lg-6">
              <div class="dashboard-card">
                <div class="card-header-custom"><h5><i class="fas fa-file-invoice me-2"></i>Pedidos y Encargos Activos</h5></div>
                <div class="top-products-list">
                  ${d.pedidosActivos && d.pedidosActivos.length > 0 ? d.pedidosActivos.map(p => `
                    <div class="top-product-item clickable" data-route="${p.tipo === 'minorista' ? 'ventas/encargos/' + p.id : 'mayoristas/pedidos/' + p.id}">
                      <div class="product-info">
                        <span class="product-name">
                          <span class="badge bg-${p.tipo === 'minorista' ? 'light text-dark border' : 'warning text-dark'} me-1">${p.tipo === 'minorista' ? 'Encargo' : 'Mayorista'}</span>
                          #${p.id} · ${p.cliente_nombre || '—'}
                        </span>
                        <span class="product-sales">
                          ${Utils.formatMoney(p.total)} · ${p.estado_pago !== 'pagado' ? `<span class="text-danger">debe ${Utils.formatMoney(p.total - p.pagado)}</span>` : 'pagado'}
                          ${p.vencido ? ' · <span class="text-danger fw-bold">VENCIDO</span>' : ''}
                        </span>
                      </div>
                    </div>
                  `).join('') : '<p class="text-muted text-center py-3 mb-0">Sin pedidos activos</p>'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
};

Dashboard.initCharts = function (d) {
  const labels = [];
  const data = [];

  // Llenar todas las horas (8am-20pm)
  for (let h = 8; h <= 20; h++) {
    labels.push(h + ':00');
    const ventaHora = d.ventasPorHora?.find(v => v.hora === h);
    data.push(ventaHora?.total || 0);
  }

  const ctx = document.getElementById('ventasChart')?.getContext('2d');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Ventas ($)',
        data: data,
        backgroundColor: 'rgba(52, 152, 219, 0.6)',
        borderColor: '#3498db',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
};

Dashboard.bindEvents = function () {
  $('[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });

  $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));

  $('#sidebar .nav-link').on('click', function (e) {
    e.preventDefault();
    const href = $(this).attr('href');
    if (href && href !== '#') {
      ViewManager.navegar(href.substring(1), {}, { reset: true });
    }
    if ($(window).width() < 768) $('#sidebar').removeClass('show');
  });

  $('#btnLogout').on('click', (e) => { e.preventDefault(); App.logout(); });
};

window.Dashboard = Dashboard;