# Módulo: Reportes

## Propósito
Análisis del negocio: ventas por producto, tendencias, rentabilidad por producto y reportes contables mensuales/anuales.

## Tablas
Lee de: `ventas`, `venta_detalles`, `productos`, `configuracion_contabilidad` (costos), `compras`, `proveedores`.

## Endpoints (ref: ../03-api.md) — `ventas-por-producto` [A] (lo usa el POS del vendedor), el resto [A+] admin
- `GET /ventas-por-producto` · `GET /tendencia?tipo=dia|semana|mes` · `GET /rentabilidad` · `GET /contables?anio&mes` · `GET /resumen-anual?anio`

## Frontend
- `js/modules/reportes.js` (~627 l.): vista única con 4 tabs (Ventas por producto, Tendencia, Rentabilidad, Contables) con charts Chart.js.
- ⚠ Charts creados con `<script>` inline + `setTimeout(100)` (frágil). Años hardcodeados (2025/2026).

## Reglas de negocio
- Tendencia agrupa vía `strftime` (día/semana/mes).
- Reporte contable mensual: ventas − compras − gastos − impuesto a la ganancia (PyG).
- ⚠ **B16**: la "ganancia" aquí = `total_vendido × margen% ÷ 100`, mientras el resumen de turno (Ventas) usa `ventaNeta − costoBase − gastosFijos`. **Unificar en una sola definición** al sanear.

## Problemas conocidos (../05-problemas-conocidos.md)
B16 (fórmulas de rentabilidad inconsistentes), B18 (TypeError sin `anio`; mezcla UTC/local), F7 (fila de totales de Rentabilidad siempre 0; `<td>` sin comilla).

