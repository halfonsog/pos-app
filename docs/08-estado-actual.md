# 08 — Estado Actual del Proyecto (para continuidad de sesiones)

> **Snapshot compacto para abrir una sesión nueva sin re-explicar el proyecto.**
> Leer esto + `AGENTS.md` basta para retomar el trabajo. Actualizar al cerrar cada jornada.
> **Última actualización: 2026-08-11**

## Qué es esto
POS offline monousuario de Heriberto Alfonso: Express + SQLite monolítico (`/api` + SPA en `src/frontend`, JS vanilla + jQuery + Bootstrap). BD real en uso: `database/database.db` (**nunca reiniciar sin backup**; backups en `backups/`). Docs completas en `docs/` (módulos en `docs/modulos/`).

## Estado verificado (2026-08-11)
- **160 tests verdes** (`npm test`, 12 suites) contra BD temporal desde migraciones.
- **36 tablas de negocio** (+ `schema_migrations`), **30 migraciones** (001–030, no existe 007), ~**130 endpoints** REST, **16 módulos frontend** + 5 componentes.
- Servidor en producción local en `PORT 3000` (`npm start` = `node server.js`).

## Hecho y en producción
- **Seguridad**: RBAC en backend (`requireRole`, matriz rol↔endpoint verificada por tests); auth en mantenimiento/reportes/dashboard; backup/restore endurecidos (VACUUM INTO + validación de cabecera SQLite e integrity_check).
- **Catálogo y operación minorista**: productos (simples reventa/granel, compuestos elaborado/conformado, recetas con anti-ciclos, ficha de costo con la **fórmula del propietario** multiplicativa en `utils/costos.js`), unidades con coeficientes, proveedores con contactos y contrato, compras con cuentas por pagar e inventariar, inventario con preparación/mermas/ajustes/intercambio reventa→granel/transferencias, ventas con turnos de caja única y arqueo por denominaciones, redondeo configurable.
- **Usuarios y empleados**: login JWT 24h, RBAC por roles, CRUD usuarios+empleados (empleado-céntrico, empleados 1—N usuarios), `tipo_venta` por usuario, «Mi perfil».
- **Mayoristas**: clientes (patrón Proveedores, sin modales), precios por tramos de volumen, pedidos con vencimiento y cuentas por cobrar, facturación (incl. parcial) a `ventas` (tipo mayorista), pagos mixtos (efectivo→arqueo, tarjeta/transfer→banco), inventario separado (`stock_mayorista`), límite de crédito y backorder, **unidad mayorista = unidad de compra** (conversión a unidad de venta al consolidar).
- **Encargos minoristas**: pedidos unificados (`tipo` mayorista/minorista), entregar-y-cobrar desde Ventas.
- **Préstamos e Inversiones**: seguimiento con vencimientos autogenerados (fórmulas del propietario verificadas), gasto financiero mensual = Σ aportes del próximo vencimiento pendiente de registros activos integrado en el %gastos del costeo; desglose por prioridades en cierres.
- **Contabilidad (ONAE)**: vector fiscal completo verificado contra el Excel del propietario (`tests/vector-fiscal.test.js`); liquidación mensual/trimestral/anual (DJ 0530222), **porciento a declarar** en todo lo fiscal, libro diario, balance y estado de resultados, cierre de mes con desglose por prioridades + %gastos proyectado vs real + pago a trabajadores, banco por cuenta/moneda (CUP/USD) con cambio de divisas, **nóminas** (pago por banco) y **bonos semanales en efectivo** (no se declaran), servicios, exportar CSV para software certificado (Versat Sarasola).
- **UI armonizada**: dashboards de todos los módulos con cards del estilo del principal y sin decimales; sidebar siempre "POS Manager"; módulo Clientes accesible a admin y vendedor.

## En curso / siguiente
- **Sprint 7**: Promociones y campañas (último módulo nuevo; menú oculto hasta que exista).
- **Registro real del propietario**: registrar su préstamo/inversión real en Configuración → Inversiones y eliminar el concepto "Inversiones" (90 000) de los gastos fijos si correspondiera.
- **Fase II**: multi-caja, vendedores multi-caja, rol contable, venta online (pedidos unificados). Decisión de motor MySQL/PostgreSQL.
- **Comercialización**: white-label / Configuración de despliegue (nombre negocio, logo, colores) + instaladores nativos Win/Linux/Android con Node embebido (D17).
- **Contabilidad — pendiente menor**: gestión de tasas de tributos desde Configuración, tabla de gastos deducibles DJ (la aportará el propietario), exportar PDF.
- Ver lista completa en `00-pendientes.md`.

## Convenciones clave (resumen rápido)
- Migraciones numeradas en `database/migrations/` (siguiente libre: **031**); **nunca editar una migración aplicada**; backup antes de tocar esquema.
- Backend: routers finos + controladores con SQL parametrizado (`?`); `requireRole('admin')` donde aplique; servicios compartidos en `src/backend/utils/` (costos.js, conversiones.js, logger.js).
- Frontend: módulos como objetos globales en `js/modules/`; vistas por ViewManager (`ViewManager.navegar`); **sin modales en módulos** (vistas completas); `Utils.confirm`, `Toast.*`, `Utils.fechaISOToLocal` antes de mostrar fechas (backend UTC, frontend local).
- Reglas de negocio y decisiones del propietario en `docs/modulos/*.md` y `docs/06-decisiones-y-roadmap.md`; temas abiertos en `00-pendientes.md`.
- Tests: `npm test` antes de reiniciar el servidor tras cambios.
- Al terminar cambios: reiniciar servidor (detener el proceso del puerto 3000 + `node server.js`) + actualizar docs afectadas.