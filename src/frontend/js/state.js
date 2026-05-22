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

  getConfig: async function () {
    let cached = this.getCache('configuracion');
    if (cached) return cached;

    // Intentar recargar
    try {
      console.warn('⚠️ Configuración no en caché, recargando...');
      const config = await API.get('/configuracion/general');
      this.setCache('configuracion', config);
      console.log('✅ Configuración recargada exitosamente');
      return config;
    } catch (error) {
      console.error('❌ No se pudo cargar la configuración');
      return null;
    }
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
    //if (cached && (Date.now() - cached.timestamp) < 180000) { // 3 minutos
    if (cached) {
      return cached.data;
    }
    return null;
  },

  clear: function () {
    console.log('🗑️ limpiando todo el caché y el usuario!');
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

  invalidateCache: function (key) {
    console.log('🗑️ Invalidando caché:', key || 'TODAS');
    if (key) {
      delete this.cache[key];
    } else {
      // ✅ Proteger datos que solo se cargan una vez
      const config = this.cache.configuracion;
      const unidades = this.cache.unidades;
      this.cache = {
        proveedores: null, productos: null, categorias: null, compras: null,
        configuracion: config,
        unidades: unidades
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