import sys
import os
import asyncio
import json
import re

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

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

API_ID = int(os.getenv("TELEGRAM_API_ID", "30206472"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "1acbc78fb915e220980938cbc036cecb")

from telethon import TelegramClient

from bot import (
    parsear_tipo1,
    parsear_tipo2,
    parsear_tipo3,
    parsear_tipo4,
    parsear_tipo5,
    obtener_siguiente_id_pack
)

async def main():
    print("=" * 60)
    print("🚀 EXTRACTOR MASIVO DE PACKS DE TELEGRAM (USERBOT)")
    print("=" * 60)

    print("\n🔑 Conectando a Telegram con tus credenciales...")
    session_file = os.path.join(os.path.dirname(__file__), "userbot_session")
    client = TelegramClient(session_file, API_ID, API_HASH)
    
    await client.start()
    print("✅ Conexión exitosa a tu cuenta de Telegram")

    print("\n📋 Cargando la lista de tus canales y grupos de Telegram...")
    dialogs = await client.get_dialogs()
    canales = [d for d in dialogs if d.is_channel or d.is_group]

    if not canales:
        print("⚠️ No se encontraron canales o grupos en tu cuenta.")
        await client.disconnect()
        return

    print("\n📌 CANALES Y GRUPOS DISPONIBLES EN TU CUENTA:")
    print("--------------------------------------------------")
    for idx, c in enumerate(canales, 1):
        print(f" {idx:2d}. {c.name} (ID: {c.id})")
    print("--------------------------------------------------")

    entrada = input("\n👉 Ingresa el NÚMERO de la lista, o pega el enlace/mensaje del canal privado: ").strip()

    entity = None
    if entrada.isdigit() and 1 <= int(entrada) <= len(canales):
        entity = canales[int(entrada) - 1].entity
        canal_nombre = canales[int(entrada) - 1].name
    else:
        # Si pega un enlace de mensaje ej: https://t.me/c/1553070593/1234 o nombre
        try:
            match_c = re.search(r't\.me/c/(\d+)', entrada)
            if match_c:
                channel_id = int(f"-100{match_c.group(1)}")
                entity = await client.get_entity(channel_id)
            else:
                entity = await client.get_entity(entrada)
            canal_nombre = getattr(entity, 'title', entrada)
        except Exception as e:
            print(f"❌ No se pudo encontrar el canal con '{entrada}': {e}")
            await client.disconnect()
            return

    limite_str = input("👉 ¿Cuántos mensajes deseas escanear? (Presiona ENTER para 1000): ").strip()
    limite = int(limite_str) if limite_str.isdigit() else 1000

    print(f"\n📡 Escaneando los últimos {limite} mensajes en: {canal_nombre}...")

    mensajes_exportados = []
    packs_detectados = 0

    async for msg in client.iter_messages(entity, limit=limite, reverse=True):
        if msg.text:
            texto = msg.text.strip()
            # Validar si es un pack
            pack = (parsear_tipo5(texto) or 
                    parsear_tipo4(texto) or 
                    parsear_tipo1(texto) or 
                    parsear_tipo2(texto) or 
                    parsear_tipo3(texto))
            if pack:
                packs_detectados += 1
                mensajes_exportados.append({
                    "id": msg.id,
                    "type": "message",
                    "date": msg.date.isoformat() if msg.date else "",
                    "text": texto
                })

    print(f"\n==================================================")
    print(f"✅ ESCANEO COMPLETADO: Se encontraron {packs_detectados} packs válidos de {limite} mensajes.")
    print(f"==================================================")

    if packs_detectados > 0:
        json_output = os.path.join(os.path.dirname(__file__), "result.json")
        data_structure = {
            "name": canal_nombre,
            "type": "public_channel",
            "id": getattr(entity, "id", 0),
            "messages": mensajes_exportados
        }
        with open(json_output, "w", encoding="utf-8") as f:
            json.dump(data_structure, f, ensure_ascii=False, indent=2)
        
        print(f"💾 Archivo result.json guardado con éxito en:")
        print(f"   {json_output}")
        print("\n👉 Ahora puedes enviar el comando /importar en Telegram")
        print("   o arrastrar el archivo result.json directamente a tu chat del Bot para enviarlos todos.")

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
