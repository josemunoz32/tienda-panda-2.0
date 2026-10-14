import requests
from core.config import settings
from core.audit import set_user_status

def send_telegram_message(chat_id: str, text: str):
    """Envía un mensaje de Telegram."""
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": chat_id, "text": text}
    try:
        requests.post(url, json=payload)
    except Exception as e:
        print(f"Error sending Telegram message: {e}")

def handle_telegram_update(update: dict):
    """
    Procesa actualizaciones (mensajes) recibidas del Webhook de Telegram Bot API.
    Aplica Zero Trust validando estrictamente el TELEGRAM_ADMIN_ID.
    """
    message = update.get("message")
    if not message:
        return
        
    chat_id = str(message.get("chat", {}).get("id"))
    text = message.get("text", "")
    
    # ZERO TRUST: Verificar que el remitente sea el Admin autorizado
    if chat_id != settings.TELEGRAM_ADMIN_ID:
        send_telegram_message(chat_id, "Acceso denegado. Este incidente será reportado.")
        # Opcional: Registrar intento de acceso no autorizado
        from core.audit import log_incident
        log_incident(chat_id, "telegram", "UNAUTHORIZED_ADMIN_ACCESS", text)
        return

    # Comandos Administrativos
    if text.startswith("/ventas"):
        send_telegram_message(chat_id, "📊 Reporte de Ventas:\n(Simulado) Hoy: 5 ventas - Total: $150")
        
    elif text.startswith("/clientes"):
        send_telegram_message(chat_id, "👥 Clientes Activos:\n(Simulado) 12 interacciones activas con la IA hoy.")
        
    elif text.startswith("/tomar_control"):
        # Extraer el ID de usuario de IG del comando: /tomar_control <ig_user_id>
        parts = text.split(" ")
        if len(parts) > 1:
            target_user = parts[1]
            set_user_status(target_user, "instagram", "BLOCKED") # Bloquea la IA para este usuario
            send_telegram_message(chat_id, f"✅ IA pausada para el usuario {target_user}. Ahora tú tienes el control.")
        else:
            send_telegram_message(chat_id, "⚠️ Uso incorrecto. Usa: /tomar_control <ig_user_id>")
            
    elif text.startswith("/devolver_ia"):
        # Extraer el ID de usuario de IG del comando: /devolver_ia <ig_user_id>
        parts = text.split(" ")
        if len(parts) > 1:
            target_user = parts[1]
            set_user_status(target_user, "instagram", "ACTIVE") # Reactiva la IA
            send_telegram_message(chat_id, f"✅ IA reactivada para el usuario {target_user}.")
        else:
            send_telegram_message(chat_id, "⚠️ Uso incorrecto. Usa: /devolver_ia <ig_user_id>")
            
    elif text.startswith("/estadisticas"):
        send_telegram_message(chat_id, "📈 Estadísticas del Sistema:\n- IA Operativa\n- Intentos de Prompt Injection: 0 hoy")
        
    else:
        send_telegram_message(chat_id, "Comando no reconocido. Opciones: /ventas, /clientes, /tomar_control <id>, /devolver_ia <id>, /estadisticas")
