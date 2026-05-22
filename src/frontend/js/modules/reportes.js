var Reportes = window.Reportes || {};

Reportes.index = async function () {
  console.log('📊 Cargando reportes');

  const user = State.getUser();

  const layout = `
    <div class="app-wrapper">
      ${Sidebar.render('reportes')}
      <main class="main-content">
        <nav class="navbar navbar-light bg-white border-bottom px-3">
          <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
          <div class="d-flex align-items-center ms-auto">
            <span class="me-3"><i class="fas fa-user me-1"></i>${user?.nombre_completo || 'Admin'}</span>
          </div>
        </nav>
        
        <div class="container-fluid p-4">
          <h2 class="mb-4"><i class="fas fa-chart-bar me-2"></i>Reportes</h2>
          
          <!-- Tabs -->
          <ul class="nav nav-tabs mb-4" id="reportesTabs" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active" id="ventas-producto-tab" data-bs-toggle="tab" 
                      data-bs-target="#ventas-producto" type="button">
                <i class="fas fa-box me-1"></i>Ventas por Producto
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="tendencia-tab" data-bs-toggle="tab" 
                      data-bs-target="#tendencia" type="button">
                <i class="fas fa-chart-line me-1"></i>Tendencia
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="rentabilidad-tab" data-bs-toggle="tab" 
                      data-bs-target="#rentabilidad" type="button">
                <i class="fas fa-calculator me-1"></i>Rentabilidad
              </button>
            </li>
          </ul>
          
          <div class="tab-content">
            <!-- Ventas por Producto -->
            <div class="tab-pane fade show active" id="ventas-producto">
              <div class="mb-3">
                <div class="btn-group">
                  <button class="btn btn-outline-primary btn-sm active" data-filtro="hoy">Hoy</button>
                  <button class="btn btn-outline-primary btn-sm" data-filtro="semana">Esta Semana</button>
                  <button class="btn btn-outline-primary btn-sm" data-filtro="mes">Este Mes</button>
                  <button class="btn btn-outline-primary btn-sm" data-filtro="personalizado">📅</button>
                </div>
              </div>
              <div id="rangoPersonalizado" class="row g-2 mb-3 d-none">
                <div class="col-auto"><input type="date" class="form-control form-control-sm" id="fechaDesde"></div>
                <div class="col-auto"><input type="date" class="form-control form-control-sm" id="fechaHasta"></div>
                <div class="col-auto"><button class="btn btn-primary btn-sm" id="btnAplicarRango">Aplicar</button></div>
              </div>
              <div id="ventasProductoContenido">
                <p class="text-muted text-center py-4">Cargando...</p>
              </div>
            </div>
            
            <!-- Tendencia -->
            <div class="tab-pane fade" id="tendencia">
              <div class="mb-3">
                <div class="btn-group">
                  <button class="btn btn-outline-primary btn-sm active" data-filtro-tendencia="mes">Este Mes</button>
                  <button class="btn btn-outline-primary btn-sm" data-filtro-tendencia="anio">Este Año</button>
                </div>
              </div>
              <div id="tendenciaContenido">
                <p class="text-muted text-center py-4">Cargando...</p>
              </div>
            </div>
            
            <!-- Rentabilidad -->
            <div class="tab-pane fade" id="rentabilidad">
              <div class="mb-3">
                <div class="btn-group">
                  <button class="btn btn-outline-primary btn-sm active" data-filtro-rentabilidad="semana">Esta Semana</button>
                  <button class="btn btn-outline-primary btn-sm" data-filtro-rentabilidad="mes">Este Mes</button>
                </div>
              </div>
              <div id="rentabilidadContenido">
                <p class="text-muted text-center py-4">Cargando...</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  $('#app').html(layout);

  // Cargar Ventas por Producto (Hoy) por defecto
  const r = Utils.rangoHoy();
  Reportes.cargarVentasPorProducto(r.inicio, r.fin);

  Reportes.bindEvents();
};

Reportes.bindEvents = function () {
  // ============================================
  // Filtros Ventas por Producto
  // ============================================
  $('[data-filtro]').on('click', function () {
    $('[data-filtro]').removeClass('active');
    $(this).addClass('active');

    const filtro = $(this).data('filtro');

    if (filtro === 'personalizado') {
      $('#rangoPersonalizado').removeClass('d-none');
      return;
    }

    $('#rangoPersonalizado').addClass('d-none');

    let inicio, fin;
    switch (filtro) {
      case 'hoy':
        const r = Utils.rangoHoy();
        inicio = r.inicio; fin = r.fin;
        break;
      case 'semana':
        const hoy = new Date();
        const diaSemana = hoy.getDay();
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        inicio = Utils.rangoDia(lunes).inicio;
        fin = Utils.rangoDia(domingo).fin;
        break;
      case 'mes':
        const rm = Utils.mesActual();
        inicio = rm.inicio; fin = rm.fin;
        break;
    }

    Reportes.cargarVentasPorProducto(inicio, fin);
  });

  $('#btnAplicarRango').on('click', function () {
    const desde = $('#fechaDesde').val();
    const hasta = $('#fechaHasta').val();
    if (desde && hasta) {
      const inicio = new Date(desde + 'T00:00:00').toISOString();
      const fin = new Date(hasta + 'T23:59:59').toISOString();
      Reportes.cargarVentasPorProducto(inicio, fin);
    }
  });

  // ============================================
  // Filtros Tendencia
  // ============================================
  $('[data-filtro-tendencia]').on('click', function () {
    $('[data-filtro-tendencia]').removeClass('active');
    $(this).addClass('active');

    const filtro = $(this).data('filtro-tendencia');
    let inicio, fin, agrupar;

    if (filtro === 'mes') {
      const rm = Utils.mesActual();
      inicio = rm.inicio; fin = rm.fin;
      agrupar = 'dia';
    } else {
      const ra = Utils.anioActual();
      inicio = ra.inicio; fin = ra.fin;
      agrupar = 'mes';
    }

    Reportes.cargarTendencia(inicio, fin, agrupar);
  });

  // ============================================
  // Filtros Rentabilidad
  // ============================================
  $('[data-filtro-rentabilidad]').on('click', function () {
    $('[data-filtro-rentabilidad]').removeClass('active');
    $(this).addClass('active');

    const filtro = $(this).data('filtro-rentabilidad');
    let inicio, fin;

    if (filtro === 'semana') {
      const hoy = new Date();
      const diaSemana = hoy.getDay();
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      inicio = Utils.rangoDia(lunes).inicio;
      fin = Utils.rangoDia(domingo).fin;
    } else {
      const rm = Utils.mesActual();
      inicio = rm.inicio; fin = rm.fin;
    }

    Reportes.cargarRentabilidad(inicio, fin);
  });

  // ============================================
  // Cargar datos al cambiar de tab
  // ============================================
  $('#tendencia-tab').on('shown.bs.tab', function () {
    if ($('#tendenciaContenido').text().includes('Cargando')) {
      const rm = Utils.mesActual();
      Reportes.cargarTendencia(rm.inicio, rm.fin, 'dia');
    }
  });

  $('#rentabilidad-tab').on('shown.bs.tab', function () {
    if ($('#rentabilidadContenido').text().includes('Cargando')) {
      const hoy = new Date();
      const diaSemana = hoy.getDay();
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      Reportes.cargarRentabilidad(Utils.rangoDia(lunes).inicio, Utils.rangoDia(domingo).fin);
    }
  });

  // ============================================
  // Common
  // ============================================
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

Reportes.cargarVentasPorProducto = async function (inicio, fin) {
  try {
    Utils.showLoading('Cargando...');
    const datos = await API.reportes.ventasPorProducto(inicio, fin);
    Utils.hideLoading();

    let html = '';

    if (!datos.productos || datos.productos.length === 0) {
      html = '<p class="text-muted text-center py-4">No hay ventas en este período</p>';
    } else {
      html = `
        <div class="table-responsive mb-4">
          <table class="table table-hover table-sm">
            <thead class="table-light">
              <tr>
                <th>Producto</th>
                <th class="text-end">Cantidad</th>
                <th class="text-end">Venta Total</th>
                <th class="text-end">Costo</th>
                <th class="text-end">Ganancia</th>
                <th class="text-end">Margen</th>
              </tr>
            </thead>
            <tbody>
              ${datos.productos.map(p => `
                <tr>
                  <td>${p.nombre} <small class="text-muted">${p.codigo}</small></td>
                  <td class="text-end">${Utils.formatNumber(p.cantidad_vendida, 2)}</td>
                  <td class="text-end">${Utils.formatMoney(p.total_vendido)}</td>
                  <td class="text-end text-danger">${Utils.formatMoney(p.costo_total)}</td>
                  <td class="text-end ${p.ganancia >= 0 ? 'text-success' : 'text-danger'}">${Utils.formatMoney(p.ganancia)}</td>
                  <td class="text-end ${p.margen_real >= 0 ? '' : 'text-danger'}">${p.margen_real.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot class="table-dark">
              <tr>
                <th>TOTAL</th>
                <th class="text-end">${Utils.formatNumber(datos.totales.cantidad_total, 2)}</th>
                <th class="text-end">${Utils.formatMoney(datos.totales.venta_total)}</th>
                <th class="text-end">${Utils.formatMoney(datos.totales.costo_total)}</th>
                <th class="text-end">${Utils.formatMoney(datos.totales.ganancia_total)}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="card">
          <div class="card-header"><h5 class="mb-0">Top 10 Productos por volumen de venta</h5></div>
          <div class="card-body"><div style="height: 300px;"><canvas id="ventasProductoChart"></canvas></div></div>
        </div>
        <script>
          setTimeout(() => {
            const ctx = document.getElementById('ventasProductoChart')?.getContext('2d');
            if (ctx) {
              new Chart(ctx, {
                type: 'bar',
                data: {
                  labels: ${JSON.stringify(datos.productos.slice(0, 10).map(p => p.nombre))},
                  datasets: [{
                    label: 'Total Vendido',
                    data: ${JSON.stringify(datos.productos.slice(0, 10).map(p => Math.round(p.total_vendido * 100) / 100))},
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    borderColor: '#3498db', borderWidth: 1
                  }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
              });
            }
          }, 100);
        </script>
      `;
    }

    $('#ventasProductoContenido').html(html);

  } catch (error) { Utils.hideLoading(); console.error('Error:', error); }
};

Reportes.cargarTendencia = async function (inicio, fin, agrupar) {
  try {
    Utils.showLoading('Cargando...');
    const datos = await API.reportes.tendencia(inicio, fin, agrupar);
    Utils.hideLoading();

    let html = '';

    if (datos.length === 0) {
      html = '<p class="text-muted text-center py-4">No hay datos en este período</p>';
    } else {
      const labels = datos.map(d => d.periodo);
      const totales = datos.map(d => d.total_vendido);

      html = `
        <div class="card mb-4"><div class="card-body"><div style="height: 300px;"><canvas id="tendenciaChart"></canvas></div></div></div>
        <div class="table-responsive">
          <table class="table table-sm table-hover">
            <thead class="table-light">
              <tr><th>Período</th><th class="text-end">Ventas</th><th class="text-end">Total</th><th class="text-end">Promedio</th></tr>
            </thead>
            <tbody>
              ${datos.map(d => `
                <tr>
                  <td>${d.periodo}</td>
                  <td class="text-end">${d.num_ventas}</td>
                  <td class="text-end">${Utils.formatMoney(d.total_vendido)}</td>
                  <td class="text-end">${Utils.formatMoney(d.total_vendido / d.num_ventas)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <script>
          setTimeout(() => {
            const ctx = document.getElementById('tendenciaChart')?.getContext('2d');
            if (ctx) {
              new Chart(ctx, {
                type: 'line',
                data: {
                  labels: ${JSON.stringify(labels)},
                  datasets: [{ label: 'Total', data: ${JSON.stringify(totales)}, borderColor: '#3498db', backgroundColor: 'rgba(52,152,219,0.1)', tension: 0.3, fill: true }]
                },
                options: { responsive: true, maintainAspectRatio: false }
              });
            }
          }, 100);
        </script>
      `;
    }

    $('#tendenciaContenido').html(html);

  } catch (error) { Utils.hideLoading(); console.error('Error:', error); }
};

Reportes.cargarRentabilidad = async function (inicio, fin) {
  try {
    Utils.showLoading('Cargando...');
    const datos = await API.reportes.rentabilidad(inicio, fin);
    Utils.hideLoading();

    let html = '';

    if (datos.length === 0) {
      html = '<p class="text-muted text-center py-4">No hay ventas en este período</p>';
    } else {
      html = `
        <div class="table-responsive">
          <table class="table table-hover table-sm">
            <thead class="table-light">
              <tr>
                <th>Producto</th>
                <th class="text-end">Cantidad</th>
                <th class="text-end" title="Total facturado en el período">Venta Total</th>
                <th class="text-end">Costo</th>
                <th class="text-end">G. Fijos</th>
                <th class="text-end">Ganancia</th>
                <th class="text-end">Margen</th>
              </tr>
            </thead>
            <tbody>
              ${datos.map(p => `
                <tr>
                  <td>${p.nombre}</td>
                  <td class="text-end">${Utils.formatNumber(p.cantidad_vendida, 2)}</td>
                  <td class="text-end">${Utils.formatMoney(p.total_vendido)}</td>
                  <td class="text-end text-danger">${Utils.formatMoney(p.costo_total)}</td>
                  <td class="text-end text-danger">${Utils.formatMoney(p.gastos_fijos)}</td>
                  <td class="text-end ${p.ganancia_neta >= 0 ? 'text-success' : 'text-danger'}">${Utils.formatMoney(p.ganancia_neta)}</td>
                  <td class="text-end ${p.margen_real >= 0 ? '' : 'text-danger'}">${p.margen_real.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    $('#rentabilidadContenido').html(html);

  } catch (error) { Utils.hideLoading(); console.error('Error:', error); }
};

window.Reportes = Reportes;