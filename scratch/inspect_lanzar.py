import sys
sys.stdout.reconfigure(encoding='utf-8')

path = r"c:\Users\Usuario\proyectopandastore20\PandaStoreLauncher\MainWindow.xaml.cs"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("BtnLanzarJuego_Click")
print(content[idx:idx+1500])
