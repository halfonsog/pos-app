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
    unidades: null,
    configuracion: null
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
      unidades: null,
      configuracion: null
    };
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },

  getConfig: function () {  // ✅ Corregido: dos puntos
    return this.getCache('configuracion') || {
      impuesto_ventas: 15,
      margen_recomendado: 20,
      porcentaje_gastos: 0,
      total_gastos_fijos: 0,
      ventas_proyectadas: 10000
    };
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
    console.log('🗑️ Invalidando caché:', key || 'TODAS');
    if (key) {
      delete this.cache[key];
    } else {
      this.cache = {
        proveedores: null,
        productos: null,
        categorias: null,
        unidades: null,
        compras: null,
        configuracion: null
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