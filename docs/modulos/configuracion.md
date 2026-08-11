# Módulo: Configuración

## Propósito
Tablas maestras y parámetros del sistema: parámetros contables, gastos fijos, categorías (con subcategorías), unidades de medida, denominaciones (arqueo), términos de pago, gestión de empleados/usuarios y **préstamos e inversiones**.

## Tablas (ref: ../02-base-de-datos.md)
`parametros_contables` (registro único id=1) · `configuracion_gastos` · `categorias` (con `padre_id`) · `unidades` · `denominaciones` · `terminos_pago` · `usuarios` · `empleados` · `prestamos_inversiones` + `vencimientos` (m020)

## Endpoints (ref: ../03-api.md)
`/api/configuracion/`: `general` (GET/PUT) · `gastos` CRUD · `denominaciones` (listar/todas/toggle) · `categorias` (listar/crear/actualizar, con padre_id y anti-ciclo) · `unidades` (listar/crear/actualizar) · `terminos-pago` CRUD · `/api/usuarios` CRUD · `/api/empleados` CRUD · `/api/config/prestamos-inversiones` (listar/crear/editar/cancelar/pagos).

## Frontend
Una vista SPA por sección, todas bajo el menú "Configuración" (`/configuracion`). La vista `/configuracion` actúa como panel con tarjetas/enlaces a cada sección.

| Sección | Ruta SPA | Vista HTML | JS módulo |
|---------|----------|------------|-----------|
| Panel Configuración | /configuracion | string en configuracion.js | `js/modules/configuracion.js` |
| Parámetros Contables | /configuracion/parametros-contables | string | `js/modules/configuracion.js` |
| Categorías | /configuracion/categorias | string | `js/modules/configuracion.js` |
| Términos de Pago | /configuracion/terminos-pago | string | `js/modules/configuracion.js` |
| Denominaciones | /configuracion/denominaciones | string | `js/modules/configuracion.js` |
| Unidades de Medida | /configuracion/unidades | string | `js/modules/configuracion.js` |
| Gastos Fijos | /configuracion/gastos-fijos | string | `js/modules/configuracion.js` |
| Usuarios y Empleados | /configuracion/usuarios | string | `js/modules/configuracion.js` |
| Inversiones y Préstamos | /configuracion/inversiones | string | `js/modules/configuracion.js` |

- **Usuarios y Empleados (empleado-céntrico)**: la vista principal es la **lista de empleados**; desde ahí se crean nuevos. Al pinchar en un empleado se abre **su ficha**: edición de datos del empleado + gestión de sus usuarios (añadir, activar/desactivar, restablecer contraseña, cambiar rol).
- **Mi perfil** (menú lateral): el usuario ve sus datos personales (NO editables) de la tabla de empleados y su rol actual; puede cambiar la contraseña.


## Reglas de negocio
- **Costo absorbente — FÓRMULA DEL PROPIETARIO (multiplicativa)**:
  ```
  %gastos            = Σ gastos activos ÷ ventas_proyectadas
  precio_neto        = costo_base × (1 + %gastos) × (1 + margen_recomendado)
  precio_recomendado = precio_neto × (1 + impuesto_ventas)
  ```
  `%gastos` y `total_gastos_fijos` se calculan al vuelo en `obtenerGeneral` (no son columnas). El servicio `utils/costos.js` aplica esta fórmula en el recálculo de precios.
- **Unidades** (confirmado por el propietario): cada unidad no-base tiene unidad base de referencia implícita por su `tipo` (ud/l/lb/m) y un `coeficiente` de conversión respecto a esa base → la conversión entre unidades del mismo tipo es directa. **La unidad de compra y de venta de un producto deben ser del mismo tipo (misma base)** — validado al crear producto. Base (id≤4) bloqueadas; usuario crea desde id≥100; coeficiente debe ser > 0; **no se puede cambiar el `tipo` de una unidad en uso** por productos (rompería conversiones).
- **Denominaciones**: toggle activo según billetes/monedas en circulación; alimentan el arqueo de caja (Ventas).
- **Préstamos e Inversiones** (m020): registro de seguimiento con tabla de vencimientos autogenerada (fórmulas del propietario, ver ../02-base-de-datos.md §2.5). El **gasto financiero del mes** (Σ aportes del **próximo vencimiento pendiente** de registros activos — si paga el 01/09, los precios del mes actual lo cubren) se suma a los gastos fijos en el %gastos del costeo. En inversiones, un pago de capital distinto al programado reajusta el número de cuotas restantes. Cancelar un registro deja sin efecto sus vencimientos.
- **Auto-siembra**: si falta el registro id=1 de parametros_contables se crea solo.


## Problemas conocidos (../05-problemas-conocidos.md)
`eliminarUnidad` existe sin ruta (código muerto), DELETE de categorías inexistente (a propósito), unidades/denominaciones sin layout unificado (D14).

## Decisiones vigentes (../06-decisiones-y-roadmap.md)
D3 (fórmula del propietario + recálculo de precios al cambiar config/gastos) · D8 (subcategorías) · D9 (gestión de usuarios empleado-céntrica) · D18 (empleados 1—N usuarios).
