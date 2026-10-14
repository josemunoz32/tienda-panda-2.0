path = r"c:\Users\Usuario\proyectopandastore20\src\pages\Admin\AdminLicencias.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

import re
matches = [line for line in content.splitlines() if "setEditingLicense" in line or "openEdit" in line or "handleEdit" in line]
for m in matches:
    print(m)
