path = r"c:\Users\Usuario\proyectopandastore20\src\pages\Admin\AdminLicencias.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("const openEditLicense =")
print(content[idx:idx+1500])
