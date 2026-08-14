# Ventas y Turnos

## Objetivo
Atender a los clientes del negocio: cobrar sus compras (efectivo o tarjeta), llevar el control del turno de caja y cerrarlo de forma cuadrada.

## Cuándo se usa
- Todos los días al abrir el negocio (abrir turno).
- En cada venta minorista que se cobra en la caja.
- Al terminar la jornada (cerrar turno y contar la caja).

## Cómo se hace (paso a paso)

### Abrir el turno
1. Ve a **Ventas**.
2. Pulsa **Abrir turno**.
3. Indica el **monto de apertura** (el efectivo inicial que dejas en caja) y confirma.
   - Solo puede haber **un turno abierto** en todo el sistema. Si ya hay uno, primero ciérralo.

### Cobrar una venta
1. Con el turno abierto, busca el/los producto(s) y añádelos al carrito.
2. Pulsa **Cobrar con Efectivo** o **Cobrar con Tarjeta**.
3. Se muestra el total, incluido el **ajuste por redondeo** si aplica (el redondeo es configurable, ver Configuración).
4. Confirma la venta. El stock se descuenta automáticamente.
   - El efectivo suma a la caja del turno; la tarjeta suma al banco.
   - Las ventas minoristas, encargos y pedidos mayoristas pueden **mezclar libremente** productos gravables y no gravables (cada línea se calcula por producto).

### Ver el resumen del turno (opcional)
En **Ventas → Cerrar turno** puedes ver el card **Desglose por Prioridades**: cómo se reparte lo recaudado (impuestos → costos → gastos → préstamos → inversiones → margen → ganancias → excedente) y la comparación del **% de gastos** proyectado vs real.

### Cerrar el turno (arqueo)
1. En **Ventas → Cerrar turno** verás el **monto esperado** (apertura + ventas en efectivo + cobros mayoristas en efectivo del turno).
2. **Cuenta la caja** y registra el monto real (se apoya en el conteo por denominaciones).
3. Confirma el cierre. La app muestra la **diferencia** entre lo esperado y lo real; si no cuadra, revisa la caja antes de dar por cerrado.

> El desglose y el arqueo del turno son **informativos**: el sistema no obliga a que la diferencia sea cero, solo la informa.

## Reglas y restricciones
- **Un solo turno abierto** a la vez.
- **No se puede cobrar sin turno abierto**.
- El cierre del turno no bloquea nada por diferencias de caja (solo informa).
- La venta descuenta stock en el mismo momento de cobrar (no hay confirmación doble).

## Flexibilidades
- Método de pago: **efectivo** (caja del turno) o **tarjeta** (banco).
- El **redondeo de la venta** es configurable (0 = sin redondeo; 5 = múltiplos de 5, etc.).
- El turno lo abre el vendedor a su nombre; un administrador puede abrirlo en nombre de otro vendedor.

## Errores comunes
- **"No hay turno abierto. Abra un turno primero."** → Intentaste cobrar sin turno → Abre turno en Ventas.
- **"Ya hay un turno abierto. Ciérrelo primero."** → Solo se permite un turno → Ciérralo o contínuаlo.

## Preguntas frecuentes
- **¿Qué pasa con las ventas por tarjeta?**
  - Van al **banco** y aparecen en Contabilidad → Banco.
- **¿El cierre de turno está ligado al cierre de mes?**
  - No directamente. El turno es diario y operativo; el **cierre de mes** es aparte (ver Fiscal y Contabilidad).
- **¿Se puede anular una venta?**
  - Sí, un administrador puede **anular** la venta desde Ventas (revierte stock y la excluye de los totales).
