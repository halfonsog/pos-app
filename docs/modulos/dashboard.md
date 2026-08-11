# Módulo: Dashboard

## Propósito
Pantalla de inicio tras el login: resumen del día para admin (y versión reducida para vendedor en el módulo `vendedor`).

## Tablas
Lee de: `ventas`, `venta_detalles`, `productos`, `compras`, `recetas` (CTE de stock virtual), `pedidos` (encargos activos), `liquidaciones_tributos` (alertas fiscales).

## Endpoints
- `GET /api/dashboard?inicio&fin` — requiere autenticación (cualquier rol).
- Devuelve: ventas del rango, productos sin ficha de costo, stock bajo, compras pendientes de pago/stock, preparaciones pendientes, **alertas fiscales** (liquidaciones pendientes: monto y días para vencer), top productos, últimas actividades, ventas por hora, pedidos/encargos activos.
- Si no llegan `inicio`/`fin` devuelve ceros silenciosamente.

## Frontend
- `js/modules/dashboard.js` (241 l.) — 4 summary cards clicables: **Ventas hoy**, **Pendiente Inventario**, **Encargos hoy**, **Impuestos** (días para vencer con semáforo); Pendientes de Atención (compras sin stock, pagos/cobros pendientes, bajo stock, por preparar); lista de Pedidos y Encargos Activos; acciones rápidas; chart de barras de ventas por hora (8:00–20:00); más vendidos.
- Usa `Utils.rangoHoy()` para el rango por defecto.

## Reglas de negocio
- "Stock bajo" incluye compuestos conformados vía CTE de stock virtual (⚠ esa CTE está **duplicada** en productos e inventario — unificar en un futuro stockService).