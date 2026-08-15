# Documentación Técnica — Sistema de Gestión para Puntos de Venta (POS)

**Proyecto:** pos3 / punto-de-venta
**Autor:** Heriberto Alfonso
**Versión:** 0.6
**Última actualización:** 2026-08-11
**Estado:** En producción local (monousuario), mantenimiento activo. **182 tests verdes** (`npm test`, 14 suites).

Esta documentación tiene dos objetivos:

1. Permitir que cualquier desarrollador (o agente de IA) entienda el sistema sin leer todo el código.
2. Servir como especificación para una eventual reescritura total o parcial.

Solo refleja el **estado actual** del sistema (sin historial). Los temas abiertos están consolidados en `00-pendientes.md`.

## Cómo está organizada

- **Documentos generales** (este nivel): visión transversal del sistema.
- **`modulos/`**: un documento por módulo funcional con su propósito, tablas, endpoints, frontend, reglas de negocio y pendientes. **Empieza por el módulo que vayas a tocar.**
- **`manual-usuario/`**: guías de uso por proceso (fuente de redacción). La entrega es la carpeta **HTML** `src/frontend/manual/` (servida en `/manual/`): `index.html` (índice por rol) + una página por proceso (`ventas-turnos.html`, `compras-inventario.html`, etc.) con sidebar compartido, búsqueda y filtro por rol (`manual.js` + `manual.css`).
- **Empaquetado Windows**: guía completa en **`../deploy/README.md`** — cómo generar el `Instalador PuntoX.exe` (Node portable embebido, BD limpia, branding, Inno Setup).

## Documentos generales

| Documento | Contenido |
|---|---|
| [00-pendientes.md](00-pendientes.md) | **Temas pendientes** (único fichero): propietario, técnicos y de producto. |
| [01-arquitectura.md](01-arquitectura.md) | Visión general, stack, estructura de directorios, cómo ejecutar. |
| [02-base-de-datos.md](02-base-de-datos.md) | Esquema completo (36 tablas de negocio), migraciones, scripts de BD. |
| [03-api.md](03-api.md) | Referencia completa de endpoints REST (~130). |
| [04-frontend-spa.md](04-frontend-spa.md) | Arquitectura de la SPA: ViewManager, State, API, componentes, PWA. |
| [05-problemas-conocidos.md](05-problemas-conocidos.md) | Bugs confirmados, deuda técnica y riesgos de seguridad pendientes (backlog con IDs S/B/F). |
| [06-decisiones-y-roadmap.md](06-decisiones-y-roadmap.md) | **Decisiones de diseño vigentes aprobadas por el propietario y plan futuro. Leer antes de cualquier cambio.** |
| [08-estado-actual.md](08-estado-actual.md) | **Snapshot de continuidad**: qué está hecho, qué sigue, convenciones clave. Leer al abrir cualquier sesión. |

## Módulos

[modulos/README.md](modulos/README.md) — índice y plantilla: auth-usuarios · dashboard · productos · proveedores · compras · inventario · ventas · mayoristas · configuracion · contabilidad · reportes · mantenimiento.

## Descripción en un párrafo

Aplicación **offline, monolítica y monousuario** para gestión integral de un punto de venta: catálogo de productos (simples, a granel y compuestos con receta), compras a proveedores con cuentas por pagar, inventario con conversiones de unidades y preparación de productos, ventas con turnos de caja y arqueo por denominaciones (minoristas y mayoristas/encargos), costeo absorbente para fijar precios, reportes de rentabilidad y un módulo de contabilidad adaptado a la normativa cubana (ONAT) con banco, nóminas y bonos. Backend en Node.js/Express con SQLite; frontend SPA en JavaScript vanilla + jQuery + Bootstrap, instalable como PWA.

## Reglas de mantenimiento de esta documentación

- Si un cambio altera estructura, flujos o reglas documentadas, **actualizar el doc correspondiente en el mismo cambio**.
- Los problemas se referencian por ID (S1, B3, F7...) definidos en `05-problemas-conocidos.md`; al resolver uno, retirarlo del listado (los docs no acumulan historial).
- Las decisiones nuevas se acuerdan con el propietario y se registran en `06-decisiones-y-roadmap.md`.
- Un tema abierto va a `00-pendientes.md`; al resolverse, retirarlo de ahí.