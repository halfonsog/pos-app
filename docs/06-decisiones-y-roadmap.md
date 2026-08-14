# 06 — Decisiones de Diseño y Roadmap

Decisiones de diseño vigentes aprobadas por el propietario (Heriberto Alfonso) y plan de trabajo futuro.
**Última actualización:** 2026-08-12

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
- **FÓRMULA DEL PROPIETARIO (multiplicativa, actualizada 2026-08-12)**:
  ```
  %gastos            = (gastos fijos + gasto financiero del mes) ÷ ventas_proyectadas
  gastos fijos       = Σ configuracion_gastos activos + Σ salario_mensual de empleados activos
  gasto financiero   = Σ aporte del próximo vencimiento pendiente de préstamos/inversiones activos
  precio_neto        = costo_base × (1 + %gastos) × (1 + margen_recomendado)
  precio_recomendado = precio_neto ÷ (1 − impuesto_ventas)
  ```
  **Regla del impuesto (2026-08-12)**: el precio de venta **INCLUYE el impuesto**, y el impuesto es el % `impuesto_ventas` del **precio de venta**. Por eso `precio = neto ÷ (1 − impuesto)` y en la venta: `impuesto = total × tasa`; `neto = total − impuesto`. El card del turno muestra el % configurado (ej. 15%).
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

### D27. Recetas sin validación de suma (regla del propietario)
Las cantidades de la receta **deben coincidir con la cantidad del producto a preparar**; el sistema **no valida** la suma de componentes (antes exigía ≤ 1 por tipo de unidad). La UI muestra la nota "Las cantidades establecidas en la receta deben coincidir con la cantidad del producto a preparar". El título de la receta incluye la unidad (ej. "Receta: 1 litro de Jugo de guayaba").

### D28. Eliminar producto con feedback y dependencias reales
Al eliminar un producto desde el listado, el sistema muestra confirmación y resultado (Toast). El backend bloquea el borrado si el producto está usado en movimientos de stock, compras, ventas, pedidos o recetas (como ingrediente o como padre), con mensaje que enumera los usos. En la ficha de edición, el stock mínimo muestra la unidad correspondiente y la vista de ficha ya no muestra el tipo en la barra del título.

### D29. Unidades como dropdowns Bootstrap
En el formulario de producto, la unidad de compra y venta se muestran como **dropdowns de Bootstrap** (botón + menú con scroll máximo 240px), en lugar de `<select>` nativos, para que listas largas no salgan de la ventana visual. La unidad de venta refleja la regla D27 (reventa → solo tipo `unidad`; compra visible → mismo tipo base que la compra; compuesto → cualquier tipo). El label del stock mínimo muestra la abreviatura de la unidad de venta.

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
- **Porciento a declarar (PD, m030)**: **DEPRECADO y ELIMINADO** (2026-08-12). Sustituido por el modelo fiscal de dos mundos (D30–D36): se declara el 100% de un subconjunto (lo gravable), no el X% de todo. El campo `porciento_declarar` fue borrado de la BD (m032).
- **Nóminas**: generadas al cerrar el mes; salario pagado por banco. **Bonos semanales en efectivo** (no se declaran como salarios); ayuda a decidirlos por empleado.
- **USD (m025–m027)**: precios siempre en CUP; cada operación en USD lleva la **tasa acordada en ese momento** (no hay tasa general). Saldos por cuenta/moneda + equivalente en CUP con la última tasa; cambio de divisas; para el fisco solo cuenta el equivalente total en CUP.

### Modelo fiscal de dos mundos: gravable / no gravable — APROBADO (2026-08-12)

**Objetivo**: reducir el impuesto sobre las ventas de forma coherente separando una línea de negocio **informal** ("no gravable") de la línea formal que se declara al 100%. Sustituye al Porciento a Declarar (deprecado).

**Principio rector**: la atribución fiscal es **por línea de producto, nunca por documento**. Una venta, pedido o encargo puede mezclar productos gravables y no gravables; cada línea hereda la visibilidad fiscal de la **categoría** de su producto. Los cálculos fiscales se hacen sobre cada línea vendida, no sobre el total del ticket.

#### D30. Mundo real vs mundo declarado
- **Mundo real (siempre íntegro)**: inventario, caja, banco, arqueo, cierre de turno. El dinero de los productos no gravables existe y reconcilia.
- **Mundo declarado (solo gravables)**: liquidación de impuestos, DJ anual, libro diario, balance, PyG, cierre de mes.
- La exclusión vive en la **capa de consulta fiscal**, nunca en el almacenamiento.

#### D31. Categoría de sistema "No gravable" (predefinida e indeleble)
- `categorias.gravable` (1=gravable, 0=no gravable). Una **categoría raíz "No gravable"** se crea por migración con `gravable=0`.
- Es **categoría de sistema**: la UI bloquea editar/eliminar esa categoría; el usuario solo crea **categorías hijas** bajo ella.
- Los productos **heredan por ancestría**: un producto es no gravable si alguna categoría en su árbol (`padre_id`) tiene `gravable=0`. La elegibilidad se **deriva** en consulta, no se almacena por producto.

#### D32. Filtro fiscal derivado por línea
Todas las agregaciones fiscales (`contabilidadController.js`, `costos.js`) consultan **solo líneas de productos gravables**:
- Ventas minoristas: unir `venta_detalles ↔ productos ↔ categorias` y quedar con líneas gravables (join sobre el árbol).
- Pedidos/encargos/mayoristas: igual a una venta minorista (mismo módulo `pedidos`); la base del impuesto 0114022 y de la DJ incluye también lo facturado desde pedidos cuando corre en la misma caja.
- No hay restricciones de mezcla en documentos: se calcula por línea vendida.

#### D33. Servicios — atributo "tiene_factura" (no "grava impuestos")
- Los servicios no afectan al impuesto sobre las ventas, pero sí a la **tributación anual** (gasto deducible justificado).
- Se añade `servicios.tiene_factura` (1/0, default → inferido del vínculo: compra/pedido sin factura ⇒ 0).
- Con factura → entra en el libro diario/DJ como gasto/ingreso **justificado**. Sin factura → visible solo en el mundo real (caja/banco, cierre de turno), **no entra** a lo declarado.

#### D34. Regla del 80% — solo informativa (sin restricciones)
La ley exige justificar (facturas/tickets) **≥80% de los gastos declarados** en caso de auditoría. La regla **no genera bloqueos**: el sistema muestra un indicador `gastos justificados / gastos declarados` en los reportes fiscales, con aviso cuando caiga por debajo del 80%.

#### D35. Servicios en el cierre de turno ✅ implementado
El cierre de turno (card desglose) incluye una **línea aparte, fuera de la reconciliación del recaudado**:
```
(=) Margen                       700.19
(±) Servicios del turno (cobros − pagos)   +X.XX / −X.XX
(=) Entradas netas del turno     Y.YY
```
Informativo; informa sobre la caja sin contaminar el cálculo de prioridades. `desglosePrioridades` devuelve `servicios: {cobros, pagos, neto}` (solo CUP) y el card lo muestra.

#### D36. Guardas de coherencia (la app ayuda/obliga, informando en cada caso) ✅ implementadas
- **Bloquear (backend)**: compra con factura que contiene productos no gravables y **mezcla de gravables con no gravables en la misma compra** (`compraController`); compuesto/ingrediente que mezcla gravables y no gravables en la misma receta (`productoController.agregarComponente`).
- **Prevenir (frontend)**: al elegir el primer producto en una compra o en una receta, el selector de productos **se filtra al mismo estado fiscal** (solo gravables o solo no gravables) y muestra un aviso. El backend sigue siendo la validación definitiva.
- **Ventas minoristas, encargos y pedidos mayoristas NO se restringen** (regla del propietario 2026-08-12): los cálculos se hacen por producto vendido (cada línea hereda su visibilidad fiscal), así que un ticket/pedido puede mezclar libremente gravables y no gravables.
- **Categoría obligatoria al crear producto**: define el canal fiscal (gravable / no gravable). La ficha de costo de los **no gravables** se calcula con `impuesto = 0` (muestran el margen real; `precio_recomendado` sin colchón de impuesto). El ticket sigue mostrando el componente de impuesto con su propia regla — este costeo es solo informativo.
- Donde se mezclarían los dos mundos en compras o recetas, la app lo impide o lo advierte explícitamente.

#### D37. Cambio de categoría de producto restringido al mismo grupo raíz ✅ implementado
Al editar un producto, su `categoria_id` solo puede cambiar a otra categoría **con la misma raíz** que la actual (y no puede quedar sin categoría). Evita cruzar productos entre el mundo gravable y el no gravable (coherencia fiscal). Backend valida; el frontend filtra el selector y avisa si el grupo es no gravable. (`00-pendientes.md` #1.)

#### D38. Cierre de mes: ficha persistida + excedente → vencimientos ✅ implementado
Al **cerrar el mes** (automático, `POST /cierre-mes`) se persiste la ficha en `cierres_mes` (m033) y el excedente del desglose (mundo gravable) se aplica a los vencimientos con la regla del propietario:
1. **Inversiones activas primero**, priorizando la de **mayor número de vencimientos pendientes**; el excedente adelanta capital y se **regeneran las cuotas restantes** (menos vencimientos; el inversor recibe menos intereses por devolución anticipada).
2. Si queda excedente y no hay inversiones activas: **préstamos activos**, misma prioridad, pero **preservando las tarifas originales por ordinal** — el acreedor recibe el **mismo total de intereses pactado** aunque se adelante capital (solo se acelera el capital).
3. Lo que sobre no se aplica (queda como ganancia; se informa en la ficha como "no aplicado").

Un mes solo se cierra una vez (UNIQUE mes/anio). `GET /cierre-mes/:mes/:anio` recupera la ficha con el detalle de aplicaciones (`cierre_mes_aplicaciones`). La mecánica de regeneración está en `prestamoInversionController.reajustarCuotas` (reutilizada por `registrarPago` para inversiones).

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