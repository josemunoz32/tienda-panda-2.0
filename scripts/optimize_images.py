import os
from PIL import Image

def optimize_image(src_path, dst_path, max_width=None, max_height=None, quality=80):
    if not os.path.exists(src_path):
        print(f"NOT FOUND: {src_path}")
        return
    orig_size = os.path.getsize(src_path)
    img = Image.open(src_path)
    
    if max_width and max_height:
        img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
    
    img.save(dst_path, "WEBP", quality=quality, optimize=True)
    new_size = os.path.getsize(dst_path)
    print(f"CONVERTED: {src_path} ({orig_size // 1024} KB) -> {dst_path} ({new_size // 1024} KB)")

# 1. Welcome Modal Images (Displayed at max 120x120)
optimize_image(
    "src/assets/halloween/panda-bienvenida-halloween.png",
    "src/assets/halloween/panda-bienvenida-halloween.webp",
    max_width=250, max_height=250, quality=82
)

optimize_image(
    "src/assets/fotos publicidad menu/provedores.png",
    "src/assets/fotos publicidad menu/provedores.webp",
    max_width=250, max_height=250, quality=82
)

cats = [
    "psn", "switch", "pack-switch", "streaming", "suscripciones", "promos"
]
for cat in cats:
    optimize_image(
        f"src/assets/categorias y prom,o/{cat}.png",
        f"src/assets/categorias y prom,o/{cat}.webp",
        max_width=250, max_height=250, quality=82
    )

# 2. Promo pack images (Displayed at 304x380 in carousel)
promos = [
    "deluxe 2 x 30.000",
    "2 x 25.000 basica",
    "deluxe 3 x40.000",
    "3x1 $35.000 basica"
]
for promo in promos:
    optimize_image(
        f"src/assets/promos/{promo}.png",
        f"src/assets/promos/{promo}.webp",
        max_width=600, max_height=760, quality=82
    )

# 3. Logos (WhatsApp, Instagram, Steam, App Icon)
optimize_image(
    "src/assets/logos/logowsp.png",
    "src/assets/logos/logowsp.webp",
    max_width=128, max_height=128, quality=85
)
optimize_image(
    "src/assets/logos/logoig.png",
    "src/assets/logos/logoig.webp",
    max_width=128, max_height=128, quality=85
)
optimize_image(
    "src/assets/logos/logosteam.png",
    "src/assets/logos/logosteam.webp",
    max_width=128, max_height=128, quality=85
)
optimize_image(
    "public/miicono.png",
    "public/miicono.webp",
    max_width=120, max_height=120, quality=85
)
optimize_image(
    "public/favicon-96.png",
    "public/favicon-96.webp",
    max_width=96, max_height=96, quality=85
)

print("ALL IMAGES OPTIMIZED SUCCESSFULLY")
