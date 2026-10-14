import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://manifest.opensteamtool.com/1030831/7075325167535131973"
print(f"Fetching {url}...")
try:
    with urllib.request.urlopen(url, context=ctx, timeout=5) as response:
        data = response.read(100)
        print(f"SUCCESS! Received {len(data)} bytes: {data[:20]}")
except Exception as e:
    print(f"FAILED: {e}")
