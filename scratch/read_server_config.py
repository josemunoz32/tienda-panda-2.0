import zlib

pyz_path = "TokeerDRM (2).exe_extracted/PYZ.pyz"
data = open(pyz_path, "rb").read()

# Let's check offset 0x007E0E3B
offset = 0x007E0E3B
length = 0x7F

print("Chunk at offset:", offset, "length:", length)
chunk = data[offset:offset+length]
print("Raw chunk:", chunk[:30])

try:
    decomp = zlib.decompress(chunk)
    print("Decompressed length:", len(decomp))
    print("Content:")
    print(repr(decomp))
    # search for string
    import re
    print("Strings:", re.findall(rb'[a-zA-Z0-9_\-\.:/]{4,}', decomp))
except Exception as e:
    print("Decompress error:", e)
    # Search around offset
    for delta in range(-20, 20):
        try:
            d = zlib.decompress(data[offset+delta:offset+delta+length])
            print(f"Success at delta {delta}:", repr(d))
            break
        except Exception:
            pass
