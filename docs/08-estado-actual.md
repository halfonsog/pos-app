# 08 — Estado Actual del Proyecto (para continuidad de sesiones)

> **Snapshot compacto para abrir una sesión nueva sin re-explicar el proyecto.**
> Leer esto + `AGENTS.md` basta para retomar el trabajo. Actualizar al cerrar cada jornada.
> **Última actualización: 2026-08-07**

## Qué es esto
POS offline monousuario de Heriberto Alfonso: Express + SQLite monolítico (`/api` + SPA en `src/frontend`, JS vanilla + jQuery + Bootstrap). BD real en uso: `database/database.db` (**nunca reiniciar sin backup**; backups en `backups/`). Docs completas en `docs/` (módulos en `docs/modulos/`).

## Hecho y verificado (155 tests, `npm test`)
- **Sprint 0-1**: seguridad real (RBAC `requireRole`, matriz rol↔endpoint), CRUD usuarios+empleados (empleado-céntrico en Configuración), quick wins (límites, búsquedas insensibles, navegación).
- **Sprint 2**: modelo de productos — subtipos elaborado/conformado (m017), anti-ciclos en recetas (CTE), `costo_base`/`precio_recomendado` persistidos con recálculo en cascada (`utils/costos.js`, **fórmula del propietario multiplicativa**: %gastos = Σgastos ÷ ventas_proyectadas; precio_neto = costo×(1+%g)×(1+margen); recomendado = neto×(1+imp)), campos editables restringidos, ingredientes = granel+elaborados.
- **Sprint 3**: catálogo `tipos_movimiento` (m018), intercambio reventa→granel entre productos, subcategorías (anti-ciclos), ajustes completos.
- **Sprint 4**: vector fiscal ONAE completo y **verificado contra el Excel del propietario** (`tests/vector-fiscal.test.js`), liquidación anual (0530222), Banco (saldos), alertas fiscales en Dashboard, préstamos/inversiones con vencimientos autogenerados (m020, Excel validado: mes 1 sin tarifa en inversiones).
- **Sprint 5 (Mayoristas)**: clientes (módulo propio patrón Proveedores, admin+vendedor), precios por tramos por volumen, pedidos con vencimiento, facturación a `ventas` (tipo mayorista), pagos mixtos, cuentas por cobrar, **inventario separado** (`stock_mayorista`, transferencias, split en compras), **unidad mayorista = unidad de compra** (venta_detalles convierten a unidad de venta al facturar).
- **Sprint 6 (Encargos)**: pedidos unificados con `tipo` minorista/mayorista (m024), encargos en Ventas con entregar-y-cobrar (crea venta con turno si hay).
- **Fase 2 Mayoristas**: límite de crédito, backorder (stock negativo + alerta), facturación parcial por líneas (m028; tras parcial no se modifica, solo se completa o cancela).
- **USD (m025-m027)**: moneda+tasa por operación (sin tasa general — la tasa cambia a diario, propietario), saldos por moneda (efectivo/banco × CUP/USD) + equivalente total con última tasa usada, cambio de divisas, servicios (pagos/cobros estiba/transporte), `usuarios.tipo_venta` (minorista/mayorista/ambas), exportar liquidaciones CSV para software certificado (Versat Sarasola).
- **Contabilidad nueva (m030)**: **Porciento a declarar** escala ventas Y compras/gastos en todo lo fiscal (vector, libro diario, estados, cierre, DJ anual, CSV); **nóminas** (generadas al cerrar el mes, salario pagado por banco) y **bonos semanales en efectivo** (no se declaran como salarios; "Pagar Bonos" con ayuda de decisión por empleado y en pendientes del dashboard el día configurado `dia_pago_bonos`); **libro diario** (ventas/gastos por día reales y declarados); salarios editables en ficha de empleado; cierre de mes muestra pago a trabajadores.
- **UI harmonizada**: todas las cards de todos los dashboards con el estilo del dashboard principal y sin decimales (`formatMoney(x, 0)` — formatMoney acepta decimales como 2º parámetro). Sidebar siempre "POS Manager".

## En curso / siguiente
- **Sprint 7**: Promociones y campañas (último módulo nuevo).
- **Fase II**: multi-caja, vendedores multi-caja, rol contable, venta online (pedidos ya unificados).
- **Comercialización**: white-label (nombre/logo/colores), instaladores nativos Win/Linux/Android con Node embebido (D17).
- **Contabilidad — pendiente menor**: tabla de gastos deducibles para la DJ anual (el propietario la aportará) y gestión de tasas de tributos desde Configuración.

## Convenciones clave (resumen rápido)
- Migraciones numeradas en `database/migrations/` (siguiente libre: **030**), probadas primero en copia de la BD real; backup antes de tocar esquema.
- Backend: routers finos + controladores con SQL parametrizado; `requireRole('admin')` donde aplique; servicios compartidos en `src/backend/utils/`.
- Frontend: módulos como objetos globales en `js/modules/`; vistas por ViewManager (`ViewManager.navegar`); **sin modales en módulos** (vistas completas); `Utils.confirm`, `Toast.*`, `Utils.fechaISOToLocal` antes de mostrar fechas (backend UTC).
- Reglas de negocio y decisiones del propietario documentadas en `docs/modulos/*.md` y `docs/06-decisiones-y-roadmap.md`; el usuario comenta los docs con `>>` y yo proceso.
- Tests: jest + supertest con BD temporal desde migraciones (`tests/`); ejecutar `npm test` antes de reiniciar el servidor tras cambios.
- Al terminar cambios: reiniciar servidor (Stop-Process del puerto 3000 + `node server.js` oculto) + actualizar docs afectadas.
