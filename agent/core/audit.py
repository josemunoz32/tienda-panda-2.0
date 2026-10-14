from firebase_admin import firestore
import datetime

db = firestore.client()

def log_incident(user_id: str, platform: str, incident_type: str, details: str):
    """
    Registra un incidente de seguridad (ej. prompt injection, spam).
    """
    doc_ref = db.collection("agent_logs").document()
    doc_ref.set({
        "timestamp": firestore.SERVER_TIMESTAMP,
        "user_id": user_id,
        "platform": platform,
        "incident_type": incident_type,
        "details": details
    })

def log_message(user_id: str, platform: str, role: str, content: str):
    """
    Registra cada mensaje en la base de datos para trazabilidad.
    """
    doc_ref = db.collection("agent_conversations").document(f"{platform}_{user_id}")
    
    # Asegurar que el documento del usuario existe
    if not doc_ref.get().exists:
        doc_ref.set({
            "created_at": firestore.SERVER_TIMESTAMP,
            "status": "ACTIVE",
            "platform": platform,
            "user_id": user_id
        })
        
    doc_ref.collection("messages").add({
        "timestamp": firestore.SERVER_TIMESTAMP,
        "role": role,
        "content": content
    })

def get_user_status(user_id: str, platform: str) -> str:
    """Obtiene el estado de un usuario (ACTIVE, SUSPICIOUS_USER, BLOCKED)"""
    doc = db.collection("agent_conversations").document(f"{platform}_{user_id}").get()
    if doc.exists:
        return doc.to_dict().get("status", "ACTIVE")
    return "ACTIVE"

def set_user_status(user_id: str, platform: str, status: str):
    """Cambia el estado de un usuario"""
    doc_ref = db.collection("agent_conversations").document(f"{platform}_{user_id}")
    doc_ref.set({"status": status}, merge=True)
