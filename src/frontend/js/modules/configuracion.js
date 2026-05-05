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
              <div class="card clickable h-100" data-route="configuracion/terminos" style="cursor: pointer;">
                <div class="card-body text-center">
                  <i class="fas fa-credit-card fa-3x text-danger mb-3"></i>
                  <h5>Términos de Pago</h5>
                  <p class="text-muted">Contado, 15 días, 30 días</p>
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
                      <hr>
                      <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>Resumen:</strong><br>
                        Total Gastos Fijos: <strong>${Utils.formatMoney(config.total_gastos_fijos || 0)}</strong><br>
                        % Gastos Fijos: <strong>${(config.porcentaje_gastos || 0).toFixed(2)}%</strong>
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
      impuesto_ventas: parseFloat($('#impuestoVentas').val())
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

  try {
    Utils.showLoading('Cargando...');
    const categorias = await API.categorias.listar();

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
                <li class="breadcrumb-item active">Categorías</li>
              </ol>
            </nav>
            <div class="d-flex justify-content-between align-items-center mb-4">
              <div class="d-flex align-items-center">
                <button class="btn btn-outline-secondary me-3" id="btnVolver"><i class="fas fa-arrow-left me-1"></i>Volver</button>
                <h2 class="mb-0"><i class="fas fa-folder me-2"></i>Categorías</h2>
              </div>
              <button class="btn btn-primary" id="btnNuevaCategoria"><i class="fas fa-plus me-1"></i>Nueva Categoría</button>
            </div>
            <div class="row">
              <div class="col-lg-8">
                <div class="card">
                  <div class="card-body p-0">
                    <table class="table table-hover mb-0">
                      <thead class="table-light">
                        <tr><th>Nombre</th><th>Descripción</th><th class="text-center">Activo</th><th class="text-center" style="width: 100px;">Acciones</th></tr>
                      </thead>
                      <tbody>
                        ${categorias.map(c => `
                          <tr class="${c.activo ? '' : 'text-muted'}">
                            <td>${c.nombre}</td>
                            <td>${c.descripcion || '-'}</td>
                            <td class="text-center">${c.activo ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-secondary">No</span>'}</td>
                            <td class="text-center">
                              <button class="btn btn-sm btn-outline-primary editar-categoria" data-id="${c.id}" data-nombre="${c.nombre}" data-descripcion="${c.descripcion || ''}"><i class="fas fa-edit"></i></button>
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
      
      <!-- Modal para Categoría -->
      <div class="modal fade" id="categoriaModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="categoriaModalTitle">Nueva Categoría</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="categoriaForm">
                <input type="hidden" id="categoriaId">
                <div class="mb-3"><label class="form-label">Nombre</label><input type="text" class="form-control" id="categoriaNombre" required></div>
                <div class="mb-3"><label class="form-label">Descripción</label><textarea class="form-control" id="categoriaDescripcion" rows="2"></textarea></div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="btnGuardarCategoria">Guardar</button>
            </div>
          </div>
        </div>
      </div>
    `;

    $('#app').html(layout);
    Configuracion._bindVolver();
    Configuracion._bindCategoriasEvents();
    Configuracion.bindCommonEvents();

    Utils.hideLoading();
  } catch (error) {
    Utils.hideLoading();
    console.error('Error:', error);
  }
};

Configuracion._bindCategoriasEvents = function () {
  let modal = new bootstrap.Modal('#categoriaModal');

  $('#btnNuevaCategoria').on('click', () => {
    $('#categoriaModalTitle').text('Nueva Categoría');
    $('#categoriaId').val('');
    $('#categoriaNombre').val('');
    $('#categoriaDescripcion').val('');
    modal.show();
  });

  $('.editar-categoria').on('click', function () {
    $('#categoriaModalTitle').text('Editar Categoría');
    $('#categoriaId').val($(this).data('id'));
    $('#categoriaNombre').val($(this).data('nombre'));
    $('#categoriaDescripcion').val($(this).data('descripcion'));
    modal.show();
  });

  $('#btnGuardarCategoria').on('click', async function () {
    const id = $('#categoriaId').val();
    const nombre = $('#categoriaNombre').val().trim();
    const descripcion = $('#categoriaDescripcion').val().trim();

    if (!nombre) { Toast.warning('Nombre requerido'); return; }

    try {
      Utils.showLoading('Guardando...');
      if (id) {
        await API.categorias.actualizar(id, { nombre, descripcion });
      } else {
        await API.categorias.crear({ nombre, descripcion });
      }
      State.invalidateCache('categorias');
      Utils.hideLoading();
      Toast.success('Categoría guardada');
      modal.hide();
      ViewManager.refresh();
    } catch (error) {
      Utils.hideLoading();
      console.error('Error:', error);
    }
  });
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
// TÉRMINOS DE PAGO (placeholder)
// ============================================
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