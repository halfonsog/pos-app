# 06 — Decisiones de Diseño y Roadmap

Decisiones de diseño vigentes aprobadas por el propietario (Heriberto Alfonso) y plan de trabajo futuro.
**Última actualización:** 2026-08-11

> Las decisiones aquí registradas **prevalecen** sobre lo que diga el código actual. Cuando se implementen, actualizar también los docs 02/03/04 y el módulo correspondiente. Este documento refleja solo lo vigente (sin historial de implementación).

---

## 1. Decisiones de producto (módulo Productos)

### D1. Subtipos de compuestos: Elaborado / Conformado

| tipo | sub_tipo | Stock |
|---|---|---|
| simple | reventa | Propio |
| simple | granel | Propio |
| compuesto | **elaborado** | Propio (se prepara antes de vender) |
| compuesto | **conformado** | Virtual: min(stock ingrediente ÷ cantidad receta) |

### D2. Integridad de recetas (anti-ciclos)
Ningún producto puede tener como ingrediente: a sí mismo ni otro producto que lo contenga como ingrediente (**recursivo**, recetas anidadas). Validación obligatoria al agregar componentes (backend).

### D3. `costo_base` y `precio_recomendado` persistidos en `productos`
- Se guardan como columnas de la tabla `productos` (caché calculada, no dato manual).
- **costo_base = último costo de compra** (NO promedio ponderado).
- **FÓRMULA DEL PROPIETARIO (multiplicativa)**:
  ```
  %gastos            = (gastos fijos + gasto financiero del mes) ÷ ventas_proyectadas
  gastos fijos       = Σ configuracion_gastos activos + Σ salario_mensual de empleados activos
  gasto financiero   = Σ aporte del próximo vencimiento pendiente de préstamos/inversiones activos
  precio_neto        = costo_base × (1 + %gastos) × (1 + margen_recomendado)
  precio_recomendado = precio_neto × (1 + impuesto_ventas)
  ```
  `%gastos`, `total_gastos_fijos`, `gastos_fijos_configurados`, `salarios_mes` y `gasto_financiero_mes` se calculan al vuelo en `obtenerGeneral` (no son columnas); los salarios entran en los gastos fijos por **regla del propietario (2026-08-11)**, tanto en el costeo de precios como en los reportes fiscales (balance, estado de resultados, DJ anual) vía `utils/costos.js` (`obtenerGastosFijos`). El servicio aplica esta fórmula en el recálculo de precios.
- Triggers de recálculo: compra inventariada (cascada recursiva a compuestos contenedores), ficha de costo (simples), cambio de configuración general o de gastos fijos, agregar/quitar ingrediente.

### D4. Campos editables (matriz aprobada)
| Siempre editables | NO editables directamente |
|---|---|
| nombre, descripción, foto, categoría, stock_minimo, precio_venta, activo | tipo, sub_tipo, unidad_compra, unidad_venta, stock_actual, costo_base |

Los no editables solo cambian por vías controladas: conversiones (D6), movimientos de stock, compras/recálculo.

### D5. Regla de ingredientes
Solo pueden ser ingredientes de un compuesto: **simples a granel** y **compuestos elaborados**. (Ni reventa ni conformados.)

### D6. Conversión reventa → granel (intercambio)
- Se implementa como **movimiento entre dos productos distintos**: `intercambio_salida` del reventa origen y `intercambio_entrada` al granel destino.
- El producto destino **debe existir** previamente (el usuario lo crea como granel).
- El usuario elige libremente las cantidades equivalentes. **No hay validación automática posible.**
- La UI muestra un **aviso explícito**: el usuario es el único responsable de la corrección de las cantidades.

### D7. Catálogo de tipos de movimiento
Tabla `tipos_movimiento` (codigo, nombre, signo +/−/±, descripción, activo, orden) en lugar de CHECK constraint.
Tipos: compra(+), venta(−), devolucion(+), preparacion_entrada(+), preparacion_salida(−), donacion_entrada(+), donacion_salida(−), merma(−), autoconsumo(−), intercambio_entrada(+), intercambio_salida(−), transferencia(±), ajuste(±).
Los listados y filtros del frontend se alimentan de esta tabla.

### D8. Subcategorías
`categorias.padre_id → categorias.id`. Al filtrar productos por una categoría padre, se incluyen los productos de sus hijas. Gestión en Configuración (selector de padre, anti-ciclo).

---

## 2. Decisiones de usuarios y seguridad (Fase I)

### D9. RBAC real en backend
- Middleware `requireRole` alineado con el menú lateral por rol.
- Endpoints sensibles (mantenimiento, reportes, dashboard) requieren auth (y admin los primeros).
- Fase I: varios vendedores + 1 admin + **caja única**. CRUD usuarios para admin.
- **Fase II (futuro)**: varias cajas, vendedores en cualquier caja, admin + contable. **Diseñar sin hardcodear caja única en código nuevo.**

### D18. Empleados y usuarios (aclaración del propietario)
La empresa tiene trabajadores registrados en `empleados` (fundamental para Contabilidad). Relación **empleados 1 ── N usuarios**:
- Puede haber **empleados sin credenciales** de acceso a la app.
- **No puede haber usuarios sin empleado** asociado (obligatorio).
- Un empleado puede tener **varios usuarios** (una misma persona con usuario admin y usuario vendedor).

### D10. Motor de BD
Se mantiene **SQLite en Fase I**. La decisión MySQL/PostgreSQL se pospone a Fase II (multi-caja simultánea).

### D11. Tests
Harness de tests (Jest + supertest + BD temporal desde migraciones). Prioridad: matriz rol↔endpoint, invariantes de dinero y stock (venta descuenta stock exacto, anulación revierte todo, recálculo de costos en cascada, vector fiscal, fórmulas de préstamos). **160 tests verdes.**

---

## 3. Decisiones de UX/UI y negocio

### D12. Búsquedas
Búsqueda case-insensitive y accent-insensitive en **todos** los DataTables, de forma global vía wrapper unificado (resucitar `datatable-wrapper.js`).

### D13. Límites de registros
La app está en uso real y los `LIMIT` fijos ocultan registros. Eliminarlos o sustituirlos por paginación real / límite configurable (def 1000).

### D14. Layout unificado
Header de página con título + breadcrumbs funcionales + acciones, igual en todos los módulos. Eliminar las copias del navbar. El menú lateral no muestra entradas sin módulo (Promociones oculta hasta que exista el módulo).

### D15. Sin mocks en producción
Eliminar los fallbacks con datos ficticios (proveedores/compras/inventario); reemplazar por estados de error con reintento.

### D16. Redondeo de ventas
`redondeo_venta` configurable (hoy 5 = billete mínimo circulante); el sistema ya lo soporta.

### D17. Distribución como app nativa
La app está pensada para correr como **aplicación nativa**: el paquete de instalación debe incluir **todas las dependencias** (Node.js embebido) y ser nativo para cada plataforma/SO (Windows, Linux, tablets Android). El navegador/PWA actual es solo el vehículo temporal.

### D19. Limpieza de archivos muertos
El árbol del proyecto se mantiene limpio; código/esquemas retirados van a `deleted/` (recuperable). `datatable-wrapper.js` se conserva para resucitarlo (D12).

### D20. Convención de fechas y horas (UTC ↔ local)
- **Backend/BD trabaja en tiempo estándar (UTC)**: SQLite `CURRENT_TIMESTAMP` guarda `'YYYY-MM-DD HH:MM:SS'` en UTC; la API acepta/devuelve fechas-hora en ISO 8601 UTC.
- **Frontend presenta siempre en hora local** del usuario.
- **Conversiones centralizadas en `Utils`** (no inventar otras): `fechaISOToLocal(iso)` (string UTC → Date local), `formatearFecha(date, formato)` (⚠ recibe **Date**, nunca un string de BD), `fechaLocalToISO` / `fechaInputToUTC` (local → UTC al enviar), y los rangos (`rangoHoy`, `rangoMes`, `rangoAnio`...).
- Regla práctica: **al leer de la BD → convertir a local antes de mostrar; al enviar al servidor → convertir a UTC antes de mandar**.

---

## 4. Decisiones aprobadas de módulos verticales

### Ventas mayoristas — diseño aprobado y vigente
1. **Inventario separado (minorista/mayorista)**: cada producto tiene `stock_actual` (minorista) y `stock_mayorista`. Transferencias entre inventarios (movimiento `transferencia`); compras al inventariar pueden dividirse por línea. **Los conformados NO entran en mayorista** (stock virtual). Solo simples y elaborados.
2. **El dinero sin turnos**: efectivo → cuenta en el **arqueo del turno abierto**; tarjeta/transferencia → **banco**. Cada cobro es un registro en `pagos_pedido` → trazabilidad por pedido y cliente.
3. **Precios mayoristas SOLO por tramos de volumen** (`venta_tramos`). Si la cantidad no cae en ningún tramo → precio_venta minorista. Al definir tramos se muestra la ficha de costo del producto. El cliente puede tener `descuento_global %`.
4. **Unidad mayorista = unidad de compra** (regla del propietario): pedidos y `stock_mayorista` se manejan en la unidad de compra; al facturar, las `venta_detalles` se convierten a **unidad de venta** (consolidación de reportes).
5. **Facturación parcial** (m028): se puede facturar solo parte de cada línea; el pedido queda en estado `parcial` hasta completarse. **Tras facturación parcial el pedido no se modifica; solo se completa lo restante o se cancela** (lo ya facturado/cobrado queda intacto).
6. **Impuesto**: las ventas mayoristas alimentan el mismo vector fiscal (la factura vive en `ventas` con `tipo_venta='mayorista'`).

### Encargos minoristas — vigente
Mismo módulo `pedidos` con `tipo='minorista'`: cliente por **nombre libre** (sin registro), precio minorista, stock minorista. Flujo: `pendiente → entregar y cobrar` (crea la venta minorista, con turno si hay abierto; efectivo→arqueo, tarjeta→banco). **Sin depósitos en v1** (evita doble conteo de caja). Acceso desde Ventas → Encargos. Límite de crédito y backorder aplican a mayoristas (stock negativo + alerta en Inventario).

### Préstamos e Inversiones — especificación del propietario, vigente
Registro de seguimiento (no paga deudas reales). Vencimientos el día 1 de cada mes, el primero el mes siguiente a `fecha_inicio`. Fórmulas por ordinal (pago_capital = capital_total ÷ plazo; tarifa = tasa_mensual × capital_gravado; capital_gravado para préstamo = capital − pago_capital; para inversión = 0 en mes 1, i × pago_capital desde mes 2). En inversiones, un pago distinto al programado reajusta las cuotas restantes. El **gasto financiero del mes** = Σ aportes del **próximo vencimiento pendiente** de registros activos → entra en el %gastos del costeo.

### Contabilidad — normativa cubana (ONAE), vigente
Ver `modulos/contabilidad.md` para el vector fiscal completo (fórmulas verificadas contra el Excel del propietario). Destacan:
- **Porciento a declarar (PD, m030)**: escala ventas Y compras/gastos en todo lo fiscal (vector, libro diario, estados, cierre, DJ anual, CSV exportable).
- **Nóminas**: generadas al cerrar el mes; salario pagado por banco. **Bonos semanales en efectivo** (no se declaran como salarios); ayuda a decidirlos por empleado.
- **USD (m025–m027)**: precios siempre en CUP; cada operación en USD lleva la **tasa acordada en ese momento** (no hay tasa general). Saldos por cuenta/moneda + equivalente en CUP con la última tasa; cambio de divisas; para el fisco solo cuenta el equivalente total en CUP.

---

## 5. Roadmap futuro

| Fase | Contenido | Estado |
|---|---|---|
| **Sprint 7** | Promociones y campañas (último módulo nuevo; menú oculto hasta que exista). **Por definir** (borrador del propietario en `com.md` #3: campañas con periodos y análisis de impacto en ventas; minoristas: "compra X y regala 1", descuentos por calidad y por grupos; mayoristas: transporte desde un monto). Se definirá bien antes de implementar. | ⬜ |
| **Fase II** | Multi-caja, vendedores multi-caja, rol contable, venta online (pedidos ya unificados). Decisión MySQL/PostgreSQL. | ⬜ |
| **Comercialización** | White-label (nombre negocio, logo, colores) **vía variables de configuración, aplazado al despliegue Windows** (`com.md` #1) + instaladores Windows/Linux/Android (con Node.js embebido, D17). | ⬜ |
| **Contabilidad** | La contabilidad se limita a la gestión del negocio (cuentas por pagar/cobrar, salarios y bonos, impuestos); los ficheros se generan para importar en software certificado (Versat), no PDF propio. Pendientes: tabla de gastos deducibles DJ (la aportará el propietario), ajustar el CSV al ejemplo de Versat. Hecho: `parametros_contables` → `configuracion_contabilidad` (m031). | ⬜ |

## 6. Notas para comercialización (futuro)

- **Distribución nativa (D17)**: instalador por plataforma con Node.js y todas las dependencias embebidas. Candidatos: pkg/electron-builder/servicio + acceso directo (como el `START - POS3.lnk` actual). Android tablet: PWA instalable o WebView contra el servidor local.
- Centralizar desde ya los puntos de marca (nombre app, colores en variables CSS, manifest.json) para facilitar el white-label (`00-pendientes.md` #1).