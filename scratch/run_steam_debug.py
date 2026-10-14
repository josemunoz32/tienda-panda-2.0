import subprocess
import os

steam_exe = r"C:\Program Files (x86)\Steam\steam.exe"
proc = subprocess.Popen(
    [steam_exe, "-console", "-developer", "-lognet"],
    cwd=r"C:\Program Files (x86)\Steam",
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

stdout, stderr = proc.communicate(timeout=15)
print("Return code:", proc.returncode)
print("STDOUT:", stdout[:500])
print("STDERR:", stderr[:500])
