import json
import os
import sys
import re

# Importar funciones de parseo desde bot.py
from bot import (
    parsear_tipo1,
    parsear_tipo2,
    parsear_tipo3,
    parsear_tipo4,
    parsear_tipo5,
    obtener_siguiente_id_pack,
    guardar_pack_firestore,
    enviar_canal_publico,
    enviar_canal_revendedores,
    construir_mensaje_pack
)

def extraer_texto(raw_text):
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

def procesar_archivo_json(json_path):
    if not os.path.exists(json_path):
        print(f"❌ No se encontró el archivo: {json_path}")
        return []

    print(f"📄 Leyendo {json_path}...")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    messages = data.get("messages", [])
    if not messages and isinstance(data, list):
        messages = data

    print(f"🔍 Analizando {len(messages)} mensajes exportados...")

    packs_encontrados = []
    for msg in messages:
        if not isinstance(msg, dict):
            continue
        
        # Filtrar solo mensajes de texto
        if msg.get("type") != "message":
            continue

        raw_text = msg.get("text", "")
        texto = extraer_texto(raw_text)

        if not texto:
            continue

        # Intentar parsear con los 5 formatos
        pack = (parsear_tipo5(texto) or 
                parsear_tipo4(texto) or 
                parsear_tipo1(texto) or 
                parsear_tipo2(texto) or 
                parsear_tipo3(texto))

        if pack:
            pack["id_pack"] = obtener_siguiente_id_pack()
            packs_encontrados.append(pack)

    print(f"✅ ¡Se identificaron {len(packs_encontrados)} packs válidos!")
    return packs_encontrados

if __name__ == "__main__":
    archivo = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "result.json")
    packs = procesar_archivo_json(archivo)
    if packs:
        print(f"\n📋 Resumen de packs extraídos:")
        for p in packs[:10]:
            print(f"  • [{p['id_pack']}] {p['titulo']} ({len(p['juegos'])} juegos) - {p['precio_clp']:,} CLP")
        if len(packs) > 10:
            print(f"  ... y {len(packs) - 10} packs más.")
        print(f"\n👉 Si inicias el bot o ejecutas /importar en Telegram, estos packs se procesarán automáticamente.")
