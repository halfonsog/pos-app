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
                      <p class="text-muted small">${turno.vendedor_nombre} - ${Utils.formatDate(turno.abierto_at, 'datetime')}</p>
                    ` : ''}
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="summary-mini-card">
                  <h4>${ventasHoy.total_ventas || 0}</h4>
                  <p>Ventas Hoy</p>
                </div>
              </div>
              <div class="col-md-3">
                <div class="summary-mini-card text-success">
                  <h4>${Utils.formatMoney(ventasHoy.total_general || 0)}</h4>
                  <p>Total Facturado</p>
                </div>
              </div>
              <div class="col-md-3">
                <div class="summary-mini-card text-primary">
                  <h4>${Utils.formatMoney(turno.monto_apertura || 0)}</h4>
                  <p>Monto Apertura</p>
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
            </div>
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
                <input type="number" class="form-control form-control-lg" id="montoApertura" value="100" step="1" min="0" required autofocus>
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
    const f = resumen.financiero;

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
                
                <!-- Rentabilidad -->
                <div class="card mb-4">
                  <div class="card-header"><h5 class="mb-0"><i class="fas fa-calculator me-2"></i>Rentabilidad</h5></div>
                  <div class="card-body">
                    <div class="d-flex justify-content-between mb-2">
                      <span>(+) Venta total:</span>
                      <span>${Utils.formatMoney(f.ventaTotal)}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                      <span>(-) Impuestos:</span>
                      <span>${Utils.formatMoney(f.impuestos)}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2 fw-bold">
                      <span>(=) Venta neta:</span>
                      <span>${Utils.formatMoney(f.ventaNeta)}</span>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between mb-2 text-danger">
                      <span>(-) Costo base:</span>
                      <span>${Utils.formatMoney(f.costoBase)}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2 text-danger">
                      <span>(-) Gastos fijos:</span>
                      <span>${Utils.formatMoney(f.gastosFijos)}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2 fw-bold">
                      <span>(=) Margen:</span>
                      <span class="text-success">${Utils.formatMoney(f.margen)}</span>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between mb-2">
                      <span>(+) Ajuste redondeo:</span>
                      <span>${Utils.formatMoney(f.ajusteRedondeo)}</span>
                    </div>
                    <div class="d-flex justify-content-between fw-bold">
                      <span>(=) Ganancia neta:</span>
                      <span class="text-primary fs-5">${Utils.formatMoney(f.gananciaNeta)}</span>
                    </div>
                  </div>
                </div>
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
                            <td class="text-end">${Utils.formatNumber(p.cantidad_total, 2)} ${p.abreviatura}</td>
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

    try {
      Utils.showLoading('Cerrando turno...');
      await API.ventas.cerrarTurno({ monto_real: total });
      Utils.hideLoading();
      Toast.success('Turno cerrado correctamente');
      ViewManager.volver();
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

    const productos = await API.productos.listar();
    // Filtrar productos que pueden venderse
    const productosEnVenta = productos.filter(p => {
      // 1. Producto activo
      if (!p.activo) return false;

      // 2. Tiene ficha de costo con precio > 0
      if (!p.precio_venta || p.precio_venta <= 0) return false;

      // 3. Tiene stock (según tipo)
      if (p.tipo === 'simple') {
        // Simples: stock_actual > 0
        if (p.stock_actual <= 0) return false;
      } else if (p.tipo === 'compuesto') {
        if (p.requiere_preparacion) {
          // Compuestos preparables: deben tener stock del producto preparado > 0
          if (p.stock_actual <= 0) return false;
        } else {
          // Compuestos no preparables: necesitan stock de todos los componentes
          // Esto ya lo calcula el backend en stock_efectivo
          if (!p.stock_efectivo || p.stock_efectivo <= 0) return false;
        }
      }

      return true;
    });

    Ventas._carrito = [];
    const config = State.getConfig();
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
                
                <div class="row g-2" id="productosGrid">
                  ${productosEnVenta.map(p => `
                    <div class="col-6 col-md-4 col-lg-3">
                      <div class="card producto-card h-100" data-id="${p.id}" data-nombre="${p.nombre}" data-precio="${p.precio_venta}" data-unidad="${p.unidad_venta_abrev}">
                        <div class="card-body text-center p-2">
                          ${p.foto
        ? `<img src="/uploads/productos/${p.foto}" class="producto-img mb-2">`
        : `<img src="${Utils.getProductPlaceholder(p, p.id, 80)}" class="producto-img mb-2">`
      }
                          <h6 class="mb-0 small">${p.nombre}</h6>
                          <span class="fw-bold text-success">${Utils.formatMoney(p.precio_venta)}</span>
                          <div class="mt-1">
                            <span class="badge bg-secondary small">Stock: ${Utils.formatNumber(p.stock_actual, 0)} ${p.unidad_venta_abrev || 'uds'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
              
              <!-- Carrito -->
              <div class="col-lg-4 bg-light p-3 d-flex flex-column" style="border-left: 1px solid #dee2e6;">
                <h5 class="mb-3"><i class="fas fa-shopping-cart me-2"></i>Carrito</h5>
                
                <div id="carritoItems" style="flex: 1; overflow-y: auto;">
                  <p class="text-muted text-center py-4">No hay productos en el carrito</p>
                </div>
                
                <div class="border-top pt-3">
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

    Ventas.mostrarPopupCantidad(id, nombre, precio, unidadAbrev);
  });

  // Búsqueda
  $('#buscarProducto').on('input', function () {
    const search = $(this).val().toLowerCase();
    $('.producto-card').each(function () {
      const nombre = $(this).data('nombre').toLowerCase();
      $(this).toggle(nombre.includes(search));
    });
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

Ventas.agregarAlCarrito = function (id, nombre, precio, unidadAbrev, cantidad) {
  const existente = Ventas._carrito.find(item => item.id === id);
  if (existente) {

    cantidadExistente = existente.cantidad;

    console.log('item existe:', { cantidadExistente, cantidad });
    existente.cantidad += cantidad;
    existente.total = existente.cantidad * existente.precio;
  } else {
    const unidad = Utils.getNombreUnidad(unidadAbrev);
    console.log('agregarAlCarrito', { id, nombre, precio, unidadAbrev, cantidad, unidad });
    Ventas._carrito.push({
      id: id,
      nombre: nombre,
      precio: precio,
      cantidad: cantidad,
      total: cantidad * precio,
      unidadAbrev: unidadAbrev,
      unidad: unidad || ''
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
    //    subtotalSinImpuesto += item.total / (1 + Ventas._impuestoPorcentaje);
    const precioNeto = item.total * (1 - Ventas._impuestoPorcentaje);

    html += `
    <div class="d-flex justify-content-between align-items-center mb-2 bg-white p-2 rounded">
      <div>
        <small class="fw-bold">${item.nombre}</small>
        <br>
        <small class="text-muted">${Utils.formatNumber(item.cantidad, item.unidadAbrev === 'ud' ? 0 : 2)} ${item.unidadAbrev} × ${Utils.formatMoney(item.precio)}</small>
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

Ventas.mostrarPopupCantidad = function (id, nombre, precio, unidadAbrev) {
  const esUnidad = unidadAbrev === 'ud' || unidadAbrev === 'Unidad';
  const unidad = Utils.getNombreUnidad(unidadAbrev);
  const cantidadDefault = esUnidad ? 1 : 1;
  const stepValue = esUnidad ? '1' : '0.01';

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
              <input type="text" class="form-control text-center fw-bold" id="cantidadInput" value="${cantidadDefault}" inputmode="decimal" data-precio="${precio}">
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
  $('.tecla-num').on('click', function () {
    const val = $(this).data('val');
    const currentVal = $(inputActual).val();

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

  function productoConfirmado() {
    $('#btnConfirmarCantidad').focus();
    let cantidad;
    const precioIngresado = parseFloat($('#precioInput').val()) || 0;

    if (modoActual === 'precio' && precioIngresado > 0) {
      cantidad = precioIngresado / precio;
    } else {
      cantidad = parseFloat($('#cantidadInput').val()) || 0;
    }

    if (cantidad <= 0) {
      Toast.warning('Ingrese una cantidad o precio válido');
      return;
    }
    Ventas.agregarAlCarrito(id, nombre, precio, unidadAbrev, cantidad);
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
  const config = State.getConfig();
  const REDONDEO = config.redondeo_venta || 5;

  // Calcular total exacto
  let subtotalSinImpuesto = 0;
  Ventas._carrito.forEach(item => {
    subtotalSinImpuesto += item.total / (1 + Ventas._impuestoPorcentaje);
  });
  subtotalSinImpuesto = Number(subtotalSinImpuesto.toFixed(2));
  const impuesto = Number((subtotalSinImpuesto * Ventas._impuestoPorcentaje).toFixed(2));
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
    Ventas.bindListadoEvents(params);

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error('Error:', error);
  }
};

Ventas.bindListadoEvents = function (params) {
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

  // Ver venta
  $('#ventasTable').on('click', '.ver-venta', function (e) {
    e.preventDefault();
    ViewManager.navegar('ventas/ver/' + $(this).data('id'));
  });

  // Ver turno
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

  // Doble click = ver venta
  $('#ventasTable tbody').on('dblclick', 'tr', function () {
    const id = $(this).data('id');
    ViewManager.navegar('ventas/ver/' + id);
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
          
          <!-- Tabla -->
          <div class="table-responsive">
            <table class="table table-hover" id="ventasTable">
              <thead class="table-light">
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Vendedor</th>
                  <th>Método</th>
                  <th class="text-end">Total</th>
                  <th class="text-center" style="width: 60px;"></th>
                </tr>
              </thead>
              <tbody>
                ${ventas.length > 0 ? ventas.map(v => `
                  <tr class="clickable" data-id="${v.id}" data-turno="${v.turno_id}">
                    <td>#${v.id}</td>
                    <td>${Utils.formatearFecha(v.created_at, 'corto')}</td>
                    <td>${v.vendedor_nombre || '-'}</td>
                    <td>${v.metodo_pago === 'efectivo' ? '<span class="badge bg-success">Efectivo</span>' : '<span class="badge bg-info">Tarjeta</span>'}</td>
                    <td class="text-end fw-bold">${Utils.formatMoney(v.total)}</td>
                    <td class="text-center">
                      <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
                          <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                          <li><a class="dropdown-item ver-venta" href="#" data-id="${v.id}"><i class="fas fa-receipt me-2"></i>Ver Venta</a></li>
                          <li><a class="dropdown-item ver-turno" href="#" data-turno="${v.turno_id}"><i class="fas fa-clock me-2"></i>Ver Turno</a></li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                `).join('') : '<tr><td colspan="6" class="text-center text-muted py-3">No hay ventas en este período</td></tr>'}
              </tbody>
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
            
            <div class="d-flex align-items-center mb-4">
              <button class="btn btn-outline-secondary me-3" id="btnVolver">
                <i class="fas fa-arrow-left me-1"></i>Volver
              </button>
              <h2 class="mb-0">
                Venta #${venta.id}
                <span class="badge bg-${venta.estado === 'completada' ? 'success' : 'danger'} ms-2">
                  ${venta.estado === 'completada' ? 'Completada' : 'Anulada'}
                </span>
              </h2>
            </div>
            
            <div class="row">
              <div class="col-lg-5">
                <div class="card mb-4">
                  <div class="card-header"><h5 class="mb-0">Información</h5></div>
                  <div class="card-body">
                    <div class="mb-3">
                      <label class="text-muted small">Fecha</label>
                      <p>${Utils.formatDate(venta.created_at, 'datetime')}</p>
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
                            <td class="text-end">${Utils.formatNumber(d.cantidad, 2)}</td>
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

    $('#btnVolver').on('click', () => ViewManager.volver());
    $('.breadcrumb-back').on('click', (e) => { e.preventDefault(); ViewManager.volver(); });

    Ventas.bindCommonEvents();
    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error('Error:', error);
  }
};

Ventas.verTurno = function (resumen) {
  const t = resumen.turno;
  const f = resumen.financiero;
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
                <h6>${Utils.formatDate(t.abierto_at, 'datetime')}</h6>
              </div></div>
            </div>
            ${t.cerrado_at ? `
              <div class="col-md-3">
                <div class="card"><div class="card-body text-center">
                  <small class="text-muted">Cierre</small>
                  <h6>${Utils.formatDate(t.cerrado_at, 'datetime')}</h6>
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
              
              <!-- Rentabilidad -->
              <div class="card mb-4">
                <div class="card-header"><h5 class="mb-0"><i class="fas fa-calculator me-2"></i>Rentabilidad</h5></div>
                <div class="card-body">
                  <div class="d-flex justify-content-between mb-2">
                    <span>(+) Venta total:</span>
                    <span>${Utils.formatMoney(f.ventaTotal)}</span>
                  </div>
                  <div class="d-flex justify-content-between mb-2">
                    <span>(-) Impuestos:</span>
                    <span>${Utils.formatMoney(f.impuestos)}</span>
                  </div>
                  <div class="d-flex justify-content-between mb-2 fw-bold">
                    <span>(=) Venta neta:</span>
                    <span>${Utils.formatMoney(f.ventaNeta)}</span>
                  </div>
                  <hr>
                  <div class="d-flex justify-content-between mb-2 text-danger">
                    <span>(-) Costo base:</span>
                    <span>${Utils.formatMoney(f.costoBase)}</span>
                  </div>
                  <div class="d-flex justify-content-between mb-2 text-danger">
                    <span>(-) Gastos fijos:</span>
                    <span>${Utils.formatMoney(f.gastosFijos)}</span>
                  </div>
                  <div class="d-flex justify-content-between mb-2 fw-bold">
                    <span>(=) Margen:</span>
                    <span class="text-success">${Utils.formatMoney(f.margen)}</span>
                  </div>
                  <hr>
                  <div class="d-flex justify-content-between mb-2">
                    <span>(+) Ajuste redondeo:</span>
                    <span>${Utils.formatMoney(f.ajusteRedondeo)}</span>
                  </div>
                  <div class="d-flex justify-content-between fw-bold">
                    <span>(=) Ganancia neta:</span>
                    <span class="text-primary fs-5">${Utils.formatMoney(f.gananciaNeta)}</span>
                  </div>
                </div>
              </div>
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
                          <td class="text-end">${Utils.formatNumber(p.cantidad_total, 2)} ${p.abreviatura}</td>
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

window.Ventas = Ventas;