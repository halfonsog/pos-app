# Comunicados del propietario

Respuestas a tus preguntas:
1. Estos son apuntes para el despliegue de la app para un cliente especifico. No se bien como definir esto. Imagine q seria sencillo establecer variables de configuracion (.env?) o algo asi. Hay q introducir los datos (nombre, colores a imagen del logo) antes de empaquetar la app para la venta. Dejemos esto para cuando terminemos la revision y hagamos un despliegue para Windows.

2a. No se bien lo q propone este cambio. La gestion de tributos debe estar en el modulo de Contabilidad. Cuando hay datos q puedieran cambiar, se llevan a la tabla parametros_contables (que deberia llamarse configuracion_contabilidad, para evitar confuciones)
2a.  — hoy los tributos se gestionan en el módulo Contabilidad (tabla tributos + configuracion_tributos). El acuerdo es administrarlos desde Configuración.
2b. Si. Tengo la tabla en una foto q le tire. Pero tengo q hacer algunas preguntas a un especialista para comprender bien su sentido.
2c. La contabilidad esta limitada legalmente a softwares certificados. Asi q nuestra contabilidad se limitara a lo necesario para la gestion del negocio: cuentas por pagar (compras y pago de servicios) y cobrar (ventas), pagos de salarios y bonos, y temas de impuestos (vector fiscal, declaracion jurada anual, libro de ingresos y gastos diario, cierre de turno y cierre de mes (creo q no se me queda nad...). Asi q tendremos q generar ficheros para ser importados por algun software contable certificado (Versat es el mas popular aca en Cuba)

3. Este nuevo modulo esta por definir. necesito cerrar bien las funcionalidades de la app, pues me temo q este modulo se integrara profundamente con otros modulos.
Para ir pensando en la definicion se em ocurre:
- las promociones se lanzarian en campanas de marketing con periodos de tiempo. Lo mas importante es hacer seguimiento y analizar su efectividad o no mediante su impacto en las ventas
- minoristas: compra x cantidad y regalo uno, descuentos en productos q pueden perder calidad (frutas, vejetales) con el tiempo, descuentos para la compra de un gurpo de productos (por ejemplo: desayuno: sandwich de queso + jugo de mango)
- mayoristas: brindar el servivio de transporte a partir de un monto de venta especifico
Ya lo definiremos bien, antes de implementarlo!

4. esta fase no esta aun clara. Necesitaremos discutir alguna cuestiones para establecer objetivos y definirlos luego

 La gestion de préstamo/inversión vive en Configuración. puedes quitar esta nota