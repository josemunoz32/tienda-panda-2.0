import os, re

pyz_path = "TokeerDRM_orig.exe_extracted/PYZ-00.pyz"
if os.path.exists(pyz_path):
    print("Reading PYZ-00.pyz...")
    data = open(pyz_path, "rb").read()
    matches = re.findall(rb"https?://[a-zA-Z0-9\.\-:_/]+", data)
    for m in set(matches):
        u = m.decode('latin1', 'ignore')
        if "github" not in u and "microsoft" not in u and "python.org" not in u and "w3.org" not in u:
            print(f"PYZ URL: {u}")
else:
    print("PYZ-00.pyz not found")
