# Módulo: Proveedores

## Propósito
Gestión de proveedores: datos fiscales, contactos múltiples, términos de pago y estado de cuenta (saldo pendiente).

## Tablas
`proveedores` (incluye `contrato` — nº de contrato firmado) · `proveedor_contactos` (CASCADE) · `terminos_pago` · lee `compras` para saldos. Migraciones 002, 019.

## Endpoints (ref: ../03-api.md)
- CRUD `/api/proveedores` + CRUD anidado `/:id/contactos`
- `GET /` calcula saldo pendiente = `SUM(total − pagado)` de compras no pagadas y nº de compras.

## Frontend
- `js/modules/proveedores.js` (~1270 l.): vistas `index` (stats), `listado` (filtros), `formulario` (soporta `retorno` para volver a compras con el proveedor preseleccionado), `ficha` (estado de cuenta, contactos, últimas compras), `contactos` (vista dedicada).
- El formulario coopera con Compras vía `sessionStorage` (flujo "nuevo proveedor" sin perder la compra en curso).

## Reglas de negocio
- Borrado bloqueado si tiene compras (se borran contactos antes).
- Un proveedor tiene N contactos (nombre, cargo, móvil, email).
- `contrato`: número de contrato firmado con el proveedor, si existe (texto libre).

## Problemas conocidos (../05-problemas-conocidos.md)
Contactos gestionados en dos sitios (modal en ficha + vista dedicada, código duplicado). Manejo de errores inconsistente (500 directos con `error.message`).