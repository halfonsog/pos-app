# 06 — Decisiones de Diseño y Roadmap

Registro de decisiones acordadas con el propietario (Heriberto Alfonso) y plan de trabajo por sprints.
**Fecha de las decisiones:** 2026-08-05 · **Estado:** aprobadas, en ejecución.

> Las decisiones aquí registradas **prevalecen** sobre lo que diga el código actual. Cuando se implementen, actualizar también los docs 02/03/04 y el módulo correspondiente.

---

## 1. Decisiones de producto (módulo Productos)

### D1. Subtipos de compuestos: Elaborado / Conformado
El booleano `requiere_preparacion` desaparece y pasa a ser subtipo. Modelo final:

| tipo | sub_tipo | Stock |
|---|---|---|
| simple | reventa | Propio |
| simple | granel | Propio |
| compuesto | **elaborado** | Propio (se prepara antes de vender) |
| compuesto | **conformado** | Virtual: min(stock ingrediente ÷ cantidad receta) |

Migración: `sub_tipo = 'elaborado'` si `requiere_preparacion=1`, `'conformado'` si `=0` (donde `tipo='compuesto'`).

### D2. Integridad de recetas (anti-ciclos)
Ningún producto puede tener como ingrediente:
- a sí mismo, ni
- otro producto que lo contenga como ingrediente (**recursivo**, recetas anidadas).

Validación obligatoria al agregar componentes a una receta (backend). Es prerequisito de D3.

### D3. `costo_base` y `precio_recomendado` persistidos en `productos`
- Se guardan como columnas de la tabla `productos` (caché calculada, no dato manual).
- **costo_base = último costo de compra** (NO promedio ponderado).
- **FÓRMULA DEL PROPIETARIO (multiplicativa, aclarada 2026-08-05)**:
  ```
  %gastos            = Σ gastos activos ÷ ventas_proyectadas
  precio_neto        = costo_base × (1 + %gastos) × (1 + margen_recomendado)
  precio_recomendado = precio_neto × (1 + impuesto_ventas)
  ```
  (Sustituye a la fórmula divisiva `costo ÷ (1−%)` que se implementó por error al inicio; los valores de producción ya fueron recalculados con la fórmula correcta.)
- Triggers de recálculo: compra inventariada (cascada recursiva a compuestos contenedores), ficha de costo (simples), cambio de `configuracion_general` o de gastos fijos, agregar/quitar ingrediente.

### D4. Campos editables (matriz aprobada)
| Siempre editables | NO editables directamente |
|---|---|
| nombre, descripción, foto, categoría, stock_minimo, precio_venta, activo | tipo, sub_tipo, unidad_compra, unidad_venta, stock_actual, costo_base |

Los no editables solo cambian por vías controladas: conversiones (D6), movimientos de stock, compras/recálculo. Es la opción simple y segura elegida por el propietario.

### D5. Regla de ingredientes
Solo pueden ser ingredientes de un compuesto: **simples a granel** y **compuestos elaborados**. (Ni reventa ni conformados.)

### D6. Conversión reventa → granel (intercambio)
- Se implementa como **movimiento entre dos productos distintos** (Opción B):
  - `intercambio_salida` del producto reventa origen.
  - `intercambio_entrada` al producto granel destino.
- El producto destino **debe existir** previamente (el usuario lo crea como granel).
- El usuario elige libremente las cantidades equivalentes (unidades de reventa ↔ unidad de venta del granel). **No hay validación automática posible.**
- La UI debe mostrar un **aviso explícito**: el usuario es el único responsable de la corrección de las cantidades en la actualización del inventario de ambos productos.

### D7. Catálogo de tipos de movimiento
Nueva tabla `tipos_movimiento` (id, nombre, signo +/−, descripción, activo) en lugar de CHECK constraint.
Tipos: compra(+), venta(−), devolucion(+), preparacion_entrada(+), preparacion_salida(−), donacion_entrada(+), donacion_salida(−), merma(−), autoconsumo(−), intercambio_entrada(+), intercambio_salida(−), ajuste(±).
Los listados y filtros del frontend se alimentan de esta tabla.

### D8. Subcategorías
`categorias.padre_id → categorias.id`. Al filtrar productos por una categoría padre, se incluyen los productos de sus hijas. Revisar la gestión de categorías en Configuración (selector de padre, vista en árbol).

---

## 2. Decisiones de seguridad y usuarios (Fase I)

### D9. RBAC real en backend
- Middleware `requireRole` alineado con el menú lateral por rol.
- Cerrar endpoints públicos sensibles: mantenimiento, reportes, dashboard → requieren auth (y admin los dos primeros).
- Fase I: varios vendedores + 1 admin + **caja única**. CRUD de usuarios para admin.
- Fase II (futuro): varias cajas, vendedores en cualquier caja, admin + contable. Diseñar sin hardcodear caja única en código nuevo.

**Estado D9 (parcial):** ✅ Sprint 0 implementó `requireRole` y la matriz rol↔endpoint (verificada con `tests/seguridad.test.js`). Pendiente para Sprint 1: CRUD de usuarios y que el vendedor solo vea SUS ventas (B9).

### D10. Motor de BD
Se mantiene **SQLite en Fase I**. La decisión MySQL/PostgreSQL se pospone a Fase II (multi-caja simultánea). Evaluar `better-sqlite3` (transacciones síncronas seguras) como paso intermedio.

### D11. Tests
Crear harness de tests (Jest + supertest + BD de prueba) **antes** de los cambios de modelo. Prioridad: matriz rol↔endpoint, invariantes de dinero y stock (venta descuenta stock exacto, anulación revierte todo, recálculo de costos en cascada).

**Estado D11 (parcial):** ✅ Harness creado en Sprint 0 (`tests/helpers/testDb.js` construye BD temporal desde las migraciones; `npm test`). Cubierto: matriz de acceso. Pendiente: invariantes de dinero/stock.

---

## 3. Decisiones de UX/UI

### D12. Búsquedas
Habilitar búsqueda case-insensitive (idealmente accent-insensitive) en **todos** los DataTables, de forma global vía wrapper unificado (resucitar `datatable-wrapper.js`).

### D13. Límites de registros (dolor en producción)
La app está en uso real y los `LIMIT 100` fijos ocultan registros. Eliminarlos o sustituirlos por paginación real / límite configurable. **Prioridad alta** (quick win de producción).

### D14. Layout unificado
Header de página con título + breadcrumbs funcionales + acciones, igual en todos los módulos. Eliminar las 8 copias del navbar. El menú lateral no muestra entradas sin módulo (Promociones oculta hasta que exista).

### D15. Sin mocks en producción
Eliminar los fallbacks con datos ficticios de proveedores/compras/inventario; reemplazar por estados de error con reintento.

### D16. Redondeo de ventas
Mantener `redondeo_venta` configurable (hoy 5 pesos = billete mínimo circulante; puede cambiar). El sistema ya lo soporta; solo documentarlo.

### D17. Distribución como app nativa
La app está pensada para correr como **aplicación nativa**: el paquete de instalación debe incluir **todas las dependencias** (Node.js embebido) y ser nativo para cada plataforma/SO (Windows, Linux, tablets Android). El navegador/PWA actual es solo el vehículo temporal para terminar el desarrollo y ponerla a punto.

### D18. Empleados y usuarios (aclaración del propietario)
La empresa tiene trabajadores registrados en `empleados` (fundamental para Contabilidad). Relación **empleados 1 ── N usuarios**:
- Puede haber **empleados sin credenciales** de acceso a la app.
- **No puede haber usuarios sin empleado** asociado (obligatorio).
- Un empleado puede tener **varios usuarios** (ej: en puntos pequeños, una misma persona tiene usuario admin y usuario vendedor).

Cambio de esquema (migración 016): `usuarios.empleado_id NOT NULL → empleados(id)`; se elimina `empleados.usuario_id` (dirección incorrecta). Backfill: un empleado por cada usuario existente. Los campos laborales de `empleados` (salarios, aportes...) se afinarán en el Sprint 4 (Contabilidad); en Sprint 1 solo lo mínimo para el CRUD de usuarios.

### D20. Convención de fechas y horas (UTC ↔ local)
- **Backend/BD trabaja en tiempo estándar (UTC)**: SQLite `CURRENT_TIMESTAMP` guarda `'YYYY-MM-DD HH:MM:SS'` en UTC; la API acepta/devuelve fechas-hora en ISO 8601 UTC.
- **Frontend presenta siempre en hora local** del usuario.
- **Conversiones centralizadas en `Utils`** (no inventar otras): `fechaISOToLocal(iso)` (string UTC → Date local), `formatearFecha(date, formato)` (⚠ recibe **Date**, nunca un string de BD), `fechaLocalToISO` / `fechaInputToUTC` (local → UTC al enviar al servidor), y los rangos (`rangoHoy`, `rangoMes`, `rangoAnio`...).
- Regla práctica: **al leer de la BD → convertir a local antes de mostrar; al enviar al servidor → convertir a UTC antes de mandar**. (Bug corregido en Sprint 1 por violar esto: `formatearFecha` recibió `last_login` como string.)
- Deuda conocida relacionada: B18 (reportes mezcla UTC/local → Sprint 4).

### D19. Limpieza de archivos muertos (hecha 2026-08-05)
Aprobado por el propietario: movidos a `deleted/` los esquemas obsoletos (`schema.sql`, `database.schema.sql`), `fix-migration.js`, `dashboard.html`, `vendor.html`, `views/`, `confirm-modal.js` y el script `download-libs`. Eliminado `pos.db` (0 bytes). `datatable-wrapper.js` se conserva para resucitarlo (D12). El factor de conversión vive en `unidades.coeficiente`: la columna huérfana `productos.factor_conversion` se eliminará en la migración 016 (Sprint 2).

---

## 4. Roadmap por sprints

| Sprint | Contenido | Depende de | Estado |
|---|---|---|---|
| **0** | Seguridad: auth en mantenimiento/reportes/dashboard, `requireRole`, secrets consistentes. Harness de tests + BD de prueba. | — | ✅ **HECHO (2026-08-05)**: matriz rol↔endpoint aplicada y verificada con 59 tests. También: db:seed/db:reset arreglados, db.js respeta DB_PATH, .env corregido, .gitignore cubre backups/ y *.token |
| **1** | CRUD usuarios (con empleado obligatorio, D18; migración 016), vendedor solo ve sus ventas (B9, B15), usuario real en compras (B5). **Quick wins producción**: D13 (límites), D12 (búsquedas), arreglos menores (docs/05: F1, F2, F3, F5). | 0 | ✅ **HECHO (2026-08-05)**: migración 016 aplicada; CRUD usuarios+empleados en Configuración; límites configurables (def 1000); búsqueda insensible a acentos global; 73 tests verdes |
| **2** | Modelo de productos: D1 (subtipos), D2 (anti-ciclos), D3 (costos persistidos + recálculo), D4 (campos editables), D5 (ingredientes). Migración 017 (incluye: drop `factor_conversion`, drop `tipos_gasto`, índices de ventas). | 0, 1 | ✅ **HECHO (2026-08-05)**: migración 017 aplicada; servicio `utils/costos.js` (recálculo en cascada + por config); anti-ciclos recursivo (CTE); 90 tests verdes |
| **3** | Inventario: D7 (tipos_movimiento), D6 (intercambio), D8 (subcategorías), ajuste manual ±. | 2 | ✅ **HECHO (2026-08-05)**: migración 018; intercambio con aviso de responsabilidad; filtros de movimientos desde catálogo; 102 tests verdes |
| **4** | Contabilidad: arreglar bugs (docs/05: B1-B3), gestión de empleados y tributos, balance/estado de resultados funcionales. | 1 | ✅ **HECHO (2026-08-06)**: vector fiscal ONAE completo verificado contra el Excel del propietario (`tests/vector-fiscal.test.js`); m021 configura los 4 tributos que faltaban; parámetros tributarios editables; liquidación anual; banco (m022) con depósitos/retiros; alertas fiscales en Dashboard. Pendiente: tributos desde UI, PDF |
| **4b** | **Préstamos e Inversiones** (00-pendientes #3): tabla `prestamos_inversiones` + vencimientos autogenerados + gasto financiero mensual integrado en costeo + desglose por prioridades en cierres. Especificación completa ya redactada por el propietario en docs/00-pendientes.md. | 3, 4 | ✅ **HECHO (2026-08-06)**: migración 020; API completa con fórmulas verificadas por tests (111 verdes); UI en Configuración; gasto financiero en %gastos; desglose por prioridades en resumen-turno y `/contabilidad/cierre-mes`. ⚠ Pendiente por el propietario: registrar su préstamo/inversión real y eliminar el concepto "Inversiones" (90 000) de gastos fijos |
| **5** | **Ventas mayoristas** (primero de los módulos nuevos). Diseño conjunto pendiente (definir entidad Cliente, listas de precios por volumen). | 2, 3 | ✅ **HECHO (2026-08-07)**: m023; clientes + tramos por volumen + pedidos con vencimiento + facturación a `ventas` (tipo mayorista) + pagos mixtos (efectivo→arqueo, tarjeta/transfer→banco) + cuentas por cobrar + inventario separado con transferencias y split en compras. Tipo de venta visible en listados. 135 tests verdes |
| **6** | **Pedidos**: aplicable a mayorista y minorista; preparado para integrarse con venta online (Fase II). Diseño conjunto pendiente. | 5 | ✅ **HECHO (2026-08-07)**: pedidos unificados (m024) — encargos minoristas en Ventas con entregar-y-cobrar; + Fase 2 mayoristas (límite de crédito, backorder con alerta). 142 tests verdes |
| **7** | **Promociones y campañas**. Diseño conjunto pendiente (tipos de promo, aplicación en POS). | 2 | ⬜ |
| **Fase II** | Multi-caja, vendedores multi-caja, rol contable, venta online. Decisión MySQL. | — | ⬜ |
| **Comercialización** | White-label (nombre negocio, logo, colores — quizá app separada de gestión) + instaladores Windows/Linux/Android (con Node.js embebido). | — | ⬜ |

---

## 5. Notas para comercialización (futuro)

- **Distribución nativa (D17)**: instalador por plataforma con Node.js y todas las dependencias embebidas. Candidatos: pkg/electron-builder/servicio + acceso directo (como el `START - POS3.lnk` actual). Android tablet: PWA instalable o WebView contra el servidor local.
- Centralizar desde ya los puntos de marca (nombre app, colores en variables CSS, manifest.json) para facilitar el white-label.
