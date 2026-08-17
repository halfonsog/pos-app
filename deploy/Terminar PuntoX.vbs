' Termina PuntoX: detiene el servidor Node de la app (sin tocar otros procesos Node).
' Busca el proceso node.exe cuya línea de comando contiene "server.js" del PuntoX.

Dim sh, wmi, proc, matado
Set sh = CreateObject("WScript.Shell")

matado = False
On Error Resume Next
Set wmi = GetObject("winmgmts:\\.\root\cimv2")
For Each proc In wmi.ExecQuery("SELECT ProcessId, CommandLine FROM Win32_Process WHERE Name='node.exe'")
  If InStr(proc.CommandLine, "server.js") > 0 Then
    wmi.Get("Win32_Process.Handle='" & proc.ProcessId & "'").Terminate
    matado = True
  End If
Next
On Error GoTo 0

If matado Then
  MsgBox "PuntoX se cerró correctamente.", vbInformation, "PuntoX"
Else
  MsgBox "No había ningún servidor PuntoX corriendo.", vbInformation, "PuntoX"
End If
