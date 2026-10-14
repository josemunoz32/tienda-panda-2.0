import re

for filepath in [
    r"C:\Program Files (x86)\Steam\cloud_redirect.dll",
    r"C:\Program Files (x86)\Steam\OpenSteamTool.dll"
]:
    print(f"=== {filepath} ===")
    with open(filepath, "rb") as f:
        content = f.read()
    urls = set(re.findall(rb"https?://[a-zA-Z0-9\.\-\_\/]+", content))
    for u in sorted(urls):
        print(u.decode("utf-8", errors="ignore"))

    # Also search for api endpoints or domain names
    domains = set(re.findall(rb"[a-zA-Z0-9\.\-]+\.(?:com|net|org|io|tools|app|xyz|dev|cn|ru)", content))
    print("Domains found:", [d.decode("utf-8", errors="ignore") for d in domains])
