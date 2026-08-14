# Mayoristas y Encargos

## Objetivo
Vender a clientes mayoristas y gestionar encargos minoristas (pedidos de clientes) con su cobro.

## Cuándo se usa
- Cuando un cliente mayorista hace un pedido.
- Cuando un cliente minorista encarga productos y los retira después.

## Cómo se hace (paso a paso)

### Pedido mayorista
1. Ve a **Mayoristas → Nuevo pedido**.
2. Selecciona el **cliente** y añade los productos (con precio por tramos de volumen si aplica).
3. Confirma el pedido (queda `pendiente`).
4. Al **entregar y cobrar**: el efectivo va a la caja del turno abierto; tarjeta/transferencia van al banco.
5. Se puede **facturar por partes** (facturación parcial) si el cliente retira poco a poco.

### Encargo minorista
1. Desde **Ventas → Encargos**, crea el pedido con el **nombre del cliente** (sin registro).
2. Cuando el cliente lo retira, **entregar y cobrar** crea la venta minorista automáticamente.

## Reglas y restricciones
- Los pedidos mayoristas y encargos pueden **mezclar libremente** productos gravables y no gravables (cada línea se calcula por producto).
- Tras una **facturación parcial**, el pedido no se modifica; solo se completa lo restante o se cancela.
- El inventario mayorista es **separado** del minorista (`stock_mayorista`).

## Flexibilidades
- Pagos **mixtos** (parte efectivo, parte tarjeta/transferencia).
- Precios por **tramos de volumen**; si no aplica, se usa el precio minorista.
- Encargos **sin depósitos** (se cobra al entregar).

## Errores comunes
- TODO: verificar mensajes en pantalla.

## Preguntas frecuentes
- **¿Un encargo necesita cliente registrado?** No: se usa el nombre libre.
- **¿Dónde se ve lo que debe un mayorista?** En la ficha del pedido y del cliente (cuentas por cobrar).
