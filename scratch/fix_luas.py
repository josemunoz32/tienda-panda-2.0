import os
import glob

plugin_dir = r"C:\Program Files (x86)\Steam\config\st-plugin"
lua_files = glob.glob(os.path.join(plugin_dir, "*.lua"))

for filepath in lua_files:
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    fixed_content = content.replace("-- setManifestid", "setManifestid")
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(fixed_content)

print(f"Fixed {len(lua_files)} lua files.")
