# ==============================================================================
# PandaStore - Validador Oficial de Activación Steam
# ==============================================================================
# Uso para el cliente:
#   $AppID='123456'; irm 'https://tiendapanda.com/PandaStoreValidator.ps1' | iex
# ==============================================================================

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host ""
Write-Host " ======================================================= " -ForegroundColor Magenta
Write-Host "         PANDASTORE - VALIDADOR OFICIAL STEAM            " -ForegroundColor White
Write-Host " ======================================================= " -ForegroundColor Magenta
Write-Host ""

if ((-not $PandaStoreInstallOnly) -and (-not $AppID -or [string]::IsNullOrWhiteSpace($AppID))) {
    $AppID = Read-Host "Ingresa el Steam AppID del juego"
}

# Funciones para detectar Steam y proteger el manifiesto
function Get-SteamPath {
    foreach ($k in @('HKCU:\Software\Valve\Steam',
                     'HKLM:\SOFTWARE\WOW6432Node\Valve\Steam',
                     'HKLM:\SOFTWARE\Valve\Steam')) {
        try {
            $item = Get-ItemProperty -Path $k -ErrorAction Stop
            foreach ($name in 'SteamPath', 'InstallPath') {
                if ($item.$name -and (Test-Path -LiteralPath $item.$name)) { return $item.$name }
            }
        }
        catch {}
    }
    return $null
}

function Get-SteamAppManifest {
    param([string]$AppID)
    $steam = Get-SteamPath
    if (-not $steam) { return $null }
    $roots = @((Join-Path $steam 'steamapps'))
    $vdf = Join-Path $steam 'steamapps\libraryfolders.vdf'
    if (Test-Path -LiteralPath $vdf) {
        foreach ($m in [regex]::Matches([System.IO.File]::ReadAllText($vdf), '"path"\s+"([^"]+)"')) {
            $roots += (Join-Path ($m.Groups[1].Value -replace '\\\\', '\') 'steamapps')
        }
    }
    foreach ($root in ($roots | Select-Object -Unique)) {
        $acf = Join-Path $root "appmanifest_$AppID.acf"
        if (Test-Path -LiteralPath $acf) { return $acf }
    }
    return $null
}

function Set-SteamUpdateLock {
    param([string]$AppID, [bool]$Lock = $true)
    if (-not $AppID -or [string]::IsNullOrWhiteSpace($AppID)) {
        return
    }
    $acf = Get-SteamAppManifest -AppID $AppID
    if (-not $acf) {
        Write-Host "[!] Archivo appmanifest_$AppID.acf no encontrado (comprueba que el juego este instalado en Steam)." -ForegroundColor Yellow
        return
    }
    try {
        $file = Get-Item -LiteralPath $acf
        if ($file.IsReadOnly) { $file.IsReadOnly = $false }

        $behavior = if ($Lock) { '1' } else { '0' }
        $text = [System.IO.File]::ReadAllText($acf)
        if ($text -match '"AutoUpdateBehavior"\s+"\d+"') {
            $text = [regex]::Replace($text, '("AutoUpdateBehavior"\s+")\d+(")', "`${1}$behavior`${2}")
        }
        else {
            $text = [regex]::Replace($text, '("appid"\s+"\d+"\s*\r?\n)',
                "`$1`t`"AutoUpdateBehavior`"`t`t`"$behavior`"`r`n", 1)
        }
        [System.IO.File]::WriteAllText($acf, $text, (New-Object System.Text.UTF8Encoding($false)))

        if ($Lock) {
            (Get-Item -LiteralPath $acf).IsReadOnly = $true
            Write-Host "[+] Actualizaciones bloqueadas para el juego $AppID." -ForegroundColor Green
            Write-Host "    El juego esta protegido en su version actual para asegurar la activacion." -ForegroundColor DarkGray
        }
        else {
            Write-Host "[+] Actualizaciones restablecidas para el juego $AppID." -ForegroundColor Green
        }
    }
    catch {
        Write-Host "[-] No se pudo modificar el bloqueo de actualizacion para $AppID : $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($PandaStoreAllowUpdates) {
    Set-SteamUpdateLock -AppID $AppID -Lock $false
    return
}
if ($PandaStoreLockOnly) {
    Set-SteamUpdateLock -AppID $AppID -Lock $true
    return
}

$tempRoot = Join-Path $env:TEMP "PandaStoreValidator"
$downloadsRoot = Join-Path ([Environment]::GetFolderPath("UserProfile")) "Downloads"
$installRoot = Join-Path $downloadsRoot "PandaStoreValidator"
$exePath = Join-Path $installRoot "PandaStoreValidator.exe"
$downloadPath = Join-Path $tempRoot "PandaStoreValidator.latest.exe"
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
New-Item -ItemType Directory -Force -Path $installRoot | Out-Null

$validatorUrl = "https://git.lua.tools/luatools-dedivision/LuaToolsValidator/releases/download/v1.0.1/LuaToolsValidator.exe"

$downloaded = $false
try {
    Write-Host "[*] Conectando con los componentes del Validador PandaStore..." -ForegroundColor Cyan
    $headers = @{ "Cache-Control" = "no-cache"; "Pragma" = "no-cache" }
    Invoke-WebRequest -Uri $validatorUrl -OutFile $downloadPath -UseBasicParsing -Headers $headers -TimeoutSec 25 -ErrorAction Stop
    if ((Test-Path -LiteralPath $downloadPath) -and ((Get-Item -LiteralPath $downloadPath).Length -gt 100KB)) {
        $downloaded = $true
    }
}
catch {
    Write-Host "[-] Error al descargar componente: $($_.Exception.Message)" -ForegroundColor Red
}

if (-not $downloaded) {
    Write-Host "[-] No se pudo descargar el Validador. Intenta nuevamente." -ForegroundColor Red
    exit 1
}

Get-Process -Name "PandaStoreValidator", "LuaToolsValidator" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Copy-Item -LiteralPath $downloadPath -Destination $exePath -Force

function Test-DotNet10DesktopRuntime {
    try {
        $runtimes = & dotnet --list-runtimes 2>$null
        return [bool]($runtimes | Where-Object { $_ -match '^Microsoft\.WindowsDesktop\.App\s+10\.' })
    }
    catch {
        return $false
    }
}

function Install-DotNet10DesktopRuntime {
    if (Test-DotNet10DesktopRuntime) {
        Write-Host "[+] Entorno .NET listo." -ForegroundColor Green
        return $true
    }

    Write-Host "[*] Instalando componente .NET necesario para la activacion..." -ForegroundColor Cyan
    try {
        $winget = Get-Command winget -ErrorAction SilentlyContinue
        if ($winget) {
            & winget install --id Microsoft.DotNet.DesktopRuntime.10 -e --accept-package-agreements --accept-source-agreements --silent
        }
    }
    catch {}

    return (Test-DotNet10DesktopRuntime)
}

Install-DotNet10DesktopRuntime | Out-Null

if ($PandaStoreInstallOnly) {
    Write-Host "[+] Iniciando Validador PandaStore..." -ForegroundColor Green
    Start-Process -FilePath $exePath
}
else {
    Write-Host "[+] Iniciando Validador PandaStore para AppID $AppID..." -ForegroundColor Green
    Start-Process -FilePath $exePath -ArgumentList @("--appid", "$AppID", "--autorun")

    if (-not $PandaStoreNoLock) {
        Set-SteamUpdateLock -AppID $AppID -Lock $true
    }
}
