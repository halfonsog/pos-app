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
    login: (username, password) => {
      return API.post('/auth/login', { username, password });
    },
    verify: () => {
      return API.get('/auth/verify');
    }
  },

  proveedores: {
    listar: () => API.get('/proveedores'),
    obtener: (id) => API.get(`/proveedores/${id}`),
    crear: (data) => API.post('/proveedores', data),
    //    actualizar: (id, data) => API.put(`/proveedores/${id}`, data),
    actualizar: (id, formData) => {
      console.log('📤 API.productos.actualizar llamado con id:', id);
      return API.putFormData(`/productos/${id}`, formData);
    },
    eliminar: (id) => API.delete(`/proveedores/${id}`)
  },

  productos: {
    listar: () => API.get('/productos'),
    obtener: (id) => API.get(`/productos/${id}`),
    crear: (formData) => API.postFormData('/productos', formData),
    actualizar: (id, formData) => API.putFormData(`/productos/${id}`, formData), // ✅ Usar putFormData
    eliminar: (id) => API.delete(`/productos/${id}`),
    actualizarCosto: (id, data) => API.put(`/productos/${id}/costo`, data),  // ← AÑADIR
    obtenerReceta: (id) => API.get(`/productos/${id}/receta`),
    agregarComponente: (id, data) => API.post(`/productos/${id}/receta`, data),
    eliminarComponente: (id, componenteId) => API.delete(`/productos/${id}/receta/${componenteId}`)
  },

  categorias: {
    listar: () => API.get('/categorias'),
    crear: (data) => API.post('/categorias', data)
  },

  unidades: {
    listar: () => API.get('/unidades')
  },

  compras: {
    listar: () => API.get('/compras'),
    obtener: (id) => API.get(`/compras/${id}`),
    crear: (data) => API.post('/compras', data),
    actualizar: (id, data) => API.put(`/compras/${id}`, data),
    eliminar: (id) => API.delete(`/compras/${id}`),
    pagar: (id, data) => API.post(`/compras/${id}/pagar`, data),
    inventariar: (id) => API.post(`/compras/${id}/inventariar`)
  }
};

window.API = API;