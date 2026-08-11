/**
 * datatable-wrapper.js — Configuración global de DataTables (D12)
 *
 * 1. Búsqueda global insensible a mayúsculas Y acentos en TODAS las tablas
 *    (normaliza NFD y elimina diacríticos; la búsqueda de DataTables ya es
 *    case-insensitive por defecto, esto además quita acentos: "jose" encuentra "José").
 * 2. DataTableHelper.init: inicialización con la configuración estándar de la app.
 */

// ── Búsqueda insensible a acentos (global) ──
(function () {
  const normalizar = function (data) {
    if (!data) return '';
    if (typeof data !== 'string') return data;
    return data.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  };
  $.fn.dataTable.ext.type.search.string = normalizar;
  $.fn.dataTable.ext.type.search.html = normalizar;
})();

// ── Inicializador estándar ──
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

window.DataTableHelper = DataTableHelper;
