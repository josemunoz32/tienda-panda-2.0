path = r"c:\Users\Usuario\proyectopandastore20\src\pages\Admin\AdminLicencias.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

import re
matches = [line for line in content.splitlines() if "selectedGameIds" in line]
for m in matches:
    print(m)
