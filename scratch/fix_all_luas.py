import os
import glob
import re

folders = [
    r"C:\Program Files (x86)\Steam\config\lua",
    r"C:\Program Files (x86)\Steam\config\st-plugin",
    r"C:\Program Files (x86)\Steam\config\stplug-in",
    r"C:\Program Files (x86)\Steam\plugins",
    r"c:\Users\Usuario\proyectopandastore20\fixes\Pack_Steam\archivos_juego"
]

total = 0
for folder in folders:
    if os.path.exists(folder):
        for root, dirs, files in os.walk(folder):
            for file in files:
                if file.endswith(".lua"):
                    filepath = os.path.join(root, file)
                    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    fixed = re.sub(r'^\s*--\s*(setManifestid|set_manifest|setmanifestid)', r'\1', content, flags=re.MULTILINE | re.IGNORECASE)
                    if fixed != content:
                        with open(filepath, "w", encoding="utf-8") as f:
                            f.write(fixed)
                        total += 1

print(f"Fixed {total} lua files across all directories.")

