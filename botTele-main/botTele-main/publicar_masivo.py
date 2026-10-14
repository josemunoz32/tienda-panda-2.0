import asyncio
import os
import sys
import json
import logging
from datetime import datetime
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.error import RetryAfter

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from bot import (
    extraer_packs_de_json_file,
    construir_mensaje_pack,
    guardar_pack_firestore,
    init_firebase,
    obtener_siguiente_id_pack,
    calcular_huella_pack,
    TOKEN,
    CANAL_PUBLICO_ID,
    CANAL_REVENDEDORES_ID
)

JSON_PATH = os.path.join(os.path.dirname(__file__), "result.json")
PROGRESS_FILE = os.path.join(os.path.dirname(__file__), "progreso_publicacion.json")

def cargar_progreso():
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, "r", encoding="utf-8-sig") as f:
                data = json.load(f)
                return set(data)
        except Exception:
            return set()
    return set()

def guardar_progreso(procesados_set):
    try:
        with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
            json.dump(list(procesados_set), f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"⚠️ Error al guardar progreso: {e}")

async def main():
    print("=" * 65)
    print("🚀 PUBLICADOR MASIVO DE PACKS DE NINTENDO EN TELEGRAM (100% COMPLETO)")
    print("=" * 65)
    
    reiniciar = "--reiniciar" in sys.argv or "--reset" in sys.argv
    if reiniciar:
        print("⚠️ Modo REINICIAR activado: Se publicarán todos los packs desde cero.")
        procesados = set()
    else:
        procesados = cargar_progreso()
    
    init_firebase()
    
    bot = Bot(token=TOKEN)
    bot_info = await bot.get_me()
    print(f"✅ Bot conectado: @{bot_info.username} (ID: {bot_info.id})")
    print(f"📢 Canal Público Destino: {CANAL_PUBLICO_ID}")
    if CANAL_REVENDEDORES_ID and CANAL_REVENDEDORES_ID != 0:
        print(f"👑 Canal Revendedores Destino: {CANAL_REVENDEDORES_ID}")
    
    target_json = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else JSON_PATH
    print(f"\n📄 Cargando packs desde {target_json}...")
    packs = extraer_packs_de_json_file(target_json, solo_nuevos=False)
    total_packs = len(packs)
    
    if not packs:
        print("❌ No se encontraron packs válidos para publicar.")
        return
        
    print(f"📦 Total de packs identificados en archivo: {total_packs}")
    print(f"🔄 Huellas previamente procesadas: {len(procesados)}")
    
    # Filtrar solo los que no han sido procesados por huella
    packs_pendientes = []
    for p in packs:
        h = p.get("huella") or calcular_huella_pack(p)
        p["huella"] = h
        if h not in procesados:
            packs_pendientes.append(p)
            
    print(f"⏳ Packs pendientes de publicar: {len(packs_pendientes)}")
    
    if not packs_pendientes:
        print("🎉 ¡Todos los packs de este archivo ya fueron publicados!")
        print("👉 Si deseas forzar la subida de nuevo, ejecuta: python publicar_masivo.py --reiniciar")
        return

    publicados_exito = 0
    fallidos = 0
    total_a_subir = len(packs_pendientes)
    
    print(f"\n🚀 Iniciando subida continua de {total_a_subir} packs...\n")
    
    for idx, pack in enumerate(packs_pendientes, 1):
        # Asignar ID correlativo real desde el contador
        id_pack = obtener_siguiente_id_pack()
        pack["id_pack"] = id_pack
        huella = pack["huella"]
        
        # Construir mensajes con el ID asignado
        msg_pub, markup_pub = construir_mensaje_pack(pack, es_revendedor=False, bot_username=bot_info.username)
        msg_rev, markup_rev = None, None
        if CANAL_REVENDEDORES_ID and CANAL_REVENDEDORES_ID != 0:
            msg_rev, markup_rev = construir_mensaje_pack(pack, es_revendedor=True, bot_username=bot_info.username)
        
        exito = False
        for intento in range(5):
            try:
                # 1. Enviar a Canal Público
                sent_pub = await bot.send_message(
                    chat_id=CANAL_PUBLICO_ID,
                    text=msg_pub,
                    reply_markup=markup_pub
                )
                msg_id_pub = sent_pub.message_id
                
                # 2. Enviar a Canal Revendedores (si está configurado)
                msg_id_rev = None
                if msg_rev and CANAL_REVENDEDORES_ID and CANAL_REVENDEDORES_ID != 0:
                    try:
                        sent_rev = await bot.send_message(
                            chat_id=CANAL_REVENDEDORES_ID,
                            text=msg_rev,
                            reply_markup=markup_rev
                        )
                        msg_id_rev = sent_rev.message_id
                    except Exception as e_rev:
                        print(f"⚠️ Error enviando a revendedores: {e_rev}")

                # 3. Guardar en Firestore
                await asyncio.to_thread(guardar_pack_firestore, pack, msg_id_pub)

                # 4. Registrar huella procesada
                procesados.add(huella)
                guardar_progreso(procesados)
                publicados_exito += 1
                exito = True
                
                porcentaje = (idx / total_a_subir) * 100
                print(f"[{datetime.now().strftime('%H:%M:%S')}] [{idx}/{total_a_subir}] ({porcentaje:.1f}%) 📤 {id_pack} | {pack.get('titulo')} ({len(pack.get('juegos', []))} juegos) ✅", flush=True)
                break
                
            except RetryAfter as e:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ⏳ Rate limit de Telegram ({e.retry_after}s). Esperando para continuar...", flush=True)
                await asyncio.sleep(e.retry_after + 1.0)
            except Exception as e:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️ Intento {intento+1}/5 falló para {id_pack}: {e}", flush=True)
                await asyncio.sleep(2.5)
                
        if not exito:
            fallidos += 1
            print(f"❌ No se pudo publicar {id_pack} tras 5 intentos.", flush=True)

        # Pausa anti rate-limit entre packs
        await asyncio.sleep(1.3)

    print("\n" + "=" * 65)
    print(f"🎉 PROCESO MASIVO COMPLETADO:")
    print(f"  • Publicados con éxito: {publicados_exito}")
    print(f"  • Fallidos: {fallidos}")
    print(f"  • Total en canal: {len(procesados)} / {total_packs}")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(main())
