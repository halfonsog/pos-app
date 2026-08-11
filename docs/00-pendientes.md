# Temas Pendientes

Fichero único de cuestiones abiertas (del propietario, técnicas y de producto). Actualizado a 2026-08-11: una vez resuelto, un tema se retira de aquí. Los bugs y deuda técnica de código viven en `05-problemas-conocidos.md`; las decisiones de diseño en `06-decisiones-y-roadmap.md`.

## 1. Producto / propietario

- **Configuración de despliegue (personalización de marca)** — la app debe poderse desplegar con cierto grado de personalización. Datos que la app debe poder mostrar en el front-end:
  - Imagen con el nombre del negocio a mostrar a la izquierda en la barra superior de las vistas (donde va el usuario registrado).
  - Logo a mostrar en el menú lateral (debajo de "Cerrar Sesión").
  - Color de fondo del menú.
  - Color de fondo de los alerts de confirmación.
  - (Se enmarca en D17 / comercialización: centralizar puntos de marca para white-label.)
- **Contabilidad**:
  - Gestión de tributos/tasas desde Configuración (acordado con el propietario).
  - Tabla de gastos deducibles para la Declaración Jurada anual (el propietario la aportará).
  - Exportar PDF de liquidaciones.
- **Sprint 7**: Promociones y campañas (último módulo nuevo; la entrada del menú sigue oculta hasta que exista).
- **Fase II**: multi-caja, vendedores multi-caja, rol contable, venta online (los pedidos ya están unificados para ello). Decisión de motor MySQL/PostgreSQL se pospone a Fase II.

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