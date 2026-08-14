# 02 — Base de Datos

**Motor:** SQLite 3 · **Archivo en uso:** `database/database.db` · **36 tablas de negocio** (+ `schema_migrations` y `sqlite_sequence`)

> ⚠ **Fuente de verdad:** la carpeta `database/migrations/` (versiones 001–030). No hay ninguna otra referencia de esquema.

## 1. Migraciones aplicadas

Las migraciones se registran en `schema_migrations` (version, name, executed_at, checksum MD5 — el checksum se guarda pero **nunca se verifica**).

| Versión | Archivo | Qué crea/cierra |
|---|---|---|
| 001 | `001_catalogos_base.sql` | terminos_pago, categorias, tipos_gasto |
| 002 | `002_usuarios_y_proveedores.sql` | usuarios, proveedores, proveedor_contactos |
| 003 | `003_productos.sql` | productos, recetas, producto_costos |
| 004 | `004_compras_y_stock.sql` | compras, compra_detalles, movimientos_stock |
| 005 | `005_ficha_costo.sql` | Ajustes de ficha de costo |
| 006 | `006_campos_producto.sql` | productos.descripcion_preparacion, productos.foto |
| — | ⚠ **007 no existe** | Salto de numeración (parche manual `fix-migration.js` ya retirado) |
| 008 | `008_configuracion.sql` | configuracion_general, configuracion_gastos, turnos, ventas, venta_detalles |
| 009 | `009_ventas.sql` | Ajustes de ventas |
| 010 | `010_unidades.sql` | Recrea `unidades` (DROP + CREATE) con tipos y coeficientes |
| 011 | `011_redondeo.sql` | configuracion_general.redondeo_venta; ventas.ajuste_redondeo |
| 012 | `012_denominaciones.sql` | denominaciones (billetes/monedas para arqueo) |
| 013 | `013_nuevos_tipos_movimiento.sql` | Recrea movimientos_stock SIN CHECK de tipo y SIN FK a usuarios |
| 014 | `014_impuestos_conf.sql` | configuracion_general.impuesto_ganancia |
| 015 | `015_gstion_impuestos.sql` (typo "gstion") | Módulo tributario: tributos, configuracion_tributos, empleados, tributos_empleados, periodos_fiscales, liquidaciones_tributos, configuracion_tributos_historial; columnas salario_minimo/base_contribucion_especial/limite_escala_retencion |
| 016 | `016_empleados_usuarios.sql` | `usuarios.empleado_id NOT NULL → empleados(id)`; `empleados` pierde `usuario_id`; backfill de un empleado por usuario |
| 017 | `017_modelo_productos.sql` | Subtipos elaborado/conformado (D1); `productos.costo_base` + `precio_recomendado` (D3); drop `factor_conversion`, drop `tipos_gasto`; índices de ventas |
| 018 | `018_tipos_movimiento_subcategorias.sql` | Catálogo `tipos_movimiento` (12 tipos con signo, D7); `categorias.padre_id` (D8); normalización `donacion` → `donacion_salida` |
| 019 | `019_ajustes_modulos.sql` | `proveedores.contrato`; `configuracion_general` renombrada a **`parametros_contables`**; DROP `producto_costos` |
| 020 | `020_prestamos_inversiones.sql` | `prestamos_inversiones` + `vencimientos` (fórmulas del propietario) |
| 021 | `021_contabilidad.sql` | `configuracion_tributos` para los tributos que m015 dejó sin configurar (0810132, 0820232, 0520522, 0730122) |
| 022 | `022_banco.sql` | `movimientos_bancarios` (deposito/retiro/compra_transferencia/pago_impuesto) |
| 023 | `023_mayoristas.sql` | Ventas mayoristas: `clientes`, `venta_tramos`, `pedidos` + `pedido_detalles` + `pagos_pedido`; `productos.stock_mayorista`; `movimientos_stock.inventario`; `ventas` recreada con `tipo_venta` + `cliente_id` + metodo_pago ampliado; tipo `transferencia` |
| 024 | `024_pedidos_minorista.sql` | `pedidos` recreada: `tipo` ('mayorista'/'minorista'), `cliente_id` nullable, `cliente_nombre` (encargos) |
| 025 | `025_soporte_usd.sql` | USD paralelo al CUP: `movimientos_bancarios` +`cuenta`/`moneda`/`tasa_cambio`; `pagos_pedido` +`moneda`/`tasa_cambio` |
| 026 | `026_sin_tasa_general.sql` | Quita `tasa_cambio_usd` de params (la tasa se acuerda en cada operación) |
| 027 | `027_movimientos_dinero.sql` | `movimientos_bancarios` recreada: tipos +`cambio_divisas`, `pago_servicio`, `cobro_servicio` |
| 028 | `028_facturacion_parcial.sql` | `pedido_detalles.cantidad_facturada`; `pedidos.estado` +`'parcial'` |
| 029 | `029_servicios_tipo_venta.sql` | `servicios` + `usuarios.tipo_venta` |
| 030 | `030_contabilidad_nominas.sql` | `parametros_contables` +`porciento_declarar` (def 100) +`dia_pago_bonos` (def 5=viernes); `nominas` + `bonos` |
| 031 | `031_renombrar_parametros_contables.sql` | `parametros_contables` renombrada a **`configuracion_contabilidad`** (propietario, `com.md` #2a) |
| 032 | `032_fiscal_dos_mundos.sql` | Modelo fiscal de dos mundos (D30–D36): `categorias.gravable` + `categorias.es_sistema`; categoría de sistema **"No gravable"** (gravable=0, es_sistema=1); `servicios.tiene_factura` (def 1); **se elimina** `configuracion_contabilidad.porciento_declarar` (PD deprecado) |
| 033 | `033_cierre_mes.sql` | Cierre de mes (D38): tablas `cierres_mes` (ficha por mes, UNIQUE mes/anio) + `cierre_mes_aplicaciones` (aplicación del excedente a vencimientos) |
| 034 | `034_arqueos.sql` | Arqueo de caja persistido (B14): detalle del conteo por denominaciones de cada turno cerrado |
| 035 | `035_movimiento_compra_efectivo.sql` | Soporte USD completo: nuevo tipo `compra_efectivo` en `movimientos_bancarios` (pago de compra en efectivo, CUP o USD) |

## 2. Catálogo completo de tablas

### 2.1 Catálogos y configuración

**`terminos_pago`** — condiciones de pago.
`id` · `nombre` · `dias` · `activo`
Seeds: Contado, 7 días, 30 días. Usados por proveedores y por clientes (condición de pago).
**`categorias`** — categorías de productos con subcategorías.

`id` · `nombre UNIQUE` · `descripcion` · `activo` · `padre_id → categorias` (null = raíz; anti-ciclo en backend) · `gravable` (1=declarable, 0=excluida del mundo fiscal; se hereda del padre al crear, m032) · `es_sistema` (1 = categoría de sistema no editable/eliminable — la raíz "No gravable", m032) · `created_at`

**`unidades`** — unidades de medida con conversión por coeficiente.
`id` · `tipo CHECK('unidad','volumen','peso','longitud')` · `nombre` · `abreviatura` · `coeficiente` · `es_base` · `activo`
- IDs 1–4 **base y bloqueadas**: 1=ud, 2=litro, 3=lb, 4=metro.
- IDs 10–19 precargadas comunes (kg = 2.2 lb, etc.).
- IDs ≥ 100 libres para el usuario (sqlite_sequence forzado a 99).
- Conversión: `cantidad × coef_origen ÷ coef_destino` (válido solo entre unidades del mismo `tipo`). La unidad de compra y de venta de un producto deben ser del mismo tipo.

**`denominaciones`** — billetes/monedas para el arqueo de caja.
`id` · `valor` · `activo` · `orden`. Toggle según lo que circula.
**`configuracion_contabilidad`** — registro único (id=1). Antes `parametros_contables` (m031 lo renombró).

`ventas_proyectadas` · `margen_recomendado` (def 20) · `impuesto_ventas` (def 15) · `redondeo_venta` (def 5) · `impuesto_ganancia` (def 35) · `salario_minimo` (def 3260) · `base_contribucion_especial` · `limite_escala_retencion` (def 15000) · `dia_pago_bonos` (def 5=viernes) · `updated_at` (el `porciento_declarar` se eliminó en m032 — sustituido por el modelo fiscal de dos mundos, D30–D36)
- `total_gastos_fijos` y `porcentaje_gastos` **no son columnas**: se calculan al vuelo (fórmulas en `modulos/configuracion.md`).
- Auto-siembra: si falta el registro id=1 se crea solo.

**`configuracion_gastos`** — gastos fijos mensuales.
`id` · `concepto` · `valor_mensual` · `activo` · timestamps. Seeds: Alquiler, Salarios, Electricidad, Software.

### 2.2 Entidades principales

**`usuarios`**
`id` · `username UNIQUE` · `password_hash` (bcrypt 10 rondas) · `nombre_completo` · `rol CHECK('admin','vendedor')` · `activo` · `last_login` · **`empleado_id NOT NULL → empleados`** (relación empleados 1—N usuarios) · `tipo_venta` ('minorista'/'mayorista'/'ambas', def 'ambas')
Seeds: admin/admin123, vendedor/vendedor123 (⚠ credenciales por defecto). Sin borrado físico (historial en ventas/compras/turnos): se desactiva.

**`empleados`** — trabajadores del negocio (con o sin credenciales).
`id` · `nombre` · `identificacion UNIQUE` · `cargo CHECK('vendedor','administrador','cajero','otro')` · `salario_mensual` · `aporte_corto_plazo` · `utilidades` · `activo` · `fecha_ingreso/salida`

**`proveedores`**
`id` · `nombre` · `id_fiscal` · `direccion` · `telefono` · `termino_pago_id → terminos_pago` · `contrato` (nº de contrato firmado, texto) · `activo` · timestamps

**`proveedor_contactos`**
`id` · `proveedor_id → proveedores ON DELETE CASCADE` · `nombre` · `cargo` · `telefono_movil` · `email`

**`clientes`** — clientes comerciales (mayoristas).
`id` · `nombre` · `identificacion` · `telefono` · `direccion` · `contrato` · `condicion_pago_id → terminos_pago` · `limite_credito` · `descuento_global` (%) · `activo` · timestamps. Sin borrado físico: desactivar.

**`productos`** — núcleo del catálogo.
`id` · `codigo UNIQUE` · `nombre` · `tipo CHECK('simple','compuesto')` · `sub_tipo CHECK('reventa','granel','elaborado','conformado')` · `precio_venta` · **`costo_base`** (último costo; compuestos = suma de receta) · **`precio_recomendado`** (costeo absorbente con margen_recomendado) · `stock_minimo` · `stock_actual` · **`stock_mayorista`** (def 0) · `categoria_id → categorias` · `unidad_venta_id → unidades` · `unidad_compra_id → unidades` · `activo` · `descripcion_preparacion` · `foto` · timestamps

Combinaciones válidas (subtipos):
| tipo | sub_tipo | Significado | Stock |
|---|---|---|---|
| simple | reventa | Se compra y se vende tal cual | Propio |
| simple | granel | Se compra a granel y se vende por medida (kg, litros...) | Propio |
| compuesto | elaborado | Se prepara antes de vender (consume ingredientes → stock propio) | Propio |
| compuesto | conformado | Se arma en el momento de la venta según receta | **Virtual** = min(ingrediente.stock ÷ cantidad_receta) |

Campos editables (D4): solo nombre, descripción, foto, categoría, stock_minimo, precio_venta, activo. El backend RECHAZA (400) tipo, sub_tipo, unidades, stock_actual, costo_base, precio_recomendado — cambian por vías controladas (receta, movimientos, compras, recálculo).

**`recetas`** — componentes de un producto compuesto.
`id` · `producto_padre_id → productos CASCADE` · `producto_hijo_id → productos` · `cantidad` · `UNIQUE(padre,hijo)`
Reglas: la suma de cantidades de componentes del mismo tipo de unidad ≤ 1; ingredientes solo **granel** o **elaborados**; **anti-ciclos recursivo con CTE** (nadie puede ser ingrediente de sí mismo ni de quien lo contiene).

### 2.3 Operativa

**`compras`**
`id` · `proveedor_id` · `usuario_id → usuarios` · `fecha_compra` · `codigo_factura` · `total` · `pagado` · `estado_pago CHECK('pendiente','parcial','pagado')` · `estado_inventario CHECK('pendiente','completado')` · `observaciones` · timestamps

**`compra_detalles`**
`id` · `compra_id → compras CASCADE` · `producto_id` · `cantidad` (unidad de compra) · `precio_unitario` · `total`
Al inventariar, cada línea puede dividirse entre inventarios (minorista/mayorista, `distribuciones`).

**`turnos`** — sesiones de caja. **Modelo de caja única**: solo un turno abierto en todo el sistema.
`id` · `vendedor_id → usuarios` · `monto_apertura` · `monto_cierre_esperado` · `monto_cierre_real` · `diferencia` · `estado CHECK('abierto','cerrado')` · `abierto_at` · `cerrado_at`

**`arqueos`** (m034, B14) — detalle del conteo por denominaciones al cerrar el turno.
`id` · `turno_id → CASCADE` · `valor` · `cantidad` · `subtotal` · `created_at`

**`ventas`** (asientos minoristas Y mayoristas)
`id` · `turno_id` (NULL en mayoristas) · `vendedor_id → usuarios` · `cliente_id → clientes` (NULL en minorista) · `tipo_venta CHECK('minorista','mayorista')` · `subtotal` · `impuesto` · `total` · `ajuste_redondeo` · `metodo_pago CHECK('efectivo','tarjeta','transferencia','mixta')` · `estado CHECK('completada','anulada')` · `created_at`
El impuesto es **incluido** (el total lo paga el cliente; subtotal = total − impuesto). En minorista, `total` se redondea hacia arriba al múltiplo de `redondeo_venta`; la diferencia va a `ajuste_redondeo`.

**`venta_detalles`**
`id` · `venta_id → ventas CASCADE` · `producto_id` · `cantidad` · `precio_unitario` · `total`
Al facturar mayorista, la cantidad se convierte de **unidad mayorista (= unidad de compra)** a **unidad de venta** para consolidar reportes.

**`movimientos_stock`** — bitácora de todo movimiento de inventario.
`id` · `producto_id` · `tipo TEXT` · `cantidad` (con signo) · `referencia_id` (semántica según tipo) · `inventario` ('minorista' def / 'mayorista') · `observaciones` · `created_at`
Tipos (D7): compra(+), venta(−), devolucion(+), preparacion_entrada(+), preparacion_salida(−), donacion_entrada(+), donacion_salida(−), merma(−), autoconsumo(−), intercambio_entrada(+), intercambio_salida(−), transferencia(± entre inventarios), ajuste(±).
⚠ Sin FK a usuarios (perdida en m013). `referencia_id` sobrecargado.

**`tipos_movimiento`** — catálogo de tipos de movimiento (D7).
`id` · `codigo UNIQUE` · `nombre` · `signo CHECK('+','-','+-')` · `descripcion` · `activo` · `orden`. Los filtros del frontend se generan desde esta tabla.

### 2.4 Préstamos e Inversiones (m020)

**`prestamos_inversiones`** — registro de seguimiento (no paga deudas reales).
`id` · `tipo CHECK('prestamo','inversion')` · `descripcion` · `capital_total` · `plazo_meses` · `tasa_anual` (puede ser 0) · `pago_capital` (= capital_total ÷ plazo_meses, redondeo 2) · `fecha_inicio` · `estado CHECK('activo','cancelado')` · timestamps

**`vencimientos`** — generados al crear/editar (día 1 de cada mes; el primero = mes siguiente a fecha_inicio).
`id` · `prestamo_inversion_id → CASCADE` · `ordinal` (1..plazo) · `fecha_vencimiento` · `capital` · `pago_capital` · `tarifa` (= tasa_mensual × capital_gravado) · `aporte` (= pago_capital + tarifa) · `monto_pagado` · `estado CHECK('pendiente','pagado','parcial')` · `fecha_pago` · `UNIQUE(prestamo_inversion_id, ordinal)`
Fórmulas (por ordinal i): `capital = capital_total − (i−1) × pago_capital` · `capital_gravado = prestamo: capital − pago_capital · inversion: 0 en el mes 1 (aporte a la par) e i × pago_capital desde el mes 2` · `tasa_mensual = tasa_anual/100/12` · último vencimiento absorbe el redondeo. En inversiones, un pago de capital distinto al programado **reajusta el número de cuotas restantes** (pago_capital base fijo; la última absorbe). En el cierre de mes (D38) el excedente acelera el capital (menos cuotas): en **préstamos** las tarifas se **preservan por ordinal original** (el acreedor recibe el mismo total de intereses pactado).
El **gasto financiero del mes** = Σ `aporte` del **próximo vencimiento pendiente** de cada registro activo (si vence el 01/09, los precios del mes actual lo cubren) → alimenta el %gastos del costeo, junto con los **gastos fijos** = Σ `configuracion_gastos` activos + Σ `empleados.salario_mensual` de activos (regla del propietario 2026-08-11).

**`cierres_mes`** (m033) — ficha de cierre de mes (D38).
`id` · `mes` · `anio` · `recaudado` · `venta_neta` · `impuestos` · `costo_base` · `gastos_fijos_equiv` · `prestamos_equiv` · `inversiones_equiv` · `margen` · `ganancias` · `excedente` · `destino CHECK('inversiones','prestamos','ganancias')` · `excedente_aplicado` · `usuario_id` · `creado_en` · `UNIQUE(mes, anio)`

**`cierre_mes_aplicaciones`** (m033) — detalle de cómo se aplicó el excedente.
`id` · `cierre_mes_id → CASCADE` · `registro_id → prestamos_inversiones` · `vencimiento_id` · `tipo_registro CHECK('inversion','prestamo')` · `monto_aplicado` · `descripcion` · `creado_en`

### 2.5 Banco, divisas y servicios (m022, m025–m027, m029)

**`movimientos_bancarios`** — entradas/salidas del banco y efectivo en múltiples monedas.
`id` · `tipo CHECK('deposito','retiro','compra_transferencia','pago_impuesto','cambio_divisas','pago_servicio','cobro_servicio')` · `monto` (positivo; el signo lo da el tipo) · `cuenta` ('efectivo'/'banco') · `moneda` ('CUP'/'USD') · `tasa_cambio` · `fecha` · `descripcion` · `referencia` · `usuario_id` · `created_at`

**Saldo por cuenta/moneda** (calculado, no almacenado) = ventas tarjeta (completadas − anuladas) + depósitos − retiros − compras transferencia − pagos impuestos + cobros mayoristas tarjeta/transferencia ± cambios de divisas ± servicios.

**`servicios`** — pagos/cobros por servicios (estiba, transporte...).
`id` · `descripcion` · `tipo CHECK('pago','cobro')` · `monto` · `moneda` · `tasa_cambio` · `cuenta CHECK('efectivo','banco')` · `compra_id` · `pedido_id` (vínculos opcionales) · `referencia` · `tiene_factura` (1/0; solo los que tienen factura entran al mundo declarado, D33, m032) · `usuario_id` · `fecha` · `created_at`. Pago resta, cobro suma, en la cuenta indicada.

### 2.6 Pedidos (mayoristas y encargos)

**`pedidos`**
`id` · `tipo CHECK('mayorista','minorista')` · `cliente_id → clientes` (mayorista) / `cliente_nombre` (encargo, nombre libre) · `fecha` · `fecha_vencimiento` · `estado CHECK('pendiente','parcial','facturado','entregado','cancelado')` · `subtotal` · `impuesto` · `total` · `pagado` · `estado_pago` · `venta_id → ventas` (asiento al facturar/entregar) · `vendedor_id` · `observaciones` · timestamps

**`pedido_detalles`**: `id` · `pedido_id → CASCADE` · `producto_id` · `cantidad` · `cantidad_facturada` (facturación parcial) · `precio_unitario` (por tramo de volumen) · `total`

**`pagos_pedido`**: `id` · `pedido_id → CASCADE` · `fecha` · `monto` · `metodo_pago CHECK('efectivo','tarjeta','transferencia')` · `referencia` · `usuario_id` · `created_at` · `moneda` · `tasa_cambio`. Efectivo → arqueo del turno; tarjeta/transferencia → banco.

**`venta_tramos`** — precios por volumen por producto.
`id` · `producto_id → productos CASCADE` · `desde` · `hasta` (NULL = sin tope) · `precio` · `UNIQUE(producto_id, desde)`
Resolución: el tramo donde cae la cantidad; sin tramo → `precio_venta` minorista. Cantidades en unidad de compra (unidad mayorista).

### 2.7 Módulo tributario (m015, normativa cubana ONAE)

**`tributos`** — catálogo de impuestos.
`id` · `codigo UNIQUE` · `nombre` · `descripcion` · `periodo CHECK('mensual','trimestral','anual','puntual')` · `tipo_calculo CHECK('porcentaje_ventas','porcentaje_ingreso','escala_salario','fija','formula_libre')` · `expresion_formula` · `dias_limite_pago` · `activo`
9 tributos precargados (0114022, 0510122, 0530222, 0610322, 0810132, 0820132, 0820232, 0520522, 0730122).

**`configuracion_tributos`** — tasa/config vigente por tributo.
`id` · `tributo_id → tributos CASCADE` · `tasa` · `valor_fijo` · `escala_json` · `base_calculo` · `activo` · `vigencia_desde/hasta`

**`tributos_empleados`** — qué tributos aplican a qué empleado.
`id` · `tributo_id CASCADE` · `empleado_id CASCADE` · `aplica` · `tasa_personalizada` · `UNIQUE(tributo,empleado)`

**`periodos_fiscales`**
`id` · `tipo_periodo CHECK` · `anio` · `mes` · `trimestre` · `fecha_inicio/fin` · `fecha_limite_pago` · `cerrado` · `UNIQUE(tipo,anio,mes,trimestre)`

**`liquidaciones_tributos`** — impuestos calculados/pagados por período.
`id` · `tributo_id` · `periodo_fiscal_id` · `base_calculo` · `monto_calculado` · `monto_pagado` · `fecha_pago` · `comprobante_pago` · `estado CHECK('pendiente','pagado','parcial','exento')` · `observaciones`

**`configuracion_tributos_historial`** — auditoría de cambios de tasas.
`id` · `configuracion_tributo_id` · `tasa_anterior/nueva` · `fecha_cambio` · `motivo` · `usuario_id`

**`nominas`** — salarios mensuales por empleado (generadas al cerrar el mes).
`id` · `empleado_id → empleados` · `anio` · `mes` · `salario_bruto` · `estado CHECK('pendiente','pagada')` · `fecha_pago_salario` (sale del banco) · `usuario_id` · `UNIQUE(empleado_id, anio, mes)`

**`bonos`** — pagos semanales en efectivo por empleado. **No se declaran como salarios.**
`id` · `empleado_id → empleados` · `fecha` · `monto` (sale del efectivo) · `usuario_id` · `created_at`

## 3. Índices

Productos (codigo, categoria, tipo, activo), compras (proveedor, fecha, estado), movimientos (producto, tipo, fecha), usuarios (username, rol, empleado), y desde m017: `ventas.created_at`, `ventas.turno_id`, `venta_detalles.venta_id`, `venta_detalles.producto_id`.

## 4. Scripts de BD (`database/scripts/`)

**`init.js`** (`db:init`) — Interactivo. Si la BD existe ofrece: (1) backup `.backup_<ts>` y regenerar, (2) cancelar, (3) sobrescribir sin backup. Ejecuta todas las migraciones en orden + seeds de development + re-hashea contraseñas admin/vendedor. Si falla, borra la BD corrupta.

**`migrate.js`** (`db:migrate`) — Aplica solo las migraciones pendientes comparando contra `schema_migrations`.

**`seeds.js`** (`db:seed`) — Desactiva FKs, limpia tablas operativas (no ventas/turnos), ejecuta `development.sql`, re-hashea contraseñas.

> Regla: **nunca editar una migración ya aplicada**; un cambio de esquema sigue una migración nueva numerada (siguiente: 031).

## 5. Inconsistencias conocidas del esquema

1. Migración 007 inexistente (cosmético; no renombrar migraciones ya aplicadas); typo `015_gstion_impuestos.sql`.
2. `movimientos_stock` sin CHECK de tipo ni FK a usuarios; `referencia_id` sobrecargado.
3. `unidades.tipo` redefinida destructivamente entre schema.sql y m010 (histórico, ya estabilizado).