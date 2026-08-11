# 02 — Base de Datos

**Motor:** SQLite 3 · **Archivo en uso:** `database/database.db` · **28 tablas** (+ `schema_migrations`, + `sqlite_sequence`)

> ⚠ **Fuente de verdad:** la carpeta `database/migrations/` (001–015). Los archivos `schema.sql` y `database.schema.sql` están **obsoletos** y son contradictorios entre sí. No usar como referencia.

## 1. Migraciones aplicadas

| Versión | Archivo | Qué crea |
|---|---|---|
| 001 | `001_catalogos_base.sql` | terminos_pago, categorias, tipos_gasto |
| 002 | `002_usuarios_y_proveedores.sql` | usuarios, proveedores, proveedor_contactos |
| 003 | `003_productos.sql` | productos, recetas, producto_costos |
| 004 | `004_compras_y_stock.sql` | compras, compra_detalles, movimientos_stock |
| 005 | `005_ficha_costo.sql` | (ajustes de ficha de costo) |
| 006 | `006_campos_producto.sql` | productos.descripcion_preparacion, productos.foto |
| — | ⚠ **007 no existe** | Salto de numeración (hubo reparación manual: `fix-migration.js`) |
| 008 | `008_configuracion.sql` | configuracion_general, configuracion_gastos, turnos, ventas, venta_detalles |
| 009 | `009_ventas.sql` | ajustes de ventas |
| 010 | `010_unidades.sql` | Recrea `unidades` (DROP + CREATE) con tipos y coeficientes |
| 011 | `011_redondeo.sql` | configuracion_general.redondeo_venta; ventas.ajuste_redondeo |
| 012 | `012_denominaciones.sql` | denominaciones (billetes/monedas para arqueo) |
| 013 | `013_nuevos_tipos_movimiento.sql` | Recrea movimientos_stock SIN CHECK de tipo y SIN FK a usuarios |
| 014 | `014_impuestos_conf.sql` | configuracion_general.impuesto_ganancia |
| 015 | `015_gstion_impuestos.sql` (typo "gstion") | Módulo tributario: tributos, configuracion_tributos, empleados, tributos_empleados, periodos_fiscales, liquidaciones_tributos, configuracion_tributos_historial; + columnas salario_minimo/base_contribucion_especial/limite_escala_retencion |
| 016 | `016_empleados_usuarios.sql` | D18: `usuarios.empleado_id NOT NULL → empleados(id)`; `empleados` pierde `usuario_id`; backfill de un empleado por usuario existente |
| 017 | `017_modelo_productos.sql` | D1: subtipos elaborado/conformado (drop `requiere_preparacion`); D3: `productos.costo_base` + `precio_recomendado`; D19: drop `factor_conversion` y `tipos_gasto`; índices de ventas |
| 018 | `018_tipos_movimiento_subcategorias.sql` | D7: catálogo `tipos_movimiento` (12 tipos con signo); D8: `categorias.padre_id`; normalización `donacion` → `donacion_salida` |
| 019 | `019_ajustes_modulos.sql` | `proveedores.contrato` (nº de contrato); `configuracion_general` renombrada a **`parametros_contables`**; DROP `producto_costos` (margen/gastos/impuesto se leen de parametros_contables) |
| 020 | `020_prestamos_inversiones.sql` | `prestamos_inversiones` (seguimiento de préstamos/inversiones) + `vencimientos` (tabla generada con fórmulas del propietario) |
| 021 | `021_contabilidad.sql` | `configuracion_tributos` para los 4 tributos que m015 dejó sin configurar (0810132, 0820232, 0520522, 0730122) — sin ellas el motor no los calculaba |
| 022 | `022_banco.sql` | `movimientos_bancarios` (deposito/retiro/compra_transferencia/pago_impuesto) — saldo del banco |
| 023 | `023_mayoristas.sql` | Ventas mayoristas: `clientes`, `venta_tramos` (precios por volumen), `pedidos` + `pedido_detalles` + `pagos_pedido`; `productos.stock_mayorista`; `movimientos_stock.inventario`; `ventas` recreada con `tipo_venta` + `cliente_id` + metodo_pago ampliado; tipo `transferencia` |
| 024 | `024_pedidos_minorista.sql` | `pedidos` recreada: `tipo` ('mayorista'/'minorista'), `cliente_id` nullable, `cliente_nombre` (encargos minoristas) |
| 025 | `025_soporte_usd.sql` | USD paralelo al CUP: `movimientos_bancarios` +`cuenta`/`moneda`/`tasa_cambio`; `pagos_pedido` +`moneda`/`tasa_cambio` |
| 026 | `026_sin_tasa_general.sql` | Quita `tasa_cambio_usd` de params (propietario: la tasa se acuerda en cada operación) |
| 027 | `027_movimientos_dinero.sql` | `movimientos_bancarios` recreada: tipos +`cambio_divisas`, `pago_servicio`, `cobro_servicio` |
| 028 | `028_facturacion_parcial.sql` | `pedido_detalles.cantidad_facturada`; `pedidos.estado` +`'parcial'` |
| 029 | `029_servicios_tipo_venta.sql` | `servicios` (pagos/cobros por servicios) + `usuarios.tipo_venta` |
| 030 | `030_contabilidad_nominas.sql` | `parametros_contables` +`porciento_declarar` (def 100) +`dia_pago_bonos` (def 5=viernes); `nominas` (salarios mensuales) + `bonos` (pagos semanales en efectivo) |

Las migraciones se registran en `schema_migrations` (version, name, executed_at, checksum MD5 — el checksum se guarda pero **nunca se verifica**).

## 2. Catálogo completo de tablas

### 2.1 Catálogos y configuración

**`terminos_pago`** — condiciones de pago para proveedores.
`id` · `nombre` · `dias` · `activo`
Seeds: Contado, 7 días, 30 días.

**`categorias`** — categorías de productos con subcategorías (D8, m018).
`id` · `nombre UNIQUE` · `descripcion` · `activo` · `padre_id → categorias` (null = raíz; anti-ciclo en backend) · `created_at`

**`unidades`** — unidades de medida con conversión por coeficiente.
`id` · `tipo CHECK('unidad','volumen','peso','longitud')` · `nombre` · `abreviatura` · `coeficiente` · `es_base` · `activo`
- IDs 1–4 **base y bloqueadas**: 1=ud, 2=litro, 3=lb, 4=metro.
- IDs 10–19 precargadas comunes (kg = 2.2 lb, etc.).
- IDs ≥ 100 libres para el usuario (sqlite_sequence forzado a 99).
- Conversión: `cantidad × coef_origen ÷ coef_destino` (válido solo entre unidades del mismo `tipo`).

**`denominaciones`** — billetes/monedas para el arqueo de caja.
`id` · `valor` · `activo` · `orden`

**`parametros_contables`** — registro único (id=1). *(renombrada desde `configuracion_general` en m019)*
`ventas_proyectadas` · `margen_recomendado` (def 20) · `impuesto_ventas` (def 15) · `redondeo_venta` (def 5) · `impuesto_ganancia` (def 35) · `salario_minimo` (def 3260) · `base_contribucion_especial` · `limite_escala_retencion` (def 15000) · **`porciento_declarar` (def 100; % de ventas y compras declaradas al fisco, m030)** · **`dia_pago_bonos` (def 5=viernes; día de la semana de pago de bonos, m030)** · `updated_at`
- `total_gastos_fijos` y `porcentaje_gastos` **no son columnas**: se calculan al vuelo en el controlador (fórmulas en modulos/configuracion.md).

**`configuracion_gastos`** — gastos fijos mensuales.
`id` · `concepto` · `valor_mensual` · `activo` · timestamps
Seeds: Alquiler, Salarios, Electricidad, Software.

**`tipos_gasto`** ✅ — **eliminada en m017** (estaba sin uso).

### 2.2 Entidades principales

**`usuarios`**
`id` · `username UNIQUE` · `password_hash` (bcrypt 10 rondas) · `nombre_completo` · `rol CHECK('admin','vendedor')` · `activo` · `last_login` · **`empleado_id NOT NULL → empleados`** (m016, D18: todo usuario pertenece a un empleado)
Seeds: admin/admin123, vendedor/vendedor123 (⚠ credenciales por defecto).

**`proveedores`**
`id` · `nombre` · `id_fiscal` · `direccion` · `telefono` · `termino_pago_id → terminos_pago` · `contrato` (nº de contrato, m019) · `activo` · timestamps

**`proveedor_contactos`**
`id` · `proveedor_id → proveedores ON DELETE CASCADE` · `nombre` · `cargo` · `telefono_movil` · `email`

**`productos`** — núcleo del catálogo.
`id` · `codigo UNIQUE` · `nombre` · `tipo CHECK('simple','compuesto')` · `sub_tipo CHECK('reventa','granel','elaborado','conformado')` · `precio_venta` · **`costo_base`** (último costo; compuestos = suma de receta) · **`precio_recomendado`** (costeo absorbente con margen_recomendado) · `stock_minimo` · `stock_actual` · `categoria_id → categorias` · `unidad_venta_id → unidades` · `unidad_compra_id → unidades` · `activo` · `descripcion_preparacion` · `foto` · timestamps

Combinaciones válidas (modelo D1, vigente desde m017):
| tipo | sub_tipo | Significado | Stock |
|---|---|---|---|
| simple | reventa | Se compra y se vende tal cual (solo unidades tipo 'unidad') | Propio |
| simple | granel | Se compra a granel y se vende por medida (kg, litros...) | Propio |
| compuesto | elaborado | Se prepara antes de vender (consume ingredientes → genera stock propio) | Propio |
| compuesto | conformado | Se arma en el momento de la venta según receta | **Virtual** = min(ingrediente.stock ÷ cantidad_receta) |

⚠ La BD viva tiene una columna `factor_conversion` que **ninguna migración crea** (añadida a mano; el código no la usa).

**`recetas`** — componentes de un producto compuesto.
`id` · `producto_padre_id → productos CASCADE` · `producto_hijo_id → productos` · `cantidad` · `UNIQUE(padre,hijo)`
Regla de negocio: la suma de cantidades de componentes del mismo tipo de unidad no puede exceder 1 (1 unidad del padre = suma de sus componentes). ⚠ No hay detección de ciclos (A→B→A).

**`producto_costos`** ✅ — **eliminada en m019** (propietario): `costo_base` y `precio_recomendado` viven en `productos`; `margen`, `gastos_fijos` e `impuesto` se toman de `parametros_contables` cuando se necesitan.

### 2.3 Operativa

**`compras`**
`id` · `proveedor_id` · `usuario_id → usuarios` · `fecha_compra` · `codigo_factura` · `total` · `pagado` · `estado_pago CHECK('pendiente','parcial','pagado')` · `estado_inventario CHECK('pendiente','completado')` · `observaciones` · timestamps

**`compra_detalles`**
`id` · `compra_id → compras CASCADE` · `producto_id` · `cantidad` (en unidad de compra) · `precio_unitario` · `total`

**`turnos`** — sesiones de caja. **Modelo de caja única**: solo un turno abierto en todo el sistema.
`id` · `vendedor_id → usuarios` · `monto_apertura` · `monto_cierre_esperado` · `monto_cierre_real` · `diferencia` · `estado CHECK('abierto','cerrado')` · `abierto_at` · `cerrado_at`

**`ventas`** (recreada en m023)
`id` · `turno_id` (NULL en mayoristas) · `vendedor_id → usuarios` · **`cliente_id → clientes`** (NULL en minorista) · **`tipo_venta CHECK('minorista','mayorista')`** · `subtotal` · `impuesto` · `total` · `ajuste_redondeo` · `metodo_pago CHECK('efectivo','tarjeta','transferencia','mixta')` · `estado CHECK('completada','anulada')` · `created_at`
⚠ El impuesto es **incluido** (el total lo paga el cliente; subtotal = total − impuesto). `total` se redondea **hacia arriba** al múltiplo de `redondeo_venta` (solo minorista) y la diferencia va a `ajuste_redondeo`.

**`venta_detalles`**
`id` · `venta_id → ventas CASCADE` · `producto_id` · `cantidad` · `precio_unitario` · `total`

**`movimientos_stock`** — bitácora de todo movimiento de inventario.
`id` · `producto_id` · `tipo TEXT` (catálogo `tipos_movimiento`, m018) · `cantidad` (con signo) · `referencia_id` (semántica según tipo) · `observaciones` · `created_at`
Tipos (D7): compra(+), venta(−), devolucion(+), preparacion_entrada(+), preparacion_salida(−), donacion_entrada(+), donacion_salida(−), merma(−), autoconsumo(−), intercambio_entrada(+), intercambio_salida(−), ajuste(±).
⚠ Sin FK a usuarios (perdida en m013). `referencia_id` está sobrecargado (id de compra, venta, producto preparado o producto contraparte en intercambios).

**`tipos_movimiento`** (m018, D7) — catálogo de tipos de movimiento.
`id` · `codigo UNIQUE` · `nombre` · `signo CHECK('+','-','+-')` · `descripcion` · `activo` · `orden`
Los filtros del listado de movimientos del frontend se generan desde esta tabla.

### 2.5 Préstamos e Inversiones (m020, especificación del propietario)

**`prestamos_inversiones`** — registro de seguimiento (no paga deudas reales).
`id` · `tipo CHECK('prestamo','inversion')` · `descripcion` · `capital_total` · `plazo_meses` · `tasa_anual` (puede ser 0) · `pago_capital` (= capital_total ÷ plazo_meses, redondeo a 2) · `fecha_inicio` · `estado CHECK('activo','cancelado')` · timestamps

**`vencimientos`** — tabla de vencimientos generada al crear/editar (día 1 de cada mes; el primero = mes siguiente a fecha_inicio).
`id` · `prestamo_inversion_id → CASCADE` · `ordinal` (1..plazo) · `fecha_vencimiento` · `capital` · `pago_capital` · `tarifa` (= tasa_mensual × capital_gravado) · `aporte` (= pago_capital + tarifa) · `monto_pagado` · `estado CHECK('pendiente','pagado','parcial')` · `fecha_pago` · `UNIQUE(prestamo_inversion_id, ordinal)`
Fórmulas (por ordinal i): `capital = capital_total − (i−1) × pago_capital` · `capital_gravado = prestamo: capital − pago_capital · inversion: 0 en el mes 1 (aporte a la par) y i × pago_capital desde el mes 2` (validado contra el Excel del propietario, com.md) · `tasa_mensual = tasa_anual/100/12` · último vencimiento absorbe el redondeo. En inversiones, un pago de capital distinto al programado **reajusta el número de cuotas restantes** (pago_capital base fijo; la última absorbe).
El **gasto financiero del mes** = Σ `aporte` de vencimientos del mes en curso con estado pendiente/parcial de registros activos → alimenta el %gastos del costeo (ya no es un concepto fijo en configuracion_gastos).

### 2.6 Banco (m022)

**`movimientos_bancarios`** — entradas/salidas del banco.
`id` · `tipo CHECK('deposito','retiro','compra_transferencia','pago_impuesto')` · `monto` (positivo; el signo lo da el tipo) · `fecha` · `descripcion` · `referencia` (nº transferencia/comprobante) · `usuario_id` · `created_at`

**Saldo del banco** = ventas por tarjeta (completadas − anuladas; calculado, no se almacena) + depósitos − retiros − compras por transferencia − pagos de impuestos por banco online + cobros mayoristas por tarjeta/transferencia ± cambios de divisas ± servicios.
**Saldos por moneda (m025)**: se calculan por separado para CUP y USD en efectivo y banco; el total equivalente en CUP usa la **última tasa de cambio usada** (no hay tasa general — propietario).
Las compras por transferencia se registran al pagar la compra (`compras/:id/pagar` con `metodo_pago='transferencia'`); los pagos de impuestos se registran al liquidar tributos (`registrar-pago`, por defecto por banco — propietario: "los pagos de impuestos se suelen hacer a través del banco online"). Los cobros mayoristas por tarjeta/transferencia también suman al saldo.

### 2.7 Ventas Mayoristas (m023, diseño en modulos/mayoristas.md)

**`clientes`** — clientes comerciales.
`id` · `nombre` · `identificacion` · `telefono` · `direccion` · `contrato` · `condicion_pago_id → terminos_pago` · `limite_credito` · `descuento_global` (%) · `activo` · timestamps

**`venta_tramos`** — precios por volumen por producto.
`id` · `producto_id → productos CASCADE` · `desde` · `hasta` (NULL = sin tope) · `precio` · `UNIQUE(producto_id, desde)`
Resolución: el tramo donde cae la cantidad; sin tramo → `precio_venta` minorista.

**`pedidos`** — pedidos mayoristas Y encargos minoristas (m024).
`id` · **`tipo CHECK('mayorista','minorista')`** · `cliente_id → clientes` (obligatorio en mayorista; NULL en minorista) · `cliente_nombre` (encargos minoristas, nombre libre) · `fecha` · `fecha_vencimiento` · `estado CHECK('pendiente','facturado','entregado','cancelado')` · `subtotal` · `impuesto` · `total` · `pagado` · `estado_pago` · `venta_id → ventas` (asiento al facturar/entregar) · `vendedor_id` · `observaciones` · timestamps

**`pedido_detalles`**: `id` · `pedido_id → CASCADE` · `producto_id` · `cantidad` · `precio_unitario` · `total`

**`pagos_pedido`**: `id` · `pedido_id → CASCADE` · `fecha` · `monto` · `metodo_pago CHECK('efectivo','tarjeta','transferencia')` · `referencia` · `usuario_id` · `created_at`

**Inventario separado**: `productos.stock_mayorista` (def 0) y `movimientos_stock.inventario` ('minorista' def / 'mayorista'). Movimiento `transferencia` en el catálogo. Los conformados no tienen stock mayorista (regla del propietario). Las compras pueden dividirse entre inventarios al inventariar (`distribuciones`).

**`servicios`** (m029) — pagos y cobros por servicios (estiba, transporte...).
`id` · `descripcion` · `tipo CHECK('pago','cobro')` · `monto` · `moneda` · `tasa_cambio` · `cuenta CHECK('efectivo','banco')` · `compra_id` · `pedido_id` (vínculos opcionales) · `referencia` · `usuario_id` · `fecha` · `created_at`
Efecto en saldos: pago resta, cobro suma, en la cuenta indicada.

**`usuarios.tipo_venta`** (m029): `minorista` / `mayorista` / `ambas` (def) — el vendedor solo puede operar en su(s) tipo(s) asignado(s) (forzado en backend para rol vendedor; admin siempre ambas).

### 2.4 Módulo tributario (m015, normativa cubana ONAE)

**`tributos`** — catálogo de impuestos.
`id` · `codigo UNIQUE` · `nombre` · `descripcion` · `periodo CHECK('mensual','trimestral','anual','puntual')` · `tipo_calculo CHECK('porcentaje_ventas','porcentaje_ingreso','escala_salario','fija','formula_libre')` · `expresion_formula` · `dias_limite_pago` · `activo`
9 tributos precargados (0114022, 0510122, 0530222, 0610322, 0810132, 0820132, 0820232, etc.).

**`configuracion_tributos`** — tasa/config vigente por tributo.
`id` · `tributo_id → tributos CASCADE` · `tasa` · `valor_fijo` · `escala_json` · `base_calculo` · `activo` · `vigencia_desde/hasta`

**`empleados`** — trabajadores del negocio (con o sin credenciales; D18). Campos laborales editables en su ficha.
`id` · `nombre` · `identificacion UNIQUE` · `cargo CHECK('vendedor','administrador','cajero','otro')` · `salario_mensual` · `aporte_corto_plazo` · `utilidades` · `activo` · `fecha_ingreso/salida` · ~~`usuario_id`~~ (eliminado en m016: la relación vive en `usuarios.empleado_id`, empleados 1—N usuarios)

**`nominas`** (m030) — salarios mensuales por empleado (generadas al cerrar el mes).
`id` · `empleado_id → empleados` · `anio` · `mes` · `salario_bruto` · `estado CHECK('pendiente','pagada')` · `fecha_pago_salario` (el salario sale del **banco** al pagarla) · `usuario_id` · `UNIQUE(empleado_id, anio, mes)`

**`bonos`** (m030) — pagos semanales en efectivo por empleado. **No se declaran como salarios** (fuera de la base del vector fiscal).
`id` · `empleado_id → empleados` · `fecha` · `monto` (sale del **efectivo**) · `usuario_id` · `created_at`

**`tributos_empleados`** — qué tributos aplican a qué empleado.
`id` · `tributo_id CASCADE` · `empleado_id CASCADE` · `aplica` · `tasa_personalizada` · `UNIQUE(tributo,empleado)`

**`periodos_fiscales`**
`id` · `tipo_periodo CHECK` · `anio` · `mes` · `trimestre` · `fecha_inicio/fin` · `fecha_limite_pago` · `cerrado` · `UNIQUE(tipo,anio,mes,trimestre)`

**`liquidaciones_tributos`** — impuestos calculados/pagados por período.
`id` · `tributo_id` · `periodo_fiscal_id` · `base_calculo` · `monto_calculado` · `monto_pagado` · `fecha_pago` · `comprobante_pago` · `estado CHECK('pendiente','pagado','parcial','exento')` · `observaciones`

**`configuracion_tributos_historial`** — auditoría de cambios de tasas.
`id` · `configuracion_tributo_id` · `tasa_anterior/nueva` · `fecha_cambio` · `motivo` · `usuario_id`

## 3. Índices

Productos (codigo, categoria, tipo, activo), compras (proveedor, fecha, estado), movimientos (producto, tipo, fecha), usuarios (username, rol, empleado), y desde m017: `ventas.created_at`, `ventas.turno_id`, `venta_detalles.venta_id`, `venta_detalles.producto_id`.

## 4. Scripts de BD (`database/scripts/`)

**`init.js`** (`db:init`) — Interactivo. Si la BD existe ofrece: (1) backup `.backup_<ts>` y regenerar, (2) cancelar, (3) sobrescribir sin backup. Ejecuta todas las migraciones en orden + seeds de development + re-hashea contraseñas admin/vendedor. Si falla, borra la BD corrupta.

**`migrate.js`** (`db:migrate`) — Aplica solo las migraciones pendientes comparando contra `schema_migrations`.

**`seeds.js`** (`db:seed`) — ✅ Script npm corregido en Sprint 0. Desactiva FKs, limpia tablas operativas (no ventas/turnos), ejecuta `development.sql`, re-hashea contraseñas.

**`fix-migration.js`** — Parche manual que marcó la versión 006 como aplicada. Ya cumplió su función: movido a `deleted/` (2026-08-05).

## 5. Inconsistencias conocidas del esquema

1. ~~Tres "fuentes de verdad"~~ ✅ **RESUELTO (2026-08-05)**: `schema.sql` y `database.schema.sql` movidos a `deleted/`; solo las migraciones son la fuente de verdad.
2. Migración 007 inexistente; typo `015_gstion_impuestos.sql`. (Cosmético; se deja constancia aquí. No renombrar migraciones ya aplicadas.)
3. ~~`productos.factor_conversion` sin migración~~ ✅ **RESUELTO (m017)**: columna eliminada; el factor vive en `unidades.coeficiente`.
4. `movimientos_stock` sin CHECK de tipo ni FK a usuarios → se normaliza con D7 (`tipos_movimiento`, Sprint 3).
5. `unidades.tipo` redefinida destructivamente entre schema.sql y m010. (Histórico; ya estabilizado.)
6. ~~`tipos_gasto` sin uso~~ ✅ eliminada en m017. `empleados` con endpoints mínimos desde Sprint 1; campos laborales en Sprint 4 (D18).
