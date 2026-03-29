$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $repoRoot 'vams-backend'
$frontendPath = Join-Path $repoRoot 'vams-frontend'
$pythonExe = 'C:/Users/hp/AppData/Local/Programs/Python/Python312/python.exe'
$dbUrl = "sqlite:///$backendPath/test.db"

function Test-BackendHealth {
    try {
        $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8001/health' -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

function Test-FrontendHealth {
    try {
        $response = Invoke-WebRequest -Uri 'http://127.0.0.1:5173' -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            return $true
        }
    }
    catch {
        # try localhost next
    }

    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

Write-Host 'Preparing VAMS local data...'
Push-Location $backendPath
$env:DATABASE_URL = $dbUrl
$env:OPERATOR_API_KEY = 'dev-operator-key'
& $pythonExe -m app.db.seed_demo_data
Pop-Location

if (-not (Test-BackendHealth)) {
    Write-Host 'Starting backend on port 8001...'
    $backendCmd = "Push-Location '$backendPath'; `$env:DATABASE_URL='$dbUrl'; `$env:OPERATOR_API_KEY='dev-operator-key'; & '$pythonExe' -m uvicorn app.main:app --port 8001"
    Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit', '-Command', $backendCmd | Out-Null

    $started = $false
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Milliseconds 500
        if (Test-BackendHealth) {
            $started = $true
            break
        }
    }

    if (-not $started) {
        Write-Host 'Backend did not become healthy on port 8001.' -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host 'Backend already running on port 8001.'
}

if (-not (Test-FrontendHealth)) {
    Write-Host 'Starting web frontend on port 5173...'
    $frontendCmd = "Push-Location '$frontendPath'; npm run dev"
    Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit', '-Command', $frontendCmd | Out-Null

    $frontendStarted = $false
    for ($i = 0; $i -lt 120; $i++) {
        Start-Sleep -Milliseconds 500
        if (Test-FrontendHealth) {
            $frontendStarted = $true
            break
        }
    }

    if (-not $frontendStarted) {
        Write-Host 'Frontend did not become healthy on port 5173.' -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host 'Web frontend already running on port 5173.'
}

# Ensure user gets the latest desktop window from current code.
Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host 'Starting VAMS Desktop (Electron Dev using live web frontend)...'
$electronCmd = "Push-Location '$frontendPath'; npm run electron:dev"
Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit', '-Command', $electronCmd | Out-Null

Write-Host 'VAMS Desktop launch complete.' -ForegroundColor Green
Write-Host 'Backend: http://127.0.0.1:8001'
Write-Host 'Web Frontend: http://127.0.0.1:5173'
Write-Host 'Installer: vams-frontend/release/latest/VAMS Setup.exe'
