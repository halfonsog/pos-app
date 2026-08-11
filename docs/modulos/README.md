# Módulos de la aplicación

Un documento por módulo funcional.

> **Propósito principal de estos documentos:** describir con claridad y exactitud todo lo necesario para la **comprensión y regeneración del código** en caso necesario. Cualquier otra información causa confusión.
>
> **Reglas de mantenimiento:**
> 1. Las "Decisiones aprobadas" no viven aquí: se incorporan a la sección que corresponda (reglas de negocio, propósito, tablas...). La trazabilidad vive solo en `../06-decisiones-y-roadmap.md`.
> 2. Los "Problemas conocidos" se **corrigen y eliminan** del documento (no se acumulan).
> 3. Las tablas de un módulo, una vez terminado, viven solas en **un archivo de migración por módulo**: `xxx_[modulo].sql` (las migraciones nuevas siguen esta convención).

## Plantilla

### Propósito
Qué hace el módulo para el negocio.

### Tablas
Tablas de datos relativas al módulo, con el archivo de migración que las contiene: `tabla` (`xxx_modulo.sql`).

### Endpoints
Resumen (referencia completa en `../03-api.md`).

### Frontend
Descripción de las vistas que lo implementan:

| Sección | Ruta SPA | Vista HTML | JS módulo |
|---------|----------|------------|-----------|
| Listado | `modulo` | string en JS | `js/modules/modulo.js` |

### Reglas de negocio
La lógica que hay que respetar/reproducir.

### Temas pendientes a resolver
(Sección temporal: desaparece cuando el módulo está terminado)
- Problemas conocidos — IDs del backlog (`../05-problemas-conocidos.md`).
- Decisiones por aprobar — IDs del roadmap (`../06-decisiones-y-roadmap.md`).

## Índice de módulos

| Módulo | Estado actual |
|---|---|
| [auth-usuarios.md](auth-usuarios.md) | Login OK · RBAC backend ✅ · CRUD usuarios+empleados ✅ (empleado-céntrico) |
| [dashboard.md](dashboard.md) | Funcional · endpoint protegido ✅ |
| [productos.md](productos.md) | Modelo nuevo ✅ (Sprint 2) · dashboard armonizado |
| [proveedores.md](proveedores.md) | Funcional · dashboard armonizado |
| [compras.md](compras.md) | Funcional · auditoría real ✅ · dashboard armonizado |
| [inventario.md](inventario.md) | Sprint 3 ✅ · transferencias mayorista · backorders |
| [ventas.md](ventas.md) | Funcional, en producción · encargos (Sprint 6) · desglose por prioridades en cierre |
| [mayoristas.md](mayoristas.md) | Sprint 5 + Fase 2 ✅ (clientes, tramos, pedidos, facturación parcial, inventario separado, USD) |
| [configuracion.md](configuracion.md) | Fórmula del propietario ✅ · unidades protegidas ✅ · usuarios empleado-céntrico ✅ |
| [contabilidad.md](contabilidad.md) | Vector fiscal verificado ✅ · banco (USD) ✅ · nóminas+bonos ✅ · libro diario ✅ · exportar CSV ✅ |
| [reportes.md](reportes.md) | Funcional · acceso protegido ✅ |
| [mantenimiento.md](mantenimiento.md) | Funcional · acceso protegido ✅ · backup/restore endurecido ✅ |
