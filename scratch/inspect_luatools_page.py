import urllib.request
import re
import json

req = urllib.request.Request('https://lua.tools/fixes/3764200', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as res:
    html = res.read().decode('utf-8')

print("Page HTML size:", len(html))

# Search for any links or buttons with onclick / fetch
links = re.findall(r'href=["\']([^"\']+)["\']', html)
print("Href links:", links)

# Look for text around download or buttons
for line in html.splitlines():
    if "download" in line.lower() or "fix" in line.lower() or "button" in line.lower():
        if len(line) < 300:
            print("LINE:", line)

# Look at the scripts loaded by page
scripts = re.findall(r'src=["\']([^"\']+\.js)["\']', html)
print("Scripts loaded:", scripts)
