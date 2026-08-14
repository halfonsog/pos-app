/**
 * ventas.js - Módulo de gestión de ventas
 * Incluye: Dashboard, Pantalla POS, Turnos, Arqueo, Conteo de efectivo
 */

var Ventas = window.Ventas || {};

Ventas._carrito = [];
Ventas._impuestoPorcentaje = 0;

// ============================================
// VISTA PRINCIPAL (INDEX - Dashboard Admin)
// ============================================
Ventas.index = async function () {
  console.log('💰 Cargando módulo de ventas');

  try {
    const turno = await API.ventas.turnoActual();
    const ventasHoy = turno.abierto ? turno.ventas : { total_ventas: 0, total_general: 0 };

    // Si el turno está abierto, cargar los productos vendidos (como en el cierre de turno)
    let resumenTurno = null;
    if (turno.abierto) {
      try {
        resumenTurno = await API.ventas.resumenTurno(turno.id);
      } catch (e) { resumenTurno = null; }
    }

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('ventas')}
        <main class="main-content">
          ${Ventas.renderNavbar(State.getUser())}
          
          <div class="container-fluid p-4">
            <h2 class="mb-4"><i class="fas fa-cash-register me-2"></i>Gestión de Ventas</h2>
            
            <!-- Estado del Turno -->
            <div class="row g-3 mb-4">
              <div class="col-md-3">
                <div class="card ${turno.abierto ? 'border-success' : 'border-danger'}">
                  <div class="card-body text-center">
                    <i class="fas fa-clock fa-2x ${turno.abierto ? 'text-success' : 'text-danger'} mb-2"></i>
                    <h5>${turno.abierto ? 'Turno Abierto' : 'Turno Cerrado'}</h5>
                    ${turno.abierto ? `
                      <p class="text-muted small">${turno.vendedor_nombre} - ${Utils.formatearFecha(Utils.fechaISOToLocal(turno.abierto_at), 'datetime')}</p>
                    ` : ''}
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="summary-card border-primary clickable" data-route="ventas/listado" style="cursor:pointer">
                  <div class="summary-content text-center">
                    <h3 class="summary-number text-primary">${ventasHoy.total_ventas || 0}</h3>
                    <p class="summary-label"><i class="fas fa-receipt me-1"></i>Ventas Hoy</p>
                  </div>
                  <div class="summary-details"><small>transacciones</small></div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="summary-card border-success clickable" data-route="ventas/listado" style="cursor:pointer">
                  <div class="summary-content text-center">
                    <h3 class="summary-number text-success">${Utils.formatMoney(ventasHoy.total_general || 0, 0)}</h3>
                    <p class="summary-label"><i class="fas fa-dollar-sign me-1"></i>Total Facturado</p>
                  </div>
                  <div class="summary-details"><small>hoy</small></div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="summary-card border-info" style="cursor:default">
                  <div class="summary-content text-center">
                    <h3 class="summary-number text-info">${Utils.formatMoney(turno.monto_apertura || 0, 0)}</h3>
                    <p class="summary-label"><i class="fas fa-unlock me-1"></i>Monto Apertura</p>
                  </div>
                  <div class="summary-details"><small>fondo de caja</small></div>
                </div>
              </div>
            </div>
            
            <!-- Acciones rápidas -->
            <div class="row g-2 mb-4">
              <div class="col-6 col-md-3">
                ${turno.abierto ? `
                  <button class="btn btn-danger w-100" id="btnCerrarTurno">
                    <i class="fas fa-lock me-1"></i><span class="d-none d-md-inline">Cerrar</span> Turno
                  </button>
                ` : `
                  <button class="btn btn-success w-100" id="btnAbrirTurno">
                    <i class="fas fa-unlock me-1"></i><span class="d-none d-md-inline">Abrir</span> Turno
                  </button>
                `}
              </div>
              <div class="col-6 col-md-3">
                <button class="btn btn-primary w-100" data-route="ventas/pos" ${!turno.abierto ? 'disabled' : ''}>
                  <i class="fas fa-shopping-cart me-1"></i>Vender
                </button>
              </div>
              <div class="col-6 col-md-3">
                <button class="btn btn-outline-primary w-100" data-route="ventas/listado">
                  <i class="fas fa-list me-1"></i>Historial
                </button>
              </div>
              <div class="col-6 col-md-3">
                <button class="btn btn-outline-info w-100" data-route="ventas/encargos">
                  <i class="fas fa-bookmark me-1"></i>Encargos
                </button>
              </div>
            </div>

            ${turno.abierto && resumenTurno?.productosVendidos?.length > 0 ? `
            <!-- Productos vendidos en el turno abierto (como en el cierre de turno) -->
            <div class="row g-4">
              <div class="col-12">
                <div class="dashboard-card">
                  <div class="card-header-custom"><h5><i class="fas fa-shopping-bag me-2"></i>Productos Vendidos (turno actual)</h5></div>
                  <div class="table-responsive">
                    <table class="table table-sm table-hover mb-0">
                      <thead class="table-light"><tr><th>Producto</th><th class="text-end">Cantidad</th><th class="text-end">Total</th></tr></thead>
                      <tbody>
                        ${resumenTurno.productosVendidos.map(p => `
                          <tr>
                            <td>${p.nombre}</td>
                            <td class="text-end">${Utils.formatNumber(p.cantidad_total, 1)} ${p.unidad_venta_abrev || ''}</td>
                            <td class="text-end">${Utils.formatMoney(p.total_vendido, 0)}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            ` : ''}
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Ventas.bindIndexEvents(turno);

  } catch (error) {
    console.error('Error cargando ventas:', error);
  }
};

Ventas.bindIndexEvents = function (turno) {
  $('[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });

  if (!turno.abierto) {
    $('#btnAbrirTurno').on('click', () => Ventas.abrirTurno());
  } else {
    $('#btnCerrarTurno').on('click', () => Ventas.cerrarTurno());
  }

  Ventas.bindCommonEvents();
};

// ============================================
// ABRIR TURNO
// ============================================
Ventas.abrirTurno = function () {
  const modalHtml = `
    <div class="modal fade" id="turnoModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Abrir Turno</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="abrirTurnoForm">
              <div class="mb-3">
                <label class="form-label">Monto de Apertura ($)</label>
                <input type="number" class="form-control form-control-lg" id="montoApertura" value="1000" step="1" min="0" required autofocus>
                <small class="text-muted">Dinero inicial en caja para dar cambio</small>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-success btn-lg" id="btnConfirmarApertura">
              <i class="fas fa-unlock me-1"></i>Abrir Turno
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  $('body').append(modalHtml);
  const modal = new bootstrap.Modal('#turnoModal');
  modal.show();

  $('#btnConfirmarApertura').on('click', async function () {
    const monto = parseFloat($('#montoApertura').val());
    if (!monto || monto < 0) { Toast.warning('Ingrese un monto válido'); return; }

    try {
      Utils.showLoading('Abriendo turno...');
      await API.ventas.abrirTurno({ monto_apertura: monto });
      Utils.hideLoading();
      Toast.success('Turno abierto');
      modal.hide();
      $('#turnoModal').remove();
      ViewManager.refresh();
    } catch (error) {
      Utils.hideLoading();
      console.error('Error:', error);
    }
  });

  $('#turnoModal').on('hidden.bs.modal', function () { $(this).remove(); });
};

// ============================================
// CARD UNIFICADO: DESGLOSE POR PRIORIDADES DEL TURNO
// ============================================
// Sustituye los antiguos cards "Rentabilidad" y "Desglose por Prioridades".
// Gastos en rojo, margen en rojo si < 0 / verde si no, excedente verde con
// flecha al destino (inversiones → préstamos → ganancias). La nota verifica
// que gastos fijos + financieros corresponden al % de gastos del período.
Ventas.renderDesgloseTurno = function (d) {
  if (!d) return '';

  const pct = (v) => (d.recaudado > 0 ? ((v / d.recaudado) * 100).toFixed(1) : '0.0');
  const p1 = (d.impuestos ?? ((d.prioridades || []).find(p => p.orden === 1)?.monto)) || 0;   // impuestos
  const p2 = (d.costo_base ?? ((d.prioridades || []).find(p => p.orden === 2)?.monto)) || 0;   // costos base
  // % de impuesto sobre su base exacta (venta neta + impuesto). El impuesto se
  // calculó sobre el total EXACTO (antes del redondeo), por eso aquí da el 15%.
  const impuestoPct = (d.venta_neta + p1) > 0
    ? ((p1 / (d.venta_neta + p1)) * 100).toFixed(1)
    : '0.0';
  const gf = d.equivalentes?.gastos_fijos || 0;
  const prest = d.equivalentes?.prestamos || 0;
  const inv = d.equivalentes?.inversiones || 0;
  const margen = d.margen ?? 0;
  const ganancias = d.ganancias ?? 0;
  const excedente = d.excedente_reajustado ?? 0;
  const destino = d.destino_excedente || 'ganancias';
  const destinoLabel = { inversiones: 'Inversiones', prestamos: 'Préstamos', ganancias: 'Ganancias' }[destino] || 'Ganancias';
  const margenCls = margen < 0 ? 'text-danger' : 'text-success';
  const ajuste = d.ajuste_redondeo ?? (d.recaudado - d.venta_neta - p1);
  const ajusteEsPositivo = ajuste >= 0;

  return `
    <div class="card mb-4">
      <div class="card-header"><h5 class="mb-0"><i class="fas fa-layer-group me-2"></i>Desglose por Prioridades</h5></div>
      <div class="card-body">
        <div class="d-flex justify-content-between mb-2">
          <span>(+) Venta neta:</span>
          <span>${Utils.formatMoney(d.venta_neta)}</span>
        </div>
        <div class="d-flex justify-content-between mb-2">
          <span>(+) Impuestos (${impuestoPct}%):</span>
          <span>${Utils.formatMoney(p1)}</span>
        </div>
        <div class="d-flex justify-content-between mb-2 ${ajusteEsPositivo ? '' : 'text-danger'}" title="Ajuste para redondear al importe de la moneda mínima. No se grava; va directo al margen.">
          <span>(-) Ajuste de redondeo:</span>
          <span>${Utils.formatMoney(ajuste)}</span>
        </div>
        <div class="d-flex justify-content-between mb-2 fw-bold">
          <span>(=) Recaudado del turno:</span>
          <span>${Utils.formatMoney(d.recaudado)}</span>
        </div>
        <hr>
        <div class="d-flex justify-content-between mb-2 text-danger">
          <span>(-) Costo base (${pct(p2)}%):</span>
          <span>${Utils.formatMoney(p2)}</span>
        </div>
        <div class="d-flex justify-content-between mb-2 text-danger" title="Σ configuracion_gastos + Σ salarios de empleados, equivalente al período">
          <span>(-) Gastos fijos (${pct(gf)}%)*:</span>
          <span>${Utils.formatMoney(gf)}</span>
        </div>
        <div class="d-flex justify-content-between mb-2 text-danger" title="Gasto financiero equivalente del período">
          <span>(-) Préstamos (${pct(prest)}%):</span>
          <span>${Utils.formatMoney(prest)}</span>
        </div>
        <div class="d-flex justify-content-between mb-2 text-danger">
          <span>(-) Inversiones (${pct(inv)}%):</span>
          <span>${Utils.formatMoney(inv)}</span>
        </div>
        ${d.servicios ? `
        <div class="d-flex justify-content-between mb-2 ${(d.servicios.neto || 0) < 0 ? 'text-danger' : 'text-success'}" title="Servicios del turno: cobros − pagos. Informa sobre la caja sin afectar el cálculo de prioridades.">
          <span>(±) Servicios del turno (cobros − pagos):</span>
          <span>${(d.servicios.neto || 0) >= 0 ? '+' : ''}${Utils.formatMoney(d.servicios.neto)}</span>
        </div>` : ''}
        <hr>
        <div class="d-flex justify-content-between mb-2 fw-bold ${margenCls}">
          <span>(=) Margen (${pct(margen)}%):</span>
          <span>${Utils.formatMoney(margen)}</span>
        </div>
        <div class="d-flex justify-content-between mb-2 fw-bold">
          <span>(-) Ganancias (máx. ${(d.prioridades || []).find(p => p.orden === 6)?.concepto?.match(/\d+/)?.pop() || ''}%):</span>
          <span>${Utils.formatMoney(ganancias)}</span>
        </div>
        <hr>
        <div class="d-flex justify-content-between fw-bold text-success">
          <span>(=) Excedente <i class="fas fa-arrow-right ms-1"></i> ${destinoLabel}:</span>
          <span>${Utils.formatMoney(excedente)}</span>
        </div>
      </div>
      <div class="card-footer d-flex justify-content-around text-center">
        <div>
          <small class="text-muted">% gastos proyectado</small>
          <h5 class="mb-0">${d.comparacion_gastos?.proyectado_pct ?? 0}%</h5>
        </div>
        <div>
          <small class="text-muted">% gastos real del período (fijos + financieros${d.prioridades?.length ? (d.excedente_reajustado && (d.destino_excedente === 'inversiones' || d.destino_excedente === 'prestamos') ? ' + excedente' : '') : ''})</small>
          <h5 class="mb-0 ${(d.comparacion_gastos?.real_pct ?? 0) > (d.comparacion_gastos?.proyectado_pct ?? 0) ? 'text-danger' : 'text-success'}">${d.comparacion_gastos?.real_pct ?? 0}%</h5>
        </div>
      </div>
      <div class="card-footer py-1 bg-white border-top-0">
        <small class="text-muted">* Gastos fijos y financieros equivalentes según el % de gastos del negocio: (gastos fijos + préstamos + inversiones) ÷ venta neta del período. El excedente cubre primero inversiones, si no préstamos, y si no ganancias. El ajuste de redondeo no se grava y va directo al margen. La línea de servicios es informativa (caja), no forma parte del desglose de prioridades.</small>
      </div>
    </div>
  `;
};

// ============================================
// CERRAR TURNO (con arqueo y conteo)
// ============================================
Ventas.cerrarTurno = async function () {
  try {
    Utils.showLoading('Calculando cierre...');
    const turno = await API.ventas.turnoActual();

    if (!turno.abierto) {
      Utils.hideLoading();
      Toast.warning('No hay turno abierto');
      return;
    }

    const resumen = await API.ventas.resumenTurno(turno.id);
    Utils.hideLoading();

    const montoApertura = turno.monto_apertura || 0;
    const ventasEfectivo = resumen.ventasPorMetodo.find(v => v.metodo_pago === 'efectivo')?.total || 0;
    const montoEsperado = montoApertura + ventasEfectivo;

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('ventas')}
        <main class="main-content">
          ${Ventas.renderNavbar(State.getUser())}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                <li class="breadcrumb-item"><a href="#ventas">Ventas</a></li>
                <li class="breadcrumb-item active">Cerrar Turno</li>
              </ol>
            </nav>
            
            <h2 class="mb-4"><i class="fas fa-lock me-2"></i>Cierre de Turno</h2>
            
            <div class="row">
              <div class="col-lg-6">
                <!-- Ventas -->
                <div class="card mb-4">
                  <div class="card-header"><h5 class="mb-0"><i class="fas fa-chart-pie me-2"></i>Ventas del Turno</h5></div>
                  <div class="card-body">
                    ${resumen.ventasPorMetodo.map(v => `
                      <div class="d-flex justify-content-between mb-2">
                        <span>${v.metodo_pago === 'efectivo' ? '💰 Efectivo' : '💳 Tarjeta'}:</span>
                        <span><strong>${v.cantidad}</strong> ventas - ${Utils.formatMoney(v.total)}</span>
                      </div>
                    `).join('')}
                    <hr>
                    <div class="d-flex justify-content-between fw-bold">
                      <span>TOTAL:</span>
                      <span class="text-primary">${resumen.totales.total_ventas} ventas - ${Utils.formatMoney(resumen.totales.total_cobrado)}</span>
                    </div>
                  </div>
                </div>

                ${Ventas.renderDesgloseTurno(resumen.desglose_prioridades)}
              </div>
              
              <div class="col-lg-6">
                <!-- Productos vendidos -->
                <div class="card mb-4">
                  <div class="card-header"><h5 class="mb-0"><i class="fas fa-box me-2"></i>Productos Vendidos</h5></div>
                  <div class="card-body p-0">
                    <table class="table table-sm mb-0">
                      <thead><tr><th>Producto</th><th class="text-end">Cantidad</th><th class="text-end">Total</th></tr></thead>
                      <tbody>
                        ${resumen.productosVendidos.map(p => `
                          <tr>
                            <td>${p.nombre}</td>
                            <td class="text-end">${p.unidad_venta_tipo === 'unidad' ? Math.floor(p.cantidad_total) : Utils.formatNumber(p.cantidad_total, 1)} ${p.unidad_venta_abrev}</td>
                            <td class="text-end">${Utils.formatMoney(p.total_vendido)}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <!-- Arqueo de caja -->
                <div class="card mb-4">
                  <div class="card-header"><h5 class="mb-0"><i class="fas fa-cash-register me-2"></i>Arqueo de Caja</h5></div>
                  <div class="card-body">
                    <div class="d-flex justify-content-between mb-2">
                      <span>Monto de apertura:</span>
                      <strong>${Utils.formatMoney(montoApertura)}</strong>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                      <span>Ventas en efectivo:</span>
                      <strong>${Utils.formatMoney(ventasEfectivo)}</strong>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between mb-3">
                      <span class="fw-bold">Monto esperado en caja:</span>
                      <span class="fs-5 fw-bold text-primary">${Utils.formatMoney(montoEsperado)}</span>
                    </div>
                    
                    <h6>Conteo de Efectivo</h6>
                    <div class="row g-2 mb-3" id="conteoEfectivo">
                      <p class="text-muted">Cargando denominaciones...</p>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between mb-2">
                      <span class="fw-bold">Total Contado:</span>
                      <span class="fs-5 fw-bold text-success" id="totalContado">$0.00</span>
                    </div>
                    <div class="d-flex justify-content-between">
                      <span class="fw-bold">Diferencia:</span>
                      <span class="fs-5 fw-bold" id="diferenciaCierre">-</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="d-flex justify-content-end mt-3">
              <a href="#ventas" class="btn btn-secondary me-2">Cancelar</a>
              <button class="btn btn-danger btn-lg" id="btnConfirmarCierre">
                <i class="fas fa-lock me-1"></i>Confirmar Cierre
              </button>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    const denomHtml = await Ventas.renderConteoEfectivo();
    $('#conteoEfectivo').html(denomHtml);

    Ventas.bindCierreTurnoEvents(montoEsperado);

  } catch (error) {
    Utils.hideLoading();
    console.error('Error:', error);
  }
};

Ventas.renderConteoEfectivo = async function () {
  try {
    const denominaciones = await API.configuracion.denominaciones();

    return denominaciones.map((d, index) => `
      <div class="col-6">
        <div class="input-group input-group-sm">
          <label class="form-label" style="width: 30%; text-align: right">${Utils.formatNumber(d.valor, 0)} x</label>&nbsp;
          <input type="number" class="form-control conteo-cantidad" data-index="${index}" data-valor="${d.valor}" value="0" min="0" step="1">&nbsp;
          <label class="input-group note-total" data-index="${index}" style="width: 40%;">= 0</label>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error cargando denominaciones:', error);
    return '';
  }
};

Ventas.bindCierreTurnoEvents = function (montoEsperado) {

  const calcularTotal = function (idx) {
    let total = 0;
    $('.conteo-cantidad').each(function () {
      const cantidad = parseInt($(this).val()) || 0;
      const valor = parseFloat($(this).data('valor'));
      const index = $(this).data('index');
      if (idx == index) {
        const fpath = `.note-total[data-index="${index}"]`;
        $(fpath).text(`= ${Utils.formatNumber(cantidad * valor, 0)}`);
      }
      total += cantidad * valor;
    });
    $('#totalContado').text(Utils.formatMoney(total));
    return total;
  };

  const calcularDiferencia = function (idx) {
    const total = calcularTotal(idx);
    const diferencia = total - montoEsperado;
    const $dif = $('#diferenciaCierre');

    if (diferencia === 0) {
      $dif.text('¡Cuadre perfecto! - $0.00').removeClass('text-danger text-success').addClass('text-success');
    } else if (diferencia > 0) {
      $dif.text(`Sobrante: +${Utils.formatMoney(diferencia)}`).removeClass('text-success').addClass('text-success');
    } else {
      $dif.text(`Faltante: ${Utils.formatMoney(diferencia)}`).removeClass('text-success').addClass('text-danger');
    }
  };

  $('.conteo-cantidad').on('input', function () {
    const idx = $(this).data('index');
    calcularDiferencia(idx);
  });
  calcularDiferencia(-1);

  $('#btnConfirmarCierre').on('click', async function () {
    const total = calcularTotal(-1);

    const confirmado = await Utils.confirm(
      `¿Confirmar cierre con $${total.toFixed(2)} en caja?`,
      'Confirmar Cierre'
    );
    if (!confirmado) return;

    // B14: recolectar el arqueo (desglose por denominaciones con cantidad > 0)
    const desglose = [];
    $('.conteo-cantidad').each(function () {
      const cantidad = parseInt($(this).val()) || 0;
      const valor = parseFloat($(this).data('valor'));
      if (cantidad > 0 && !isNaN(valor)) {
        desglose.push({ valor, cantidad });
      }
    });

    try {
      Utils.showLoading('Cerrando turno...');
      await API.ventas.cerrarTurno({ monto_real: total, desglose });
      Utils.hideLoading();
      Toast.success('Turno cerrado correctamente');
      ViewManager.volver(true);
    } catch (error) {
      Utils.hideLoading();
      console.error('Error:', error);
    }
  });

  Ventas.bindCommonEvents();
};

// ============================================
// PANTALLA DE VENTA (POS)
// ============================================
Ventas.pos = async function () {
  console.log('🛒 Cargando pantalla de venta');

  try {
    Utils.showLoading('Cargando...');

    const turno = await API.ventas.turnoActual();
    if (!turno.abierto) {
      Utils.hideLoading();
      Toast.warning('Debe abrir un turno primero');
      ViewManager.volver();
      return;
    }

    // Obtener los productos que pueden venderse y guardarlos en Ventas._productosEnVenta
    await Ventas.cargarProductos();

    Ventas._carrito = [];
    const config = await State.getConfig();
    if (!config) {
      Toast.warning('Error al cargar la configuración. Intente de nuevo.');
      return;
    }
    Ventas._impuestoPorcentaje = config.impuesto_ventas / 100;

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render(State.isAdmin() ? 'ventas' : 'ventas/pos')}
        <main class="main-content">
          ${Ventas.renderNavbar(State.getUser())}
          
          <div class="container-fluid p-0">
            <div class="row g-0" style="height: calc(100vh - 56px);">
              <!-- Grid de productos -->
              <div class="col-lg-8 p-3" style="overflow-y: auto;">
                <div class="mb-3">
                  <a href="#ventas" class="btn btn-outline-secondary me-2">
                    <i class="fas fa-arrow-left"></i>
                  </a>
                  <div class="input-group d-inline-flex" style="width: 300px;">
                    <span class="input-group-text"><i class="fas fa-search"></i></span>
                    <input type="text" class="form-control" id="buscarProducto" placeholder="Buscar...">
                  </div>
                </div>

                <div class="mb-2">
                  <div class="btn-group btn-group-sm flex-wrap" id="filtrosCategoria"></div>
                </div>

                <div class="row g-2" id="productosGrid"></div>
              </div>
              
              <!-- Carrito -->
              <div class="col-lg-4 bg-light d-flex flex-column" style="border-left: 1px solid #dee2e6; max-height: calc(100vh - 56px);">
                <h5 class="mb-3 mt-3 px-3"><i class="fas fa-shopping-cart me-2"></i>Carrito</h5>
                
                <div id="carritoItems" class="px-3" style="flex: 1; overflow-y: auto;">
                  <p class="text-muted text-center py-4">No hay productos en el carrito</p>
                </div>
                
                <div class="border-top p-3 mt-auto">
                  <div class="d-flex justify-content-between mb-1">
                    <span>Subtotal:</span>
                    <span id="subtotalCarrito">$0.00</span>
                  </div>
                  <div class="d-flex justify-content-between mb-1">
                    <span>Impuesto:</span>
                    <span id="impuestoCarrito">$0.00</span>
                  </div>
                  <div class="d-flex justify-content-between mb-3">
                    <span class="fw-bold fs-5">TOTAL:</span>
                    <span class="fw-bold fs-5 text-primary" id="totalCarrito">$0.00</span>
                  </div>
                  
                  <div class="d-grid gap-2">
                    <button class="btn btn-success btn-lg" id="btnCobrarEfectivo" disabled>
                      <i class="fas fa-money-bill me-2"></i>Cobrar Efectivo
                    </button>
                    <button class="btn btn-info btn-lg" id="btnCobrarTarjeta" disabled>
                      <i class="fas fa-credit-card me-2"></i>Cobrar Tarjeta
                    </button>
                    <button class="btn btn-outline-danger" id="btnVaciarCarrito" disabled>
                      <i class="fas fa-trash me-2"></i>Vaciar Carrito
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Ventas.bindPosEvents();

    Ventas.cargaFiltrosCategorias();
    Ventas.renderProductosGrid(Ventas._productosEnVenta);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error('Error:', error);
  }
};

Ventas.bindPosEvents = function () {
  // Agregar producto al carrito
  $('#productosGrid').on('click', '.producto-card', function () {
    const id = $(this).data('id');
    const nombre = $(this).data('nombre');
    const precio = parseFloat($(this).data('precio'));
    const unidadAbrev = $(this).data('unidad');
    const tipoUnidad = $(this).data('tipo-unidad');

    console.log({ id, nombre, precio, unidadAbrev, tipoUnidad });
    Ventas.mostrarPopupCantidad(id, nombre, precio, unidadAbrev, tipoUnidad);
  });

  // Búsqueda
  $('#buscarProducto').on('input', function () {
    const search = $(this).val().toLowerCase();

    const filtrados = Ventas._productosEnVenta.filter(p =>
      p.nombre.toLowerCase().includes(search) ||
      p.codigo.toLowerCase().includes(search)
    );

    Ventas.renderProductosGrid(filtrados);
  });

  // Filtros (D8: filtrar por categoría padre incluye las subcategorías)
  $('#filtrosCategoria').on('click', '[data-filtro-cat]', function () {
    const cat = $(this).data('filtro-cat');

    let filtrados;
    if (cat === 'todas') {
      filtrados = Ventas._productosEnVenta;
    } else {
      const catId = parseInt(cat);
      const cats = Ventas._categoriasCache || [];
      // Incluir la categoría seleccionada y sus subcategorías directas
      const incluidas = new Set([catId, ...cats.filter(c => c.padre_id === catId).map(c => c.id)]);
      filtrados = Ventas._productosEnVenta.filter(p => incluidas.has(p.categoria_id));
    }

    $('#filtrosCategoria button').removeClass('active');
    $(this).addClass('active');

    Ventas.renderProductosGrid(filtrados);
  });

  // Cobrar efectivo
  $('#btnCobrarEfectivo').on('click', () => Ventas.procesarVenta('efectivo'));

  // Cobrar tarjeta
  $('#btnCobrarTarjeta').on('click', () => Ventas.procesarVenta('tarjeta'));

  // Vaciar carrito
  $('#btnVaciarCarrito').on('click', () => {
    Ventas._carrito = [];
    Ventas.actualizarCarritoUI();
  });

  Ventas.bindCommonEvents();
};

Ventas.cargarProductos = async function () {
  try {
    const productos = await API.productos.listar();
    Ventas._productosEnVenta = productos.filter(p => {
      if (!p.activo) return false;
      if (!p.precio_venta || p.precio_venta <= 0) return false;
      return p.puede_venderse !== false;
    });

    // Intentar obtener ranking de más vendidos
    try {
      const rango = Utils.rangoHoy();
      const ranking = await API.reportes.ventasPorProducto(rango.inicio, rango.fin);

      if (ranking && ranking.productos && ranking.productos.length > 0) {
        // Crear un mapa de id → posición en el ranking (0 = más vendido)
        const rankingPos = {};
        ranking.productos.forEach((p, i) => {
          rankingPos[p.id] = i;
        });

        // Ordenar: primero los que están en el ranking, luego alfabético
        Ventas._productosEnVenta.sort((a, b) => {
          const aEnRanking = rankingPos[a.id] !== undefined;
          const bEnRanking = rankingPos[b.id] !== undefined;

          // Ambos en ranking → ordenar por posición
          if (aEnRanking && bEnRanking) {
            return rankingPos[a.id] - rankingPos[b.id];
          }

          // Solo uno en ranking → el que está en ranking va primero
          if (aEnRanking) return -1;
          if (bEnRanking) return 1;

          // Ninguno en ranking → orden alfabético
          return a.nombre.localeCompare(b.nombre);
        });
      }
    } catch (e) {
      // Si falla el ranking, orden alfabético simple
      Ventas._productosEnVenta.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

  } catch (error) {
    console.error('Error recargando productos:', error);
  }
};

Ventas.cargaFiltrosCategorias = async function () {
  // Cargar categorías (con jerarquía, D8) si no están en caché
  let cats = State.getCache('categorias');
  if (!cats) {
    try { cats = await API.categorias.listar(); State.setCache('categorias', cats); } catch (e) { cats = []; }
  }
  Ventas._categoriasCache = cats;

  const idsEnVenta = new Set(Ventas._productosEnVenta.map(p => p.categoria_id).filter(Boolean));
  // Mostrar categorías con productos propios o con productos en sus subcategorías
  const visibles = cats.filter(c => c.activo && (idsEnVenta.has(c.id) || cats.some(h => h.padre_id === c.id && idsEnVenta.has(h.id))));

  $('#filtrosCategoria').html('<button class="btn btn-outline-secondary active" data-filtro-cat="todas"><b>Todas</b></button>');
  const botonesFiltro = [];
  for (let i = 0; i < visibles.length && i < 8; i++) {
    const cat = visibles[i];
    botonesFiltro.push(`<button class="btn btn-outline-secondary" data-filtro-cat="${cat.id}"><b>${cat.nombre}</b></button>`);
  }
  $('#filtrosCategoria').append(botonesFiltro.join(''));
}

Ventas.renderProductosGrid = function (productos) {
  const html = productos.map(p => `
    <div class="col-6 col-md-4 col-lg-3">
      <div class="card producto-card h-100" 
           data-id="${p.id}" 
           data-nombre="${p.nombre}" 
           data-precio="${p.precio_venta}"
           data-unidad="${p.unidad_venta_abrev}"
           data-tipo-unidad="${p.unidad_venta_tipo}"
           data-categoria="${p.categoria_nombre}">
        <div class="card-body text-center p-2">
          ${p.foto
      ? `<img src="/uploads/productos/${p.foto}" class="producto-img mb-2">`
      : `<img src="${Utils.getProductPlaceholder(p, p.id, 80)}" class="producto-img mb-2">`
    }
          <h6 class="mb-0 small">${p.nombre}</h6>
          <span class="fw-bold text-success">${Utils.formatMoney(p.precio_venta)}</span>
          <div class="mt-1">
            <span class="badge ${p.stock_efectivo > p.stock_minimo ? 'bg-secondary' : 'bg-danger'} small">Stock: ${p.unidad_venta_tipo === 'unidad' ? Math.floor(p.stock_efectivo) : Utils.formatNumber(p.stock_efectivo, 1)} ${p.unidad_venta_abrev}</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  $('#productosGrid').html(html);
};

Ventas.agregarAlCarrito = function (id, nombre, precio, unidadAbrev, cantidad, tipoUnidad) {
  const esUnidad = tipoUnidad === 'unidad';

  const existente = Ventas._carrito.find(item => item.id === id);

  if (existente) {
    existente.cantidad += cantidad;
    existente.total = existente.cantidad * existente.precio;
  } else {
    Ventas._carrito.push({
      id: id,
      nombre: nombre,
      precio: precio,
      cantidad: cantidad,
      total: cantidad * precio,
      unidadAbrev: unidadAbrev || 'ud',
      esUnidad: esUnidad
    });
  }

  Ventas.actualizarCarritoUI();
};

Ventas.actualizarCarritoUI = function () {
  const $carrito = $('#carritoItems');
  const carrito = Ventas._carrito;

  if (carrito.length === 0) {
    $carrito.html('<p class="text-muted text-center py-4">No hay productos en el carrito</p>');
    $('#btnCobrarEfectivo, #btnCobrarTarjeta, #btnVaciarCarrito').prop('disabled', true);
    $('#subtotalCarrito, #impuestoCarrito, #totalCarrito').text('$0.00');
    return;
  }

  let html = '';
  let subtotalSinImpuesto = 0;

  carrito.forEach((item, i) => {
    const esUnidad = item.tipoUnidad === 'unidad';
    // Regla del propietario (2026-08-12): el precio incluye el impuesto y el impuesto es
    // el % (impuesto_ventas) del precio de venta. Neto = total × (1 − tasa).
    const precioNeto = item.total * (1 - Ventas._impuestoPorcentaje);

    html += `
    <div class="d-flex justify-content-between align-items-center mb-2 bg-white p-2 rounded">
      <div>
        <small class="fw-bold">${item.nombre}</small>
        <br>
        <small class="text-muted">${Utils.formatNumber(item.cantidad, esUnidad ? 0 : 1)} ${item.unidadAbrev} × ${Utils.formatMoney(item.precio)}</small>
      </div>
      <div class="text-end">
        <span class="text-success fw-bold">${Utils.formatMoney(item.total)}</span>
        <br>
        <button class="btn btn-sm btn-outline-danger carrito-eliminar" data-index="${i}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `;
    subtotalSinImpuesto += precioNeto;

  });

  // Regla del propietario: total = neto ÷ (1 − tasa) ; impuesto = total × tasa
  const total = subtotalSinImpuesto / (1 - Ventas._impuestoPorcentaje);
  const impuesto = total * Ventas._impuestoPorcentaje;

  $carrito.html(html);
  $('#subtotalCarrito').text(Utils.formatMoney(subtotalSinImpuesto));
  $('#impuestoCarrito').text(Utils.formatMoney(impuesto));
  $('#totalCarrito').text(Utils.formatMoney(total));
  $('#btnCobrarEfectivo, #btnCobrarTarjeta, #btnVaciarCarrito').prop('disabled', false);

  $('.carrito-eliminar').on('click', function () {
    const i = $(this).data('index');
    Ventas._carrito.splice(i, 1);
    Ventas.actualizarCarritoUI();
  });
};

Ventas.mostrarPopupCantidad = async function (id, nombre, precio, unidadAbrev, tipoUnidad) {
  const esUnidad = tipoUnidad === 'unidad';
  const unidad = Utils.getNombreUnidad(unidadAbrev);
  const inputMode = esUnidad ? 'numeric' : 'decimal';

  const modalHtml = `
    <div class="modal fade" id="cantidadModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">${nombre}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-center">
            <p class="text-muted mb-2">${Utils.formatMoney(precio)} / ${unidadAbrev}</p>
            
            <!-- Toggle: Cantidad / Precio -->
            <div class="btn-group btn-group-sm mb-3" role="group">
              <button type="button" class="btn btn-outline-primary active" id="modoCantidad">Cantidad</button>
              <button type="button" class="btn btn-outline-primary" id="modoPrecio">Precio</button>
            </div>
            
            <!-- Input Cantidad -->
            <div class="mb-3" id="divCantidad">
              <div class="input-group input-group-lg">
                <input type="text" class="form-control text-center fw-bold" id="cantidadInput" value="" inputmode="${inputMode}" placeholder="0" data-precio="${precio}">
                <span class="input-group-text">${unidadAbrev}</span>
              </div>
            </div>
            
            <!-- Input Precio (oculto por defecto) -->
            <div class="mb-3 d-none" id="divPrecio">
              <div class="input-group input-group-lg">
                <span class="input-group-text">$</span>
                <input type="text" class="form-control text-center fw-bold" id="precioInput" value="" inputmode="decimal" placeholder="0.00">
              </div>
              <small class="text-muted">Cantidad calculada automáticamente</small>
            </div>
            
            <!-- Teclado numérico -->
            <div class="teclado-numerico">
              ${['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map(tecla => `
                <button class="btn btn-outline-secondary btn-lg tecla-num" data-val="${tecla}" style="width:30%;margin:2px">${tecla}</button>
              `).join('')}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-success btn-lg" id="btnConfirmarCantidad">
              <i class="fas fa-cart-plus me-1"></i>Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  $('body').append(modalHtml);

  const modal = new bootstrap.Modal('#cantidadModal');
  modal.show();

  let modoActual = 'cantidad'; // 'cantidad' o 'precio'
  let inputActual = '#cantidadInput';

  // Toggle cantidad/precio
  $('#modoCantidad').on('click', function () {
    $(this).addClass('active');
    $('#modoPrecio').removeClass('active');
    $('#divCantidad').removeClass('d-none');
    $('#divPrecio').addClass('d-none');
    modoActual = 'cantidad';
    inputActual = '#cantidadInput';
    $(inputActual).focus().select();
  });

  $('#modoPrecio').on('click', function () {
    $(this).addClass('active');
    $('#modoCantidad').removeClass('active');
    $('#divCantidad').addClass('d-none');
    $('#divPrecio').removeClass('d-none');
    modoActual = 'precio';
    inputActual = '#precioInput';
    $(inputActual).focus().select();
  });

  // Teclado numérico
  $('.tecla-num').on('click', async function () {
    const val = $(this).data('val');
    const currentVal = $(inputActual).val();
    console.log({ currentVal, val, esUnidad });

    if (esUnidad && val === '.') {
      await Utils.confirm(
        'Este producto se vende por unidades enteras.\nNo se permiten decimales.',
        '⚠️ Unidades enteras'
      );
      return;
    }

    if (val === '⌫') {
      $(inputActual).val(currentVal.slice(0, -1) || '');
    } else if (val === '.') {
      if (!currentVal.includes('.')) {
        $(inputActual).val(currentVal + '.');
      }
    } else {
      if (currentVal === '0' || currentVal === '1' && document.activeElement === $(inputActual)[0]) {
        $(inputActual).val(val);
      } else {
        $(inputActual).val(currentVal + val);
      }
    }
    $(inputActual).trigger('input');
  });

  // Actualizar precio/cantidad calculada
  $('#cantidadInput').on('input', function () {
    const cantidad = parseFloat($(this).val()) || 0;
    const precioTotal = cantidad * precio;
    $('#precioTotalPopup').text(Utils.formatMoney(precioTotal));
  });

  $('#precioInput').on('input', function () {
    const precioIngresado = parseFloat($(this).val()) || 0;
    const cantidad = precioIngresado / precio;
    $('#cantidadInput').val(cantidad.toFixed(2));
  });

  // Teclas físicas (Enter)
  $(document).off('keydown.cantidadModal').on('keydown.cantidadModal', function (e) {
    if (e.key === 'Enter' && $('#cantidadModal').is(':visible')) {
      e.preventDefault();
      e.stopPropagation();
      productoConfirmado();
    }
  });

  // ✅ Confirmar $('#btnConfirmarCantidad').focus(); ...
  $('#btnConfirmarCantidad').on('click', function () {
    productoConfirmado();
  });

  async function productoConfirmado() {
    $('#btnConfirmarCantidad').focus();
    let cantidad;
    const precioIngresado = parseFloat($('#precioInput').val()) || 0;

    if (modoActual === 'precio' && precioIngresado > 0) {
      cantidad = precioIngresado / precio;

      // ✅ Si es tipo unidad, verificar que la cantidad sea entera
      if (esUnidad && !Number.isInteger(cantidad)) {
        const cantidadEntera = Math.floor(cantidad);
        const precioEntero = cantidadEntera * precio;
        await Utils.confirm(
          `Este producto se vende por unidades enteras.\n\n` +
          `El precio ingresado equivale a ${cantidad.toFixed(2)} unidades.\n` +
          `Sugerencia: ${cantidadEntera} unidades por ${Utils.formatMoney(precioEntero)}`,
          '⚠️ Unidades enteras'
        );
        return;
      }
    } else {
      cantidad = parseFloat($('#cantidadInput').val()) || 0;

      // ✅ Si es tipo unidad, verificar que la cantidad sea entera
      if (esUnidad && !Number.isInteger(cantidad)) {
        await Utils.confirm(
          'Este producto se vende por unidades enteras.\nNo se permiten decimales.',
          '⚠️ Unidades enteras'
        );
        return;
      }
    }

    if (cantidad <= 0) {
      Toast.warning('Ingrese una cantidad o precio válido');
      return;
    }

    Ventas.agregarAlCarrito(id, nombre, precio, unidadAbrev, cantidad, tipoUnidad);
    $('#btnConfirmarCantidad').blur();
    modal.hide();
  }

  $('#cantidadModal').on('hidden.bs.modal', function () {
    $(this).remove();
  });
};



Ventas.procesarVenta = async function (metodoPago) {
  if (Ventas._carrito.length === 0) return;

  const detalles = Ventas._carrito.map(item => ({
    producto_id: item.id,
    cantidad: item.cantidad
  }));

  // Obtener configuración de redondeo
  const config = await State.getConfig();
  console.log('procesarVenta. Config:', config);
  if (!config) {
    Toast.warning('Error al cargar la configuración. Intente de nuevo.');
    return;
  }
  const REDONDEO = config.redondeo_venta || 5;

  // Calcular total exacto. Regla del propietario: el precio incluye el impuesto y el
  // impuesto es el % (impuesto_ventas) del precio de venta. Neto = total × (1 − tasa).
  let subtotalSinImpuesto = 0;
  Ventas._carrito.forEach(item => {
    subtotalSinImpuesto += item.total * (1 - Ventas._impuestoPorcentaje);
  });
  subtotalSinImpuesto = Number(subtotalSinImpuesto.toFixed(2));
  const impuesto = Number((subtotalSinImpuesto * Ventas._impuestoPorcentaje / (1 - Ventas._impuestoPorcentaje)).toFixed(2));
  const totalExacto = subtotalSinImpuesto + impuesto;
  const totalRedondeado = REDONDEO > 0 ? Math.ceil(totalExacto / REDONDEO) * REDONDEO : totalExacto;
  const ajusteRedondeo = Number((totalRedondeado - totalExacto).toFixed(2));

  // Mostrar confirmación
  let mensaje = `Total a cobrar: ${totalRedondeado}`;
  if (ajusteRedondeo > 0) {
    mensaje += `\n(incluye ajuste por redondeo: ${ajusteRedondeo})`;
  }

  const confirmado = await Utils.confirm(mensaje, `Cobrar con ${metodoPago}`);
  if (!confirmado) return;

  try {
    Utils.showLoading('Procesando venta...');

    const result = await API.ventas.crear({
      detalles,
      metodo_pago: metodoPago,
      total_redondeado: totalRedondeado,
      ajuste_redondeo: ajusteRedondeo
    });

    Ventas._carrito = [];
    Ventas.actualizarCarritoUI();

    // ✅ Recargar productos (para actualizar stock)
    await Ventas.cargarProductos();
    Ventas.cargaFiltrosCategorias();
    Ventas.renderProductosGrid(Ventas._productosEnVenta);


    Utils.hideLoading();
    Toast.success(`Venta registrada - Total: ${totalRedondeado}`);

  } catch (error) {
    Utils.hideLoading();
    console.error('Error en venta:', error);
    Toast.warning(error.message);
  }
};

// ============================================
// LISTADO DE VENTAS
// ============================================
Ventas.initDataTable = function (ventas) {
  if (this.dataTable) this.dataTable.destroy();
  $.fn.dataTable.ext.errMode = 'none';

  const tableData = ventas.map(v => {
    const tipoBadge = v.tipo_venta === 'mayorista'
      ? `<span class="badge bg-warning text-dark">Mayorista</span>${v.cliente_nombre ? ` <small class="text-muted">${v.cliente_nombre}</small>` : ''}`
      : '<span class="badge bg-light text-dark border">Minorista</span>';
    return [
      `#${v.id}`,
      Utils.formatearFecha(Utils.fechaISOToLocal(v.created_at), 'corto'),
      tipoBadge,
      v.vendedor_nombre || '-',
      v.metodo_pago === 'efectivo' ? '<span class="badge bg-success">Efectivo</span>' : '<span class="badge bg-info">Tarjeta</span>',
      Utils.formatMoney(v.total),
      v.estado === 'anulada' ? '<span class="badge bg-danger">Anulada</span>' :
        `<div class="dropdown">
          <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><a class="dropdown-item ver-venta" href="#" data-id="${v.id}"><i class="fas fa-receipt me-2"></i>Ver Venta</a></li>
            <li><a class="dropdown-item ver-turno" href="#" data-turno="${v.turno_id}"><i class="fas fa-clock me-2"></i>Ver Turno</a></li>
            ${v.estado !== 'anulada' && State.isAdmin() ? `
              <li><a class="dropdown-item anular-venta text-danger" href="#" data-id="${v.id}">
                <i class="fas fa-undo me-2"></i>Anular Venta
              </a></li>
            ` : ''}
          </ul>
        </div>`,
      v.id,
      v.turno_id
    ];
  });

  this.dataTable = $('#ventasTable').DataTable({
    data: tableData,
    columns: [
      { data: 0, title: 'ID' },
      { data: 1, title: 'Fecha' },
      { data: 2, title: 'Tipo' },
      { data: 3, title: 'Vendedor' },
      { data: 4, title: 'Método' },
      { data: 5, title: 'Total', className: 'text-end' },
      { data: 6, title: '', orderable: false, className: 'text-center' },
      { data: 7, title: 'ID', visible: false },
      { data: 8, title: 'TurnoID', visible: false }
    ],
    order: [[7, 'desc']],
    language: {
      decimal: ",", thousands: ".",
      processing: "Procesando...",
      lengthMenu: "Mostrar _MENU_ registros",
      zeroRecords: "No se encontraron resultados",
      emptyTable: "Ninguna venta en este período",
      info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
      search: "Buscar:", searchPlaceholder: "Buscar...",
      paginate: { first: "Primero", last: "Último", next: "Siguiente", previous: "Anterior" }
    },
    pageLength: 25,
    responsive: true,
    drawCallback: function () {
      const $table = $(this);
      const rows = $table.DataTable().rows({ page: 'current' }).count();

      $table.find('.empty-row').remove();

      if (rows > 0 && rows < 5) {
        const tbody = $table.find('tbody');
        const emptyRows = 5 - rows;
        const colCount = $table.find('thead th').length;
        for (let i = 0; i < emptyRows; i++) {
          tbody.append(`<tr class="empty-row" style="height: 45px;"><td colspan="${colCount}">&nbsp;</td></tr>`);
        }
      }

      $('#ventasTable tbody tr').addClass('clickable-row');
    }
  });
};

Ventas.listado = async function (params) {
  console.log('📋 Cargando historial de ventas', params);

  try {
    Utils.showLoading('Cargando...');

    // Obtener rango según filtro
    let inicio, fin;
    const filtroFecha = params.filtroFecha || 'hoy';

    switch (filtroFecha) {
      case 'hoy':
        const r = Utils.rangoHoy();
        inicio = r.inicio; fin = r.fin;
        break;
      case 'ayer':
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        const ra = Utils.rangoDia(ayer);
        inicio = ra.inicio; fin = ra.fin;
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
      case 'personalizado':
        inicio = params.fechaDesde ? new Date(params.fechaDesde + 'T00:00:00').toISOString() : null;
        fin = params.fechaHasta ? new Date(params.fechaHasta + 'T23:59:59').toISOString() : null;
        break;
    }

    const ventas = await API.ventas.listar({
      inicio, fin,
      metodo_pago: params.filtroMetodo || 'todas',
      busqueda: params.busqueda || ''
    });

    const layout = Ventas.renderListadoLayout(ventas, params);
    $('#app').html(layout);

    Ventas.initDataTable(ventas);
    Ventas.bindListadoEvents(params);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error('Error:', error);
  }
};

Ventas.bindListadoEvents = function (params) {
  const self = this;

  // Filtro por fecha
  $('[data-filtro-fecha]').on('click', function () {
    const filtro = $(this).data('filtro-fecha');
    ViewManager.navegar('ventas/listado', { ...params, filtroFecha: filtro }, { replace: true });
  });

  // Filtro por método
  $('[data-filtro-metodo]').on('click', function () {
    const metodo = $(this).data('filtro-metodo');
    ViewManager.navegar('ventas/listado', { ...params, filtroMetodo: metodo }, { replace: true });
  });

  // Rango personalizado
  $('#btnAplicarRango').on('click', function () {
    const desde = $('#fechaDesde').val();
    const hasta = $('#fechaHasta').val();
    if (desde && hasta) {
      ViewManager.navegar('ventas/listado', {
        ...params,
        filtroFecha: 'personalizado',
        fechaDesde: desde,
        fechaHasta: hasta
      }, { replace: true });
    }
  });

  // Búsqueda
  $('#buscarVenta').on('keypress', function (e) {
    if (e.key === 'Enter') {
      ViewManager.navegar('ventas/listado', {
        ...params,
        busqueda: $(this).val()
      }, { replace: true });
    }
  });

  // Doble clic en fila
  $('#ventasTable tbody').on('dblclick', 'tr', function () {
    if ($(this).hasClass('empty-row')) return;
    const row = Ventas.dataTable.row(this).data();
    const id = row[6];
    ViewManager.navegar('ventas/ver/' + id);
  });

  // Ver venta desde dropdown
  $('#ventasTable').on('click', '.ver-venta', function (e) {
    e.preventDefault();
    ViewManager.navegar('ventas/ver/' + $(this).data('id'));
  });

  // Ver turno desde dropdown
  $('#ventasTable').on('click', '.ver-turno', async function (e) {
    e.preventDefault();
    const turnoId = $(this).data('turno');
    try {
      Utils.showLoading('Cargando turno...');
      const resumen = await API.ventas.resumenTurno(turnoId);
      Utils.hideLoading();
      const layout = Ventas.verTurno(resumen);
      $('#app').html(layout);
      $('#btnVolver').on('click', () => ViewManager.volver());
      Ventas.bindCommonEvents();
    } catch (error) {
      Utils.hideLoading();
      console.error('Error:', error);
    }
  });

  // Anular venta desde dropdown (admin)
  $('#ventasTable').on('click', '.anular-venta', async function (e) {
    e.preventDefault();
    const id = $(this).data('id');

    const confirmado = await Utils.confirm(
      `¿Anular la venta #${id}?\n\nEl stock será devuelto automáticamente.\nEsta acción no se puede deshacer.`,
      '⚠️ Anular Venta'
    );

    if (!confirmado) return;

    try {
      Utils.showLoading('Anulando...');
      await API.ventas.anular(id);
      State.invalidateCache('ventas');
      State.invalidateCache('productos');
      Utils.hideLoading();
      Toast.success('Venta anulada. Stock devuelto.');
      ViewManager.refresh();
    } catch (error) {
      Utils.hideLoading();
      console.error(error);
    }
  });

  Ventas.bindCommonEvents();
};

Ventas.renderListadoLayout = function (ventas, params) {
  const user = State.getUser();
  const filtroFecha = params.filtroFecha || 'hoy';
  const filtroMetodo = params.filtroMetodo || 'todas';

  return `
    <div class="app-wrapper">
      ${Sidebar.render(State.isAdmin() ? 'ventas' : 'ventas/listado')}
      <main class="main-content">
        ${Ventas.renderNavbar(user)}
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#ventas">Ventas</a></li>
              <li class="breadcrumb-item active">Historial</li>
            </ol>
          </nav>
          
          <div class="d-flex align-items-center mb-4">
            <a href="#ventas" class="btn btn-outline-secondary me-3">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </a>
            <h2 class="mb-0"><i class="fas fa-history me-2"></i>Historial de Ventas</h2>
          </div>
          
          <!-- Filtros de fecha -->
          <div class="mb-2">
            <div class="btn-group">
              <button class="btn btn-outline-primary btn-sm ${filtroFecha === 'hoy' ? 'active' : ''}" data-filtro-fecha="hoy">Hoy</button>
              <button class="btn btn-outline-primary btn-sm ${filtroFecha === 'ayer' ? 'active' : ''}" data-filtro-fecha="ayer">Ayer</button>
              <button class="btn btn-outline-primary btn-sm ${filtroFecha === 'semana' ? 'active' : ''}" data-filtro-fecha="semana">Esta Semana</button>
              <button class="btn btn-outline-primary btn-sm ${filtroFecha === 'mes' ? 'active' : ''}" data-filtro-fecha="mes">Este Mes</button>
              <button class="btn btn-outline-primary btn-sm ${filtroFecha === 'personalizado' ? 'active' : ''}" data-filtro-fecha="personalizado">📅</button>
            </div>
            
            <div class="btn-group ms-2">
              <button class="btn btn-outline-success btn-sm ${filtroMetodo === 'todas' ? 'active' : ''}" data-filtro-metodo="todas">Todas</button>
              <button class="btn btn-outline-success btn-sm ${filtroMetodo === 'efectivo' ? 'active' : ''}" data-filtro-metodo="efectivo">💰 Efectivo</button>
              <button class="btn btn-outline-success btn-sm ${filtroMetodo === 'tarjeta' ? 'active' : ''}" data-filtro-metodo="tarjeta">💳 Tarjeta</button>
            </div>
          </div>
          
          <!-- Rango personalizado -->
          <div id="rangoPersonalizado" class="row g-2 mb-3 ${filtroFecha === 'personalizado' ? '' : 'd-none'}">
            <div class="col-auto">
              <input type="date" class="form-control form-control-sm" id="fechaDesde" value="${params.fechaDesde || ''}">
            </div>
            <div class="col-auto">
              <input type="date" class="form-control form-control-sm" id="fechaHasta" value="${params.fechaHasta || ''}">
            </div>
            <div class="col-auto">
              <button class="btn btn-primary btn-sm" id="btnAplicarRango">Aplicar</button>
            </div>
          </div>
          
          <!-- Búsqueda -->
          <div class="row mb-3">
            <div class="col-md-4">
              <div class="input-group input-group-sm">
                <span class="input-group-text"><i class="fas fa-search"></i></span>
                <input type="text" class="form-control" id="buscarVenta" placeholder="Buscar por ID o vendedor..." value="${params.busqueda || ''}">
              </div>
            </div>
          </div>
          
          <!-- Tabla DataTable -->
          <div class="table-responsive">
            <table class="table table-hover" id="ventasTable" style="width:100%">
              <thead class="table-light">
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Vendedor</th>
                  <th>Método</th>
                  <th class="text-end">Total</th>
                  <th class="text-center" style="width: 60px;"></th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `;
};

// ============================================
// Fichas de venta y turno
// ============================================

Ventas.ficha = async function (params) {
  const id = params.id;

  try {
    Utils.showLoading('Cargando venta...');
    const venta = await API.ventas.obtener(id);

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render(State.isAdmin() ? 'ventas' : 'ventas/listado')}
        <main class="main-content">
          ${Ventas.renderNavbar(State.getUser())}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                <li class="breadcrumb-item"><a href="#ventas">Ventas</a></li>
                <li class="breadcrumb-item"><a href="#ventas/listado">Historial</a></li>
                <li class="breadcrumb-item active">Venta #${venta.id}</li>
              </ol>
            </nav>
            <div class="d-flex justify-content-between align-items-center mb-4">
              <div class="d-flex align-items-center mb-4">
                <button class="btn btn-outline-secondary me-3" id="btnVolver">
                  <i class="fas fa-arrow-left me-1"></i>Volver
                </button>
                <h3 class="mb-0">
                  Venta #${venta.id}
                  <span class="badge bg-${venta.estado === 'completada' ? 'success' : 'danger'} ms-2">
                    ${venta.estado === 'completada' ? 'Completada' : 'Anulada'}
                  </span>
                </h3>
              </div>
              <div class="btn-group">
                ${venta.estado === 'completada' && State.isAdmin() ? `
                <button class="btn btn-danger" id="btnAnularVenta">
                  <i class="fas fa-undo me-1"></i>Anular Venta
                </button>
              ` : ''}
              </div>
            </div>
            <div class="row">
              <div class="col-lg-5">
                <div class="card mb-4">
                  <div class="card-header"><h5 class="mb-0">Información</h5></div>
                  <div class="card-body">
                    <div class="mb-3">
                      <label class="text-muted small">Fecha</label>
                      <p>${Utils.formatearFecha(Utils.fechaISOToLocal(venta.created_at), 'datetime')}</p>
                    </div>
                    <div class="mb-3">
                      <label class="text-muted small">Vendedor</label>
                      <p>${venta.vendedor_nombre || '-'}</p>
                    </div>
                    <div class="mb-3">
                      <label class="text-muted small">Método de pago</label>
                      <p>${venta.metodo_pago === 'efectivo' ? '💰 Efectivo' : '💳 Tarjeta'}</p>
                    </div>
                  </div>
                </div>
                
                <div class="card">
                  <div class="card-header"><h5 class="mb-0">Totales</h5></div>
                  <div class="card-body">
                    <div class="d-flex justify-content-between mb-2">
                      <span>Subtotal:</span>
                      <strong>${Utils.formatMoney(venta.subtotal)}</strong>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                      <span>Impuesto:</span>
                      <span>${Utils.formatMoney(venta.impuesto)}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                      <span>Ajuste redondeo:</span>
                      <span>${Utils.formatMoney(venta.ajuste_redondeo || 0)}</span>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between">
                      <span class="fw-bold">Total cobrado:</span>
                      <span class="fs-5 fw-bold text-primary">${Utils.formatMoney(venta.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="col-lg-7">
                <div class="card">
                  <div class="card-header"><h5 class="mb-0">Productos</h5></div>
                  <div class="card-body p-0">
                    <table class="table table-sm mb-0">
                      <thead class="table-light">
                        <tr>
                          <th>Producto</th>
                          <th class="text-end">Cantidad</th>
                          <th class="text-end">Precio</th>
                          <th class="text-end">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${venta.detalles.map(d => `
                          <tr>
                            <td>${d.producto_nombre}</td>
                            <td class="text-end">${Utils.formatNumber(d.cantidad, 1)}</td>
                            <td class="text-end">${Utils.formatMoney(d.precio_unitario)}</td>
                            <td class="text-end">${Utils.formatMoney(d.total)}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);

    $('#btnVolver').on('click', () => {
      console.log('Boton Volver presionado');
      ViewManager.volver();
    });

    $('.breadcrumb-back').on('click', (e) => {
      e.preventDefault();
      ViewManager.volver();
    });

    $('#btnAnularVenta').on('click', async function () {
      const confirmado = await Utils.confirm(
        `¿Anular la venta #${venta.id}?\n\n` +
        `Total: ${Utils.formatMoney(venta.total)}\n` +
        `El stock será devuelto automáticamente.\n\n` +
        `Esta acción no se puede deshacer.`,
        '⚠️ Anular Venta'
      );

      if (!confirmado) return;

      try {
        Utils.showLoading('Anulando venta...');
        await API.ventas.anular(venta.id);
        State.invalidateCache('ventas');
        State.invalidateCache('productos');
        Utils.hideLoading();
        Toast.success('Venta anulada. Stock devuelto.');
        ViewManager.refresh();
      } catch (error) {
        Utils.hideLoading();
        console.error(error);
      }
    });

    Ventas.bindCommonEvents();
    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error('Error:', error);
  }
};

Ventas.verTurno = function (resumen) {
  const t = resumen.turno;
  const ventasEfectivo = resumen.ventasPorMetodo.find(v => v.metodo_pago === 'efectivo')?.total || 0;
  const montoEsperado = (t.monto_apertura || 0) + ventasEfectivo;
  const duracion = t.horas ? `${Math.floor(t.horas)}h ${Math.round((t.horas % 1) * 60)}m` : 'N/A';

  return `
    <div class="app-wrapper">
      ${Sidebar.render(State.isAdmin() ? 'ventas' : 'ventas/listado')}
      <main class="main-content">
        ${Ventas.renderNavbar(State.getUser())}
        <div class="container-fluid p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#ventas">Ventas</a></li>
              <li class="breadcrumb-item active">Turno #${t.id}</li>
            </ol>
          </nav>
          
          <div class="d-flex align-items-center mb-4">
            <button class="btn btn-outline-secondary me-3" id="btnVolver">
              <i class="fas fa-arrow-left me-1"></i>Volver
            </button>
            <h2 class="mb-0">
              Turno #${t.id}
              <span class="badge bg-${t.estado === 'abierto' ? 'success' : 'secondary'} ms-2">
                ${t.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
              </span>
            </h2>
          </div>
          
          <!-- Info del turno -->
          <div class="row g-3 mb-4">
            <div class="col-md-3">
              <div class="card"><div class="card-body text-center">
                <small class="text-muted">Vendedor</small>
                <h6>${t.vendedor_nombre}</h6>
              </div></div>
            </div>
            <div class="col-md-3">
              <div class="card"><div class="card-body text-center">
                <small class="text-muted">Apertura</small>
                <h6>${Utils.formatearFecha(Utils.fechaISOToLocal(t.abierto_at), 'datetime')}</h6>
              </div></div>
            </div>
            ${t.cerrado_at ? `
              <div class="col-md-3">
                <div class="card"><div class="card-body text-center">
                  <small class="text-muted">Cierre</small>
                  <h6>${Utils.formatearFecha(Utils.fechaISOToLocal(t.cerrado_at), 'datetime')}</h6>
                </div></div>
              </div>
            ` : ''}
            <div class="col-md-3">
              <div class="card"><div class="card-body text-center">
                <small class="text-muted">${t.cerrado_at ? 'Duración' : 'Transcurrido'}</small>
                <h6>${duracion}</h6>
              </div></div>
            </div>
          </div>
          
          <div class="row">
            <div class="col-lg-6">
              <!-- Ventas -->
              <div class="card mb-4">
                <div class="card-header"><h5 class="mb-0"><i class="fas fa-chart-pie me-2"></i>Ventas</h5></div>
                <div class="card-body">
                  ${resumen.ventasPorMetodo.map(v => `
                    <div class="d-flex justify-content-between mb-2">
                      <span>${v.metodo_pago === 'efectivo' ? '💰 Efectivo' : '💳 Tarjeta'}:</span>
                      <span><strong>${v.cantidad}</strong> ventas - ${Utils.formatMoney(v.total)}</span>
                    </div>
                  `).join('')}
                  <hr>
                  <div class="d-flex justify-content-between fw-bold">
                    <span>TOTAL:</span>
                    <span>${resumen.totales.total_ventas} ventas - ${Utils.formatMoney(resumen.totales.total_cobrado)}</span>
                  </div>
                </div>
              </div>
              
              ${Ventas.renderDesgloseTurno(resumen.desglose_prioridades)}
            </div>
            
            <div class="col-lg-6">
              <!-- Productos vendidos -->
              <div class="card mb-4">
                <div class="card-header"><h5 class="mb-0"><i class="fas fa-box me-2"></i>Productos Vendidos</h5></div>
                <div class="card-body p-0">
                  <table class="table table-sm mb-0">
                    <thead><tr><th>Producto</th><th class="text-end">Cantidad</th><th class="text-end">Total</th></tr></thead>
                    <tbody>
                      ${resumen.productosVendidos.length > 0 ? resumen.productosVendidos.map(p => `
                        <tr>
                          <td>${p.nombre}</td>
                          <td class="text-end">${p.unidad_venta_tipo === 'unidad' ? Math.floor(p.cantidad_total) : Utils.formatNumber(p.cantidad_total, 1)} ${p.unidad_venta_abrev}</td>
                          <td class="text-end">${Utils.formatMoney(p.total_vendido)}</td>
                        </tr>
                      `).join('') : '<tr><td colspan="3" class="text-center text-muted py-3">Sin ventas</td></tr>'}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <!-- Arqueo de Caja -->
              <div class="card">
                <div class="card-header"><h5 class="mb-0"><i class="fas fa-cash-register me-2"></i>Arqueo de Caja</h5></div>
                <div class="card-body">
                  ${t.estado === 'cerrado' ? `
                    <div class="d-flex justify-content-between mb-2">
                      <span>Monto esperado:</span>
                      <strong>${Utils.formatMoney(t.monto_cierre_esperado)}</strong>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                      <span>Monto contado:</span>
                      <strong>${Utils.formatMoney(t.monto_cierre_real)}</strong>
                    </div>
                    <div class="d-flex justify-content-between">
                      <span>Diferencia:</span>
                      <strong class="${t.diferencia === 0 ? 'text-success' : t.diferencia > 0 ? 'text-success' : 'text-danger'}">
                        ${t.diferencia > 0 ? '+' : ''}${Utils.formatMoney(t.diferencia)}
                      </strong>
                    </div>
                  ` : `
                    <div class="d-flex justify-content-between mb-2">
                      <span>Monto esperado en caja:</span>
                      <strong>${Utils.formatMoney(montoEsperado)}</strong>
                    </div>
                    <small class="text-muted">Apertura ${Utils.formatMoney(t.monto_apertura)} + Ventas efectivo ${Utils.formatMoney(ventasEfectivo)}</small>
                    <div class="mt-3">
                      <span class="badge bg-success">🟢 Turno abierto</span>
                      <small class="text-muted ms-2">${duracion} transcurridos</small>
                    </div>
                  `}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
};


// ============================================
// MÉTODOS AUXILIARES
// ============================================
Ventas.renderNavbar = function (user) {
  return `
    <nav class="navbar navbar-light bg-white border-bottom px-3">
      <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
      <div class="d-flex align-items-center ms-auto">
        <span class="me-3"><i class="fas fa-user me-1"></i>${user?.nombre_completo || 'Admin'}</span>
      </div>
    </nav>
  `;
};

Ventas.bindCommonEvents = function () {
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

// ============================================
// ENCARGOS (pedidos minoristas, Sprint 6)
// ============================================
Ventas.encargos = async function (params) {
  try {
    Utils.showLoading('Cargando encargos...');
    const pedidos = await API.mayoristas.listarPedidos('?tipo=minorista');

    const estadoBadge = {
      pendiente: '<span class="badge bg-warning text-dark">Pendiente</span>',
      entregado: '<span class="badge bg-success">Entregado</span>',
      cancelado: '<span class="badge bg-secondary">Cancelado</span>'
    };

    const filas = pedidos.map(p => `
      <tr class="${p.vencido ? 'table-danger' : ''}" style="cursor:pointer" onclick="ViewManager.navegar('ventas/encargos/${p.id}')">
        <td><strong>#${p.id}</strong>${p.vencido ? ' <span class="badge bg-danger">VENCIDO</span>' : ''}</td>
        <td>${p.cliente_nombre || '—'}</td>
        <td>${Utils.formatearFecha(Utils.fechaISOToLocal(p.fecha), 'fecha')}</td>
        <td>${p.fecha_vencimiento ? Utils.formatearFecha(Utils.fechaISOToLocal(p.fecha_vencimiento), 'fecha') : '—'}</td>
        <td class="text-center">${estadoBadge[p.estado] || p.estado}</td>
        <td class="text-end fw-bold">${Utils.formatMoney(p.total)}</td>
      </tr>
    `).join('');

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('ventas')}
        <main class="main-content">
          <nav class="navbar navbar-light bg-white border-bottom px-3">
            <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
            <div class="d-flex align-items-center ms-auto">
              <span class="me-3"><i class="fas fa-user me-1"></i>${State.getUser()?.nombre_completo || ''}</span>
            </div>
          </nav>
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3"><ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#ventas">Ventas</a></li>
              <li class="breadcrumb-item active">Encargos</li>
            </ol></nav>
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h2 class="mb-0"><i class="fas fa-bookmark me-2"></i>Encargos</h2>
              <button class="btn btn-primary" data-route="ventas/encargos/nuevo"><i class="fas fa-plus me-1"></i>Nuevo Encargo</button>
            </div>
            <div class="card"><div class="card-body p-0">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr><th>#</th><th>Cliente</th><th>Fecha</th><th>Vence</th><th class="text-center">Estado</th><th class="text-end">Total</th></tr>
                </thead>
                <tbody>${filas || '<tr><td colspan="6" class="text-center text-muted py-4">No hay encargos</td></tr>'}</tbody>
              </table>
            </div></div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Ventas.bindCommonEvents();
    $('[data-route]').on('click', function () { const r = $(this).data('route'); if (r) ViewManager.navegar(r); });
    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error(error);
    Toast.error('Error al cargar encargos');
  }
};

Ventas.encargoNuevo = async function () {
  try {
    Utils.showLoading('Cargando...');
    const productos = await API.productos.listar();
    const validos = productos.filter(p => p.activo && p.precio_venta > 0);

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('ventas')}
        <main class="main-content">
          <nav class="navbar navbar-light bg-white border-bottom px-3">
            <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
            <div class="d-flex align-items-center ms-auto">
              <span class="me-3"><i class="fas fa-user me-1"></i>${State.getUser()?.nombre_completo || ''}</span>
            </div>
          </nav>
          <div class="container-fluid p-4">
            <div class="d-flex align-items-center mb-4">
              <button class="btn btn-outline-secondary me-3" id="btnVolver"><i class="fas fa-arrow-left me-1"></i>Volver</button>
              <h2 class="mb-0"><i class="fas fa-bookmark me-2"></i>Nuevo Encargo</h2>
            </div>
            <div class="row">
              <div class="col-lg-8">
                <div class="card mb-3"><div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-5">
                      <label class="form-label">Nombre del cliente *</label>
                      <input type="text" class="form-control" id="encCliente" placeholder="Quien encarga...">
                    </div>
                    <div class="col-md-3">
                      <label class="form-label">Vencimiento</label>
                      <input type="date" class="form-control" id="encVencimiento">
                    </div>
                    <div class="col-md-4">
                      <label class="form-label">Observaciones</label>
                      <input type="text" class="form-control" id="encObs" placeholder="Teléfono, referencia...">
                    </div>
                  </div>
                </div></div>
                <div class="card">
                  <div class="card-header d-flex gap-2 align-items-end">
                    <div class="flex-grow-1">
                      <select class="form-select form-select-sm" id="encProducto">
                        <option value="">— Agregar producto —</option>
                        ${validos.map(p => `<option value="${p.id}" data-precio="${p.precio_venta}" data-unidad="${p.unidad_venta_abrev || ''}">${p.nombre} (${Utils.formatMoney(p.precio_venta)})</option>`).join('')}
                      </select>
                    </div>
                    <div style="width:110px"><input type="number" class="form-control form-control-sm" id="encCantidad" step="0.01" min="0.01" value="1"></div>
                    <button class="btn btn-sm btn-primary" id="btnAgregarLinea"><i class="fas fa-plus"></i></button>
                  </div>
                  <div class="card-body p-0">
                    <table class="table table-sm mb-0">
                      <thead class="table-light"><tr><th>Producto</th><th class="text-end">Cantidad</th><th class="text-end">Precio</th><th class="text-end">Total</th><th></th></tr></thead>
                      <tbody id="lineasBody"><tr id="lineasVacio"><td colspan="5" class="text-center text-muted py-3">Agrega productos al encargo</td></tr></tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div class="col-lg-4">
                <div class="card">
                  <div class="card-header"><strong>Resumen</strong></div>
                  <div class="card-body">
                    <div class="d-flex justify-content-between fs-4"><span>Total:</span><strong id="encTotal" class="text-primary">0.00</strong></div>
                    <div class="d-grid mt-3"><button class="btn btn-primary" id="btnGuardarEncargo"><i class="fas fa-save me-1"></i>Guardar Encargo</button></div>
                    <small class="text-muted d-block mt-2">Se cobra al entregar (efectivo o tarjeta). El stock se descuenta en ese momento.</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Ventas.bindCommonEvents();
    $('#btnVolver').on('click', () => ViewManager.volver());

    const lineas = [];
    const actualizarTotal = () => {
      const total = lineas.reduce((s, l) => s + l.total, 0);
      $('#encTotal').text(Utils.formatMoney(total));
    };

    $('#btnAgregarLinea').on('click', function () {
      const prodId = parseInt($('#encProducto').val());
      const cantidad = parseFloat($('#encCantidad').val());
      if (!prodId || !cantidad || cantidad <= 0) return Toast.warning('Selecciona producto y cantidad');

      const opt = $('#encProducto option:selected');
      const existente = lineas.find(l => l.producto_id === prodId);
      if (existente) {
        existente.cantidad += cantidad;
        existente.total = existente.cantidad * existente.precio_unitario;
      } else {
        lineas.push({
          producto_id: prodId, nombre: opt.text().split(' (')[0], unidad: opt.data('unidad'),
          cantidad, precio_unitario: parseFloat(opt.data('precio')), total: parseFloat(opt.data('precio')) * cantidad
        });
      }

      $('#lineasVacio').hide();
      $('#lineasBody').find('tr.linea').remove();
      lineas.forEach((l, i) => {
        $('#lineasBody').append(`
          <tr class="linea">
            <td>${l.nombre}</td>
            <td class="text-end">${Utils.formatNumber(l.cantidad, 2)} ${l.unidad}</td>
            <td class="text-end">${Utils.formatMoney(l.precio_unitario)}</td>
            <td class="text-end fw-bold">${Utils.formatMoney(l.total)}</td>
            <td class="text-center"><button class="btn btn-sm btn-outline-danger quitar-linea" data-i="${i}"><i class="fas fa-times"></i></button></td>
          </tr>
        `);
      });
      $('.quitar-linea').on('click', function () {
        lineas.splice(parseInt($(this).data('i')), 1);
        $(this).closest('tr').remove();
        if (lineas.length === 0) $('#lineasVacio').show();
        actualizarTotal();
      });
      actualizarTotal();
    });

    $('#btnGuardarEncargo').on('click', async function () {
      const clienteNombre = $('#encCliente').val().trim();
      if (!clienteNombre) return Toast.warning('Indica el nombre del cliente');
      if (lineas.length === 0) return Toast.warning('Agrega al menos un producto');

      try {
        Utils.showLoading('Guardando...');
        const res = await API.mayoristas.crearPedido({
          tipo: 'minorista',
          cliente_nombre: clienteNombre,
          fecha_vencimiento: $('#encVencimiento').val() || null,
          observaciones: $('#encObs').val().trim() || null,
          detalles: lineas.map(l => ({ producto_id: l.producto_id, cantidad: l.cantidad }))
        });
        Utils.hideLoading();
        Toast.success('Encargo creado');
        ViewManager.navegar(`ventas/encargos/${res.id}`);
      } catch (error) {
        Utils.hideLoading();
        Toast.error(error.message || 'Error al guardar');
      }
    });

    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error(error);
    Toast.error('Error al cargar el formulario');
  }
};

Ventas.encargoFicha = async function (params) {
  try {
    Utils.showLoading('Cargando...');
    const p = await API.mayoristas.obtenerPedido(params.id);

    const estadoBadge = {
      pendiente: '<span class="badge bg-warning text-dark">Pendiente</span>',
      entregado: '<span class="badge bg-success">Entregado</span>',
      cancelado: '<span class="badge bg-secondary">Cancelado</span>'
    };

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('ventas')}
        <main class="main-content">
          <nav class="navbar navbar-light bg-white border-bottom px-3">
            <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
            <div class="d-flex align-items-center ms-auto">
              <span class="me-3"><i class="fas fa-user me-1"></i>${State.getUser()?.nombre_completo || ''}</span>
            </div>
          </nav>
          <div class="container-fluid p-4">
            <div class="d-flex align-items-center mb-4">
              <button class="btn btn-outline-secondary me-3" id="btnVolver"><i class="fas fa-arrow-left me-1"></i>Volver</button>
              <h2 class="mb-0 me-3">Encargo #${p.id}</h2>
              ${estadoBadge[p.estado]}
            </div>
            <div class="row g-4">
              <div class="col-lg-7">
                <div class="card mb-3"><div class="card-body">
                  <div class="row">
                    <div class="col-6"><small class="text-muted">Cliente</small><p class="fw-bold">${p.cliente_nombre || '—'}</p></div>
                    <div class="col-6"><small class="text-muted">Fecha</small><p>${Utils.formatearFecha(Utils.fechaISOToLocal(p.fecha), 'fecha')}</p></div>
                    <div class="col-6"><small class="text-muted">Vence</small><p>${p.fecha_vencimiento ? Utils.formatearFecha(Utils.fechaISOToLocal(p.fecha_vencimiento), 'fecha') : '—'}</p></div>
                    <div class="col-6"><small class="text-muted">Observaciones</small><p>${p.observaciones || '—'}</p></div>
                  </div>
                </div></div>
                <div class="card">
                  <div class="card-header"><strong>Productos</strong></div>
                  <div class="card-body p-0">
                    <table class="table table-sm mb-0">
                      <thead class="table-light"><tr><th>Producto</th><th class="text-end">Cantidad</th><th class="text-end">Total</th></tr></thead>
                      <tbody>
                        ${p.detalles.map(d => `<tr><td>${d.producto_nombre}</td><td class="text-end">${Utils.formatNumber(d.cantidad, 2)} ${d.unidad_abrev || ''}</td><td class="text-end">${Utils.formatMoney(d.total)}</td></tr>`).join('')}
                      </tbody>
                      <tfoot class="table-light">
                        <tr><th colspan="2">TOTAL</th><th class="text-end fs-5">${Utils.formatMoney(p.total)}</th></tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
              <div class="col-lg-5">
                <div class="card">
                  <div class="card-header"><strong>Acciones</strong></div>
                  <div class="card-body d-grid gap-2">
                    ${p.estado === 'pendiente' ? `
                      <button class="btn btn-success" id="btnEntregarEfectivo"><i class="fas fa-money-bill me-1"></i>Entregar y Cobrar (Efectivo)</button>
                      <button class="btn btn-info" id="btnEntregarTarjeta"><i class="fas fa-credit-card me-1"></i>Entregar y Cobrar (Tarjeta)</button>
                      <button class="btn btn-outline-danger" id="btnCancelarEncargo"><i class="fas fa-ban me-1"></i>Cancelar Encargo</button>
                    ` : ''}
                    ${p.estado === 'entregado' && p.venta_id ? `<a href="#ventas/ver/${p.venta_id}" class="btn btn-outline-primary"><i class="fas fa-receipt me-1"></i>Ver la venta #${p.venta_id}</a>` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Ventas.bindCommonEvents();
    $('#btnVolver').on('click', () => ViewManager.volver());

    const entregar = async (metodo) => {
      if (!await Utils.confirm(`¿Entregar y cobrar ${Utils.formatMoney(p.total)} por ${metodo}? Se descuenta el stock y entra en las ventas del día.`, 'Confirmar entrega')) return;
      try {
        await API.mayoristas.entregarPedido(p.id, { metodo_pago: metodo });
        Toast.success('Encargo entregado y cobrado');
        ViewManager.refresh();
      } catch (error) { Toast.error(error.message); }
    };
    $('#btnEntregarEfectivo').on('click', () => entregar('efectivo'));
    $('#btnEntregarTarjeta').on('click', () => entregar('tarjeta'));

    $('#btnCancelarEncargo').on('click', async function () {
      if (!await Utils.confirm('¿Cancelar este encargo?', 'Confirmar')) return;
      try {
        await API.mayoristas.cancelarPedido(p.id);
        Toast.success('Encargo cancelado');
        ViewManager.navegar('ventas/encargos');
      } catch (error) { Toast.error(error.message); }
    });

    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error(error);
    Toast.error('Error al cargar el encargo');
  }
};

window.Ventas = Ventas;