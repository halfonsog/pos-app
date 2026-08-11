# 06 — Problemas Conocidos y Deuda Técnica

Inventario de bugs confirmados, riesgos de seguridad y deuda técnica, ordenado por severidad. Sirve como backlog técnico.

## 1. Seguridad — CRÍTICO

| # | Problema | Ubicación | Estado |
|---|---|---|---|
| S1 | **Mantenimiento sin autenticación**: reset total de BD, borrado masivo, **descarga del backup completo (con hashes de contraseñas)**, restauración de un `.db` arbitrario | `routes/mantenimiento.js` | ✅ **RESUELTO (Sprint 0)**: todo el router exige auth + `requireRole('admin')` |
| S2 | **Reportes y dashboard sin autenticación** → exposición de toda la información financiera | `routes/reportes.js`, `GET /api/dashboard` | ✅ **RESUELTO (Sprint 0)**: dashboard [A]; reportes [A]/[A+] |
| S3 | **RBAC inexistente en backend**: ningún endpoint verifica rol. Un vendedor puede anular ventas, modificar configuración, ver contabilidad, gestionar productos... | Todo el backend | ✅ **RESUELTO (Sprint 0)**: middleware `requireRole` + matriz rol↔endpoint según menú lateral, verificada por tests. Pendiente granularidad fina (Sprint 1: vendedor solo ve SUS ventas — B9) |
| S4 | **Secretos JWT por defecto inconsistentes** entre `authController.js` y `middleware/auth.js` (si falta la env var, firma ≠ verificación → tokens inválidos). `.env` con secreto débil versionado; archivo `repo.token` en la raíz del repo | backend, .env | ✅ **RESUELTO (Sprint 0)**: secreto único exportado desde `middleware/auth.js`; `repo.token` cubierto por `*.token` en .gitignore. ⚠ Pendiente: rotar el secreto del .env y sacarlo del historial git |
| S5 | Credenciales por defecto (admin/admin123, vendedor/vendedor123) sembradas por scripts, sin forzado de cambio; el login muestra "Demo: admin/admin123" | init.js, auth.js (front) | ⬜ Pendiente (Sprint 1 con CRUD usuarios) |
| S6 | Sin rate-limiting ni lockout en `/api/auth/login` (fuerza bruta factible) | auth | ⬜ Pendiente |
| S7 | Mensajes de error SQL filtrados al cliente (400 con `err.message` de SQLite) | errorHandler + varios controllers | ⬜ Pendiente |
| S8 | `restaurar` valida solo extensión del archivo, no que sea SQLite válido | uploadBackup.js | ⬜ Pendiente (riesgo reducido: ahora exige admin) |
| S9 | **XSS en frontend**: HTML interpolado sin escapar (`${nombre}` directo al DOM) + JWT en localStorage | Todos los módulos frontend | ⬜ Pendiente (Sprint 2+) |
| S10 | CORS totalmente abierto (`cors()` sin opciones) | app.js | ⬜ Pendiente |
| ✅ | **Sin SQL injection**: todas las consultas usan parámetros `?` | — | — |

## 2. Bugs funcionales confirmados

### Backend
| # | Bug | Ubicación | Estado |
|---|---|---|---|
| B1 | `getBalanceGeneral` y `getEstadoResultados` usan `req.get` en vez de `req.query` y tratan objetos como arrays → **endpoints rotos** | contabilidadController | ✅ **RESUELTO** (2026-08-06) |
| B2 | `getHistorial` usa `db.get()` para una lista → devuelve 1 sola liquidación | contabilidadController | ✅ **RESUELTO** (2026-08-06) |
| B3 | `calcularImpuestos`: diciembre genera mes 13; doble `JSON.parse` de `escala_json` | contabilidadController | ✅ **RESUELTO** (2026-08-06) — además: join empleados actualizado a D18 y tributos trimestrales incluidos |
| B4 | `trazabilidad`: crash (null deref en `pminComponente`) si un compuesto no-preparable no tiene compras de componentes | productoController | ✅ **RESUELTO (Sprint 2)**: sin entradas → responde ceros |
| B5 | `usuario_id` **hardcodeado a 1** en crear compra e inventariar → auditoría corrupta | compraController | ✅ **RESUELTO (Sprint 1)**: usa `req.usuario.id` |
| B6 | `eliminarAnio` borra el año indicado **y todos los anteriores** (mensaje engañoso), sin transacción | mantenimientoController | ⬜ |
| B7 | `eliminarInactivos` falla por FK con productos con historia, dejando limpieza parcial (sin transacción) | mantenimientoController | ⬜ |
| B8 | `npm run db:seed` y `db:reset` rotos (package.json llama `seed.js`, el archivo es `seeds.js`) | package.json | ✅ **RESUELTO (Sprint 0)** |
| B9 | `listarVentas`: `isAdmin` calculado y no usado (vendedor ve todas las ventas) | ventaController | ✅ **RESUELTO (Sprint 1)**: vendedor filtrado a sus ventas |
| B10 | `actualizarCompra` no recalcula `estado_pago` si cambia `pagado` | compraController | ⬜ |
| B11 | `getUnidadBase` indexa un array por string → siempre null; caché sin invalidación | utils/conversiones.js | ⬜ |
| B12 | `productoController.obtener` lee `config.porcentaje_gastos` (columna inexistente, es calculada) → fallback de gastos siempre 0 | productoController | ✅ **RESUELTO (Sprint 2)**: usa `costos.obtenerParametros` |
| B13 | `pagar` acepta sobrepagos/negativos; descarta metodo_pago y referencia | compraController | ✅ **RESUELTO (2026-08-06)**: valida monto>0 y ≤ pendiente; transferencia registra salida en banco |
| B14 | `cerrarTurno` acepta el `desglose` del arqueo pero lo ignora (no se persiste) | ventaController | ⬜ |
| B15 | `abrirTurno` permite abrir turno a nombre de otro usuario (vendedor_id del body) | ventaController | ✅ **RESUELTO (Sprint 1)**: vendedor siempre abre a su nombre |
| B16 | Fórmulas de rentabilidad inconsistentes entre resumen-turno y reportes | ventaController vs reportesController | ⬜ Sprint 4 |
| B17 | Backup por copia de archivo (no SQLite Backup API); nombre temporal fijo `backup.db` (colisión) | mantenimientoController | ✅ **RESUELTO (2026-08-08)**: `VACUUM INTO` + nombre único; restore valida cabecera SQLite + `PRAGMA integrity_check` antes de tocar la BD |
| B18 | `resumenAnual` TypeError si falta `anio`; mezcla de zonas horarias UTC/local en fechas | reportesController | ⬜ |

### Frontend
| # | Bug | Ubicación | Estado |
|---|---|---|---|
| F1 | URLs con espacios → **eliminar proveedor roto** | api.js líneas ~118-119 | ✅ **RESUELTO (Sprint 1)** |
| F2 | No hay listener `hashchange`: anchors `href="#ruta"` (dropdowns de compras, breadcrumbs, cards) cambian URL sin cargar vista | viewManager.js | ✅ **RESUELTO (Sprint 1)**: listener hashchange añadido |
| F3 | Doble binding `[data-route]` + `.clickable[data-route]` → navegación duplicada | bindIndexEvents de varios módulos | ✅ **RESUELTO (Sprint 1)**: binding único en dashboard/productos/compras/inventario |
| F4 | Eliminar producto desde listado sin handler (clase `.eliminar-producto` vs `[data-eliminar]`) | productos.js | ⬜ |
| F5 | Menú "Promociones" sin ruta ni módulo | sidebar.js | ✅ **RESUELTO (Sprint 1)**: ocultado hasta que exista el módulo (Sprint 7) |
| F6 | Contabilidad: endpoint inexistente (`ventasPorRango`), ruta inexistente (`contabilidad/tab`), selectores inexistentes → botones principales rotos | contabilidad.js | ✅ **RESUELTO** (2026-08-06): módulo reescrito mínimo viable con endpoints reales |
| F7 | Rentabilidad: fila de totales rota (globales implícitas, `ganancia_bruta += ganancia_bruta` → siempre 0); `<td class="text-end>` sin comilla | reportes.js | ⬜ |
| F8 | Porcentajes de turno: `formatMoney(x/y) * 100` (NaN con separadores de miles) | ventas.js | ✅ **RESUELTO (2026-08-08)**: % calculados con `(x/y*100).toFixed(1)` |
| F9 | Impuesto del carrito incoherente: `total×(1−pct)` vs `total÷(1+pct)` al procesar | ventas.js | ⬜ |
| F10 | `compras/seleccionar-productos`: ruta inexistente usada como retorno | compras.js (legacy) | ⬜ |
| F11 | DataTable con columna `data:13` inexistente (silenciado por errMode='none') | inventario.js, productos.js | ⬜ |

## 3. Integridad de datos

- Conexión SQLite **singleton compartida** + transacciones manuales → interferencia entre peticiones concurrentes; check-then-act (TOCTOU) en validación de stock.
- Operaciones multi-sentencia **sin transacción**: eliminarCompra, eliminarAnio, eliminarEntidad, eliminarInactivos, reset, pagar.
- Borrados físicos sin reversión de stock → stock inconsistente con la historia.
- `movimientos_stock` sin CHECK de tipo ni FK a usuarios; `referencia_id` sobrecargado.
- Tres archivos de esquema contradictorios; migración 007 ausente; columna `factor_conversion` sin migración; `fix-migration.js` como parche manual.
- Faltan índices en `ventas.created_at`, `ventas.turno_id`, `venta_detalles.*`.
- `reset` no limpia tablas tributarias.
- Fallbacks `req.usuario?.id || 1` en 6 lugares.

## 4. Deuda técnica general

- **Backend**: sin capa de validación sistemática; manejo de errores inconsistente (next vs 500 directo); N+1 queries (compras, receta, preparables); LIMIT 100 fijos sin paginación; `console.log` de depuración; `routes/usuarios.js` vacío; carpeta `deleted/`; ~~`db.js` ignora `DB_PATH`~~ (✅ Sprint 0); tabla `tipos_gasto` muerta; empleados/tributos sin endpoints; `eliminarUnidad` sin ruta.
- **Frontend**: archivos gigantes (>2000 líneas); duplicación masiva (navbar ×8, bindCommon ×8, DataTables ×6); XSS sin escaping; código muerto (views/, dashboard.html, vendor.html, confirm-modal, datatable-wrapper, selector legacy); 107 console.log; mocks de fallback en producción; estado de formularios en sessionStorage ad-hoc; mezcla jQuery/vanilla sin criterio; sin lazy loading (~460 KB de JS propio siempre).
- **Tests**: Jest instalado, **cero tests**.

## 5. Qué NO es problema (para no "arreglar" lo que funciona)

- Consultas parametrizadas en todo el backend.
- Transacciones con rollback en venta/anulación/preparación/inventariar (correctas en monousuario).
- Patrón de módulo frontend consistente.
- Migraciones ordenadas con registro en `schema_migrations`.
- Librerías frontend locales (offline).
