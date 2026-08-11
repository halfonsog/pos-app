# Módulo: Inventario

## Propósito
Control de stock: consulta, movimientos, alertas, preparación de elaborados, ajustes manuales (mermas, donaciones, autoconsumo), **intercambio reventa→granel** (D6) y **transferencias entre inventarios** (minorista/mayorista).

## Tablas
`movimientos_stock` · `tipos_movimiento` (catálogo) · `productos` · `recetas`. Migraciones 004, 013, 018, 023.

## Endpoints (ref: ../03-api.md)
- `GET /resumen` (alertas) · `GET /stock` · `GET /movimientos` (límite configurable) · `GET /preparables`
- `GET /tipos-movimiento` — catálogo para los filtros del frontend
- `POST /preparar/:id` · `POST /ajuste` (merma/donacion/autoconsumo/ajuste ±) · `POST /intercambio` (D6) · `POST /transferir` (entre inventarios)

## Frontend
- `js/modules/inventario.js` (~1165 l.): vistas `index` (alertas + acciones rápidas), `stock`, `movimientos` (filtros generados desde el catálogo), `preparar`, `ajuste` (tipos con signo forzado), `intercambio` (con **aviso de responsabilidad del usuario**).

## Reglas de negocio
- **Todo cambio de stock es un movimiento** con tipo del catálogo (D7) y signo según tipo.
- **Preparación** (elaborados): transacción que consume ingredientes (`preparacion_salida`) e incrementa stock del preparado (`preparacion_entrada`). `cantidad_maxima = min(⌊stock_ingrediente ÷ cantidad_receta⌋)`.
- **Ajustes**: salidas (merma/donación entregada/autoconsumo) fuerzan signo − y validan stock; donación recibida fuerza +; ajuste libre ±.
- **Intercambio (D6)**: origen = simple reventa, destino = simple granel (ambos existentes); el usuario elige las cantidades equivalentes y es **el único responsable** de su corrección (aviso explícito en UI). Movimientos enlazados por `referencia_id` (id del producto contraparte).
- **Transferencia**: mueve stock de un inventario a otro del mismo producto (minorista↔mayorista). Los conformados no tienen stock mayorista (regla del propietario).
- ⚠ `referencia_id` sobrecargado; sin FK a usuarios.

## Problemas conocidos (../05-problemas-conocidos.md)
F11 (columna `data:13` fantasma), D15 (fallbacks a datos mock si falla la API).