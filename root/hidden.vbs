' Launch a command with no window, no taskbar icon, fully detached.
'
' run.bat needs this for three reasons:
'   * `start "" /min` leaves a node icon in the taskbar for every server.
'   * `start /b` hides the window but ties the child to run.bat's console,
'     and localtunnel dies a second after printing its URL that way - which
'     is why the public link used to answer 503 for everyone.
'   * this launches properly detached, so it survives and stays unseen.
'
' Arguments, each a single plain quoted string so run.bat never has to nest
' quotes inside quotes (that is what silently broke the previous version):
'   0  command, relative to the working directory   e.g. "node dist\main.js"
'   1  working directory                            optional
'   2  log file for stdout + stderr                 optional
Option Explicit

Dim sh, cmd
Set sh = CreateObject("WScript.Shell")

If WScript.Arguments.Count > 1 Then
  If Len(WScript.Arguments(1)) > 0 Then sh.CurrentDirectory = WScript.Arguments(1)
End If

cmd = WScript.Arguments(0)

If WScript.Arguments.Count > 2 Then
  If Len(WScript.Arguments(2)) > 0 Then
    cmd = "cmd /c " & cmd & " > """ & WScript.Arguments(2) & """ 2>&1"
  End If
End If

sh.Run cmd, 0, False
