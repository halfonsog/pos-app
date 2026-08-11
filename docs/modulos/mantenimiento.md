# Módulo: Mantenimiento

## Propósito
Operaciones administrativas de alto riesgo: backups, restauración, reset, borrado de entidades y visor de logs.

## Tablas
Opera sobre **todas** (borrados físicos) y sobre el **fichero completo** de la BD en backup/restaurar.

## Endpoints (ref: ../03-api.md) — todos [A+] admin
- `POST /eliminar-inactivos` · `POST /eliminar-anio` · `POST /eliminar-entidad`
- `GET /backup` (descarga la BD) · `POST /restaurar` (sube .db) · `POST /reset` · `GET /logs`

## Frontend
`js/modules/mantenimiento.js` — doble confirmación en operaciones destructivas, instrucciones de reinicio tras restaurar, visor de logs. Selector de eliminar-entidad con las 10 entidades: producto, compra, proveedor, **cliente**, venta (minorista/mayorista), **pedido** (mayorista/encargo), **prestamo_inversion**, **servicio**, **nomina**, **bono**.

## Reglas de negocio
- **Backup** (endurecido 2026-08-08): `VACUUM INTO` (snapshot consistente de SQLite, seguro con escrituras en curso) + nombre temporal único por petición + se borra tras descargar. Trabaja con el **fichero completo** — incluye todas las tablas, sean cuales sean (regla del propietario).
- **Restaurar** (endurecido 2026-08-08): antes de tocar la BD viva, valida el fichero subido: **(1)** cabecera mágica `SQLite format 3`, **(2)** `PRAGMA integrity_check` = ok. Si falla → 400 sin tocar nada. Si pasa: guarda `.pre_restore_<ts>` de rescate y sobrescribe; exige reinicio manual del servidor.
- **Eliminar entidad**: borrado físico en cascada manual, hijos primero (pedidos de un cliente, vencimientos de un préstamo, etc.). Sin reversión de stock (los borrados son operaciones de limpieza, no anulaciones).
- **Reset**: limpia TODA la operativa (ventas, compras, stock, pedidos+pagos, clientes, tramos, turnos, banco, servicios, nóminas, bonos, préstamos+vencimientos, liquidaciones, períodos fiscales, gastos). **Conserva catálogos y configuración** (usuarios, unidades, categorías, tributos, parámetros).
- **Logs**: archivo mensual `logs/sistema_YYYY_MM.log`; el visor lee el mes en curso.

## Problemas conocidos (../05-problemas-conocidos.md)
~~S1~~ ✅ (Sprint 0) · ~~B17~~ ✅ (backup/restore endurecido). Quedan: B6 (`eliminar-anio` borra ese año **y todos los anteriores** — pendiente decidir si se restringe a un solo año), B7 (`eliminar-inactivos` sin transacción).
