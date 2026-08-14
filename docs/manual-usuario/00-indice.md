# Manual de Usuario — POS

Guía de uso de la aplicación pensada para el usuario final (propietario y empleados). Aquí se explican los **procesos del día a día**, las **reglas y restricciones** que aplica el sistema y las **flexibilidades** de cada flujo.

> **Cómo usar este manual**: cada proceso vive en un archivo propio. Desde este índice puedes ir al que necesites. Las reglas de negocio técnicas de la app están en `docs/06-decisiones-y-roadmap.md` y `docs/modulos/`; este manual las traduce a lenguaje de uso.

## Índice de procesos

| Proceso | Archivo | Qué cubre |
|---|---|---|
| Ventas y turnos | `ventas-turnos.md` | Abrir turno, cobrar, arqueo, cerrar turno, desglose por prioridades |
| Compras e inventario | `compras-inventario.md` | Comprar, pagar, inventariar, ajustes de stock, mermas, transferencias |
| Productos y recetas | `productos-recetas.md` | Altas/edición de productos, categorías (incl. "No gravable"), recetas, costeo |
| Fiscal y contabilidad | `fiscal-contabilidad.md` | Mundo gravable/no gravable, impuestos, cierre de mes, DJ anual, nóminas |
| Mayoristas y encargos | `mayoristas-encargos.md` | Pedidos mayoristas, encargos minoristas, cobros, facturación parcial |
| Configuración | `configuracion.md` | Parámetros contables, gastos fijos, unidades, préstamos e inversiones |

## Plantilla

Para añadir un proceso nuevo, duplica `plantilla-proceso.md`, rellena cada sección y añade una fila a este índice.

## Notas para quien redacta

- Escribir en **segunda persona** ("usted" o "tú") y en lenguaje simple, sin tecnicismos.
- Cada paso debe ser verificable en la pantalla (numerar y, si se puede, incluir captura).
- En **Reglas y restricciones**: anotar solo lo que el sistema realmente obliga/bloquea (no suposiciones). Ver `docs/06-decisiones-y-roadmap.md` (D30–D38) como fuente de verdad.
- En **Flexibilidades**: indicar qué puede variar el usuario.
- En **Errores comunes**: copiar el mensaje exacto que muestra la app.
- Marcar con `TODO` los pasos que aún no se han redactado ni verificado en pantalla.
