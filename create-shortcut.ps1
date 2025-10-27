# ==========================================================
# CREATE DESKTOP SHORTCUT FOR SMART DIGITAL SIGNAGE
# ==========================================================
$ShortcutPath = "$env:USERPROFILE\Desktop\Smart Digital Signage.lnk"
$TargetPath   = "powershell.exe"
$Args         = "-ExecutionPolicy Bypass -File `"C:\Users\johnm\Desktop\newproject\digital-signage\start-signage.ps1`""
$IconPath     = "C:\Users\johnm\Desktop\newproject\digital-signage\display-window\public\icon1.ico"  # optional custom icon

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.Arguments  = $Args
$Shortcut.WorkingDirectory = "C:\Users\johnm\Desktop\newproject\digital-signage"
if (Test-Path $IconPath) { $Shortcut.IconLocation = $IconPath }
else { $Shortcut.IconLocation = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" }
$Shortcut.Save()

Write-Host "✅ Desktop shortcut created: Smart Digital Signage"
