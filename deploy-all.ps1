Set-Location $PSScriptRoot

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  PandaStore - Deploy Completo" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan

# PASO 1: Compilar Launcher + Setup
Write-Host "[1/4] Compilando Launcher..." -ForegroundColor Cyan
& "$PSScriptRoot\PandaStoreLauncher\publish.ps1"
if ($LASTEXITCODE -ne 0) { Write-Host "[!] Error compilando launcher." -ForegroundColor Red; exit 1 }

# PASO 2: Build web
Write-Host "[2/4] Compilando web React..." -ForegroundColor Cyan
npm run build 2>&1 | Select-Object -Last 3
if ($LASTEXITCODE -ne 0) { Write-Host "[!] Error build web." -ForegroundColor Red; exit 1 }

# PASO 3: Re-copiar binarios (npm build borra build/)
Write-Host "[3/4] Copiando binarios a build/downloads/..." -ForegroundColor Cyan
$dir = "$PSScriptRoot\build\downloads"
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
Copy-Item "$PSScriptRoot\PandaStoreLauncher\Publish\PandaStoreLauncher.exe" "$dir\PandaStoreLauncher.exe" -Force
Copy-Item "$PSScriptRoot\PandaStoreLauncher\Publish\PandaStoreSetup.exe" "$dir\PandaStoreSetup.exe" -Force
Write-Host "    Binarios copiados OK" -ForegroundColor Green

# PASO 4: Deploy Firebase
Write-Host "[4/4] Deploy Firebase Hosting..." -ForegroundColor Cyan
firebase deploy --only hosting

Write-Host "DEPLOY COMPLETO! -> https://pandastoreupdate.web.app" -ForegroundColor Green
