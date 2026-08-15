/**
 * configuracion.js - Módulo de configuración unificado
 * Incluye: Parámetros generales, Gastos fijos, Categorías, Unidades, Términos de pago
 */

var Configuracion = window.Configuracion || {};

// ============================================
// VISTA PRINCIPAL (INDEX)
// ============================================
Configuracion.index = async function () {
  console.log('⚙️ Cargando configuración');

  const user = State.getUser();

  const layout = `
    <div class="app-wrapper">
      ${Sidebar.render('configuracion')}
      <main class="main-content">
        ${Configuracion.renderNavbar(user)}
        
        <div class="container-fluid p-4">
          <h2 class="mb-4"><i class="fas fa-cog me-2"></i>Configuración del Sistema</h2>
          
          <div class="row g-4">
            <div class="col-md-6 col-lg-4">
              <div class="card clickable h-100" data-route="configuracion/general" style="cursor: pointer;">
                <div class="card-body text-center">
                  <i class="fas fa-chart-line fa-3x text-primary mb-3"></i>
                  <h5>Parámetros Generales</h5>
                  <p class="text-muted">Ventas proyectadas, impuestos, márgenes</p>
                </div>
              </div>
            </div>
            <div class="col-md-6 col-lg-4">
              <div class="card clickable h-100" data-route="configuracion/gastos" style="cursor: pointer;">
                <div class="card-body text-center">
                  <i class="fas fa-money-bill fa-3x text-warning mb-3"></i>
                  <h5>Gastos Fijos</h5>
                  <p class="text-muted">Alquiler, salarios, servicios</p>
                </div>
              </div>
            </div>
            <div class="col-md-6 col-lg-4">
              <div class="card clickable h-100" data-route="configuracion/categorias" style="cursor: pointer;">
                <div class="card-body text-center">
                  <i class="fas fa-folder fa-3x text-info mb-3"></i>
                  <h5>Categorías</h5>
                  <p class="text-muted">Categorías de productos</p>
                </div>
              </div>
            </div>
            <div class="col-md-6 col-lg-4">
              <div class="card clickable h-100" data-route="configuracion/unidades" style="cursor: pointer;">
                <div class="card-body text-center">
                  <i class="fas fa-ruler fa-3x text-success mb-3"></i>
                  <h5>Unidades de Medida</h5>
                  <p class="text-muted">Unidades de compra y venta</p>
                </div>
              </div>
            </div>
            <div class="col-md-6 col-lg-4">
              <div class="card clickable h-100" data-route="configuracion/denominaciones" style="cursor: pointer;">
                <div class="card-body text-center">
                  <i class="fas fa-money-bill-wave fa-3x text-success mb-3"></i>
                  <h5>Denominaciones</h5>
                  <p class="text-muted">Billetes y monedas para conteo</p>
                </div>
              </div>
            </div>
            <div class="col-md-6 col-lg-4">
              <div class="card clickable h-100" data-route="configuracion/terminos" style="cursor: pointer;">
                <div class="card-body text-center">
                  <i class="fas fa-credit-card fa-3x text-danger mb-3"></i>
                  <h5>Términos de Pago</h5>
                  <p class="text-muted">Contado, 15 días, 30 días</p>
                </div>
              </div>
            </div>
            <div class="col-md-6 col-lg-4">
              <div class="card clickable h-100" data-route="configuracion/usuarios" style="cursor: pointer;">
                <div class="card-body text-center">
                  <i class="fas fa-users fa-3x text-primary mb-3"></i>
                  <h5>Usuarios y Empleados</h5>
                  <p class="text-muted">Credenciales de acceso y personal</p>
                </div>
              </div>
            </div>
            <div class="col-md-6 col-lg-4">
              <div class="card clickable h-100" data-route="configuracion/prestamos" style="cursor: pointer;">
                <div class="card-body text-center">
                  <i class="fas fa-hand-holding-usd fa-3x text-success mb-3"></i>
                  <h5>Préstamos e Inversiones</h5>
                  <p class="text-muted">Seguimiento y vencimientos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  $('#app').html(layout);
  Configuracion.bindIndexEvents();
};

// ============================================
// PARÁMETROS GENERALES
// ============================================
Configuracion.general = async function () {
  console.log('📊 Cargando parámetros generales');

  try {
    Utils.showLoading('Cargando...');

    const config = await API.configuracion.obtenerGeneral();

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('configuracion')}
        <main class="main-content">
          ${Configuracion.renderNavbar(State.getUser())}
          
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Configuración</a></li>
                <li class="breadcrumb-item active">Parámetros Generales</li>
              </ol>
            </nav>
            
            <div class="d-flex align-items-center mb-4">
              <button class="btn btn-outline-secondary me-3" id="btnVolver">
                <i class="fas fa-arrow-left me-1"></i>Volver
              </button>
              <h2 class="mb-0"><i class="fas fa-chart-line me-2"></i>Parámetros Generales</h2>
            </div>
            
            <div class="row">
              <div class="col-lg-6">
                <div class="card">
                  <div class="card-header"><h5 class="mb-0">Configuración de Costos y Precios</h5></div>
                  <div class="card-body">
                    <form id="generalForm">
                      <div class="mb-3">
                        <label class="form-label">Ventas Proyectadas Mensuales ($)</label>
                        <input type="number" class="form-control" id="ventasProyectadas" 
                               value="${config.ventas_proyectadas}" step="100" min="0">
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Margen Recomendado (%)</label>
                        <input type="number" class="form-control" id="margenRecomendado" 
                               value="${config.margen_recomendado}" step="1" min="0" max="100">
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Impuesto sobre Ventas (%)</label>
                        <input type="number" class="form-control" id="impuestoVentas" 
                               value="${config.impuesto_ventas}" step="0.5" min="0" max="100">
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Impuesto sobre la Ganancia (%)</label>
                        <input type="number" class="form-control" id="impuestoGanancia" 
                              value="${config.impuesto_ganancia || 35}" step="1" min="0" max="100">
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Redondeo de Venta ($)</label>
                        <input type="number" class="form-control" id="redondeoVenta" 
                              value="${config.redondeo_venta || 5}" step="1" min="0">
                        <small class="text-muted">
                          Las ventas se redondean al múltiplo de este valor.<br>
                          Ej: 5 = redondea a 5, 10, 15... | 0 = sin redondeo
                        </small>
                      </div>
                      <hr>
                      <h6 class="text-muted"><i class="fas fa-file-invoice-dollar me-1"></i>Parámetros tributarios (ONAT)</h6>
                      <div class="mb-3">
                        <label class="form-label">Salario Mínimo ($/mes)</label>
                        <input type="number" class="form-control" id="salarioMinimo" 
                              value="${config.salario_minimo ?? 3260}" step="1" min="0">
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Base de Contribución Especial ($/mes)</label>
                        <input type="number" class="form-control" id="baseContribucion" 
                              value="${config.base_contribucion_especial ?? 0}" step="1" min="0">
                        <small class="text-muted">Base mensual elegida en tu afiliación (tributo 0820132, trimestral).</small>
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Límite de escala de retención ($)</label>
                        <input type="number" class="form-control" id="limiteEscala" 
                              value="${config.limite_escala_retencion ?? 15000}" step="1" min="0">
                        <small class="text-muted">Retención a trabajadores para la seguridad social (tributo 0820232)</small>
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Día de pago de bonos</label>
                        <select class="form-select" id="diaPagoBonos">
                          ${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((d, i) => `<option value="${i}" ${(config.dia_pago_bonos ?? 5) === i ? 'selected' : ''}>${d}</option>`).join('')}
                        </select>
                      </div>
                      <hr>
                      <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>Resumen:</strong><br>
                        Gastos Fijos: <strong>${Utils.formatMoney(config.total_gastos_fijos || 0)}</strong><br>
                        Gasto Financiero del mes: <strong>${Utils.formatMoney(config.gasto_financiero_mes || 0)}</strong><br>
                        % Gastos total: <strong>${(config.porcentaje_gastos || 0).toFixed(2)}%</strong>
                      </div>
                      <div class="d-grid">
                        <button type="submit" class="btn btn-primary">
                          <i class="fas fa-save me-1"></i>Guardar Cambios
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Configuracion._bindVolver();
    Configuracion._bindGeneralSubmit();
    Configuracion.bindCommonEvents();

    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error('Error:', error);
  }
};

Configuracion._bindGeneralSubmit = function () {
  $('#generalForm').on('submit', async function (e) {
    e.preventDefault();
    const data = {
      ventas_proyectadas: parseFloat($('#ventasProyectadas').val()),
      margen_recomendado: parseFloat($('#margenRecomendado').val()),
      impuesto_ventas: parseFloat($('#impuestoVentas').val()),
      redondeo_venta: parseFloat($('#redondeoVenta').val()),
      impuesto_ganancia: parseFloat($('#impuestoGanancia').val()),
      salario_minimo: parseFloat($('#salarioMinimo').val()),
      base_contribucion_especial: parseFloat($('#baseContribucion').val()),
      limite_escala_retencion: parseFloat($('#limiteEscala').val()),
      dia_pago_bonos: parseInt($('#diaPagoBonos').val())
    };
    try {
      Utils.showLoading('Guardando...');
      await API.configuracion.actualizarGeneral(data);
      Utils.hideLoading();
      Toast.success('Configuración guardada');
      ViewManager.volver();
    } catch (error) {
      Utils.hideLoading();
      console.error('Error:', error);
    }
  });
};

// ============================================
// GASTOS FIJOS
// ============================================
Configuracion.gastos = async function () {
  console.log('💰 Cargando gastos fijos');

  try {
    Utils.showLoading('Cargando...');
    const data = await API.configuracion.listarGastos();
    const gastos = data.gastos || [];
    const total = data.total || 0;

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('configuracion')}
        <main class="main-content">
          ${Configuracion.renderNavbar(State.getUser())}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Configuración</a></li>
                <li class="breadcrumb-item active">Gastos Fijos</li>
              </ol>
            </nav>
            <div class="d-flex justify-content-between align-items-center mb-4">
              <div class="d-flex align-items-center">
                <button class="btn btn-outline-secondary me-3" id="btnVolver">
                  <i class="fas fa-arrow-left me-1"></i>Volver
                </button>
                <h2 class="mb-0"><i class="fas fa-money-bill me-2"></i>Gastos Fijos Mensuales</h2>
              </div>
              <button class="btn btn-primary" id="btnNuevoGasto">
                <i class="fas fa-plus me-1"></i>Nuevo Gasto
              </button>
            </div>
            <div class="row">
              <div class="col-lg-8">
                <div class="card">
                  <div class="card-body p-0">
                    <table class="table table-hover mb-0">
                      <thead class="table-light">
                        <tr><th>Concepto</th><th class="text-end">Valor Mensual</th><th class="text-center">Activo</th><th class="text-center" style="width: 100px;">Acciones</th></tr>
                      </thead>
                      <tbody id="gastosTableBody">
                        ${gastos.map(g => `
                          <tr data-id="${g.id}" class="${g.activo ? '' : 'text-muted'}">
                            <td>${g.concepto}</td>
                            <td class="text-end">${Utils.formatMoney(g.valor_mensual)}</td>
                            <td class="text-center">${g.activo ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-secondary">No</span>'}</td>
                            <td class="text-center">
                              <button class="btn btn-sm btn-outline-primary editar-gasto" data-id="${g.id}" data-concepto="${g.concepto}" data-valor="${g.valor_mensual}" data-activo="${g.activo}"><i class="fas fa-edit"></i></button>
                              <button class="btn btn-sm btn-outline-danger eliminar-gasto" data-id="${g.id}"><i class="fas fa-trash"></i></button>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                      <tfoot class="table-light">
                        <tr><th>TOTAL</th><th class="text-end">${Utils.formatMoney(total)}</th><th colspan="2"></th></tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      <!-- Modal para Gasto -->
      <div class="modal fade" id="gastoModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="gastoModalTitle">Nuevo Gasto</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="gastoForm">
                <input type="hidden" id="gastoId">
                <div class="mb-3"><label class="form-label">Concepto</label><input type="text" class="form-control" id="gastoConcepto" required></div>
                <div class="mb-3"><label class="form-label">Valor Mensual ($)</label><input type="number" class="form-control" id="gastoValor" step="0.01" min="0" required></div>
                <div class="mb-3"><div class="form-check"><input class="form-check-input" type="checkbox" id="gastoActivo" checked><label class="form-check-label">Gasto Activo</label></div></div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="btnGuardarGasto">Guardar</button>
            </div>
          </div>
        </div>
      </div>
    `;

    $('#app').html(layout);
    Configuracion._bindVolver();
    Configuracion._bindGastosEvents(gastos, total);
    Configuracion.bindCommonEvents();

    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error('Error:', error);
  }
};

Configuracion._bindGastosEvents = function (gastos, total) {
  let gastoModal = new bootstrap.Modal('#gastoModal');

  $('#btnNuevoGasto').on('click', () => {
    $('#gastoModalTitle').text('Nuevo Gasto');
    $('#gastoId').val('');
    $('#gastoConcepto').val('');
    $('#gastoValor').val('');
    $('#gastoActivo').prop('checked', true);
    gastoModal.show();
  });

  $('.editar-gasto').on('click', function () {
    $('#gastoModalTitle').text('Editar Gasto');
    $('#gastoId').val($(this).data('id'));
    $('#gastoConcepto').val($(this).data('concepto'));
    $('#gastoValor').val($(this).data('valor'));
    $('#gastoActivo').prop('checked', $(this).data('activo') === 1 || $(this).data('activo') === true);
    gastoModal.show();
  });

  $('#btnGuardarGasto').on('click', async function () {
    const id = $('#gastoId').val();
    const concepto = $('#gastoConcepto').val().trim();
    const valor = parseFloat($('#gastoValor').val());
    const activo = $('#gastoActivo').is(':checked');

    if (!concepto) { Toast.warning('Concepto requerido'); return; }
    if (isNaN(valor) || valor < 0) { Toast.warning('Valor válido requerido'); return; }

    try {
      Utils.showLoading('Guardando...');
      if (id) { await API.configuracion.actualizarGasto(id, { concepto, valor_mensual: valor, activo }); }
      else { await API.configuracion.crearGasto({ concepto, valor_mensual: valor }); }
      Utils.hideLoading();
      Toast.success('Gasto guardado');
      gastoModal.hide();
      ViewManager.refresh();
    } catch (error) {
      Utils.hideLoading();
      console.error('Error:', error);
    }
  });

  $('.eliminar-gasto').on('click', async function () {
    const id = $(this).data('id');
    const confirmado = await Utils.confirm('¿Eliminar este gasto?', 'Confirmar');
    if (!confirmado) return;
    try {
      Utils.showLoading('Eliminando...');
      await API.configuracion.eliminarGasto(id);
      Utils.hideLoading();
      Toast.success('Gasto eliminado');
      ViewManager.refresh();
    } catch (error) {
      Utils.hideLoading();
      console.error('Error:', error);
    }
  });
};

// ============================================
// CATEGORÍAS
// ============================================
Configuracion.categorias = async function () {
  console.log('📁 Cargando categorías');

  ViewManager.navegar('categorias', {}, { reset: true });
};

// ============================================
// UNIDADES DE MEDIDA
// ============================================
Configuracion.unidades = async function () {
  console.log('📏 Cargando unidades');

  try {
    Utils.showLoading('Cargando...');
    const unidades = await API.get('/configuracion/unidades');

    const layout = `
      <div class="app-wrapper">
        <main class="main-content p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Configuración</a></li>
              <li class="breadcrumb-item active">Unidades de Medida</li>
            </ol>
          </nav>
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="fas fa-ruler me-2"></i>Unidades de Medida</h2>
            <button class="btn btn-primary" id="btnNuevaUnidad">
              <i class="fas fa-plus me-1"></i>Nueva Unidad
            </button>
          </div>
          <div class="table-responsive">
            <table class="table table-hover">
              <thead class="table-light">
                <tr>
                  <th>Nombre</th>
                  <th>Abreviatura</th>
                  <th>Tipo</th>
                  <th class="text-center">Coeficiente</th>
                  <th class="text-center">Base</th>
                  <th class="text-center">Activo</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${unidades.map(u => `
                  <tr class="${u.activo ? '' : 'text-muted'}">
                    <td>${u.nombre}</td>
                    <td>${u.abreviatura}</td>
                    <td>
                      ${u.tipo === 'unidad' ? '<span class="badge bg-primary">Unidad</span>' :
        u.tipo === 'volumen' ? '<span class="badge bg-info">Volumen</span>' :
          u.tipo === 'peso' ? '<span class="badge bg-warning">Peso</span>' : '<span class="badge bg-secondary">Longitud</span>'}
                    </td>
                    <td class="text-center">${u.coeficiente}</td>
                    <td class="text-center">
                      ${u.es_base ? '<span class="badge bg-danger">Base</span>' : '<span class="badge bg-success">Custom</span>'}
                    </td>
                    <td class="text-center">
                      ${u.activo ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-secondary">No</span>'}
                    </td>
                    <td class="text-center">
                      ${u.id > 99 ? `
                        <button class="btn btn-sm btn-outline-primary editar-unidad" 
                          data-id="${u.id}" data-tipo="${u.tipo}" data-nombre="${u.nombre}" 
                          data-abrev="${u.abreviatura}" data-coef="${u.coeficiente}">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger eliminar-unidad" data-id="${u.id}">
                          <i class="fas fa-trash"></i>
                        </button>
                      ` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </main>
      </div>
      
      <!-- Modal para Unidad -->
      <div class="modal fade" id="unidadModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="unidadModalTitle">Nueva Unidad</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="unidadForm">
                <input type="hidden" id="unidadId">
                <div class="mb-3">
                  <label class="form-label">Unidad base</label>
                  <select class="form-select" id="unidadTipo" required>
                    <option value="">Seleccione...</option>
                    <option value="unidad">Unidad</option>
                    <option value="volumen">Volumen</option>
                    <option value="peso">Peso</option>
                    <option value="longitud">Longitud</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label">Nombre</label>
                  <input type="text" class="form-control" id="unidadNombre" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Abreviatura</label>
                  <input type="text" class="form-control" id="unidadAbrev" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Coeficiente</label>
                  <input type="number" class="form-control" id="unidadCoeficiente" 
                         step="0.0001" min="0.0001" required>
                  <small class="text-muted">
                    Respecto a la unidad base del tipo seleccionado
                  </small>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="btnGuardarUnidad">Guardar</button>
            </div>
          </div>
        </div>
      </div>
    `;

    $('#app').html(layout);
    Configuracion._bindVolver();
    Configuracion._bindUnidadesEvents();
    Configuracion.bindCommonEvents();

    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error('Error:', error);
  }
};

Configuracion._bindUnidadesEvents = function () {
  let modal = new bootstrap.Modal('#unidadModal');

  $('#btnNuevaUnidad').on('click', () => {
    $('#unidadModalTitle').text('Nueva Unidad');
    $('#unidadId').val('');
    $('#unidadTipo').val('');
    $('#unidadNombre').val('');
    $('#unidadAbrev').val('');
    $('#unidadCoeficiente').val('');
    modal.show();
  });

  $('.editar-unidad').on('click', function () {
    $('#unidadModalTitle').text('Editar Unidad');
    $('#unidadId').val($(this).data('id'));
    $('#unidadTipo').val($(this).data('tipo'));
    $('#unidadNombre').val($(this).data('nombre'));
    $('#unidadAbrev').val($(this).data('abrev'));
    $('#unidadCoeficiente').val($(this).data('coef'));
    modal.show();
  });

  $('#btnGuardarUnidad').on('click', async function () {
    const id = $('#unidadId').val();
    const tipo = $('#unidadTipo').val();
    const nombre = $('#unidadNombre').val().trim();
    const abreviatura = $('#unidadAbrev').val().trim();
    const coeficiente = parseFloat($('#unidadCoeficiente').val());

    if (!tipo || !nombre || !abreviatura) {
      Toast.warning('Todos los campos son requeridos');
      return;
    }
    if (isNaN(coeficiente) || coeficiente <= 0) {
      Toast.warning('El coeficiente debe ser mayor a 0');
      return;
    }

    const data = { tipo, nombre, abreviatura, coeficiente };

    try {
      Utils.showLoading('Guardando...');
      if (id) {
        await API.put(`/configuracion/unidades/${id}`, data);
      } else {
        await API.post('/configuracion/unidades', data);
      }
      State.invalidateCache('unidades');
      Utils.hideLoading();
      Toast.success('Unidad guardada');
      modal.hide();
      ViewManager.refresh();
    } catch (error) {
      Utils.hideLoading();
      console.error('Error:', error);
    }
  });

  $('.eliminar-unidad').on('click', async function () {
    const id = $(this).data('id');
    const confirmado = await Utils.confirm('¿Eliminar esta unidad?', 'Confirmar');
    if (!confirmado) return;

    try {
      Utils.showLoading('Eliminando...');
      await API.delete(`/configuracion/unidades/${id}`);
      State.invalidateCache('unidades');
      Utils.hideLoading();
      Toast.success('Unidad eliminada');
      ViewManager.refresh();
    } catch (error) {
      Utils.hideLoading();
      console.error('Error:', error);
    }
  });
};

// ============================================
// DENOMINACIONES
// ============================================
Configuracion.denominaciones = async function () {
  try {
    Utils.showLoading('Cargando...');
    const denom = await API.get('/configuracion/denominaciones/todas');

    const layout = `
      <div class="app-wrapper">
        <main class="main-content p-4">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
              <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Configuración</a></li>
              <li class="breadcrumb-item active">Denominaciones</li>
            </ol>
          </nav>
          
          <div class="d-flex align-items-center mb-4">
            <button class="btn btn-outline-secondary me-3" id="btnVolver"><i class="fas fa-arrow-left me-1"></i>Volver</button>
            <h2 class="mb-0"><i class="fas fa-money-bill-wave me-2"></i>Denominaciones para Conteo</h2>
          </div>
          
          <div class="row">
            <div class="col-lg-6">
              <div class="card">
                <div class="card-body p-0">
                  <table class="table table-hover mb-0">
                    <thead class="table-light">
                      <tr><th>Valor</th><th class="text-center">Activo</th><th class="text-center">Acción</th></tr>
                    </thead>
                    <tbody>
                      ${denom.map(d => `
                        <tr class="${d.activo ? '' : 'text-muted'}">
                          <td>${Utils.formatMoney(d.valor)}</td>
                          <td class="text-center">
                            <div class="form-check form-switch d-inline-block">
                              <input class="form-check-input toggle-denom" type="checkbox" data-id="${d.id}" ${d.activo ? 'checked' : ''}>
                            </div>
                          </td>
                          <td class="text-center">
                            ${d.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);

    $('.toggle-denom').on('change', async function () {
      const id = $(this).data('id');
      const activo = $(this).is(':checked');
      try {
        await API.put(`/configuracion/denominaciones/${id}`, { activo });
        State.invalidateCache('denominaciones');
        ViewManager.refresh();
      } catch (error) {
        console.error('Error:', error);
      }
    });

    Configuracion._bindVolver();
    Configuracion.bindCommonEvents();

    Utils.hideLoading();

  } catch (error) {
    Utils.hideLoading();
    console.error('Error:', error);
  }
};

// ============================================
// TÉRMINOS DE PAGO
// ============================================
Configuracion.terminos = async function () {
  console.log('💳 Cargando términos de pago');

  try {
    Utils.showLoading('Cargando...');
    const terminos = await API.get('/configuracion/terminos-pago');

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('configuracion')}
        <main class="main-content">
          ${Configuracion.renderNavbar(State.getUser())}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Configuración</a></li>
                <li class="breadcrumb-item active">Términos de Pago</li>
              </ol>
            </nav>
            <div class="d-flex justify-content-between align-items-center mb-4">
              <div class="d-flex align-items-center">
                <button class="btn btn-outline-secondary me-3" id="btnVolver"><i class="fas fa-arrow-left me-1"></i>Volver</button>
                <h2 class="mb-0"><i class="fas fa-credit-card me-2"></i>Términos de Pago</h2>
              </div>
              <button class="btn btn-primary" id="btnNuevoTermino"><i class="fas fa-plus me-1"></i>Nuevo</button>
            </div>
            <div class="row">
              <div class="col-lg-6">
                <div class="card">
                  <div class="card-body p-0">
                    <table class="table table-hover mb-0">
                      <thead class="table-light">
                        <tr><th>Nombre</th><th class="text-center">Días</th><th class="text-center">Activo</th><th class="text-center" style="width: 100px;">Acciones</th></tr>
                      </thead>
                      <tbody>
                        ${terminos.map(t => `
                          <tr class="${t.activo ? '' : 'text-muted'}">
                            <td>${t.nombre}</td>
                            <td class="text-center">${t.dias}</td>
                            <td class="text-center">${t.activo ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-secondary">No</span>'}</td>
                            <td class="text-center">
                              <button class="btn btn-sm btn-outline-primary editar-termino" data-id="${t.id}" data-nombre="${t.nombre}" data-dias="${t.dias}"><i class="fas fa-edit"></i></button>
                              <button class="btn btn-sm btn-outline-danger eliminar-termino" data-id="${t.id}"><i class="fas fa-trash"></i></button>
                            </td>
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
      
      <!-- Modal para Término de Pago -->
      <div class="modal fade" id="terminoModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="terminoModalTitle">Nuevo Término</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="terminoForm">
                <input type="hidden" id="terminoId">
                <div class="mb-3"><label class="form-label">Nombre</label><input type="text" class="form-control" id="terminoNombre" required></div>
                <div class="mb-3"><label class="form-label">Días</label><input type="number" class="form-control" id="terminoDias" min="0" required></div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="btnGuardarTermino">Guardar</button>
            </div>
          </div>
        </div>
      </div>
    `;

    $('#app').html(layout);
    Configuracion._bindVolver();
    Configuracion._bindTerminosEvents();
    Configuracion.bindCommonEvents();

    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error('Error:', error);
  }
};

Configuracion._bindTerminosEvents = function () {
  let modal = new bootstrap.Modal('#terminoModal');

  $('#btnNuevoTermino').on('click', () => {
    $('#terminoModalTitle').text('Nuevo Término de Pago');
    $('#terminoId').val('');
    $('#terminoNombre').val('');
    $('#terminoDias').val('');
    modal.show();
  });

  $('.editar-termino').on('click', function () {
    $('#terminoModalTitle').text('Editar Término de Pago');
    $('#terminoId').val($(this).data('id'));
    $('#terminoNombre').val($(this).data('nombre'));
    $('#terminoDias').val($(this).data('dias'));
    modal.show();
  });

  $('#btnGuardarTermino').on('click', async function () {
    const id = $('#terminoId').val();
    const nombre = $('#terminoNombre').val().trim();
    const dias = parseInt($('#terminoDias').val());

    if (!nombre) { Toast.warning('Nombre requerido'); return; }
    if (isNaN(dias) || dias < 0) { Toast.warning('Días válidos requeridos'); return; }

    try {
      Utils.showLoading('Guardando...');
      if (id) {
        await API.put(`/configuracion/terminos-pago/${id}`, { nombre, dias, activo: true });
      } else {
        await API.post('/configuracion/terminos-pago', { nombre, dias });
      }
      Utils.hideLoading();
      Toast.success('Término guardado');
      modal.hide();
      ViewManager.refresh();
    } catch (error) {
      Utils.hideLoading();
      console.error('Error:', error);
    }
  });

  $('.eliminar-termino').on('click', async function () {
    const id = $(this).data('id');
    const confirmado = await Utils.confirm('¿Eliminar este término de pago?', 'Confirmar');
    if (!confirmado) return;
    try {
      Utils.showLoading('Eliminando...');
      await API.delete(`/configuracion/terminos-pago/${id}`);
      Utils.hideLoading();
      Toast.success('Término eliminado');
      ViewManager.refresh();
    } catch (error) {
      Utils.hideLoading();
      console.error('Error:', error);
    }
  });
};


// ============================================
// USUARIOS Y EMPLEADOS (D18)
// PatrÃ³n estÃ¡ndar de mÃ³dulo: la primera vista es la LISTA DE EMPLEADOS.
// Pinchando en un empleado se abre su FICHA: datos del empleado + sus usuarios
// (aÃ±adir, activar/desactivar, restablecer contraseÃ±a, cambiar rol).
// Todo usuario pertenece a un empleado; un empleado puede tener varios o ninguno.
// ============================================
Configuracion.usuarios = async function () {
  console.log('ðŸ‘¥ Cargando empleados');

  try {
    Utils.showLoading('Cargando...');
    const empleados = await API.empleados.listar();

    const cargoLabel = { vendedor: 'Vendedor', administrador: 'Administrador', cajero: 'Cajero', otro: 'Otro' };

    const filas = empleados.map(e => `
      <tr class="empleado-row ${e.activo ? '' : 'text-muted'}" data-id="${e.id}" style="cursor:pointer">
        <td><strong>${e.nombre}</strong></td>
        <td>${cargoLabel[e.cargo] || e.cargo}</td>
        <td>${e.identificacion || 'â€”'}</td>
        <td class="text-center">${e.num_usuarios > 0 ? `<span class="badge bg-primary">${e.num_usuarios}</span>` : '<span class="text-muted">0</span>'}</td>
        <td class="text-center">${e.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
      </tr>
    `).join('');

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('configuracion')}
        <main class="main-content">
          ${Configuracion.renderNavbar(State.getUser())}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">ConfiguraciÃ³n</a></li>
                <li class="breadcrumb-item active">Usuarios y Empleados</li>
              </ol>
            </nav>
            <div class="d-flex justify-content-between align-items-center mb-4">
              <div class="d-flex align-items-center">
                <button class="btn btn-outline-secondary me-3" id="btnVolver">
                  <i class="fas fa-arrow-left me-1"></i>Volver
                </button>
                <h2 class="mb-0"><i class="fas fa-users me-2"></i>Empleados</h2>
              </div>
              <button class="btn btn-primary" id="btnNuevoEmpleado"><i class="fas fa-plus me-1"></i>Nuevo Empleado</button>
            </div>

            <div class="row">
              <div class="col-lg-9">
                <div class="card">
                  <div class="card-body p-0">
                    <table class="table table-hover mb-0">
                      <thead class="table-light">
                        <tr><th>Nombre</th><th>Cargo</th><th>IdentificaciÃ³n</th><th class="text-center">Usuarios</th><th class="text-center">Estado</th></tr>
                      </thead>
                      <tbody>${filas}</tbody>
                    </table>
                  </div>
                  <div class="card-footer text-muted small">
                    Pincha en un empleado para editar sus datos y gestionar sus usuarios (accesos a la app).
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Modal Nuevo Empleado -->
      <div class="modal fade" id="empleadoModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Nuevo Empleado</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3"><label class="form-label">Nombre *</label><input type="text" class="form-control" id="nuevoEmpNombre"></div>
              <div class="mb-3"><label class="form-label">IdentificaciÃ³n</label><input type="text" class="form-control" id="nuevoEmpIdentificacion"></div>
              <div class="mb-3">
                <label class="form-label">Cargo</label>
                <select class="form-select" id="nuevoEmpCargo">
                  <option value="vendedor">Vendedor</option>
                  <option value="administrador">Administrador</option>
                  <option value="cajero">Cajero</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="btnGuardarNuevoEmpleado">Guardar</button>
            </div>
          </div>
        </div>
      </div>
    `;

    $('#app').html(layout);
    Configuracion._bindVolver();
    Configuracion.bindCommonEvents();

    // Click en fila â†’ ficha del empleado
    $('.empleado-row').on('click', function () {
      ViewManager.navegar(`configuracion/empleados/${$(this).data('id')}`);
    });

    // Nuevo empleado
    const empleadoModal = new bootstrap.Modal('#empleadoModal');
    $('#btnNuevoEmpleado').on('click', () => {
      $('#nuevoEmpNombre').val('');
      $('#nuevoEmpIdentificacion').val('');
      $('#nuevoEmpCargo').val('vendedor');
      empleadoModal.show();
    });

    $('#btnGuardarNuevoEmpleado').on('click', async function () {
      const nombre = $('#nuevoEmpNombre').val().trim();
      if (!nombre) return Toast.warning('Indica el nombre del empleado');
      try {
        const res = await API.empleados.crear({
          nombre,
          identificacion: $('#nuevoEmpIdentificacion').val().trim() || null,
          cargo: $('#nuevoEmpCargo').val()
        });
        empleadoModal.hide();
        Toast.success('Empleado creado');
        ViewManager.navegar(`configuracion/empleados/${res.id}`);
      } catch (error) {
        Toast.error(error.message || 'Error al crear el empleado');
      }
    });

    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error('Error cargando empleados:', error);
    Toast.error('Error al cargar empleados');
  }
};

// FICHA DE EMPLEADO: datos + gestiÃ³n de sus usuarios
Configuracion.empleadoFicha = async function (params) {
  console.log('ðŸ‘¤ Cargando ficha de empleado', params);

  try {
    Utils.showLoading('Cargando...');
    const [empleados, usuarios] = await Promise.all([API.empleados.listar(), API.usuarios.listar()]);

    const empleado = empleados.find(e => e.id == params.id);
    if (!empleado) {
      Utils.hideLoading();
      Toast.error('Empleado no encontrado');
      return ViewManager.navegar('configuracion/usuarios');
    }
    const susUsuarios = usuarios.filter(u => u.empleado_id == empleado.id);
    const yoMismo = State.getUser()?.id;

    const filasUsuarios = susUsuarios.length === 0
      ? '<tr><td colspan="6" class="text-center text-muted py-3">Este empleado no tiene usuarios (sin acceso a la app)</td></tr>'
      : susUsuarios.map(u => `
        <tr class="${u.activo ? '' : 'text-muted'}">
          <td><strong>${u.username}</strong>${u.id === yoMismo ? ' <span class="badge bg-info">tú</span>' : ''}</td>
          <td><span class="badge bg-${u.rol === 'admin' ? 'danger' : 'primary'}">${u.rol === 'admin' ? 'Admin' : 'Vendedor'}</span></td>
          <td><small class="text-muted">${u.tipo_venta === 'ambas' ? 'Minorista + Mayorista' : u.tipo_venta === 'minorista' ? 'Minorista' : 'Mayorista'}</small></td>
          <td>${u.last_login ? Utils.formatearFecha(Utils.fechaISOToLocal(u.last_login), 'datetime') : '—'}</td>
          <td class="text-center">${u.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-primary editar-usuario" data-id="${u.id}" title="Editar rol"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-outline-warning reset-password" data-id="${u.id}" data-username="${u.username}" title="Restablecer contraseña"><i class="fas fa-key"></i></button>
            <button class="btn btn-sm btn-outline-${u.activo ? 'danger' : 'success'} toggle-usuario" data-id="${u.id}" data-activo="${u.activo}" title="${u.activo ? 'Desactivar' : 'Activar'}">
              <i class="fas fa-${u.activo ? 'ban' : 'check'}"></i>
            </button>
          </td>
        </tr>
      `).join('');

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('configuracion')}
        <main class="main-content">
          ${Configuracion.renderNavbar(State.getUser())}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                <li class="breadcrumb-item"><a href="#configuracion/usuarios" class="breadcrumb-back">Empleados</a></li>
                <li class="breadcrumb-item active">${empleado.nombre}</li>
              </ol>
            </nav>
            <div class="d-flex align-items-center mb-4">
              <button class="btn btn-outline-secondary me-3" id="btnVolver">
                <i class="fas fa-arrow-left me-1"></i>Volver
              </button>
              <h2 class="mb-0"><i class="fas fa-id-badge me-2"></i>${empleado.nombre}</h2>
            </div>

            <div class="row g-4">
              <div class="col-lg-5">
                <div class="card">
                  <div class="card-header"><strong><i class="fas fa-id-badge me-1"></i>Datos del empleado</strong></div>
                  <div class="card-body">
                    <div class="mb-3"><label class="form-label">Nombre *</label><input type="text" class="form-control" id="empNombre" value="${empleado.nombre}"></div>
                    <div class="mb-3"><label class="form-label">IdentificaciÃ³n</label><input type="text" class="form-control" id="empIdentificacion" value="${empleado.identificacion || ''}"></div>
                    <div class="mb-3">
                      <label class="form-label">Cargo</label>
                      <select class="form-select" id="empCargo">
                        ${['vendedor', 'administrador', 'cajero', 'otro'].map(c => `<option value="${c}" ${empleado.cargo === c ? 'selected' : ''}>${c[0].toUpperCase() + c.slice(1)}</option>`).join('')}
                      </select>
                    </div>
                    <div class="row g-2 mb-3">
                      <div class="col-4">
                        <label class="form-label">Salario mensual</label>
                        <input type="number" class="form-control" id="empSalario" value="${empleado.salario_mensual ?? 0}" step="0.01" min="0">
                      </div>
                      <div class="col-4">
                        <label class="form-label">Aporte corto plazo</label>
                        <input type="number" class="form-control" id="empAporteCP" value="${empleado.aporte_corto_plazo ?? 0}" step="0.01" min="0">
                      </div>
                      <div class="col-4">
                        <label class="form-label">Utilidades</label>
                        <input type="number" class="form-control" id="empUtilidades" value="${empleado.utilidades ?? 0}" step="0.01" min="0">
                      </div>
                    </div>
                    <div class="form-check mb-3">
                      <input class="form-check-input" type="checkbox" id="empActivo" ${empleado.activo ? 'checked' : ''}>
                      <label class="form-check-label">Empleado activo</label>
                    </div>
                    <button class="btn btn-primary" id="btnGuardarEmpleado"><i class="fas fa-save me-1"></i>Guardar datos</button>
                  </div>
                </div>
              </div>

              <div class="col-lg-7">
                <div class="card">
                  <div class="card-header d-flex justify-content-between align-items-center">
                    <strong><i class="fas fa-user-shield me-1"></i>Usuarios (acceso a la app)</strong>
                    <button class="btn btn-sm btn-primary" id="btnNuevoUsuario"><i class="fas fa-plus me-1"></i>AÃ±adir usuario</button>
                  </div>
                  <div class="card-body p-0">
                    <table class="table table-hover mb-0">
                      <thead class="table-light">
                        <tr><th>Usuario</th><th>Rol</th><th>Tipo de venta</th><th>Último acceso</th><th class="text-center">Estado</th><th class="text-center">Acciones</th></tr>
                      </thead>
                      <tbody>${filasUsuarios}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Modal Nuevo Usuario -->
      <div class="modal fade" id="usuarioModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Nuevo usuario para ${empleado.nombre}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3"><label class="form-label">Nombre de usuario *</label><input type="text" class="form-control" id="nuevoUsrUsername" autocomplete="off"></div>
              <div class="mb-3"><label class="form-label">ContraseÃ±a *</label><input type="password" class="form-control" id="nuevoUsrPassword" autocomplete="new-password"></div>
              <div class="mb-3">
                <label class="form-label">Rol</label>
                <select class="form-select" id="nuevoUsrRol">
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Tipo de venta asignado</label>
                <select class="form-select" id="nuevoUsrTipoVenta">
                  <option value="ambas">Minorista y Mayorista</option>
                  <option value="minorista">Solo Minorista</option>
                  <option value="mayorista">Solo Mayorista</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="btnGuardarNuevoUsuario">Guardar</button>
            </div>
          </div>
        </div>
      </div>
    `;

    $('#app').html(layout);
    Configuracion._bindVolver();
    Configuracion.bindCommonEvents();

    // Guardar datos del empleado
    $('#btnGuardarEmpleado').on('click', async function () {
      const nombre = $('#empNombre').val().trim();
      if (!nombre) return Toast.warning('El nombre es obligatorio');
      try {
        await API.empleados.actualizar(empleado.id, {
          nombre,
          identificacion: $('#empIdentificacion').val().trim() || null,
          cargo: $('#empCargo').val(),
          salario_mensual: parseFloat($('#empSalario').val()) || 0,
          aporte_corto_plazo: parseFloat($('#empAporteCP').val()) || 0,
          utilidades: parseFloat($('#empUtilidades').val()) || 0,
          activo: $('#empActivo').is(':checked') ? 1 : 0
        });
        Toast.success('Empleado actualizado');
        ViewManager.refresh();
      } catch (error) {
        Toast.error(error.message || 'Error al guardar');
      }
    });

    // Nuevo usuario para este empleado
    const usuarioModal = new bootstrap.Modal('#usuarioModal');
    $('#btnNuevoUsuario').on('click', () => {
      $('#nuevoUsrUsername').val('');
      $('#nuevoUsrPassword').val('');
      $('#nuevoUsrRol').val('vendedor');
      usuarioModal.show();
    });

    $('#btnGuardarNuevoUsuario').on('click', async function () {
      const username = $('#nuevoUsrUsername').val().trim();
      const password = $('#nuevoUsrPassword').val();
      if (!username) return Toast.warning('Indica el nombre de usuario');
      if (!password || password.length < 4) return Toast.warning('La contraseÃ±a debe tener al menos 4 caracteres');
      try {
        await API.usuarios.crear({
          username, password,
          nombre_completo: $('#empNombre').val().trim() || empleado.nombre,
          rol: $('#nuevoUsrRol').val(),
          tipo_venta: $('#nuevoUsrTipoVenta').val(),
          empleado_id: empleado.id
        });
        usuarioModal.hide();
        Toast.success('Usuario creado');
        ViewManager.refresh();
      } catch (error) {
        Toast.error(error.message || 'Error al crear el usuario');
      }
    });

    // Editar rol de un usuario (con modal, no prompt)
    $('.editar-usuario').on('click', async function () {
      const u = susUsuarios.find(x => x.id == $(this).data('id'));
      if (!u) return;
      FormModal.show({
        title: `Editar rol de "${u.username}"`,
        submitLabel: 'Guardar',
        fields: [{
          id: 'rol', label: 'Rol', type: 'select', value: u.rol, required: true,
          options: [{ value: 'vendedor', label: 'Vendedor' }, { value: 'admin', label: 'Administrador' }]
        }],
        onSubmit: async (v) => {
          try {
            await API.usuarios.actualizar(u.id, { rol: v.rol });
            Toast.success('Rol actualizado');
            ViewManager.refresh();
          } catch (error) {
            Toast.error(error.message || 'Error al actualizar');
            return false;
          }
        }
      });
    });

    // Restablecer contraseña (con modal, no prompt)
    $('.reset-password').on('click', async function () {
      const id = $(this).data('id');
      const username = $(this).data('username');
      FormModal.show({
        title: `Nueva contraseña para "${username}"`,
        submitLabel: 'Restablecer',
        fields: [{ id: 'password', label: 'Nueva contraseña (mínimo 4 caracteres)', type: 'password', required: true }],
        onSubmit: async (v) => {
          if (!v.password || v.password.length < 4) { Toast.warning('La contraseña debe tener al menos 4 caracteres'); return false; }
          try {
            await API.usuarios.resetPassword(id, v.password);
            Toast.success('Contraseña restablecida');
          } catch (error) {
            Toast.error(error.message || 'Error al restablecer la contraseña');
            return false;
          }
        }
      });
    });

    // Activar / desactivar usuario
    $('.toggle-usuario').on('click', async function () {
      const id = $(this).data('id');
      const activo = $(this).data('activo') === 1 || $(this).data('activo') === '1';
      if (!await Utils.confirm(`Â¿Seguro que deseas ${activo ? 'desactivar' : 'activar'} este usuario?`, 'Confirmar')) return;
      try {
        await API.usuarios.actualizar(id, { activo: activo ? 0 : 1 });
        Toast.success(`Usuario ${activo ? 'desactivado' : 'activado'}`);
        ViewManager.refresh();
      } catch (error) {
        Toast.error(error.message || 'Error al cambiar el estado');
      }
    });

    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error('Error cargando empleado:', error);
    Toast.error('Error al cargar el empleado');
  }
};

// ============================================
// PRÉSTAMOS E INVERSIONES (00-pendientes #3)
// ============================================
Configuracion.prestamos = async function () {
  console.log('💰 Cargando préstamos e inversiones');

  try {
    Utils.showLoading('Cargando...');
    const registros = await API.prestamosInversiones.listar();

    const filas = registros.map(r => `
      <tr class="prestamo-row ${r.estado === 'cancelado' ? 'text-muted' : ''}" data-id="${r.id}" style="cursor:pointer">
        <td><span class="badge bg-${r.tipo === 'prestamo' ? 'danger' : 'success'}">${r.tipo === 'prestamo' ? 'Préstamo' : 'Inversión'}</span></td>
        <td><strong>${r.descripcion}</strong></td>
        <td class="text-end">${Utils.formatMoney(r.capital_total)}</td>
        <td class="text-center">${r.plazo_meses}</td>
        <td class="text-center">${r.tasa_anual}%</td>
        <td class="text-end">${Utils.formatMoney(r.aporte_mes_actual)}</td>
        <td class="text-center">${r.vencimientos_pendientes > 0 ? `<span class="badge bg-warning text-dark">${r.vencimientos_pendientes}</span>` : '<span class="text-muted">0</span>'}</td>
        <td class="text-center">${r.estado === 'activo' ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Cancelado</span>'}</td>
      </tr>
    `).join('');

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('configuracion')}
        <main class="main-content">
          ${Configuracion.renderNavbar(State.getUser())}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                <li class="breadcrumb-item"><a href="#" class="breadcrumb-back">Configuración</a></li>
                <li class="breadcrumb-item active">Préstamos e Inversiones</li>
              </ol>
            </nav>
            <div class="d-flex justify-content-between align-items-center mb-4">
              <div class="d-flex align-items-center">
                <button class="btn btn-outline-secondary me-3" id="btnVolver">
                  <i class="fas fa-arrow-left me-1"></i>Volver
                </button>
                <h2 class="mb-0"><i class="fas fa-hand-holding-usd me-2"></i>Préstamos e Inversiones</h2>
              </div>
              <button class="btn btn-primary" id="btnNuevoPrestamo"><i class="fas fa-plus me-1"></i>Nuevo Registro</button>
            </div>

            <div class="card">
              <div class="card-body p-0">
                <table class="table table-hover mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Tipo</th><th>Descripción</th><th class="text-end">Capital</th>
                      <th class="text-center">Plazo (m)</th><th class="text-center">Tasa anual</th>
                      <th class="text-end">Aporte mes actual</th><th class="text-center">Pendientes</th><th class="text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>${filas || '<tr><td colspan="8" class="text-center text-muted py-4">No hay registros. Crea el primero con "Nuevo Registro".</td></tr>'}</tbody>
                </table>
              </div>
              <div class="card-footer text-muted small">
                El aporte del mes actual alimenta el gasto financiero del costeo (%gastos). Pincha en un registro para ver sus vencimientos y registrar pagos.
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Modal Nuevo Registro -->
      <div class="modal fade" id="prestamoModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Nuevo Préstamo / Inversión</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Tipo *</label>
                <select class="form-select" id="nuevoTipo">
                  <option value="prestamo">Préstamo (deuda que pagas)</option>
                  <option value="inversion">Inversión (capital que aportas)</option>
                </select>
              </div>
              <div class="mb-3"><label class="form-label">Descripción *</label><input type="text" class="form-control" id="nuevoDescripcion" placeholder="Ej: Préstamo banco para equipos"></div>
              <div class="row g-2">
                <div class="col-6 mb-3"><label class="form-label">Capital total *</label><input type="number" class="form-control" id="nuevoCapital" step="0.01" min="0.01"></div>
                <div class="col-6 mb-3"><label class="form-label">Plazo (meses) *</label><input type="number" class="form-control" id="nuevoPlazo" min="1" step="1"></div>
              </div>
              <div class="row g-2">
                <div class="col-6 mb-3"><label class="form-label">Tasa anual (%)</label><input type="number" class="form-control" id="nuevoTasa" step="0.01" min="0" value="0"></div>
                <div class="col-6 mb-3"><label class="form-label">Fecha de inicio *</label><input type="date" class="form-control" id="nuevoFechaInicio"></div>
              </div>
              <small class="text-muted">El primer vencimiento será el día 1 del mes siguiente a la fecha de inicio.</small>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="btnGuardarPrestamo">Crear y generar vencimientos</button>
            </div>
          </div>
        </div>
      </div>
    `;

    $('#app').html(layout);
    Configuracion._bindVolver();
    Configuracion.bindCommonEvents();

    $('.prestamo-row').on('click', function () {
      ViewManager.navegar(`configuracion/prestamos/${$(this).data('id')}`);
    });

    const prestamoModal = new bootstrap.Modal('#prestamoModal');
    $('#btnNuevoPrestamo').on('click', () => {
      $('#nuevoTipo').val('prestamo');
      $('#nuevoDescripcion').val('');
      $('#nuevoCapital').val('');
      $('#nuevoPlazo').val('');
      $('#nuevoTasa').val('0');
      $('#nuevoFechaInicio').val(Utils.fechaLocalToInput ? Utils.fechaLocalToInput(new Date()) : new Date().toISOString().split('T')[0]);
      prestamoModal.show();
    });

    $('#btnGuardarPrestamo').on('click', async function () {
      const data = {
        tipo: $('#nuevoTipo').val(),
        descripcion: $('#nuevoDescripcion').val().trim(),
        capital_total: parseFloat($('#nuevoCapital').val()),
        plazo_meses: parseInt($('#nuevoPlazo').val()),
        tasa_anual: parseFloat($('#nuevoTasa').val()) || 0,
        fecha_inicio: $('#nuevoFechaInicio').val()
      };
      if (!data.descripcion || !data.capital_total || !data.plazo_meses || !data.fecha_inicio) {
        return Toast.warning('Completa todos los campos obligatorios');
      }
      try {
        const res = await API.prestamosInversiones.crear(data);
        prestamoModal.hide();
        Toast.success('Registro creado con su tabla de vencimientos');
        ViewManager.navegar(`configuracion/prestamos/${res.id}`);
      } catch (error) {
        Toast.error(error.message || 'Error al crear el registro');
      }
    });

    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error('Error cargando préstamos:', error);
    Toast.error('Error al cargar préstamos e inversiones');
  }
};

// FICHA: detalle + vencimientos + registrar pagos + cancelar
Configuracion.prestamoFicha = async function (params) {
  console.log('💰 Cargando ficha de préstamo/inversión', params);

  try {
    Utils.showLoading('Cargando...');
    const r = await API.prestamosInversiones.obtener(params.id);

    const estadoBadge = { pendiente: '<span class="badge bg-warning text-dark">Pendiente</span>', pagado: '<span class="badge bg-success">Pagado</span>', parcial: '<span class="badge bg-info">Parcial</span>' };

    const filasVenc = r.vencimientos.map(v => `
      <tr class="${v.estado === 'pagado' ? 'text-muted' : ''}">
        <td class="text-center">${v.ordinal}</td>
        <td>${Utils.formatearFecha(Utils.fechaISOToLocal(v.fecha_vencimiento), 'fecha')}</td>
        <td class="text-end">${Utils.formatMoney(v.capital)}</td>
        <td class="text-end">${Utils.formatMoney(v.pago_capital)}</td>
        <td class="text-end">${Utils.formatMoney(v.tarifa)}</td>
        <td class="text-end fw-bold">${Utils.formatMoney(v.aporte)}</td>
        <td class="text-end">${Utils.formatMoney(v.monto_pagado)}</td>
        <td class="text-center">${estadoBadge[v.estado] || v.estado}</td>
        <td class="text-center">
          ${v.estado !== 'pagado' && r.estado === 'activo' ? `
            <button class="btn btn-sm btn-outline-success pagar-vencimiento" data-ordinal="${v.ordinal}" data-aporte="${v.aporte - v.monto_pagado}">
              <i class="fas fa-money-bill"></i>
            </button>` : ''}
        </td>
      </tr>
    `).join('');

    const layout = `
      <div class="app-wrapper">
        ${Sidebar.render('configuracion')}
        <main class="main-content">
          ${Configuracion.renderNavbar(State.getUser())}
          <div class="container-fluid p-4">
            <nav aria-label="breadcrumb" class="mb-3">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                <li class="breadcrumb-item"><a href="#configuracion/prestamos" class="breadcrumb-back">Préstamos e Inversiones</a></li>
                <li class="breadcrumb-item active">${r.descripcion}</li>
              </ol>
            </nav>
            <div class="d-flex justify-content-between align-items-center mb-4">
              <div class="d-flex align-items-center">
                <button class="btn btn-outline-secondary me-3" id="btnVolver">
                  <i class="fas fa-arrow-left me-1"></i>Volver
                </button>
                <h2 class="mb-0">
                  <span class="badge bg-${r.tipo === 'prestamo' ? 'danger' : 'success'} me-2">${r.tipo === 'prestamo' ? 'Préstamo' : 'Inversión'}</span>
                  ${r.descripcion}
                </h2>
              </div>
              ${r.estado === 'activo' ? `<button class="btn btn-outline-danger" id="btnCancelarRegistro"><i class="fas fa-ban me-1"></i>Cancelar registro</button>` : ''}
            </div>

            <div class="row g-3 mb-4">
              <div class="col-md-2"><div class="card"><div class="card-body p-2 text-center"><small class="text-muted">Capital total</small><h5 class="mb-0">${Utils.formatMoney(r.capital_total)}</h5></div></div></div>
              <div class="col-md-2"><div class="card"><div class="card-body p-2 text-center"><small class="text-muted">Plazo</small><h5 class="mb-0">${r.plazo_meses} m</h5></div></div></div>
              <div class="col-md-2"><div class="card"><div class="card-body p-2 text-center"><small class="text-muted">Tasa anual</small><h5 class="mb-0">${r.tasa_anual}%</h5></div></div></div>
              <div class="col-md-2"><div class="card"><div class="card-body p-2 text-center"><small class="text-muted">Pago capital</small><h5 class="mb-0">${Utils.formatMoney(r.pago_capital)}</h5></div></div></div>
              <div class="col-md-2"><div class="card"><div class="card-body p-2 text-center"><small class="text-muted">Inicio</small><h5 class="mb-0">${Utils.formatearFecha(Utils.fechaISOToLocal(r.fecha_inicio), 'fecha')}</h5></div></div></div>
              <div class="col-md-2"><div class="card"><div class="card-body p-2 text-center"><small class="text-muted">Estado</small><h5 class="mb-0">${r.estado === 'activo' ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Cancelado</span>'}</h5></div></div></div>
            </div>

            <div class="card">
              <div class="card-header"><strong><i class="fas fa-calendar-alt me-1"></i>Tabla de vencimientos</strong></div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table table-hover mb-0">
                    <thead class="table-light">
                      <tr>
                        <th class="text-center">#</th><th>Vencimiento</th><th class="text-end">Capital</th>
                        <th class="text-end">Pago capital</th><th class="text-end">Tarifa</th><th class="text-end">Aporte</th>
                        <th class="text-end">Pagado</th><th class="text-center">Estado</th><th class="text-center">Pagar</th>
                      </tr>
                    </thead>
                    <tbody>${filasVenc}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    $('#app').html(layout);
    Configuracion._bindVolver();
    Configuracion.bindCommonEvents();

    // Registrar pago en un vencimiento (con modal, no prompt)
    $('.pagar-vencimiento').on('click', async function () {
      const ordinal = $(this).data('ordinal');
      const pendiente = parseFloat($(this).data('aporte'));
      FormModal.show({
        title: `Pagar vencimiento #${ordinal}`,
        submitLabel: 'Registrar pago',
        fields: [{ id: 'monto', label: `Monto a pagar (pendiente: ${Utils.formatMoney(pendiente)})`, type: 'number', value: pendiente.toFixed(2), min: 0.01, step: 0.01, required: true }],
        onSubmit: async (v) => {
          if (!v.monto || v.monto <= 0) { Toast.warning('Monto inválido'); return false; }
          try {
            await API.prestamosInversiones.registrarPago(r.id, { ordinal, monto: v.monto });
            Toast.success('Pago registrado');
            ViewManager.refresh();
          } catch (error) {
            Toast.error(error.message || 'Error al registrar el pago');
            return false;
          }
        }
      });
    });

    // Cancelar registro
    $('#btnCancelarRegistro').on('click', async function () {
      if (!await Utils.confirm('¿Cancelar este registro? Sus vencimientos pendientes dejarán de contar en el gasto financiero.', 'Confirmar cancelación')) return;
      try {
        await API.prestamosInversiones.cancelar(r.id);
        Toast.success('Registro cancelado');
        ViewManager.navegar('configuracion/prestamos');
      } catch (error) {
        Toast.error(error.message || 'Error al cancelar');
      }
    });

    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error('Error cargando ficha:', error);
    Toast.error('Error al cargar el registro');
  }
};

// ============================================
// MÉTODOS AUXILIARES
// ============================================
Configuracion._bindVolver = function () {
  $('#btnVolver').on('click', () => ViewManager.volver());
  $('.breadcrumb-back').on('click', (e) => { e.preventDefault(); ViewManager.volver(); });
};

Configuracion.renderNavbar = function (user) {
  return `
    <nav class="navbar navbar-light bg-white border-bottom px-3">
      <button class="btn btn-link d-md-none" id="toggleSidebar"><i class="fas fa-bars"></i></button>
            ${Sidebar.brandNav()}
      <div class="d-flex align-items-center ms-auto">
        <span class="me-3"><i class="fas fa-user me-1"></i>${user?.nombre_completo || 'Admin'}</span>
      </div>
    </nav>
  `;
};

Configuracion.bindIndexEvents = function () {
  $('.clickable[data-route]').on('click', function () {
    const route = $(this).data('route');
    if (route) ViewManager.navegar(route);
  });
  Configuracion.bindCommonEvents();
};

Configuracion.bindCommonEvents = function () {
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

window.Configuracion = Configuracion;
