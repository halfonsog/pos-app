# Empaquetado de PuntoX para Windows

Guía completa para generar el **Instalador PuntoX.exe** (aplicación de escritorio que instala la app como cualquier programa, con Node.js embebido y sin necesidad de terminal).

## Qué contiene el instalador

- **Node.js portable** embebido (`deploy\node\`): el servidor corre con su propio Node, sin depender de que la PC lo tenga instalado.
- **La app completa** (`server.js`, `src\`, `node_modules\`).
- **Base de datos limpia** (sin datos de prueba) para que el negocio empiece desde cero.
- **Lanzadores "Abrir PuntoX" / "Cerrar PuntoX"**: dos accesos directos en el escritorio (abrir abre el navegador sin terminal; cerrar detiene el servidor).
- **Desinstalador** (Panel de control → Programas → Desinstalar PuntoX).

## Seguridad

- La app se instala en `C:\Program Files\PuntoX\`: Windows **bloquea la escritura** para usuarios normales → los **ficheros fuente no se pueden modificar**.
- Los **datos** (base de datos y fotos) se guardan en `C:\ProgramData\PuntoX\`, donde la app sí escribe. Al desinstalar se conservan (no se borran los datos del negocio).

---

## Paso 1 — Preparar el Node.js portable (una vez)

Solo hace falta si `deploy\node\` no existe:

1. Descarga el **zip** de Node.js para Windows x64 desde:
   https://nodejs.org/en/download (Node 22 LTS, "Windows Binary (.zip)")
   O directamente: `https://nodejs.org/dist/v22.22.2/node-v22.22.2-win-x64.zip`
2. Descomprime y mueve el contenido a `deploy\node\`, de modo que exista `deploy\node\node.exe`.

Verifica:
```
deploy\node\node.exe --version
```

---

## Paso 2 — Generar la base de datos limpia (cada vez que cambie el esquema)

Desde la carpeta del proyecto:
```
npm run db:limpia
```
Genera `deploy\database_limpia.db` (migraciones + catálogos básicos + usuario admin/admin123 + branding "PuntoX Demo").
Puedes personalizar nombre y logo:
```
node database/scripts/crear_limpia.js deploy/database_limpia.db "Mi Negocio" "/img/logo.png"
```

---

## Paso 3 — Colocar el logo del negocio (opcional)

- Coloca el logo del negocio en `src\frontend\img\logo.png` (PNG recomendado, fondo transparente ideal). Es el que se muestra en la app (la BD limpia ya apunta a `/img/logo.png`).
- El encabezado del menú lateral ("Powered by PuntoX") usa la imagen `src\frontend\img\pb.png`.
- El instalador copia todo `src\frontend\` (incluye ambos logos) a la app instalada.

---

## Paso 3b — Generar el icono de los accesos directos (`.ico`)

Los accesos directos "Abrir/Cerrar PuntoX" usan `deploy\icono.ico`. Regenerarlo desde los iconos del frontend:
```
node deploy/regenerar_icono.js
```
(Crea `deploy\icono.ico` con los tamaños 16/32/192/512 a partir de `src\frontend\img\`.)

---

## Paso 4 — Instalar Inno Setup (una vez)

1. Descarga de https://jrsoftware.org/isinfo.php → **Inno Setup 6**.
2. Instala con opciones por defecto.

---

## Paso 5 — Compilar el instalador

1. Abre **Inno Setup** (Compilador).
2. Abre `deploy\instalador.iss`.
3. Pulsa **Compile** (Ctrl+F9).
4. Genera **`Instalador PuntoX.exe`** en `deploy\`.

Ese archivo es el que se distribuye: el usuario lo ejecuta, se instala PuntoX, se crean los accesos "Abrir PuntoX" y "Cerrar PuntoX", y puede desinstalarlo desde el Panel de control.

---

## Probar el instalador

1. Ejecuta `Instalador PuntoX.exe` en una PC.
2. Se instala en `Program Files\PuntoX` y los datos en `ProgramData\PuntoX`.
3. Abre "Abrir PuntoX": se abre el navegador en `http://localhost:3000`.
4. Entra con `admin` / `admin123` (cámbiala tras el primer acceso).
5. "Cerrar PuntoX" detiene el servidor.

---

## Notas

- Los ficheros `deploy\node\`, `deploy\database_limpia.db` y `deploy\*.zip` **no van al repositorio** (están en .gitignore; se generan en cada build).
- Si al compilar Inno Setup marca algún `Source` como inexistente, revisa que `deploy\node\`, `database_limpia.db` y (si lo quieres) `img\logo.png` estén presentes.
- El nombre del negocio aparece en la **barra superior** (izquierda) y el **logo al pie del menú lateral**; el "Powered by PuntoX" está en el encabezado del menú lateral.
