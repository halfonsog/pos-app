# 05 — Frontend (SPA)

## 1. Modelo general

SPA **sin framework ni bundler**: un único shell `index.html` carga ~20 scripts en orden estricto. Todo son **objetos globales** (`window.App`, `window.ViewManager`, `window.State`, `window.API`, `window.Utils`, `window.Toast`, `window.Sidebar`, y un objeto por módulo: `Productos`, `Ventas`, `Compras`...).

Cada "vista" es un método de módulo que:
1. Llama a `API.*`.
2. Construye un **template string gigante** con toda la página (sidebar + navbar + contenido).
>> sidebar no deveria estrar en la string ya q es un componente separado. por favor revisalo
3. Lo inyecta con `$('#app').html(layout)`.
4. Ejecuta `bind*Events()` para enlazar handlers.

No hay fetch de HTML parciales: `views/` está **sin usar** (8 archivos vacíos + 3 legado).
>> Si consideras una mejor estrategia tener las vistas en ficheros en vez de en strings, entonces hagamoslo!
## 2. Núcleo

### `js/app.js` — arranque
- `init()`: si hay token → `API.auth.verify()` → guarda usuario → `cargarDatosIniciales()` (unidades + configuración general, en caché) → redirige por rol (admin→dashboard, vendedor→vendedor). Si no hay token → login.
- `logout()`: limpia estado y va a login.

### `js/viewManager.js` — enrutador propio (~60 rutas)
- Tabla `routes`: `pattern` → `{module, action}`. Soporta parámetros `:id` (`productos/ver/:id`).
- `navegar(ruta, params, {replace|reset})` → `history.pushState`/`replaceState` con URL `#ruta`.
- `_cargarVista()` invoca `window[modulo][accion](params)` — convención global.
- Botón back propio: contador `_historyCount` + listener `popstate`.
- ⚠ **No hay listener de `hashchange`**: los `<a href="#ruta">` directos cambian la URL pero no cargan vista (bug en dropdowns, breadcrumbs, cards).
- `refresh()` recarga la vista actual (usado tras mutaciones).
>> si tienes idea de como mejorar el viewmanager.js y la gestion de vistas, podemos discutirla. Lo mas importante es q el frontend sera una app y no habra navegador con barras ni botones. cada vista debe poder volver a la anterior

### `js/state.js` — estado global
- Token JWT y `user` en `localStorage`.
- `cache` con claves (`proveedores, productos, categorias, unidades, configuracion`); TTL de 3 min **comentado** → solo invalidación manual con `invalidateCache(key)`. `configuracion` y `unidades` están protegidas (se cargan una vez al inicio).
- `isAdmin()`, `hasRole()`, `clear()`.

### `js/api.js` — cliente HTTP
- Wrapper `fetch` contra `/api` con `Authorization: Bearer`.
- **Manejo global del 401**: limpia sesión, toast "Sesión expirada", redirige a login. ⚠ Las llamadas FormData no detectan 401.
- Catálogo de endpoints por dominio (`API.productos.crear`, `API.ventas.abrirTurno`...).
- ⚠ **BUG**: URLs con espacios en `proveedores.eliminar` y `listarContactos` → eliminar proveedor roto.
>> hacer aqui lo q se necesite para q todo este bien. si el arreglo es muy complejo lo hablamos primero

### `js/utils.js` — utilidades
- `formatMoney/formatNumber` (separador de miles `'` estilo suizo).
- Fechas: conversiones UTC↔local, rangos (`rangoHoy`, `rangoMes`, `rangoAnio`...), formatos ("Hoy 14:30").
- `confirm()` → Promise con modal Bootstrap (estándar de la app; duplicado por el componente confirm-modal sin usar).
- `showLoading/hideLoading` (overlay global).
- Unidades: `convertir`, `getUnidad`, `mismoTipo` (leyendo caché de State).
- Placeholders SVG de producto (color determinista por ID).

## 3. Componentes (`js/components/`)

| Componente | Estado |
|---|---|
| `sidebar.js` | **En uso.** Menú por rol (11 entradas admin / 4 vendedor). ⚠ incluye "Promociones" sin ruta |
| `toast.js` | **En uso.** Notificaciones auto-destructivas top-right |
| `dashboard-card.js` | Cargado pero apenas usado (los módulos construyen cards a mano) |
| `confirm-modal.js` | ❌ **Muerto** (no se carga en index.html; duplica `Utils.confirm`) |
| `datatable-wrapper.js` | ❌ **Muerto** (cada módulo copia la config DataTables a mano ×6) |
>> el componente confir-modal es necesario para obtener confirmacion del usuario en unos casos o para obligar al usuario a leer una informacion importante q pudiera pasar desapercibida en un toast.
>> datatable-wrapper podria ser de ayuda para cambiar facilmente comportamientos generales

## 4. Módulos (`js/modules/`)

Patrón común: `index` (dashboard del módulo con cards/stats) → `listado` (DataTable + filtros) → `formulario` (alta/edición) → `ficha` (detalle) + sub-vistas específicas.

👉 **El detalle de cada módulo está en [modulos/](modulos/README.md)** (un documento por módulo).
>> seria en /docs/modulos/[nombre del modulo].md, cierto?
Mapa rápido archivo → módulo: `productos.js` (~2110 l. ⚠) · `ventas.js` (~1730 ⚠) · `compras.js` (~1680 ⚠) · `proveedores.js` (~1270 ⚠) · `inventario.js` (~1165 ⚠) · `configuracion.js` (~884) · `reportes.js` (~627) · `contabilidad.js` (~503, roto) · `mantenimiento.js` (~298) · `vendedor.js` (~328) · `dashboard.js` (~241) · `categorias.js` (~217) · `selector-productos.js` (~216) · `auth.js` (~95)

## 5. PWA

- `manifest.json` correcto (nombre, iconos 192/512, standalone).
- `service-worker.js` **network-only, sin caché**: hace la app "instalable" pero no funciona offline (el POS necesita el backend).
- SW solo se registra fuera de `localhost`.

## 6. Problemas estructurales principales

1. **Archivos gigantes** (5 módulos >1000 líneas; funciones render de 150–250 líneas).
2. **Duplicación masiva**: `renderNavbar` idéntico ×8, `bindCommonEvents` ×8, config DataTables ×6, "esta semana" ×3, contactos de proveedor ×2, modales CRUD de configuración ×3, sidebar ×3.
3. **XSS**: HTML interpolado con `${valor}` sin escapar (nombres de productos/proveedores/observaciones van al DOM crudos) + JWT en localStorage.
4. **Código muerto**: views/, dashboard.html, vendor.html, confirm-modal, datatable-wrapper, selector legacy de compras.
5. **107 `console.log`** de depuración con datos sensibles.
6. **Fallbacks a datos mock** en proveedores/compras/inventario si falla la API (⚠ mostraría datos ficticios en producción).
7. **Doble binding de navegación** (`[data-route]` + `.clickable[data-route]`) → navegación duplicada.
8. Estado de formularios multi-paso en `sessionStorage` con claves ad-hoc (frágil pero funcional).
>> Necesitaremos corregir estos problemas. cuenta conmigo si necesitas alguna confirmacion

## 7. Aspectos positivos a conservar en una reescritura

- Patrón de módulo consistente y predecible.
- API centralizada con manejo global de sesión expirada.
- Buenas utilidades de fechas/rangos y conversiones de unidades.
- UX cuidada: teclado numérico del POS, arqueo por denominaciones, placeholders SVG, confirmaciones dobles en operaciones destructivas, bloqueo de edición en productos con dependencias, invalidación de caché tras mutaciones.
