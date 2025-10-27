' launch-signage.vbs
Dim shell
Set shell = CreateObject("WScript.Shell")

' Path to your PowerShell script
scriptPath = "C:\Users\johnm\Desktop\newproject\digital-signage\start-signage.ps1"

' Run PowerShell silently (hidden window)
shell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & scriptPath & """", 0, False

Set shell = Nothing
