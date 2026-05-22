/**
 * viewManager.js - Gestor de navegación y carga de vistas
 */

var ViewManager = window.ViewManager || {};

ViewManager.currentView = null;
ViewManager.currentParams = null;
ViewManager._historyCount = 0; // Contador interno de rutas

/**
 * Definición de rutas
 */
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

  // Categorias
  { pattern: 'categorias', module: 'Categorias', action: 'listado' },
  { pattern: 'categorias/nuevo', module: 'Categorias', action: 'formulario' },

  // Selector productos
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
  { pattern: 'inventario/merma', module: 'Inventario', action: 'merma' },

  // Ventas
  { pattern: 'ventas', module: 'Ventas', action: 'index' },
  { pattern: 'ventas/pos', module: 'Ventas', action: 'pos' },
  { pattern: 'ventas/listado', module: 'Ventas', action: 'listado' },
  { pattern: 'ventas/ver/:id', module: 'Ventas', action: 'ficha' },

  // Configuración
  { pattern: 'configuracion', module: 'Configuracion', action: 'index' },
  { pattern: 'configuracion/general', module: 'Configuracion', action: 'general' },
  { pattern: 'configuracion/gastos', module: 'Configuracion', action: 'gastos' },
  { pattern: 'configuracion/unidades', module: 'Configuracion', action: 'unidades' },
  { pattern: 'configuracion/categorias', module: 'Configuracion', action: 'categorias' },
  { pattern: 'configuracion/terminos', module: 'Configuracion', action: 'terminos' },
  { pattern: 'configuracion/denominaciones', module: 'Configuracion', action: 'denominaciones' },

  // Reportes
  { pattern: 'reportes', module: 'Reportes', action: 'index' },

  // Vendedor
  { pattern: 'vendedor', module: 'Vendedor', action: 'index' },
  { pattern: 'vendedor/stock', module: 'Vendedor', action: 'stock' },
  { pattern: 'vendedor/perfil', module: 'Vendedor', action: 'perfil' }
];


ViewManager.parseUrl = function (url) {
  const [rutaBase, queryString] = url.split('?');
  const params = {};
  if (queryString) {
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key) params[key] = decodeURIComponent(value || '');
    });
  }
  return { ruta: rutaBase, params };
};


ViewManager.findRoute = function (ruta) {
  for (const route of this.routes) {
    const match = this.matchPattern(route.pattern, ruta);
    if (match !== null) return { route: route, params: match };
  }
  return null;
};


ViewManager.matchPattern = function (pattern, ruta) {
  const pp = pattern.split('/');
  const rp = ruta.split('/');
  if (pp.length !== rp.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) {
      params[pp[i].substring(1)] = decodeURIComponent(rp[i]);
    } else if (pp[i] !== rp[i]) {
      return null;
    }
  }
  return params;
};


ViewManager._buildState = function (ruta, params = {}) {
  return { ruta, params };
};


ViewManager._cargarVista = async function (ruta, params = {}) {
  console.log('📄 Cargando vista:', ruta);

  const parsed = this.parseUrl(ruta);
  const routeMatch = this.findRoute(parsed.ruta);

  if (!routeMatch) {
    console.error('❌ Ruta no encontrada:', parsed.ruta);
    return;
  }

  const allParams = { ...routeMatch.params, ...parsed.params, ...params };

  this.currentView = ruta;
  this.currentParams = allParams;

  try {
    const moduleObj = window[routeMatch.route.module];
    if (!moduleObj) { console.error('❌ Módulo no encontrado:', routeMatch.route.module); return; }

    const actionFn = moduleObj[routeMatch.route.action];
    if (typeof actionFn !== 'function') { console.error('❌ Acción inválida:', routeMatch.route.action); return; }

    await actionFn(allParams);
  } catch (error) {
    console.error('❌ Error cargando vista:', error);
  }
};


ViewManager.navegar = async function (ruta, params = {}, options = {}) {
  console.log('🧭 Navegando a:', ruta);

  const state = this._buildState(ruta, params);

  if (options.reset) {
    // Menú lateral: reemplazar estado actual y reiniciar contador
    this._historyCount = 1;
    history.replaceState(state, '', '#' + ruta);
  } else if (options.replace) {
    // Guardar/Cancelar: reemplazar estado actual sin añadir
    history.replaceState(state, '', '#' + ruta);
  } else {
    // Navegación normal: añadir al historial
    this._historyCount++;
    history.pushState(state, '', '#' + ruta);
  }

  await this._cargarVista(ruta, params);

  console.log('📝 Rutas en historial:', this._historyCount);
};


ViewManager.volver = function () {
  console.log('⬅️ Volviendo atrás. Rutas:', this._historyCount);
  if (this._historyCount > 1) {
    this._historyCount--;
  }
  window.history.back();
};


ViewManager.refresh = async function () {
  if (this.currentView) {
    console.log('🔄 Refrescando:', this.currentView);
    await this._cargarVista(this.currentView, this.currentParams);
  }
};


// Manejar back/forward del navegador
window.addEventListener('popstate', async function (e) {
  console.log('⬅️ popstate:', e.state);

  let ruta = null;
  let params = {};

  if (e.state && e.state.ruta) {
    ruta = e.state.ruta;
    params = e.state.params || {};
  } else {
    ruta = window.location.hash.substring(1);
  }

  if (!ruta) return;

  // Actualizar contador interno
  if (ViewManager._historyCount > 1) {
    ViewManager._historyCount--;
  }

  await ViewManager._cargarVista(ruta, params);
});


// Navegación inicial
$(document).ready(async function () {
  const hash = window.location.hash.substring(1);
  const rutaInicial = hash || (State.isAdmin() ? 'dashboard' : 'vendedor');

  ViewManager._historyCount = 1;

  history.replaceState(
    { ruta: rutaInicial, params: {} },
    '',
    '#' + rutaInicial
  );

  await ViewManager._cargarVista(rutaInicial);
});

window.ViewManager = ViewManager;