# Temas Pendientes

- ~~revisar q no se pueda facturar (mayorista), ni cobrar ecargos si no hay turno abierto~~ **✅ Resuelto (2026-08-12)**: `facturarPedido` y `entregarPedido` (encargo) validan que haya un turno abierto (400 si no). Tests actualizados para abrir turno.

- ~~error al pinchar en "Nuevo Pedido" en lista de Pedidos~~ **✅ Resuelto (2026-08-12)**: `Mayoristas.nuevo` normalizaba `params` como undefined al navegar desde la lista; ahora `params = params || {}`.

- ~~no veo la posibilidad de pagar (compras) ni cobrar (encargos y pedidos) en dolares. propongo un selector q por defecto indique CUP~~ **Mayormente resuelto (2026-08-12)**: el selector **CUP/USD con tasa acordada** ya existe en **pagos de compras** (compras.js modal de pago) y en **cobros de pedidos mayoristas** (mayoristas.js). Pendiente opcional: cobro de **encargos minoristas en USD** (hoy solo efectivo/tarjeta en CUP).

