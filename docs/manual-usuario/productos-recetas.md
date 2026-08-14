# Productos y Recetas

## Objetivo
Mantener el catálogo de productos del negocio (altas, edición, fotos), organizarlos en categorías y definir las recetas de los productos compuestos.

## Cuándo se usa
- Al crear un producto nuevo o cambiar su precio/stock mínimo.
- Al organizar el catálogo por categorías (incluida la categoría de sistema "No gravable").
- Al definir o ajustar la receta de un producto compuesto.

## Cómo se hace (paso a paso)

### Crear / editar un producto
1. Ve a **Productos → Nuevo** (o edita uno existente).
2. Indica código, nombre y **tipo** (Simple o Compuesto) y **sub-tipo** (Reventa / Granel / Elaborado / Conformado).
3. Selecciona la **categoría**. Al editar, **solo se permite cambiar a otra categoría del mismo grupo** (misma raíz), para no cruzar entre gravables y no gravables.
4. Asigna unidades de compra y venta, stock mínimo, foto y precio.
5. Guarda.

### Gestionar categorías
1. Ve a **Configuración → Categorías**.
2. Puedes crear categorías raíz y **subcategorías** (hijas). Una hija **hereda** el estado fiscal del padre.
3. La categoría de sistema **"No gravable"** existe por defecto y **no se puede editar ni eliminar**. Crea subcategorías bajo ella para agrupar productos informales (carbón, compras del mercado, etc.).

### Definir una receta (producto compuesto)
1. Abre el producto compuesto → **Receta**.
2. Añade los ingredientes (solo **granel** o **compuestos elaborados**).
3. Indica las cantidades. El selector solo muestra ingredientes **del mismo grupo fiscal** que el producto padre.

## Reglas y restricciones
- **Tipo y sub-tipo no se pueden editar** directamente después de crear (cambian por conversiones o movimientos).
- **Costo base y precio recomendado no se editan a mano**: se calculan (costo = último costo de compra o suma de la receta; precio = fórmula del negocio).
- **No se puede mezclar** en una misma receta productos **gravables** y **no gravables**.
- La categoría **"No gravable"** es de sistema (protegida).
- Un producto con categoría **no puede quedarse sin categoría** ni saltar a otra raíz (D37).

## Flexibilidades
- Se pueden crear subcategorías a **dos niveles** (raíz → hija).
- Fotos opcionales (máx. 2 MB).
- El **stock mínimo** y el **precio de venta** son editables.

## Errores comunes
- **"No se puede mezclar en una misma receta productos gravables y no gravables"** → Intentaste añadir un ingrediente de otro grupo → Usa un ingrediente del mismo grupo que el producto padre.
- **"La categoría solo se puede cambiar a otra dentro del mismo grupo"** → Al editar un producto no puedes saltar de raíz → Elige otra categoría del mismo grupo.
- **"Ya existe una categoría con el nombre ..."** → El nombre ya está en uso → Usa otro nombre.

## Preguntas frecuentes
- **¿Qué es un producto no gravable?**
  - Pertenece a la categoría "No gravable" (o a una subcategoría suya): se compra y vende sin factura y **no entra en la declaración fiscal**.
- **¿Cuándo un compuesto es elaborado o conformado?**
  - **Elaborado**: se prepara antes de vender (ej. jugo). **Conformado**: se arma en el momento de la venta con sus componentes (ej. un sándwich).
