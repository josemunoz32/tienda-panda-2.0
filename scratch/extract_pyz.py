import zlib
import re

pyz_path = "TokeerDRM (2).exe_extracted/PYZ.pyz"
data = open(pyz_path, "rb").read()
print(f"PYZ size: {len(data)} bytes")

# Search for zlib compressed chunks
# In PyInstaller PYZ, each entry starts with magic or table of contents
# Let's search for server_config in the table of contents at the end of PYZ:
toc_idx = data.find(b"server_config")
if toc_idx != -1:
    print("Found server_config in PYZ TOC at", toc_idx)
    snippet = data[max(0, toc_idx-50):toc_idx+150]
    print("TOC snippet:", snippet)

# Find all zlib stream deflates
offset = 0
found_urls = set()
while True:
    idx = data.find(b"\x78\xda", offset) # zlib default compression magic
    if idx == -1:
        idx = data.find(b"\x78\x9c", offset) # zlib low/normal compression
    if idx == -1:
        idx = data.find(b"\x78\x01", offset)
    if idx == -1:
        break
    offset = idx + 2
    try:
        decomp = zlib.decompress(data[idx:idx+100000])
        urls = re.findall(rb"https?://[a-zA-Z0-9\.\-:_/]+", decomp)
        for u in urls:
            u_str = u.decode('latin1', 'ignore')
            if any(k in u_str.lower() for k in ["lua", "tokeer", "8091", "token", "drm", "xyz", "bot", "store"]):
                found_urls.add(u_str)
        if b"SERVER_URL" in decomp:
            print("FOUND SERVER_URL in decompressed block at", idx)
            print("Decompressed snippet:", decomp[:300])
    except Exception:
        pass

print("Discovered URLs:")
for u in found_urls:
    print(" -", u)
