# Módulo: Compras

## Propósito
Registro de compras a proveedores con detalle por producto, control de pagos (cuentas por pagar) e incorporación del stock comprado al inventario.

## Tablas
`compras` · `compra_detalles` (CASCADE) · escribe `productos.stock_actual`, `producto_costos.costo_base`, `movimientos_stock`

## Endpoints (ref: ../03-api.md)
- CRUD `/api/compras` · `POST /:id/pagar` · `POST /:id/inventariar`

## Frontend
- `js/modules/compras.js` (~1680 l.): vistas `index` (stats), `listado`, `formulario` (detalle editable en línea, totales reactivos, "llevar a stock al guardar"), `pagar`, `ficha`.
- **Flujo multi-paso**: el formulario sobrevive navegaciones auxiliares (nuevo proveedor, selector de productos) guardando/restaurando estado en `sessionStorage` y fusionando detalles sin duplicar.

## Reglas de negocio
- **Ciclo de vida**: crear → (pagar, parcial o total, N veces) → inventariar (una sola vez).
- `total` y `estado_pago` (pendiente/parcial/pagado) se calculan server-side al crear. ⚠ No se recalculan al editar (B10).
- Edición y borrado **bloqueados** una vez inventariada.
- **Inventariar**: convierte cantidades de unidad de compra a unidad de stock por coeficientes, incrementa stock, registra movimiento `compra` y actualiza `producto_costos.costo_base` con el último costo (→ será el trigger principal de D3).
- No hay tabla de pagos: `pagar` solo acumula `compras.pagado`. ⚠ Acepta sobrepagos/negativos y descarta método/referencia (B13).

## Problemas conocidos (../05-problemas-conocidos.md)
**B5: `usuario_id` hardcodeado a 1** en crear e inventariar (auditoría corrupta). B10, B13. N+1 en listado. Anchors del dropdown sin handler (F2). ~150 líneas muertas del selector legacy. `console.log(error)` en vez de `console.error`.

## Decisiones aprobadas (../06-decisiones-y-roadmap.md)
D3 (al inventariar se dispara el recálculo en cascada de costos de compuestos), D4 (unidad_compra no editable tras compras).
