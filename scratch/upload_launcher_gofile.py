import requests
import json
import subprocess

GOFILE_PREMIUM_TOKEN = "ZtkBWxSMe9wsPfJJGl8i6j77x6LgbwoQ"
file_path = r"c:\Users\Usuario\proyectopandastore20\PandaStoreLauncher\Publish\PandaStoreSetup.exe"

print("1. Obteniendo mejor servidor de Gofile...")
res = requests.get("https://api.gofile.io/servers")
server_data = res.json()
print("Servers status:", server_data.get("status"))

if server_data.get("status") == "ok":
    servers = server_data["data"]["servers"]
    server_name = servers[0]["name"]
    print(f"Servidor seleccionado: {server_name}")
    
    upload_url = f"https://{server_name}.gofile.io/contents/uploadfile"
    print(f"2. Subiendo {file_path} a {upload_url}...")
    
    # We use curl to avoid python memory buffering of 115MB
    curl_cmd = [
        "curl", "-#", "-X", "POST",
        "-H", f"Authorization: Bearer {GOFILE_PREMIUM_TOKEN}",
        "-F", f"file=@{file_path}",
        upload_url
    ]
    
    proc = subprocess.run(curl_cmd, capture_output=True, text=True)
    print("Curl returncode:", proc.returncode)
    try:
        data = json.loads(proc.stdout)
        print("Upload result JSON:", json.dumps(data, indent=2))
        download_page = data.get("data", {}).get("downloadPage")
        file_id = data.get("data", {}).get("fileId")
        guest_token = data.get("data", {}).get("guestToken")
        print("\n===============================")
        print("DOWNLOAD PAGE:", download_page)
        print("FILE ID:", file_id)
        print("===============================\n")
        with open(r"c:\Users\Usuario\proyectopandastore20\scratch\gofile_setup_result.json", "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print("Error parsing output:", e)
        print("Stdout:", proc.stdout[:500])
        print("Stderr:", proc.stderr[:500])
else:
    print("Error getting server:", server_data)
