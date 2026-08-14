/**
 * api.js - Cliente HTTP para el backend
 */

const API = {

  baseUrl: '/api',

  // Método genérico para peticiones
  request: async function (endpoint, options = {}) {
    const token = State.getToken();

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      // ✅ Detectar token expirado
      if (response.status === 401) {
        State.clear();
        Toast.warning('Sesión expirada. Inicie sesión nuevamente.');
        ViewManager.navegar('auth/login', {}, { reset: true });
        throw new Error('Sesión expirada');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Error en la petición');
      }

      return await response.json();
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        console.error('API Error:', error);
      }
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

      // ✅ Detectar token expirado (igual que en request JSON)
      if (response.status === 401) {
        State.clear();
        Toast.warning('Sesión expirada. Inicie sesión nuevamente.');
        ViewManager.navegar('auth/login', {}, { reset: true });
        throw new Error('Sesión expirada');
      }

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
    actualizar: (id, data) => API.put(`/proveedores/${id}`, data),
    eliminar: (id) => API.delete(`/proveedores/${id}`),
    listarContactos: (id) => API.get(`/proveedores/${id}/contactos`),
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
    eliminarComponente: (id, componenteId) => API.delete(`/productos/${id}/receta/${componenteId}`),
    trazabilidad: (id) => API.get(`/productos/${id}/trazabilidad`)
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
    tiposMovimiento: () => API.get('/inventario/tipos-movimiento'),
    preparar: (id, data) => API.post(`/inventario/preparar/${id}`, data),
    crearAjuste: (data) => API.post('/inventario/ajuste', data),
    intercambio: (data) => API.post('/inventario/intercambio', data)
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
    listar: (params = {}) => {
      const query = new URLSearchParams();
      if (params.inicio) query.append('inicio', params.inicio);
      if (params.fin) query.append('fin', params.fin);
      if (params.metodo_pago) query.append('metodo_pago', params.metodo_pago);
      if (params.busqueda) query.append('busqueda', params.busqueda);
      return API.get('/ventas?' + query.toString());
    },
    miTurno: () => API.get('/ventas/mi-turno'),
    anular: (id) => API.post(`/ventas/${id}/anular`)
  },

  reportes: {
    ventasPorProducto: (inicio, fin) => API.get(`/reportes/ventas-por-producto?inicio=${inicio}&fin=${fin}`),
    tendencia: (inicio, fin, agrupar) => API.get(`/reportes/tendencia?inicio=${inicio}&fin=${fin}&agrupar=${agrupar}`),
    rentabilidad: (inicio, fin) => API.get(`/reportes/rentabilidad?inicio=${inicio}&fin=${fin}`),
    contables: (params) => {
      const query = new URLSearchParams(params).toString();
      return API.get('/reportes/contables?' + query);
    },
    resumenAnual: (anio) => API.get(`/reportes/resumen-anual?anio=${anio}`)
  },

  dashboard: {
    obtener: (inicio, fin) => API.get(`/dashboard?inicio=${inicio}&fin=${fin}`)
  },

  mantenimiento: {
    eliminarInactivos: () => API.post('/mantenimiento/eliminar-inactivos'),
    eliminarAnio: (anio) => API.post('/mantenimiento/eliminar-anio', { anio }),
    eliminarEntidad: (tipo, id) => API.post('/mantenimiento/eliminar-entidad', { tipo, id }),
    reset: () => API.post('/mantenimiento/reset'),
    restaurar: (formData) => API.postFormData('/mantenimiento/restaurar', formData),
    verLogs: () => API.get('/mantenimiento/logs')
  },

  contabilidad: {
    calcularImpuestos: (mes, anio) => API.post('/contabilidad/calcular-impuestos', { mes, anio }),
    registrarPago: (data) => API.post('/contabilidad/registrar-pago', data),
    historial: () => API.get('/contabilidad/historial'),
    cierreMes: (mes, anio) => API.get(`/contabilidad/cierre-mes?mes=${mes}&anio=${anio}`),
    cerrarMes: (mes, anio) => API.post('/contabilidad/cierre-mes', { mes, anio }),
    fichaCierreMes: (mes, anio) => API.get(`/contabilidad/cierre-mes/${mes}/${anio}`),
    liquidacionAnual: (anio) => API.get(`/contabilidad/liquidacion-anual?anio=${anio}`),
    libroDiario: (mes, anio) => API.get(`/contabilidad/libro-diario?mes=${mes}&anio=${anio}`),
    banco: () => API.get('/contabilidad/banco'),
    bancoMovimiento: (data) => API.post('/contabilidad/banco/movimiento', data),
    cambioDivisas: (data) => API.post('/contabilidad/cambio-divisas', data),
    nominas: (mes, anio) => API.get(`/contabilidad/nominas?mes=${mes}&anio=${anio}`),
    generarNominas: (mes, anio) => API.post('/contabilidad/nominas/generar', { mes, anio }),
    pagarSalario: (id) => API.post(`/contabilidad/nominas/${id}/pagar-salario`),
    ayudaBonos: () => API.get('/contabilidad/bonos/ayuda'),
    pagarBono: (data) => API.post('/contabilidad/bonos', data)
  },

  usuarios: {
    listar: () => API.get('/usuarios'),
    crear: (data) => API.post('/usuarios', data),
    actualizar: (id, data) => API.put(`/usuarios/${id}`, data),
    resetPassword: (id, password) => API.put(`/usuarios/${id}/password`, { password })
  },

  empleados: {
    listar: () => API.get('/empleados'),
    crear: (data) => API.post('/empleados', data),
    actualizar: (id, data) => API.put(`/empleados/${id}`, data)
  },

  servicios: {
    listar: (tipo) => API.get('/servicios' + (tipo ? `?tipo=${tipo}` : '')),
    crear: (data) => API.post('/servicios', data)
  },

  prestamosInversiones: {
    listar: () => API.get('/config/prestamos-inversiones'),
    obtener: (id) => API.get(`/config/prestamos-inversiones/${id}`),
    crear: (data) => API.post('/config/prestamos-inversiones', data),
    actualizar: (id, data) => API.put(`/config/prestamos-inversiones/${id}`, data),
    cancelar: (id) => API.delete(`/config/prestamos-inversiones/${id}`),
    registrarPago: (id, data) => API.post(`/config/prestamos-inversiones/${id}/pagos`, data)
  },

  clientes: {
    listar: () => API.get('/clientes'),
    obtener: (id) => API.get(`/clientes/${id}`),
    crear: (data) => API.post('/clientes', data),
    actualizar: (id, data) => API.put(`/clientes/${id}`, data)
  },

  mayoristas: {
    resumen: () => API.get('/mayoristas/resumen'),
    cuentasPorCobrar: () => API.get('/mayoristas/cuentas-por-cobrar'),
    listarPedidos: (query = '') => API.get('/mayoristas/pedidos' + query),
    obtenerPedido: (id) => API.get(`/mayoristas/pedidos/${id}`),
    crearPedido: (data) => API.post('/mayoristas/pedidos', data),
    facturarPedido: (id) => API.post(`/mayoristas/pedidos/${id}/facturar`),
    entregarPedido: (id) => API.post(`/mayoristas/pedidos/${id}/entregar`),
    cancelarPedido: (id) => API.post(`/mayoristas/pedidos/${id}/cancelar`),
    extenderPedido: (id, data) => API.post(`/mayoristas/pedidos/${id}/extender`, data),
    registrarPago: (id, data) => API.post(`/mayoristas/pedidos/${id}/pagos`, data)
  }
};

window.API = API;