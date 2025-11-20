# ==========================================================
# SMART DIGITAL SIGNAGE - ONE CLICK LAUNCHER (Final Version)
# ==========================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "SilentlyContinue"

# === SETTINGS ===
$AppName       = "Smart Digital Signage"
$BasePath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BrowserChoice = "edge"    # Change to "chrome" or "edge"

# --- Dynamic IP Resolution ---
# Finds the primary IP address (excluding loopback and non-connected adapters)
try {
    # Get the primary IPV4 address that isn't loopback (127.0.0.1)
    $LocalIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
        $_.InterfaceAlias -notlike "Loopback*" -and $_.IPAddress -notlike "169.254.*" 
    }).IPAddress | Select-Object -First 1
    
} catch {
    $LocalIP = "127.0.0.1"
    Write-Host "❌ Error determining local IP. Falling back to $LocalIP."
}

# --- Paths ---
$PocketBaseExe = "$BasePath\pocketbase.exe"
$ServerFile    = "$BasePath\server\server.js"
$DisplayFolder = "$BasePath\display-window"
$AdminFolder   = "$BasePath\admin-panel"

# --- Ports ---
$Ports = @{
    PB      = 8090
    Server  = 4000
    Display = 3000
    Admin   = 5173
}

# === DETERMINE BROWSER PATH ===
switch ($BrowserChoice) {
    "edge"   { $BrowserPath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" }
    "chrome" { $BrowserPath = "C:\Program Files\Google\Chrome\Application\chrome.exe" }
    default  { $BrowserPath = $null }
}

# === LOGGING ===
Start-Transcript -Path "$BasePath\signage-launch.log" -Append | Out-Null

Write-Host "`n🚀 Launching $AppName..."
Write-Host "---------------------------------------------"

# === HELPER: WAIT FOR PORT ===
function Wait-Port {
    param([int]$Port,[int]$Retry=25,[int]$Delay=2)
    for ($i=1; $i -le $Retry; $i++) {
        if (Test-NetConnection 127.0.0.1 -Port $Port -InformationLevel Quiet) {
            Write-Host "✅ Port $Port active"
            return
        }
        Write-Host "⏳ Waiting for port $Port... ($i/$Retry)"
        Start-Sleep -Seconds $Delay
    }
    Write-Host "❌ Port $Port did not open in time."
}

# === STEP 1: CLEANUP OLD TASKS ===
Write-Host "Cleaning up old Node/PocketBase processes..."
Get-Process pocketbase,node,npm,vite -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2

# === STEP 2: START POCKETBASE ===
if (Test-Path $PocketBaseExe) {
    Write-Host "▶ Starting PocketBase..."
    Start-Process $PocketBaseExe -ArgumentList "serve --http=0.0.0.0:$($Ports.PB)" -WorkingDirectory $BasePath -WindowStyle Hidden
    Wait-Port $Ports.PB
} else { Write-Host "⚠️ PocketBase not found at $PocketBaseExe" }

# === STEP 3: START SOCKET SERVER ===
if (Test-Path $ServerFile) {
    Write-Host "▶ Starting Socket.IO Server..."
    Start-Process "node.exe" -ArgumentList "`"$ServerFile`"" -WorkingDirectory (Split-Path $ServerFile) -WindowStyle Hidden
    Wait-Port $Ports.Server
} else { Write-Host "⚠️ server.js not found" }

# === STEP 4: START DISPLAY (VITE) ===
if (Test-Path "$DisplayFolder\package.json") {
    Write-Host "▶ Starting Display Window..."
    Start-Process "npm.cmd" -ArgumentList "run dev -- --host --port $($Ports.Display)" -WorkingDirectory $DisplayFolder -WindowStyle Hidden
    Wait-Port $Ports.Display
} else { Write-Host "⚠️ display-window missing package.json" }

# === STEP 5: START ADMIN PANEL ===
if (Test-Path "$AdminFolder\package.json") {
    Write-Host "▶ Starting Admin Panel..."
    Start-Process "npm.cmd" -ArgumentList "run dev -- --host --port $($Ports.Admin)" -WorkingDirectory $AdminFolder -WindowStyle Hidden
    Wait-Port $Ports.Admin
} else { Write-Host "⚠️ admin-panel missing package.json" }

# === STEP 6: LAUNCH IN BROWSER ===
# Line 104
$AppURL = "http://${LocalIP}:$($Ports.Display)" 
# Line 105
$AdminURL = "http://${LocalIP}:$($Ports.Admin)"

Write-Host "`n🌐 Opening Browser (Target IP: $LocalIP)..."
if (Test-Path $BrowserPath) {
    # Display window in kiosk mode
    $DisplayArgs = "--start-fullscreen --kiosk --autoplay-policy=no-user-gesture-required --noerrdialogs --disable-infobars --disable-session-crashed-bubble --disable-component-update --app=$AppURL"
    Start-Process -FilePath $BrowserPath -ArgumentList $DisplayArgs
    Write-Host "✅ Display window launched in fullscreen mode."
    Write-Host "👉 Access admin panel manually at: $AdminURL"

} else {
    Write-Host "⚠️ Browser not found; opening in default browser..."
    Start-Process $AppURL
    Write-Host "👉 Admin panel available at: $AdminURL"
}

Write-Host "`n✅ $AppName launched successfully!"
Write-Host "---------------------------------------------"
Write-Host "PocketBase:  http://127.0.0.1:$($Ports.PB)"
Write-Host "Server: ws://${LocalIP}:$($Ports.Server)"
Write-Host "Display:     $AppURL"
Write-Host "Admin:       $AdminURL"
Write-Host "---------------------------------------------"

Stop-Transcript | Out-Null
