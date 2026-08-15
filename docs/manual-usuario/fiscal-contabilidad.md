# Fiscal y Contabilidad

## Objetivo
Llevar los impuestos, los cierres y la información financiera del negocio según la normativa cubana (ONAT), separando lo que se declara de lo que no.

## Cuándo se usa
- Al final de cada mes (impuestos y cierre de mes).
- Al liquidar la Declaración Jurada anual.
- Para ver el banco, las nóminas, los bonos y el libro diario.

## Cómo se hace (paso a paso)

### Entender los dos mundos (gravable / no gravable)
- **Mundo gravable**: lo que entra en la declaración (ventas y compras de productos gravables, con factura).
- **Mundo no gravable**: productos que se compran y venden **sin factura** (informales); **no aparecen** en los reportes fiscales (impuestos, DJ, libro diario).
- Los reportes fiscales se calculan **solo con lo gravable**; la caja, el banco y el inventario siempre incluyen **todo**.

### Calcular impuestos del mes
1. En **Contabilidad**, elige mes y año.
2. Pulsa **Calcular**. La app calcula los tributos sobre **las ventas gravables** del período y guarda las liquidaciones como pendientes.
3. Regístralas como pagadas cuando las pagues (los pagos de impuestos salen del banco).

### Cerrar el mes
1. En **Contabilidad → Cierre de Mes**, pulsa **Calcular** para ver el desglose por prioridades del mes.
2. Pulsa **Cerrar mes** para **persistir la ficha** del mes.
3. El **excedente** se aplica automáticamente a los vencimientos:
   - **1º inversiones** activas (la de más vencimientos pendientes primero) — se reduce el número de vencimientos.
   - **2º préstamos**, si no quedan inversiones — se adelanta capital pero **se preservan los intereses** pactados (el acreedor recibe lo mismo).
   - Lo que sobre queda como ganancia (no se aplica).
4. Un mes **solo se cierra una vez**; después solo puedes **ver la ficha**.

### Declaración Jurada anual (DJ)
1. En **Contabilidad**, elige el año y pulsa la opción de **Liquidación anual**.
2. La app calcula la ganancia neta del año sobre el **mundo gravable** y el monto a pagar (con 5% de descuento si pagas antes del 28/02).

### Nóminas y bonos
- **Nóminas**: se generan al cerrar el mes; el salario se paga **por el banco**.
- **Bonos semanales**: se pagan **en efectivo** y **no se declaran** como salarios.

## Reglas y restricciones
- **Reportes fiscales solo con lo gravable** (ventas y compras de productos gravables + servicios con factura).
- **El mes se cierra una sola vez** (ficha persistida; no se puede recalcular).
- El **excedente del cierre de mes** va a inversiones primero y préstamos después; los intereses de los préstamos se **preservan** aunque se adelante capital.
- **Regla del 80%** (informativa): en auditoría hay que poder justificar al menos el 80% de los gastos declarados. La app lo muestra como indicador, no bloquea.

## Flexibilidades
- Los tributos se pueden pagar **parcial o totalmente** y en cualquier orden.
- El **porciento de gastos** proyectado se ajusta en Configuración (ventas proyectadas).

## Errores comunes
- **"El mes X/Y ya está cerrado. Consulta su ficha."** → Intentaste cerrar un mes ya cerrado → Usa el botón **Calcular** para ver la ficha guardada.
- **"Error de base de datos"** (en reportes) → Suele indicar un nombre duplicado u otro dato inválido en formularios → Revisa los datos antes de guardar.

## Preguntas frecuentes
- **¿Por qué el impuesto no coincide con mis ventas totales?**
  - Porque se calcula solo sobre las **ventas gravables**; las ventas de productos no gravables quedan fuera de la declaración.
- **¿El cierre de mes toca el dinero real?**
  - No mueve caja ni banco; solo **aplica el excedente** a los vencimientos de préstamos/inversiones y guarda la ficha.
- **¿Se puede deshacer un cierre de mes?**
  - No está implementado; por eso pide confirmación antes de cerrar.
