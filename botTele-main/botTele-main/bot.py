import sys
import re
import asyncio
import json
import os
import urllib.parse
from datetime import datetime

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.error import RetryAfter
from telegram.ext import (
    Application,
    ApplicationBuilder,
    MessageHandler,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
    filters
)

import firebase_admin
from firebase_admin import credentials, firestore

# ================= CONFIGURACIÓN Y VARIABLES DE ENTORNO =================
def cargar_env():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip()

cargar_env()

TOKEN = os.getenv("TELEGRAM_TOKEN", "")
CANAL_PUBLICO_ID = int(os.getenv("CANAL_PUBLICO_ID", os.getenv("CANAL_ID", "-1001553070593")))
CANAL_REVENDEDORES_ID = int(os.getenv("CANAL_REVENDEDORES_ID", "0"))
ADMIN_ID = int(os.getenv("ADMIN_ID", "5158777962"))

MARGEN_PUBLICO = int(os.getenv("MARGEN_PUBLICO", "13000"))
MARGEN_REVENDEDOR = int(os.getenv("MARGEN_REVENDEDOR", "6000"))

FIREBASE_KEY_PATH = os.getenv("FIREBASE_KEY_PATH", r"C:\Users\Usuario\proyectopandastore20\chatbot\firebase-key.json")
TELEGRAM_CONTACT = os.getenv("TELEGRAM_CONTACT", "NintendoChile2")
INSTAGRAM_URL = os.getenv("INSTAGRAM_URL", "https://www.instagram.com/juegos_nintendo_switch_chile")

WEBSITE_URL = os.getenv("WEBSITE_URL", "https://pandastoreupdate.web.app")
TESTIMONIOS_URL = f"{WEBSITE_URL}/testimonios"
PROMOS_URL = f"{WEBSITE_URL}/promos"
GUIA_INSTALL_URL = f"{WEBSITE_URL}/instalacion-nintendo"

COUNTER_FILE = os.path.join(os.path.dirname(__file__), "contador_pack.txt")
REGISTRO_PACKS_FILE = os.path.join(os.path.dirname(__file__), "packs_publicados.json")

# ================= DATOS BANCARIOS Y DE PAGO =================
DATOS_PAGO = {
    "bancoestado": {
        "nombre": "BancoEstado (Cuenta RUT)",
        "icono": "🏦",
        "texto": (
            "🏦 *BANCOESTADO — CUENTA RUT*\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "👤 *Titular:* Matías Muñoz\n"
            "🆔 *RUT:* `236326845`\n"
            "🔢 *N° Cuenta:* `236326845`\n"
            "💳 *Tipo:* Cuenta RUT / Cuenta Vista\n"
            "✉️ *Email:* `comprobantesswitch2@gmail.com`\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "💡 *Tip:* Haz clic sobre el RUT o N° de cuenta para copiarlo directamente."
        )
    },
    "mercadopago": {
        "nombre": "Mercado Pago",
        "icono": "💙",
        "texto": (
            "💙 *MERCADO PAGO — TRANSFERENCIA*\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "👤 *Titular:* José Roberto Muñoz Osses\n"
            "🆔 *RUT:* `21.715.187-2`\n"
            "🔢 *N° Cuenta:* `1095508563`\n"
            "💳 *Tipo:* Cuenta Vista\n"
            "✉️ *Email:* `comprobantesswitch2@gmail.com`\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "💡 *Tip:* Haz clic sobre el RUT o N° de cuenta para copiarlo directamente."
        )
    },
    "crypto": {
        "nombre": "USDT (Crypto - BEP20)",
        "icono": "🪙",
        "texto": (
            "🪙 *USDT — CRYPTO (BINANCE SMART CHAIN)*\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "🌐 *Red:* BEP20 (BNB Smart Chain)\n"
            "📬 *Billetera:* `0x7320E27e6FEB10d2bA387928c5bb6675b2AD2965`\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "⚠️ *Importante:* Envía únicamente USDT por red BEP20 para evitar pérdidas."
        )
    }
}

import hashlib

# ================= GESTIÓN DE REGISTRO LOCAL DE PACKS Y HUELLA ANTI-DUPLICADOS =================
def calcular_huella_pack(pack: dict) -> str:
    """Genera un hash único basado en el título y lista de juegos ordenados"""
    titulo = (pack.get("titulo") or "").strip().lower()
    juegos = sorted([j.strip().lower() for j in (pack.get("juegos") or []) if j.strip()])
    firma = f"{titulo}:::{'|'.join(juegos)}"
    return hashlib.sha256(firma.encode("utf-8")).hexdigest()

def pack_ya_fue_procesado(pack: dict) -> bool:
    """Verifica si el pack ya fue publicado anteriormente revisando la huella digital"""
    huella = calcular_huella_pack(pack)
    reg = cargar_registro_publicados()
    for item in reg.values():
        pack_data = item.get("pack", {})
        if pack_data.get("huella") == huella:
            return True
        # Comparación directa de juegos y título por si no tenía huella antes
        if pack_data.get("titulo") == pack.get("titulo") and pack_data.get("juegos") == pack.get("juegos"):
            return True
    return False

def cargar_registro_publicados() -> dict:
    if os.path.exists(REGISTRO_PACKS_FILE):
        try:
            with open(REGISTRO_PACKS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def guardar_registro_publicado(id_pack: str, msg_id_pub: int, msg_id_rev: int = None, datos_pack: dict = None):
    reg = cargar_registro_publicados()
    if datos_pack:
        datos_pack["huella"] = calcular_huella_pack(datos_pack)
    reg[id_pack] = {
        "msg_id_publico": msg_id_pub,
        "msg_id_revendedor": msg_id_rev,
        "fecha": datetime.now().isoformat(),
        "pack": datos_pack or {}
    }
    try:
        with open(REGISTRO_PACKS_FILE, "w", encoding="utf-8") as f:
            json.dump(reg, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"⚠️ Error guardando en {REGISTRO_PACKS_FILE}: {e}")

def obtener_pack_registrado(id_pack: str):
    reg = cargar_registro_publicados()
    return reg.get(id_pack)

def eliminar_pack_registrado(id_pack: str):
    reg = cargar_registro_publicados()
    if id_pack in reg:
        del reg[id_pack]
        try:
            with open(REGISTRO_PACKS_FILE, "w", encoding="utf-8") as f:
                json.dump(reg, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

def obtener_siguiente_id_pack() -> str:
    """Lee e incrementa el contador correlativo de packs guardado en disco"""
    num = 1
    if os.path.exists(COUNTER_FILE):
        try:
            with open(COUNTER_FILE, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content.isdigit():
                    num = int(content)
        except Exception:
            num = 1
    
    id_pack = f"#PACK-{num:03d}"
    
    try:
        with open(COUNTER_FILE, "w", encoding="utf-8") as f:
            f.write(str(num + 1))
    except Exception as e:
        print(f"⚠️ Error actualizando contador_pack.txt: {e}")
        
    return id_pack

# ================= FIREBASE =================
_firebase_app = None
_db = None

def init_firebase():
    global _firebase_app, _db
    if not FIREBASE_KEY_PATH or not os.path.exists(FIREBASE_KEY_PATH):
        print("ℹ️ Clave de Firebase no detectada (la publicación en Telegram funcionará normalmente sin guardar en base de datos)")
        _db = None
        return
    try:
        cred = credentials.Certificate(FIREBASE_KEY_PATH)
        _firebase_app = firebase_admin.initialize_app(cred)
        _db = firestore.client()
        print("✅ Firebase Admin SDK conectado a Firestore")
    except Exception as e:
        print(f"⚠️ Firebase no disponible: {e}")
        _db = None

def guardar_pack_firestore(pack: dict, telegram_msg_id=None):
    """Guarda o actualiza el pack en Firestore con su nickname identificador y costos de entrada."""
    if _db is None:
        return
    try:
        nickname = pack.get("nickname")
        if not nickname:
            tit = pack.get("titulo", "")
            if "Nickname:" in tit:
                nickname = tit.split("Nickname:", 1)[1].strip()
            elif "Código:" in tit:
                nickname = tit.split("Código:", 1)[1].strip()
            elif "ID:" in tit:
                nickname = tit.split("ID:", 1)[1].strip()
            else:
                nickname = pack.get("id_pack", "")

        precio_usd = pack.get("precio_usd", 0)
        precio_clp_venta = pack.get("precio_clp", 0)
        costo_clp = precio_usd * 1000
        precio_revendedor_clp = costo_clp + MARGEN_REVENDEDOR

        doc_data = {
            "id_pack": pack.get("id_pack", ""),
            "nickname": nickname or "",
            "titulo": pack.get("titulo", ""),
            "juegos": pack.get("juegos", []),
            "dispositivos": pack.get("dispositivos", []),
            "precio_usd": precio_usd,
            "costo_usd": precio_usd,
            "costo_clp": costo_clp,
            "precio_clp": precio_clp_venta,
            "precio_revendedor_clp": precio_revendedor_clp,
            "precio_usdt": pack.get("precio_usdt", 0),
            "horario_limitado": pack.get("horario_limitado", False),
            "disponible": True,
            "timestamp": firestore.SERVER_TIMESTAMP,
        }
        if telegram_msg_id is not None:
            doc_data["telegram_msg_id"] = str(telegram_msg_id)
        _db.collection("packs_nintendo").add(doc_data)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 💾 Pack {pack.get('id_pack')} (Nick: {nickname}) guardado en Firestore")
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️ Error guardando en Firestore: {e}")

def desmarcar_pack_firestore(id_pack: str):
    """Marca el pack como no disponible en Firestore"""
    if _db is None:
        return
    try:
        docs = _db.collection("packs_nintendo").where("id_pack", "==", id_pack).stream()
        for doc in docs:
            doc.reference.update({"disponible": False})
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 🔒 Pack {id_pack} marcado como no disponible en Firestore")
    except Exception as e:
        print(f"⚠️ Error actualizando disponibilidad en Firestore: {e}")

# ================= COLAS Y ESTADOS =================
cola_packs = asyncio.Queue()
CANCELAR_SUBIDA_FLAG = False
PENDING_IMPORT_DATA = {}  # Guardará listas temporales enviadas por admin esperando confirmación

def calcular_precios_publico(precio_usd: int):
    precio_clp = precio_usd * 1000 + MARGEN_PUBLICO
    precio_usdt = int((precio_clp / 1000) + 4)
    return precio_clp, precio_usdt

def calcular_precios_revendedor(precio_usd: int):
    precio_clp = precio_usd * 1000 + MARGEN_REVENDEDOR
    precio_usdt = int((precio_clp / 1000) + 4)
    return precio_clp, precio_usdt

def calcular_precios(precio_usd: int):
    return calcular_precios_publico(precio_usd)

# ================= PARSERS =================
def parsear_tipo1(texto: str):
    lineas = texto.strip().splitlines()
    if not lineas or "---- List Game ----" not in texto:
        return None
    codigo = lineas[0].strip()
    match_juegos = re.search(r"---- List Game ----(.*?)----End Game List ----", texto, re.S)
    if not match_juegos:
        return None
    juegos = [j.strip() for j in match_juegos.group(1).splitlines() if j.strip()]
    if len(juegos) < 1:
        return None
    match_precio = re.search(r"Price\s*:\s*(\d+)\$", texto)
    if not match_precio:
        return None
    precio_usd = int(match_precio.group(1))
    precio_clp, precio_usdt = calcular_precios(precio_usd)
    return {
        "nickname": codigo,
        "titulo": f"Código: {codigo}",
        "juegos": juegos,
        "precio_usd": precio_usd,
        "costo_usd": precio_usd,
        "costo_clp": precio_usd * 1000,
        "precio_clp": precio_clp,
        "precio_usdt": precio_usdt,
        "horario_limitado": False
    }

def parsear_tipo2(texto: str):
    if "Nickname :" not in texto or "Linked Consoles :" not in texto:
        return None
    match_consoles = re.search(r"Linked Consoles\s*:\s*(\d+)", texto)
    if not match_consoles or int(match_consoles.group(1)) >= 3:
        return None
    match_nick = re.search(r"Nickname\s*:\s*(.+)", texto)
    if not match_nick:
        return None
    nickname = match_nick.group(1).strip()
    match_precio = re.search(r"PRICE\s*(\d+)\$", texto)
    if not match_precio:
        return None
    precio_usd = int(match_precio.group(1))
    precio_clp, precio_usdt = calcular_precios(precio_usd)
    juegos = []
    en_lista = False
    for linea in texto.splitlines():
        if "==============Transaction" in linea:
            en_lista = True
            continue
        if linea.startswith("===="):
            en_lista = False
        if en_lista:
            linea_limpia = linea.strip()
            if linea_limpia and "no games found" not in linea_limpia.lower():
                juegos.append(linea_limpia)
    if len(juegos) < 1:
        return None
    return {
        "nickname": nickname,
        "titulo": f"Nickname: {nickname}",
        "juegos": juegos,
        "precio_usd": precio_usd,
        "costo_usd": precio_usd,
        "costo_clp": precio_usd * 1000,
        "precio_clp": precio_clp,
        "precio_usdt": precio_usdt,
        "horario_limitado": False
    }

def parsear_tipo3(texto: str):
    if "💎 NUEVA CUENTA DISPONIBLE 💎" not in texto:
        return None
    secciones = re.split(r'\n━{10,}\s*\n', texto.strip())
    if len(secciones) < 4:
        return None
    datos_cuenta = secciones[1].strip()
    match_devices = re.search(r'Devices:\s*\[(.*?)\]', datos_cuenta, re.IGNORECASE)
    if match_devices:
        devices_str = match_devices.group(1).strip()
        if devices_str.lower() != "none":
            devices_list = [d.strip() for d in devices_str.split(',') if d.strip()]
            if len(devices_list) != 1:
                return None
    else:
        return None

    match_nick = re.search(r'Nickname:\s*(.+)', datos_cuenta, re.IGNORECASE)
    match_id = re.search(r'ID:\s*#?(\d+)', datos_cuenta, re.IGNORECASE)
    nickname_val = ""
    if match_nick:
        nickname_val = match_nick.group(1).strip()
        titulo = f"Nickname: {nickname_val}"
    elif match_id:
        nickname_val = f"#{match_id.group(1).strip()}"
        titulo = f"ID: {nickname_val}"
    else:
        return None

    juegos = [
        linea.strip()
        for linea in secciones[2].splitlines()
        if linea.strip() and not linea.strip().startswith(('ID:', 'Child:', 'Balance:', 'Gold points:', 'CC:', 'Orders:', 'Devices:', 'Country:', 'Active Plan:', 'Game Voucher:'))
    ]
    if not juegos:
        return None
    match_precio = re.search(r'💰\s*PRECIO:\s*([\d.]+)\s*USDT', secciones[3], re.IGNORECASE)
    if not match_precio:
        return None
    try:
        precio_usdt_val = float(match_precio.group(1))
    except ValueError:
        return None
    precio_usd = int(round(precio_usdt_val))
    precio_clp, precio_usdt_calc = calcular_precios(precio_usd)
    return {
        "nickname": nickname_val,
        "titulo": titulo,
        "juegos": juegos,
        "precio_usd": precio_usd,
        "costo_usd": precio_usd,
        "costo_clp": precio_usd * 1000,
        "precio_clp": precio_clp,
        "precio_usdt": precio_usdt_calc,
        "horario_limitado": False
    }

def parsear_tipo4(texto: str):
    lineas = [l.strip() for l in texto.splitlines() if l.strip()]
    if not lineas or not re.match(r"^[A-Z0-9]{3,10}$", lineas[0]):
        return None
    codigo = lineas[0]
    if "Country:US" not in texto and "Country: US" not in texto:
        return None
    match_juegos = re.search(r"---- List Game ----(.*?)----End Game List ----", texto, re.S)
    if not match_juegos:
        return None
    juegos = [j.strip() for j in match_juegos.group(1).splitlines() if j.strip()]
    if len(juegos) < 3:
        return None
    match_precio = re.search(r"Price\s*:\s*(\d+)\$", texto)
    if not match_precio:
        return None
    precio_usd = int(match_precio.group(1))
    precio_clp, precio_usdt = calcular_precios(precio_usd)
    return {
        "nickname": codigo,
        "titulo": f"Código: {codigo}",
        "juegos": juegos,
        "precio_usd": precio_usd,
        "costo_usd": precio_usd,
        "costo_clp": precio_usd * 1000,
        "precio_clp": precio_clp,
        "precio_usdt": precio_usdt,
        "horario_limitado": True
    }

def parsear_tipo5(texto: str):
    if "NUEVA CUENTA DISPONIBLE" not in texto or "CUENTA VENDIDA" in texto:
        return None

    # ID o Nickname
    match_id = re.search(r"(?:ID:\s*#?|Nickname:\s*)([^\n]+)", texto, re.IGNORECASE)
    if not match_id:
        return None
    raw_id = match_id.group(1).strip()
    nickname = raw_id if raw_id.startswith("#") else f"#{raw_id}"

    # Dispositivos vinculados: solo 0, 1 o 2 consolas permitidas
    match_dev = re.search(r"Devices:\s*\[(.*?)\]", texto, re.IGNORECASE)
    devices = []
    if match_dev:
        devices = [d.strip() for d in match_dev.group(1).split(",") if d.strip()]
        if len(devices) > 2:
            return None

    # Extracción de lista de juegos
    juegos = []
    barras = re.split(r"[━]{10,}", texto)
    if len(barras) >= 4:
        for linea in barras[2].splitlines():
            linea_limpia = re.sub(r"\[\s*\d+(?:\.\d+)?\s*GB\s*\]", "", linea, flags=re.IGNORECASE).strip()
            if linea_limpia and not linea_limpia.lower().startswith("game voucher"):
                juegos.append(linea_limpia)
    else:
        match_games = re.search(r"(?:Game Voucher:[^\n]*[\r\n]+|[━]{10,}[\r\n]+)(.*?)(?=\n[━]{10,}|\n💰|\nPRECIO:)", texto, re.S | re.IGNORECASE)
        if match_games:
            for linea in match_games.group(1).splitlines():
                linea_limpia = re.sub(r"\[\s*\d+(?:\.\d+)?\s*GB\s*\]", "", linea, flags=re.IGNORECASE).strip()
                if linea_limpia and not re.match(r"^(Child:|Devices:|CC:|Active Plan:|Game Voucher:|Balance:|Gold points:|Orders:|Country:)", linea_limpia, re.IGNORECASE):
                    juegos.append(linea_limpia)

    if not juegos:
        return None

    # Precio en USDT
    match_precio = re.search(r"(?:Precio:|💰 PRECIO:)\s*([\d.]+)\s*USDT", texto, re.IGNORECASE)
    if not match_precio:
        match_precio = re.search(r"Price\s*:\s*(\d+)\$", texto)
        if not match_precio:
            return None
        precio_usdt = float(match_precio.group(1))
    else:
        precio_usdt = float(match_precio.group(1))

    precio_usd = int(round(precio_usdt))
    precio_clp, precio_usdt_calc = calcular_precios(precio_usd)

    return {
        "nickname": nickname,
        "titulo": f"ID: {nickname}",
        "juegos": juegos,
        "dispositivos": devices,
        "precio_usd": precio_usd,
        "costo_usd": precio_usd,
        "costo_clp": precio_usd * 1000,
        "precio_clp": precio_clp,
        "precio_usdt": precio_usdt_calc,
        "horario_limitado": False
    }

# ================= CONSTRUCCIÓN DE MENSAJES =================
def construir_mensaje_pack(pack: dict, es_revendedor: bool = False, bot_username: str = "PandaStoreBot"):
    precio_usd = pack.get("precio_usd", 0)
    id_str = pack.get("id_pack", "")
    id_param = id_str.replace("#", "").replace("-", "_")

    if es_revendedor:
        clp, usdt = calcular_precios_revendedor(precio_usd)
        header = "🐼 PANDA STORE | PROVEEDOR DIRECTO 👑"
        etiqueta_precio = f"💰 PRECIO MAYORISTA: ${clp:,} CLP | {usdt} USDT".replace(",", ".")
        subtitulo = "Cuenta Primaria (Juega desde tu propio usuario)"
    else:
        clp, usdt = calcular_precios_publico(precio_usd)
        header = "🎮 PANDA STORE • PACK NINTENDO SWITCH"
        subtitulo = "Cuenta Primaria (Juega desde tu propio usuario)"
        etiqueta_precio = f"💰 PRECIO: ${clp:,} CLP / {usdt} USDT".replace(",", ".")

    horario = "De 12:00 a 20:00 hrs" if pack.get("horario_limitado") else "Las 24 horas"

    mensaje = (
        f"{header}\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"ID: {id_str}  |  {subtitulo}\n\n"
        f"🔥 JUEGOS INCLUIDOS:\n"
    )

    juegos = pack.get("juegos", [])
    mostrar_juegos = juegos[:25]
    for j in mostrar_juegos:
        mensaje += f"• {j}\n"
    if len(juegos) > 25:
        mensaje += f"• ... y {len(juegos) - 25} títulos más incluidos\n"

    mensaje += (
        f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"{etiqueta_precio}\n"
        f"⏰ DISPONIBILIDAD: {horario}\n"
        f"💳 PAGO: BancoEstado • Mercado Pago • USDT • PayPal\n"
    )

    # Botones
    url_comprar_bot = f"https://t.me/{bot_username}?start=buy_{id_param}"
    url_testimonios = TESTIMONIOS_URL
    url_contacto = f"https://t.me/{TELEGRAM_CONTACT}?text=Hola!%20Deseo%20comprar%20el%20{urllib.parse.quote(id_str)}"

    botones = [
        [
            InlineKeyboardButton("🛒 COMPRAR PACK", url=url_comprar_bot),
            InlineKeyboardButton("📸 VENTAS ANTERIORES", url=url_testimonios)
        ],
        [
            InlineKeyboardButton("📩 CONTACTO DIRECTO", url=url_contacto)
        ]
    ]

    return mensaje, InlineKeyboardMarkup(botones)

# ================= MENÚ PRINCIPAL Y CLIENTES =================
async def comando_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja el comando /start con soporte para compras directas (?start=buy_PACK_XXX)"""
    user = update.effective_user
    args = context.args or []

    # Si viene desde un botón de compra en el canal: /start buy_PACK_123
    if args and args[0].startswith("buy_"):
        raw_id = args[0].replace("buy_", "").replace("_", "-")
        id_pack = f"#{raw_id}" if not raw_id.startswith("#") else raw_id
        await iniciar_flujo_compra(update, context, id_pack)
        return

    # Menú Principal para clientes
    teclado = [
        [
            InlineKeyboardButton("🎁 Ver Promociones", callback_data="menu_promos"),
            InlineKeyboardButton("📸 Ventas Anteriores", url=TESTIMONIOS_URL)
        ],
        [
            InlineKeyboardButton("📖 Guía de Instalación", url=GUIA_INSTALL_URL),
            InlineKeyboardButton("🌐 Visitar Tienda Web", url=WEBSITE_URL)
        ],
        [
            InlineKeyboardButton("👤 Hablar con Soporte Humano", url=f"https://t.me/{TELEGRAM_CONTACT}")
        ]
    ]

    # Botones adicionales si es el ADMIN
    if user and user.id == ADMIN_ID:
        teclado.append([
            InlineKeyboardButton("⚙️ Panel Admin / Estado Cola", callback_data="admin_estado"),
            InlineKeyboardButton("🧹 Limpiar Cola", callback_data="admin_limpiar")
        ])

    texto_bienvenida = (
        f"👋 ¡Hola, *{user.first_name if user else 'Gamer'}*! Bienvenido a *Panda Store* 🐼🎮\n\n"
        "Somos especialistas en videojuegos digitales, cuentas primarias y ofertas exclusivas con entrega rápida.\n\n"
        "¿Qué deseas realizar hoy? Selecciona una opción:"
    )

    if update.message:
        await update.message.reply_text(texto_bienvenida, reply_markup=InlineKeyboardMarkup(teclado), parse_mode="Markdown")
    elif update.callback_query:
        await update.callback_query.edit_message_text(texto_bienvenida, reply_markup=InlineKeyboardMarkup(teclado), parse_mode="Markdown")

async def iniciar_flujo_compra(update: Update, context: ContextTypes.DEFAULT_TYPE, id_pack: str):
    """Muestra los datos del pack y opciones de pago al cliente"""
    # Guardar en contexto del usuario para asociar el comprobante
    context.user_data["comprando_pack"] = id_pack

    # Buscar detalles del pack en registro local o en memoria
    info = obtener_pack_registrado(id_pack)
    pack_data = info.get("pack", {}) if info else {}
    precio_clp = pack_data.get("precio_clp", 0)
    precio_usdt = pack_data.get("precio_usdt", 0)
    titulo = pack_data.get("titulo", "Cuenta Nintendo Switch")

    texto_precio = f"${precio_clp:,} CLP / {precio_usdt} USDT".replace(",", ".") if precio_clp else "Verificar con admin"

    teclado = [
        [
            InlineKeyboardButton("🏦 BancoEstado (Cuenta RUT)", callback_data=f"pagar_bancoestado_{id_pack}"),
            InlineKeyboardButton("💙 Mercado Pago", callback_data=f"pagar_mercadopago_{id_pack}")
        ],
        [
            InlineKeyboardButton("🪙 USDT (BEP20)", callback_data=f"pagar_crypto_{id_pack}"),
            InlineKeyboardButton("👤 Ayuda / Soporte", url=f"https://t.me/{TELEGRAM_CONTACT}")
        ],
        [
            InlineKeyboardButton("🔙 Volver al Menú", callback_data="volver_menu")
        ]
    ]

    texto = (
        f"🛒 *DETALLES DE TU COMPRA*\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"📦 *Pack:* `{id_pack}`\n"
        f"👤 *Detalle:* {titulo}\n"
        f"💰 *Total a Transferir:* {texto_precio}\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"👉 *Selecciona el método de pago que prefieres usar:*"
    )

    if update.message:
        await update.message.reply_text(texto, reply_markup=InlineKeyboardMarkup(teclado), parse_mode="Markdown")
    elif update.callback_query:
        await update.callback_query.edit_message_text(texto, reply_markup=InlineKeyboardMarkup(teclado), parse_mode="Markdown")

async def callback_router(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data

    # Volver al menú
    if data == "volver_menu":
        await comando_start(update, context)
        return

    # Ver Promociones
    if data == "menu_promos":
        teclado = [
            [
                InlineKeyboardButton("🔥 Ver Catálogo Web de Promos", url=PROMOS_URL)
            ],
            [
                InlineKeyboardButton("🔙 Volver", callback_data="volver_menu")
            ]
        ]
        texto_promos = (
            "🎁 *PROMOCIONES DESTACADAS — PANDA STORE*\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "🔥 *Pack 3X Steam:* Lleva 3 juegos a elección por $4.990 CLP\n"
            "🔥 *Pack 10X Steam:* Lleva 10 juegos por $9.990 CLP\n"
            "🔥 *Pack 2X Nintendo Switch:* 2 juegos por $25.000 CLP\n"
            "🔥 *Pack 3X Nintendo Switch:* 3 juegos por $35.000 CLP\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "Puedes ver todas las opciones disponibles y armar tu pack en nuestra web:"
        )
        await query.edit_message_text(texto_promos, reply_markup=InlineKeyboardMarkup(teclado), parse_mode="Markdown")
        return

    # Métodos de Pago
    if data.startswith("pagar_"):
        partes = data.split("_", 2)
        metodo = partes[1]
        id_pack = partes[2] if len(partes) > 2 else "PACK"
        info_pago = DATOS_PAGO.get(metodo)

        if info_pago:
            teclado = [
                [
                    InlineKeyboardButton("🔄 Cambiar Método de Pago", callback_data=f"buy_volver_{id_pack}"),
                    InlineKeyboardButton("👤 Contactar al Admin", url=f"https://t.me/{TELEGRAM_CONTACT}")
                ]
            ]
            texto_pago = (
                f"{info_pago['texto']}\n\n"
                f"📸 *PASO FINAL — SUBIR COMPROBANTE:*\n"
                f"Una vez realizada la transferencia, *envía una foto o captura de pantalla del comprobante directamente a este chat*.\n\n"
                f"🤖 Nuestro sistema notificará al administrador de inmediato para validarlo y entregarte tu cuenta."
            )
            await query.edit_message_text(texto_pago, reply_markup=InlineKeyboardMarkup(teclado), parse_mode="Markdown")
            context.user_data["comprando_pack"] = id_pack
            context.user_data["metodo_pago"] = info_pago["nombre"]
        return

    if data.startswith("buy_volver_"):
        id_pack = data.replace("buy_volver_", "")
        await iniciar_flujo_compra(update, context, id_pack)
        return

    # Acciones de Admin
    if update.effective_user.id == ADMIN_ID:
        if data == "admin_estado":
            await comando_cola(update, context)
        elif data == "admin_limpiar":
            await comando_limpiar(update, context)
        elif data.startswith("admin_import_"):
            # Opciones de importación: admin_import_10, admin_import_100, admin_import_todos, admin_import_cancelar
            tipo = data.replace("admin_import_", "")
            await procesar_decision_importacion(update, context, tipo)
        elif data.startswith("marcar_vendido_"):
            id_pack = data.replace("marcar_vendido_", "")
            await ejecutar_marcar_vendido(update, context, id_pack)

# ================= COMPROBANTES DE PAGO =================
async def manejar_foto_comprobante(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe la foto o captura enviada por el cliente y se la envía al ADMIN"""
    user = update.effective_user
    id_pack = context.user_data.get("comprando_pack", "NO_ESPECIFICADO")
    metodo = context.user_data.get("metodo_pago", "Transferencia")

    # Si es el admin subiendo algo no hacemos nada de flujo de compra
    if user.id == ADMIN_ID and "comprando_pack" not in context.user_data:
        return

    # Obtener la foto de mayor resolución
    foto = update.message.photo[-1]
    file_id = foto.file_id

    # Responder al cliente
    await update.message.reply_text(
        "✅ *¡Comprobante recibido con éxito!* 🐼🎉\n\n"
        f"📦 *Pack:* `{id_pack}`\n"
        "👨‍💻 El administrador ya fue notificado y está validando la transferencia.\n"
        "Te entregaremos los datos de acceso de tu cuenta por este mismo chat en breve.",
        parse_mode="Markdown"
    )

    # Notificar al ADMIN con foto y botones de acción
    username_str = f"@{user.username}" if user.username else f"ID {user.id}"
    caption_admin = (
        "🚨 *¡NUEVO COMPROBANTE DE PAGO RECIBIDO!* 💰\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"📦 *Pack:* `{id_pack}`\n"
        f"👤 *Cliente:* {user.first_name} ({username_str})\n"
        f"💳 *Método:* {metodo}\n"
        f"🕐 *Hora:* {datetime.now().strftime('%H:%M:%S')}\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "👉 Revisa la imagen adjunta. Si todo está correcto, puedes marcar el pack como vendido para borrarlo del canal."
    )

    url_chat_cliente = f"tg://user?id={user.id}" if not user.username else f"https://t.me/{user.username}"
    teclado_admin = [
        [
            InlineKeyboardButton("🔴 Marcar como Vendido (Borrar del canal)", callback_data=f"marcar_vendido_{id_pack}")
        ],
        [
            InlineKeyboardButton("💬 Abrir Chat con Cliente", url=url_chat_cliente)
        ]
    ]

    try:
        await context.bot.send_photo(
            chat_id=ADMIN_ID,
            photo=file_id,
            caption=caption_admin,
            reply_markup=InlineKeyboardMarkup(teclado_admin),
            parse_mode="Markdown"
        )
    except Exception as e:
        print(f"⚠️ Error notificando comprobante al admin: {e}")

# ================= CONTROL DE STOCK Y VENDIDOS =================
async def ejecutar_marcar_vendido(update: Update, context: ContextTypes.DEFAULT_TYPE, id_pack: str):
    """Borra el mensaje del canal y actualiza Firestore"""
    query = update.callback_query
    reg_info = obtener_pack_registrado(id_pack)

    msg_borrado = False
    if reg_info and CANAL_PUBLICO_ID:
        msg_id = reg_info.get("msg_id_publico")
        if msg_id:
            try:
                await context.bot.delete_message(chat_id=CANAL_PUBLICO_ID, message_id=msg_id)
                msg_borrado = True
            except Exception as e:
                print(f"⚠️ No se pudo borrar mensaje {msg_id} de Telegram: {e}")

    # Actualizar Firestore
    await asyncio.to_thread(desmarcar_pack_firestore, id_pack)
    eliminar_pack_registrado(id_pack)

    resultado = f"✅ *Pack {id_pack} marcado como VENDIDO*\n"
    resultado += "• Mensaje eliminado del canal de Telegram\n" if msg_borrado else "• (El mensaje ya no existía en el canal)\n"
    resultado += "• Estado actualizado a 'No disponible' en la Tienda / Firestore."

    if query:
        await query.edit_message_caption(caption=resultado, parse_mode="Markdown")
    elif update.message:
        await update.message.reply_text(resultado, parse_mode="Markdown")

async def comando_vendido(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /vendido #PACK-XXX para el Admin"""
    if update.effective_user.id != ADMIN_ID:
        return
    if not context.args:
        await update.message.reply_text("Uso: `/vendido #PACK-001`", parse_mode="Markdown")
        return
    id_pack = context.args[0].strip()
    if not id_pack.startswith("#"):
        id_pack = f"#{id_pack}"
    await ejecutar_marcar_vendido(update, context, id_pack)

# ================= WORKER PUBLICADOR =================
async def enviar_canal_publico(bot, pack: dict):
    if not CANAL_PUBLICO_ID:
        return None
    bot_info = await bot.get_me()
    msg_pub, markup_pub = construir_mensaje_pack(pack, es_revendedor=False, bot_username=bot_info.username)
    for intento in range(3):
        try:
            sent = await bot.send_message(chat_id=CANAL_PUBLICO_ID, text=msg_pub, reply_markup=markup_pub)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] 📤 Pack {pack.get('id_pack')} publicado en CANAL PÚBLICO")
            return sent.message_id
        except RetryAfter as e:
            print(f"⚠️ RateLimit (Público): esperando {e.retry_after}s...")
            await asyncio.sleep(e.retry_after + 0.5)
        except Exception as e:
            if intento == 2:
                print(f"⚠️ Error publicando en canal público: {e}")
            await asyncio.sleep(0.5)
    return None

async def enviar_canal_revendedores(bot, pack: dict):
    if not CANAL_REVENDEDORES_ID or CANAL_REVENDEDORES_ID == 0:
        return None
    bot_info = await bot.get_me()
    msg_rev, markup_rev = construir_mensaje_pack(pack, es_revendedor=True, bot_username=bot_info.username)
    for intento in range(3):
        try:
            sent = await bot.send_message(chat_id=CANAL_REVENDEDORES_ID, text=msg_rev, reply_markup=markup_rev)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] 📤 Pack {pack.get('id_pack')} publicado en CANAL REVENDEDORES")
            return sent.message_id
        except RetryAfter as e:
            print(f"⚠️ RateLimit (Revendedores): esperando {e.retry_after}s...")
            await asyncio.sleep(e.retry_after + 0.5)
        except Exception as e:
            if intento == 2:
                print(f"⚠️ Error publicando en canal revendedores: {e}")
            await asyncio.sleep(0.5)
    return None

async def worker_publicador(bot):
    """Worker de publicación con soporte para pausar / cancelar"""
    global CANCELAR_SUBIDA_FLAG
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 🚀 Worker de publicación iniciado")
    while True:
        try:
            pack = await cola_packs.get()

            if CANCELAR_SUBIDA_FLAG:
                cola_packs.task_done()
                continue

            # Publicar en paralelo
            task_pub = enviar_canal_publico(bot, pack)
            task_rev = enviar_canal_revendedores(bot, pack)

            resultados = await asyncio.gather(task_pub, task_rev, return_exceptions=True)

            msg_id_pub = resultados[0] if (resultados and isinstance(resultados[0], int)) else None
            msg_id_rev = resultados[1] if (len(resultados) > 1 and isinstance(resultados[1], int)) else None

            # Guardar en registro local
            if msg_id_pub:
                guardar_registro_publicado(pack.get("id_pack"), msg_id_pub, msg_id_rev, pack)

            # Guardar en Firestore
            await asyncio.to_thread(guardar_pack_firestore, pack, msg_id_pub)

            cola_packs.task_done()
            await asyncio.sleep(1.2)

        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Error en worker: {e}")
            await asyncio.sleep(1.0)

# ================= COMANDOS ADMIN =================
async def comando_cola(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        return
    estado = (
        f"📊 *ESTADO DE LA COLA*\n\n"
        f"📦 Packs pendientes: *{cola_packs.qsize()}*\n"
        f"🕐 Hora actual: {datetime.now().strftime('%H:%M:%S')}\n"
    )
    if update.message:
        await update.message.reply_text(estado, parse_mode="Markdown")
    elif update.callback_query:
        await update.callback_query.edit_message_text(estado, parse_mode="Markdown")

async def comando_limpiar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        return
    count = 0
    while not cola_packs.empty():
        await cola_packs.get()
        cola_packs.task_done()
        count += 1
    msg = f"✅ Cola vaciada (*{count}* packs eliminados de la lista de espera)."
    if update.message:
        await update.message.reply_text(msg, parse_mode="Markdown")
    elif update.callback_query:
        await update.callback_query.edit_message_text(msg, parse_mode="Markdown")

async def comando_cancelar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /cancelar para detener inmediatamente la subida masiva"""
    global CANCELAR_SUBIDA_FLAG
    if update.effective_user.id != ADMIN_ID:
        return
    CANCELAR_SUBIDA_FLAG = True
    count = 0
    while not cola_packs.empty():
        await cola_packs.get()
        cola_packs.task_done()
        count += 1
    CANCELAR_SUBIDA_FLAG = False
    await update.message.reply_text(f"🛑 *Subida cancelada de inmediato.* Se descartaron {count} packs que estaban en cola.", parse_mode="Markdown")

async def comando_borrar_packs(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Borra del canal todos los mensajes de packs registrados por el bot"""
    if update.effective_user.id != ADMIN_ID:
        return
    reg = cargar_registro_publicados()
    if not reg:
        await update.message.reply_text("ℹ️ No hay registros de packs publicados para borrar.")
        return

    await update.message.reply_text(f"🧹 Iniciando borrado de {len(reg)} packs del canal...")
    borrados = 0
    fallidos = 0
    ids_a_borrar = list(reg.keys())

    for id_pack in ids_a_borrar:
        info = reg.get(id_pack, {})
        msg_id = info.get("msg_id_publico")
        if msg_id and CANAL_PUBLICO_ID:
            try:
                await context.bot.delete_message(chat_id=CANAL_PUBLICO_ID, message_id=msg_id)
                borrados += 1
            except Exception:
                fallidos += 1
        eliminar_pack_registrado(id_pack)
        await asyncio.sleep(0.3)

    await update.message.reply_text(f"✅ *Borrado finalizado:*\n• {borrados} eliminados con éxito\n• {fallidos} ya no existían en el canal.", parse_mode="Markdown")

# ================= MANEJO DE MENSAJES DE TEXTO Y ARCHIVOS =================
def extraer_texto_telegram(raw_text):
    if isinstance(raw_text, str):
        return raw_text.strip()
    elif isinstance(raw_text, list):
        partes = []
        for elem in raw_text:
            if isinstance(elem, str):
                partes.append(elem)
            elif isinstance(elem, dict) and "text" in elem:
                partes.append(str(elem["text"]))
        return "".join(partes).strip()
    return ""

def extraer_packs_de_json_file(file_path: str, solo_nuevos: bool = True):
    if not os.path.exists(file_path):
        return []
    try:
        with open(file_path, "r", encoding="utf-8-sig") as f:
            data = json.load(f)
    except Exception as e:
        print(f"⚠️ Error leyendo JSON: {e}")
        return []

    messages = data.get("messages", [])
    if not messages and isinstance(data, list):
        messages = data

    packs = []
    huellas_en_este_archivo = set()

    for msg in messages:
        if not isinstance(msg, dict) or msg.get("type") != "message":
            continue
        raw_text = msg.get("text", "")
        texto = extraer_texto_telegram(raw_text)
        if not texto:
            continue
        pack = (parsear_tipo5(texto) or 
                parsear_tipo4(texto) or 
                parsear_tipo1(texto) or 
                parsear_tipo2(texto) or 
                parsear_tipo3(texto))
        if pack:
            huella = calcular_huella_pack(pack)
            pack["huella"] = huella

            # Si ya se procesó en el canal o ya apareció duplicado en este mismo archivo, se ignora
            if solo_nuevos and (huella in huellas_en_este_archivo or pack_ya_fue_procesado(pack)):
                continue

            huellas_en_este_archivo.add(huella)
            packs.append(pack)

    return packs

async def manejar_mensaje_admin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Parsea un mensaje individual enviado por el admin"""
    if not update.effective_user or update.effective_user.id != ADMIN_ID:
        return

    texto = update.message.text.strip()
    pack = (parsear_tipo5(texto) or 
            parsear_tipo4(texto) or 
            parsear_tipo1(texto) or 
            parsear_tipo2(texto) or 
            parsear_tipo3(texto))

    if not pack:
        await update.message.reply_text("❌ Mensaje no reconocido o formato inválido.")
        return

    pack["id_pack"] = obtener_siguiente_id_pack()
    await cola_packs.put(pack)

    await update.message.reply_text(
        f"✅ *Pack encolado:* `{pack['id_pack']}`\n"
        f"📌 *{pack['titulo']}*\n"
        f"🎮 {len(pack['juegos'])} juegos\n"
        f"💰 {pack['precio_clp']:,} CLP\n"
        f"⏱️ Posición en cola: {cola_packs.qsize()}",
        parse_mode="Markdown"
    )

async def manejar_documento_json(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Al subir un JSON, pregunta cuántos packs desea publicar"""
    if not update.effective_user or update.effective_user.id != ADMIN_ID:
        return

    doc = update.message.document
    if not doc or not doc.file_name or not doc.file_name.lower().endswith(".json"):
        return

    await update.message.reply_text(f"📥 Leyendo `{doc.file_name}`...", parse_mode="Markdown")
    temp_path = os.path.join(os.path.dirname(__file__), "temp_import.json")

    try:
        tg_file = await context.bot.get_file(doc.file_id)
        await tg_file.download_to_drive(temp_path)

        packs = await asyncio.to_thread(extraer_packs_de_json_file, temp_path)

        if not packs:
            await update.message.reply_text(f"⚠️ No se encontraron packs válidos en `{doc.file_name}`.", parse_mode="Markdown")
            return

        PENDING_IMPORT_DATA["ultimo_lote"] = packs

        teclado = [
            [
                InlineKeyboardButton("🔟 Subir primeros 10", callback_data="admin_import_10"),
                InlineKeyboardButton("💯 Subir primeros 100", callback_data="admin_import_100")
            ],
            [
                InlineKeyboardButton(f"🚀 Subir TODOS ({len(packs)} packs)", callback_data="admin_import_todos")
            ],
            [
                InlineKeyboardButton("❌ Cancelar", callback_data="admin_import_cancelar")
            ]
        ]

        await update.message.reply_text(
            f"📄 *Archivo analizado con éxito*\n"
            f"📦 Total de packs detectados: *{len(packs)}*\n\n"
            f"¿Cuántos packs deseas publicar en el canal?",
            reply_markup=InlineKeyboardMarkup(teclado),
            parse_mode="Markdown"
        )
    except Exception as e:
        await update.message.reply_text(f"❌ Error procesando archivo: {e}")
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

async def procesar_decision_importacion(update: Update, context: ContextTypes.DEFAULT_TYPE, tipo: str):
    query = update.callback_query
    packs = PENDING_IMPORT_DATA.get("ultimo_lote", [])

    if tipo == "cancelar":
        PENDING_IMPORT_DATA.pop("ultimo_lote", None)
        await query.edit_message_text("❌ *Importación cancelada.* Ningún pack fue encolado.", parse_mode="Markdown")
        return

    if not packs:
        await query.edit_message_text("⚠️ La lista de packs expiró. Por favor envía el archivo JSON nuevamente.")
        return

    if tipo == "10":
        seleccionados = packs[:10]
    elif tipo == "100":
        seleccionados = packs[:100]
    else:
        seleccionados = packs

    for p in seleccionados:
        if not p.get("id_pack"):
            p["id_pack"] = obtener_siguiente_id_pack()
        await cola_packs.put(p)

    PENDING_IMPORT_DATA.pop("ultimo_lote", None)

    await query.edit_message_text(
        f"✅ *¡{len(seleccionados)} packs encolados con éxito!*\n"
        f"🚀 Se están publicando a máxima velocidad.\n"
        f"📦 Packs pendientes en cola: *{cola_packs.qsize()}*\n\n"
        f"💡 Puedes usar `/cancelar` en cualquier momento para detener la publicación.",
        parse_mode="Markdown"
    )

async def comando_importar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /importar para procesar result.json local"""
    if not update.effective_user or update.effective_user.id != ADMIN_ID:
        return

    json_path = os.path.join(os.path.dirname(__file__), "result.json")
    if not os.path.exists(json_path):
        await update.message.reply_text("❌ No se encontró `result.json` en la carpeta del bot.\n👉 Envíame el archivo .json directamente como adjunto.", parse_mode="Markdown")
        return

    await update.message.reply_text("📄 Procesando `result.json` local...", parse_mode="Markdown")
    packs = await asyncio.to_thread(extraer_packs_de_json_file, json_path)

    if not packs:
        await update.message.reply_text("⚠️ No se encontraron packs válidos en `result.json`.", parse_mode="Markdown")
        return

    PENDING_IMPORT_DATA["ultimo_lote"] = packs
    teclado = [
        [
            InlineKeyboardButton("🔟 Subir primeros 10", callback_data="admin_import_10"),
            InlineKeyboardButton("💯 Subir primeros 100", callback_data="admin_import_100")
        ],
        [
            InlineKeyboardButton(f"🚀 Subir TODOS ({len(packs)} packs)", callback_data="admin_import_todos")
        ],
        [
            InlineKeyboardButton("❌ Cancelar", callback_data="admin_import_cancelar")
        ]
    ]

    await update.message.reply_text(
        f"📄 *result.json analizado*\n"
        f"📦 Total detectado: *{len(packs)} packs*\n\n"
        f"Selecciona cuántos deseas publicar:",
        reply_markup=InlineKeyboardMarkup(teclado),
        parse_mode="Markdown"
    )

async def iniciar_worker(application: Application):
    asyncio.create_task(worker_publicador(application.bot))
    print("✅ Worker de publicación activo")

# ================= INICIAR BOT =================
if __name__ == "__main__":
    init_firebase()

    app = (
        ApplicationBuilder()
        .token(TOKEN)
        .post_init(iniciar_worker)
        .build()
    )

    # Handlers Comandos
    app.add_handler(CommandHandler("start", comando_start))
    app.add_handler(CommandHandler("cola", comando_cola))
    app.add_handler(CommandHandler("limpiar", comando_limpiar))
    app.add_handler(CommandHandler("cancelar", comando_cancelar))
    app.add_handler(CommandHandler("vendido", comando_vendido))
    app.add_handler(CommandHandler("borrar_packs", comando_borrar_packs))
    app.add_handler(CommandHandler("importar", comando_importar))

    # Handlers Mensajes y Fotos
    app.add_handler(MessageHandler(filters.PHOTO, manejar_foto_comprobante))
    app.add_handler(MessageHandler(filters.Document.ALL, manejar_documento_json))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, manejar_mensaje_admin))

    # Handlers Callbacks (Botonera interactiva)
    app.add_handler(CallbackQueryHandler(callback_router))

    print("=" * 60)
    print("🐼 PANDA STORE BOT — SISTEMA INTEGRAL 2.0")
    print("=" * 60)
    print(f"🤖 Bot iniciado | Admin ID: {ADMIN_ID}")
    print(f"📢 Canal Destino: {CANAL_PUBLICO_ID}")
    print("=" * 60)

    app.run_polling()