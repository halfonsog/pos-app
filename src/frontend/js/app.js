/**
 * app.js - Punto de entrada principal de la aplicación
 */

const App = {

  init: async function () {
    console.log('🚀 Inicializando POS App...');

    // Verificar autenticación
    const token = State.getToken();

    if (!token) {
      // Redirigir a login
      await ViewManager.navegar('auth/login');
      return;
    }

    // Verificar token con el backend
    try {
      const response = await API.auth.verify();
      State.setUser(response.user);

      // Cargar vista según rol
      if (response.user.rol === 'admin') {
        await ViewManager.navegar('dashboard');
      } else {
        await ViewManager.navegar('ventas/nueva');
      }
    } catch (error) {
      console.error('Token inválido:', error);
      State.clear();
      await ViewManager.navegar('auth/login');
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