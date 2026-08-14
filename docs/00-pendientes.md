# Temas Pendientes

- ~~revisar q no se pueda facturar (mayorista), ni cobrar ecargos si no hay turno abierto~~ **✅ Resuelto (2026-08-12)**: `facturarPedido` y `entregarPedido` (encargo) validan que haya un turno abierto (400 si no). Tests actualizados para abrir turno.

- ~~error al pinchar en "Nuevo Pedido" en lista de Pedidos~~ **✅ Resuelto (2026-08-12)**: `Mayoristas.nuevo` normalizaba `params` como undefined al navegar desde la lista; ahora `params = params || {}`.

- ~~no veo la posibilidad de pagar (compras) ni cobrar (encargos y pedidos) en dolares. propongo un selector q por defecto indique CUP~~ **Resuelto (2026-08-12)**: cobro y pago en **USD por efectivo y transferencia** en compras, encargos y ventas mayoristas (m035). La **tasa se registra por operacion**. El **cierre de turno y de mes** muestran **CUP y USD** (efectivo/banco); el desglose por prioridades se mantiene **en CUP total equivalente**.

