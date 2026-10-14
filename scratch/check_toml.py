import re

with open(r"C:\Program Files (x86)\Steam\OpenSteamTool.dll", "rb") as f:
    content = f.read()

# Find strings in square brackets like [section]
sections = set(re.findall(rb"\[[a-zA-Z0-9\_\-]+\]", content))
print("Config sections:", [s.decode("utf-8", errors="ignore") for s in sections])

# Find config key names
keys = set(re.findall(rb"\b[a-zA-Z0-9\_]+\s*\=\s*", content))
print("Config keys:", [k.decode("utf-8", errors="ignore") for k in keys][:30])

# Search for manifest, cloud, url, provider strings
strings = set(re.findall(rb"[a-zA-Z0-9\_\-\/\.\:]{4,50}", content))
manifest_related = [s.decode("utf-8", errors="ignore") for s in strings if b"manifest" in s.lower() or b"cloud" in s.lower() or b"server" in s.lower()]
print("\nManifest related strings:")
for m in sorted(set(manifest_related))[:50]:
    print("  ", m)
