GeneralResultados de mi revision
1. General
- no veo el acceso al modulo de clientes en el menu lateral
- los vendedores podran acceder al modulo de clientes
- El modulo de Clientes debe ser parecido al de Proveedores. No quiero vistas en modals. Para eso construimos el viewManager
- El texto de la cabecera del menu lateral debe mostrar siempre "POS Manager"
- la unidad de venta mayorieta de los productos es su unidad de compra! A la hora de mostrar datos consolidados (reportes, cierres, etc.) de ventas por productos se usara su unidad de venta, por lo q habra q convertir las unidades de las ventas mayoristas
- muchas de las vistas hechas contigo no tienen el mismo look-and-feel q las anteriores. La UI debe ser uniforme consistentemente

2. Dashboard general del Administrador
- cards on top: Ventas hoy, Pendiente Inventario (suma de las cuestiones destacadas en las cards on top de inventario), Encargos a entregar hoy, vencimiento del pago de impuestos (cantidad sin decimales)
- lista de botones: eliminar
- Pendientes de atencion: si aplica, mostrar las siguientes acciones: Compras sin stock, Pagos pendientes, Cobros pendientes, Productos con bajo stock, productos a preparar (elaborables sin stock, con ingredientes para su elaboraciom)
- lista de pedidos y encargos activos, en vez de Ultimas actividades

3. Dashboard Proveedores
- eliminar los decimales al total de deuda pendiente
- aplicar a las cards el mismno estilo del Dashboar principal

4. Dashboard Productos
- cards on top: Activos, En venta, del tipo Reventa, del tipo preparables 
- aplicar a las cards el mismno estilo del Dashboar principal

5. Dashboard Compras
- cards on top: Compras del mes, Pendientes stock, Pendientes pago, saldo pendiente(sin decimales)
- aplicar a las cards el mismno estilo del Dashboar principal

6. Dashboard Inventario
- cards on top: bajo stock, compras pendientes de llevar a stock, productos con stock negativo, productos por preparar

7. Dashboard Ventas
- cards on top con el mismno estilo del Dashboar principal y sin decimales en sus numeros
- Si el turno esta abierto mostrar la lista de productos vendidos (como la del Cierre de turno).

8. Dashboard Mayoristas
- cards on top con el mismno estilo del Dashboar principal y sin decimales en sus numeros

9. Precios por volumen
- la lista debe mostrar los productos simples o elaborados q tienen precio minorista establecido
- el area de ficha de costo debe mostrar: precio base, gastos (fijos + finacieros), margen, impuestos, precio recomendado, precio de venta (minorista)
- al escribir las cantidades por tramos debe mostrarse la unidad de venta. OJO que la unidad de venta mayorista es la unidad de compra del producto!

10. Nuevo pedido
- debe tener fecha del pedido (por defecto: hoy) a mostrar seguido a Cliente
- fecha de vencimiento (por defecto: la fecha del pedido) a mostrar seguido de fecha del pedido
- observaciones: a mostrar debajo de la lista de los detalles, a todo ancho de la tabla de detalles
- anadir otro boton para facturar en caso de q el cliente haya venido a comprar sin pedido previo

11. Dashboard Contabilidad
- cards on top con el mismno estilo del Dashboar principal y sin decimales en sus numeros si son mayores q cero


cieere de mes: 
- montos de pago a trabajadores?

Nuevos
Configuracion de despliegue
La app debe poderse desplegar con cierto grado de personalizacion
- Buscar donde colocar algunos datos para q la app los pueda mostrar en el front-end:
 * imagen con el nombre del negocio (a mostrar a la izquierda en la barra superior de las vistas, donde va el usuario registrado)
 * logo (a mostrar en el menu lateral, justo debajo de Cerrar Sesion)
 * Color de background del menu
 * color de background de los alerts de confirmacion