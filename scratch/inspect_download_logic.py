import urllib.request
import re

url = "https://lua.tools/_next/static/chunks/app/(app)/fixes/%5Bappid%5D/page-c33674c97ca40333.js"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as res:
    js = res.read().decode('utf-8')

idx = js.find('/api/denuvo/download')
print(js[max(0, idx - 300):min(len(js), idx + 400)])
