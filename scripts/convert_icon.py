from PIL import Image
import os

png_path = os.path.abspath("public/miicono.png")
ico_path = os.path.abspath("PandaStoreLauncher/app.ico")

img = Image.open(png_path)
img.save(ico_path, format='ICO', sizes=[(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)])
print(f"ICO generado exitosamente en: {ico_path}")
