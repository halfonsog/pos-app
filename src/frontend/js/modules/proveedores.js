/**
 * proveedores.js - Módulo de gestión de proveedores
 */

const Proveedores = {

  // Referencia a la DataTable
  dataTable: null,

  // ============================================
  // VISTA: LISTADO
  // ============================================
  listado: async function () {
    console.log('📋 Cargando listado de proveedores');

    try {
      // Mostrar loading
      Utils.showLoading('Cargando proveedores...');

      // Obtener datos (con caché)
      let proveedores = State.getCache('proveedores');

      if (!proveedores) {
        proveedores = await API.proveedores.listar();
        State.setCache('proveedores', proveedores);
      }

      Utils.hideLoading();

      // Inicializar DataTable
      this.initDataTable(proveedores);

      // Bindear eventos
      this.bindListadoEvents();

    } catch (error) {
      Utils.hideLoading();
      Toast.error('Error al cargar proveedores: ' + error.message);
      console.error(error);
    }
  },

  initDataTable: function (proveedores) {
    const self = this;

    // Destruir tabla existente si hay
    if (this.dataTable) {
      this.dataTable.destroy();
    }

    // Preparar datos para DataTable
    const tableData = proveedores.map(p => [
      p.nombre,
      p.id_fiscal || '-',
      p.telefono || '-',
      `<span class="${p.saldo_pendiente > 0 ? 'text-warning fw-bold' : 'text-muted'}">
                ${Utils.formatMoney(p.saldo_pendiente)}
            </span>`,
      p.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>',
      `<button class="btn btn-sm btn-outline-primary ver-proveedor" data-id="${p.id}">
                <i class="fas fa-eye"></i>
            </button>`,
      p.id // Columna oculta para el ID
    ]);

    // Inicializar DataTable
    this.dataTable = $('#proveedoresTable').DataTable({
      data: tableData,
      columns: [
        { title: 'Nombre' },
        { title: 'ID Fiscal' },
        { title: 'Teléfono' },
        { title: 'Saldo Pendiente' },
        { title: 'Estado' },
        { title: 'Acciones', orderable: false },
        { title: 'ID', visible: false }
      ],
      order: [[3, 'desc'], [0, 'asc']], // Saldo pendiente primero
      language: {
        url: '/lib/js/datatables-es.json'
      },
      pageLength: 25,
      responsive: true,
      drawCallback: function () {
        // Aplicar hover effect
        $('#proveedoresTable tbody tr').addClass('clickable-row');
      }
    });

    // Evento doble click en fila
    $('#proveedoresTable tbody').off('dblclick', 'tr');
    $('#proveedoresTable tbody').on('dblclick', 'tr', function () {
      const row = self.dataTable.row(this);
      const id = row.data()[6]; // ID está en la columna 6 (oculta)
      ViewManager.navegar('proveedores/ver/' + id);
    });

    // Evento click en botón ver
    $('#proveedoresTable tbody').off('click', '.ver-proveedor');
    $('#proveedoresTable tbody').on('click', '.ver-proveedor', function (e) {
      e.stopPropagation();
      const id = $(this).data('id');
      ViewManager.navegar('proveedores/ver/' + id);
    });
  },

  bindListadoEvents: function () {
    const self = this;

    // Botón Nuevo Proveedor
    $('#btnNuevoProveedor').off('click').on('click', function () {
      ViewManager.navegar('proveedores/nuevo');
    });

    // Filtros rápidos
    $('#filtroTodos').off('click').on('click', function () {
      self.filtrarProveedores('todos');
    });

    $('#filtroConDeuda').off('click').on('click', function () {
      self.filtrarProveedores('con-deuda');
    });

    $('#filtroInactivos').off('click').on('click', function () {
      self.filtrarProveedores('inactivos');
    });

    // Búsqueda personalizada
    $('#buscarProveedor').off('input').on('input', Utils.debounce(function () {
      const termino = $(this).val();
      self.dataTable.search(termino).draw();
    }, 300));
  },

  filtrarProveedores: function (tipo) {
    if (!this.dataTable) return;

    // Limpiar búsqueda actual
    this.dataTable.search('').columns().search('');

    if (tipo === 'con-deuda') {
      // Filtrar por saldo pendiente > 0
      $.fn.dataTable.ext.search.push(
        function (settings, data, dataIndex) {
          const saldoText = data[3];
          return saldoText.includes('text-warning');
        }
      );
    } else if (tipo === 'inactivos') {
      // Filtrar por inactivos
      $.fn.dataTable.ext.search.push(
        function (settings, data, dataIndex) {
          return data[4].includes('Inactivo');
        }
      );
    }

    this.dataTable.draw();

    // Remover filtro personalizado después del draw
    $.fn.dataTable.ext.search.pop();
  },

  // ============================================
  // VISTA: FORMULARIO (NUEVO/EDITAR)
  // ============================================
  formulario: async function (params) {
    console.log('📝 Cargando formulario de proveedor', params);

    const id = params.id;
    const isEdit = !!id;

    try {
      // Cargar términos de pago para el select
      await this.cargarTerminosPago();

      if (isEdit) {
        // Modo edición: cargar datos del proveedor
        Utils.showLoading('Cargando datos del proveedor...');
        const proveedor = await API.proveedores.obtener(id);
        this.llenarFormulario(proveedor);
        Utils.hideLoading();

        $('#formTitle').text('Editar Proveedor');
      } else {
        // Modo nuevo
        $('#formTitle').text('Nuevo Proveedor');
        $('#proveedorActivo').prop('checked', true);
      }

      // Bindear eventos del formulario
      this.bindFormularioEvents(id);

    } catch (error) {
      Utils.hideLoading();
      Toast.error('Error al cargar el formulario: ' + error.message);
      console.error(error);
    }
  },

  async cargarTerminosPago() {
    try {
      // Obtener de caché o API
      let terminos = State.getCache('terminos_pago');

      if (!terminos) {
        terminos = await API.get('/terminos-pago');
        State.setCache('terminos_pago', terminos);
      }

      const $select = $('#terminoPagoId');
      $select.empty();
      $select.append('<option value="">Seleccione...</option>');

      terminos.forEach(t => {
        $select.append(`<option value="${t.id}">${t.nombre}</option>`);
      });

    } catch (error) {
      console.error('Error cargando términos de pago:', error);
      Toast.warning('No se pudieron cargar los términos de pago');
    }
  },

  llenarFormulario: function (proveedor) {
    $('#proveedorId').val(proveedor.id);
    $('#nombre').val(proveedor.nombre);
    $('#idFiscal').val(proveedor.id_fiscal || '');
    $('#direccion').val(proveedor.direccion || '');
    $('#telefono').val(proveedor.telefono || '');
    $('#terminoPagoId').val(proveedor.termino_pago_id || '');
    $('#proveedorActivo').prop('checked', proveedor.activo === 1);
  },

  bindFormularioEvents: function (id) {
    const self = this;

    // Botón Cancelar
    $('#btnCancelar').off('click').on('click', function () {
      if (id) {
        ViewManager.navegar('proveedores/ver/' + id);
      } else {
        ViewManager.volver();
      }
    });

    // Botón Volver (en header)
    $('#btnVolver').off('click').on('click', function () {
      ViewManager.volver();
    });

    // Submit del formulario
    $('#proveedorForm').off('submit').on('submit', async function (e) {
      e.preventDefault();

      // Validar campos requeridos
      const nombre = $('#nombre').val().trim();
      if (!nombre) {
        Toast.warning('El nombre es requerido');
        $('#nombre').focus();
        return;
      }

      // Recopilar datos
      const data = {
        nombre: nombre,
        id_fiscal: $('#idFiscal').val().trim() || null,
        direccion: $('#direccion').val().trim() || null,
        telefono: $('#telefono').val().trim() || null,
        termino_pago_id: $('#terminoPagoId').val() || null,
        activo: $('#proveedorActivo').is(':checked')
      };

      try {
        Utils.showLoading('Guardando proveedor...');

        let result;
        if (id) {
          result = await API.proveedores.actualizar(id, data);
        } else {
          result = await API.proveedores.crear(data);
        }

        // Invalidar caché
        State.invalidateCache('proveedores');

        Utils.hideLoading();
        Toast.success(result.message || 'Proveedor guardado correctamente');

        // Navegar a la ficha
        const nuevoId = id || result.id;
        ViewManager.navegar('proveedores/ver/' + nuevoId);

      } catch (error) {
        Utils.hideLoading();
        Toast.error('Error al guardar: ' + error.message);
        console.error(error);
      }
    });

    // Validación en tiempo real
    $('#nombre').off('blur').on('blur', function () {
      const val = $(this).val().trim();
      if (!val) {
        $(this).addClass('is-invalid');
      } else {
        $(this).removeClass('is-invalid').addClass('is-valid');
      }
    });
  },

  // ============================================
  // VISTA: FICHA (VER)
  // ============================================
  ficha: async function (params) {
    console.log('👁️ Cargando ficha de proveedor', params);

    const id = params.id;

    try {
      Utils.showLoading('Cargando información del proveedor...');

      const proveedor = await API.proveedores.obtener(id);

      this.renderizarFicha(proveedor);
      this.bindFichaEvents(proveedor);

      Utils.hideLoading();

    } catch (error) {
      Utils.hideLoading();
      Toast.error('Error al cargar el proveedor: ' + error.message);
      console.error(error);
    }
  },

  renderizarFicha: function (proveedor) {
    // Información general
    $('#detNombre').text(proveedor.nombre);
    $('#detIdFiscal').text(proveedor.id_fiscal || '-');
    $('#detDireccion').text(proveedor.direccion || '-');
    $('#detTelefono').text(proveedor.telefono || '-');
    $('#detTerminoPago').text(proveedor.termino_pago_nombre || 'No especificado');

    // Estado
    const estadoBadge = proveedor.activo
      ? '<span class="badge bg-success">Activo</span>'
      : '<span class="badge bg-secondary">Inactivo</span>';
    $('#detEstado').html(estadoBadge);

    // Saldo pendiente
    const saldoClass = proveedor.saldo_pendiente > 0 ? 'text-warning fw-bold' : 'text-success';
    $('#detSaldoPendiente').html(`<span class="${saldoClass}">${Utils.formatMoney(proveedor.saldo_pendiente)}</span>`);

    // Contactos
    this.renderizarContactos(proveedor.contactos || []);

    // Últimas compras (placeholder - se implementará con módulo compras)
    $('#ultimasCompras').html('<p class="text-muted">Próximamente...</p>');

    // Habilitar/deshabilitar botón eliminar
    if (proveedor.tiene_compras) {
      $('#btnEliminar').prop('disabled', true)
        .attr('title', 'No se puede eliminar: tiene compras asociadas');
    } else {
      $('#btnEliminar').prop('disabled', false).removeAttr('title');
    }
  },

  renderizarContactos: function (contactos) {
    const $container = $('#contactosList');

    if (!contactos || contactos.length === 0) {
      $container.html('<p class="text-muted">No hay contactos registrados</p>');
      return;
    }

    let html = '<div class="list-group">';
    contactos.forEach(c => {
      html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">${c.nombre}</h6>
                            <p class="mb-1 text-muted small">${c.cargo || 'Sin cargo'}</p>
                            <small>
                                <i class="fas fa-phone"></i> ${c.telefono_movil || '-'}
                                <i class="fas fa-envelope ms-3"></i> ${c.email || '-'}
                            </small>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-primary editar-contacto" data-id="${c.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger eliminar-contacto" data-id="${c.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
    });
    html += '</div>';

    $container.html(html);
  },

  bindFichaEvents: function (proveedor) {
    const self = this;

    // Botón Volver
    $('#btnVolver').off('click').on('click', function () {
      ViewManager.volver();
    });

    // Botón Editar
    $('#btnEditar').off('click').on('click', function () {
      ViewManager.navegar('proveedores/editar/' + proveedor.id);
    });

    // Botón Eliminar
    $('#btnEliminar').off('click').on('click', async function () {
      const confirmado = await Utils.confirm(
        `¿Está seguro de eliminar al proveedor "${proveedor.nombre}"?`,
        'Confirmar eliminación'
      );

      if (!confirmado) return;

      try {
        Utils.showLoading('Eliminando proveedor...');

        await API.proveedores.eliminar(proveedor.id);

        // Invalidar caché
        State.invalidateCache('proveedores');

        Utils.hideLoading();
        Toast.success('Proveedor eliminado correctamente');

        // Volver al listado
        ViewManager.navegar('proveedores');

      } catch (error) {
        Utils.hideLoading();
        Toast.error('Error al eliminar: ' + error.message);
        console.error(error);
      }
    });

    // Botón Ver Compras (placeholder)
    $('#btnVerCompras').off('click').on('click', function () {
      Toast.info('Módulo de compras en desarrollo');
    });

    // Botón Nuevo Contacto (placeholder)
    $('#btnNuevoContacto').off('click').on('click', function () {
      Toast.info('Gestión de contactos en desarrollo');
    });
  }
};

// Exportar módulo
window.Proveedores = Proveedores;