# Configuración

## Objetivo
Ajustar los parámetros del negocio: proyecciones, márgenes, impuestos, gastos fijos, unidades de medida, usuarios/empleados y el seguimiento de préstamos e inversiones.

## Cuándo se usa
- Al iniciar el negocio o cuando cambian las condiciones (alquiler, salarios, proyección de ventas).
- Para gestionar quién accede a la app y con qué permisos.
- Para registrar préstamos e inversiones (seguimiento con vencimientos).

## Cómo se hace (paso a paso)

### Parámetros contables
1. Ve a **Configuración → Parámetros Generales**.
2. Ajusta: **ventas proyectadas**, **margen recomendado**, **impuesto sobre ventas**, **redondeo de venta**, salario mínimo, base de contribución, día de pago de bonos.
3. Guarda. Los **precios recomendados** de todos los productos se recalculan automáticamente.

### Gastos fijos
1. **Configuración → Gastos Fijos**.
2. Añade o edita conceptos (alquiler, salarios, servicios) con su valor mensual.
   - Los gastos fijos alimentan el **% de gastos** que se revierte en los precios.

### Unidades de medida
1. **Configuración → Unidades**.
2. Crea unidades personalizadas (desde id 100) con su coeficiente respecto a la unidad base de su tipo.
   - Las unidades base (ud, litro, libra, metro) están protegidas.
   - La unidad de compra y de venta de un producto deben ser del **mismo tipo**.

### Préstamos e Inversiones
1. **Configuración → Préstamos e Inversiones**.
2. Registra un préstamo o inversión (capital, plazo, tasa, fecha de inicio).
3. El sistema genera la **tabla de vencimientos** automáticamente y alimenta el **gasto financiero del mes** para el costeo.
4. Registra los pagos; en inversiones, un pago distinto al programado **reajusta las cuotas restantes**.

## Reglas y restricciones
- El **porciento a declarar ya no existe** (fue eliminado): ahora la separación fiscal es por categoría de producto (gravable / no gravable).
- Las **unidades base** y la **categoría de sistema "No gravable"** están protegidas (no se modifican).
- Unidades en uso por productos no pueden cambiar de **tipo**.
- La **categoría de sistema** no se puede editar ni eliminar.

## Flexibilidades
- Préstamos e inversiones son **registro de seguimiento** (no pagan deudas reales fuera de la app).
- Puedes tener **varios empleados** y **varios usuarios por empleado** (uno puede tener acceso admin y vendedor).

## Errores comunes
- TODO: verificar mensajes en pantalla.

## Preguntas frecuentes
- **¿Qué pasa si cambio el margen recomendado?** Se recalculan los precios recomendados de todos los productos.
- **¿El salario de los empleados se paga desde aquí?** Los salarios se gestionan en Contabilidad (nóminas); aquí solo se editan los montos del empleado.
