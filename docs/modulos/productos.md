# Módulo: Productos (y Categorías)

## Propósito
Catálogo de productos: altas/bajas/ediciones, fotos, recetas de compuestos, fichas de costo (costeo absorbente) y trazabilidad de stock. Las categorías se gestionan desde Configuración pero pertenecen a este dominio.

## Tablas
`productos` · `recetas` · `categorias` · `unidades` (detalle en ../02-base-de-datos.md)
~~`producto_costos`~~ — **eliminada en m019** (propietario): margen, gastos_fijos e impuesto se toman de `parametros_contables` cuando se necesitan; no hay overrides por producto.
>> la tabla producto_costos no le veo sentido, costo_base y precio_recomendado deben is a la tabla productos, mientras margen, gastos_fijos e impuesto son valores tomados de configuracion cuando se necesiten

## Endpoints (ref: ../03-api.md)
- `/api/productos/*`: CRUD + receta (GET/POST/DELETE componente) + `PUT /:id/costo` + `GET /:id/trazabilidad`
- `/api/configuracion/categorias`: listar/crear/actualizar (sin DELETE)

## Frontend
- `js/modules/productos.js` (~2110 l. — **el archivo más grande de la app** ⚠): vistas `index`, `listado`, `formulario` (tabs Datos/Receta/Costo, foto con preview, combos de unidades dinámicos, bloqueo por dependencias), `ficha`, `costo` (desglose en vivo), `receta`, `trazabilidad`.
- `js/modules/categorias.js` (217 l.): formulario con retorno al producto (sessionStorage) y listado para Configuración.
- `js/modules/selector-productos.js` (216 l.): componente-vista reutilizable para elegir productos (usado por compras y recetas).

## Reglas de negocio

### Tipos de producto (modelo D1, vigente desde m017)
| tipo | sub_tipo | Stock |
|---|---|---|
| simple | reventa | Propio |
| simple | granel | Propio (compra y venta en unidades del mismo tipo) |
| compuesto | **elaborado** | Propio (se prepara antes de vender) |
| compuesto | **conformado** | Virtual: `MIN(⌊stock_ingrediente ÷ cantidad_receta⌋)` |

- **Stock virtual (conformados)**: CTE compartida (productos/inventario/dashboard — unificar en un futuro stockService).
- **Recetas**: ingredientes solo granel o elaborados (D5); suma por tipo de unidad ≤ 1; `UNIQUE(padre,hijo)`; **anti-ciclos recursivo con CTE** (D2, Sprint 2 ✅).
- **Conversiones**: `cantidad × coef_origen ÷ coef_destino`, solo entre unidades del mismo tipo.
- **Costeo absorbente** (ficha de costo; servicio `utils/costos.js`) — FÓRMULA DEL PROPIETARIO (multiplicativa):
  ```
  Σ gastos activos: tendra en cuenta a todos gastos fijos y los gastos financionros
  %gastos (global) = Σ gastos activos ÷ ventas_proyectadas
  precio_neto      = costo_base × (1 + %gastos) × (1 + margen_recomendado%)
  precio_recomendado = precio_neto × (1 + impuesto_ventas%)
  ```
- **costo_base y precio_recomendado persistidos en `productos`** (D3, Sprint 2 ✅). Triggers de recálculo: compra inventariada (cascada a compuestos contenedores), ficha de costo (solo costo_base de simples + precio_venta), cambio de configuración general o de gastos fijos, agregar/quitar ingrediente. **margen/gastos/impuesto son globales** (de `parametros_contables`), no por producto (m019).
- **Campos editables (D4)**: solo nombre, descripción, foto, categoría, stock_minimo, precio_venta, activo. El backend RECHAZA (400) tipo, sub_tipo, unidades, stock_actual, costo_base, precio_recomendado — esos cambian por conversiones (D6), movimientos o recálculo.
- **Fotos**: multer+sharp, 800×800 JPEG, `uploads/productos/`, máx 3 MB.

## Problemas conocidos (../05-problemas-conocidos.md)
~~B4~~ ✅, ~~B12~~ ✅ (Sprint 2). F4 (eliminar desde listado sin handler), N+1 en obtener, columna `data:13` fantasma, 30 console.log.

## Decisiones aprobadas (../06-decisiones-y-roadmap.md)
**D1** ✅ (subtipos elaborado/conformado, m017) · **D2** ✅ (anti-ciclos CTE recursivo) · **D3** ✅ (costos persistidos + cascada; último costo) · **D4** ✅ (campos editables con rechazo 400) · **D5** ✅ (ingredientes = granel + elaborados, backend + selector) · **D8** subcategorías (Sprint 3).
