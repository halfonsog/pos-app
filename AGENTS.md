# AGENTS.md — Sistema POS (punto-de-venta)

## Qué es esto

Aplicación **offline, monousuario** de punto de venta: monolito Node.js/Express + SQLite que sirve API REST (`/api`) y una SPA en JS vanilla + jQuery + Bootstrap. Autor: Heriberto Alfonso. En producción local con datos reales (`database/database.db` — **nunca borrar ni reinicializar sin backup explícito del usuario**).

## Documentación técnica

**Lee primero `docs/`** (es la fuente de verdad mantenida):

- `docs/README.md` — índice general.
- `docs/01-arquitectura.md` — stack, estructura, scripts npm.
- `docs/02-base-de-datos.md` — 28 tablas y migraciones (001–015).
- `docs/03-api.md` — todos los endpoints.
- `docs/04-frontend-spa.md` — arquitectura de la SPA (ViewManager, State, API, componentes).
- `docs/05-problemas-conocidos.md` — bugs y deuda con IDs (S/B/F).
- `docs/06-decisiones-y-roadmap.md` — **decisiones aprobadas por el propietario y roadmap por sprints. Consultar siempre antes de diseñar algo nuevo.**
- `docs/08-estado-actual.md` — **snapshot de continuidad para abrir sesiones nuevas** (qué está hecho, qué sigue, convenciones clave).
- `docs/modulos/` — **un documento por módulo** (productos, ventas, compras, inventario, mayoristas, etc.). Empieza por el módulo que vayas a tocar.

`memoria.md` es el documento de diseño original (parcialmente desactualizado; prevalece docs/06). `leeme.txt` (raíz de pos3) tiene notas de npm.

## Comandos

```bash
npm run dev        # desarrollo (nodemon)
npm start          # producción
npm run db:migrate # aplicar migraciones pendientes
npm run db:init    # ⚠ RECREA la BD desde cero (interactivo) — NUNCA sin permiso
npm test           # tests (jest + supertest contra BD temporal en tests/)
```

## Convenciones del código

- **Backend**: routers finos en `src/backend/routes/`, lógica + SQL en `src/backend/controllers/`, conexión singleton en `models/db.js` (`getDb()`, respeta `DB_PATH`). Consultas siempre parametrizadas (`?`). Respuestas de error como `{error: msg}`. Seguridad: `authMiddleware` (JWT) + `requireRole('admin')` de `middleware/auth.js`; matriz rol↔endpoint en docs/03-api.md.
- **Frontend**: un objeto global por módulo en `src/frontend/js/modules/`; cada vista = método que inyecta un template string en `$('#app')` + `bind*Events()`. Navegación SOLO vía `ViewManager.navegar()`. Peticiones SOLO vía `API.*` (api.js). Estado global en `State`. UI común: `Utils.confirm`, `Toast.*`, `Utils.showLoading`.
- **BD**: cambios de esquema = nueva migración numerada en `database/migrations/` (siguiente: 016), nunca editar migraciones ya aplicadas.
- Idioma: código y UI en español.

## Reglas para agentes

1. **No ejecutes** `db:init`, `db:reset`, ni endpoints de mantenimiento (reset/restaurar/eliminar) sin confirmación explícita del usuario.
2. Haz **backup de `database/database.db`** antes de cualquier cambio que toque datos o esquema.
3. No commitees `.env` ni `database.db` (ya deberían estar en .gitignore — verificar).
4. Si modificas estructura/estilos/flujos documentados en `docs/`, **actualiza el doc correspondiente** en el mismo cambio.
5. Cambios mínimos y consistentes con el estilo existente. No introduzcas frameworks ni build steps sin acordarlo antes con el usuario.
6. Al corregir un bug de `docs/05-problemas-conocidos.md`, márcalo como resuelto en ese archivo.
