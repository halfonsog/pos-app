# Módulos de la aplicación

Un documento por módulo funcional.

> **Propósito principal de estos documentos:** describir con claridad y exactitud todo lo necesario para la **comprensión y regeneración del código** en caso necesario. Cualquier otra información causa confusión.
>
> **Reglas de mantenimiento:**
> 1. El propósito, reglas de negocio y tablas del módulo viven aquí. La trazabilidad de decisiones vive solo en `../06-decisiones-y-roadmap.md`.
> 2. Los "Problemas conocidos" se **corrigen y eliminan** del documento (no se acumulan); los pendientes se referencian por ID en `../05-problemas-conocidos.md`.
> 3. Las tablas de un módulo viven en **un archivo de migración por módulo**: `xxx_[modulo].sql` (las migraciones nuevas siguen esta convención).

## Plantilla

### Propósito
Qué hace el módulo para el negocio.

### Tablas
Tablas de datos relativas al módulo, con el archivo de migración que las contiene.

### Endpoints
Resumen (referencia completa en `../03-api.md`).

### Frontend
Vistas que lo implementan:

| Sección | Ruta SPA | Vista HTML | JS módulo |
|---------|----------|------------|-----------|
| Listado | `modulo` | string en JS | `js/modules/modulo.js` |

### Reglas de negocio
La lógica que hay que respetar/reproducir.

### Temas pendientes
- IDs del backlog (`../05-problemas-conocidos.md`).
- Decisiones por aprobar (`../06-decisiones-y-roadmap.md`).
- Temas del propietario consolidados en `../00-pendientes.md`.

## Índice de módulos

| Módulo | Estado actual |
|---|---|
| [auth-usuarios.md](auth-usuarios.md) | Login + RBAC + CRUD usuarios/empleados (empleado-céntrico) ✅ |
| [dashboard.md](dashboard.md) | Funcional, armonizado ✅ |
| [productos.md](productos.md) | Modelo de subtipos + costeo del propietario ✅ |
| [proveedores.md](proveedores.md) | Funcional, armonizado ✅ |
| [compras.md](compras.md) | Funcional, armonizado ✅ |
| [inventario.md](inventario.md) | Preparación, ajustes, intercambio, transferencias ✅ |
| [ventas.md](ventas.md) | POS + turnos + encargos ✅ |
| [mayoristas.md](mayoristas.md) | Clientes, tramos, pedidos, facturación (incl. parcial), inventario separado, USD ✅ |
| [configuracion.md](configuracion.md) | Parámetros, catálogos, usuarios/empleados, inversiones ✅ |
| [contabilidad.md](contabilidad.md) | Vector fiscal ONAE + banco (USD) + nóminas/bonos + libro diario + CSV ✅ |
| [reportes.md](reportes.md) | Funcional, acceso protegido ✅ |
| [mantenimiento.md](mantenimiento.md) | Funcional, acceso protegido, backup/restore endurecido ✅ |