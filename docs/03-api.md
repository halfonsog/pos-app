# 03 — API REST

Base: `/api` · Formato: JSON · Auth: `Authorization: Bearer <JWT>` (24h de expiración)

**Leyenda de acceso:**
- **[P]** público (sin token)
- **[A]** requiere token válido (cualquier rol)
- **[A+]** requiere token **admin** (middleware `requireRole`, Sprint 0)

> ✅ **Sprint 0**: el backend ya verifica roles. Matriz alineada con el menú lateral: el vendedor solo lee catálogos y opera ventas; las escrituras, compras, proveedores, contabilidad, reportes de negocio y mantenimiento son admin. Verificado por `tests/seguridad.test.js` (59 tests).

## Salud y Dashboard

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/health` | Health check | [P] |
| GET | `/api/dashboard?inicio&fin` | KPIs del rango: ventas, stock bajo, compras pendientes, top productos, actividad, ventas por hora | [A] |

## Autenticación (`/api/auth`)

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| POST | `/login` | body `{username, password}` → `{token, user}`. bcrypt compare, actualiza last_login | [P] |
| POST | `/logout` | No-op (JWT stateless) | [P] |
| GET | `/verify` | Verifica token y que el usuario siga activo | [P] |
| POST | `/cambiar-password` | body `{actual, nueva}` | [A] |

## Productos (`/api/productos`) — lecturas [A], escrituras [A+]

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista con stock efectivo calculado (CTE para compuestos no-preparables) y flag `puede_venderse` |
| GET | `/:id` | Ficha completa: enriquece con costos, receta, dependencias (ventas/compras/recetas) |
| POST | `/` | Crear (multipart: foto opcional vía multer+sharp → `uploads/productos/`) |
| PUT | `/:id` | Actualizar (multipart). Borra foto antigua del disco si cambia |
| DELETE | `/:id` | Bloqueado si tiene movimientos de stock; borra recetas asociadas |
| GET | `/:id/receta` | Componentes del compuesto |
| POST | `/:id/receta` | Agregar componente (UPSERT; valida suma ≤ 1 por tipo de unidad) |
| DELETE | `/:id/receta/:componenteId` | Quitar componente |
| PUT | `/:id/costo` | Actualizar ficha de costo (costo_base, margen, gastos_fijos, impuesto) + precio_venta |
| GET | `/:id/trazabilidad` | Entradas/salidas/ajustes; stock esperado vs real; componente limitante (Pmin) |

## Proveedores (`/api/proveedores`) — todos [A+]

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista con saldo pendiente (SUM total−pagado) y nº de compras |
| GET | `/:id` | Ficha + contactos + últimas 5 compras |
| POST | `/` | Crear |
| PUT | `/:id` | Actualizar |
| DELETE | `/:id` | Bloqueado si tiene compras; borra contactos primero |
| GET | `/:id/contactos` | Listar contactos |
| POST | `/:id/contactos` | Crear contacto |
| PUT | `/:id/contactos/:cid` | Actualizar contacto |
| DELETE | `/:id/contactos/:cid` | Eliminar contacto |

## Compras (`/api/compras`) — todas [A+]

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista (⚠ N+1: una query de detalles por compra) |
| GET | `/:id` | Detalle completo |
| POST | `/` | Crear con detalles; total y estado_pago calculados server-side. ⚠ usuario_id hardcodeado a 1 |
| PUT | `/:id` | Actualizar (bloqueado si ya inventariada). ⚠ no recalcula estado_pago si cambia `pagado` |
| DELETE | `/:id` | Eliminar (bloqueado si inventariada; ⚠ sin transacción) |
| POST | `/:id/inventariar` | Pasa a stock: convierte unidades por coeficiente, incrementa stock, registra movimiento 'compra', actualiza costo_base. ⚠ usuario_id hardcodeado a 1 |
| POST | `/:id/pagar` | Acumula pago y recalcula estado. ⚠ sin validar monto; metodo_pago/referencia se descartan |

## Inventario (`/api/inventario`) — lecturas [A], movimientos [A+]

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/resumen` | Alertas: sin ficha de costo, stock bajo (CTE compuestos), compras pendientes, preparaciones pendientes |
| GET | `/stock` | Listado enriquecido (es_preparable, puede_prepararse) |
| GET | `/movimientos` | Últimos 100 movimientos |
| GET | `/preparables` | Compuestos preparables con `cantidad_maxima` = min(⌊stock_componente ÷ cantidad_receta⌋) |
| POST | `/preparar/:id` | Transacción: consume componentes ('preparacion_salida') e incrementa stock del preparado ('preparacion_entrada') |
| POST | `/ajuste` | Tipos: merma/donacion/autoconsumo (fuerza signo −) o ajuste libre ±. Valida stock en salidas |

## Ventas (`/api/ventas`) — todas [A]

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/turno-actual` | Turno abierto (caja única) |
| GET | `/mi-turno` | Turno abierto del vendedor del token |
| POST | `/abrir-turno` | body `{monto_apertura, vendedor_id?}` ⚠ acepta abrir a nombre de otro |
| POST | `/cerrar-turno` | Calcula esperado = apertura + ventas efectivo. Acepta `desglose` (arqueo) pero ⚠ lo ignora |
| GET | `/resumen-turno/:id` | PyG del turno: venta neta, impuesto, redondeo, costos, gastos, margen |
| GET | `/?inicio&fin&metodo_pago&busqueda` | Lista (LIMIT 100 fijo). ⚠ `isAdmin` calculado pero no usado (vendedor ve todo) |
| GET | `/:id` | Detalle de venta |
| POST | `/` | Crear venta (transacción): valida stock, calcula impuesto incluido + redondeo, descuenta stock (o componentes), registra movimientos |
| POST | `/:id/anular` | Transacción: marca anulada y devuelve stock con movimientos 'devolucion'. **[A+]** (Sprint 0) |

## Configuración (`/api/configuracion`) — lecturas [A], escrituras [A+]

| Método | Ruta | Descripción |
|---|---|---|
| GET/PUT | `/general` | Parámetros globales. GET calcula al vuelo total_gastos_fijos y porcentaje_gastos |
| GET/POST | `/gastos` · PUT/DELETE `/gastos/:id` | CRUD gastos fijos |
| GET | `/denominaciones` · `/denominaciones/todas` · PUT `/denominaciones/:id` | Toggle activo de billetes/monedas |
| GET/POST | `/categorias` · PUT `/categorias/:id` | CRUD categorías con subcategorías (padre_id, anti-ciclo, D8; sin DELETE) |
| GET/POST | `/unidades` · PUT `/unidades/:id` | CRUD unidades (base id≤4 protegidas; DELETE existe en controller pero sin ruta) |
| GET/POST | `/terminos-pago` · PUT/DELETE `/terminos-pago/:id` | CRUD términos de pago |

## Usuarios (`/api/usuarios`) — todas [A+] (Sprint 1)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista con empleado asociado (nombre, cargo), tipo_venta y last_login |
| POST | `/` | Crear: `{username, password, nombre_completo, rol, empleado_id, tipo_venta?}`. Valida username único, rol válido, empleado existente |
| PUT | `/:id` | Actualizar nombre/rol/empleado/tipo_venta/activo. Protecciones: no auto-desactivarse ni dejar el sistema sin admins |
| PUT | `/:id/password` | Restablecer contraseña (admin) |

Sin borrado físico (tienen historial en ventas/compras/turnos): se desactiva.

## Empleados (`/api/empleados`) — todas [A+] (Sprint 1 + nóminas m030)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista con `num_usuarios` por empleado |
| POST | `/` | Crear: `{nombre, identificacion?, cargo?, salario_mensual?}` |
| PUT | `/:id` | Actualizar nombre/identificacion/cargo/activo + **salario_mensual, aporte_corto_plazo, utilidades** |

## Préstamos e Inversiones (`/api/config/prestamos-inversiones`) — todas [A+] (Sprint 4b)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Listar (incluye `vencimientos_pendientes` y `aporte_mes_actual`) |
| GET | `/:id` | Detalle + tabla de `vencimientos` |
| POST | `/` | Crear + generar vencimientos (fórmulas del propietario) |
| PUT | `/:id` | Editar; si ya hay pagos, solo descripción/estado |
| DELETE | `/:id` | Cancelar (estado `cancelado`; vencimientos dejan de contar) |
| POST | `/:id/pagos` | Registrar pago `{ordinal, monto}`; en inversiones reajusta cuotas restantes |

## Clientes (`/api/clientes`) — GET/POST [A] (vendedor incluido, propietario), PUT [A+] (Sprint 5)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista con saldo pendiente y nº de pedidos |
| GET | `/:id` | Ficha + últimos pedidos |
| POST | `/` | Crear (nombre, contrato, condicion_pago_id, limite_credito, descuento_global...) |
| PUT | `/:id` | Actualizar (sin borrado físico: desactivar) |

## Mayoristas (`/api/mayoristas`) — todas [A+] (Sprint 5)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/resumen` | Panel: ventas del mes, por cobrar, pendientes, vencidos |
| GET | `/cuentas-por-cobrar` | Pedidos sin pagar del todo, con días de atraso por condición de pago |
| GET/POST | `/tramos/:productoId` · DELETE `/tramos/:id` | Precios por volumen (con ficha de costo del producto) |
| GET | `/pedidos?estado&filtro` | Lista (filtros: estado, por-cobrar, vencidos) |
| GET | `/pedidos/:id` | Detalle + líneas + pagos |
| POST | `/pedidos` | Crear (precios por tramo en servidor; descuento global del cliente; conformados rechazados) |
| POST | `/pedidos/:id/facturar` | Crea asiento en `ventas` (tipo mayorista) + descuenta stock_mayorista (valida stock) |
| POST | `/pedidos/:id/entregar` | Marcar entregado |
| POST | `/pedidos/:id/cancelar` | Cancelar (anula venta y devuelve stock si estaba facturado; no si tiene pagos) |
| POST | `/pedidos/:id/extender` | Nueva fecha de vencimiento |
| POST | `/pedidos/:id/pagos` | Cobro parcial/mixto: efectivo→arqueo del turno; tarjeta/transferencia→banco |

## Contabilidad (`/api/contabilidad`) — todas [A+] · ✅ corregido (2026-08-06)

| Método | Ruta | Estado |
|---|---|---|
| POST | `/calcular-impuestos` | ✅ Motor de liquidación ONAE por período (mensual y trimestral; diciembre OK) |
| POST | `/registrar-pago` | Marca liquidación pagada/parcial |
| GET | `/historial` | ✅ Lista completa de liquidaciones |
| GET | `/balance` | ✅ Ingresos/gastos/compras del período |
| GET | `/estado-resultados` | ✅ PyG del período (ventas netas, costo, gastos, márgenes) |
| GET | `/cierre-mes?mes&anio` | Desglose del recaudado por prioridades + **dinero al banco (tarjeta) vs caja (efectivo)** + comparación %gastos proyectado vs real |
| GET | `/liquidacion-anual?anio` | Liquidación anual 0530222: ganancia neta del año × impuesto_ganancia, con −5% antes del 28/02 |
| GET | `/banco` | **Saldos por moneda** (efectivo/banco × CUP/USD) + total equivalente en CUP + últimos movimientos |
| POST | `/banco/movimiento` | Depósito/retiro manual `{tipo, monto, descripcion?, referencia?}` |
| POST | `/cambio-divisas` | Cambio USD↔CUP a tasa acordada `{de, monto, tasa, cuenta?}` |
| GET | `/exportar?mes&anio` | **CSV de liquidaciones** del período (para software contable certificado, ej: Versat Sarasola) |
| GET | `/libro-diario?mes&anio` | **Libro diario**: ventas y gastos por día, reales y declarados (× porciento_declarar, m030) |
| GET | `/nominas?mes&anio` | Nóminas del período (con empleado, cargo, estado) |
| POST | `/nominas/generar` | Generar nóminas del mes (al cerrarlo; sin duplicar) |
| POST | `/nominas/:id/pagar-salario` | Pagar salario por **banco** (registra salida bancaria) |
| GET | `/bonos/ayuda` | Ayuda para decidir bonos por empleado (días trabajados de la semana, bonos del mes, salario, total a recibir, ventas por día) |
| POST | `/bonos` | Pagar bono semanal en **efectivo** (no se declara como salario) |

## Servicios (`/api/servicios`) — todas [A+] (m029)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/?tipo=` | Lista de pagos/cobros por servicios (con vínculo a compra/pedido) |
| POST | `/` | Registrar servicio: `{descripcion, tipo, monto, moneda?, tasa_cambio?, cuenta, compra_id?, pedido_id?}` — mueve el saldo de la cuenta indicada |

## Reportes (`/api/reportes`) — `ventas-por-producto` [A]; el resto [A+]

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/ventas-por-producto` | Ventas, costos y ganancia por producto en rango |
| GET | `/tendencia?tipo=dia\|semana\|mes` | Serie temporal vía strftime |
| GET | `/rentabilidad` | Margen por producto ⚠ fórmula distinta a la de resumen-turno |
| GET | `/contables?anio&mes` | PyG mensual: ventas/compras/rentabilidad + impuesto a la ganancia |
| GET | `/resumen-anual?anio` | Totales por mes ⚠ TypeError si falta `anio` |

## Mantenimiento (`/api/mantenimiento`) — todas [A+] (Sprint 0)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/eliminar-inactivos` | Borra productos inactivos ⚠ falla por FK si tienen historia, sin transacción |
| POST | `/eliminar-anio` | ⚠ borra ese año **y todos los anteriores**, sin transacción |
| POST | `/eliminar-entidad` | Borrado físico por tipo+id ⚠ no revierte stock, sin transacción |
| GET | `/backup` | Descarga copia de la BD (copia de archivo, no Backup API; nombre temp fijo) |
| POST | `/restaurar` | Sobrescribe la BD con un .db subido (valida solo extensión); guarda `.pre_restore_<ts>`; exige reinicio manual |
| POST | `/reset` | Borra toda la operativa ⚠ no toca tablas tributarias |
| GET | `/logs` | Log del mes en curso |

## Endpoints ausentes respecto al diseño (memoria.md)

- ~~CRUD de usuarios~~ ✅ Sprint 1 (con empleados mínimos).
- Gestión completa de empleados (campos laborales) y de tributos/tasas → Sprint 4.
- DELETE de unidades (existe en controller, sin ruta) y DELETE de categorías.
- Módulo de promociones (aparecía en el menú; oculto en Sprint 1 hasta su implementación en Sprint 7).

## Convenciones de respuesta

- Éxito: JSON directo (`{...}` o `[...]`); a veces envuelto en `{success:true, data}` (inconsistente).
- Error: `{error: "mensaje"}` con código HTTP. El errorHandler convierte errores `SQLITE_*` en 400 (⚠ filtrando el mensaje SQL al cliente) y el resto en 500 (mensaje solo en development).
