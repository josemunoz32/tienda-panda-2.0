import urllib.request
import urllib.error

urls = [
    "https://manifest.opensteamtool.com/1593501/2535153423663269664",
    "https://manifest.steam.run/api/manifest/1593501/2535153423663269664",
    "http://gmrc.wudrm.com/manifest/1593501/2535153423663269664",
    "https://lua.tools/api/manifest/1593501/2535153423663269664",
    "https://manifest.opensteamtool.com/1593501_2535153423663269664.manifest",
    "https://lua.tools/manifest/1593501_2535153423663269664.manifest"
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SteamTools/OpenSteamTool"
}

for url in urls:
    print(f"Testing {url}...")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as response:
            data = response.read(100)
            print(f"  SUCCESS! Status: {response.status}, Received {len(data)} bytes: {data[:30]}")
    except Exception as e:
        print(f"  FAILED: {e}")
