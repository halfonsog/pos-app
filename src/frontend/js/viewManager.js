/**
 * viewManager.js - Gestor de navegación y carga de vistas
 */

var ViewManager = window.ViewManager || {};

ViewManager.currentView = null;
ViewManager.currentParams = null;
ViewManager.history = [];
ViewManager._ignorePopState = false;


// Definición de rutas como ARRAY de objetos
ViewManager.routes = [
  { pattern: 'auth/login', module: 'Auth', action: 'login' },
  { pattern: 'dashboard', module: 'Dashboard', action: 'index' },

  // Productos
  { pattern: 'productos', module: 'Productos', action: 'index' },
  { pattern: 'productos/listado', module: 'Productos', action: 'listado' },
  { pattern: 'productos/nuevo', module: 'Productos', action: 'formulario' },
  { pattern: 'productos/editar/:id', module: 'Productos', action: 'formulario' },
  { pattern: 'productos/ver/:id', module: 'Productos', action: 'ficha' },
  { pattern: 'productos/costo/:id', module: 'Productos', action: 'costo' },
  { pattern: 'productos/receta/:id', module: 'Productos', action: 'receta' },

  // Compras
  { pattern: 'compras', module: 'Compras', action: 'index' },
  { pattern: 'compras/listado', module: 'Compras', action: 'listado' },
  { pattern: 'compras/nuevo', module: 'Compras', action: 'formulario' },
  { pattern: 'compras/editar/:id', module: 'Compras', action: 'formulario' },
  { pattern: 'compras/ver/:id', module: 'Compras', action: 'ficha' },
  { pattern: 'compras/pagar/:id', module: 'Compras', action: 'pagar' },
  { pattern: 'compras/inventariar/:id', module: 'Compras', action: 'inventariar' },

  // Selector de productos
  { pattern: 'selector-productos', module: 'SelectorProductos', action: 'index' },

  // Proveedores
  { pattern: 'proveedores', module: 'Proveedores', action: 'index' },
  { pattern: 'proveedores/listado', module: 'Proveedores', action: 'listado' },
  { pattern: 'proveedores/nuevo', module: 'Proveedores', action: 'formulario' },
  { pattern: 'proveedores/editar/:id', module: 'Proveedores', action: 'formulario' },
  { pattern: 'proveedores/ver/:id', module: 'Proveedores', action: 'ficha' },
  { pattern: 'proveedores/contactos/:id', module: 'Proveedores', action: 'contactos' },

  // Inventario
  { pattern: 'inventario', module: 'Inventario', action: 'index' },
  { pattern: 'inventario/stock', module: 'Inventario', action: 'stock' },
  { pattern: 'inventario/movimientos', module: 'Inventario', action: 'movimientos' },
  { pattern: 'inventario/preparar', module: 'Inventario', action: 'preparar' },
  { pattern: 'inventario/preparar/:id', module: 'Inventario', action: 'preparar' },
  { pattern: 'inventario/ajuste', module: 'Inventario', action: 'ajuste' },
  { pattern: 'inventario/ajuste/:id', module: 'Inventario', action: 'ajuste' },
  { pattern: 'inventario/merma', module: 'Inventario', action: 'ajuste' },

  // Configuración
  { pattern: 'configuracion', module: 'Configuracion', action: 'index' },
  { pattern: 'categorias', module: 'Categorias', action: 'listado' },
  { pattern: 'categorias/nuevo', module: 'Categorias', action: 'formulario' },
  { pattern: 'unidades', module: 'Unidades', action: 'listado' }
];

/**
 * Parsea una URL con query parameters
 */
ViewManager.parseUrl = function (url) {
  const [rutaBase, queryString] = url.split('?');
  const params = {};

  if (queryString) {
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key) {
        params[key] = decodeURIComponent(value || '');
      }
    });
  }

  return { ruta: rutaBase, params };
};

/**
 * Encuentra la ruta que coincide con el patrón
 */
ViewManager.findRoute = function (ruta) {
  for (const route of this.routes) {
    const match = this.matchPattern(route.pattern, ruta);
    if (match !== null) {
      return {
        route: route,
        params: match
      };
    }
  }
  return null;
};

/**
 * Compara un patrón con una ruta real y extrae parámetros
 */
ViewManager.matchPattern = function (pattern, ruta) {
  const patternParts = pattern.split('/');
  const rutaParts = ruta.split('/');

  if (patternParts.length !== rutaParts.length) {
    return null;
  }

  const params = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const rutaPart = rutaParts[i];

    if (patternPart.startsWith(':')) {
      const paramName = patternPart.substring(1);
      params[paramName] = decodeURIComponent(rutaPart);
    } else if (patternPart !== rutaPart) {
      return null;
    }
  }

  return params;
};

/**
 * Navega a una ruta específica (AVANZA)
 */
ViewManager.navegar = async function (ruta, params = {}, options = {}) {
  console.log(`🧭 Navegando a: ${ruta}`, params);

  const parsed = this.parseUrl(ruta);
  const rutaBase = parsed.ruta;
  const queryParams = parsed.params;
  const finalParams = { ...queryParams, ...params };

  if (options.reset) {
    this.history = [];
    console.log('🔄 Historial reiniciado');
  }

  if (this.currentView && !options.reset && !options.replace) {
    this.history.push({
      ruta: this.currentView,
      params: this.currentParams
    });
    console.log('📝 Historial:', this.history.length);
  }

  // Desactivar popstate temporalmente
  this._ignorePopState = true;
  window.location.hash = ruta;
  setTimeout(() => { this._ignorePopState = false; }, 100);

  await this._cargarVista(ruta, finalParams);
};

// Evento popstate
window.addEventListener('popstate', function (e) {
  if (ViewManager._ignorePopState) {
    console.log('⏭️ Ignorando popstate');
    return;
  }

  const hash = window.location.hash.substring(1);
  if (hash) {
    console.log('⬅️ popstate: navegando a', hash);
    ViewManager._cargarVista(hash, {});
  }
});

/**
 * Carga una vista (usado internamente)
 */
ViewManager._cargarVista = async function (ruta, params) {
  const parsed = this.parseUrl(ruta);
  const rutaBase = parsed.ruta;
  const routeMatch = this.findRoute(rutaBase);

  if (!routeMatch) {
    console.error('❌ Ruta no encontrada:', rutaBase);
    Toast.error('Vista no disponible');
    return;
  }

  const { route, params: urlParams } = routeMatch;
  const allParams = { ...urlParams, ...params };

  this.currentView = ruta;
  this.currentParams = allParams;

  try {
    const module = window[route.module];
    if (module && typeof module[route.action] === 'function') {
      await module[route.action](allParams);
    } else {
      console.error(`❌ Módulo ${route.module} o acción ${route.action} no encontrado`);
      Toast.error('Error cargando la vista');
    }
  } catch (error) {
    console.error('❌ Error cargando vista:', error);
    Toast.error('Error al cargar la vista');
  }
};

/**
 * Volver a la vista anterior
 */
ViewManager.volver = function () {
  console.log('⬅️ Volviendo atrás. Historial:', this.history.length);

  if (this.history.length > 0) {
    const previous = this.history.pop();
    console.log('↩️ Volviendo a:', previous.ruta);
    // Usar replace: true para no duplicar en historial
    this.navegar(previous.ruta, previous.params, { replace: true });
  } else {
    console.log('⚠️ No hay historial, yendo a dashboard');
    this.navegar('dashboard', {}, { reset: true });
  }
};

/**
 * Refresca la vista actual
 */
ViewManager.refresh = async function () {
  if (this.currentView) {
    console.log('🔄 Refrescando vista:', this.currentView);

    // Invalidar caché del módulo actual
    const routeMatch = this.findRoute(this.currentView);
    if (routeMatch) {
      const moduleName = routeMatch.route.module.toLowerCase();
      State.invalidateCache(moduleName);
    }

    // Recargar la vista sin modificar historial
    await this._cargarVista(this.currentView, this.currentParams);
  }
};

// ============================================
// SINCRONIZACIÓN CON EL NAVEGADOR
// ============================================

// Capturar el botón "atrás" del navegador
window.addEventListener('popstate', function (e) {
  // ✅ Ignorar si fue causado por navegación interna
  if (ViewManager._ignorePopState) {
    console.log('⏭️ Ignorando popstate (navegación interna)');
    return;
  }

  const hash = window.location.hash.substring(1);
  if (hash) {
    console.log('⬅️ popstate: navegando a', hash);
    ViewManager._cargarVista(hash, {});
  }
});

// Manejar navegación inicial
$(document).ready(function () {
  const hash = window.location.hash.substring(1);
  if (hash) {
    ViewManager.navegar(hash, {}, { reset: true });
  }
});

window.ViewManager = ViewManager;