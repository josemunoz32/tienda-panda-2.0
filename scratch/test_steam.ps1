$steamDir = "C:\Program Files (x86)\Steam"
$files = @("dwmapi.dll", "dwmapi.dll.bak", "xinput1_4.dll", "OpenSteamTool.dll", "opensteamtool.toml", "winmm.dll", "winmm_real.dll")
foreach ($f in $files) {
    $p = Join-Path $steamDir $f
    if (Test-Path $p) {
        Remove-Item $p -Force -ErrorAction SilentlyContinue
        Write-Host "Removed: $f"
    }
}
Start-Process "$steamDir\steam.exe"
Start-Sleep -Seconds 6
Get-Process -Name "*steam*" -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, MainWindowTitle
