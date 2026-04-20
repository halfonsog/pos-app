/**
 * state.js - Gestión del estado global de la aplicación
 */

const State = {

  // Datos del usuario actual
  user: null,

  // Cache de vistas (para no recargar datos innecesariamente)
  cache: {
    proveedores: null,
    productos: null,
    categorias: null,
    unidades: null
  },

  // Configuración global
  config: {
    apiUrl: '/api'
  },

  // Getters/Setters
  setUser: function (user) {
    this.user = user;
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUser: function () {
    if (!this.user) {
      const saved = localStorage.getItem('user');
      if (saved) {
        this.user = JSON.parse(saved);
      }
    }
    return this.user;
  },

  setToken: function (token) {
    localStorage.setItem('token', token);
  },

  getToken: function () {
    return localStorage.getItem('token');
  },

  clear: function () {
    this.user = null;
    this.cache = {
      proveedores: null,
      productos: null,
      categorias: null,
      unidades: null
    };
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },

  // Gestión de caché de módulos
  setCache: function (key, data) {
    this.cache[key] = {
      data: data,
      timestamp: Date.now()
    };
  },

  getCache: function (key) {
    const cached = this.cache[key];
    if (cached && (Date.now() - cached.timestamp) < 60000) { // 1 minuto
      return cached.data;
    }
    return null;
  },

  invalidateCache: function (key) {
    if (key) {
      delete this.cache[key];
    } else {
      this.cache = {
        proveedores: null,
        productos: null,
        categorias: null,
        unidades: null
      };
    }
  },

  // Utilidades
  hasRole: function (role) {
    const user = this.getUser();
    return user && user.rol === role;
  },

  isAdmin: function () {
    return this.hasRole('admin');
  }
};

// Hacer disponible globalmente
window.State = State;