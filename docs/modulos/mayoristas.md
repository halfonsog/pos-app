# Módulo: Ventas Mayoristas y Clientes

> **Principio rector: funcional, intuitivo y sencillo.**

## Propósito
Gestionar ventas a granel para clientes comerciales (distribuidores, revendedores, empresas) con precios diferenciados, plazos de pago y reservas de inventario, **sin afectar la operativa minorista** (el POS de siempre no cambia). Incluye el módulo de Clientes.

## Tablas
`clientes` · `venta_tramos` · `pedidos` · `pedido_detalles` · `pagos_pedido` · `ventas` (tipo_venta='mayorista') · `productos.stock_mayorista` · `movimientos_stock.inventario`. Migraciones 023, 024, 025, 028.

## Endpoints (ref: ../03-api.md)
- **Clientes** (`/api/clientes`): GET/POST [A] (vendedor incluido), PUT [A+].
- **Mayoristas** (`/api/mayoristas`) [A+]: `/resumen`, `/cuentas-por-cobrar`, `/tramos/:productoId`, `/pedidos` CRUD + `/facturar`, `/entregar`, `/cancelar`, `/extender`, `/pagos`.
- **Encargos minoristas** comparten `pedidos` con `tipo='minorista'` (ver `ventas.md`).

## Frontend
- `js/modules/mayoristas.js`: panel (`/mayoristas`), cuentas por cobrar, tramos de precios, listado y ficha de pedidos, nuevo pedido.
- `js/modules/clientes.js`: index (stats), listado, formulario, ficha — patrón Proveedores, sin modales.

## Reglas de negocio (decisiones vigentes, ver ../06-decisiones-y-roadmap.md §4)

1. **Inventario separado (minorista/mayorista)**: cada producto tiene `stock_actual` (minorista) y `stock_mayorista` (def 0). **Transferencias** entre inventarios (movimiento `transferencia`); **compras al inventariar pueden dividirse** por línea (minorista/mayorista). **Los conformados NO entran en mayorista** (stock virtual). Solo simples y elaborados.
2. **El dinero sin turnos**: efectivo → cuenta en el **arqueo del turno abierto** (esperado = apertura + ventas minoristas efectivo + cobros mayoristas efectivo del turno); tarjeta/transferencia → **banco**. Cada cobro es un registro en `pagos_pedido` (monto, método, referencia, fecha, usuario, moneda/tasa) → trazabilidad por pedido y cliente.
3. **Precios mayoristas SOLO por tramos de volumen** (`venta_tramos`): Ej: 1–50 u = $10 · 51–200 u = $9.50 · 200+ = $9.00. Si la cantidad no cae en ningún tramo → `precio_venta` minorista (red de seguridad). Al definir/editar tramos se muestra la **ficha de costo** del producto (costo_base, gastos, margen, impuestos, recomendado, minorista). El cliente puede tener además `descuento_global %`.
4. **Unidad mayorista = unidad de compra** (regla del propietario): pedidos y `stock_mayorista` se manejan en la unidad de compra del producto; al facturar, las `venta_detalles` se convierten a **unidad de venta** (para que reportes y cierres consoliden bien). Transferencias e inventariar de compras convierten entre ambas.
5. **Ciclo de vida del pedido**: `pendiente → parcial → facturado → entregado → cancelado`. **Facturación parcial** (m028): se puede facturar solo parte de cada línea; el pedido queda en `parcial` hasta completarse. **Tras facturación parcial el pedido no se modifica; solo se completa lo restante o se cancela** (lo ya facturado/cobrado queda intacto). Al facturar se descuenta `stock_mayorista` (valida stock). **Backorder**: facturar con stock insuficiente deja el stock **negativo** y devuelve `alerta_backorder` (Inventario muestra tarjeta).
6. **Límite de crédito**: al crear un pedido, si `deuda_actual + nuevo_pedido > limite_credito` del cliente → se bloquea mostrando los números.
7. **Nuevo pedido**: fecha del pedido (defecto hoy), vencimiento (defecto = fecha del pedido), observaciones a todo ancho bajo las líneas, botones **Guardar** y **Crear y Facturar** (venta directa sin pedido previo).
8. **Impuesto**: las ventas mayoristas alimentan el mismo vector fiscal (mismo impuesto combinado) porque la factura vive en `ventas` con `tipo_venta='mayorista'`. Precios siempre en CUP; cobros en USD llevan la **tasa acordada en ese momento** (sin tasa general).
9. **Clientes**: sin borrado físico (desactivar); GET/POST accesibles a vendedor (el propietario lo autoriza).

## Problemas conocidos (../05-problemas-conocidos.md)
B6/B7 del mantenimiento afectan a la limpieza de datos (sin transacción). Sin casos específicos del módulo en el backlog.