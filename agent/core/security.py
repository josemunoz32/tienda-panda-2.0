import re
from core.audit import log_incident, get_user_status, set_user_status
from services.ai_service import generate_reply

# Umbrales
MAX_MESSAGES_PER_MINUTE = 10

def check_prompt_injection(message: str) -> bool:
    """
    Validación heurística básica para detectar intentos de prompt injection.
    """
    suspicious_phrases = [
        r"(?i)ignora (?:todas )?las instrucciones",
        r"(?i)act[uú]a como",
        r"(?i)dime tu prompt",
        r"(?i)revela tu configuraci[oó]n",
        r"(?i)modo desarrollador",
        r"(?i)eres chatgpt",
        r"(?i)jailbreak",
        r"(?i)system prompt"
    ]
    for pattern in suspicious_phrases:
        if re.search(pattern, message):
            return True
    return False

def verify_instagram_webhook(req):
    # La logica ya esta en main.py, esto es solo por si lo movemos despues
    pass

def handle_instagram_message(body: dict):
    """
    Procesa el mensaje entrante de Instagram, aplica medidas de seguridad,
    y si es seguro, lo envía al servicio de IA.
    """
    # Parsear body de IG Graph API
    for entry in body.get("entry", []):
        for messaging in entry.get("messaging", []):
            sender_id = messaging.get("sender", {}).get("id")
            message = messaging.get("message", {})
            text = message.get("text", "")
            
            if not sender_id or not text:
                continue
                
            # 1. Chequear estado del usuario
            status = get_user_status(sender_id, "instagram")
            if status == "SUSPICIOUS_USER":
                # Limitar o ignorar
                print(f"Ignorando mensaje de usuario sospechoso: {sender_id}")
                return
            
            # 2. Chequear Prompt Injection
            if check_prompt_injection(text):
                log_incident(sender_id, "instagram", "PROMPT_INJECTION_ATTEMPT", text)
                set_user_status(sender_id, "instagram", "SUSPICIOUS_USER")
                # Enviar mensaje de evasión genérico (no implementado aquí, se enviaría por IG API)
                return
                
            # 3. Rate limiting (simplificado para este ejemplo)
            # En un entorno real se usaría Redis o Firestore counters de forma transaccional
            
            # Si pasa las verificaciones, ir al agente de IA
            response_text = generate_reply(sender_id, "instagram", text)
            
            # Enviar la respuesta a Instagram
            from services.instagram_service import send_instagram_message
            send_instagram_message(sender_id, response_text)

