# 05 — Problemas Conocidos y Deuda Técnica

Inventario de bugs confirmados, riesgos de seguridad y deuda técnica pendientes. Sirve como backlog técnico. Actualizado a 2026-08-12: los problemas resueltos se retiran del listado.

## 1. Seguridad

| # | Problema | Ubicación | Estado |
|---|---|---|---|
| S5 | Credenciales por defecto (admin/admin123, vendedor/vendedor123) sin forzado de cambio | `database/scripts/init.js`, `js/modules/auth.js` | ⬜ (aviso "Demo: admin/admin123" del login ✅ eliminado 2026-08-12) |
| S6 | ✅ Sin rate-limiting ni lockout en `POST /api/auth/login`. Corregido (2026-08-12): lockout en memoria (5 fallos en 15 min → 429 por 15 min), sin dependencias. Test en `seguridad.test.js` | `authController.js` | ✅ |
| S7 | ✅ El errorHandler filtraba el mensaje SQL al cliente (`details: err.message`). Corregido (2026-08-12): ya no filtra detalles; errores con `err.status` pasan su mensaje | `middleware/errorHandler.js` | ✅ |
| S9 | XSS en frontend: HTML interpolado sin escapar (`${nombre}` directo al DOM) + JWT en localStorage | Todos los módulos frontend | ⬜ (mitigación parcial: helper `Utils.escapeHtml` disponible; escape global en API descartado por riesgo de corromper datos) |
| S10 | ✅ CORS totalmente abierto (`cors()` sin opciones). Corregido (2026-08-12): `cors({ origin: false })` — solo mismo origen (monolito local) | `app.js` | ✅ |
| ✅ | Sin SQL injection: todas las consultas usan parámetros `?` | Todo el backend | — |
| ✅ | RBAC en backend (`requireRole`), auth en mantenimiento/reportes/dashboard, backup/restore con validación de cabecera SQLite + `PRAGMA integrity_check` | — | — |

## 2. Bugs funcionales confirmados

### Backend

| # | Bug | Ubicación | Estado |
|---|---|---|---|
| B6 | ✅ `eliminarAnio` borraba el año indicado **y todos los anteriores**, sin transacción. Corregido (2026-08-12): borra SOLO el año en rango `[año, año+1)`, en transacción, con validación | `mantenimientoController.js` | ✅ |
| B7 | ✅ `eliminarInactivos` fallaba por FK con productos con historial, limpieza parcial. Corregido (2026-08-12): en transacción, borra solo inactivos sin historial e informa los omitidos | `mantenimientoController.js` | ✅ |
| B10 | ✅ `actualizarCompra` no recalculaba `estado_pago` al cambiar `pagado`. Corregido (2026-08-12) | `compraController.js` | ✅ |
| B11 | ✅ `getUnidadBase` indexaba un array por string → siempre null. Corregido (2026-08-12): busca por tipo/es_base | `utils/conversiones.js` | ✅ |
| B14 | ✅ El arqueo (desglose por denominaciones) no se persistía. Corregido (2026-08-12): tabla `arqueos` (m034), el cierre de turno guarda el detalle. Test: `ventas-turnos.test.js` | `ventaController.js` | ✅ |
| B16 | ✅ Fórmulas de rentabilidad inconsistentes entre `resumen-turno` y reportes. Corregido (2026-08-12): `rentabilidad` unificado a la fórmula del propietario (`ganancia = total − costo − gastos fijos absorbentes`) | `reportesController.js` | ✅ |
| B18 | ✅ `resumenAnual` TypeError si falta `anio`. Corregido (2026-08-12): valida `anio` (400) | `reportesController.js` | ✅ |
| B19 | ✅ `reajustarCuotas` regeneraba los vencimientos desde la **fecha MAX global** en vez de la del último pago → fechas saltaban años (inversión 60m generó 61 vencimientos con saltos). Corregido: continúa desde la fecha del último vencimiento pagado (2026-08-12) | `prestamoInversionController.js` | ✅ |

### Frontend

| # | Bug | Ubicación | Estado |
|---|---|---|---|
| F4 | Eliminar producto desde listado sin handler (clase `.eliminar-producto` vs `[data-eliminar]`) | `productos.js` | ✅ |
| F7 | ✅ Rentabilidad: fila de totales rota (`ganancia_bruta += ganancia_bruta` → siempre 0) y `<td class="text-end>` sin comilla. Corregido (2026-08-12) | `reportes.js` | ✅ |
| F9 | ✅ Impuesto del carrito incoherente: se unificó la regla del propietario (2026-08-12) — el precio de venta **incluye el impuesto** y el impuesto es el % (`impuesto_ventas`) del precio de venta; `neto = total × (1−tasa)`. Aplicado en carrito, `procesarVenta`, `crearVenta`, mayoristas/encargos y D3 (`precio = neto ÷ (1−tasa)`). Test: `impuesto-venta.test.js` | `ventas.js`, `ventaController.js`, `mayoristaController.js`, `costos.js` | ✅ |
| F10 | ✅ `compras/seleccionar-productos`: ruta inexistente usada como retorno (legacy). Eliminado el código muerto (2026-08-12); el flujo usa el selector unificado `selector-productos` | `compras.js` | ✅ |
| F11 | ✅ DataTable con columna `data:13` inexistente (silenciado por `errMode='none'`). Eliminada (2026-08-12) | `inventario.js` | ✅ |

## 3. Integridad de datos

- Conexión SQLite **singleton compartida** + transacciones manuales → interferencia entre peticiones concurrentes; check-then-act (TOCTOU) en validación de stock. Aceptable en monousuario.
- Operaciones multi-sentencia **sin transacción**: `eliminarCompra`, `eliminarAnio`, `eliminarEntidad`, `eliminarInactivos`, `reset`, `pagar`.
- Borrados físicos sin reversión de stock → stock inconsistente con la historia (limpiezas administrativas, no anulaciones).
- `movimientos_stock` sin CHECK de tipo ni FK a usuarios; `referencia_id` sobrecargado (id de compra, venta, producto preparado o producto contraparte).
- Fallbacks `req.usuario?.id || 1` en `inventarioController.js` y `ventaController.js`.

## 4. Deuda técnica general

- **Backend**: sin capa de validación sistemática; manejo de errores inconsistente (next vs 500 directo); queries N+1 (compras, receta, preparables); `LIMIT 100` fijos sin paginación real; `console.log` de depuración; `routes/usuarios.js` vacío; `eliminarUnidad` en controller sin ruta; categorías sin DELETE (a propósito).
- **Frontend**: archivos gigantes (`productos.js` ~2100 l.; `compras.js` ~1680 l.; `ventas.js` ~1730 l.; `proveedores.js` ~1270 l.); duplicación (navbar ×8, `bindCommon` ×8, DataTables ×6); XSS sin escaping (S9); código muerto (fallbacks mock, vistas legacy); `console.log` (~107); mezcla jQuery/vanilla sin criterio; sin lazy loading (~460 KB de JS propio siempre).
- **Pruebas**: Jest + supertest contra BD temporal desde las migraciones; **191 tests verdes** en 16 suites. La BD temporal se construye con `helpers/testDb.js`.