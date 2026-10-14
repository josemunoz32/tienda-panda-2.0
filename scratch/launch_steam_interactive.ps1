$action = New-ScheduledTaskAction -Execute "C:\Program Files (x86)\Steam\steam.exe" -WorkingDirectory "C:\Program Files (x86)\Steam"
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive
$task = Register-ScheduledTask -TaskName "LaunchSteamUI" -Action $action -Principal $principal -Force
Start-ScheduledTask -TaskName "LaunchSteamUI"
Start-Sleep -Seconds 3
Unregister-ScheduledTask -TaskName "LaunchSteamUI" -Confirm:$false
Write-Host "Steam launched interactively!"
