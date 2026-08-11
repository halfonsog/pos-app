/**
 * form-modal.js — Formularios en modal Bootstrap (sustituto profesional de window.prompt/confirm).
 *
 * Uso:
 *   FormModal.show({
 *     title: 'Título',
 *     submitLabel: 'Guardar',
 *     fields: [
 *       { id: 'monto', label: 'Monto', type: 'number', required: true, min: 0.01, step: 0.01, help: '...' },
 *       { id: 'moneda', label: 'Moneda', type: 'select', options: [{value:'CUP',label:'CUP'},{value:'USD',label:'USD'}] },
 *       { id: 'tasa', label: 'Tasa', type: 'number', showIf: { field: 'moneda', value: 'USD' } }
 *     ],
 *     onSubmit: async (valores) => { ...; return true; }  // true/cierra; false/mantiene abierto
 *   })
 */
var FormModal = window.FormModal || {};

FormModal.show = function (config) {
  const modalId = 'formModal_' + Date.now();

  const campoHtml = (f) => {
    const base = `class="form-control" id="${modalId}_${f.id}" ${f.required ? 'required' : ''} ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.step !== undefined ? `step="${f.step}"` : ''}`;
    let input;
    if (f.type === 'select') {
      input = `<select class="form-select" id="${modalId}_${f.id}" ${f.required ? 'required' : ''}>
        ${(f.options || []).map(o => `<option value="${o.value}" ${String(o.value) === String(f.value) ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea ${base} rows="${f.rows || 2}" placeholder="${f.placeholder || ''}">${f.value || ''}</textarea>`;
    } else {
      input = `<input type="${f.type || 'text'}" ${base} value="${f.value ?? ''}" placeholder="${f.placeholder || ''}" ${f.type === 'password' ? 'autocomplete="new-password"' : ''}>`;
    }
    return `
      <div class="mb-3" id="${modalId}_${f.id}_wrap" ${f.showIf ? 'style="display:none"' : ''}>
        <label class="form-label">${f.label}${f.required ? ' <span class="text-danger">*</span>' : ''}</label>
        ${input}
        ${f.help ? `<small class="text-muted">${f.help}</small>` : ''}
      </div>
    `;
  };

  const html = `
    <div class="modal fade" id="${modalId}" tabindex="-1" data-bs-backdrop="static">
      <div class="modal-dialog ${config.size === 'lg' ? 'modal-lg' : ''}">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${config.title || 'Formulario'}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="${modalId}_form" novalidate>
              ${config.fields.map(campoHtml).join('')}
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn btn-primary" form="${modalId}_form">${config.submitLabel || 'Guardar'}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  $('body').append(html);
  const modal = new bootstrap.Modal('#' + modalId);
  const el = document.getElementById(modalId);

  // showIf: mostrar/ocultar campos según otro campo
  config.fields.filter(f => f.showIf).forEach(f => {
    const target = document.getElementById(`${modalId}_${f.showIf.field}`);
    const wrap = document.getElementById(`${modalId}_${f.id}_wrap`);
    const toggle = () => { wrap.style.display = target.value === f.showIf.value ? '' : 'none'; };
    target.addEventListener('change', toggle);
    toggle();
  });

  $(el).on('hidden.bs.modal', () => { el.remove(); });

  $(`#${modalId}_form`).on('submit', async function (e) {
    e.preventDefault();
    const valores = {};
    for (const f of config.fields) {
      const inp = document.getElementById(`${modalId}_${f.id}`);
      let v = inp.value;
      if (f.type === 'number') v = v === '' ? null : parseFloat(v);
      valores[f.id] = v;
    }
    // Validación mínima de required
    for (const f of config.fields) {
      if (f.required) {
        const wrap = document.getElementById(`${modalId}_${f.id}_wrap`);
        const visible = !wrap || wrap.style.display !== 'none';
        const v = valores[f.id];
        if (visible && (v === null || v === undefined || v === '')) {
          Toast.warning(`El campo "${f.label}" es obligatorio`);
          return;
        }
      }
    }
    const cerrar = await config.onSubmit(valores);
    if (cerrar !== false) modal.hide();
  });

  modal.show();
  return modal;
};

window.FormModal = FormModal;
