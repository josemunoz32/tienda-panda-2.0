import urllib.request
import re

url = "https://lua.tools/_next/static/chunks/app/(app)/fixes/%5Bappid%5D/page-c33674c97ca40333.js"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as res:
    js = res.read().decode('utf-8')

print("Fixes page JS size:", len(js))

# Look for fetch or API routes
matches = re.findall(r'fetch\([^\)]+\)', js)
print("Fetch calls found:", len(matches))
for m in matches[:10]:
    print("  fetch ->", m[:100])

# Look for endpoints like /api/...
routes = re.findall(r'["\'](/api/[^"\']+)["\']', js)
print("API routes:", set(routes))

# Look for domains
domains = re.findall(r'https?://[a-zA-Z0-9\.\-_]+', js)
print("Domains:", set(domains))
