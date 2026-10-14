import urllib.request
import os
import subprocess

# Download Let's Encrypt YE1 intermediate cert and ISRG Root X1 / X2 certs
urls = [
    ("https://letsencrypt.org/certs/2024/ye1.der", "ye1.der"),
    ("https://letsencrypt.org/certs/isrgrootx1.der", "isrgrootx1.der"),
    ("https://letsencrypt.org/certs/isrg-root-x2.der", "isrgrootx2.der")
]

for url, filename in urls:
    filepath = os.path.join(r"c:\Users\Usuario\proyectopandastore20\scratch", filename)
    print(f"Downloading {url}...")
    try:
        data = urllib.request.urlopen(url, timeout=5).read()
        with open(filepath, "wb") as f:
            f.write(data)
        print(f"  Saved {filename} ({len(data)} bytes).")
        # Install into Windows Cert Store
        cmd = f'certutil -addstore CA "{filepath}"'
        res = subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True)
        print("  Certutil output:", res.stdout.strip() or res.stderr.strip())
    except Exception as e:
        print(f"  Failed: {e}")
