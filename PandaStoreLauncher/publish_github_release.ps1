param(
    [string]$Version = "2.4.23",
    [string]$Notes = "Actualizaciones automaticas GitHub Releases, auto-reparacion de guardado y estabilidad general.",
    [string]$GitHubToken = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
Set-Location $scriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  PANDASTORE - PUBLICAR RELEASE EN GITHUB RELEASES        " -ForegroundColor Yellow
Write-Host "  Version: v$Version                                      " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Compilar y firmar todo usando publish.ps1
Write-Host "[1/3] Compilando y firmando ejecutables oficiales..." -ForegroundColor Cyan
& ".\publish.ps1"

$setupPath = "$scriptDir\Publish\PandaStoreSetup.exe"
$launcherPath = "$scriptDir\Publish\PandaStoreLauncher.exe"
$activatorPath = "$scriptDir\Publish\PandaStoreActivator.exe"

if (-not (Test-Path $setupPath)) {
    Write-Host "ERROR: No se encontro PandaStoreSetup.exe en Publish." -ForegroundColor Red
    exit 1
}

# 2. Crear y subir Tag en Git
Write-Host ""
Write-Host "[2/3] Creando Tag git v$Version..." -ForegroundColor Cyan
Set-Location "$scriptDir\.."

try {
    git tag -d "v$Version" 2>$null
    git push origin ":refs/tags/v$Version" 2>$null
} catch {}

git tag "v$Version"
git push origin "v$Version"

Write-Host "Tag v$Version enviado exitosamente a GitHub." -ForegroundColor Green

# 3. Crear Release en GitHub via API si hay token
if ($GitHubToken) {
    Write-Host ""
    Write-Host "[3/3] Subiendo assets a GitHub Releases con Token..." -ForegroundColor Cyan
    $headers = @{
        "Authorization" = "token $GitHubToken"
        "Accept"        = "application/vnd.github.v3+json"
        "User-Agent"    = "PandaStoreReleasePublisher"
    }

    $releaseBody = @{
        tag_name         = "v$Version"
        target_commitish = "main"
        name             = "PandaStore v$Version Oficial"
        body             = $Notes
        draft            = $false
        prerelease       = $false
    } | ConvertTo-Json

    $releaseUrl = "https://api.github.com/repos/josemunoz32/tienda-panda-2.0/releases"
    $rel = Invoke-RestMethod -Uri $releaseUrl -Method Post -Headers $headers -Body $releaseBody -ContentType "application/json"
    $uploadUrlBase = $rel.upload_url.Split('{')[0]

    # Subir PandaStoreSetup.exe
    $setupBytes = [System.IO.File]::ReadAllBytes($setupPath)
    $uploadSetupUrl = "$uploadUrlBase`?name=PandaStoreSetup.exe"
    Invoke-RestMethod -Uri $uploadSetupUrl -Method Post -Headers @{ "Authorization" = "token $GitHubToken"; "Content-Type" = "application/octet-stream"; "User-Agent" = "PandaStoreReleasePublisher" } -Body $setupBytes
    Write-Host "  PandaStoreSetup.exe subido a GitHub Release." -ForegroundColor Green

    # Subir PandaStoreActivator.exe si existe
    if (Test-Path $activatorPath) {
        $actBytes = [System.IO.File]::ReadAllBytes($activatorPath)
        $uploadActUrl = "$uploadUrlBase`?name=PandaStoreActivator.exe"
        Invoke-RestMethod -Uri $uploadActUrl -Method Post -Headers @{ "Authorization" = "token $GitHubToken"; "Content-Type" = "application/octet-stream"; "User-Agent" = "PandaStoreReleasePublisher" } -Body $actBytes
        Write-Host "  PandaStoreActivator.exe subido a GitHub Release." -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "[3/3] Tag creado en GitHub. Para publicar los archivos .exe:" -ForegroundColor Yellow
    Write-Host "1. Abre en tu navegador: https://github.com/josemunoz32/tienda-panda-2.0/releases/new?tag=v$Version" -ForegroundColor Cyan
    Write-Host "2. Arrastra y suelta el archivo: $setupPath" -ForegroundColor White
    Write-Host "3. Haz clic en 'Publish release'." -ForegroundColor Green
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " PROCESO COMPLETADO!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
