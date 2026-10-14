from firebase_functions import https_fn, options
from firebase_admin import initialize_app

# Inicializar Firebase Admin SDK
initialize_app()

from core.security import verify_instagram_webhook, handle_instagram_message
from services.telegram_admin import handle_telegram_update
from core.config import settings

# --- INSTAGRAM WEBHOOK ---
@https_fn.on_request(
    cors=options.CorsOptions(cors_methods=["get", "post"], cors_origins=["*"]),
    secrets=[
        "IG_VERIFY_TOKEN", 
        "IG_ACCESS_TOKEN", 
        "OPENAI_API_KEY", 
        "TELEGRAM_BOT_TOKEN", 
        "TELEGRAM_ADMIN_ID"
    ]
)
def instagram_webhook(req: https_fn.Request) -> https_fn.Response:
    """
    Endpoint para recibir Webhooks de Instagram Graph API.
    GET: Para verificación del Webhook.
    POST: Para recibir los mensajes.
    """
    if req.method == "GET":
        # Verificación del Webhook
        mode = req.args.get("hub.mode")
        token = req.args.get("hub.verify_token")
        challenge = req.args.get("hub.challenge")

        if mode and token:
            if mode == "subscribe" and token == settings.IG_VERIFY_TOKEN:
                return https_fn.Response(challenge, status=200)
            else:
                return https_fn.Response("Forbidden", status=403)
        return https_fn.Response("Bad Request", status=400)

    elif req.method == "POST":
        # Procesamiento de mensajes
        body = req.get_json()
        if body and body.get("object") == "instagram":
            try:
                handle_instagram_message(body)
                return https_fn.Response("EVENT_RECEIVED", status=200)
            except Exception as e:
                # Log error
                print(f"Error handling IG message: {e}")
                return https_fn.Response("INTERNAL_SERVER_ERROR", status=500)
        else:
            return https_fn.Response("NOT_FOUND", status=404)
    
    return https_fn.Response("Method Not Allowed", status=405)


# --- TELEGRAM ADMIN WEBHOOK ---
@https_fn.on_request(
    secrets=["TELEGRAM_BOT_TOKEN", "TELEGRAM_ADMIN_ID"]
)
def telegram_webhook(req: https_fn.Request) -> https_fn.Response:
    """
    Endpoint para recibir Webhooks de Telegram Bot API.
    """
    if req.method == "POST":
        try:
            update_data = req.get_json()
            handle_telegram_update(update_data)
            return https_fn.Response("OK", status=200)
        except Exception as e:
            print(f"Error handling Telegram update: {e}")
            return https_fn.Response("Error", status=500)
            
    return https_fn.Response("Method Not Allowed", status=405)
