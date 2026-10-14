import re

dll = r"C:\Users\Usuario\proyectopandastore20\PandaStoreLauncher\Resources\Injector\OpenSteamTool.dll"
with open(dll, "rb") as f:
    data = f.read()

urls = re.findall(rb"https?://[^\x00\r\n\t \"']+", data)
for u in set(urls):
    print("URL:", u.decode("latin1", errors="ignore"))
