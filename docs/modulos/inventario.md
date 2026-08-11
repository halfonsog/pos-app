# Módulo: Inventario

## Propósito
Control de stock: consulta, movimientos, alertas, preparación de elaborados, ajustes manuales (mermas, donaciones, autoconsumo) e **intercambio reventa→granel** (D6).

## Tablas
`movimientos_stock` · `tipos_movimiento` (catálogo, D7) · `productos` · `recetas`

## Endpoints (ref: ../03-api.md)
- `GET /resumen` (alertas) · `GET /stock` · `GET /movimientos` (límite configurable, D13) · `GET /preparables`
- `GET /tipos-movimiento` — catálogo D7 para los filtros del frontend
- `POST /preparar/:id` · `POST /ajuste` (merma/donacion_entrada/donacion_salida/autoconsumo/ajuste ±)
- `POST /intercambio` — D6 (admin): mueve stock de un reventa a un granel con cantidades libres

## Frontend
- `js/modules/inventario.js`: vistas `index` (alertas + acciones rápidas), `stock`, `movimientos` (filtros generados desde el catálogo), `preparar`, `ajuste` (5 tipos con signo forzado), `intercambio` (con **aviso de responsabilidad del usuario**).

## Reglas de negocio
- **Todo cambio de stock es un movimiento** con tipo del catálogo (D7) y signo según tipo.
- **Preparación** (elaborados): transacción que consume ingredientes (`preparacion_salida`) e incrementa stock del preparado (`preparacion_entrada`). `cantidad_maxima = min(⌊stock_ingrediente ÷ cantidad_receta⌋)`.
- **Ajustes**: salidas (merma/donación entregada/autoconsumo) fuerzan signo − y validan stock; donación recibida fuerza +; ajuste libre ±. 'donacion' legacy se normaliza a `donacion_salida` (m018).
- **Intercambio (D6)**: origen = simple reventa, destino = simple granel (ambos existentes); el usuario elige las cantidades equivalentes y es **el único responsable** de su corrección (aviso explícito en UI). Movimientos enlazados por `referencia_id` (id del producto contraparte).
- ⚠ `referencia_id` sobrecargado; sin FK a usuarios (m013).

## Problemas conocidos (../05-problemas-conocidos.md)
Columna `data:13` fantasma (F11), mocks de fallback (D15).

## Decisiones aprobadas (../06-decisiones-y-roadmap.md)
**D6** ✅ intercambio reventa→granel · **D7** ✅ catálogo tipos_movimiento · **D8** ✅ subcategorías (gestión en Configuración) · **D13** ✅ límite configurable
