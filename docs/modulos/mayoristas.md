# Módulo: Ventas Mayoristas

> ✅ **IMPLEMENTADO (2026-08-07, Sprint 5)** según este diseño aprobado por el propietario.
> **Principio rector: funcional, intuitivo y sencillo.**

## Propósito
Gestionar ventas a granel para clientes comerciales (distribuidores, revendedores, empresas) con precios diferenciados, plazos de pago y reservas de inventario, **sin afectar la operativa minorista** (el POS de siempre no cambia).

## Decisiones de diseño propuestas

### 1. Inventario separado (minorista / mayorista)
Tu idea: inventarios separados con movimientos entre ambos, y las compras deciden a cuál van.

**Propuesta sencilla:** cada producto tiene dos stocks: `stock_actual` (minorista, el de siempre) y `stock_mayorista` (nuevo, por defecto 0).
- **Transferencias** entre inventarios: un movimiento nuevo `transferencia` (sale del minorista, entra al mayorista, mismo producto — similar al intercambio reventa→granel ya existente).
- **Compras**: al inventariar, cada línea se puede dividir (ej: 200 cajas → 190 al mayorista, 10 al minorista).
- **Conformados NO entran en mayorista** (tu regla): su stock es virtual (sale de ingredientes), no se puede reservar. Solo simples (reventa/granel) y elaborados tienen stock mayorista.
- El POS minorista vende de `stock_actual`; el módulo mayorista vende de `stock_mayorista`. Los reportes suman ambos.

### 2. Gestión del dinero y seguimiento SIN turnos (aprobado por el propietario)
Las ventas mayoristas no usan turno. Seguimiento completo así:

**El dinero sigue dos rutas claras según el método de pago de cada cobro:**
- **Efectivo** → entra físicamente a la caja. Cuenta en el **arqueo del turno abierto**: esperado = apertura + ventas minoristas en efectivo + **cobros mayoristas en efectivo durante el turno**. Así el arqueo siempre cuadra sin importar el origen del cash.
- **Tarjeta / Transferencia** → van directos al **banco** (mismo modelo del m022: se suman al saldo bancario junto a las ventas por tarjeta minoristas).

**Seguimiento (lo importante):** cada cobro es un registro en `pagos_pedido` (monto, método, referencia, fecha, usuario) ligado a su pedido → trazabilidad total por pedido y por cliente. El módulo Mayoristas tiene su propio panel: ventas del mes, **cuentas por cobrar** (con días de atraso según la condición de pago del cliente), pedidos pendientes y vencidos.

**La factura reutiliza toda la maquinaria:** al facturar un pedido se crea el asiento en `ventas`/`venta_detalles` con `tipo_venta='mayorista'` (turno_id NULL, cliente_id) → el vector fiscal, reportes y dashboard lo incluyen automáticamente (mismo ~15% combinado, sin IVA soportado).

### 3. Precios mayoristas — SOLO tramos por volumen (aprobado)
Sin listas A/B/C. Tabla `venta_tramos` (producto_id, desde, hasta, precio):
- Ejemplo: Producto X: 1–50 u = $10 · 51–200 u = $9.50 · 200+ u = $9.00.
- Si la cantidad no cae en ningún tramo → precio de venta minorista (red de seguridad).
- Al definir/editar tramos de un producto **se muestra su ficha de costo** (costo_base, recomendado, margen resultante).
- El cliente puede tener además `descuento_global %` que se aplica sobre el total.

### 4. Pedidos mayoristas
`pedidos`: id · cliente_id · fecha · **fecha_vencimiento** · estado (pendiente → facturado → entregado → cancelado) · subtotal · impuesto · total · pagado · vendedor_id · observaciones.
`pedido_detalles`: producto_id · cantidad · precio_unitario (por tramo de volumen) · total.
`pagos_pedido`: pedido_id · fecha · monto · metodo_pago (efectivo/tarjeta/transferencia) · referencia · usuario_id.

- **Unidad mayorista = unidad de compra** (regla del propietario): los pedidos y el `stock_mayorista` se manejan en la unidad de compra del producto; al facturar, las `venta_detalles` se convierten a **unidad de venta** (para que reportes y cierres consoliden bien). Transferencias e inventariar de compras convierten entre ambas.
- **Factura**: se genera desde el pedido (botón "Facturar") → crea el asiento en `ventas` (tipo_venta='mayorista') y descuenta `stock_mayorista`. **Facturación parcial** (m028): se puede facturar solo parte de cada línea; el pedido queda en estado `parcial` hasta completarse. **Tras facturación parcial el pedido no se modifica; solo se completa lo restante o se cancela** (lo ya facturado/cobrado queda intacto) — regla del propietario.
- **Clientes**: módulo propio (`clientes.js`) al patrón Proveedores (index/listado/formulario/ficha, sin modales), accesible a admin y vendedor (lectura/creación; edición solo admin).
- **Tramos**: solo productos simples/elaborados con precio minorista establecido; el panel muestra la ficha de costo completa (precio base, gastos, margen, impuestos, recomendado, precio minorista) y las cantidades en unidad de compra.
- **Nuevo pedido**: fecha del pedido (defecto hoy) y vencimiento (defecto = fecha del pedido); observaciones a todo ancho bajo las líneas; botones Guardar y **Crear y Facturar** (venta directa).

### 5. Impuesto
Las ventas mayoristas alimentan el mismo vector fiscal (mismo ~15% combinado: 0114022 + 0510122, sin IVA soportado) porque la factura vive en `ventas`.

## Tablas nuevas (migración 023_mayoristas.sql)
`clientes` · `venta_tramos` · `pedidos` · `pedido_detalles` · `pagos_pedido`
+ `productos.stock_mayorista` · `movimientos_stock.inventario` · tipo `transferencia` en catálogo · `ventas.tipo_venta` ('minorista' por defecto) y `ventas.cliente_id`.

## Plan de implementación (decidido por el asistente, a petición del propietario)
1. Migración 023 + modelos.
2. Backend: clientes CRUD, tramos CRUD (con ficha de costo visible), pedidos (crear/facturar/entregar/cancelar/extender), pagos, cuentas por cobrar.
3. Inventario mayorista: stock separado, transferencias, split en compras al inventariar.
4. Frontend: menú "Mayoristas" (admin): panel, clientes, pedidos, nuevo pedido, ficha de pedido.
5. Integración: arqueo incluye cobros mayoristas en efectivo; banco incluye tarjeta/transferencia mayoristas; vector fiscal incluye facturas mayoristas.
6. Tests de todo lo anterior.

## Fase 2 (✅ 2026-08-07)
- ~~Tramos por volumen (`venta_tramos`)~~ — incluidos desde el MVP
- **Límite de crédito**: al crear un pedido, si `deuda_actual + nuevo_pedido > limite_credito` del cliente → se bloquea mostrando los números
- **Backorder**: facturar con stock mayorista insuficiente queda **en negativo** y devuelve `alerta_backorder` en la respuesta; Inventario muestra tarjeta de alerta (stock mayorista < 0)

## Encargos minoristas (m024, Sprint 6 ✅)
Mismo módulo `pedidos` con `tipo='minorista'`: cliente por nombre libre (sin registro), precio minorista, stock del inventario minorista. Flujo: `pendiente → entregar y cobrar` (crea la venta minorista, con turno si hay uno abierto; efectivo→arqueo, tarjeta→banco). Sin depósitos en v1 (evita doble conteo de caja). Acceso desde Ventas → Encargos.

## Fase II del proyecto (no ahora)
- Caja separada mayorista (multi-caja)
- Depósitos/anticipos en encargos minoristas
- Venta online (los pedidos ya están unificados para ello)
