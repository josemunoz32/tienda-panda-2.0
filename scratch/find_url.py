import glob
import os
import re

folder = "TokeerDRM_orig.exe_extracted"
print("Scanning files in", folder)
all_urls = set()
for root, dirs, files in os.walk(folder):
    for file in files:
        path = os.path.join(root, file)
        try:
            with open(path, "rb") as f:
                data = f.read()
                matches = re.findall(rb"https?://[a-zA-Z0-9\.\-:_/]+", data)
                for m in matches:
                    u = m.decode('latin1', 'ignore')
                    if any(k in u.lower() for k in ["lua", "tokeer", "token", "drm", "8091", "xyz", "tools"]):
                        all_urls.add((u, file))
        except Exception:
            pass

for u, f in sorted(all_urls):
    print(f"{f}: {u}")
