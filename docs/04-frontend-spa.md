# 04 — Frontend (SPA)

## 1. Modelo general

SPA **sin framework ni bundler**: un único shell `index.html` carga todos los scripts en orden estricto. Todo son **objetos globales** (`window.App`, `window.ViewManager`, `window.State`, `window.API`, `window.Utils`, `window.Toast`, `window.Sidebar`, y un objeto por módulo: `Productos`, `Ventas`, `Compras`...).

Cada "vista" es un método de módulo que:
1. Llama a `API.*`.
2. Construye un **template string** con el contenido de la página e inyecta el layout (sidebar + navbar + contenido).
3. Ejecuta `bind*Events()` para enlazar handlers.

No hay fetch de HTML parciales: las vistas viven como strings en los módulos.

## 2. Núcleo

### `js/app.js` — arranque
- `init()`: si hay token → `API.auth.verify()` → guarda usuario → `cargarDatosIniciales()` (unidades + configuración general, en caché) → redirige por rol (admin→dashboard, vendedor→vendedor). Si no hay token → login.
- `logout()`: limpia estado y va a login.

### `js/viewManager.js` — enrutador propio (~60 rutas)
- Tabla `routes`: `pattern` → `{module, action}`. Soporta parámetros `:id` (`productos/ver/:id`).
- `navegar(ruta, params, {replace|reset})` → `history.pushState`/`replaceState` con URL `#ruta`.
- `_cargarVista()` invoca `window[modulo][accion](params)` — convención global.
- Botón back propio: contador `_historyCount` + listener `popstate` + listener `hashchange` (navegación por anchors `#ruta`).
- `refresh()` recarga la vista actual (usado tras mutaciones).

### `js/state.js` — estado global
- Token JWT y `user` en `localStorage`.
- `cache` con claves (`proveedores, productos, categorias, unidades, configuracion`); invalidación manual con `invalidateCache(key)`. `configuracion` y `unidades` se cargan una vez al inicio.
- `isAdmin()`, `hasRole()`, `clear()`.

### `js/api.js` — cliente HTTP
- Wrapper `fetch` contra `/api` con `Authorization: Bearer`.
- **Manejo global del 401**: limpia sesión, toast "Sesión expirada", redirige a login.
- Catálogo de endpoints por dominio (`API.productos.crear`, `API.ventas.abrirTurno`...). Soporta `FormData` (fotos).

### `js/utils.js` — utilidades
- `formatMoney/formatNumber(x, decimales)` (separador de miles `'`; los dashboards usan 0 decimales).
- Fechas: conversiones UTC↔local, rangos (`rangoHoy`, `rangoMes`, `rangoAnio`...), formatos ("Hoy 14:30"). **Backend en UTC, frontend siempre en local.**
- `confirm()` → Promise con modal Bootstrap (estándar de la app).
- `showLoading/hideLoading` (overlay global).
- Unidades: `convertir`, `getUnidad`, `mismoTipo` (leyendo caché de State).
- Placeholders SVG de producto (color determinista por ID).

## 3. Componentes (`js/components/`)

| Componente | Estado |
|---|---|
| `sidebar.js` | **En uso.** Menú por rol (12 entradas admin / 5 vendedor), cabecera "POS Manager". Incluye Clientes y Mayoristas. Sin entradas sin módulo. |
| `toast.js` | **En uso.** Notificaciones auto-destructivas top-right. |
| `datatable-wrapper.js` | Cargado; cada módulo configura DataTables por su cuenta (=duplicación). |
| `form-modal.js` | Cargado; usado para formularios puntuales (doble confirmación, bonos, etc.). |
| `dashboard-card.js` | Cargado; los módulos construyen cards a mano con el mismo estilo. |

## 4. Módulos (`js/modules/`)

16 módulos cargados en `index.html` (en este orden):

`auth` · `dashboard` · `proveedores` · `categorias` · `productos` · `selector-productos` · `compras` · `inventario` · `ventas` · `configuracion` · `contabilidad` · `mantenimiento` · `mayoristas` · `clientes` · `vendedor` · `reportes`

Patrón común: `index` (dashboard del módulo con cards/stats, estilo uniforme y sin decimales) → `listado` (DataTable + filtros) → `formulario` (alta/edición) → `ficha` (detalle) + sub-vistas específicas.

Mapa archivo → módulo (tamaños actuales): `productos.js` (~2100 l. ⚠) · `ventas.js` (~1730 ⚠) · `compras.js` (~1680 ⚠) · `proveedores.js` (~1270 ⚠) · `inventario.js` (~1165 ⚠) · `configuracion.js` (~884) · `vendedor.js` (~328) · `reportes.js` (~627) · `mantenimiento.js` (~298) · `contabilidad.js` (~503) · `clientes.js` (~…) · `mayoristas.js` (~…) · `categorias.js` (~217) · `selector-productos.js` (~216) · `dashboard.js` (~241) · `auth.js` (~95).

**El detalle de cada módulo está en [modulos/](modulos/README.md)** (un documento por módulo).

## 5. PWA

- `manifest.json` correcto (nombre, iconos 192/512, standalone).
- `service-worker.js` **network-only, sin caché**: hace la app "instalable" pero no funciona offline (el POS necesita el backend).
- SW solo se registra fuera de `localhost`.

## 6. Problemas estructurales principales

1. **Archivos gigantes** (5 módulos >1000 líneas; funciones render grandes).
2. **Duplicación**: `renderNavbar` ×8, `bindCommonEvents` ×8, config DataTables ×6, sidebar repetida en módulos/vendedor.
3. **XSS**: HTML interpolado con `${valor}` sin escapar + JWT en localStorage.
4. **Código muerto**: fallbacks a datos mock en proveedores/compras/inventario, selector legacy de compras.
5. **`console.log`** de depuración.
6. Estado de formularios multi-paso en `sessionStorage` con claves ad-hoc (frágil pero funcional).

> Referencias de backlog: S9 (XSS), F10 (ruta legacy), F11 (data:13), D14 (layout unificado), D15 (sin mocks). Detalle en `05-problemas-conocidos.md` y `06-decisiones-y-roadmap.md`.

## 7. Aspectos positivos a conservar en una reescritura

- Patrón de módulo consistente y predecible.
- API centralizada con manejo global de sesión expirada.
- Buenas utilidades de fechas/rangos y conversiones de unidades.
- UX cuidada: teclado numérico del POS, arqueo por denominaciones, placeholders SVG, confirmaciones en operaciones destructivas, bloqueo de edición en productos con dependencias, invalidación de caché tras mutaciones, dashboard cards harmonizadas.