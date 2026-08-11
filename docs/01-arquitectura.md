# 01 — Arquitectura

## 1. Visión general

Monolito de un solo proceso Node.js que:

- Sirve la **API REST** bajo `/api/*`.
- Sirve el **frontend estático** (SPA) desde `src/frontend/`.
- Persiste todo en un único archivo **SQLite** (`database/database.db`).

No hay build step, ni bundler, ni framework frontend. Todo es JS clásico con objetos globales.

```
┌─────────────────────────────────────────────────────┐
│ Navegador (PWA)                                     │
│  index.html → SPA (objetos globales: App, ViewManager│
│  State, API, Utils, Toast, Sidebar, + 16 módulos)   │
└──────────────────────┬──────────────────────────────┘
                       │ fetch /api/* (JWT Bearer)
┌──────────────────────▼──────────────────────────────┐
│ Express (server.js → src/backend/app.js)            │
│  helmet · cors(abierto) · morgan · json             │
│  /api → routes/api.js → routers → controllers       │
│  estáticos: src/frontend                            │
│  fallback * → index.html                            │
└──────────────────────┬──────────────────────────────┘
                       │ sqlite (singleton getDb())
┌──────────────────────▼──────────────────────────────┐
│ SQLite: database/database.db (36 tablas + schema)   │
└─────────────────────────────────────────────────────┘
```

## 2. Stack tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| Runtime | Node.js + Express 4 | Entrada: `server.js` |
| Base de datos | SQLite 3 (vía `sqlite` + `sqlite3`) | Conexión singleton en `src/backend/models/db.js` |
| Auth | JWT (`jsonwebtoken`) + `bcrypt` | Token 24h, payload `{id, username, rol}` |
| Subida de archivos | `multer` + `sharp` | Fotos de productos (resize 800x800 JPEG) y backups `.db` |
| Frontend | JS vanilla + jQuery 3.7 + Bootstrap 5 + DataTables + Chart.js + FontAwesome | Librerías locales en `src/frontend/lib/` (offline) |
| PWA | manifest.json + service-worker.js | SW **sin caché** (network-only); solo hace la app "instalable" |
| Tests | Jest + supertest | 12 suites, 160 tests contra BD temporal |

## 3. Estructura de directorios real

```
app/
├── server.js                  # Entrada: arranca Express en PORT
├── package.json               # Scripts npm (ver §5) + config jest
├── .env                       # PORT, NODE_ENV, JWT_SECRET, DB_PATH
├── check-db.js                # Utilidad manual de inspección de BD
├── database/
│   ├── database.db            # BD real en uso (NO versionar)
│   ├── migrations/            # 001–030 (la fuente de verdad del esquema)
│   ├── seeds/                 # development.sql, production.sql
│   └── scripts/               # init.js, migrate.js, seeds.js
├── src/
│   ├── backend/
│   │   ├── app.js             # Config Express + montaje de API + fallback SPA
│   │   ├── models/db.js       # Conexión SQLite singleton (respeta DB_PATH)
│   │   ├── middleware/        # auth.js (+requireRole), errorHandler.js, upload.js, uploadBackup.js
│   │   ├── routes/            # api.js (monta todo) + routers por dominio
│   │   ├── controllers/       # Controladores (lógica de negocio + SQL)
│   │   └── utils/             # conversiones.js, logger.js, costos.js (costeo + desglose por prioridades)
│   └── frontend/
│       ├── index.html         # ÚNICO shell de la SPA (carga los scripts en orden)
│       ├── manifest.json, service-worker.js
│       ├── css/app.css
│       ├── js/
│       │   ├── app.js         # Arranque, login check, datos iniciales
│       │   ├── viewManager.js # Enrutador propio (hash + History API + hashchange)
│       │   ├── state.js       # Estado global + caché + localStorage
│       │   ├── api.js         # Cliente HTTP + catálogo de endpoints (401 global, también FormData)
│       │   ├── utils.js       # formatMoney(x, decimales), fechas UTC↔local, unidades, UI helpers
│       │   ├── components/    # sidebar ("POS Manager"), toast, datatable-wrapper, form-modal, dashboard-card
│       │   └── modules/       # 16 módulos (uno por pantalla/dominio; vistas completas, sin modales)
│       ├── lib/               # Librerías vendor (offline) — NO tocar
│       └── uploads/productos/ # Fotos subidas
├── tests/                     # Jest + supertest (BD temporal desde migraciones)
│   ├── helpers/testDb.js
│   └── *.test.js              # 12 suites, 160 tests
├── backups/                   # Backups manuales de la BD (NO versionar)
├── logs/                      # Logs mensuales del sistema
├── temp/                      # Uploads temporales de backups
└── deleted/                   # Papelera: código/esquemas/archivos retirados (recuperable)
```

> Regla permanente: mantener este árbol actualizado con cada cambio (aplica a todos los docs).

## 4. Flujo de arranque

1. `node server.js` → carga `.env` → `require('./src/backend/app')`.
2. `app.js` configura middlewares: `helmet` (CSP desactivada), `cors` abierto, `morgan('dev')`, JSON parsers, estáticos con `setHeaders` manual para `.js`/`.css`.
3. `app.use('/api', apiRoutes)` → `routes/api.js` monta los routers.
4. `app.get('*')` → sirve `index.html` (fallback SPA). ⚠ Un `GET /api/ruta-inexistente` devuelve HTML en vez de 404 JSON.
5. Primera consulta a BD → `getDb()` abre `database/database.db`, activa `PRAGMA foreign_keys=ON`. Si el archivo no existe, **lanza excepción y mata el proceso**.

## 5. Scripts npm

| Script | Comando real | Estado |
|---|---|---|
| `npm start` | `node server.js` | OK (producción) |
| `npm run dev` | `nodemon server.js` | OK (desarrollo, auto-reinicia al cambiar código) |
| `npm run db:init` | `database/scripts/init.js` | OK — recrea BD desde cero (interactivo, pide confirmación) |
| `npm run db:migrate` | `database/scripts/migrate.js` | OK — aplica migraciones pendientes |
| `npm run db:seed` | `database/scripts/seeds.js` | OK |
| `npm run db:reset` | `init.js && seeds.js` | OK |
| `npm test` | `jest` | OK — 160 tests contra BD temporal |

## 6. Configuración (.env)

```
PORT=3000
NODE_ENV=development
JWT_SECRET=...            # ⚠ débil y versionado en el repo (rotar antes de distribuir)
DB_PATH=./database/database.db   # ✅ respetada por db.js (rutas relativas = raíz del proyecto)
```

Ver también S4 resuelto (secreto único desde `middleware/auth.js`) y S5 (rotación del secreto pendiente) en `05-problemas-conocidos.md`.

## 7. Decisiones de diseño clave (y sus consecuencias)

1. **Conexión SQLite singleton compartida** por todas las peticiones → las transacciones manuales (`BEGIN/COMMIT`) de dos peticiones concurrentes interferirían. Aceptable en monousuario, peligroso si crece.
2. **SPA sin framework**: cada módulo es un objeto global; cada "vista" es un método que genera un template string y lo inyecta en `$('#app')`. Re-render completo en cada navegación.
3. **Autenticación JWT stateless**: `logout` es un no-op; el token vive 24h en `localStorage`.
4. **Autorización (RBAC) en backend**: `requireRole` en `middleware/auth.js` + matriz rol↔endpoint (ver 03-api.md y `tests/seguridad.test.js`).
5. **Offline-first parcial**: las librerías son locales, pero la app no funciona sin el backend (SW sin caché).
6. **Distribución objetivo (D17)**: app nativa por plataforma/SO con **todas las dependencias incluidas** en el instalador. El navegador/PWA actual es solo el vehículo temporal.
7. **Convención de fechas (D20)**: backend/BD en **UTC** (SQLite `CURRENT_TIMESTAMP`); el frontend presenta siempre en **hora local** mediante `Utils` (no inventar conversiones).