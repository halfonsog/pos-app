# 03 — API REST

Base: `/api` · Formato: JSON · Auth: `Authorization: Bearer <JWT>` (24h de expiración)

**Leyenda de acceso:**
- **[P]** público (sin token)
- **[A]** requiere token válido (cualquier rol)
- **[A+]** requiere token **admin** (middleware `requireRole`)

> La matriz rol↔endpoint está alineada con el menú lateral y verificada por `tests/seguridad.test.js`.

## Salud y Dashboard

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/health` | Health check | [P] |
| GET | `/api/dashboard?inicio&fin` | KPIs del rango: ventas, stock bajo, compras pendientes, alertas fiscales, top productos, actividad, ventas por hora, pedidos/encargos activos | [A] |

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
| POST | `/:id/receta` | Agregar componente (UPSERT; valida suma ≤ 1 por tipo de unidad; anti-ciclos) |
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
| POST | `/` | Crear con detalles; total y estado_pago calculados server-side |
| PUT | `/:id` | Actualizar (bloqueado si ya inventariada). ⚠ no recalcula estado_pago si cambia `pagado` (B10) |
| DELETE | `/:id` | Eliminar (bloqueado si inventariada; ⚠ sin transacción) |
| POST | `/:id/inventariar` | Pasa a stock: convierte unidades por coeficiente, incrementa stock, registra movimiento 'compra', actualiza costo_base; permite dividir entre inventarios (minorista/mayorista) |
| POST | `/:id/pagar` | Acumula pago y recalcula estado; valida monto>0 y ≤ pendiente; transferencia registra salida en banco |

## Inventario (`/api/inventario`) — lecturas [A], movimientos [A+]

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/resumen` | Alertas: sin ficha de costo, stock bajo (CTE compuestos), compras pendientes, preparaciones pendientes |
| GET | `/stock` | Listado enriquecido (es_preparable, puede_prepararse, stock_mayorista) |
| GET | `/movimientos` | Últimos movimientos (límite configurable) |
| GET | `/preparables` | Compuestos preparables con `cantidad_maxima` = min(⌊stock_componente ÷ cantidad_receta⌋) |
| GET | `/tipos-movimiento` | Catálogo D7 para los filtros del frontend |
| POST | `/preparar/:id` | Transacción: consume componentes ('preparacion_salida') e incrementa stock del preparado ('preparacion_entrada') |
| POST | `/ajuste` | Tipos: merma/donacion/autoconsumo (fuerza signo −) o ajuste libre ±. Valida stock en salidas |
| POST | `/intercambio` | D6: mueve stock de un reventa a un granel (cantidades libres, aviso de responsabilidad) |
| POST | `/transferir` | Transferencia entre inventarios minorista/mayorista (mismo producto) |

## Ventas (`/api/ventas`) — todas [A] (anular [A+])

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/turno-actual` | Turno abierto (caja única) |
| GET | `/mi-turno` | Turno abierto del vendedor del token |
| POST | `/abrir-turno` | body `{monto_apertura}`. El vendedor siempre abre a su nombre |
| POST | `/cerrar-turno` | Calcula esperado = apertura + ventas efectivo + cobros mayoristas efectivo del turno. ⚠ el desglose (arqueo por denominaciones) se recibe pero no se persiste (B14) |
| GET | `/resumen-turno/:id` | PyG del turno: venta neta, impuesto, redondeo, costos, gastos, margen + desglose por prioridades + %gastos proyectado vs real |
| GET | `/?inicio&fin&metodo_pago&busqueda` | Lista (LIMIT configurable). El vendedor solo ve sus ventas |
| GET | `/:id` | Detalle de venta |
| POST | `/` | Crear venta (transacción): valida stock, calcula impuesto incluido + redondeo, descuenta stock (o componentes), registra movimientos |
| POST | `/:id/anular` | Transacción: marca anulada y devuelve stock con movimientos 'devolucion'. **[A+]** |

## Configuración (`/api/configuracion`) — lecturas [A], escrituras [A+]

| Método | Ruta | Descripción |
|---|---|---|
| GET/PUT | `/general` | Parámetros globales. GET calcula al vuelo total_gastos_fijos y porcentaje_gastos (incluye gasto financiero del próximo vencimiento pendiente). PUT dispara recálculo de precios |
| GET/POST | `/gastos` · PUT/DELETE `/gastos/:id` | CRUD gastos fijos |
| GET | `/denominaciones` · `/denominaciones/todas` · PUT `/denominaciones/:id` | Toggle activo de billetes/monedas |
| GET/POST | `/categorias` · PUT `/categorias/:id` | CRUD categorías con subcategorías (padre_id, anti-ciclo; sin DELETE) |
| GET/POST | `/unidades` · PUT `/unidades/:id` | CRUD unidades (base id≤4 protegidas; no cambiar tipo en uso) |
| GET/POST | `/terminos-pago` · PUT/DELETE `/terminos-pago/:id` | CRUD términos de pago |

## Usuarios (`/api/usuarios`) — todas [A+]

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista con empleado asociado (nombre, cargo), tipo_venta y last_login |
| POST | `/` | Crear: `{username, password, nombre_completo, rol, empleado_id, tipo_venta?}`. Valida username único, rol válido, empleado existente |
| PUT | `/:id` | Actualizar nombre/rol/empleado/tipo_venta/activo. Protecciones: no auto-desactivarse ni dejar el sistema sin admins |
| PUT | `/:id/password` | Restablecer contraseña (admin) |

Sin borrado físico (tienen historial en ventas/compras/turnos): se desactiva.

## Empleados (`/api/empleados`) — todas [A+]

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista con `num_usuarios` por empleado |
| POST | `/` | Crear: `{nombre, identificacion?, cargo?, salario_mensual?}` |
| PUT | `/:id` | Actualizar nombre/identificacion/cargo/activo + `salario_mensual`, `aporte_corto_plazo`, `utilidades` |

## Préstamos e Inversiones (`/api/config/prestamos-inversiones`) — todas [A+]

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Listar (incluye `vencimientos_pendientes` y `aporte_mes_actual`) |
| GET | `/:id` | Detalle + tabla de `vencimientos` |
| POST | `/` | Crear + generar vencimientos (fórmulas del propietario) |
| PUT | `/:id` | Editar; si ya hay pagos, solo descripción/estado |
| DELETE | `/:id` | Cancelar (estado `cancelado`; vencimientos dejan de contar) |
| POST | `/:id/pagos` | Registrar pago `{ordinal, monto}`; en inversiones reajusta cuotas restantes |

## Clientes (`/api/clientes`) — GET/POST [A] (vendedor incluido), PUT [A+]

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista con saldo pendiente y nº de pedidos |
| GET | `/:id` | Ficha + últimos pedidos |
| POST | `/` | Crear (nombre, contrato, condicion_pago_id, limite_credito, descuento_global...) |
| PUT | `/:id` | Actualizar (sin borrado físico: desactivar) |

## Mayoristas (`/api/mayoristas`) — todas [A+]

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/resumen` | Panel: ventas del mes, por cobrar, pendientes, vencidos |
| GET | `/cuentas-por-cobrar` | Pedidos sin pagar del todo, con días de atraso por condición de pago |
| GET/POST | `/tramos/:productoId` · DELETE `/tramos/:id` | Precios por volumen (con ficha de costo del producto) |
| GET | `/pedidos?estado&filtro` | Lista (filtros: estado, por-cobrar, vencidos) |
| GET | `/pedidos/:id` | Detalle + líneas + pagos |
| POST | `/pedidos` | Crear (precios por tramo en servidor; descuento global del cliente; límite de crédito; conformados rechazados) |
| POST | `/pedidos/:id/facturar` | Crea asiento en `ventas` (tipo mayorista) + descuenta stock_mayorista (valida stock; soporta facturación parcial por líneas → estado 'parcial') |
| POST | `/pedidos/:id/entregar` | Marcar entregado |
| POST | `/pedidos/:id/cancelar` | Cancelar (anula venta y devuelve stock si estaba facturado; no si tiene pagos) |
| POST | `/pedidos/:id/extender` | Nueva fecha de vencimiento |
| POST | `/pedidos/:id/pagos` | Cobro parcial/mixto: efectivo→arqueo del turno; tarjeta/transferencia→banco; con moneda/tasa |

## Encargos minoristas — mismos endpoints `/api/mayoristas/pedidos` con `tipo='minorista'`

Los encargos reutilizan el ciclo de vida de pedidos (m024): se crean con `POST /api/mayoristas/pedidos` enviando `tipo:'minorista'` y `cliente_nombre` (sin registrar cliente); se entregan con `POST /api/mayoristas/pedidos/:id/entregar`, que crea la venta minorista (con turno si hay abierto), efectivo→arqueo y tarjeta→banco. El dashboard los muestra como "Encargos hoy" y "Pedidos y Encargos Activos".

## Contabilidad (`/api/contabilidad`) — todas [A+]

| Método | Ruta | Estado |
|---|---|---|
| POST | `/calcular-impuestos` | ✅ Motor de liquidación ONAE por período (mensual y trimestral; diciembre OK); aplica Porciento a Declarar |
| POST | `/registrar-pago` | Marca liquidación pagada/parcial; registra la salida en el banco |
| GET | `/historial` | ✅ Lista completa de liquidaciones |
| GET | `/balance` | ✅ Ingresos/gastos/compras del período (reales y declarados) |
| GET | `/estado-resultados` | ✅ PyG del período (ventas netas, costo, gastos, márgenes) + PD |
| GET | `/cierre-mes?mes&anio` | Desglose del recaudado por prioridades + dinero al banco (tarjeta) vs caja (efectivo) + pago a trabajadores + comparación %gastos proyectado vs real |
| GET | `/liquidacion-anual?anio` | Liquidación anual 0530222: ganancia neta del año × impuesto_ganancia (declarada × PD), −5% antes del 28/02 |
| GET | `/banco` | **Saldos por cuenta/moneda** (efectivo/banco × CUP/USD) + total equivalente en CUP + últimos movimientos |
| POST | `/banco/movimiento` | Depósito/retiro manual `{tipo, monto, descripcion?, referencia?, cuenta?, moneda?, tasa_cambio?}` |
| POST | `/cambio-divisas` | Cambio USD↔CUP a tasa acordada `{de, monto, tasa, cuenta?}` |
| GET | `/exportar?mes&anio` | **CSV de liquidaciones** del período (para software contable certificado, ej: Versat Sarasola) |
| GET | `/libro-diario?mes&anio` | **Libro diario**: ventas y gastos por día, reales y declarados (× PD) |
| GET | `/nominas?mes&anio` | Nóminas del período (con empleado, cargo, estado) |
| POST | `/nominas/generar` | Generar nóminas del mes (al cerrarlo; sin duplicar) |
| POST | `/nominas/:id/pagar-salario` | Pagar salario por **banco** (registra salida bancaria) |
| GET | `/bonos/ayuda` | Ayuda para decidir bonos por empleado (días trabajados de la semana, bonos del mes, salario, total a recibir, ventas por día) |
| POST | `/bonos` | Pagar bono semanal en **efectivo** (no se declara como salario) |

## Servicios (`/api/servicios`) — todas [A+]

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/?tipo=` | Lista de pagos/cobros por servicios (con vínculo a compra/pedido) |
| POST | `/` | Registrar servicio: `{descripcion, tipo, monto, moneda?, tasa_cambio?, cuenta, compra_id?, pedido_id?}` — mueve el saldo de la cuenta indicada |

## Reportes (`/api/reportes`) — `ventas-por-producto` [A]; el resto [A+]

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/ventas-por-producto` | Ventas, costos y ganancia por producto en rango |
| GET | `/tendencia?tipo=dia\|semana\|mes` | Serie temporal vía strftime |
| GET | `/rentabilidad` | Margen por producto ⚠ fórmula distinta a la de resumen-turno (B16) |
| GET | `/contables?anio&mes` | PyG mensual: ventas/compras/rentabilidad + impuesto a la ganancia |
| GET | `/resumen-anual?anio` | Totales por mes ⚠ TypeError si falta `anio` (B18) |

## Mantenimiento (`/api/mantenimiento`) — todas [A+] (alto riesgo)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/eliminar-inactivos` | Borra productos inactivos ⚠ falla por FK si tienen historia, sin transacción (B7) |
| POST | `/eliminar-anio` | ⚠ borra ese año **y todos los anteriores**, sin transacción (B6) |
| POST | `/eliminar-entidad` | Borrado físico por tipo+id ⚠ no revierte stock, sin transacción. Entidades: producto, compra, proveedor, cliente, venta, pedido, prestamo_inversion, servicio, nomina, bono |
| GET | `/backup` | Descarga copia de la BD (`VACUUM INTO`, snapshot consistente; nombre temporal único; se borra tras descargar) |
| POST | `/restaurar` | Sobrescribe la BD con un .db subido. Valida cabecera mágica SQLite + `PRAGMA integrity_check` antes de tocar nada; guarda `.pre_restore_<ts>`; exige reinicio manual |
| POST | `/reset` | Borra toda la operativa (ventas, compras, stock, pedidos+pagos, clientes, tramos, turnos, banco, servicios, nóminas, bonos, préstamos+vencimientos, liquidaciones, períodos, gastos). **Conserva** catálogos y configuración (usuarios, unidades, categorías, tributos, parámetros) |
| GET | `/logs` | Log del mes en curso |

## Convenciones de respuesta

- Éxito: JSON directo (`{...}` o `[...]`); a veces envuelto en `{success:true, data}` (inconsistente).
- Error: `{error: "mensaje"}` con código HTTP. El errorHandler convierte errores `SQLITE_*` en 400 (⚠ filtrando el detalle SQL al cliente, S7) y el resto en 500 (mensaje solo en development).