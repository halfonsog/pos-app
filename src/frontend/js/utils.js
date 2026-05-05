/**
 * utils.js - Funciones utilitarias comunes
 */

const Utils = {

  /**
   * Formatea un número con formato: 14'500.00
   * @param {number} amount - El número a formatear
   * @param {number} decimals - Cantidad de decimales (default: 2)
   * @returns {string} Número formateado
   */
  formatNumber: function (number, decimals = 2) {
    if (number === null || number === undefined || isNaN(number)) {
      number = 0;
    }

    const num = parseFloat(number);

    // ✅ Usar toFixed con el número de decimales
    const formatted = num.toFixed(decimals);

    // ✅ Si decimals es 0, devolver solo la parte entera
    if (decimals === 0) {
      const integerPart = formatted.split('.')[0];
      let formattedInteger = '';
      let count = 0;

      for (let i = integerPart.length - 1; i >= 0; i--) {
        formattedInteger = integerPart[i] + formattedInteger;
        count++;
        if (count % 3 === 0 && i > 0) {
          formattedInteger = "'" + formattedInteger;
        }
      }
      return formattedInteger;
    }

    // Para decimales > 0
    const parts = formatted.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '00';

    let formattedInteger = '';
    let count = 0;

    for (let i = integerPart.length - 1; i >= 0; i--) {
      formattedInteger = integerPart[i] + formattedInteger;
      count++;
      if (count % 3 === 0 && i > 0) {
        formattedInteger = "'" + formattedInteger;
      }
    }

    return formattedInteger + '.' + decimalPart;
  },

  /**
  * Formatea un monto de dinero con formato: 14'500.00
  * @param {number} amount - El monto a formatear
  * @param {string} currency - Símbolo de moneda (no se usa, solo para compatibilidad)
  * @returns {string} Monto formateado
  */
  formatMoney: function (amount, currency = '') {
    if (amount === null || amount === undefined || isNaN(amount)) {
      amount = 0;
    }

    const formatted = Utils.formatNumber(amount, 2);

    // Si se especifica moneda, añadirla (opcional)
    if (currency) {
      return currency + ' ' + formatted;
    }

    return formatted;
  },

  // Formateo de fecha
  formatDate: function (date, format = 'short') {
    const d = new Date(date);

    if (format === 'short') {
      return d.toLocaleDateString('es-ES');
    } else if (format === 'long') {
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else if (format === 'datetime') {
      return d.toLocaleString('es-ES');
    }

    return d.toISOString().split('T')[0];
  },

  // Debounce para búsquedas
  debounce: function (func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Validaciones
  validateEmail: function (email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  validatePhone: function (phone) {
    const re = /^[\d\s\-+()]{8,}$/;
    return re.test(phone);
  },

  // Serializar formulario a objeto
  serializeForm: function (form) {
    const formData = new FormData(form);
    const obj = {};
    formData.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  },

  // Mostrar/ocultar loading
  showLoading: function (message = 'Procesando...') {
    const html = `
            <div id="global-loading" class="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
                 style="background: rgba(0,0,0,0.5); z-index: 9999;">
                <div class="bg-white p-4 rounded shadow">
                    <div class="spinner-border text-primary me-2" role="status"></div>
                    <span>${message}</span>
                </div>
            </div>
        `;
    $('body').append(html);
  },

  hideLoading: function () {
    $('#global-loading').remove();
  },

  // Confirmación
  confirm: function (message, title = 'Confirmar') {
    return new Promise((resolve) => {
      // Eliminar modal anterior si existe
      $('#confirmModal').remove();

      const modalHtml = `
      <div class="modal fade" id="confirmModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${title}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p>${message}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="confirmOk">Aceptar</button>
            </div>
          </div>
        </div>
      </div>
    `;

      $('body').append(modalHtml);

      const $modal = $('#confirmModal');
      const modal = new bootstrap.Modal($modal[0]);
      modal.show();

      // Limpiar evento anterior antes de bindear
      $modal.off('click', '#confirmOk');

      $modal.on('click', '#confirmOk', function () {
        modal.hide();
        resolve(true);
      });

      $modal.on('hidden.bs.modal', function () {
        $(this).remove();
        resolve(false);
      });
    });
  },

  // Generar ID único
  generateId: function () {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
};

/**
 * Genera un placeholder SVG para productos sin foto
 * @param {Object|string} producto - Objeto producto o nombre
 * @param {number} id - ID del producto (opcional, para color consistente)
 * @param {number} size - Tamaño en px (default: 200)
 * @returns {string} URL de datos SVG
 */
Utils.getProductPlaceholder = function (producto, id = 1, size = 200) {
  // Obtener nombre e inicial
  let nombre = '';
  if (typeof producto === 'string') {
    nombre = producto;
  } else if (producto && producto.nombre) {
    nombre = producto.nombre;
    id = producto.id || id;
  }

  const inicial = nombre ? nombre.charAt(0).toUpperCase() : '📦';

  // Paleta de colores agradables
  const colors = [
    '#3498db', // Azul
    '#2ecc71', // Verde
    '#e74c3c', // Rojo
    '#f39c12', // Naranja
    '#9b59b6', // Púrpura
    '#1abc9c', // Turquesa
    '#e91e63', // Rosa
    '#00bcd4'  // Cian
  ];

  const colorIndex = (id || 1) % colors.length;
  const bgColor = colors[colorIndex];

  // Calcular tamaño de fuente proporcional
  const fontSize = Math.floor(size * 0.4);

  // Crear SVG
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${bgColor}" rx="${size * 0.05}"/>
      <text x="${size / 2}" y="${size / 2}" 
            font-family="Arial, Helvetica, sans-serif" 
            font-size="${fontSize}px" 
            font-weight="bold" 
            fill="white" 
            text-anchor="middle" 
            dominant-baseline="middle">${inicial}</text>
    </svg>
  `;

  // Codificar para usar como URL
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
};

/**
 * Renderiza una imagen de producto (con fallback a placeholder)
 * @param {Object} producto - Objeto producto
 * @param {number} size - Tamaño en px
 * @returns {string} HTML de la imagen
 */
Utils.renderProductImage = function (producto, size = 200) {
  if (producto.foto) {
    return `<img src="/uploads/productos/${producto.foto}" 
                 alt="${producto.nombre}" 
                 style="width: 100%; height: ${size}px; object-fit: cover; border-radius: 8px;">`;
  }

  const placeholderUrl = Utils.getProductPlaceholder(producto, producto.id, size);
  return `<img src="${placeholderUrl}" 
               alt="${producto.nombre}" 
               style="width: 100%; height: ${size}px; object-fit: cover; border-radius: 8px;">`;
};

/**
 * Convierte una cantidad entre dos unidades del mismo tipo
 * @param {number} cantidad - Cantidad a convertir
 * @param {Object} unidadOrigen - Objeto unidad {id, tipo, coeficiente}
 * @param {Object} unidadDestino - Objeto unidad {id, tipo, coeficiente}
 * @returns {number} Cantidad convertida
 */
Utils.convertir = function (cantidad, unidadOrigen, unidadDestino) {
  if (!unidadOrigen || !unidadDestino) return cantidad;
  if (unidadOrigen.id === unidadDestino.id) return cantidad;
  if (unidadOrigen.tipo !== unidadDestino.tipo) {
    console.error('No se pueden convertir unidades de diferente tipo');
    return cantidad;
  }

  // Convertir a unidad base y luego a destino
  const enBase = cantidad * unidadOrigen.coeficiente;
  const convertido = enBase / unidadDestino.coeficiente;

  return convertido;
};

/**
 * Obtiene una unidad por su ID desde el caché
 * @param {number} id - ID de la unidad
 * @returns {Object|null} Unidad encontrada
 */
Utils.getUnidad = function (id) {
  const unidades = State.getCache('unidades');
  if (!unidades) return null;
  return unidades.find(u => u.id == id) || null;
};

/**
 * Verifica si dos unidades son del mismo tipo
 * @param {number} id1 - ID de la primera unidad
 * @param {number} id2 - ID de la segunda unidad
 * @returns {boolean}
 */
Utils.mismoTipo = function (id1, id2) {
  const u1 = Utils.getUnidad(id1);
  const u2 = Utils.getUnidad(id2);
  return u1 && u2 && u1.tipo === u2.tipo;
};

window.Utils = Utils;