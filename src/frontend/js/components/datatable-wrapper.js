// components/datatable-wrapper.js
const DataTableHelper = {
  /**
   * Inicializa DataTable con configuración estándar
   */
  init: function (selector, options = {}) {
    const defaultOptions = {
      language: {
        url: '/lib/js/datatables-es.json' // Archivo de traducción
      },
      pageLength: 25,
      responsive: true,
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
        '<"row"<"col-sm-12"tr>>' +
        '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      initComplete: function () {
        // Añadir clases Bootstrap a los elementos de DataTable
        $('.dataTables_length select').addClass('form-select form-select-sm');
        $('.dataTables_filter input').addClass('form-control form-control-sm');
      }
    };

    return $(selector).DataTable({ ...defaultOptions, ...options });
  }
};