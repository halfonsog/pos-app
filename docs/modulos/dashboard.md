# Módulo: Dashboard

## Propósito
Pantalla de inicio tras el login: resumen del día para admin (y versión reducida para vendedor en el módulo vendedor).

## Tablas
Lee de: `ventas`, `venta_detalles`, `productos`, `compras`, `recetas` (CTE de stock virtual).

## Endpoints
- `GET /api/dashboard?inicio&fin` — requiere autenticación (cualquier rol).
- Devuelve: ventas del rango, productos con stock bajo, sin ficha de costo, compras pendientes (pago/stock), **alertas fiscales** (liquidaciones pendientes: cantidad, monto, días para el vencimiento más próximo), top 5 productos, últimas actividades (UNION ventas/compras), ventas por hora.
- Si no llegan `inicio`/`fin` devuelve ceros silenciosamente.

## Frontend
- `js/modules/dashboard.js` (241 l.) — 4 summary cards clicables: Ventas hoy, Stock bajo, Pendientes, **Impuestos** (monto pendiente + días para vencer, semáforo; reemplazó a la de Promociones que era placeholder), acciones rápidas, chart de barras ventas por hora (8:00–20:00), más vendidos, pendientes de atención, últimas actividades.
- Usa `Utils.rangoHoy()` para el rango por defecto.

## Reglas de negocio
- "Stock bajo" incluye compuestos conformados vía CTE de stock virtual (⚠ esa CTE está **triplicada**: aquí, productos e inventario — unificar en el stockService del Sprint 2/3).

## Problemas conocidos
S2 (endpoint público), F2/F3 (navegación de cards: anchors sin handler y doble binding).
