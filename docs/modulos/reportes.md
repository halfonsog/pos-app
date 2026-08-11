# Módulo: Reportes

## Propósito
Análisis del negocio: ventas por producto, tendencias, rentabilidad por producto y reportes contables mensuales/anuales.

## Tablas
Lee de: `ventas`, `venta_detalles`, `productos`, `producto_costos`, `compras`, `proveedores`.

## Endpoints (ref: ../03-api.md) — ✅ `ventas-por-producto` [A] (lo usa el POS del vendedor), el resto [A+] admin (Sprint 0)
- `GET /ventas-por-producto` · `GET /tendencia?tipo=dia|semana|mes` · `GET /rentabilidad` · `GET /contables?anio&mes` · `GET /resumen-anual?anio`

## Frontend
- `js/modules/reportes.js` (~627 l.): vista única con 4 tabs (Ventas por producto, Tendencia, Rentabilidad, Contables) con charts Chart.js.
- ⚠ Charts creados con `<script>` inline + `setTimeout(100)` (frágil). Años hardcodeados (2025/2026).

## Reglas de negocio
- Tendencia agrupa vía `strftime` (día/semana/mes).
- Reporte contable mensual: ventas − compras − gastos − impuesto a la ganancia (PyG).
- ⚠ **B16**: la "ganancia" aquí = `total_vendido × margen% ÷ 100`, mientras el resumen de turno (Ventas) usa `ventaNeta − costoBase − gastosFijos`. **Unificar en una sola definición** al sanear.

## Problemas conocidos (../05-problemas-conocidos.md)
S2 (sin auth), B16 (fórmulas inconsistentes), B18 (TypeError sin `anio`; mezcla UTC/local), F7 (fila de totales de Rentabilidad siempre 0; `<td>` sin comilla).

## Decisiones aprobadas (../06-decisiones-y-roadmap.md)
Sprint 0 cierra el acceso. La unificación de la fórmula de ganancia se decide en Sprint 4 (junto a Contabilidad).

