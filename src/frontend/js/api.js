/**
 * api.js - Cliente HTTP para el backend
 */

const API = {

  baseUrl: '/api',

  // Método genérico para peticiones
  request: async function (endpoint, options = {}) {
    const token = State.getToken();

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...options
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, defaultOptions);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error en la petición');
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Métodos HTTP
  get: function (endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post: function (endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  put: function (endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  delete: function (endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  postFormData: function (endpoint, formData) {
    return this.requestFormData(endpoint, 'POST', formData);
  },

  putFormData: function (endpoint, formData) {
    return this.requestFormData(endpoint, 'PUT', formData);
  },

  requestFormData: async function (endpoint, method, formData) {
    const token = State.getToken();

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: method,
        headers: {
          // ⚠️ NO PONER 'Content-Type' manualmente con FormData
          // El navegador lo añade automáticamente con el boundary correcto
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error en la petición' }));
        throw new Error(error.error || 'Error en la petición');
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();

    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Endpoints específicos
  auth: {
    login: (username, password) => API.post('/auth/login', { username, password }),
    verify: () => API.get('/auth/verify'),
    cambiarPassword: (data) => API.post('/auth/cambiar-password', data)
  },

  proveedores: {
    listar: () => API.get('/proveedores'),
    obtener: (id) => API.get(`/proveedores/${id}`),
    crear: (data) => API.post('/proveedores', data),
    actualizar: (id, data) => API.put(`/ proveedores / ${id} `, data),
    eliminar: (id) => API.delete(`/ proveedores / ${id} `),
    listarContactos: (id) => API.get(`/ proveedores / ${id}/contactos`),
    crearContacto: (id, data) => API.post(`/proveedores/${id}/contactos`, data),
    actualizarContacto: (id, contactoId, data) => API.put(`/proveedores/${id}/contactos/${contactoId}`, data),
    eliminarContacto: (id, contactoId) => API.delete(`/proveedores/${id}/contactos/${contactoId}`)
  },

  productos: {
    listar: () => API.get('/productos'),
    obtener: (id) => API.get(`/productos/${id}`),
    crear: (formData) => API.postFormData('/productos', formData),
    actualizar: (id, formData) => API.putFormData(`/productos/${id}`, formData), // ✅ Usar putFormData
    actualizarSimple: (id, data) => API.put(`/productos/${id}`, data),           // ✅ Para datos simples. No usar putFormData
    eliminar: (id) => API.delete(`/productos/${id}`),
    actualizarCosto: (id, data) => API.put(`/productos/${id}/costo`, data),
    obtenerReceta: (id) => API.get(`/productos/${id}/receta`),
    agregarComponente: (id, data) => API.post(`/productos/${id}/receta`, data),
    eliminarComponente: (id, componenteId) => API.delete(`/productos/${id}/receta/${componenteId}`)
  },

  categorias: {
    listar: () => API.get('/configuracion/categorias'),
    crear: (data) => API.post('/configuracion/categorias', data),
    actualizar: (id, data) => API.put(`/configuracion/categorias/${id}`, data)
  },

  unidades: {
    listar: () => API.get('/configuracion/unidades'),
    crear: (data) => API.post('/configuracion/unidades', data),
    actualizar: (id, data) => API.put(`/configuracion/unidades/${id}`, data)
  },

  compras: {
    listar: () => API.get('/compras'),
    obtener: (id) => API.get(`/compras/${id}`),
    crear: (data) => API.post('/compras', data),
    actualizar: (id, data) => API.put(`/compras/${id}`, data),
    eliminar: (id) => API.delete(`/compras/${id}`),
    pagar: (id, data) => API.post(`/compras/${id}/pagar`, data),
    inventariar: (id) => API.post(`/compras/${id}/inventariar`)
  },

  inventario: {
    resumen: () => API.get('/inventario/resumen'),
    stock: () => API.get('/inventario/stock'),
    movimientos: () => API.get('/inventario/movimientos'),
    preparables: () => API.get('/inventario/preparables'),
    preparar: (id, data) => API.post(`/inventario/preparar/${id}`, data),
    crearAjuste: (data) => API.post('/inventario/ajuste', data)
  },

  configuracion: {
    obtenerGeneral: () => API.get('/configuracion/general'),
    actualizarGeneral: (data) => API.put('/configuracion/general', data),
    listarGastos: () => API.get('/configuracion/gastos'),
    crearGasto: (data) => API.post('/configuracion/gastos', data),
    actualizarGasto: (id, data) => API.put(`/configuracion/gastos/${id}`, data),
    eliminarGasto: (id) => API.delete(`/configuracion/gastos/${id}`),
    denominaciones: () => API.get('/configuracion/denominaciones')
  },

  ventas: {
    turnoActual: () => API.get('/ventas/turno-actual'),
    abrirTurno: (data) => API.post('/ventas/abrir-turno', data),
    cerrarTurno: (data) => API.post('/ventas/cerrar-turno', data),
    crear: (data) => API.post('/ventas', data),
    obtener: (id) => API.get(`/ventas/${id}`),
    resumenTurno: (id) => API.get(`/ventas/resumen-turno/${id}`),
    //listar: () => API.get('/ventas'),
    listar: (params = {}) => {
      const query = new URLSearchParams();
      if (params.inicio) query.append('inicio', params.inicio);
      if (params.fin) query.append('fin', params.fin);
      if (params.metodo_pago) query.append('metodo_pago', params.metodo_pago);
      if (params.busqueda) query.append('busqueda', params.busqueda);
      return API.get('/ventas?' + query.toString());
    },
    miTurno: () => API.get('/ventas/mi-turno')
  },

  reportes: {
    ventasPorProducto: (inicio, fin) => API.get(`/reportes/ventas-por-producto?inicio=${inicio}&fin=${fin}`),
    tendencia: (inicio, fin, agrupar) => API.get(`/reportes/tendencia?inicio=${inicio}&fin=${fin}&agrupar=${agrupar}`),
    rentabilidad: (inicio, fin) => API.get(`/reportes/rentabilidad?inicio=${inicio}&fin=${fin}`)
  },

  dashboard: {
    obtener: (inicio, fin) => API.get(`/dashboard?inicio=${inicio}&fin=${fin}`)
  }
};

window.API = API;