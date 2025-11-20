# ==========================================================
# CREATE DESKTOP SHORTCUT FOR SMART DIGITAL SIGNAGE
# ==========================================================
$ShortcutPath = "$env:USERPROFILE\Desktop\Smart Digital Signage.lnk"
$TargetPath   = "powershell.exe"
$Args         = "-ExecutionPolicy Bypass -File `"$BasePath\start-signage.ps1`""
$IconPath     = "$BasePath\display-window\public\icon1.ico"  # optional custom icon

if (-not $BasePath) {
    # If this script is run for the first time before the dynamic path is fully set,
    # you might need a temporary hardcoded path OR ensure $BasePath is defined first.
    # Assuming $BasePath is defined by the script location above:
}

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.Arguments  = $Args
$Shortcut.WorkingDirectory = $BasePath
if (Test-Path $IconPath) { $Shortcut.IconLocation = $IconPath }
else { $Shortcut.IconLocation = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" }
$Shortcut.Save()

Write-Host "✅ Desktop shortcut created: Smart Digital Signage"
