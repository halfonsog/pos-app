/**
 * toast.js - Sistema de notificaciones
 */

const Toast = {

  container: null,

  init: function () {
    if (!this.container) {
      this.container = $('<div id="toast-container" class="position-fixed top-0 end-0 p-3" style="z-index: 9999;"></div>');
      $('body').append(this.container);
    }
  },

  show: function (message, type = 'info', duration = 3000) {
    this.init();

    const id = 'toast-' + Date.now();
    const bgClass = this.getBgClass(type);
    const icon = this.getIcon(type);

    const toastHtml = `
            <div id="${id}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="${icon} me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

    this.container.append(toastHtml);

    const toastElement = $(`#${id}`);
    const toast = new bootstrap.Toast(toastElement[0], {
      autohide: true,
      delay: duration
    });

    toast.show();

    toastElement.on('hidden.bs.toast', function () {
      $(this).remove();
    });
  },

  getBgClass: function (type) {
    const classes = {
      'success': 'bg-success',
      'error': 'bg-danger',
      'warning': 'bg-warning',
      'info': 'bg-info'
    };
    return classes[type] || 'bg-info';
  },

  getIcon: function (type) {
    const icons = {
      'success': 'fas fa-check-circle',
      'error': 'fas fa-exclamation-circle',
      'warning': 'fas fa-exclamation-triangle',
      'info': 'fas fa-info-circle'
    };
    return icons[type] || 'fas fa-info-circle';
  },

  success: function (message) {
    this.show(message, 'success');
  },

  error: function (message) {
    this.show(message, 'error');
  },

  warning: function (message) {
    this.show(message, 'warning');
  },

  info: function (message) {
    this.show(message, 'info');
  }
};

window.Toast = Toast;