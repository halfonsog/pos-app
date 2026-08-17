# Instalación y Red (varios PCs)

## Objetivo
Permitir que la app instalada en un PC sea accedida desde **otros computadores de la misma red** (ej. el vendedor mayorista en el almacén y el minorista en el punto de venta, compartiendo la misma base de datos).

## Cuándo se usa
- Cuando el negocio tiene **dos puntos físicos** (almacén y punto de venta) que trabajan contra el **mismo inventario y la misma caja**.
- Solo Administrador.

## Qués es "misma base de datos"
- Todos los PCs conectados usan **la misma instancia y los mismos datos**.
- Modelo **monousuario**: solo hay **un turno abierto** a la vez. No es multi-caja independiente (eso es Fase II).
- El acceso es por **red local** (WiFi o cable).

## Cómo se hace (PC servidor — donde está instalada la app)
1. **Abrir el puerto en el firewall**: PowerShell como administrador →
   `New-NetFirewallRule -DisplayName "PuntoX" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow`
2. **Conocer la IP**: `ipconfig` → anotar la **IPv4** activa (ej. `192.168.1.50`).
3. **Iniciar PuntoX** (el servidor debe estar corriendo).

## Cómo se hace (desde los otros PCs)
1. Abrir el navegador.
2. Escribir `http://IP-DEL-PC-SERVIDOR:3000` (ej. `http://192.168.1.50:3000`).
3. Iniciar sesión. **No necesitan instalar nada** (solo navegador y misma red).

## Reglas y restricciones
- Exposición a **cualquier PC de la red** que conozca IP y puerto → solo red de confianza.
- **HTTP sin cifrado** + login con protección básica → **no** abrir a internet sin HTTPS.
- Cambiar la contraseña por defecto (`admin/admin123`).
- Los datos viven en `C:\ProgramData\PuntoX` (se conservan al desinstalar).

## Errores comunes
- **"No se puede conectar"** → Verificar que el servidor esté corriendo, el puerto 3000 abierto en el firewall, y que ambos PCs estén en la misma red.
- **IP cambió** → Usar la IP nueva o reservar IP fija en el router.

## Preguntas frecuentes
- **¿Puedo tener dos turnos abiertos?** No: caja única (un solo turno).
- **¿Instalo en cada PC?** No: solo en el servidor; los demás usan el navegador.
- **¿Y si cambia la IP?** Usar la nueva, o reservar IP fija / nombre de host en el router.
