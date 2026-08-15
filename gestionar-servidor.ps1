# ============================================================
#  gestionar-servidor.ps1 — Detecta, muestra y opcionalmente
#  detiene el servidor Node.js de PuntoX (server.js).
#
#  Uso:  powershell -ExecutionPolicy Bypass -File gestionar-servidor.ps1
#  Con argumento de matar sin preguntar:  ...gestionar-servidor.ps1 -Matar
# ============================================================

param(
  [switch]$Matar   # Si se pasa -Matar, detiene sin confirmar
)

$nombreProceso = "node"
$marca = "server.js"          # identifica al servidor de PuntoX en la línea de comando

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Detector del servidor Node.js de PuntoX" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Buscar procesos node.exe
$procesos = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue

if (-not $procesos) {
  Write-Host "No hay ningun proceso node.exe corriendo." -ForegroundColor Yellow
  Write-Host "El servidor de PuntoX NO esta activo." -ForegroundColor Green
  exit 0
}

# Separar los que son del servidor de PuntoX (server.js) de otros node
$servidor = $procesos | Where-Object { $_.CommandLine -like "*$marca*" }
$otros     = $procesos | Where-Object { $_.CommandLine -notlike "*$marca*" }

Write-Host "Procesos node.exe encontrados: $($procesos.Count)" -ForegroundColor White
Write-Host ""

if ($servidor) {
  Write-Host ">>> SERVICIO DE PUNTOX (server.js) DETECTADO <<<" -ForegroundColor Green
  Write-Host "------------------------------------------------" -ForegroundColor Green
  foreach ($p in $servidor) {
    Write-Host ("  PID: " + $p.ProcessId + "   Inicio: " + $p.CreationDate)
    Write-Host ("  Cmd:  " + $p.CommandLine)
    Write-Host ""
  }
} else {
  Write-Host "No se detecto el servidor de PuntoX (no hay proceso con 'server.js')." -ForegroundColor Yellow
}

if ($otros) {
  Write-Host "OTROS procesos node.exe (NO son PuntoX, no los toco):" -ForegroundColor DarkGray
  foreach ($p in $otros) {
    Write-Host ("  PID: " + $p.ProcessId + "  Cmd: " + $p.CommandLine) -ForegroundColor DarkGray
  }
  Write-Host ""
}

# ¿Matar?
if ($servidor) {
  if (-not $Matar) {
    $resp = Read-Host "¿Quieres detener el/los proceso(s) del servidor de PuntoX? (S/N)"
    if ($resp -notmatch '^[Ss]') {
      Write-Host "Operacion cancelada. El servidor sigue corriendo." -ForegroundColor Cyan
      exit 0
    }
  }
  foreach ($p in $servidor) {
    try {
      Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
      Write-Host ("Servidor PuntoX detenido (PID " + $p.ProcessId + ").") -ForegroundColor Green
    } catch {
      Write-Host ("No se pudo detener el PID " + $p.ProcessId + ": " + $_.Exception.Message) -ForegroundColor Red
    }
  }
} else {
  Write-Host "Nada que detener: el servidor de PuntoX no esta corriendo." -ForegroundColor Green
}

Write-Host ""
Write-Host "Listo." -ForegroundColor Cyan
