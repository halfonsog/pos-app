# Módulo: Ventas (POS y Turnos)

## Propósito
El corazón del negocio: pantalla de venta (POS), gestión del turno de caja con arqueo, historial y anulaciones.

## Tablas
`ventas` · `venta_detalles` (CASCADE) · `turnos` · `denominaciones` · escribe `productos.stock_actual`, `movimientos_stock`

## Endpoints (ref: ../03-api.md)
- Turnos: `GET /turno-actual` · `GET /mi-turno` · `POST /abrir-turno` · `POST /cerrar-turno` · `GET /resumen-turno/:id`
- Ventas: `GET /` (filtros) · `GET /:id` · `POST /` · `POST /:id/anular`

## Frontend
- `js/modules/ventas.js` (~1730 l.): vistas `index`, `abrirTurno`, `cerrarTurno` (arqueo por denominaciones), **`pos`** (grid de productos, carrito, teclado numérico propio, cobro efectivo/tarjeta con redondeo), `listado` (filtros), `ficha`, `verTurno`.

## Reglas de negocio

### Impuesto incluido + redondeo
```
total_venta     = Σ (cantidad × precio_venta)          — precio_venta ya incluye impuesto
total_cobrado   = CEIL(total_venta ÷ redondeo_venta) × redondeo_venta   — hacia arriba
ajuste_redondeo = total_cobrado − total_venta
impuesto        = total_cobrado × tasa ÷ (1 + tasa)
subtotal        = total_cobrado − impuesto
```
`redondeo_venta` es configurable (D16): hoy 5 (billete mínimo circulante); si desaparece, solo cambia el parámetro.

### Descuento de stock al vender (transacción)
- simple → descuenta su stock · conformado → descuenta ingredientes según receta · elaborado → descuenta su stock preparado.
- Validación de stock antes de la transacción (⚠ TOCTOU — a resolver con mejor-sqlite3 o transacción única).

### Turnos (caja única — Fase I)
- Solo un turno `abierto` en todo el sistema.
- Cierre: `esperado = apertura + Σ ventas efectivo`. El usuario cuenta por **denominaciones**; se guardan `monto_cierre_real` y `diferencia`. ⚠ El desglose del arqueo se envía pero **no se persiste** (B14).
- Resumen de turno = PyG: venta neta − impuesto − costos − gastos fijos por producto (multiplicativa: `cb × %gastos`) → margen y ganancia bruta. Incluye **`desglose_prioridades`** (impuestos → costos → gastos → préstamos → inversiones → ganancias máx → excedente a inversiones) y la comparación %gastos proyectado vs real (00-pendientes #3).

### Anulación
Transacción: `estado='anulada'` + reversión de stock con movimientos `devolucion`. ⚠ No exige admin (S3) — con D9 pasará a ser admin-only (o admin autoriza).

## Problemas conocidos (../05-problemas-conocidos.md)
B9 (vendedor ve todas las ventas), B14 (arqueo no persistido), B15 (abrir turno a nombre de otro), F8 (porcentajes con formatMoney), F9 (impuesto del carrito incoherente: `total×(1−pct)` vs `total÷(1+pct)`), doble submit posible en cobrar (mejora UX: D14).

## Decisiones aprobadas (../06-decisiones-y-roadmap.md)
D9 (vendedor solo sus ventas; anular con permiso), D16 (redondeo configurable), Fase II: multi-caja (`turnos.caja_id`) y vendedores multi-caja — diseñar sin hardcodear caja única en código nuevo.
