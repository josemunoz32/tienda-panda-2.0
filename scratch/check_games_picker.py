path = r"c:\Users\Usuario\proyectopandastore20\src\pages\Admin\AdminLicencias.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("fetchGames =")
print("=== fetchGames ===")
print(content[idx:idx+1200])

idx2 = content.find("const isChecked = selectedGameIds.includes(appId)")
print("=== Picker row ===")
print(content[idx2-200:idx2+600])
