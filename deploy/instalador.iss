; Instalador de PuntoX para Windows
; Requiere Inno Setup (https://jrsoftware.org/isinfo.php)
; Compilar: compilar este archivo con Inno Setup.
; Resultado: Instalador PuntoX.exe (instala/desinstala la app como cualquier programa).
;
; ANTES DE COMPILAR:
;   1. node\  → Node.js portable (se genera con:  descargar node-v22-win-x64.zip y descomprimir en deploy\node\)
;   2. database_limpia.db  → BD limpia (se genera con:  npm run db:limpia)
;   3. icono.ico → icono de los accesos directos (se genera con:  node deploy/regenerar_icono.js)

#define MyAppName "PuntoX"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Heriberto Alfonso"
#define MyAppURL "https://github.com/halfonsog/pos-app"

[Setup]
AppId={{F0B3B0A1-9E31-4C2A-B6F2-0D8E4C9A7B00}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\PuntoX
DefaultGroupName=PuntoX
OutputBaseFilename=Instalador PuntoX
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin

; ── Metadatos profesionales del instalador (ver "Detalles" en el .exe) ──
VersionInfoVersion=1.0.0.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} - Sistema de Gestion para Punto de Venta
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}
VersionInfoCopyright=Copyright (C) 2026 {#MyAppPublisher}
AppCopyright=Copyright (C) 2026 {#MyAppPublisher}

; App en Program Files (solo lectura para usuarios normales → fuente protegida).
; DATOS en C:\ProgramData\PuntoX (escritura permitida).

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear accesos directos en el escritorio"; GroupDescription: "Accesos directos:"

[Files]
; Node.js portable (descomprimir node-v22-win-x64 en deploy\node\ antes de compilar)
Source: "node\*"; DestDir: "{app}\node"; Flags: recursesubdirs createallsubdirs
; Ficheros de la app
Source: "..\server.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\src\backend\*"; DestDir: "{app}\src\backend"; Flags: recursesubdirs createallsubdirs
Source: "..\src\frontend\*"; DestDir: "{app}\src\frontend"; Flags: recursesubdirs createallsubdirs
; node_modules (dependencias ya instaladas, incluye binarios nativos)
Source: "..\node_modules\*"; DestDir: "{app}\node_modules"; Flags: recursesubdirs createallsubdirs skipifsourcedoesntexist
; Lanzadores (wscript.exe explícito) + icono
Source: "Iniciar PuntoX.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "Terminar PuntoX.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "icono.ico"; DestDir: "{app}"; Flags: ignoreversion
; BD limpia (sin datos de prueba) → ProgramData\PuntoX
Source: "database_limpia.db"; DestDir: "{commonappdata}\PuntoX"; DestName: "database.db"; Flags: onlyifdoesntexist

; Lanzar los .vbs con wscript.exe explícito (evita error 193 si falta la asociación)
#define VbsRun "wscript.exe"

[Icons]
Name: "{group}\Iniciar PuntoX"; Filename: "{sys}\{#VbsRun}"; Parameters: """{app}\Iniciar PuntoX.vbs"""; IconFilename: "{app}\icono.ico"
Name: "{group}\Terminar PuntoX"; Filename: "{sys}\{#VbsRun}"; Parameters: """{app}\Terminar PuntoX.vbs"""; IconFilename: "{app}\icono.ico"
Name: "{autodesktop}\Iniciar PuntoX"; Filename: "{sys}\{#VbsRun}"; Parameters: """{app}\Iniciar PuntoX.vbs"""; IconFilename: "{app}\icono.ico"; Tasks: desktopicon
Name: "{autodesktop}\Terminar PuntoX"; Filename: "{sys}\{#VbsRun}"; Parameters: """{app}\Terminar PuntoX.vbs"""; IconFilename: "{app}\icono.ico"; Tasks: desktopicon

[Run]
Filename: "{sys}\{#VbsRun}"; Parameters: """{app}\Iniciar PuntoX.vbs"""; Description: "Iniciar PuntoX ahora"; Flags: nowait postinstall skipifsilent

; Al desinstalar NO se borra ProgramData (BD y fotos del usuario se conservan).
