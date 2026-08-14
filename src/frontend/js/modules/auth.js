/**
 * auth.js - Módulo de autenticación
 */

const Auth = {

  login: async function () {
    console.log('🔐 Cargando vista de login');

    const html = `
            <div class="login-container">
                <div class="card login-card">
                    <div class="text-center mb-4">
                        <i class="fas fa-store fa-3x text-primary"></i>
                        <h3 class="mt-3">POS System</h3>
                        <p class="text-muted">Inicia sesión para continuar</p>
                    </div>
                    
                    <form id="loginForm">
                        <div class="mb-3">
                            <label class="form-label">Usuario</label>
                            <div class="input-group">
                                <span class="input-group-text">
                                    <i class="fas fa-user"></i>
                                </span>
                                <input type="text" class="form-control" id="username" 
                                       placeholder="admin" required autofocus>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Contraseña</label>
                            <div class="input-group">
                                <span class="input-group-text">
                                    <i class="fas fa-lock"></i>
                                </span>
                                <input type="password" class="form-control" id="password" 
                                       placeholder="••••••••" required>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn btn-primary w-100">
                            <i class="fas fa-sign-in-alt me-2"></i>Iniciar Sesión
                        </button>
                    </form>
                </div>
            </div>
        `;

    $('#app').html(html);

    $('#loginForm').on('submit', async function (e) {
      e.preventDefault();

      const username = $('#username').val().trim();
      const password = $('#password').val();

      if (!username || !password) {
        Toast.warning('Usuario y contraseña requeridos');
        return;
      }

      try {
        Utils.showLoading('Iniciando sesión...');

        const response = await API.auth.login(username, password);

        State.setToken(response.token);
        State.setUser(response.user);

        Utils.hideLoading();
        Toast.success(`¡Bienvenido ${response.user.nombre_completo}!`);

        // Redirigir según rol
        if (response.user.rol === 'admin') {
          await ViewManager.navegar('dashboard');
        } else {
          await ViewManager.navegar('vendedor');
        }

      } catch (error) {
        Utils.hideLoading();
        console.error(error);
      }
    });
  }
};

window.Auth = Auth;