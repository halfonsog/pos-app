// frontend/js/modules/contabilidad.js
// Versión mínima viable (Sprint 3.5): solo usa endpoints reales del backend.
// Pendiente para el Sprint 4: banco, amortización de inversiones, exportar PDF,
// y el desglose por prioridades del cierre de mes (ver docs/00-pendientes.md #3).
var Contabilidad = window.Contabilidad || {};

Contabilidad.index = async function () {
  console.log('📊 Cargando Contabilidad');

  const user = State.getUser();

  try {
    Utils.showLoading('Cargando...');

    const ahora = new Date();
    const mesActual = ahora.getMonth() + 1;
    const anioActual = ahora.getFullYear();

    const [ventasHoy, ventasMes, gastosFijos, historial] = await Promise.all([
      Contabilidad.obtenerVentasRango(Utils.rangoHoy()),
      Contabilidad.obtenerVentasRango(Utils.rangoMes(mesActual, anioActual)),
      API.configuracion.listarGastos(),
      API.contabilidad.historial().catch(() => ({ data: [] }))
    ]);

    const totalGastosMensuales = gastosFijos.gastos?.reduce((sum, g) => sum + (g.activo ? g.valor_mensual : 0), 0) || 0;
    const diasParaImpuestos = Contabilidad.calcularDiasParaImpuestos();
    const cobertura = totalGastosMensuales > 0 ? Math.min((ventasMes / totalGastosMensuales) * 100, 100) : 100;

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('contabilidad')}
        <main class="main-content">
          <nav class="navbar navbar-light bg-white border-bottom px-3">
            <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
            <div class="d-flex align-items-center ms-auto">
              <span class="me-3"><i class="fas fa-user me-1"></i>${user?.nombre_completo || 'Admin'}</span>
            </div>
          </nav>

          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                <li class="breadcrumb-item active">Contabilidad</li>
              </ol>
            </nav>
            <h2 class="mb-4"><i class="fas fa-calculator me-2"></i>Contabilidad y Finanzas</h2>
            
            <!-- Cards de resumen (mismo look & feel que los demás dashboards) -->
            <div class="row g-3 mb-4">
              <div class="col-6 col-md-3">
                <div class="summary-card border-success clickable" data-route="ventas/listado" style="cursor:pointer">
                  <div class="summary-content text-center">
                    <h3 class="summary-number text-success">${Utils.formatMoney(ventasHoy, 0)}</h3>
                    <p class="summary-label"><i class="fas fa-calendar-day me-1"></i>Ventas hoy</p>
                  </div>
                  <div class="summary-details"><small>${ahora.toLocaleDateString()}</small></div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="summary-card border-primary clickable" data-route="ventas/listado" style="cursor:pointer">
                  <div class="summary-content text-center">
                    <h3 class="summary-number text-primary">${Utils.formatMoney(ventasMes, 0)}</h3>
                    <p class="summary-label"><i class="fas fa-calendar-alt me-1"></i>Ventas del mes</p>
                  </div>
                  <div class="summary-details"><small>${mesActual}/${anioActual}</small></div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="summary-card border-${diasParaImpuestos <= 5 ? 'danger' : diasParaImpuestos <= 10 ? 'warning' : 'secondary'} clickable" data-route="contabilidad" style="cursor:pointer">
                  <div class="summary-content text-center">
                    <h3 class="summary-number text-${diasParaImpuestos <= 5 ? 'danger' : diasParaImpuestos <= 10 ? 'warning' : 'secondary'}">${diasParaImpuestos} días</h3>
                    <p class="summary-label"><i class="fas fa-file-invoice-dollar me-1"></i>Pago de impuestos</p>
                  </div>
                  <div class="summary-details"><small>Vencen día 15 del mes siguiente</small></div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="summary-card border-info clickable" data-route="contabilidad" style="cursor:pointer">
                  <div class="summary-content text-center">
                    <h3 class="summary-number text-info">${cobertura.toFixed(0)}%</h3>
                    <p class="summary-label"><i class="fas fa-chart-pie me-1"></i>Cobertura de gastos</p>
                  </div>
                  <div class="summary-details"><small>Ventas del mes vs gastos fijos (${Utils.formatMoney(totalGastosMensuales)})</small></div>
                </div>
              </div>
            </div>

            <!-- Calcular impuestos -->
            <div class="card mb-4">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-calculator me-2"></i>Calcular Impuestos del Período</h5>
                <div class="d-flex gap-2 align-items-center">
                  <select class="form-select form-select-sm" id="mesImpuesto" style="width:auto">
                    ${[...Array(12)].map((_, i) => `<option value="${i + 1}" ${i + 1 === mesActual ? 'selected' : ''}>${new Date(2000, i, 1).toLocaleString('es', { month: 'long' })}</option>`).join('')}
                  </select>
                  <select class="form-select form-select-sm" id="anioImpuesto" style="width:auto">
                    ${[anioActual - 1, anioActual, anioActual + 1].map(a => `<option value="${a}" ${a === anioActual ? 'selected' : ''}>${a}</option>`).join('')}
                  </select>
                  <button class="btn btn-sm btn-primary" id="btnCalcularImpuestos"><i class="fas fa-play me-1"></i>Calcular</button>
                </div>
              </div>
              <div class="card-body" id="resultadoImpuestos">
                <p class="text-muted mb-0">Selecciona el período y pulsa Calcular. El resultado se guarda como liquidaciones pendientes de pago.</p>
              </div>
            </div>

            <!-- Cierre de mes: desglose por prioridades + aplicación del excedente -->
            <div class="card mb-4">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-layer-group me-2"></i>Cierre de Mes — Desglose por Prioridades</h5>
                <div class="d-flex gap-2">
                  <button class="btn btn-sm btn-outline-primary" id="btnCierreMes"><i class="fas fa-play me-1"></i>Calcular</button>
                  <button class="btn btn-sm btn-success" id="btnCerrarMes"><i class="fas fa-lock me-1"></i>Cerrar mes</button>
                </div>
              </div>
              <div class="card-body" id="resultadoCierreMes">
                <p class="text-muted mb-0">Usa los mismos selectores de período de arriba. Muestra el reparto del recaudado por prioridades y la comparación del % de gastos proyectado vs real. Al <strong>Cerrar mes</strong> se persiste la ficha y el excedente se aplica automáticamente a los vencimientos (inversiones primero, luego préstamos).</p>
              </div>
            </div>

            <!-- Banco -->
            <div class="card mb-4">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-university me-2"></i>Banco</h5>
                <div class="d-flex gap-2">
                  <button class="btn btn-sm btn-success" id="btnDeposito"><i class="fas fa-arrow-down me-1"></i>Depósito</button>
                  <button class="btn btn-sm btn-outline-danger" id="btnRetiro"><i class="fas fa-arrow-up me-1"></i>Retiro</button>
                </div>
              </div>
              <div class="card-body" id="bancoContenido">
                <div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
              </div>
            </div>

            <!-- Servicios (pagos y cobros por servicios) -->
            <div class="card mb-4">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-concierge-bell me-2"></i>Servicios (estiba, transporte...)</h5>
                <div class="d-flex gap-2">
                  <button class="btn btn-sm btn-outline-danger" id="btnNuevoPagoServicio"><i class="fas fa-arrow-up me-1"></i>Pago servicio</button>
                  <button class="btn btn-sm btn-outline-success" id="btnNuevoCobroServicio"><i class="fas fa-arrow-down me-1"></i>Cobro servicio</button>
                </div>
              </div>
              <div class="card-body p-0" id="serviciosContenido">
                <div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
              </div>
            </div>

            <!-- Nóminas y Bonos (pago a trabajadores) -->
            <div class="card mb-4">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-users me-2"></i>Pago a Trabajadores</h5>
                <div class="d-flex gap-2">
                  <button class="btn btn-sm btn-outline-primary" id="btnPagarBonos"><i class="fas fa-hand-holding-usd me-1"></i>Pagar Bonos (semanal)</button>
                  <button class="btn btn-sm btn-primary" id="btnGenerarNominas"><i class="fas fa-plus me-1"></i>Generar Nómina del Mes</button>
                </div>
              </div>
              <div class="card-body p-0" id="nominasContenido">
                <div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
              </div>
            </div>

            <!-- Libro Diario -->
            <div class="card mb-4">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-book me-2"></i>Libro Diario (ventas y gastos por día)</h5>
                <button class="btn btn-sm btn-primary" id="btnLibroDiario"><i class="fas fa-play me-1"></i>Ver</button>
              </div>
              <div class="card-body p-0" id="libroDiarioContenido">
                <p class="text-muted text-center py-3 mb-0">Usa los selectores de período de arriba y pulsa Ver.</p>
              </div>
            </div>

            <!-- Historial de liquidaciones -->
            <div class="card mb-4">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-history me-2"></i>Historial de Liquidaciones</h5>
                <button class="btn btn-sm btn-outline-primary" id="btnRecargarHistorial"><i class="fas fa-sync-alt me-1"></i>Actualizar</button>
              </div>
              <div class="card-body p-0" id="historialContenido">
                ${Contabilidad.renderHistorial(historial.data || [])}
              </div>
            </div>

            <!-- Accesos -->
            <div class="row">
              <div class="col-md-4 mb-2">
                <button class="btn btn-outline-primary w-100" id="btnLiquidacionAnual">
                  <i class="fas fa-file-signature me-1"></i> Liquidación Anual (Declaración Jurada)
                </button>
              </div>
              <div class="col-md-4 mb-2">
                <button class="btn btn-outline-warning w-100" id="btnConfigurarGastos">
                  <i class="fas fa-cog me-1"></i> Gastos Operativos (Configuración)
                </button>
              </div>
              <div class="col-md-4 mb-2">
                <button class="btn btn-outline-secondary w-100" id="btnExportarCSV">
                  <i class="fas fa-file-csv me-1"></i> Exportar liquidaciones (CSV)
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);

    // Eventos
    $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));
    $('#sidebar .nav-link').on('click', function (e) {
      e.preventDefault();
      const href = $(this).attr('href');
      if (href && href !== '#') ViewManager.navegar(href.substring(1), {}, { reset: true });
    });
    $('#btnLogout').on('click', (e) => { e.preventDefault(); App.logout(); });
    $('[data-route]').on('click', function () {
      const route = $(this).data('route');
      if (route) ViewManager.navegar(route, {}, { reset: true });
    });

    $('#btnCalcularImpuestos').on('click', () => Contabilidad.calcularImpuestos());
    $('#btnCierreMes').on('click', () => Contabilidad.calcularCierreMes());
    $('#btnCerrarMes').on('click', () => Contabilidad.cerrarMes());
    $('#btnLiquidacionAnual').on('click', () => Contabilidad.calcularLiquidacionAnual());
    $('#btnRecargarHistorial').on('click', () => Contabilidad.cargarHistorial());
    $('#btnConfigurarGastos').on('click', () => ViewManager.navegar('configuracion/gastos'));
    $('#btnDeposito').on('click', () => Contabilidad.nuevoMovimientoBanco('deposito'));
    $('#btnRetiro').on('click', () => Contabilidad.nuevoMovimientoBanco('retiro'));
    $('#btnNuevoPagoServicio').on('click', () => Contabilidad.nuevoServicio('pago'));
    $('#btnNuevoCobroServicio').on('click', () => Contabilidad.nuevoServicio('cobro'));
    $('#btnGenerarNominas').on('click', () => Contabilidad.generarNominas());
    $('#btnPagarBonos').on('click', () => Contabilidad.pagarBonos());
    $('#btnLibroDiario').on('click', () => Contabilidad.cargarLibroDiario());
    $('#btnExportarCSV').on('click', () => {
      const mes = $('#mesImpuesto').val();
      const anio = $('#anioImpuesto').val();
      window.open(`/api/contabilidad/exportar?mes=${mes}&anio=${anio}`, '_blank');
    });

    Contabilidad.cargarBanco();
    Contabilidad.cargarServicios();
    Contabilidad.cargarNominas();

    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error('Error cargando contabilidad:', error);
    Toast.error('Error al cargar contabilidad');
  }
};

// ── Datos ──

Contabilidad.obtenerVentasRango = async function (rango) {
  try {
    const ventas = await API.ventas.listar({ inicio: rango.inicio, fin: rango.fin, limite: 5000 });
    return (ventas || []).filter(v => v.estado === 'completada').reduce((sum, v) => sum + (v.total || 0), 0);
  } catch (error) {
    console.error('Error obteniendo ventas:', error);
    return 0;
  }
};

Contabilidad.calcularDiasParaImpuestos = function () {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;

  // Fecha límite: día 15 del mes siguiente
  let fechaLimite = new Date(anio, mes, 15);
  if (fechaLimite < hoy) {
    fechaLimite = new Date(anio, mes + 1, 15);
  }

  return Math.ceil((fechaLimite - hoy) / (1000 * 60 * 60 * 24));
};

// ── Calcular impuestos ──

Contabilidad.calcularImpuestos = async function () {
  const mes = $('#mesImpuesto').val();
  const anio = $('#anioImpuesto').val();
  const resultDiv = $('#resultadoImpuestos');

  resultDiv.html('<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Calculando...</div>');

  try {
    const data = await API.contabilidad.calcularImpuestos(parseInt(mes), parseInt(anio));

    if (!data.success) {
      resultDiv.html(`<div class="alert alert-danger mb-0">${data.error}</div>`);
      return;
    }

    let html = `
      <div class="alert alert-success">
        <strong>Período:</strong> ${data.periodo} · 
        <strong>Total Ventas:</strong> ${Utils.formatMoney(data.total_ventas)} · 
        <strong>Empleados:</strong> ${data.empleados_count}
      </div>
      <div class="table-responsive">
        <table class="table table-bordered table-striped mb-0">
          <thead class="table-dark">
            <tr><th>Código</th><th>Concepto</th><th class="text-end">Base Cálculo</th><th class="text-end">Monto a Pagar</th></tr>
          </thead>
          <tbody>
    `;

    if (data.impuestos && data.impuestos.length > 0) {
      data.impuestos.forEach(function (imp) {
        html += `<tr>
          <td>${imp.codigo}</td>
          <td>${imp.nombre}${imp.formula ? `<br><small class="text-muted">${imp.formula}</small>` : ''}</td>
          <td class="text-end">${Utils.formatMoney(imp.base_calculo)}</td>
          <td class="text-end fw-bold text-success">${Utils.formatMoney(imp.monto)}</td>
        </tr>`;
      });
      html += `
          </tbody>
          <tfoot class="table-info">
            <tr><td colspan="3"><strong>TOTAL IMPUESTOS</strong></td>
            <td class="text-end"><strong>${Utils.formatMoney(data.total_impuestos)}</strong></td></tr>
          </tfoot>`;
    } else {
      html += `<tr><td colspan="4" class="text-center text-muted py-3">No hay impuestos para calcular en este período</td></tr></tbody>`;
    }

    html += `</table></div>
      <div class="mt-3">
        <button class="btn btn-outline-primary btn-sm" id="btnIrHistorial">
          <i class="fas fa-history me-1"></i>Ver en el historial de liquidaciones
        </button>
      </div>`;

    resultDiv.html(html);

    $('#btnIrHistorial').on('click', () => {
      Contabilidad.cargarHistorial();
      document.getElementById('historialContenido')?.scrollIntoView({ behavior: 'smooth' });
    });

  } catch (error) {
    console.error('Error:', error);
    resultDiv.html(`<div class="alert alert-danger mb-0">Error al calcular impuestos: ${error.message}</div>`);
  }
};

// ── Cierre de mes (desglose por prioridades) ──

Contabilidad.calcularCierreMes = async function () {
  const mes = $('#mesImpuesto').val();
  const anio = $('#anioImpuesto').val();
  const resultDiv = $('#resultadoCierreMes');

  resultDiv.html('<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Calculando...</div>');

  try {
    // Si el mes ya está cerrado, mostrar su ficha persistida
    const ficha = await API.contabilidad.fichaCierreMes(parseInt(mes), parseInt(anio)).catch(() => null);
    if (ficha && ficha.success) {
      return Contabilidad._renderFichaCierreMes(ficha.data);
    }

    const res = await API.contabilidad.cierreMes(parseInt(mes), parseInt(anio));
    if (!res.success) {
      resultDiv.html(`<div class="alert alert-danger mb-0">${res.error}</div>`);
      return;
    }

    const d = res.data;
    const totalAsignado = d.prioridades.reduce((s, p) => s + p.monto, 0);
    const comp = d.comparacion_gastos;
    const diffGastos = comp.real_pct - comp.proyectado_pct;

    resultDiv.html(`
      <div class="row mb-3">
        <div class="col-12">
          <div class="alert alert-primary d-flex justify-content-around align-items-center mb-0">
            <div class="text-center">
              <small><i class="fas fa-university me-1"></i>Al banco (tarjeta)</small>
              <h4 class="mb-0">${Utils.formatMoney(d.al_banco.tarjeta)}</h4>
              <small>${d.al_banco.pct_tarjeta}% del recaudado</small>
            </div>
            <div class="text-center">
              <small><i class="fas fa-money-bill-wave me-1"></i>En caja (efectivo)</small>
              <h4 class="mb-0">${Utils.formatMoney(d.al_banco.efectivo)}</h4>
              <small>${(100 - d.al_banco.pct_tarjeta).toFixed(2)}% del recaudado</small>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-lg-7">
          <table class="table table-bordered mb-0">
            <thead class="table-dark">
              <tr><th class="text-center">#</th><th>Prioridad</th><th class="text-end">Monto</th><th class="text-end">% del recaudado</th></tr>
            </thead>
            <tbody>
              ${d.prioridades.map(p => `
                <tr>
                  <td class="text-center">${p.orden}</td>
                  <td>${p.concepto}</td>
                  <td class="text-end">${Utils.formatMoney(p.monto)}</td>
                  <td class="text-end">${d.recaudado > 0 ? ((p.monto / d.recaudado) * 100).toFixed(1) : '0.0'}%</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot class="table-info">
              <tr>
                <th colspan="2">Recaudado del período</th>
                <th class="text-end">${Utils.formatMoney(d.recaudado)}</th>
                <th class="text-end">${d.recaudado > 0 ? ((totalAsignado / d.recaudado) * 100).toFixed(1) : '0.0'}%</th>
              </tr>
            </tfoot>
          </table>
          ${d.por_moneda ? `
          <div class="card bg-light mt-3">
            <div class="card-body">
              <h6 class="mb-2"><i class="fas fa-coins me-1"></i>Disponibilidad por moneda del período</h6>
              <div class="row text-center">
                <div class="col-3"><small class="text-muted">CUP efectivo</small><div class="fw-bold text-success">${Utils.formatMoney(d.por_moneda.CUP.efectivo)}</div></div>
                <div class="col-3"><small class="text-muted">CUP banco</small><div class="fw-bold text-primary">${Utils.formatMoney(d.por_moneda.CUP.banco)}</div></div>
                <div class="col-3"><small class="text-muted">USD efectivo</small><div class="fw-bold text-warning">$${Utils.formatNumber(d.por_moneda.USD.efectivo, 2)}</div></div>
                <div class="col-3"><small class="text-muted">USD banco</small><div class="fw-bold text-info">$${Utils.formatNumber(d.por_moneda.USD.banco, 2)}</div></div>
              </div>
              <small class="text-muted d-block mt-2"><i class="fas fa-info-circle me-1"></i>El desglose por prioridades es en CUP; los dólares se contemplan por su equivalente (tasa acordada en cada operación).</small>
            </div>
          </div>` : ''}
        </div>
        <div class="col-lg-5">
          <div class="card bg-light mb-3">
            <div class="card-body">
              <h6><i class="fas fa-users me-1"></i>Pago a trabajadores del período</h6>
              <div class="d-flex justify-content-around text-center my-2">
                <div>
                  <small class="text-muted">Salarios (banco)</small>
                  <h5 class="mb-0">${Utils.formatMoney(d.pago_trabajadores?.salarios || 0, 0)}</h5>
                  <small class="text-muted">${d.pago_trabajadores?.salarios_cantidad || 0} nóminas</small>
                </div>
                <div>
                  <small class="text-muted">Bonos (efectivo)</small>
                  <h5 class="mb-0">${Utils.formatMoney(d.pago_trabajadores?.bonos || 0, 0)}</h5>
                  <small class="text-muted">${d.pago_trabajadores?.bonos_cantidad || 0} pagos</small>
                </div>
                <div>
                  <small class="text-muted">Total</small>
                  <h5 class="mb-0 text-primary">${Utils.formatMoney(d.pago_trabajadores?.total || 0, 0)}</h5>
                </div>
              </div>
            </div>
          </div>
          <div class="card bg-light">
            <div class="card-body">
              <h6><i class="fas fa-balance-scale me-1"></i>% de gastos: proyectado vs real</h6>
              <div class="d-flex justify-content-around text-center my-3">
                <div>
                  <small class="text-muted">Proyectado</small>
                  <h3 class="mb-0">${comp.proyectado_pct}%</h3>
                </div>
                <div>
                  <small class="text-muted">Real del período</small>
                  <h3 class="mb-0 ${diffGastos > 0 ? 'text-danger' : 'text-success'}">${comp.real_pct}%</h3>
                </div>
              </div>
              <p class="text-muted small mb-0">
                ${diffGastos > 0.5
                    ? '⚠️ El % de gastos real supera al proyectado. Considera subir las ventas proyectadas en Configuración si estimas que el volumen real será mayor.'
                    : diffGastos < -0.5
                      ? '✅ El % de gastos real es menor al proyectado (las ventas superan la proyección). Podrías ajustar las ventas proyectadas a la baja si es sostenido.'
                      : '✅ El % de gastos real está alineado con lo proyectado.'}
              </p>
            </div>
          </div>
          <div class="alert alert-info mt-3 mb-0">
            <i class="fas fa-arrow-right me-1"></i>
            Excedente: <strong>${Utils.formatMoney(d.excedente_reajustado)}</strong> → destino: <strong>${d.destino_excedente === 'ganancias' ? 'Ganancias (no se aplica)' : d.destino_excedente}</strong>.<br>
            <small class="text-muted">Pulsa <strong>Cerrar mes</strong> para persistir esta ficha y aplicar el excedente a los vencimientos (inversiones primero, luego préstamos).</small>
          </div>
        </div>
      </div>
    `);
  } catch (error) {
    console.error('Error:', error);
    resultDiv.html(`<div class="alert alert-danger mb-0">Error al calcular el cierre: ${error.message}</div>`);
  }
};

// Cierra el mes: persiste la ficha y aplica el excedente a los vencimientos.
Contabilidad.cerrarMes = async function () {
  const mes = $('#mesImpuesto').val();
  const anio = $('#anioImpuesto').val();
  const resultDiv = $('#resultadoCierreMes');

  const confirmado = await Utils.confirm(
    `¿Cerrar el mes ${mes}/${anio}? Se aplicará el excedente a los vencimientos (inversiones primero, luego préstamos). Esta acción no se puede deshacer.`,
    'Cerrar mes'
  );
  if (!confirmado) return;

  resultDiv.html('<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Cerrando mes...</div>');

  try {
    const res = await API.contabilidad.cerrarMes(parseInt(mes), parseInt(anio));
    if (!res.success) {
      resultDiv.html(`<div class="alert alert-danger mb-0">${res.error}</div>`);
      return;
    }
    Toast.success('Mes cerrado');
    Contabilidad._renderFichaCierreMes(res.data);
  } catch (error) {
    resultDiv.html(`<div class="alert alert-danger mb-0">Error al cerrar el mes: ${error.message}</div>`);
  }
};

// Renderiza la ficha persistida de cierre de mes (con aplicaciones del excedente).
Contabilidad._renderFichaCierreMes = function (data) {
  const ficha = data.ficha;
  const aplicaciones = data.aplicaciones || [];
  const resultDiv = $('#resultadoCierreMes');

  resultDiv.html(`
    <div class="alert alert-success d-flex justify-content-between align-items-center mb-3">
      <div>
        <i class="fas fa-lock me-1"></i>
        <strong>Mes cerrado ${ficha.mes}/${ficha.anio}</strong> — ${new Date(ficha.creado_en).toLocaleString('es')}
      </div>
      <span class="badge bg-success">Excedente aplicado: ${Utils.formatMoney(ficha.excedente_aplicado)}</span>
    </div>
    <div class="row">
      <div class="col-lg-7">
        <table class="table table-bordered mb-3">
          <tbody>
            <tr><td>Recaudado del período</td><td class="text-end">${Utils.formatMoney(ficha.recaudado)}</td></tr>
            <tr><td>Impuestos</td><td class="text-end">− ${Utils.formatMoney(ficha.impuestos)}</td></tr>
            <tr><td>Costo base</td><td class="text-end">− ${Utils.formatMoney(ficha.costo_base)}</td></tr>
            <tr><td>Gastos fijos equivalentes</td><td class="text-end">− ${Utils.formatMoney(ficha.gastos_fijos_equiv)}</td></tr>
            <tr><td>Préstamos equivalentes</td><td class="text-end">− ${Utils.formatMoney(ficha.prestamos_equiv)}</td></tr>
            <tr><td>Inversiones equivalentes</td><td class="text-end">− ${Utils.formatMoney(ficha.inversiones_equiv)}</td></tr>
            <tr class="table-info"><td><strong>Margen</strong></td><td class="text-end"><strong>${Utils.formatMoney(ficha.margen)}</strong></td></tr>
            <tr><td>Ganancias</td><td class="text-end">− ${Utils.formatMoney(ficha.ganancias)}</td></tr>
            <tr class="table-warning"><td><strong>Excedente (destino: ${ficha.destino})</strong></td><td class="text-end"><strong>${Utils.formatMoney(ficha.excedente)}</strong></td></tr>
            <tr class="table-success"><td>Aplicado a vencimientos</td><td class="text-end">${Utils.formatMoney(ficha.excedente_aplicado)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="col-lg-5">
        <div class="card bg-light">
          <div class="card-body">
            <h6><i class="fas fa-hand-holding-usd me-1"></i>Aplicación del excedente</h6>
            ${aplicaciones.length === 0
              ? '<p class="text-muted small mb-0">No se aplicó excedente a vencimientos (no hay registros activos o el excedente fue 0).</p>'
              : `<table class="table table-sm mb-0">
                  <thead><tr><th>Registro</th><th>Tipo</th><th class="text-end">Monto</th></tr></thead>
                  <tbody>
                    ${aplicaciones.map(a => `
                      <tr>
                        <td><small>${a.registro_descripcion || a.descripcion}</small></td>
                        <td><span class="badge bg-${a.tipo_registro === 'inversion' ? 'primary' : 'warning'}">${a.tipo_registro}</span></td>
                        <td class="text-end">${Utils.formatMoney(a.monto_aplicado)}</td>
                      </tr>`).join('')}
                  </tbody>
                </table>`}
          </div>
        </div>
      </div>
    </div>
  `);
};

// ── Liquidación anual (0530222, Declaración Jurada) ──

Contabilidad.calcularLiquidacionAnual = async function () {
  const anio = $('#anioImpuesto').val();
  const resultDiv = $('#resultadoCierreMes');

  resultDiv.html('<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Calculando liquidación anual...</div>');

  try {
    const res = await API.contabilidad.liquidacionAnual(parseInt(anio));
    if (!res.success) {
      resultDiv.html(`<div class="alert alert-danger mb-0">${res.error}</div>`);
      return;
    }
    const d = res.data;

    resultDiv.html(`
      <h6 class="mb-3"><i class="fas fa-file-signature me-1"></i>Liquidación Anual ${res.anio} (0530222 — Declaración Jurada)</h6>
      <div class="row">
        <div class="col-lg-7">
          <table class="table table-bordered mb-0">
            <tbody>
              <tr><td>Ventas netas del año</td><td class="text-end">${Utils.formatMoney(d.ventas_netas)}</td></tr>
              <tr><td>Costo de ventas</td><td class="text-end">− ${Utils.formatMoney(d.costo_ventas)}</td></tr>
              <tr><td>Gastos fijos (${d.meses_con_actividad} meses con actividad)</td><td class="text-end">− ${Utils.formatMoney(d.gastos_fijos)}</td></tr>
              <tr><td>Gasto financiero del año</td><td class="text-end">− ${Utils.formatMoney(d.gasto_financiero)}</td></tr>
              <tr class="table-secondary"><td><strong>Ganancia neta</strong></td><td class="text-end"><strong>${Utils.formatMoney(d.ganancia_neta)}</strong></td></tr>
              <tr><td>Tasa (impuesto sobre la ganancia)</td><td class="text-end">${d.tasa}%</td></tr>
              <tr class="table-warning"><td><strong>Monto a pagar</strong></td><td class="text-end"><strong>${Utils.formatMoney(d.monto)}</strong></td></tr>
              <tr class="table-success"><td>Pagando antes del 28/02 (−5%)</td><td class="text-end"><strong>${Utils.formatMoney(d.monto_con_descuento)}</strong></td></tr>
            </tbody>
          </table>
        </div>
        <div class="col-lg-5">
          <div class="alert alert-info mb-0">
            <i class="fas fa-info-circle me-1"></i>${d.descuento_nota}
            <hr>
            <small>Fecha límite: <strong>${d.fecha_limite}</strong>. La liquidación queda registrada como pendiente en el historial.</small>
          </div>
        </div>
      </div>
    `);
  } catch (error) {
    console.error('Error:', error);
    resultDiv.html(`<div class="alert alert-danger mb-0">Error al calcular la liquidación anual: ${error.message}</div>`);
  }
};

// ── Banco ──

Contabilidad.cargarBanco = async function () {
  const container = $('#bancoContenido');
  try {
    const res = await API.contabilidad.banco();
    const d = res.data;

    const tipoBadge = {
      deposito: '<span class="badge bg-success">Depósito</span>',
      retiro: '<span class="badge bg-danger">Retiro</span>',
      compra_transferencia: '<span class="badge bg-warning text-dark">Compra (transf.)</span>',
      pago_impuesto: '<span class="badge bg-info">Pago impuesto</span>',
      cambio_divisas: '<span class="badge bg-primary">Cambio $</span>'
    };

    const filas = (d.movimientos || []).slice(0, 15).map(m => `
      <tr>
        <td>${Utils.formatearFecha(Utils.fechaISOToLocal(m.fecha), 'fecha')}</td>
        <td>${tipoBadge[m.tipo] || m.tipo}</td>
        <td>${m.descripcion || '—'}</td>
        <td>${m.cuenta || 'banco'}</td>
        <td>${m.moneda || 'CUP'}</td>
        <td class="text-end ${m.monto >= 0 ? 'text-success' : 'text-danger'}">
          ${m.monto >= 0 ? '+' : '−'}${m.moneda === 'USD' ? '$' : ''}${Utils.formatMoney(Math.abs(m.monto))}
        </td>
      </tr>
    `).join('');

    container.html(`
      <div class="row mb-3">
        <div class="col-md-3"><div class="text-center p-2 bg-primary text-white rounded"><small>Efectivo CUP</small><h4 class="mb-0">${Utils.formatMoney(d.saldos.CUP.efectivo)}</h4></div></div>
        <div class="col-md-3"><div class="text-center p-2 bg-info text-white rounded"><small>Banco CUP</small><h4 class="mb-0">${Utils.formatMoney(d.saldos.CUP.banco)}</h4></div></div>
        <div class="col-md-3"><div class="text-center p-2 bg-success text-white rounded"><small>Efectivo USD</small><h4 class="mb-0">$${Utils.formatNumber(d.saldos.USD.efectivo, 2)}</h4></div></div>
        <div class="col-md-3"><div class="text-center p-2 bg-success-subtle text-success-emphasis rounded border border-success"><small>Banco USD</small><h4 class="mb-0">$${Utils.formatNumber(d.saldos.USD.banco, 2)}</h4></div></div>
      </div>
      <div class="alert alert-secondary d-flex justify-content-between align-items-center">
        <span><i class="fas fa-equals me-1"></i><strong>Total equivalente (CUP):</strong> ${Utils.formatMoney(d.total_equivalente_cup)}</span>
        <span class="small">${d.ultima_tasa_usd > 0 ? `Última tasa usada: ${d.ultima_tasa_usd}` : 'Sin operaciones en USD aún'}</span>
        <button class="btn btn-sm btn-outline-primary" id="btnCambioDivisas"><i class="fas fa-exchange-alt me-1"></i>Cambio de divisas</button>
      </div>
      <h6 class="text-muted">Últimos movimientos</h6>
      <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
        <table class="table table-sm table-hover mb-0">
          <thead class="table-light"><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Cuenta</th><th>Moneda</th><th class="text-end">Monto</th></tr></thead>
          <tbody>${filas || '<tr><td colspan="6" class="text-center text-muted py-3">Sin movimientos aún</td></tr>'}</tbody>
        </table>
      </div>
    `);

    $('#btnCambioDivisas').on('click', () => Contabilidad.nuevoCambioDivisas());
  } catch (error) {
    container.html(`<div class="alert alert-danger mb-0">Error al cargar el banco: ${error.message}</div>`);
  }
};

Contabilidad.nuevoMovimientoBanco = function (tipo) {
  const esDeposito = tipo === 'deposito';
  FormModal.show({
    title: esDeposito ? 'Depósito (efectivo de caja → banco)' : 'Retiro (banco → efectivo de caja)',
    submitLabel: esDeposito ? 'Registrar depósito' : 'Registrar retiro',
    fields: [
      { id: 'monto', label: 'Monto', type: 'number', min: 0.01, step: 0.01, required: true },
      { id: 'descripcion', label: 'Descripción (opcional)', type: 'text' }
    ],
    onSubmit: async (v) => {
      try {
        await API.contabilidad.bancoMovimiento({ tipo, monto: v.monto, descripcion: v.descripcion || null });
        Toast.success(esDeposito ? 'Depósito registrado' : 'Retiro registrado');
        Contabilidad.cargarBanco();
      } catch (err) {
        Toast.error(err.message || 'Error al registrar');
        return false;
      }
    }
  });
};

Contabilidad.nuevoCambioDivisas = function () {
  FormModal.show({
    title: 'Cambio de divisas',
    submitLabel: 'Registrar cambio',
    fields: [
      {
        id: 'de', label: 'Entrego', type: 'select', value: 'USD', required: true,
        options: [{ value: 'USD', label: 'USD (dólares)' }, { value: 'CUP', label: 'CUP (pesos)' }]
      },
      { id: 'monto', label: 'Monto a cambiar', type: 'number', min: 0.01, step: 0.01, required: true },
      { id: 'tasa', label: 'Tasa acordada (CUP por 1 USD)', type: 'number', min: 0.01, step: 0.01, required: true, help: 'La tasa se acuerda en cada operación' },
      {
        id: 'cuenta', label: 'El dinero está en', type: 'select', value: 'banco', required: true,
        options: [{ value: 'banco', label: 'Banco' }, { value: 'efectivo', label: 'Efectivo (caja)' }]
      }
    ],
    onSubmit: async (v) => {
      const resultante = v.de === 'USD' ? v.monto * v.tasa : v.monto / v.tasa;
      const destino = v.de === 'USD' ? 'CUP' : 'USD';
      if (!await Utils.confirm(`¿Confirmas el cambio?\n\n−${v.monto} ${v.de}\n+${resultante.toFixed(2)} ${destino}\nCuenta: ${v.cuenta}`, 'Confirmar cambio')) return false;
      try {
        const res = await API.contabilidad.cambioDivisas(v);
        Toast.success(res.message);
        Contabilidad.cargarBanco();
      } catch (err) {
        Toast.error(err.message || 'Error en el cambio');
        return false;
      }
    }
  });
};

// ── Servicios (pagos y cobros por servicios) ──

Contabilidad.cargarServicios = async function () {
  const container = $('#serviciosContenido');
  try {
    const servicios = await API.servicios.listar();

    const filas = servicios.map(s => `
      <tr>
        <td>${Utils.formatearFecha(Utils.fechaISOToLocal(s.fecha), 'fecha')}</td>
        <td>${s.descripcion}</td>
        <td><span class="badge bg-${s.tipo === 'pago' ? 'danger' : 'success'}">${s.tipo === 'pago' ? 'Pago' : 'Cobro'}</span></td>
        <td>${s.cuenta}</td>
        <td class="text-end ${s.tipo === 'pago' ? 'text-danger' : 'text-success'}">
          ${s.tipo === 'pago' ? '−' : '+'}${s.moneda === 'USD' ? '$' : ''}${Utils.formatMoney(s.monto)}
          ${s.moneda === 'USD' ? `<small class="text-muted">(tasa ${s.tasa_cambio})</small>` : ''}
        </td>
        <td class="text-muted small">${s.compra_factura ? `Compra ${s.compra_factura}` : s.pedido_num ? `Pedido #${s.pedido_num}` : '—'}</td>
      </tr>
    `).join('');

    container.html(servicios.length === 0
      ? '<p class="text-muted text-center py-3 mb-0">Sin servicios registrados</p>'
      : `<div class="table-responsive" style="max-height: 250px; overflow-y: auto;">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-light"><tr><th>Fecha</th><th>Descripción</th><th>Tipo</th><th>Cuenta</th><th class="text-end">Monto</th><th>Vínculo</th></tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>`);
  } catch (error) {
    container.html(`<div class="alert alert-danger m-3">Error al cargar servicios: ${error.message}</div>`);
  }
};

Contabilidad.nuevoServicio = function (tipo) {
  const esPago = tipo === 'pago';
  FormModal.show({
    title: esPago ? 'Pago por servicio (estiba, transporte...)' : 'Cobro por servicio',
    submitLabel: 'Registrar',
    fields: [
      { id: 'descripcion', label: 'Descripción', type: 'text', required: true, placeholder: esPago ? 'Ej: estiba de mercancía, flete' : 'Ej: servicio prestado' },
      { id: 'monto', label: 'Monto', type: 'number', min: 0.01, step: 0.01, required: true },
      {
        id: 'cuenta', label: esPago ? 'El dinero sale de' : 'El dinero entra a', type: 'select', value: 'efectivo', required: true,
        options: [{ value: 'efectivo', label: 'Efectivo (caja)' }, { value: 'banco', label: 'Banco' }]
      },
      {
        id: 'moneda', label: 'Moneda', type: 'select', value: 'CUP', required: true,
        options: [{ value: 'CUP', label: 'CUP (pesos)' }, { value: 'USD', label: 'USD (dólares)' }]
      },
      { id: 'tasa_cambio', label: 'Tasa acordada (CUP por 1 USD)', type: 'number', min: 0.01, step: 0.01, showIf: { field: 'moneda', value: 'USD' } }
    ],
    onSubmit: async (v) => {
      if (v.moneda === 'USD' && (!v.tasa_cambio || v.tasa_cambio <= 0)) { Toast.warning('Indica la tasa de cambio acordada para el servicio en USD'); return false; }
      try {
        await API.servicios.crear({ descripcion: v.descripcion.trim(), tipo, monto: v.monto, cuenta: v.cuenta, moneda: v.moneda, tasa_cambio: v.tasa_cambio || 1 });
        Toast.success(`Servicio registrado (${tipo})`);
        Contabilidad.cargarServicios();
        Contabilidad.cargarBanco();
      } catch (err) {
        Toast.error(err.message || 'Error al registrar el servicio');
        return false;
      }
    }
  });
};

// ── Nóminas (pago a trabajadores) ──

Contabilidad.cargarNominas = async function () {
  const container = $('#nominasContenido');
  try {
    const ahora = new Date();
    const nominas = await API.contabilidad.nominas(ahora.getMonth() + 1, ahora.getFullYear());

    const filas = nominas.map(n => `
      <tr>
        <td><strong>${n.empleado_nombre}</strong><br><small class="text-muted">${n.cargo}</small></td>
        <td class="text-end">${Utils.formatMoney(n.salario_bruto, 0)}</td>
        <td class="text-center">${n.estado === 'pagada' ? '<span class="badge bg-success">Pagada</span>' : '<span class="badge bg-warning text-dark">Pendiente</span>'}</td>
        <td>${n.fecha_pago_salario ? Utils.formatearFecha(Utils.fechaISOToLocal(n.fecha_pago_salario), 'fecha') : '—'}</td>
        <td class="text-center">
          ${n.estado !== 'pagada' ? `<button class="btn btn-sm btn-success pagar-salario" data-id="${n.id}" data-nombre="${n.empleado_nombre}" data-monto="${n.salario_bruto}"><i class="fas fa-university me-1"></i>Pagar por banco</button>` : '<i class="fas fa-check text-success"></i>'}
        </td>
      </tr>
    `).join('');

    container.html(nominas.length === 0
      ? '<p class="text-muted text-center py-3 mb-0">Sin nóminas generadas este mes. Usa "Generar Nómina del Mes".</p>'
      : `<div class="table-responsive"><table class="table table-hover mb-0">
          <thead class="table-light"><tr><th>Empleado</th><th class="text-end">Salario</th><th class="text-center">Estado</th><th>Fecha pago</th><th class="text-center">Acción</th></tr></thead>
          <tbody>${filas}</tbody></table></div>`);

    $('.pagar-salario').on('click', async function () {
      const id = $(this).data('id');
      const nombre = $(this).data('nombre');
      const monto = $(this).data('monto');
      if (!await Utils.confirm(`¿Pagar el salario de ${nombre} (${Utils.formatMoney(monto, 0)}) por el banco?`, 'Confirmar pago')) return;
      try {
        await API.contabilidad.pagarSalario(id);
        Toast.success('Salario pagado por banco');
        Contabilidad.cargarNominas();
        Contabilidad.cargarBanco();
      } catch (error) { Toast.error(error.message); }
    });
  } catch (error) {
    container.html(`<div class="alert alert-danger m-3">Error al cargar nóminas: ${error.message}</div>`);
  }
};

Contabilidad.generarNominas = async function () {
  const ahora = new Date();
  try {
    const res = await API.contabilidad.generarNominas(ahora.getMonth() + 1, ahora.getFullYear());
    Toast.success(res.message);
    Contabilidad.cargarNominas();
  } catch (error) { Toast.error(error.message); }
};

// ── Pagar Bonos (semanal, con ayuda para decidir el monto) ──

Contabilidad.pagarBonos = async function () {
  try {
    Utils.showLoading('Cargando ayuda de bonos...');
    const ayuda = await API.contabilidad.ayudaBonos();
    Utils.hideLoading();

    const filas = ayuda.empleados.map(e => `
      <tr>
        <td><strong>${e.nombre}</strong><br><small class="text-muted">${e.cargo}</small></td>
        <td class="text-center">${e.dias_trabajados_semana}</td>
        <td class="text-end">${Utils.formatMoney(e.bonos_pagados_mes, 0)}<br><small class="text-muted">${e.bonos_veces_mes} vez/veces</small></td>
        <td class="text-end">${Utils.formatMoney(e.salario_mensual, 0)}</td>
        <td class="text-end fw-bold">${Utils.formatMoney(e.total_a_recibir_mes, 0)}</td>
        <td><small class="text-muted">${e.ventas_por_dia.length > 0 ? e.ventas_por_dia.map(v => `${v.dia.slice(5)}: ${Utils.formatMoney(v.total, 0)}`).join(' · ') : 'sin ventas'}</small></td>
        <td class="text-center" style="width:150px">
          <div class="input-group input-group-sm">
            <input type="number" class="form-control bono-monto" data-empleado="${e.empleado_id}" data-nombre="${e.nombre}" placeholder="0" step="0.01" min="0">
            <button class="btn btn-success pagar-bono-emp"><i class="fas fa-check"></i></button>
          </div>
        </td>
      </tr>
    `).join('');

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('contabilidad')}
        <main class="main-content">
          <nav class="navbar navbar-light bg-white border-bottom px-3">
            <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
            <div class="d-flex align-items-center ms-auto">
              <span class="me-3"><i class="fas fa-user me-1"></i>${State.getUser()?.nombre_completo || ''}</span>
            </div>
          </nav>
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3"><ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#contabilidad">Contabilidad</a></li>
              <li class="breadcrumb-item active">Pagar Bonos</li>
            </ol></nav>
            <div class="d-flex align-items-center mb-4">
              <button class="btn btn-outline-secondary me-3" id="btnVolver"><i class="fas fa-arrow-left me-1"></i>Volver</button>
              <h2 class="mb-0"><i class="fas fa-hand-holding-usd me-2"></i>Pagar Bonos Semanales</h2>
            </div>
            <div class="alert alert-info">
              <i class="fas fa-info-circle me-1"></i>Semana del <strong>${Utils.formatearFecha(Utils.fechaISOToLocal(ayuda.semana.desde), 'fecha')}</strong> al <strong>${Utils.formatearFecha(Utils.fechaISOToLocal(ayuda.semana.hasta), 'fecha')}</strong>.
              Para cada empleado: días trabajados (por actividad en la app), bonos ya pagados del mes, salario de fin de mes y total a recibir. El bono se paga en efectivo y <strong>no se declara como salario</strong>.
            </div>
            <div class="card"><div class="card-body p-0">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr><th>Empleado</th><th class="text-center">Días trabajados</th><th class="text-end">Bonos del mes</th><th class="text-end">Salario</th><th class="text-end">Total a recibir</th><th>Ventas por día</th><th class="text-center">Bono a pagar</th></tr>
                </thead>
                <tbody>${filas || '<tr><td colspan="7" class="text-center text-muted py-4">No hay empleados activos</td></tr>'}</tbody>
              </table>
            </div></div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    $('#toggleSidebar').on('click', () => $('#sidebar').toggleClass('show'));
    $('#sidebar .nav-link').on('click', function (e) {
      e.preventDefault();
      const href = $(this).attr('href');
      if (href && href !== '#') ViewManager.navegar(href.substring(1), {}, { reset: true });
    });
    $('#btnLogout').on('click', (e) => { e.preventDefault(); App.logout(); });
    $('#btnVolver').on('click', () => ViewManager.volver());

    $('.pagar-bono-emp').on('click', async function () {
      const input = $(this).closest('.input-group').find('.bono-monto');
      const empleadoId = input.data('empleado');
      const nombre = input.data('nombre');
      const monto = parseFloat(input.val());
      if (!monto || monto <= 0) return Toast.warning('Indica el monto del bono');
      if (!await Utils.confirm(`¿Pagar bono de ${Utils.formatMoney(monto, 0)} a ${nombre} en efectivo?`, 'Confirmar bono')) return;
      try {
        await API.contabilidad.pagarBono({ empleado_id: empleadoId, monto });
        Toast.success(`Bono pagado a ${nombre}`);
        Contabilidad.pagarBonos(); // recargar la vista
      } catch (error) { Toast.error(error.message); }
    });
  } catch (error) {
    Utils.hideLoading();
    console.error(error);
    Toast.error('Error al cargar la ayuda de bonos');
  }
};

// ── Libro Diario ──

Contabilidad.cargarLibroDiario = async function () {
  const mes = $('#mesImpuesto').val();
  const anio = $('#anioImpuesto').val();
  const container = $('#libroDiarioContenido');

  container.html('<div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>');

  try {
    const res = await API.contabilidad.libroDiario(parseInt(mes), parseInt(anio));
    if (!res.success) {
      container.html(`<div class="alert alert-danger m-3">${res.error}</div>`);
      return;
    }

    const filas = res.data.map(d => `
      <tr>
        <td>${Utils.formatearFecha(Utils.fechaISOToLocal(d.dia), 'fecha')}</td>
        <td class="text-center">${d.cantidad_ventas}</td>
        <td class="text-end">${Utils.formatMoney(d.ventas_gravables, 0)}</td>
        <td class="text-end text-danger fw-bold">${Utils.formatMoney(d.gastos_gravables, 0)}</td>
      </tr>
    `).join('');

    const totales = res.data.reduce((acc, d) => ({
      vg: acc.vg + d.ventas_gravables,
      gg: acc.gg + d.gastos_gravables
    }), { vg: 0, gg: 0 });

    container.html(`
      <div class="p-2 bg-light border-bottom small">
        <i class="fas fa-info-circle me-1"></i>Mundo declarado: <strong>solo ventas y gastos de productos gravables</strong> (los no gravables se compran/venden sin factura) — ${res.periodo}
      </div>
      <div class="table-responsive" style="max-height: 350px; overflow-y: auto;">
        <table class="table table-sm table-hover mb-0">
          <thead class="table-light">
            <tr><th>Día</th><th class="text-center">Ventas</th><th class="text-end">Ventas gravables</th><th class="text-end">Gastos gravables</th></tr>
          </thead>
          <tbody>${filas || '<tr><td colspan="4" class="text-center text-muted py-3">Sin actividad en el período</td></tr>'}</tbody>
          <tfoot class="table-light">
            <tr><th colspan="2">TOTAL</th><th class="text-end">${Utils.formatMoney(totales.vg, 0)}</th><th class="text-end">${Utils.formatMoney(totales.gg, 0)}</th></tr>
          </tfoot>
        </table>
      </div>
    `);
  } catch (error) {
    container.html(`<div class="alert alert-danger m-3">Error al cargar el libro diario: ${error.message}</div>`);
  }
};

// ── Historial de liquidaciones ──

Contabilidad.renderHistorial = function (liquidaciones) {
  if (!liquidaciones || liquidaciones.length === 0) {
    return '<p class="text-muted text-center py-4 mb-0">No hay liquidaciones registradas aún. Calcula los impuestos de un período para generarlas.</p>';
  }

  const estadoBadge = {
    pendiente: '<span class="badge bg-warning text-dark">Pendiente</span>',
    pagado: '<span class="badge bg-success">Pagado</span>',
    parcial: '<span class="badge bg-info">Parcial</span>',
    exento: '<span class="badge bg-secondary">Exento</span>'
  };

  return `
    <div class="table-responsive">
      <table class="table table-hover mb-0">
        <thead class="table-light">
          <tr>
            <th>Período</th><th>Tributo</th><th class="text-end">Base</th>
            <th class="text-end">Calculado</th><th class="text-end">Pagado</th>
            <th class="text-center">Estado</th><th class="text-center">Acción</th>
          </tr>
        </thead>
        <tbody>
          ${liquidaciones.map(l => `
            <tr>
              <td>${l.mes ? `${l.mes}/` : ''}${l.anio}${l.trimestre ? ` T${l.trimestre}` : ''}</td>
              <td><small class="text-muted">${l.codigo}</small><br>${l.tributo_nombre}</td>
              <td class="text-end">${Utils.formatMoney(l.base_calculo)}</td>
              <td class="text-end fw-bold">${Utils.formatMoney(l.monto_calculado)}</td>
              <td class="text-end">${Utils.formatMoney(l.monto_pagado || 0)}</td>
              <td class="text-center">${estadoBadge[l.estado] || l.estado}</td>
              <td class="text-center">
                ${l.estado !== 'pagado' ? `
                  <button class="btn btn-sm btn-outline-success registrar-pago" 
                          data-id="${l.id}" data-monto="${l.monto_calculado - (l.monto_pagado || 0)}" data-nombre="${l.tributo_nombre}">
                    <i class="fas fa-money-bill me-1"></i>Pagar
                  </button>` : '<i class="fas fa-check text-success"></i>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

Contabilidad.cargarHistorial = async function () {
  const container = $('#historialContenido');
  container.html('<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>');

  try {
    const res = await API.contabilidad.historial();
    container.html(Contabilidad.renderHistorial(res.data || []));

    // Registrar pago (con modal, no prompt)
    $('.registrar-pago').on('click', async function () {
      const id = $(this).data('id');
      const pendiente = parseFloat($(this).data('monto'));
      const nombre = $(this).data('nombre');

      FormModal.show({
        title: `Pagar: ${nombre}`,
        submitLabel: 'Registrar pago',
        fields: [
          { id: 'monto_pagado', label: `Monto a pagar (pendiente: ${Utils.formatMoney(pendiente)})`, type: 'number', value: pendiente.toFixed(2), min: 0.01, step: 0.01, required: true },
          { id: 'comprobante', label: 'Nº de comprobante de pago (opcional)', type: 'text' }
        ],
        onSubmit: async (v) => {
          try {
            await API.contabilidad.registrarPago({ liquidacion_id: id, monto_pagado: v.monto_pagado, comprobante: v.comprobante || null });
            Toast.success('Pago registrado');
            Contabilidad.cargarHistorial();
            Contabilidad.cargarBanco();
          } catch (error) {
            Toast.error(error.message || 'Error al registrar el pago');
            return false;
          }
        }
      });
    });
  } catch (error) {
    container.html(`<div class="alert alert-danger m-3">Error al cargar el historial: ${error.message}</div>`);
  }
};

window.Contabilidad = Contabilidad;
