# Compras e Inventario

## Objetivo
Comprar mercancía a los proveedores, incorporarla al stock y mantener el inventario correcto (preparaciones, mermas, ajustes, transferencias).

## Cuándo se usa
- Cuando llega mercancía nueva de un proveedor.
- Cuando se agota o se detecta una merma/rotura.
- Al hacer preparaciones (recetas) o transferencias entre inventarios.

## Cómo se hace (paso a paso)

### Crear una compra
1. Ve a **Compras → Nueva compra**.
2. Selecciona el **proveedor** y la **fecha**.
3. Indica si la compra tiene **factura** (código) o es una **nota interna sin factura**.
4. Añade los productos. **El selector solo muestra productos del mismo grupo fiscal que el primer producto elegido** (gravables o no gravables).
5. Indica cantidades y precios; el total se calcula solo.
6. Guarda la compra.

### Pagar una compra
1. Desde la ficha de la compra pulsa **Pagar**.
2. Indica el monto pagado (parcial o total) y el método.
   - Si se paga por **transferencia**, se registra la salida en el banco.

### Inventariar (llevar a stock)
1. Cuando la mercancía esté físicamente recibida, pulsa **Inventariar**.
2. El stock aumenta según las cantidades (convertidas a la unidad de almacén) y el sistema registra el movimiento.
3. Se actualiza el **costo base** del producto (último costo de compra) y se recalcula el costo de los compuestos que lo usen.

> **Importante**: una vez inventariada, la compra **no se puede editar ni borrar**.

### Ajustes de stock, mermas y transferencias
En **Inventario** puedes:
- Registrar **mermas** (roturas, vencimientos).
- Hacer **ajustes** manuales de stock.
- Registrar **preparaciones** (producción de compuestos).
- Hacer **transferencias** entre el inventario minorista y el mayorista.

## Reglas y restricciones
- **No se puede mezclar** en una misma compra productos **gravables** y **no gravables** (regla del propietario). Se registran en compras separadas.
- Una compra **con factura no puede incluir productos no gravables** (esos se compran sin factura, como nota interna).
- La edición/borrado de una compra queda **bloqueada** una vez inventariada.
- Inventariar es **único** por compra (no se puede repetir).

## Flexibilidades
- Los pagos pueden ser **parciales** (varias veces) hasta completar el total.
- Una compra puede dividirse al inventariar entre **minorista y mayorista**.
- El selector de productos del formulario se **reinicia** si borras todos los productos: puedes empezar con un grupo distinto.

## Errores comunes
- **"No se puede mezclar en una misma compra productos no gravables (...) con productos gravables (...)"** → Intentaste mezclar carbón (no gravable) con guayabas (gravable) → Registra la compra informal (no gravable) por separado, sin factura.
- **"La compra tiene factura pero incluye el producto no gravable (...)"** → Los no gravables se compran sin factura → Quita la factura o separa la compra.
- **"No se puede editar: ya fue llevada a stock"** → La compra ya se inventarió → No se modifica; registra un ajuste de stock si hace falta corregir.

## Preguntas frecuentes
- **¿Qué diferencia hay entre gravable y no gravable?**
  - Los productos **gravables** entran en la declaración fiscal (impuestos, DJ anual). Los **no gravables** se gestionan aparte (se compran y venden sin factura) y no aparecen en los reportes fiscales. Ver Fiscal y Contabilidad.
- **¿Qué es "inventariar"?**
  - Es el paso que **lleva la compra al stock**: sube las existencias y actualiza el costo. Sin inventariar, la mercancía comprada no está disponible para vender.
- **¿El costo de un producto de dónde sale?**
  - Del **último costo de compra** inventariado. No se edita a mano (ver Productos y Recetas).
