/**
 * app.js - Punto de entrada principal de la aplicación
 */

const App = {

  init: async function () {
    console.log('🚀 Inicializando POS App...');

    const token = State.getToken();

    if (!token) {
      await ViewManager.navegar('auth/login');
      return;
    }

    try {
      const response = await API.auth.verify();
      State.setUser(response.user);

      // ✅ Cargar datos iniciales (unidades, categorías, etc.)
      await App.cargarDatosIniciales();

      if (response.user.rol === 'admin') {
        await ViewManager.navegar('dashboard');
      } else {
        await ViewManager.navegar('ventas/pos');
      }
    } catch (error) {
      console.error('Token inválido:', error);
      State.clear();
      await ViewManager.navegar('auth/login');
    }
  },

  cargarDatosIniciales: async function () {
    try {
      const [unidades, config] = await Promise.all([
        API.get('/configuracion/unidades'),
        API.get('/configuracion/general')
      ]);

      State.setCache('unidades', unidades);
      State.setCache('configuracion', config);

      console.log('✅ Unidades cargadas:', unidades.length);
      console.log('✅ Configuración cargada:', config);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    }
  },

  logout: function () {
    State.clear();
    ViewManager.navegar('auth/login');
  }
};

// Inicializar cuando el DOM esté listo
$(document).ready(() => {
  App.init();
});

// Exponer globalmente
window.App = App;