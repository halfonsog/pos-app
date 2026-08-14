; Instalador de POS3 para Windows
; Requiere Inno Setup (https://jrsoftware.org/isinfo.php)
; Compilar: compilar este archivo con Inno Setup.
; Resultado: Instalador POS.exe (instala/desinstala la app como cualquier programa).

#define MyAppName "POS"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Heriberto Alfonso"
#define MyAppExeName "Abrir POS.vbs"

[Setup]
AppId={{F0B3B0A1-9E31-4C2A-B6F2-0D8E4C9A7B00}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\POS3
DefaultGroupName=POS
OutputBaseFilename=Instalador POS
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
; App en Program Files (solo lectura para usuarios normales → fuente protegida).
; DATOS en C:\ProgramData\POS3 (escritura permitida).

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
; Lanzadores
Source: "Abrir POS.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "Cerrar POS.vbs"; DestDir: "{app}"; Flags: ignoreversion
; Datos iniciales (BD y carpeta de uploads) → ProgramData, solo si no existen
Source: "..\database\database.db"; DestDir: "{commondata}\POS3"; Flags: onlyifdoesntexist
Source: "..\src\frontend\uploads\productos\*"; DestDir: "{commondata}\POS3\uploads"; Flags: onlyifdoesntexist

[Icons]
Name: "{group}\Abrir POS"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Cerrar POS"; Filename: "{app}\Cerrar POS.vbs"
Name: "{autodesktop}\Abrir POS"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{autodesktop}\Cerrar POS"; Filename: "{app}\Cerrar POS.vbs"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Iniciar POS ahora"; Flags: nowait postinstall skipifsilent

; Al desinstalar NO se borra ProgramData (BD y fotos del usuario se conservan).
