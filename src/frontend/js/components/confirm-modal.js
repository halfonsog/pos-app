// components/confirm-modal.js
const ConfirmModal = {
  show: function (options = {}) {
    const config = {
      title: options.title || 'Confirmar',
      message: options.message || '¿Está seguro?',
      confirmText: options.confirmText || 'Aceptar',
      cancelText: options.cancelText || 'Cancelar',
      confirmClass: options.confirmClass || 'btn-primary',
      onConfirm: options.onConfirm || function () { }
    };

    const modalHtml = `
            <div class="modal fade" id="confirmModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${config.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>${config.message}</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                ${config.cancelText}
                            </button>
                            <button type="button" class="btn ${config.confirmClass}" id="confirmBtn">
                                ${config.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    $('body').append(modalHtml);
    const modal = new bootstrap.Modal('#confirmModal');
    modal.show();

    $('#confirmBtn').on('click', () => {
      config.onConfirm();
      modal.hide();
    });

    $('#confirmModal').on('hidden.bs.modal', function () {
      $(this).remove();
    });
  }
};