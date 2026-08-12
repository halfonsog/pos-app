# Módulo: Productos (y Categorías)

## Propósito
Catálogo de productos: altas/bajas/ediciones, fotos, recetas de compuestos, fichas de costo (costeo del propietario) y trazabilidad de stock. Las categorías se gestionan desde Configuración pero pertenecen a este dominio.

## Tablas
`productos` · `recetas` · `categorias` · `unidades` (migraciones 003, 010, 017, 018). `producto_costos` fue **eliminada** (m019): `costo_base` y `precio_recomendado` viven en `productos`; margen, gastos e impuesto se toman de `configuracion_contabilidad`.

## Endpoints (ref: ../03-api.md)
- `/api/productos/*`: CRUD + receta (GET/POST/DELETE componente) + `PUT /:id/costo` + `GET /:id/trazabilidad`
- `/api/configuracion/categorias`: listar/crear/actualizar (sin DELETE)

## Frontend
- `js/modules/productos.js` (~2100 l. — **el archivo más grande de la app** ⚠): vistas `index`, `listado`, `formulario` (tabs Datos/Receta/Costo, foto con preview, combos de unidades dinámicos, bloqueo por dependencias), `ficha`, `costo` (desglose en vivo), `receta`, `trazabilidad`.
- `js/modules/categorias.js` (217 l.): formulario con retorno al producto (sessionStorage) y listado para Configuración.
- `js/modules/selector-productos.js` (216 l.): componente-vista reutilizable para elegir productos (usado por compras y recetas).

## Reglas de negocio

### Tipos de producto (subtipos)
| tipo | sub_tipo | Stock |
|---|---|---|
| simple | reventa | Propio |
| simple | granel | Propio (compra y venta en unidades del mismo tipo) |
| compuesto | **elaborado** | Propio (se prepara antes de vender) |
| compuesto | **conformado** | Virtual: `MIN(⌊stock_ingrediente ÷ cantidad_receta⌋)` |

- **Stock virtual (conformados)**: CTE compartida con inventario y dashboard (⚠ triplicada; unificar en un futuro stockService).
- **Recetas**: ingredientes solo granel o elaborados (D5); **sin validación de suma** — las cantidades de la receta deben coincidir con la cantidad del producto a preparar (regla del propietario, 2026-08-11); `UNIQUE(padre,hijo)`; **anti-ciclos recursivo con CTE** (D2).
- **Conversiones**: `cantidad × coef_origen ÷ coef_destino`, solo entre unidades del mismo tipo. La unidad de compra y de venta deben ser del mismo tipo.
- **Costeo FÓRMULA DEL PROPIETARIO (multiplicativa, `utils/costos.js`)**:
  ```
  gastos fijos (mensual) = Σ configuracion_gastos activos + Σ salario_mensual de empleados activos
  %gastos (global) = (gastos fijos + financiero del próximo vencimiento pagadero) ÷ ventas_proyectadas
  precio_neto      = costo_base × (1 + %gastos) × (1 + margen_recomendado%)
  precio_recomendado = precio_neto × (1 + impuesto_ventas%)
  ```
- **costo_base y precio_recomendado persistidos en `productos`** (D3). Triggers de recálculo: compra inventariada (cascada a compuestos contenedores), ficha de costo (solo costo_base de simples + precio_venta), cambio de configuración general o de gastos fijos, agregar/quitar ingrediente. **margen/gastos/impuesto son globales** (de `configuracion_contabilidad`), no por producto.
- **Campos editables (D4)**: solo nombre, descripción, foto, categoría, stock_minimo, precio_venta, activo. El backend RECHAZA (400) tipo, sub_tipo, unidades, stock_actual, costo_base, precio_recomendado — cambian por conversiones (D6), movimientos o recálculo.
- **Fotos**: multer+sharp, 800×800 JPEG, `uploads/productos/`, máx 3 MB.

## Problemas conocidos (../05-problemas-conocidos.md)
F4 (eliminar desde listado sin handler), F11 (data:13 fantasma), N+1 en obtener, 30 console.log.

## Decisiones vigentes (../06-decisiones-y-roadmap.md)
D1 (subtipos elaborado/conformado) · D2 (anti-ciclos) · D3 (costos persistidos + cascada; último costo) · D4 (campos editables con rechazo 400) · D5 (ingredientes = granel + elaborados) · D8 (subcategorías).