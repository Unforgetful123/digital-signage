Start-Transcript -Path "$PSScriptRoot\signage-launch.log" -Append
# ==========================================================
# SMART DIGITAL SIGNAGE - ONE CLICK LAUNCHER
# ==========================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "SilentlyContinue"

# --- SETTINGS ---
$AppName        = "Smart Digital Signage"
$Browser        = "C:\Program Files\Google\Chrome\Application\chrome.exe"   # or use msedge.exe
$BasePath       = "C:\Users\johnm\Desktop\newproject\digital-signage"
$PocketBaseExe  = "$BasePath\pocketbase.exe"
$ServerFile     = "$BasePath\server\server.js"
$DisplayFolder  = "$BasePath\display-window"
$AdminFolder    = "$BasePath\admin-panel"
$Ports          = @{ PB=8090; Server=4000; Display=3000; Admin=5173 }

# --- Helper: Wait for port ---
function Wait-Port {
    param([int]$Port,[int]$Retry=20,[int]$Delay=2)
    for ($i=1; $i -le $Retry; $i++) {
        if (Test-NetConnection 127.0.0.1 -Port $Port -InformationLevel Quiet) {
            Write-Host "✅ Port $Port active"
            return
        }
        Write-Host "⏳ Waiting for port $Port... ($i/$Retry)"
        Start-Sleep -Seconds $Delay
    }
}

# --- 1️⃣ Stop old tasks ---
Write-Host "Cleaning up old Node/PocketBase processes..."
Get-Process pocketbase,node,npm,vite -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2

# --- 2️⃣ Start PocketBase ---
if (Test-Path $PocketBaseExe) {
    Write-Host "Starting PocketBase..."
    Start-Process $PocketBaseExe -ArgumentList "serve --http=0.0.0.0:$($Ports.PB)" -WorkingDirectory $BasePath -WindowStyle Hidden
    Wait-Port $Ports.PB
}

# --- 3️⃣ Start Node server ---
if (Test-Path $ServerFile) {
    Write-Host "Starting Socket server..."
    Start-Process "node.exe" -ArgumentList "`"$ServerFile`"" -WorkingDirectory (Split-Path $ServerFile) -WindowStyle Hidden
    Wait-Port $Ports.Server
}

# --- 4️⃣ Start Display Window (Vite @3000) ---
if (Test-Path "$DisplayFolder\package.json") {
    Write-Host "Starting Display Window..."
    Start-Process "npm.cmd" -ArgumentList "run dev -- --host --port $($Ports.Display)" -WorkingDirectory $DisplayFolder -WindowStyle Hidden
    Wait-Port $Ports.Display
}

# --- 5️⃣ Start Admin Panel (Vite @5173) ---
if (Test-Path "$AdminFolder\package.json") {
    Write-Host "Starting Admin Panel..."
    Start-Process "npm.cmd" -ArgumentList "run dev -- --host --port $($Ports.Admin)" -WorkingDirectory $AdminFolder -WindowStyle Hidden
    Wait-Port $Ports.Admin
}

# --- 6️⃣ Launch Browser Tabs ---
$AppURL   = "http://127.0.0.1:$($Ports.Display)"
$AdminURL = "http://127.0.0.1:$($Ports.Admin)"
Write-Host "Opening Chrome windows..."
if (Test-Path $Browser) {
    Start-Process $Browser "--kiosk --app=$AppURL"
    Start-Process $Browser "--window-size=1200,800 --app=$AdminURL"
} else {
    Write-Host "Chrome not found, opening in default browser..."
    Start-Process $AppURL
    Start-Process $AdminURL
}

Write-Host "`n🎯 $AppName launched successfully!"
Write-Host "---------------------------------------------"
Write-Host "PocketBase:  http://127.0.0.1:$($Ports.PB)"
Write-Host "Server:      ws://127.0.0.1:$($Ports.Server)"
Write-Host "Display:     $AppURL"
Write-Host "Admin:       $AdminURL"
Write-Host "---------------------------------------------"
