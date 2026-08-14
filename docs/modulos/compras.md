# Módulo: Compras

## Propósito
Registro de compras a proveedores con detalle por producto, control de pagos (cuentas por pagar) e incorporación del stock comprado al inventario (minorista y/o mayorista).

## Tablas
`compras` · `compra_detalles` (CASCADE) · escribe `productos.stock_actual`/`stock_mayorista`, `productos.costo_base`, `movimientos_stock`. Migraciones 004, 023.

## Endpoints (ref: ../03-api.md)
- CRUD `/api/compras` · `POST /:id/pagar` · `POST /:id/inventariar`

## Frontend
- `js/modules/compras.js` (~1680 l.): vistas `index` (stats), `listado`, `formulario` (detalle editable en línea, totales reactivos, "llevar a stock al guardar"), `pagar`, `ficha`.
- **Flujo multi-paso**: el formulario sobrevive navegaciones auxiliares (nuevo proveedor, selector de productos) guardando/restaurando estado en `sessionStorage` y fusionando detalles sin duplicar.

## Reglas de negocio
- **Ciclo de vida**: crear → (pagar, parcial o total, N veces) → inventariar (una sola vez).
- `total` y `estado_pago` (pendiente/parcial/pagado) se calculan server-side al crear. ⚠ No se recalculan al editar (B10).
- **Coherencia fiscal (D36)**: NO se puede mezclar productos gravables y no gravables en la misma compra; y una compra con factura no puede incluir productos no gravables (se compran sin factura, nota interna). Backend valida en crear y editar; el selector de productos **se filtra al estado fiscal del primer producto elegido** (previene el error en la UI).
- Edición y borrado **bloqueados** una vez inventariada.
- **Inventariar**: convierte cantidades de unidad de compra a unidad de stock por coeficientes, incrementa stock (y puede dividir entre inventarios minorista/mayorista), registra movimiento `compra` y actualiza `costo_base` con el último costo (dispara el recálculo en cascada de compuestos).
- **Pagar**: acumula en `compras.pagado`, valida monto>0 y ≤ pendiente; `metodo_pago='transferencia'` registra salida en el banco.
- No hay tabla de pagos: `pagar` solo acumula `compras.pagado`.

## Problemas conocidos (../05-problemas-conocidos.md)
N+1 en listado. `console.log(error)` en vez de `console.error`.