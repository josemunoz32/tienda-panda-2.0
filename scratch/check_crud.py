import re

with open(r'c:\Users\Usuario\proyectopandastore20\src\pages\Productos\ProductoForm.js', 'r', encoding='utf-8') as f:
    content = f.read()

print("File read, length:", len(content))
# Check if role checks are present
m = re.findall(r'role === "admin"', content)
print("Matches for role === \"admin\":", len(m))

# Replace both occurrences to support super_admin and superadmin
updated = content.replace(
    'if (userDoc.exists() && userDoc.data().role === "admin") {',
    'const uRole = String(userDoc.data()?.role || "").trim().toLowerCase();\n        if (userDoc.exists() && ["admin", "super_admin", "superadmin"].includes(uRole)) {'
)

updated = updated.replace(
    'if (!serverProfile.exists() || serverProfile.data().role !== "admin") {',
    'const sRole = String(serverProfile.data()?.role || "").trim().toLowerCase();\n        if (!serverProfile.exists() || !["admin", "super_admin", "superadmin"].includes(sRole)) {'
)

if updated != content:
    with open(r'c:\Users\Usuario\proyectopandastore20\src\pages\Productos\ProductoForm.js', 'w', encoding='utf-8') as f:
        f.write(updated)
    print("ProductoForm.js successfully updated!")
else:
    print("No changes made.")
