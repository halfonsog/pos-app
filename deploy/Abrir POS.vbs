' Abre POS: arranca el servidor Node oculto y abre el navegador.
' Se instala en C:\Program Files\POS3\ (solo lectura); los datos en ProgramData.

Dim fso, sh, http, nodeExe, serverJs, dbPath, uploadsDir, appData, cwd
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

' Directorio de la instalación (donde está este .vbs)
cwd = fso.GetParentFolderName(WScript.ScriptFullName)

nodeExe = cwd & "\node\node.exe"
serverJs = cwd & "\server.js"
appData = "C:\ProgramData\POS3"
dbPath = appData & "\database.db"
uploadsDir = appData & "\uploads"

' Asegurar que existe el directorio de datos
If Not fso.FolderExists(appData) Then fso.CreateFolder(appData)
If Not fso.FolderExists(uploadsDir) Then fso.CreateFolder(uploadsDir)

' Si el servidor ya está corriendo, solo abrir el navegador
If ServidorCorriendo() Then
  AbrirNavegador
  WScript.Quit 0
End If

' Iniciar el servidor OCULTO (ventana de consola invisible)
sh.Environment("Process")("DB_PATH") = dbPath
sh.Environment("Process")("UPLOADS_DIR") = uploadsDir
sh.Run """" & nodeExe & """ """ & serverJs & """", 0, False

' Esperar a que el servidor arranque (máx. ~15 s) y abrir el navegador
Dim i
For i = 0 To 30
  If ServidorEscuchando() Then Exit For
  WScript.Sleep 500
Next

AbrirNavegador

' ── Funciones auxiliares ──

Function ServidorCorriendo()
  Dim wmi, proc, found
  found = False
  On Error Resume Next
  Set wmi = GetObject("winmgmts:\\.\root\cimv2")
  For Each proc In wmi.ExecQuery("SELECT CommandLine FROM Win32_Process WHERE Name='node.exe'")
    If InStr(proc.CommandLine, "server.js") > 0 Then found = True
  Next
  On Error GoTo 0
  ServidorCorriendo = found
End Function

Function ServidorEscuchando()
  Dim ok
  ok = False
  On Error Resume Next
  Set http = CreateObject("MSXML2.XMLHTTP")
  http.Open "GET", "http://localhost:3000", False
  http.Send
  If http.Status = 200 Then ok = True
  On Error GoTo 0
  ServidorEscuchando = ok
End Function

Sub AbrirNavegador()
  On Error Resume Next
  sh.Run "http://localhost:3000", 1, False
  On Error GoTo 0
End Sub
