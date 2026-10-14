import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

urls = [
    "https://lua.tools/",
    "https://manifest.opensteamtool.com/",
    "https://manifest.steam.run/api/manifest/1593501/2535153423663269664",
    "https://lua.tools/api/manifest/1593501/2535153423663269664"
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}

for url in urls:
    print(f"Testing with SSL verification bypassed: {url}")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=5) as response:
            data = response.read(100)
            print(f"  SUCCESS! Status: {response.status}, Received {len(data)} bytes")
    except Exception as e:
        print(f"  FAILED: {e}")
