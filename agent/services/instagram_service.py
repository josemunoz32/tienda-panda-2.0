import requests
from core.config import settings

def send_instagram_message(recipient_id: str, message_text: str):
    """
    Envía un mensaje de vuelta al usuario a través de la Instagram Graph API.
    """
    url = f"https://graph.facebook.com/v19.0/me/messages?access_token={settings.IG_ACCESS_TOKEN}"
    
    payload = {
        "recipient": {
            "id": recipient_id
        },
        "message": {
            "text": message_text
        }
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        print(f"Mensaje enviado a IG: {recipient_id}")
    except requests.exceptions.RequestException as e:
        print(f"Error enviando mensaje a IG: {e}")
        if response is not None:
            print(response.text)
