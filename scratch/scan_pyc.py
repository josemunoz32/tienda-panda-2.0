import os, re

folder = "TokeerDRM_orig.exe_extracted"
for root, dirs, files in os.walk(folder):
    for f in files:
        if f.endswith(".pyc") or f.endswith(".py") or f.endswith(".json") or f.endswith(".txt"):
            path = os.path.join(root, f)
            try:
                data = open(path, "rb").read()
                matches = re.findall(rb"https?://[a-zA-Z0-9\.\-:_/]+", data)
                for m in matches:
                    u = m.decode('latin1', 'ignore')
                    if "github" not in u and "microsoft" not in u and "w3.org" not in u:
                        print(f"{f}: {u}")
            except Exception:
                pass
