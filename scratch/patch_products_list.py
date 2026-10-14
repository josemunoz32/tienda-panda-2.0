with open(r'c:\Users\Usuario\proyectopandastore20\src\pages\Productos\ProductosList.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = 'if (userDoc.exists() && userDoc.data().role === "admin") {'
rep = '''const uRole = String(userDoc.data()?.role || "").trim().toLowerCase();
        if (userDoc.exists() && ["admin", "super_admin", "superadmin"].includes(uRole)) {'''

if target in content:
    content = content.replace(target, rep)
    with open(r'c:\Users\Usuario\proyectopandastore20\src\pages\Productos\ProductosList.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("ProductosList.js successfully updated!")
else:
    print("Target not found in ProductosList.js")
