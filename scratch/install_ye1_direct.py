import urllib.request
import os
import subprocess

url = "http://ye1.i.lencr.org/"
filepath = r"c:\Users\Usuario\proyectopandastore20\scratch\ye1_direct.der"

print(f"Downloading from {url}...")
try:
    data = urllib.request.urlopen(url, timeout=5).read()
    with open(filepath, "wb") as f:
        f.write(data)
    print(f"Saved {filepath} ({len(data)} bytes).")
    
    # Install to CA (Intermediate) and Root
    subprocess.run(["powershell", "-Command", f'certutil -addstore CA "{filepath}"'], capture_output=True, text=True)
    subprocess.run(["powershell", "-Command", f'certutil -addstore Root "{filepath}"'], capture_output=True, text=True)
    print("Installed YE1 into CA and Root stores successfully!")
except Exception as e:
    print(f"Failed: {e}")
