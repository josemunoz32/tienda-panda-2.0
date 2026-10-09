$scriptDir = "c:\Users\Usuario\proyectopandastore20\PandaStoreLauncher"
Set-Location $scriptDir

Stop-Process -Name PandaStoreSetup*, PandaStoreLauncher, PandaChecker -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Building PandaStore Launcher Single File " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

$dotnetCmd = "dotnet"
if (Test-Path "C:\Program Files\dotnet\dotnet.exe") {
    $dotnetCmd = "C:\Program Files\dotnet\dotnet.exe"
}

& $dotnetCmd publish PandaStoreLauncher.csproj -c Release -r win-x64 --self-contained true -o "$scriptDir\Publish"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Error de compilacion en PandaStoreLauncher." -ForegroundColor Red
    exit 1
}

Write-Host " Compilando PandaChecker (Background Enforcer)..." -ForegroundColor Yellow
& $dotnetCmd publish PandaChecker\PandaChecker.csproj -c Release -r win-x64 --self-contained true -o "$scriptDir\Publish"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Error de compilacion en PandaChecker." -ForegroundColor Red
    exit 1
}

$exePath = "$scriptDir\Publish\PandaStoreLauncher.exe"
$checkerExePath = "$scriptDir\Publish\PandaChecker.exe"
$activatorCandidates = @(
    "$scriptDir\..\PandaStoreActivator.exe",
    "$scriptDir\..\public\downloads\PandaStoreActivator.exe",
    "$scriptDir\tools\PandaStoreActivator.exe",
    "$scriptDir\..\scratch\tokeerdrm\tokeerdrm-app\dist\PandaStoreActivator.exe"
)
$activatorSrc = $activatorCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
$activatorPublishPath = "$scriptDir\Publish\PandaStoreActivator.exe"
$toolsDir = "$scriptDir\tools"

if ($activatorSrc) {
    if (-not (Test-Path $toolsDir)) { New-Item -ItemType Directory -Path $toolsDir | Out-Null }
    Copy-Item $activatorSrc -Destination $activatorPublishPath -Force
    Copy-Item $activatorSrc -Destination "$toolsDir\PandaStoreActivator.exe" -Force
    Write-Host " PandaStoreActivator copiado a Publish y tools desde $activatorSrc." -ForegroundColor Green
} else {
    Write-Host " [!] ADVERTENCIA: No se encontro PandaStoreActivator.exe en los directorios examinados." -ForegroundColor Yellow
}

# Copiar catalogo de juegos a Publish para carga instantanea offline (0.05s) en clientes
$catalogCandidates = @(
    "$env:APPDATA\PandaStore\cache_games_ryuu_v3.json",
    "$scriptDir\cache_games_ryuu_v3.json"
)
$catalogSrc = $catalogCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($catalogSrc) {
    Copy-Item $catalogSrc -Destination "$scriptDir\Publish\cache_games_ryuu_v3.json" -Force
    Write-Host " Catalogo de juegos (cache_games_ryuu_v3.json) copiado a Publish para arranque ultra rapido." -ForegroundColor Green
}
Write-Host "[1/4] Aplicando Firma Digital de Seguridad (Authenticode Code Signing)..." -ForegroundColor Cyan

$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -like "*PandaStore*" } | Select-Object -First 1
if (-not $cert) {
    Write-Host "      Creando certificado digital 'PandaStore Official Code Signing'..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=PandaStore Official Code Signing" -CertStoreLocation Cert:\CurrentUser\My -NotAfter (Get-Date).AddYears(5)
}

$store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
$store.Open("ReadWrite")
$store.Add($cert)
$store.Close()

Set-AuthenticodeSignature -FilePath $exePath -Certificate $cert | Out-Null
if (Test-Path $checkerExePath) {
    Set-AuthenticodeSignature -FilePath $checkerExePath -Certificate $cert | Out-Null
}
if (Test-Path $activatorPublishPath) {
    Set-AuthenticodeSignature -FilePath $activatorPublishPath -Certificate $cert | Out-Null
}
Write-Host "      Firma digital aplicada exitosamente a PandaStoreLauncher.exe, PandaChecker.exe y PandaStoreActivator.exe." -ForegroundColor Green

$publicSrcDir = "$scriptDir\..\public\downloads"
$publicBuildDir = "$scriptDir\..\build\downloads"

if (-not (Test-Path $publicSrcDir)) { New-Item -ItemType Directory -Path $publicSrcDir | Out-Null }
if (-not (Test-Path $publicBuildDir)) { New-Item -ItemType Directory -Path $publicBuildDir | Out-Null }

Copy-Item $exePath -Destination "$publicSrcDir\PandaStoreLauncher.exe" -Force
Copy-Item $exePath -Destination "$publicBuildDir\PandaStoreLauncher.exe" -Force
if (Test-Path $activatorPublishPath) {
    Copy-Item $activatorPublishPath -Destination "$publicSrcDir\PandaStoreActivator.exe" -Force
    Copy-Item $activatorPublishPath -Destination "$publicBuildDir\PandaStoreActivator.exe" -Force
}
Write-Host ""
Write-Host "[2/4] Copiado EXE a carpeta publica de la Web: $publicSrcDir\PandaStoreLauncher.exe" -ForegroundColor Green

Write-Host ""
Write-Host "[3/4] Generando instalador Setup con Inno Setup..." -ForegroundColor Cyan

$isccPath = "$env:LOCALAPPDATA\Programs\Inno Setup 7\ISCC.exe"
if (-not (Test-Path $isccPath)) {
    $isccPath = "C:\Users\Usuario\AppData\Local\Programs\Inno Setup 7\ISCC.exe"
}

$issFile = "$scriptDir\PandaStoreSetup.iss"
if (Test-Path $isccPath) {
    & $isccPath $issFile
} else {
    Write-Host "[!] No se encontro ISCC.exe en $isccPath" -ForegroundColor Red
}

$setupPath = "$scriptDir\Publish\PandaStoreSetup.exe"

if (Test-Path $setupPath) {
    Write-Host ""
    Write-Host "[4/4] Copiando y firmando el Setup Instalador..." -ForegroundColor Cyan

    Set-AuthenticodeSignature -FilePath $setupPath -Certificate $cert | Out-Null
    Copy-Item $setupPath -Destination "$publicSrcDir\PandaStoreSetup.exe" -Force
    Copy-Item $setupPath -Destination "$publicBuildDir\PandaStoreSetup.exe" -Force
    Copy-Item $setupPath -Destination "$publicSrcDir\PandaStoreDeckSetup.exe" -Force
    Copy-Item $setupPath -Destination "$publicBuildDir\PandaStoreDeckSetup.exe" -Force
    Write-Host "      Setup copiado a public y build: $publicSrcDir\PandaStoreSetup.exe y PandaStoreDeckSetup.exe" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " COMPILACION Y FIRMA DIGITAL EXITOSA!" -ForegroundColor Green
Write-Host " Output EXE: $exePath" -ForegroundColor Yellow
Write-Host " Output Setup: $setupPath" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Green
