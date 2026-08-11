# Módulo: Ventas (POS, Turnos y Encargos)

## Propósito
El corazón del negocio: pantalla de venta (POS minorista), gestión del turno de caja con arqueo, historial, anulaciones y encargos.

## Tablas
`ventas` · `venta_detalles` (CASCADE) · `turnos` · `denominaciones` · `pedidos`/`pedido_detalles` (encargos, tipo='minorista') · escribe `productos.stock_actual`, `movimientos_stock`. Migraciones 008, 009, 011, 012, 023, 024.

## Endpoints (ref: ../03-api.md)
- Turnos: `GET /turno-actual` · `GET /mi-turno` · `POST /abrir-turno` · `POST /cerrar-turno` · `GET /resumen-turno/:id`
- Ventas: `GET /` (filtros) · `GET /:id` · `POST /` · `POST /:id/anular` **[A+]**
- Encargos: mismos `pedidos` con `tipo='minorista'` (entregar-y-cobrar).

## Frontend
- `js/modules/ventas.js` (~1730 l.): vistas `index`, `abrirTurno`, `cerrarTurno` (arqueo por denominaciones), **`pos`** (grid de productos, carrito, teclado numérico propio, cobro efectivo/tarjeta con redondeo), `listado` (filtros), `ficha`, `verTurno`, `encargos`.

## Reglas de negocio

### Impuesto incluido + redondeo (minorista)
```
total_venta     = Σ (cantidad × precio_venta)          — precio_venta ya incluye impuesto
total_cobrado   = CEIL(total_venta ÷ redondeo_venta) × redondeo_venta   — hacia arriba
ajuste_redondeo = total_cobrado − total_venta
impuesto        = total_cobrado × tasa ÷ (1 + tasa)
subtotal        = total_cobrado − impuesto
```
`redondeo_venta` es configurable (D16): hoy 5 (billete mínimo circulante).

### Descuento de stock al vender (transacción)
- simple → descuenta su stock · conformado → descuenta ingredientes según receta · elaborado → descuenta su stock preparado.
- Validación de stock antes de la transacción (⚠ TOCTOU — aceptable en monousuario).

### Turnos (caja única — Fase I)
- Solo un turno `abierto` en todo el sistema.
- Cierre: `esperado = apertura + Σ ventas efectivo + cobros mayoristas efectivo del turno`. El usuario cuenta por **denominaciones**; se guardan `monto_cierre_real` y `diferencia`. ⚠ El desglose (arqueo) se recibe pero **no se persiste** (B14).
- Resumen de turno = PyG: venta neta − impuesto − costos − gastos fijos por producto (multiplicativa: `cb × %gastos`) → margen y ganancia bruta. Incluye **`desglose_prioridades`** (impuestos → costos → gastos → préstamos → inversiones → ganancias máx → excedente) y la comparación **%gastos proyectado vs real**.

### Encargos minoristas
Cliente por nombre libre (sin registro), precio minorista, stock minorista. Flujo `pendiente → entregar y cobrar` (crea la venta minorista, con turno si hay abierto; efectivo→arqueo, tarjeta→banco). Sin depósitos en v1 (evita doble conteo de caja).

### Anulación
Transacción: `estado='anulada'` + reversión de stock con movimientos `devolucion`. **[A+]** (solo admin).

## Problemas conocidos (../05-problemas-conocidos.md)
B14 (arqueo no persistido), F9 (impuesto del carrito incoherente), doble submit posible al cobrar.