import shutil
import os
import subprocess
import time

steam_dir = r"C:\Program Files (x86)\Steam"
src_dwmapi = r"C:\Users\Usuario\proyectopandastore20\PandaStoreLauncher\Resources\Injector\dwmapi.dll"
src_ost = r"C:\Users\Usuario\proyectopandastore20\PandaStoreLauncher\Resources\Injector\OpenSteamTool.dll"
src_toml = r"C:\Users\Usuario\proyectopandastore20\PandaStoreLauncher\Resources\Injector\opensteamtool.toml"

# Remove all injector dlls
for f in ["dwmapi.dll", "dwmapi.dll.bak", "xinput1_4.dll", "OpenSteamTool.dll", "opensteamtool.toml", "winmm.dll"]:
    p = os.path.join(steam_dir, f)
    if os.path.exists(p):
        os.remove(p)

# Copy ONLY dwmapi.dll, OpenSteamTool.dll, and opensteamtool.toml
shutil.copy2(src_dwmapi, os.path.join(steam_dir, "dwmapi.dll"))
shutil.copy2(src_ost, os.path.join(steam_dir, "OpenSteamTool.dll"))
shutil.copy2(src_toml, os.path.join(steam_dir, "opensteamtool.toml"))

print("Starting Steam with only dwmapi.dll...")
p = subprocess.Popen([os.path.join(steam_dir, "steam.exe")])
time.sleep(5)

# Check if steam is running
proc = subprocess.run(["tasklist", "/FI", "IMAGENAME eq steam.exe"], capture_output=True, text=True)
print(proc.stdout)
