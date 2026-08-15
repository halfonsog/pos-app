/**
 * manual.js — Lógica compartida del Manual de Usuario (multi-página).
 *
 * · Construye el menú lateral (índice) según el ROL del usuario:
 *     - Administrador → todas las secciones.
 *     - Vendedor     → solo sus funcionalidades (ventas, compras, productos, mayoristas).
 * · Marca la sección activa según la página actual.
 * · Búsqueda en vivo que filtra y resalta coincidencias en la página.
 */

var Manual = window.Manual || {};

// Índice de secciones (archivo, título, icono, rol).
// rol: 'todos' (admin y vendedor) | 'admin' (solo administrador)
Manual.SECCIONES = [
  { file: 'comenzando.html', titulo: 'Comenzando', icono: 'fa-rocket', rol: 'todos' },
  { file: 'ventas-turnos.html', titulo: 'Ventas y Turnos', icono: 'fa-cash-register', rol: 'todos' },
  { file: 'compras-inventario.html', titulo: 'Compras e Inventario', icono: 'fa-shopping-cart', rol: 'todos' },
  { file: 'productos-recetas.html', titulo: 'Productos y Recetas', icono: 'fa-boxes', rol: 'todos' },
  { file: 'mayoristas-encargos.html', titulo: 'Mayoristas y Encargos', icono: 'fa-truck', rol: 'todos' },
  { file: 'fiscal-contabilidad.html', titulo: 'Fiscal y Contabilidad', icono: 'fa-calculator', rol: 'admin' },
  { file: 'configuracion.html', titulo: 'Configuración', icono: 'fa-cog', rol: 'admin' },
  { file: 'instalacion-red.html', titulo: 'Instalación y Red (varios PCs)', icono: 'fa-network-wired', rol: 'admin' }
];

// Página actual = nombre del archivo (sin ruta)
Manual.paginaActual = function () {
  var p = window.location.pathname.split('/').pop();
  return p || 'index.html';
};

Manual.rol = function () {
  try {
    var u = JSON.parse(localStorage.getItem('user') || 'null');
    if (u && u.rol) return u.rol;
  } catch (e) { /* ignorar */ }
  return 'admin'; // por defecto (acceso directo)
};

// Secciones visibles para el rol actual
Manual.visibles = function () {
  var rol = Manual.rol();
  return Manual.SECCIONES.filter(function (s) {
    return s.rol === 'todos' || s.rol === rol;
  });
};

// Render del menú lateral
Manual.renderSidebar = function () {
  var nav = document.getElementById('navIndice');
  if (!nav) return;
  var actual = Manual.paginaActual();
  nav.innerHTML = '';
  Manual.visibles().forEach(function (s) {
    var a = document.createElement('a');
    a.className = 'nav-link' + (s.file === actual ? ' active' : '');
    a.href = s.file;
    a.innerHTML = '<i class="fas ' + s.icono + ' me-2"></i>' + s.titulo;
    nav.appendChild(a);
  });
  // badge de rol en el topbar
  var badge = document.getElementById('rolBadge');
  if (badge) badge.textContent = 'Rol: ' + (Manual.rol() === 'admin' ? 'Administrador' : 'Vendedor');
};

// Búsqueda en vivo: resalta coincidencias en el contenido (solo en la página actual)
Manual.buscar = function () {
  var q = (document.getElementById('busqueda')?.value || '').trim().toLowerCase();
  var contenido = document.getElementById('contenido');
  if (!contenido) return;

  // limpiar resaltados previos
  contenido.querySelectorAll('mark').forEach(function (m) {
    m.replaceWith(document.createTextNode(m.textContent));
  });

  if (!q) return;

  var walker = document.createTreeWalker(contenido, NodeFilter.SHOW_TEXT, null, false);
  var nodos = [];
  while (walker.nextNode()) {
    var n = walker.currentNode;
    var i = (n.nodeValue || '').toLowerCase().indexOf(q);
    if (i !== -1) nodos.push({ n: n, i: i, len: q.length });
  }
  nodos.forEach(function (o) {
    var span = document.createElement('mark');
    span.textContent = o.n.nodeValue.substr(o.i, o.len);
    var resto = document.createTextNode(o.n.nodeValue.substr(o.i + o.len));
    o.n.nodeValue = o.n.nodeValue.substr(0, o.i);
    o.n.parentNode.insertBefore(span, o.n.nextSibling);
    o.n.parentNode.insertBefore(resto, span.nextSibling);
  });
};

Manual.init = function () {
  Manual.renderSidebar();
  var busqueda = document.getElementById('busqueda');
  if (busqueda) busqueda.addEventListener('input', Manual.buscar);
};

document.addEventListener('DOMContentLoaded', Manual.init);
