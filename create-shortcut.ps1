# ==========================================================
# CREATE SHORTCUT FOR SMART SIGNAGE
# ==========================================================
$ShortcutPath = "$env:USERPROFILE\Desktop\Smart Signage.lnk"
$TargetPath   = "powershell.exe"
$Args         = "-ExecutionPolicy Bypass -File `"C:\Users\johnm\Desktop\newproject\digital-signage\start-signage.ps1`""
$IconPath     = "C:\Users\johnm\Desktop\newproject\digital-signage\display-window\public\icon.ico"  # optional

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.Arguments  = $Args
$Shortcut.WorkingDirectory = "C:\Users\johnm\Desktop\newproject\digital-signage"
if (Test-Path $IconPath) { $Shortcut.IconLocation = $IconPath }
$Shortcut.Save()

Write-Host "✅ Shortcut created on Desktop: Smart Signage"
