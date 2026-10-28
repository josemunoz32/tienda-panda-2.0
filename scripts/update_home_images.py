with open('src/pages/Home/Home.js', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    ("import letreroPromos from '../../assets/letreros/promociones.png';", "import letreroPromos from '../../assets/letreros/promociones.webp';"),
    ("import letreroNintendo from '../../assets/letreros/nintendo switch.png';", "import letreroNintendo from '../../assets/letreros/nintendo switch.webp';"),
    ("import letreroPS4 from '../../assets/letreros/play 4.png';", "import letreroPS4 from '../../assets/letreros/play 4.webp';"),
    ("import letreroPS5 from '../../assets/letreros/play 5.png';", "import letreroPS5 from '../../assets/letreros/play 5.webp';"),
    ("import letreroStreaming from '../../assets/letreros/streaming.png';", "import letreroStreaming from '../../assets/letreros/streaming.webp';"),
    ("import letreroSuscripciones from '../../assets/letreros/suscripciones.png';", "import letreroSuscripciones from '../../assets/letreros/suscripciones.webp';"),
    ("import steamLogo from '../../assets/logos/logosteam.png';", "import steamLogo from '../../assets/logos/logosteam.webp';"),
    ("import wspLogo from '../../assets/logos/logowsp.png';", "import wspLogo from '../../assets/logos/logowsp.webp';"),
    ("import pandaLoader from '../../assets/logos/miicono.png';", "import pandaLoader from '../../assets/logos/miicono.webp';"),
    ("require('../../assets/promos/2 x 25.000 basica.png')", "require('../../assets/promos/2 x 25.000 basica.webp')"),
    ("require('../../assets/promos/3x1 $35.000 basica.png')", "require('../../assets/promos/3x1 $35.000 basica.webp')"),
    ("require('../../assets/promos/deluxe 2 x 30.000.png')", "require('../../assets/promos/deluxe 2 x 30.000.webp')"),
    ("require('../../assets/promos/deluxe 3 x40.000.png')", "require('../../assets/promos/deluxe 3 x40.000.webp')"),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f"Replaced: {old[:40]}...")
    else:
        print(f"NOT FOUND: {old[:40]}...")

with open('src/pages/Home/Home.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Home.js update finished successfully.")
