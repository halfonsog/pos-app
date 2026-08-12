# 05 — Problemas Conocidos y Deuda Técnica

Inventario de bugs confirmados, riesgos de seguridad y deuda técnica pendientes. Sirve como backlog técnico. Actualizado a 2026-08-11: los problemas resueltos se retiran del listado.

## 1. Seguridad

| # | Problema | Ubicación | Estado |
|---|---|---|---|
| S5 | Credenciales por defecto (admin/admin123, vendedor/vendedor123) sin forzado de cambio; el login muestra "Demo: admin / admin123" | `database/scripts/init.js`, `js/modules/auth.js` | ⬜ Pendiente |
| S6 | Sin rate-limiting ni lockout en `POST /api/auth/login` (fuerza bruta factible) | `authController.js` | ⬜ Pendiente |
| S7 | El errorHandler filtra el mensaje SQL al cliente (400 con `details: err.message`) | `middleware/errorHandler.js` | ⬜ Pendiente |
| S9 | XSS en frontend: HTML interpolado sin escapar (`${nombre}` directo al DOM) + JWT en localStorage | Todos los módulos frontend | ⬜ Pendiente |
| S10 | CORS totalmente abierto (`cors()` sin opciones) | `app.js` | ⬜ Pendiente |
| ✅ | Sin SQL injection: todas las consultas usan parámetros `?` | Todo el backend | — |
| ✅ | RBAC en backend (`requireRole`), auth en mantenimiento/reportes/dashboard, backup/restore con validación de cabecera SQLite + `PRAGMA integrity_check` | — | — |

## 2. Bugs funcionales confirmados

### Backend

| # | Bug | Ubicación | Estado |
|---|---|---|---|
| B6 | `eliminarAnio` borra el año indicado **y todos los anteriores** (mensaje engañoso), sin transacción | `mantenimientoController.js` | ⬜ |
| B7 | `eliminarInactivos` falla por FK con productos con historia, dejando limpieza parcial (sin transacción) | `mantenimientoController.js` | ⬜ |
| B10 | `actualizarCompra` no recalcula `estado_pago` si cambia `pagado` | `compraController.js` | ⬜ |
| B11 | `getUnidadBase` indexa un array por string → siempre null; caché sin invalidación | `utils/conversiones.js` | ⬜ |
| B14 | `cerrarTurno` recibe `desglose` (arqueo por denominaciones) pero no lo persiste | `ventaController.js` | ⬜ |
| B16 | Fórmulas de rentabilidad inconsistentes entre `resumen-turno` y reportes | `ventaController.js` vs `reportesController.js` | ⬜ |
| B18 | `resumenAnual` TypeError si falta `anio`; mezcla de zonas horarias UTC/local en fechas | `reportesController.js` | ⬜ |

### Frontend

| # | Bug | Ubicación | Estado |
|---|---|---|---|
| F4 | Eliminar producto desde listado sin handler (clase `.eliminar-producto` vs `[data-eliminar]`) | `productos.js` | ✅ |
| F7 | Rentabilidad: fila de totales rota (globales implícitas, `ganancia_bruta += ganancia_bruta` → siempre 0); `<td class="text-end>` sin comilla | `reportes.js` | ⬜ |
| F9 | Impuesto del carrito incoherente: `total×(1−pct)` vs `total÷(1+pct)` al procesar | `ventas.js` | ⬜ |
| F10 | `compras/seleccionar-productos`: ruta inexistente usada como retorno (legacy) | `compras.js` | ⬜ |
| F11 | DataTable con columna `data:13` inexistente (silenciado por `errMode='none'`) | `inventario.js`, `productos.js` | ⬜ |

## 3. Integridad de datos

- Conexión SQLite **singleton compartida** + transacciones manuales → interferencia entre peticiones concurrentes; check-then-act (TOCTOU) en validación de stock. Aceptable en monousuario.
- Operaciones multi-sentencia **sin transacción**: `eliminarCompra`, `eliminarAnio`, `eliminarEntidad`, `eliminarInactivos`, `reset`, `pagar`.
- Borrados físicos sin reversión de stock → stock inconsistente con la historia (limpiezas administrativas, no anulaciones).
- `movimientos_stock` sin CHECK de tipo ni FK a usuarios; `referencia_id` sobrecargado (id de compra, venta, producto preparado o producto contraparte).
- Fallbacks `req.usuario?.id || 1` en `inventarioController.js` y `ventaController.js`.

## 4. Deuda técnica general

- **Backend**: sin capa de validación sistemática; manejo de errores inconsistente (next vs 500 directo); queries N+1 (compras, receta, preparables); `LIMIT 100` fijos sin paginación real; `console.log` de depuración; `routes/usuarios.js` vacío; `eliminarUnidad` en controller sin ruta; categorías sin DELETE (a propósito).
- **Frontend**: archivos gigantes (`productos.js` ~2100 l.; `compras.js` ~1680 l.; `ventas.js` ~1730 l.; `proveedores.js` ~1270 l.); duplicación (navbar ×8, `bindCommon` ×8, DataTables ×6); XSS sin escaping (S9); código muerto (fallbacks mock, vistas legacy); `console.log` (~107); mezcla jQuery/vanilla sin criterio; sin lazy loading (~460 KB de JS propio siempre).
- **Pruebas**: Jest + supertest contra BD temporal desde las migraciones; **160 tests verdes** en 12 suites. La BD temporal se construye con `helpers/testDb.js`.