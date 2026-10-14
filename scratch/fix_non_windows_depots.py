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

total_fixed = 0

for folder in folders:
    if os.path.exists(folder):
        for root, dirs, files in os.walk(folder):
            for file in files:
                if file.endswith(".lua"):
                    filepath = os.path.join(root, file)
                    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                        lines = f.readlines()
                    
                    modified = False
                    new_lines = []
                    i = 0
                    while i < len(lines):
                        line = lines[i]
                        # Check if line is an addappid for macos or linux
                        if re.search(r'--\s*\((macos|linux|mac)\)', line, re.IGNORECASE):
                            if not line.strip().startswith('--'):
                                line = '-- ' + line
                                modified = True
                            new_lines.append(line)
                            # Check if following line is setManifestid and comment it out as well
                            if i + 1 < len(lines) and ('setManifestid' in lines[i+1] or 'set_manifest' in lines[i+1]):
                                next_line = lines[i+1]
                                if not next_line.strip().startswith('--'):
                                    next_line = '-- ' + next_line
                                    modified = True
                                new_lines.append(next_line)
                                i += 1
                        else:
                            new_lines.append(line)
                        i += 1

                    if modified:
                        with open(filepath, "w", encoding="utf-8") as f:
                            f.writelines(new_lines)
                        total_fixed += 1

print(f"Commented out macOS/Linux non-Windows depots in {total_fixed} lua files.")
