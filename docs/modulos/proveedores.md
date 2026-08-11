# Módulo: Proveedores

## Propósito
Gestión de proveedores: datos fiscales, contactos múltiples, términos de pago y estado de cuenta (saldo pendiente).

## Tablas
`proveedores` (incluye `contrato` — nº de contrato firmado, m019) · `proveedor_contactos` (CASCADE) · `terminos_pago` · lee `compras` para saldos
>> hay q anadir el compo "contrato" (text) a la tabla proveedores para alojar el numero de contrato (si existe) firmado con este proveedor

## Endpoints (ref: ../03-api.md)
- CRUD `/api/proveedores` + CRUD anidado `/:id/contactos`
- `GET /` calcula saldo pendiente = `SUM(total − pagado)` de compras no pagadas y nº de compras.

## Frontend
- `js/modules/proveedores.js` (~1270 l.): vistas `index` (stats), `listado` (filtros), `formulario` (soporta `retorno` para volver a compras con el proveedor preseleccionado), `ficha` (estado de cuenta, contactos con modal, últimas compras), `contactos` (vista dedicada).

## Reglas de negocio
- Borrado bloqueado si tiene compras (se borran contactos antes).
- Un proveedor tiene N contactos (nombre, cargo, móvil, email).
- `contrato`: número de contrato firmado con el proveedor, si existe (texto libre).
- El formulario coopera con Compras vía `sessionStorage` (flujo "nuevo proveedor" sin perder la compra en curso).

## Problemas conocidos (../05-problemas-conocidos.md)
**F1 (bug activo):** URLs con espacios en `api.js` → **eliminar proveedor roto** (404). Contactos gestionados dos veces (modal en ficha + vista dedicada, código duplicado). Fallback a datos mock si falla la API (D15 los eliminará). Manejo de errores inconsistente (500 directos con `error.message`).

## Decisiones aprobadas
D15 (sin mocks), D14 (layout unificado). Sin cambios de modelo previstos.
