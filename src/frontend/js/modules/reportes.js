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
          
          <ul class="nav nav-tabs mb-4" id="reportesTabs" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active" id="ventas-producto-tab" data-bs-toggle="tab" data-bs-target="#ventas-producto" type="button">
                <i class="fas fa-box me-1"></i>Ventas por Producto
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="tendencia-tab" data-bs-toggle="tab" data-bs-target="#tendencia" type="button">
                <i class="fas fa-chart-line me-1"></i>Tendencia
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="rentabilidad-tab" data-bs-toggle="tab" data-bs-target="#rentabilidad" type="button">
                <i class="fas fa-calculator me-1"></i>Rentabilidad
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="contables-tab" data-bs-toggle="tab" data-bs-target="#contables" type="button">
                <i class="fas fa-file-invoice me-1"></i>Contables
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
            
            <!-- Contables -->
            <div class="tab-pane fade" id="contables">
              <div class="row mb-3">
                <div class="col-md-3">
                  <label class="form-label">Tipo de Reporte</label>
                  <select class="form-select" id="tipoReporte">
                    <option value="todas">Todos</option>
                    <option value="ventas">Ventas</option>
                    <option value="compras">Compras</option>
                    <option value="rentabilidad">Rentabilidad</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <label class="form-label">Mes</label>
                  <select class="form-select" id="mesReporte">
                    <option value="1">Enero</option>
                    <option value="2">Febrero</option>
                    <option value="3">Marzo</option>
                    <option value="4">Abril</option>
                    <option value="5">Mayo</option>
                    <option value="6">Junio</option>
                    <option value="7">Julio</option>
                    <option value="8">Agosto</option>
                    <option value="9">Septiembre</option>
                    <option value="10">Octubre</option>
                    <option value="11">Noviembre</option>
                    <option value="12">Diciembre</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <label class="form-label">Año</label>
                  <select class="form-select" id="anioReporte">
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
                <div class="col-md-2 d-flex align-items-end">
                  <button class="btn btn-primary" id="btnGenerarReporte">
                    <i class="fas fa-play me-1"></i>Generar
                  </button>
                </div>
              </div>
              <div id="reporteContableContenido">
                <p class="text-muted text-center py-4">Seleccione tipo, mes y año</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  $('#app').html(layout);

  const r = Utils.rangoHoy();
  Reportes.cargarVentasPorProducto(r.inicio, r.fin);
  Reportes.bindEvents();
};

Reportes.bindEvents = function () {
  // Filtros Ventas por Producto
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

  // Filtros Tendencia
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

  // Filtros Rentabilidad
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

  // Generar Reporte Contable
  $('#btnGenerarReporte').on('click', async function () {
    const tipo = $('#tipoReporte').val();
    const mes = $('#mesReporte').val();
    const anio = $('#anioReporte').val();

    try {
      Utils.showLoading('Generando...');
      const datos = await API.reportes.contables({ tipo, mes, anio });
      Utils.hideLoading();

      $('#reporteContableContenido').html(Reportes.renderReporteContable(datos, tipo, mes, anio));
    } catch (error) {
      Utils.hideLoading();
      console.error(error);
    }
  });

  // Cargar al cambiar de tab
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

  // Common
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

// ============================================
// Carga de datos
// ============================================

Reportes.cargarVentasPorProducto = async function (inicio, fin) {
  try {
    Utils.showLoading('Cargando...');
    const datos = await API.reportes.ventasPorProducto(inicio, fin);
    Utils.hideLoading();

    let html = '';
    console.log(datos);

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
                  <td class="text-end ${p.margen_pct >= 0 ? '' : 'text-danger'}">${Utils.formatNumber(p.margen_pct, 1)}%</td>
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
          <div class="card-header"><h5 class="mb-0">Top 10 Productos por Ventas Totales ($)</h5></div>
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
  let cantidad_vendida = total_vendido = costo_total = gastos_fijos = ganancia_bruta = 0;
  function calcTotales(d) {
    d.forEach(p => {
      cantidad_vendida += p.cantidad_vendida;
      total_vendido += p.total_vendido;
      costo_total += p.costo_total;
      gastos_fijos += p.gastos_fijos;
      ganancia_bruta += ganancia_bruta;
    });
    return `
      <tr>
        <td><b>Totales</b></td>
        <td class="text-end"></td>
        <td class="text-end">${Utils.formatMoney(total_vendido)}</td>
        <td class="text-end text-danger">${Utils.formatMoney(costo_total)}</td>
        <td class="text-end text-danger">${Utils.formatMoney(gastos_fijos)}</td>
        <td class="text-end ${ganancia_bruta >= 0 ? 'text-success' : 'text-danger'}">${Utils.formatMoney(ganancia_bruta)}</td>
        <td class="text-end></td>
      </tr>`
  }

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
                <th class="text-end">Venta Total</th>
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
                  <td class="text-end ${p.ganancia_bruta >= 0 ? 'text-success' : 'text-danger'}">${Utils.formatMoney(p.ganancia_bruta)}</td>
                  <td class="text-end ${p.margen_pct >= 0 ? '' : 'text-danger'}">${Utils.formatNumber(p.margen_pct, 1)}%</td>
                </tr>
              `).join('')}
              ${calcTotales(datos)}
            </tbody>
          </table>
        </div>
      `;
    }

    $('#rentabilidadContenido').html(html);

  } catch (error) { Utils.hideLoading(); console.error('Error:', error); }
};

// ============================================
// Reportes Contables
// ============================================

Reportes.renderReporteContable = function (datos, tipo, mes, anio) {
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesNombre = meses[mes - 1];

  let html = '';

  // Ventas
  if (datos.ventas) {
    html += `
      <div class="card mb-4 border-primary">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0">💰 VENTAS - ${mesNombre} ${anio}</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <table class="table table-sm">
                <tr><td>Total Ventas:</td><td class="text-end"><strong>${datos.ventas.total_ventas}</strong></td></tr>
                <tr><td>Venta Total (sin ajuste):</td><td class="text-end">${Utils.formatMoney(datos.ventas.venta_total)}</td></tr>
                <tr><td>Impuesto Cobrado:</td><td class="text-end">${Utils.formatMoney(datos.ventas.impuesto_cobrado)}</td></tr>
                <tr><td>Ajuste Redondeo:</td><td class="text-end">${Utils.formatMoney(datos.ventas.ajuste_redondeo)}</td></tr>
                <tr class="fw-bold"><td>Total Cobrado:</td><td class="text-end text-primary">${Utils.formatMoney(datos.ventas.total_cobrado)}</td></tr>
              </table>
            </div>
            <div class="col-md-6">
              <h6>Por método de pago</h6>
              ${datos.ventas.porMetodo.map(v => `
                <div class="d-flex justify-content-between">
                  <span>${v.metodo_pago === 'efectivo' ? '💰 Efectivo' : '💳 Tarjeta'}:</span>
                  <span>${v.cantidad} ventas - ${Utils.formatMoney(v.total)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Compras
  if (datos.compras) {
    html += `
      <div class="card mb-4 border-success">
        <div class="card-header bg-success text-white">
          <h5 class="mb-0">📦 COMPRAS - ${mesNombre} ${anio}</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <table class="table table-sm">
                <tr><td>Total Compras:</td><td class="text-end"><strong>${datos.compras.total_compras}</strong></td></tr>
                <tr><td>Total Comprado:</td><td class="text-end">${Utils.formatMoney(datos.compras.total_comprado)}</td></tr>
                <tr><td>Total Pagado:</td><td class="text-end">${Utils.formatMoney(datos.compras.total_pagado)}</td></tr>
                <tr class="fw-bold"><td>Pendiente Pago:</td><td class="text-end text-danger">${Utils.formatMoney(datos.compras.pendiente_pago)}</td></tr>
              </table>
            </div>
            <div class="col-md-6">
              <h6>Por proveedor</h6>
              ${datos.compras.porProveedor.slice(0, 5).map(c => `
                <div class="d-flex justify-content-between">
                  <span>${c.nombre}:</span>
                  <span>${c.cantidad} - ${Utils.formatMoney(c.total)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Rentabilidad
  if (datos.rentabilidad) {
    const r = datos.rentabilidad;
    html += `
      <div class="card mb-4 border-info">
        <div class="card-header bg-info text-white">
          <h5 class="mb-0">📊 RENTABILIDAD - ${mesNombre} ${anio}</h5>
        </div>
        <div class="card-body">
          <table class="table table-sm">
            <tr class="fw-bold"><td colspan="2">Ingresos</td></tr>
            <tr><td>(+) Venta Total:</td><td class="text-end">${Utils.formatMoney(r.ventaTotal)}</td></tr>
            <tr><td>(-) Impuesto Ventas:</td><td class="text-end text-danger">${Utils.formatMoney(r.impuestoCobrado)}</td></tr>
            <tr class="fw-bold"><td>(=) Venta Neta:</td><td class="text-end">${Utils.formatMoney(r.ventaNeta)}</td></tr>
            
            <tr><td colspan="2"><hr></td></tr>
            <tr class="fw-bold"><td colspan="2">Costos</td></tr>
            <tr><td>(-) Costo de Ventas:</td><td class="text-end text-danger">${Utils.formatMoney(r.costoTotal)}</td></tr>
            <tr><td>(-) Proveedores (compras):</td><td class="text-end text-danger">${Utils.formatMoney(r.proveedores)}</td></tr>
            <tr class="fw-bold"><td>(=) Ganancia Bruta:</td><td class="text-end text-success">${Utils.formatMoney(r.gananciaBruta)}</td></tr>
            
            <tr><td colspan="2"><hr></td></tr>
            <tr class="fw-bold"><td colspan="2">Gastos Operativos</td></tr>
            <tr><td>(-) Gastos Fijos:</td><td class="text-end text-danger">${Utils.formatMoney(r.gastosFijos)}</td></tr>
            <tr><td>(+) Ajuste Redondeo:</td><td class="text-end">${Utils.formatMoney(r.ajusteRedondeo)}</td></tr>
            <tr class="fw-bold"><td>(=) Ganancia Antes de Impuestos:</td><td class="text-end text-primary">${Utils.formatMoney(r.gananciaAntesImpuestos)}</td></tr>
            
            <tr><td colspan="2"><hr></td></tr>
            <tr class="fw-bold"><td colspan="2">Impuestos</td></tr>
            <tr><td>(-) Impuesto a la Ganancia (${r.impuestoGananciaPct}%):</td><td class="text-end text-danger">${Utils.formatMoney(r.impuestoGanancia)}</td></tr>
            <tr class="fw-bold"><td>(=) Ganancia Neta:</td><td class="text-end text-success fs-5">${Utils.formatMoney(r.gananciaNeta)}</td></tr>
            
            <tr><td colspan="2"><hr></td></tr>
            <tr><td>Margen Neto:</td><td class="text-end">${r.margen.toFixed(2)}%</td></tr>
          </table>
        </div>
      </div>
    `;
  }

  return html;
};

window.Reportes = Reportes;