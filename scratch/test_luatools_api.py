import urllib.request
import json

url = "https://lua.tools/api/denuvo/download?fix=3764200&slot=0"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as res:
        print("Status:", res.status)
        print("Headers:", res.headers)
        data = res.read()
        print("Data:", data[:500])
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print("Error body:", e.read()[:500])
