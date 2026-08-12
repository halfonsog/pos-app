# Temas Pendientes

Fichero único de cuestiones abiertas (del propietario, técnicas y de producto). Actualizado a 2026-08-11: una vez resuelto, un tema se retira de aquí. Los bugs y deuda técnica de código viven en `05-problemas-conocidos.md`; las decisiones de diseño en `06-decisiones-y-roadmap.md`. Las respuestas del propietario a cada tema están en `com.md`.

## 1. Producto / propietario

- **Configuración de despliegue (white-label / D17)** — los puntos de marca (nombre del negocio en la barra superior, logo en el menú lateral, color de fondo del menú, color de alerts) se introducirán antes de empaquetar la app para la venta, vía variables de configuración (p. ej. `.env`). **Aplazado**: el propietario lo define cuando cerremos la revisión y hagamos el despliegue para Windows. (Respuesta en `com.md` #1.)
- **Renombrar `parametros_contables` → `configuracion_contabilidad`** — sugerido por el propietario para evitar confusiones con el resto de parámetros. Implica migración (nueva migración numerada) y actualizar el código y los docs que referencian la tabla. Pendiente de decidir cuándo hacerla. (Respuesta en `com.md` #2a.)
- **Gastos deducibles para la DJ anual** — el propietario tiene la tabla (en foto) pero debe consultar a un especialista para comprender su sentido; **en espera del propietario**. La aportará cuando tenga las respuestas. (Respuesta en `com.md` #2b.)
- **Fichero para software contable certificado (Versat)** — la contabilidad queda limitada a lo necesario para la gestión del negocio (cuentas por pagar/cobrar, salarios y bonos, impuestos: vector fiscal, DJ anual, libro de ingresos y gastos diario, cierres de turno y de mes). Se generarán ficheros importables por software certificado (Versat es el más usado en Cuba). El **CSV de liquidaciones ya existe** (`GET /api/contabilidad/exportar`); se ajustará el formato exacto cuando haya un fichero de ejemplo del certificado. (Respuesta en `com.md` #2c.)
- **Sprint 7 — Promociones y campañas** — módulo **por definir**; se integrará profundamente con otros módulos, por lo que se cerrará bien antes de implementar. Ideas del propietario: campañas de marketing con periodos de tiempo y seguimiento/análisis de efectividad por impacto en ventas; minoristas: "compra X y regala 1", descuentos por pérdida de calidad (frutas/vegetales) y por grupo de productos (p. ej. desayuno: sándwich de queso + jugo de mango); mayoristas: servicio de transporte a partir de un monto de venta específico. (Respuesta en `com.md` #3.)
- **Fase II** — multi-caja, vendedores multi-caja, rol contable, venta online (los pedidos ya están unificados para ello; los pedidos de minorista en `tipo='minorista'`). Sin objetivos claros aún; se discutirán primero. Motor MySQL/PostgreSQL se pospone. (Respuesta en `com.md` #4.)

## 2. Resueltos (referencia rápida de la última revisión del propietario)

> Estos puntos ya están implementados y verificados; se mantienen solo como registro de que la revisión del 00-pendientes original quedó cerrada:

- Clientes en el menú lateral (admin y vendedor), módulo al patrón Proveedores sin modales; sidebar siempre "POS Manager".
- Unidad de venta mayorista = unidad de compra; conversión a unidad de venta en datos consolidados (reportes, cierres).
- Dashboards de admin/proveedores/productos/compras/inventario/ventas/mayoristas/contabilidad armonizados (estilo del dashboard principal, sin decimales).
- Dashboard admin con cards: Ventas hoy, Pendiente Inventario, Encargos a entregar hoy, Impuestos; Pendientes de Atención y lista de pedidos/encargos activos.
- Precios por volumen: listado de simples/elaborados con precio minorista; ficha de costo completa; unidad de venta mostrada.
- Nuevo pedido: fecha del pedido y vencimiento (defecto hoy), observaciones a todo ancho, botón "Crear y Facturar".
- Cierre de mes: incluye montos de pago a trabajadores (nóminas).
- Formularios sin alerts/prompts nativos (se eliminaron; solo componentes personalizados tipo form-modal).
- Desglose por prioridades y %gastos proyectado vs real: hecho en cierre de turno, ficha de turno y cierre de mes.
- **Gestión de préstamos e inversiones**: vive en Configuración → Inversiones (registro con vencimientos autogenerados, fórmulas del propietario, pagos, gasto financiero del mes). Confirmado por el propietario (`com.md`, nota final): se retira la nota del registro real.