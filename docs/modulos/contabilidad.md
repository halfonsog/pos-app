# Módulo: Contabilidad (Tributos)

## Propósito
Liquidación de tributos según normativa cubana (ONAE) para un TCP: cálculo por período, registro de pagos, historial, balance/estado de resultados y cierre de mes con desglose por prioridades. **Estado: vector fiscal completo y verificado contra el Excel del propietario (`tests/vector-fiscal.test.js`).**

## Tablas
`tributos` (9 precargados) · `configuracion_tributos` · `empleados` · `tributos_empleados` · `periodos_fiscales` · `liquidaciones_tributos` · `configuracion_tributos_historial` · `movimientos_bancarios` · `servicios` · `nominas` · `bonos` · `configuracion_contabilidad` (porciento_declarar, dia_pago_bonos; antes `parametros_contables`, m031). Migraciones 015, 021, 022, 025–027, 029, 030.

## Endpoints (ref: ../03-api.md) — todos [A+] admin
- `POST /calcular-impuestos` (mes, anio) — motor de liquidación ✅ verificado contra el vector fiscal real · **aplica el Porciento a Declarar (PD)** a ventas
- `POST /registrar-pago` — marca liquidación pagada/parcial; **registra la salida en el banco** (los impuestos se pagan por banco online — propietario)
- `GET /historial` — lista completa de liquidaciones
- `GET /balance` · `GET /estado-resultados` — agregados del período (con montos reales y **declarados**)
- `GET /cierre-mes?mes&anio` — desglose del recaudado por prioridades + dinero al banco vs caja + **pago a trabajadores** + comparación %gastos proyectado vs real
- `GET /liquidacion-anual?anio` — Declaración Jurada (0530222): ganancia neta × impuesto_ganancia (declarada × PD), −5% antes del 28/02
- `GET /libro-diario?mes&anio` — ventas y gastos por día, **reales y declarados** (× PD sobre ambos)
- `GET /banco` · `POST /banco/movimiento` — saldos por cuenta y moneda (CUP/USD × efectivo/banco) + depósitos/retiros manuales
- `POST /cambio-divisas` — cambio USD↔CUP a tasa acordada `{de, monto, tasa, cuenta?}`
- `GET /exportar?mes&anio` — **CSV de liquidaciones** para software contable certificado (Versat Sarasola)
- **Nóminas y bonos**: `GET /nominas?mes&anio` · `POST /nominas/generar` (al cerrar el mes) · `POST /nominas/:id/pagar-salario` (por **banco**) · `GET /bonos/ayuda` (ayuda a decidir el bono) · `POST /bonos` (semanal, en **efectivo**; **no se declaran como salarios**)

## Frontend
`js/modules/contabilidad.js` — cards (ventas hoy/mes, días para pago con semáforo, cobertura de gastos), calcular impuestos por período, cierre de mes con desglose por prioridades, historial con registro de pago por fila.

## Reglas de negocio — Vector fiscal ONAE (verificado contra el Excel del propietario)
Datos: `st` (salario), `at` (aporte corto plazo), `ut` (utilidades) por empleado; `sm` (salario mínimo), `base_contribucion_especial` en configuracion_contabilidad (editables en Configuración → Parámetros).

| Código | Nombre | Período | Fórmula | Verificado |
|---|---|---|---|---|
| 0730122 | Impuesto sobre documentos | Puntual | Monto fijo (valor_fijo), una sola vez | ✅ 30 |
| 0810132 | Contribución seguridad social | Mensual | `1.5%×at + 12.5%×st` | ✅ 750 |
| 0820232 | Retención trabajadores | Mensual | escala [5% hasta 15000, 10%] × `(st+ut)` | ✅ 300 |
| 0114022 | Impuesto sobre ventas | Mensual | `10% × tv` | ✅ 3000 (tv=30000) |
| 0510122 | Impuesto ingresos personales | Mensual | `(tv − sm) × 5%` | ✅ 1337 |
| 0520522 | Retención TCP ingresos empleados | Mensual | escala [3%~20%] × `st` (defecto 3%) | ✅ 180 |
| 0530222 | Liquidación adicional TCP (DJ) | Anual | ganancia_neta × 35%; −5% antes del 28/02 | ✅ implementada |
| 0610322 | Impuesto utilización fuerza de trabajo | Trimestral | `5% × Σ salarios del trimestre` (meses con actividad) | ✅ T1=300, T2=900 |
| 0820132 | Contribución especial TCP | Trimestral | `20% × base_contribucion × meses del trimestre` | ✅ T1=400, T2=1200 |

- **Meses con actividad del trimestre** = meses del trimestre con al menos una venta completada (así T1=1 mes si el negocio abrió en marzo).
- **Fechas límite**: día `dias_limite_pago` del mes siguiente (15 mensual, 20 trimestral).
- No duplica liquidaciones al recalcular un período (verificado por test).
- Test de regresión: `tests/vector-fiscal.test.js` replica el vector completo del propietario.

## Temas pendientes a resolver
- La gestión de tributos **se queda en este módulo** (decisión del propietario, `com.md` #2a: la contabilidad y su configuración viven en Contabilidad). La tabla quedó renombrada a `configuracion_contabilidad` (m031). → `00-pendientes.md`.
- Tabla de gastos deducibles para la DJ anual (el propietario la aportará; en espera de su consulta a un especialista).
- La contabilidad se limita a la gestión del negocio; el export es **CSV para software certificado (Versat)** — no PDF propio → `00-pendientes.md`.

## Pago a trabajadores (definición acordada)
- **Nómina mensual por empleado**: se genera al cerrar el mes desde empleados activos (sin duplicar); el **salario se paga por el banco**. El TCP también es empleado con su salario. Salarios editables en la ficha del empleado (salario_mensual, aporte_corto_plazo, utilidades).
- **Bonos semanales en efectivo** (NO se declaran como salarios): el día de la semana de pago se configura en Parámetros (`dia_pago_bonos`); "Pagar Bonos" muestra por empleado: días trabajados de la semana (por actividad en la app), bonos ya pagados del mes, salario de fin de mes, total a recibir, y ventas por día del vendedor. El admin decide el monto y paga ahí mismo. Aparece en los pendientes del Dashboard el día configurado.

## Porciento a declarar (PD)
Campo `porciento_declarar` en Parámetros Contables (defecto 100%). **Escala ventas Y compras/gastos** en todo lo fiscal: vector fiscal, libro diario, estado de resultados, balance, cierre de mes, DJ anual y CSV exportable. `ventas_declaradas = ventas × PD`, igual para gastos.

## Soporte USD (aprobado por el propietario)
- Precios siempre en CUP; cada operación en USD lleva la **tasa acordada en ese momento** (cobros de pedidos, pagos de compras por transferencia, servicios). No hay tasa general (la tasa cambia a diario).
- **Saldos por cuenta/moneda** (Contabilidad → Banco): efectivo CUP · banco CUP · efectivo USD · banco USD + **total equivalente en CUP** (con la última tasa usada).
- **Cambio de divisas**: botón en Banco — mueve entre USD y CUP a la tasa acordada, en la cuenta indicada (efectivo o banco).
- Para el fisco solo cuenta el equivalente total en CUP (ley actual).

## Servicios
Pagos y cobros por servicios (estiba, transporte...) con vínculo opcional a compra/pedido; mueven el saldo de la cuenta indicada (efectivo/banco), en CUP o USD con tasa.

## Exportación a software certificado
`GET /contabilidad/exportar?mes&anio` → CSV de liquidaciones del período (para Versat Sarasola u otro software contable certificado). Cuando haya un fichero de ejemplo del certificado, se ajusta el formato exacto.
