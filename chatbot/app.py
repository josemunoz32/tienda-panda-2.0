
import firebase_admin
from firebase_admin import credentials, firestore
import openai
from flask import Flask, request, jsonify
import os
import json
import secrets
from flask_cors import CORS
import re
import unicodedata
from difflib import SequenceMatcher
from urllib.parse import quote
import logging
import threading
import time
from collections import defaultdict, deque
from werkzeug.middleware.proxy_fix import ProxyFix

# Configuracion general
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO), format='%(asctime)s %(levelname)s %(name)s %(message)s')
logger = logging.getLogger('pandastore-chatbot')

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        'ALLOWED_ORIGINS',
        'https://pandastoreupdate.web.app,https://pandastoreupdate.firebaseapp.com,http://localhost:3000,http://127.0.0.1:3000'
    ).split(',')
    if origin.strip()
]
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4o')
OPENAI_TIMEOUT_SECONDS = float(os.environ.get('OPENAI_TIMEOUT_SECONDS', '12'))
CHAT_RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get('CHAT_RATE_LIMIT_WINDOW_SECONDS', '60'))
CHAT_RATE_LIMIT_MAX_REQUESTS = int(os.environ.get('CHAT_RATE_LIMIT_MAX_REQUESTS', '30'))
CHAT_REPEAT_LIMIT = int(os.environ.get('CHAT_REPEAT_LIMIT', '4'))
MAX_MESSAGE_LENGTH = int(os.environ.get('CHAT_MAX_MESSAGE_LENGTH', '450'))
MAX_HISTORY_ITEMS = int(os.environ.get('CHAT_MAX_HISTORY_ITEMS', '20'))
MAX_HISTORY_TEXT_LENGTH = int(os.environ.get('CHAT_MAX_HISTORY_TEXT_LENGTH', '1000'))
TELEMETRY_API_KEY = os.environ.get('TELEMETRY_API_KEY')
TRUST_PROXY = os.environ.get('TRUST_PROXY', '0') == '1'
TRUSTED_PROXY_HOPS = max(0, int(os.environ.get('TRUSTED_PROXY_HOPS', '1')))
APP_HOST = os.environ.get('APP_HOST', '0.0.0.0')
APP_PORT = int(os.environ.get('PORT', os.environ.get('APP_PORT', '5000')))
APP_DEBUG = os.environ.get('APP_DEBUG', '0') == '1'
USE_WAITRESS = os.environ.get('USE_WAITRESS', '0') == '1'

rate_limit_store = defaultdict(deque)
repeat_message_store = defaultdict(deque)
rate_limit_lock = threading.Lock()

# Inicializar Flask
app = Flask(__name__)
if TRUST_PROXY and TRUSTED_PROXY_HOPS > 0:
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=TRUSTED_PROXY_HOPS, x_proto=TRUSTED_PROXY_HOPS, x_host=TRUSTED_PROXY_HOPS)
CORS(app, resources={r"/chat": {"origins": ALLOWED_ORIGINS}, r"/chat/telemetry": {"origins": ALLOWED_ORIGINS}})

# Inicializar Firebase
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FIREBASE_CRED_PATH = os.environ.get('FIREBASE_CRED_PATH', os.path.join(BASE_DIR, 'firebase-key.json'))
FIREBASE_CRED_JSON = os.environ.get('FIREBASE_CRED_JSON')
db = None
try:
    if FIREBASE_CRED_JSON:
        if not firebase_admin._apps:
            cred = credentials.Certificate(json.loads(FIREBASE_CRED_JSON))
            firebase_admin.initialize_app(cred)
        db = firestore.client()
    elif os.path.exists(FIREBASE_CRED_PATH):
        if not firebase_admin._apps:
            cred = credentials.Certificate(FIREBASE_CRED_PATH)
            firebase_admin.initialize_app(cred)
        db = firestore.client()
    else:
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        db = firestore.client()
except Exception:
    logger.exception('Failed to initialize Firebase Admin SDK')
    db = None

# Configurar OpenAI
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY
else:
    logger.warning('OPENAI_API_KEY is not configured. The chatbot will rely on fallback responses when needed.')

try:
    openai_client = openai.OpenAI(api_key=OPENAI_API_KEY, timeout=OPENAI_TIMEOUT_SECONDS) if OPENAI_API_KEY else None
except AttributeError:
    openai_client = None
except Exception:
    logger.exception('Failed to initialize OpenAI client')
    openai_client = None

PROMPT_BASE = (
"Eres el asistente oficial de Panda Store.\n"
"Panda Store es una tienda online que vende juegos digitales, suscripciones y servicios de streaming para Nintendo Switch, PS4 y PS5.\n"
"Tu objetivo es ayudar a los clientes y resolver sus dudas de forma clara y util.\n\n"

"COMPORTAMIENTO GENERAL:\n"
"- Responde siempre en espanol, de forma clara, util y natural.\n"
"- Prioriza respuestas cortas, ordenadas y faciles de escanear.\n"
"- Usa separaciones limpias entre ideas para evitar confundir al usuario.\n"
"- Solo ayudas con temas relacionados con Panda Store.\n"
"- No resuelvas ejercicios, tareas, preguntas academicas ni temas ajenos a la tienda.\n"
"- Si el cliente pregunta por productos, usa solo la informacion entregada en el contexto.\n"
"- No inventes precios, disponibilidad, promociones ni categorias.\n"
"- Si hay productos relevantes en el contexto, priorizalos en la respuesta.\n"
"- Si la consulta es de soporte, instalacion, metodos de pago, contacto o ayuda general, responde directamente aunque no haya producto.\n"
"- Si no hay coincidencias claras de productos, no fuerces una recomendacion de producto equivocada.\n"
"- Puedes recomendar promociones o categorias al final solo si tiene sentido.\n\n"

"CONTINUIDAD Y CAMBIOS DE TEMA:\n"
"- Siempre lee el historial completo del chat antes de responder.\n"
"- Si el usuario cambia de tema (por ejemplo pasa de preguntar por un juego a preguntar por metodos de pago), aceptalo con naturalidad y responde el nuevo tema directamente.\n"
"- Si el usuario responde algo corto como 'si', 'no', 'ok', 'dale', un pais, un numero o una aclaracion, interpretalo segun la pregunta anterior del chat.\n"
"- Si el usuario retoma un tema anterior de la conversacion, reconocelo y continua desde donde quedo.\n"
"- No repitas informacion que el usuario ya vio en el chat.\n\n"

"CLARIFICACION Y CONFIRMACION:\n"
"- Si no entiendes lo que el usuario quiere decir, PREGUNTALE para clarificar. No adivines ni inventes.\n"
"- Si el mensaje del usuario es muy vago o ambiguo, pidele mas detalles amablemente.\n"
"- Antes de dar informacion importante o hacer una accion, confirma que entendiste correctamente si hay duda.\n"
"- Ejemplos de como pedir clarificacion:\n"
"  'No estoy seguro de entender. ¿Me puedes dar mas detalles?'\n"
"  'Quieres decir [X] o [Y]?'\n"
"  '¿Te refieres a [producto/tema]?'\n"
"- Si el usuario dice algo que no tiene sentido en el contexto, no lo ignores: pregunta que quiso decir.\n\n"

"RESPUESTAS NATURALES:\n"
"- Se conversacional y amigable, como un vendedor real de tienda.\n"
"- Si el usuario saluda o se despide, responde de forma natural.\n"
"- Si el usuario agradece, responde brevemente y ofrece mas ayuda.\n"
"- Usa emojis con moderacion (1-2 por respuesta maximo).\n"
"- Si el usuario hace un comentario casual ('que cool', 'buena onda', 'jaja'), responde de forma breve y natural antes de continuar.\n\n"

"INSTALACIÓN DE JUEGOS NINTENDO SWITCH:\n"
"Si el cliente pregunta sobre instalación, guía o cómo funciona:\n"
"Responde:\n"
"1️⃣ Indica que puede abrir el boton de instalacion para ver el paso a paso.\n"
"Si tienes dudas también puedo ayudarte.\n\n"

"MÉTODOS DE PAGO:\n"
"Si el cliente pregunta cómo pagar, responde según su país:\n\n"

"Clientes de Chile:\n"
"- Transferencia bancaria\n"
"- Depósito\n"
"- Tarjeta de crédito\n"
"- Tarjeta de débito\n\n"

"Clientes internacionales:\n"
"- Tarjeta de crédito o débito internacional\n"
"- Transferencia internacional\n"
"- Crypto\n"
"- PayPal (USD)\n\n"

"SOPORTE HUMANO:\n"
"Si el cliente quiere hablar con una persona real o soporte, indica que puede usar los botones de contacto disponibles.\n\n"

"TÉRMINOS Y CONDICIONES:\n"
"Si el cliente pregunta por seguridad o términos:\n"
"Indica que puede abrir el boton de terminos y condiciones.\n\n"

"PROMOCIONES:\n"
"Si el cliente pregunta por promociones disponibles:\n"
"Indica que puede abrir el boton de promociones actuales.\n"
"Tambien puedes sugerir el boton del pack de juegos Nintendo Switch si aplica.\n"
"Estas promociones son principalmente para Nintendo Switch.\n\n"

"RECOMENDACIONES:\n"
"Cuando tenga sentido, puedes sugerir productos, categorias o promociones relacionadas.\n"
"Ejemplo:\n"
"'Si quieres puedo mostrarte juegos disponibles o promociones actuales 🎮🔥'\n"
)

CONTACTO_REDIRECT = (
    "No encontre ese juego en la base de datos de Panda Store.\n\n"
    "Ahora mismo no lo tengo en el catalogo. Si quieres, te dejo botones de contacto para hablar con un admin y confirmar disponibilidad o pedir una alternativa."
)

RESPUESTA_FUERA_DE_TEMA = (
    "Solo puedo ayudarte con temas de Panda Store.\n\n"
    "Puedo orientarte con:\n"
    "- juegos y categorias\n"
    "- precios\n"
    "- promociones\n"
    "- instalacion\n"
    "- metodos de pago\n"
    "- soporte y contacto\n\n"
    "Si quieres, dime el juego, la consola o la duda de la tienda y te ayudo."
)

RESPUESTA_BUSCAR_OTRO = (
    "Claro.\n\n"
    "Si quieres otra opcion, puedo ayudarte a buscar alternativas o dejarte botones de contacto para que te asesoren."
)

INTENCION_CATEGORIA = {
    'streaming': {
        'keywords': {
            'pelicula', 'peliculas', 'serie', 'series', 'ver peliculas', 'ver series',
            'plataformas de streaming', 'plataformas streaming', 'donde ver peliculas',
            'donde ver series', 'quiero ver peliculas', 'quiero ver series',
            'para ver peliculas', 'para ver series', 'ver tele', 'television',
            'ver contenido', 'plataforma para ver', 'cuentas streaming',
            'cuentas de streaming', 'apps de streaming', 'apps streaming',
        },
        'filtro_categoria': 'streaming',
        'mensaje': (
            "Streaming\n\n"
            "En Panda Store vendemos cuentas de plataformas de streaming para ver peliculas, series y mas.\n"
            "Aca te dejo las opciones disponibles."
        ),
    },
    'adulto': {
        'keywords': {
            'adulto', 'adultos', 'pagina adulto', 'paginas adulto', 'paginas para adultos',
            'contenido adulto', 'xxx', 'porno', 'pornografia',
            'para adultos', 'pagina para adultos', 'contenido para adultos',
            'paginas xxx', 'paginas porno', 'contenido xxx', 'contenido 18',
            'paginas de adultos', 'pagina de adultos',
        },
        'filtro_nombres': ['xvideo', 'pornhub'],
        'mensaje': (
            "Contenido para adultos (+18)\n\n"
            "Si, tenemos cuentas de plataformas para adultos.\n"
            "Aca te dejo las opciones disponibles."
        ),
    },
    'switch': {
        'keywords': {
            'juegos de switch', 'juegos switch', 'juegos nintendo', 'juegos de nintendo',
            'juegos nintendo switch', 'juegos de nintendo switch', 'catalogo switch',
            'catalogo nintendo', 'que juegos de switch', 'que tienen de switch',
            'que tienen de nintendo', 'que juegos de nintendo',
            'que hay de switch', 'que hay de nintendo', 'que hay para switch',
            'que hay para nintendo', 'juegos para switch', 'juegos para nintendo',
            'switch juegos', 'nintendo juegos',
        },
        'filtro_categoria': 'switch',
        'es_consola': True,
        'pregunta': '\u00bfQue juego buscas para Nintendo Switch?',
    },
    'switch2': {
        'keywords': {
            'juegos de switch 2', 'juegos switch 2', 'juegos nintendo switch 2',
            'catalogo switch 2', 'que tienen de switch 2', 'switch 2',
            'juegos para switch 2',
        },
        'filtro_categoria': 'switch',
        'es_consola': True,
        'pregunta': 'Los juegos de Nintendo Switch son compatibles con Switch y Switch 2.\n\n\u00bfQue juego buscas?',
    },
    'ps5': {
        'keywords': {
            'juegos de ps5', 'juegos ps5', 'juegos playstation 5', 'juegos de playstation 5',
            'catalogo ps5', 'catalogo playstation 5', 'que juegos de ps5',
            'que tienen de ps5', 'que hay de ps5', 'que hay para ps5',
            'juegos para ps5', 'juegos para playstation 5',
            'ps5 juegos',
        },
        'filtro_categoria': 'ps5',
        'es_consola': True,
        'pregunta': '\u00bfQue juego buscas para PS5?',
    },
    'ps4': {
        'keywords': {
            'juegos de ps4', 'juegos ps4', 'juegos playstation 4', 'juegos de playstation 4',
            'catalogo ps4', 'catalogo playstation 4', 'que juegos de ps4',
            'que tienen de ps4', 'que hay de ps4', 'que hay para ps4',
            'juegos para ps4', 'juegos para playstation 4',
            'ps4 juegos',
        },
        'filtro_categoria': 'ps4',
        'es_consola': True,
        'pregunta': '\u00bfQue juego buscas para PS4?',
    },
    'suscripciones': {
        'keywords': {
            'suscripciones', 'suscripcion', 'membresías', 'membresia',
            'playstation plus', 'ps plus', 'psplus',
            'que suscripciones tienen', 'catalogo suscripciones',
        },
        'filtro_categoria': 'suscripciones',
        'es_consola': False,
        'pregunta': '\u00bfQue suscripcion te interesa?',
    },
}

PALABRAS_REFINAR_BUSQUEDA = {
    'otro', 'otra', 'busco', 'buscar', 'quiero', 'alguno', 'alguna', 'mas',
    'similar', 'parecido', 'parecida', 'opcion', 'opciones', 'de', 'del', 'el',
    'la', 'los', 'las', 'un', 'una'
}

INFO_KEYWORDS = {
    'catalogo': {'que juegos venden', 'que venden', 'catalogo', 'juegos disponibles', 'que juegos hay'},
    'promociones': {'promocion', 'promociones', 'promo', 'promos', 'ofertas', 'oferta', 'descuento', 'descuentos'},
    'instalacion': {'instalacion', 'instalar', 'instalo', 'guia', 'tutorial', 'como instalar', 'descargar', 'instalkacion'},
    'pagos': {'pago', 'pagos', 'medio de pago', 'medios de pago', 'como pagar', 'tarjeta', 'transferencia', 'paypal', 'crypto'},
    'compra': {
        'como compro', 'como comprar', 'como hago la compra', 'como se compra', 'quiero comprar',
        'como hago para comprar', 'proceso de compra', 'como es la compra', 'como funciona la compra',
        'como puedo comprar', 'como seria la compra', 'como se realiza la compra', 'que hago para comprar',
        'cual es el proceso de compra', 'como hacer la compra', 'me explicas la compra'
    },
    'formato': {'son digitales', 'son fisicos o digitales', 'son fisicos', 'son físicos', 'formato de los juegos', 'formato de los servicios', 'fisico o digital', 'físico o digital', 'digital o fisico', 'digital o físico'},
    'terminos': {'terminos', 'condiciones', 'seguridad', 'garantia', 'garantias', 'legal', 'terminos y condiciones'},
    'contacto': {'contacto', 'contactar', 'soporte', 'ayuda', 'humano', 'persona', 'whatsapp', 'instagram', 'telegram', 'asesor'},
    'entrega': {'entrega', 'como es la entrega', 'como entregan', 'como es el envio', 'demora la entrega', 'cuando entregan', 'es inmediata'},
}

STOPWORDS_INTENCION = {
    'el', 'la', 'los', 'las', 'de', 'del', 'y', 'o', 'un', 'una', 'unos', 'unas', 'por', 'favor'
}

LINKS_TIENDAS = {
    'instagram': 'https://www.instagram.com/juegos_nintendo_switch_chile2',
    'whatsapp': 'https://wa.me/56974751810',
    'telegram': 'https://t.me/NintendoChile2',
    'pack_switch': 'https://t.me/juegosNintendoSwitchChile2',
}

ORDINALES = {
    '1': 0, 'uno': 0, 'primero': 0, 'primera': 0,
    '2': 1, 'dos': 1, 'segundo': 1, 'segunda': 1,
    '3': 2, 'tres': 2, 'tercero': 2, 'tercera': 2,
    '4': 3, 'cuatro': 3, 'cuarto': 3, 'cuarta': 3,
    '5': 4, 'cinco': 4, 'quinto': 4, 'quinta': 4,
}

PALABRAS_FRUSTRACION = {
    'no funciona', 'no me sirve', 'no entiendo', 'problema', 'problemas', 'error',
    'falla', 'falla', 'frustrado', 'frustrante', 'molesto', 'malo', 'pesimo',
    'quiero hablar con una persona', 'quiero hablar con soporte', 'humano', 'asesor'
}

FAQ_SWITCH_PATTERNS = {
    'switch2': ['switch 2', 'switch2'],
    'online': ['online', 'en linea', 'jugar online', 'se puede jugar online'],
    'tipo_cuenta': ['primaria', 'secundaria'],
    'permanencia': ['permanente', 'indefinido', 'indefinida', 'para siempre', 'duracion indefinida'],
    'riesgo': ['riesgo', 'perdida', 'bloqueo', 'seguro', 'seguridad'],
}


def log_chat_event(event_name, **data):
    logger.info('chat_event=%s data=%s', event_name, data)


def get_client_identifier():
    forwarded_for = request.headers.get('X-Forwarded-For', '')
    if TRUST_PROXY and forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.remote_addr or 'unknown'


def telemetry_is_authorized():
    if not TELEMETRY_API_KEY:
        return True
    request_key = request.headers.get('X-Telemetry-Key', '')
    return secrets.compare_digest(request_key, TELEMETRY_API_KEY)


def sanitize_history_action(action):
    if not isinstance(action, dict):
        return None
    action_type = str(action.get('type', '')).strip()
    label = str(action.get('label', '')).strip()
    sanitized = {}
    if action_type:
        sanitized['type'] = action_type
    if label:
        sanitized['label'] = label[:80]
    producto = action.get('producto')
    if isinstance(producto, dict):
        producto_sanitized = {}
        for key in ['id', 'name', 'categoryId', 'variante', 'meses', 'priceCLP', 'priceUSD']:
            value = producto.get(key)
            if value not in [None, '']:
                producto_sanitized[key] = value
        if producto_sanitized:
            sanitized['producto'] = producto_sanitized
    return sanitized or None


def sanitize_history_option(option):
    if not isinstance(option, dict):
        return None
    sanitized = {}
    title = str(option.get('title', '')).strip()
    subtitle = str(option.get('subtitle', '')).strip()
    if title:
        sanitized['title'] = title[:120]
    if subtitle:
        sanitized['subtitle'] = subtitle[:120]
    action = sanitize_history_action(option.get('action'))
    if action:
        sanitized['action'] = action
    plans = []
    for plan in option.get('plans', [])[:5]:
        if not isinstance(plan, dict):
            continue
        plan_sanitized = {}
        label = str(plan.get('label', '')).strip()
        if label:
            plan_sanitized['label'] = label[:80]
        actions = [item for item in (sanitize_history_action(action) for action in plan.get('actions', [])[:5]) if item]
        if actions:
            plan_sanitized['actions'] = actions
        if plan_sanitized:
            plans.append(plan_sanitized)
    if plans:
        sanitized['plans'] = plans
    actions = [item for item in (sanitize_history_action(action) for action in option.get('actions', [])[:5]) if item]
    if actions:
        sanitized['actions'] = actions
    return sanitized or None


def sanitize_history(historial):
    if not isinstance(historial, list):
        raise ValueError('historial debe ser una lista')

    historial_sanitizado = []
    for item in historial[:MAX_HISTORY_ITEMS]:
        if not isinstance(item, dict):
            continue
        texto = str(item.get('text', '') or item.get('content', '') or '').strip()
        origen = str(item.get('from', '') or item.get('role', '') or '').strip().lower()
        if len(texto) > MAX_HISTORY_TEXT_LENGTH:
            texto = texto[:MAX_HISTORY_TEXT_LENGTH]
        if origen in ['user', 'usuario']:
            from_value = 'user'
        elif origen in ['bot', 'assistant', 'asistente', 'system']:
            from_value = 'bot'
        else:
            continue

        options = []
        actions = []
        if from_value == 'bot':
            options = [item for item in (sanitize_history_option(option) for option in item.get('options', [])[:5]) if item]
            actions = [item for item in (sanitize_history_action(action) for action in item.get('actions', [])[:5]) if item]

        if from_value == 'user' and not texto:
            continue
        if from_value == 'bot' and not texto and not options and not actions:
            continue

        history_item = {'from': from_value, 'text': texto}
        if options:
            history_item['options'] = options
        if actions:
            history_item['actions'] = actions
        historial_sanitizado.append(history_item)
    return historial_sanitizado


def validate_chat_payload(data):
    if not isinstance(data, dict):
        raise ValueError('El payload debe ser un objeto JSON')

    mensaje = str(data.get('mensaje', '') or '').strip()
    if not mensaje:
        raise ValueError('El mensaje es obligatorio')
    if len(mensaje) > MAX_MESSAGE_LENGTH:
        raise ValueError(f'El mensaje no puede superar {MAX_MESSAGE_LENGTH} caracteres')

    historial = sanitize_history(data.get('historial', []))
    return {'mensaje': mensaje, 'historial': historial}


def enforce_rate_limit(client_id, mensaje):
    now = time.time()
    mensaje_norm = normalizar_texto(mensaje)
    with rate_limit_lock:
        requests_window = rate_limit_store[client_id]
        while requests_window and now - requests_window[0] > CHAT_RATE_LIMIT_WINDOW_SECONDS:
            requests_window.popleft()
        if len(requests_window) >= CHAT_RATE_LIMIT_MAX_REQUESTS:
            raise PermissionError('Demasiadas solicitudes. Intenta nuevamente en un momento.')
        requests_window.append(now)

        repeated_window = repeat_message_store[client_id]
        while repeated_window and now - repeated_window[0][0] > CHAT_RATE_LIMIT_WINDOW_SECONDS:
            repeated_window.popleft()
        repeated_window.append((now, mensaje_norm))
        repeticiones = sum(1 for _, saved_message in repeated_window if saved_message == mensaje_norm)
        if repeticiones > CHAT_REPEAT_LIMIT:
            raise PermissionError('Detectamos demasiados mensajes repetidos. Espera un momento antes de intentar otra vez.')

# Obtener todos los productos de la colección 'products'
def obtener_productos():
    if db is None:
        return []
    productos = []
    try:
        productos_ref = db.collection('products')
        docs = productos_ref.stream()
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            productos.append(data)
    except Exception:
        logger.exception('Failed to fetch products from Firestore')
    return productos

# Obtener todas las categorías de la colección 'categories'
def obtener_categorias():
    categorias = {}
    if db is None:
        return categorias
    try:
        categorias_ref = db.collection('categories')
        docs = categorias_ref.stream()
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            categorias[doc.id] = data
    except Exception:
        logger.exception('Failed to fetch categories from Firestore')
    return categorias

def normalizar_texto(texto):
    texto = str(texto or '').lower()
    texto = ''.join((c for c in unicodedata.normalize('NFD', texto) if unicodedata.category(c) != 'Mn'))
    texto = re.sub(r'[^a-z0-9 ]', '', texto)
    return re.sub(r'\s+', ' ', texto).strip()


STOPWORDS = {
    'el', 'la', 'los', 'las', 'de', 'del', 'y', 'o', 'un', 'una', 'unos', 'unas',
    'hola', 'quiero', 'necesito', 'busco', 'compra', 'comprar', 'comprarlo', 'comprarlo',
    'tiene', 'tienen', 'tienes', 'hay', 'me', 'puedes', 'puedo',
    'como', 'instalacion', 'instalar', 'soporte', 'ayuda', 'precio', 'precios',
    'valor', 'vale', 'cuesta', 'categoria', 'categorias', 'juegos', 'juego', 'para',
    'con', 'en', 'por', 'favor', 'hablar', 'cliente', 'promocion', 'promociones',
    'que', 'cual', 'cuales', 'disponible', 'disponibles', 'este', 'esta', 'estos', 'estas',
    'ese', 'esa', 'esos', 'esas', 'estan', 'son', 'ser', 'tengo',
    'te', 'se', 'le', 'lo', 'nos', 'les', 'al', 'a',
    'solo', 'todos', 'todas', 'mas', 'muy', 'algun', 'alguno', 'alguna',
    'si', 'no', 'ya', 'tambien', 'donde', 'cuando', 'sus', 'tu', 'tus', 'mi', 'mis', 'su', 'es',
}

CONSULTA_EQUIVALENCIAS = {
    'prime video': 'amazon prime',
    'amazon video': 'amazon prime',
}

PALABRAS_INTENCION_PRODUCTO = {
    'precio', 'precios', 'valor', 'vale', 'cuesta', 'juego', 'juegos', 'catalogo',
    'tienen', 'busco', 'quiero', 'mario', 'kart', 'zelda', 'fifa', 'fc', 'call', 'duty',
    'gta', 'minecraft', 'fortnite', 'hbo', 'netflix', 'youtube', 'premium', 'plus', 'ps',
    'switch', 'nintendo', 'playstation', 'xbox', 'video', 'prime'
}

PALABRAS_FUERA_DE_TEMA = {
    'matematica', 'matematico', 'matematicas', 'ejercicio', 'ecuacion', 'sumar', 'restar',
    'multiplicar', 'dividir', 'tarea', 'tareas', 'colegio', 'universidad', 'historia',
    'biologia', 'fisica', 'quimica', 'programacion', 'codigo', 'python', 'java'
}


def tokenizar_consulta(texto):
    tokens = []
    for token in normalizar_texto(texto).split():
        if not token or token in STOPWORDS:
            continue
        tokens.append(token)

        # Permite comparar nombres escritos juntos o separados: FC26 <-> FC 26, MK11 <-> MK 11, etc.
        match = re.fullmatch(r'([a-z]{2,})([0-9]{1,4})', token)
        if match and token not in {'ps4', 'ps5'}:
            letras, numeros = match.groups()
            if letras not in STOPWORDS:
                tokens.append(letras)
            tokens.append(numeros)
    return tokens


def normalizar_consulta_busqueda(texto):
    consulta = normalizar_texto(texto)
    if not consulta:
        return ''
    for origen, destino in CONSULTA_EQUIVALENCIAS.items():
        if origen in consulta:
            consulta = consulta.replace(origen, destino)
    return consulta


def simplificar_token(token):
    token = normalizar_texto(token).replace(' ', '')
    if not token:
        return ''
    return re.sub(r'(.)\1{1,}', r'\1', token)


def distancia_damerau_levenshtein(origen, destino, max_distance=None):
    if origen == destino:
        return 0
    if not origen:
        return len(destino)
    if not destino:
        return len(origen)
    if max_distance is not None and abs(len(origen) - len(destino)) > max_distance:
        return max_distance + 1

    filas = len(origen) + 1
    columnas = len(destino) + 1
    matriz = [[0] * columnas for _ in range(filas)]

    for i in range(filas):
        matriz[i][0] = i
    for j in range(columnas):
        matriz[0][j] = j

    for i in range(1, filas):
        minimo_fila = None
        for j in range(1, columnas):
            costo = 0 if origen[i - 1] == destino[j - 1] else 1
            matriz[i][j] = min(
                matriz[i - 1][j] + 1,
                matriz[i][j - 1] + 1,
                matriz[i - 1][j - 1] + costo,
            )
            if i > 1 and j > 1 and origen[i - 1] == destino[j - 2] and origen[i - 2] == destino[j - 1]:
                matriz[i][j] = min(matriz[i][j], matriz[i - 2][j - 2] + 1)
            minimo_fila = matriz[i][j] if minimo_fila is None else min(minimo_fila, matriz[i][j])

        if max_distance is not None and minimo_fila is not None and minimo_fila > max_distance:
            return max_distance + 1

    return matriz[-1][-1]


def tokens_son_parecidos(token, candidato):
    token_simple = simplificar_token(token)
    candidato_simple = simplificar_token(candidato)

    if not token_simple or not candidato_simple:
        return False
    if token_simple == candidato_simple:
        return True

    largo_minimo = min(len(token_simple), len(candidato_simple))
    if largo_minimo <= 2:
        return False

    max_distancia = 1 if largo_minimo <= 5 else 2
    distancia = distancia_damerau_levenshtein(token_simple, candidato_simple, max_distance=max_distancia)
    if distancia <= max_distancia:
        return True

    similitud = SequenceMatcher(None, token_simple, candidato_simple).ratio()
    if largo_minimo == 3:
        return similitud >= 0.8 and token_simple[0] == candidato_simple[0]
    if largo_minimo <= 5:
        return similitud >= 0.76
    return similitud >= 0.82


def frase_coincide_aproximada(tokens_consulta, tokens_candidatos):
    if not tokens_consulta or not tokens_candidatos:
        return False

    usados = set()
    for token_consulta in tokens_consulta:
        encontrado = False
        for indice, token_candidato in enumerate(tokens_candidatos):
            if indice in usados:
                continue
            if tokens_son_parecidos(token_consulta, token_candidato):
                usados.add(indice)
                encontrado = True
                break
        if not encontrado:
            return False
    return True


def obtener_categoria_nombre(producto, categorias):
    categoria_id = producto.get('categoryId', '')
    categoria = categorias.get(categoria_id)
    return categoria.get('name', '') if categoria else ''


def formatear_moneda(valor, moneda):
    if valor in [None, '']:
        return ''
    bandera = '🇨🇱' if moneda == 'CLP' else '🇺🇸'
    return f"{bandera} {valor}"


def formatear_precios_producto(producto, categorias):
    categoria_nombre = obtener_categoria_nombre(producto, categorias)
    categoria_lower = categoria_nombre.lower()
    precios_por_mes = producto.get('preciosPorMes', [])
    if isinstance(precios_por_mes, dict):
        precios_por_mes = [precios_por_mes]
    if not isinstance(precios_por_mes, list):
        precios_por_mes = []

    partes = []
    if categoria_lower in ['streaming', 'suscripciones']:
        for precio in precios_por_mes:
            if not isinstance(precio, dict):
                continue
            duracion = ''
            for key in ['meses', 'mes', 'duracion', 'periodo']:
                if precio.get(key):
                    valor = str(precio.get(key)).strip()
                    duracion = f"{valor} meses" if valor.isdigit() else valor
                    break
            clp = precio.get('clp') or precio.get('priceCLP')
            usd = precio.get('usd') or precio.get('priceUSD')
            valores = []
            if clp not in [None, '']:
                valores.append(formatear_moneda(clp, 'CLP'))
            if usd not in [None, '']:
                valores.append(formatear_moneda(usd, 'USD'))
            if valores:
                partes.append(f"{duracion}: {' / '.join(valores)}" if duracion else ' / '.join(valores))
        return ' | '.join(partes) if partes else 'No disponible'

    if 'ps4' in categoria_lower or 'ps5' in categoria_lower:
        if producto.get('pricePrimariaCLP'):
            partes.append(f"Primaria: {formatear_moneda(producto.get('pricePrimariaCLP'), 'CLP')}")
        if producto.get('pricePrimariaUSD'):
            partes.append(f"Primaria: {formatear_moneda(producto.get('pricePrimariaUSD'), 'USD')}")
        if producto.get('priceSecundariaCLP'):
            partes.append(f"Secundaria: {formatear_moneda(producto.get('priceSecundariaCLP'), 'CLP')}")
        if producto.get('priceSecundariaUSD'):
            partes.append(f"Secundaria: {formatear_moneda(producto.get('priceSecundariaUSD'), 'USD')}")
        return ' | '.join(partes) if partes else 'No disponible'

    if producto.get('priceCLP'):
        partes.append(formatear_moneda(producto.get('priceCLP'), 'CLP'))
    if producto.get('priceUSD'):
        partes.append(formatear_moneda(producto.get('priceUSD'), 'USD'))
    return ' y '.join(partes) if partes else 'No disponible'


def puntuar_producto(consulta, producto):
    consulta_norm = normalizar_texto(consulta)
    nombre = producto.get('name', '')
    nombre_norm = normalizar_texto(nombre)
    if not nombre_norm:
        return 0

    score = 0
    if consulta_norm == nombre_norm:
        score += 100
    if consulta_norm and consulta_norm in nombre_norm:
        score += 50
    if nombre_norm and nombre_norm in consulta_norm:
        score += 35

    tokens_consulta = set(tokenizar_consulta(consulta))
    tokens_nombre = set(tokenizar_consulta(nombre))
    overlap = tokens_consulta & tokens_nombre
    score += len(overlap) * 12

    overlap_aproximado = sum(1 for token in tokens_consulta if token_coincide_aproximado(token, tokens_nombre))
    score += overlap_aproximado * 10

    if tokens_consulta and tokens_consulta.issubset(tokens_nombre):
        score += 20
    elif tokens_consulta and overlap_aproximado == len(tokens_consulta):
        score += 16

    similitud = SequenceMatcher(None, consulta_norm, nombre_norm).ratio()
    score += int(similitud * 30)

    if tokens_consulta:
        for token in tokens_consulta:
            for token_nombre in tokens_nombre:
                if SequenceMatcher(None, token, token_nombre).ratio() >= 0.82:
                    score += 8
                    break

    return score


def extraer_tokens_consulta_relevantes(texto):
    tokens = tokenizar_consulta(texto)
    tokens_numericos = [token for token in tokens if token.isdigit()]
    tokens_texto = [
        token for token in tokens
        if not token.isdigit() and (len(token) >= 3 or token in {'ps4', 'ps5', 'gta', 'fc'})
    ]
    return tokens_texto, tokens_numericos


def token_coincide_aproximado(token, candidatos):
    for candidato in candidatos:
        if tokens_son_parecidos(token, candidato):
            return True
    return False


def producto_es_coincidencia_confiable(consulta, producto):
    consulta_norm = normalizar_texto(consulta)
    nombre_norm = normalizar_texto(producto.get('name', ''))
    if not consulta_norm or not nombre_norm:
        return False

    if consulta_norm == nombre_norm:
        return True

    tokens_consulta_texto, tokens_consulta_numericos = extraer_tokens_consulta_relevantes(consulta)
    tokens_nombre = tokenizar_consulta(producto.get('name', ''))

    if tokens_consulta_numericos and not all(token in tokens_nombre for token in tokens_consulta_numericos):
        return False

    if not tokens_consulta_texto:
        return bool(tokens_consulta_numericos)

    coincidencias_texto = sum(1 for token in tokens_consulta_texto if token_coincide_aproximado(token, tokens_nombre))
    similitud_frase = SequenceMatcher(None, consulta_norm, nombre_norm).ratio()

    if len(tokens_consulta_texto) == 1:
        token = tokens_consulta_texto[0]
        token_base = token[:-1] if token.endswith('s') and len(token) > 3 else token
        if token in nombre_norm or token_base in nombre_norm:
            return True
        if coincidencias_texto == 1:
            return any(
                tokens_son_parecidos(token, tn) and (token[0] == tn[0])
                for tn in tokens_nombre
            )
        return False

    if coincidencias_texto == len(tokens_consulta_texto):
        return True

    return coincidencias_texto >= len(tokens_consulta_texto) - 1 and similitud_frase >= 0.78

def buscar_productos_relevantes(consulta, productos, limite=None):
    consulta = normalizar_consulta_busqueda(consulta)
    puntuados = []
    for producto in productos:
        score = puntuar_producto(consulta, producto)
        if score > 0 and producto_es_coincidencia_confiable(consulta, producto):
            puntuados.append((score, producto))
    puntuados.sort(key=lambda item: item[0], reverse=True)
    if not puntuados:
        return []

    mejores = []
    threshold = max(18, puntuados[0][0] // 2)
    for score, producto in puntuados:
        if score < threshold:
            continue
        mejores.append(producto)
        if limite is not None and len(mejores) >= limite:
            break
    return mejores


def consulta_parece_producto(consulta, productos_relevantes, categorias_relevantes):
    tokens = set(tokenizar_consulta(consulta))
    tokens_texto, tokens_numericos = extraer_tokens_consulta_relevantes(consulta)
    if productos_relevantes or categorias_relevantes:
        return True
    if tokens & PALABRAS_INTENCION_PRODUCTO:
        return True
    if tokens_texto and tokens_numericos:
        return True
    if len(tokens_texto) >= 2:
        return True
    return False


def es_consulta_ambigua(consulta, productos_relevantes):
    if len(productos_relevantes) < 2:
        return False

    tokens = set(tokenizar_consulta(consulta))
    if len(tokens) <= 2:
        return True

    primeros_nombres = [normalizar_texto(p.get('name', '')) for p in productos_relevantes[:3]]
    if primeros_nombres and any(all(token in nombre for token in tokens) for nombre in primeros_nombres):
        return True

    return False


def construir_respuesta_opciones(productos_relevantes, categorias):
    total_opciones = len(productos_relevantes)
    return (
        f"Encontre {total_opciones} opciones parecidas.\n\n"
        "Toca el + de la opcion que quieras agregar al carrito, o escribeme el nombre o numero para darte el detalle exacto."
    )


def construir_payload_opcion(producto, categorias):
    categoria = obtener_categoria_nombre(producto, categorias).lower()
    base = dict(producto)

    if categoria in ['streaming', 'suscripciones'] and isinstance(producto.get('preciosPorMes'), list):
        for precio in producto.get('preciosPorMes', []):
            if not isinstance(precio, dict):
                continue
            payload = dict(base)
            payload['priceCLP'] = precio.get('clp') or precio.get('priceCLP')
            payload['priceUSD'] = precio.get('usd') or precio.get('priceUSD')
            meses = precio.get('meses') or precio.get('mes') or precio.get('duracion') or precio.get('periodo')
            if meses:
                payload['meses'] = meses
            return payload

    if producto.get('pricePrimariaCLP') or producto.get('pricePrimariaUSD'):
        payload = dict(base)
        payload['variante'] = 'Primaria'
        payload['priceCLP'] = producto.get('pricePrimariaCLP')
        payload['priceUSD'] = producto.get('pricePrimariaUSD')
        return payload

    if producto.get('priceSecundariaCLP') or producto.get('priceSecundariaUSD'):
        payload = dict(base)
        payload['variante'] = 'Secundaria'
        payload['priceCLP'] = producto.get('priceSecundariaCLP')
        payload['priceUSD'] = producto.get('priceSecundariaUSD')
        return payload

    return base


def construir_planes_opcion(producto):
    planes = []
    precios_por_mes = producto.get('preciosPorMes', [])
    if isinstance(precios_por_mes, dict):
        precios_por_mes = [precios_por_mes]
    if not isinstance(precios_por_mes, list):
        return planes

    for precio in precios_por_mes:
        if not isinstance(precio, dict):
            continue
        payload = dict(producto)
        payload['priceCLP'] = precio.get('clp') or precio.get('priceCLP')
        payload['priceUSD'] = precio.get('usd') or precio.get('priceUSD')
        meses = precio.get('meses') or precio.get('mes') or precio.get('duracion') or precio.get('periodo')
        if meses:
            payload['meses'] = meses
        valores = []
        if payload.get('priceCLP') not in [None, '']:
            valores.append(formatear_moneda(payload.get('priceCLP'), 'CLP'))
        if payload.get('priceUSD') not in [None, '']:
            valores.append(formatear_moneda(payload.get('priceUSD'), 'USD'))
        label = f"{meses} mes{'es' if str(meses) != '1' else ''}" if meses else 'Plan disponible'
        planes.append({
            'label': label,
            'price': ' / '.join(valores),
            'actions': [
                {'type': 'buy', 'label': 'Comprar ahora', 'producto': payload},
                {'type': 'add_to_cart', 'label': 'Agregar al carrito', 'producto': payload},
            ]
        })
    return planes


def construir_opciones_chat(productos_relevantes, categorias, limite=None):
    opciones = []
    seleccion = productos_relevantes if limite is None else productos_relevantes[:limite]
    for producto in seleccion:
        categoria = obtener_categoria_nombre(producto, categorias) or 'Sin categoria'
        categoria_lower = categoria.lower()
        precio = formatear_precios_producto(producto, categorias)
        payload = construir_payload_opcion(producto, categorias)
        planes = construir_planes_opcion(producto)
        if categoria_lower in ['streaming', 'suscripciones'] and len(planes) > 1:
            opciones.append({
                'title': producto.get('name', 'Sin nombre'),
                'subtitle': categoria,
                'selectorLabel': 'Selecciona un plan',
                'plans': planes,
                'actions': [
                    {'type': 'go_to_cart', 'label': 'Ir al carrito'}
                ]
            })
            continue
        opciones.append({
            'title': producto.get('name', 'Sin nombre'),
            'subtitle': categoria,
            'price': precio,
            'action': {
                'type': 'add_to_cart',
                'label': 'Agregar al carrito',
                'producto': payload,
            }
        })
    return opciones


def producto_tiene_tarjeta_simple(producto, categorias):
    categoria = obtener_categoria_nombre(producto, categorias).lower()
    if categoria in ['streaming', 'suscripciones'] and isinstance(producto.get('preciosPorMes'), list):
        return len(producto.get('preciosPorMes', [])) <= 1
    if (producto.get('pricePrimariaCLP') or producto.get('pricePrimariaUSD') or producto.get('priceSecundariaCLP') or producto.get('priceSecundariaUSD')):
        return False
    return bool(producto.get('priceCLP') or producto.get('priceUSD'))


def producto_requiere_selector_plan(producto, categorias):
    categoria = obtener_categoria_nombre(producto, categorias).lower()
    if categoria not in ['streaming', 'suscripciones']:
        return False
    return len(construir_planes_opcion(producto)) > 1


def construir_acciones_producto_unico(producto, categorias):
    acciones = construir_acciones_compra(producto, categorias)
    acciones_filtradas = []
    for accion in acciones:
        if accion.get('type') == 'add_to_cart':
            continue
        acciones_filtradas.append(accion)
    return acciones_filtradas


def historial_tiene_lista_opciones(historial):
    historial_texto = ' '.join(
        normalizar_texto(item.get('text', ''))
        for item in historial[-4:]
        if isinstance(item, dict)
    )
    return 'opciones parecidas en el catalogo' in historial_texto or 'numero de la opcion que te interesa' in historial_texto


def extraer_terminos_refinamiento(mensaje):
    return [
        token for token in tokenizar_consulta(mensaje)
        if token not in PALABRAS_REFINAR_BUSQUEDA
    ]


def construir_respuesta_refinar_busqueda(mensaje, historial, productos, categorias):
    if not historial_tiene_lista_opciones(historial):
        return None

    mensaje_norm = normalizar_texto(mensaje)
    activa_refinamiento = any(palabra in mensaje_norm.split() for palabra in ['otro', 'otra', 'mas', 'similar', 'parecido', 'parecida'])
    activa_refinamiento = activa_refinamiento or mensaje_norm.startswith('busco otro') or mensaje_norm.startswith('quiero otro')
    if not activa_refinamiento:
        return None

    terminos = extraer_terminos_refinamiento(mensaje)
    if not terminos:
        return {
            'respuesta': (
                "Para ayudarte mejor, dime el nombre mas exacto del juego.\n\n"
                "Tambien puedes decirme algo como:\n"
                "- Mario Kart\n"
                "- Mario Party\n"
                "- Mario RPG\n"
                "- Mario Odyssey"
            ),
            'acciones': [],
        }

    consulta_refinada = ' '.join(terminos)
    productos_relevantes = buscar_productos_relevantes(consulta_refinada, productos)
    if not productos_relevantes:
        return {
            'respuesta': (
                f"No encontre '{consulta_refinada}' en la base de datos de Panda Store.\n\n"
                "Si quieres, escribe el nombre exacto del juego o usa un boton de contacto para confirmar disponibilidad con un admin."
            ),
            'acciones': construir_acciones_contacto(),
        }

    return {
        'respuesta': (
            f"Hay varias opciones para '{consulta_refinada}'.\n\n"
            "Te dejo algunas alternativas para que elijas o agregues la correcta al carrito.\n"
            "Si prefieres, tambien puedes decirme el numero de la opcion anterior."
        ),
        'acciones': [],
        'opciones': construir_opciones_chat(productos_relevantes, categorias),
    }


def construir_acciones_contacto():
    return [
        {'type': 'open_url', 'label': 'Instagram', 'url': LINKS_TIENDAS['instagram']},
        {'type': 'open_url', 'label': 'WhatsApp', 'url': LINKS_TIENDAS['whatsapp']},
        {'type': 'open_url', 'label': 'Telegram', 'url': LINKS_TIENDAS['telegram']},
    ]


def construir_whatsapp_handoff(historial):
    resumen_items = []
    for item in historial[-10:]:
        if not isinstance(item, dict):
            continue
        if str(item.get('from', '')).lower() != 'user':
            continue
        texto = str(item.get('text', '')).strip()
        if not texto:
            continue
        if texto not in resumen_items:
            resumen_items.append(texto)

    resumen = resumen_items[-4:]
    resumen_texto = '\n'.join(f"- {texto}" for texto in resumen) if resumen else '- Cliente solicita ayuda adicional'
    mensaje = quote('Hola, vengo desde el chat de Panda Store.\n\nResumen de mi consulta:\n' + '\n'.join(f'- {texto}' for texto in resumen))
    return {
        'respuesta': (
            'Te derivo con soporte humano por WhatsApp.\n\n'
            'Resumen de lo que ya consultaste:\n'
            + resumen_texto
            + '\n\nToca el boton y seguimos por WhatsApp sin que tengas que repetir todo.'
        ),
        'acciones': [
            {'type': 'open_url', 'label': 'Continuar por WhatsApp', 'url': f"{LINKS_TIENDAS['whatsapp']}?text={mensaje}"}
        ],
        'opciones': [],
    }


def es_consulta_para_humano(mensaje, historial):
    mensaje_norm = normalizar_texto(mensaje)
    if mensaje_es_solo_plataforma(mensaje):
        return False
    if any(frase in mensaje_norm for frase in PALABRAS_FRUSTRACION):
        return True
    if 'soporte' in mensaje_norm and ('humano' in mensaje_norm or 'persona' in mensaje_norm):
        return True
    historial_usuario = [
        normalizar_texto(item.get('text', ''))
        for item in historial[-6:]
        if isinstance(item, dict) and str(item.get('from', '')).lower() == 'user'
    ]
    if len(historial_usuario) >= 4 and len({texto for texto in historial_usuario if texto}) <= 2:
        return True
    return False


def obtener_ultimo_mensaje_interactivo(historial):
    for item in reversed(historial):
        if not isinstance(item, dict):
            continue
        if str(item.get('from', '')).lower() != 'bot':
            continue
        if item.get('options') or item.get('actions'):
            return item
    return None


def extraer_indice_opcion(mensaje):
    mensaje_norm = normalizar_texto(mensaje)
    tokens = mensaje_norm.split()
    for token in tokens:
        if token in ORDINALES:
            return ORDINALES[token]
    match = re.search(r'\b([1-9][0-9]*)\b', mensaje_norm)
    if match:
        return int(match.group(1)) - 1
    return None


def construir_respuesta_producto_seleccionado(producto, categorias):
    if producto_requiere_selector_plan(producto, categorias):
        return {'respuesta': '', 'acciones': [], 'opciones': construir_opciones_chat([producto], categorias)}
    if producto_tiene_tarjeta_simple(producto, categorias):
        return {
            'respuesta': '',
            'acciones': construir_acciones_producto_unico(producto, categorias),
            'opciones': construir_opciones_chat([producto], categorias),
        }
    categoria = obtener_categoria_nombre(producto, categorias) or 'esa consola'
    return {
        'respuesta': f"Encontre {producto.get('name', 'ese juego')} para {categoria}. Elige si quieres primaria o secundaria.",
        'acciones': construir_acciones_compra(producto, categorias),
        'opciones': [],
    }


def construir_respuesta_acciones_filtradas(acciones):
    return {'respuesta': '', 'acciones': acciones, 'opciones': []}


def expandir_variantes_relacionadas(consulta, productos_relevantes, productos, categorias):
    if not productos_relevantes:
        return productos_relevantes

    tokens_texto, tokens_numericos = extraer_tokens_consulta_relevantes(consulta)
    if not tokens_numericos and len(tokens_texto) < 2:
        return productos_relevantes

    variantes = [producto for producto in productos if producto_coincide_con_titulo_base(producto, consulta)]
    if len(variantes) <= len(productos_relevantes):
        return productos_relevantes

    variantes.sort(
        key=lambda producto: (
            puntuar_producto(consulta, producto),
            1 if producto_corresponde_a_plataforma(producto, categorias, 'switch') else 0,
        ),
        reverse=True,
    )
    return variantes


def detectar_plataforma_solicitada(mensaje):
    mensaje_norm = normalizar_texto(mensaje)
    if 'ps5' in mensaje_norm or 'playstation 5' in mensaje_norm or 'pos5' in mensaje_norm:
        return 'ps5'
    if 'ps4' in mensaje_norm or 'playstation 4' in mensaje_norm:
        return 'ps4'
    if 'switch' in mensaje_norm or 'nintendo' in mensaje_norm:
        return 'switch'
    return None


def mensaje_es_solo_plataforma(mensaje):
    plataforma = detectar_plataforma_solicitada(mensaje)
    if not plataforma:
        return False

    tokens = [token for token in normalizar_texto(mensaje).split() if token]
    tokens_ignorar = {
        'y', 'o', 'oh', 'para', 'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una',
        'esa', 'ese', 'mismo', 'misma', 'quiero', 'busco', 'seria', 'seria?', 'hay'
    }
    aliases_plataforma = {
        'ps5', 'ps4', 'pos5', 'switch', 'nintendo', 'playstation', '4', '5'
    }
    restantes = [token for token in tokens if token not in tokens_ignorar and token not in aliases_plataforma]
    return len(restantes) == 0


def construir_respuesta_pedir_juego_plataforma(plataforma):
    etiqueta = plataforma.upper() if plataforma.startswith('ps') else 'Nintendo Switch'
    return {
        'respuesta': (
            f"Si buscas algo para {etiqueta}, dime que juego te interesa y te digo si esta en esa consola.\n\n"
            "Por ejemplo: FC 26, GTA V, Mario Kart, etc."
        ),
        'acciones': [],
        'opciones': [],
    }


def producto_corresponde_a_plataforma(producto, categorias, plataforma):
    categoria = normalizar_texto(obtener_categoria_nombre(producto, categorias))
    if plataforma == 'ps5':
        return 'ps5' in categoria
    if plataforma == 'ps4':
        return 'ps4' in categoria
    if plataforma == 'switch':
        return 'switch' in categoria or 'nintendo' in categoria
    return False


def obtener_titulo_contextual(ultimo_mensaje):
    opciones = ultimo_mensaje.get('options') or []
    titulos = [str(opcion.get('title', '')).strip() for opcion in opciones if str(opcion.get('title', '')).strip()]
    if len(set(titulos)) == 1 and titulos:
        return titulos[0]

    acciones = ultimo_mensaje.get('actions') or []
    nombres = []
    for accion in acciones:
        producto = accion.get('producto') or {}
        nombre = str(producto.get('name', '')).strip()
        if nombre:
            nombres.append(nombre)
    if len(set(nombres)) == 1 and nombres:
        return nombres[0]
    return None


def producto_coincide_con_titulo_base(producto, titulo_base):
    nombre_norm = normalizar_texto(producto.get('name', ''))
    titulo_norm = normalizar_texto(titulo_base)
    if not nombre_norm or not titulo_norm:
        return False

    tokens_texto, tokens_numericos = extraer_tokens_consulta_relevantes(titulo_base)
    tokens_nombre = tokenizar_consulta(producto.get('name', ''))

    if tokens_numericos and not all(token in tokens_nombre for token in tokens_numericos):
        return False
    if tokens_texto and not all(token_coincide_aproximado(token, tokens_nombre) for token in tokens_texto):
        return False

    return titulo_norm in nombre_norm or bool(tokens_texto or tokens_numericos)


def resolver_cambio_plataforma_por_contexto(mensaje, ultimo_mensaje, productos, categorias):
    plataforma = detectar_plataforma_solicitada(mensaje)
    if not plataforma:
        return None

    titulo = obtener_titulo_contextual(ultimo_mensaje)
    if not titulo:
        if mensaje_es_solo_plataforma(mensaje):
            return construir_respuesta_pedir_juego_plataforma(plataforma)
        return None

    candidatos_plataforma = [
        producto for producto in productos
        if producto_corresponde_a_plataforma(producto, categorias, plataforma)
        and producto_coincide_con_titulo_base(producto, titulo)
    ]
    candidatos_plataforma.sort(key=lambda producto: puntuar_producto(titulo, producto), reverse=True)

    if not candidatos_plataforma:
        return {
            'respuesta': (
                f"No encontre una version de {titulo} para {plataforma.upper()} en la base de datos de Panda Store.\n\n"
                "Si quieres, te dejo botones de contacto para confirmar disponibilidad con un admin."
            ),
            'acciones': construir_acciones_contacto(),
            'opciones': [],
        }

    if len(candidatos_plataforma) == 1:
        return construir_respuesta_producto_seleccionado(candidatos_plataforma[0], categorias)

    return {
        'respuesta': construir_respuesta_opciones(candidatos_plataforma, categorias),
        'opciones': construir_opciones_chat(candidatos_plataforma, categorias),
        'acciones': [],
    }


def resolver_seleccion_por_contexto(mensaje, historial, productos, categorias):
    ultimo = obtener_ultimo_mensaje_interactivo(historial)
    if not ultimo:
        return None

    mensaje_norm = normalizar_texto(mensaje)
    respuesta_plataforma = resolver_cambio_plataforma_por_contexto(mensaje, ultimo, productos, categorias)
    if respuesta_plataforma:
        return respuesta_plataforma

    indice = extraer_indice_opcion(mensaje)
    opciones = ultimo.get('options') or []
    acciones = ultimo.get('actions') or []

    FRASES_CONFIRMACION = {
        'solo ese', 'solo esa', 'ese', 'esa', 'si ese', 'si esa',
        'ese nomas', 'esa nomas', 'ese mero', 'esa mera',
        'esa misma', 'ese mismo', 'si', 'si quiero', 'dale', 'va',
    }

    if opciones:
        if len(opciones) == 1 and (mensaje_norm in FRASES_CONFIRMACION or 'solo ese' in mensaje_norm or 'solo esa' in mensaje_norm or 'esa misma' in mensaje_norm or 'ese mismo' in mensaje_norm):
            indice = 0

        if indice is not None and 0 <= indice < len(opciones):
            opcion = opciones[indice]
            if opcion.get('plans'):
                if indice == 0:
                    return {'respuesta': 'Perfecto. Ahora elige el plan que quieres.', 'acciones': [], 'opciones': opciones}
            payload = ((opcion.get('action') or {}).get('producto') or {})
            producto_id = payload.get('id')
            producto = next((p for p in productos if p.get('id') == producto_id), None)
            if producto:
                return construir_respuesta_producto_seleccionado(producto, categorias)

        for opcion in opciones:
            if opcion.get('plans'):
                for plan in opcion.get('plans', []):
                    label_norm = normalizar_texto(plan.get('label', ''))
                    if label_norm and label_norm in mensaje_norm:
                        return construir_respuesta_acciones_filtradas([*(plan.get('actions') or []), *(opcion.get('actions') or [])])
                    meses_match = re.search(r'\b([1-9][0-9]*)\s*mes', mensaje_norm)
                    if meses_match and meses_match.group(1) in label_norm:
                        return construir_respuesta_acciones_filtradas([*(plan.get('actions') or []), *(opcion.get('actions') or [])])

        mejor_opcion = None
        mejor_score = 0
        for opcion in opciones:
            title = str(opcion.get('title', '')).strip()
            title_norm = normalizar_texto(title)
            if not title_norm:
                continue

            score = 0
            if title_norm == mensaje_norm:
                score += 100
            if title_norm and title_norm in mensaje_norm:
                score += 50
            if mensaje_norm and mensaje_norm in title_norm:
                score += 25
            score += puntuar_producto(mensaje, {'name': title})

            if score > mejor_score:
                mejor_score = score
                mejor_opcion = opcion

        if mejor_opcion and mejor_score >= 30:
            payload = ((mejor_opcion.get('action') or {}).get('producto') or {})
            producto_id = payload.get('id')
            producto = next((p for p in productos if p.get('id') == producto_id), None)
            if producto:
                return construir_respuesta_producto_seleccionado(producto, categorias)

    if acciones:
        variantes = []
        if 'secundaria' in mensaje_norm:
            variantes.append('secundaria')
        if 'primaria' in mensaje_norm:
            variantes.append('primaria')
        if variantes:
            filtradas = [accion for accion in acciones if any(variante in normalizar_texto(accion.get('label', '')) for variante in variantes) or accion.get('type') == 'go_to_cart']
            if filtradas:
                return construir_respuesta_acciones_filtradas(filtradas)

        if mensaje_norm in FRASES_CONFIRMACION or 'esa misma' in mensaje_norm or 'ese mismo' in mensaje_norm or 'solo ese' in mensaje_norm or 'solo esa' in mensaje_norm:
            return construir_respuesta_acciones_filtradas(acciones)

    return None


def obtener_texto_contexto_reciente(historial):
    partes = []
    for item in historial[-6:]:
        if not isinstance(item, dict):
            continue
        texto = str(item.get('text', '')).strip()
        if texto:
            partes.append(texto)
        for opcion in item.get('options', []) or []:
            if not isinstance(opcion, dict):
                continue
            if opcion.get('title'):
                partes.append(str(opcion.get('title')))
            if opcion.get('subtitle'):
                partes.append(str(opcion.get('subtitle')))
    return normalizar_texto(' '.join(partes))


def contexto_es_nintendo_switch(mensaje, historial):
    mensaje_norm = normalizar_texto(mensaje)
    contexto_norm = obtener_texto_contexto_reciente(historial)
    texto_total = f"{mensaje_norm} {contexto_norm}".strip()
    if 'switch' in texto_total or 'nintendo' in texto_total:
        return True
    if 'membresia' in texto_total and 'suscripciones' in texto_total:
        return True
    return False


def detectar_faq_switch(mensaje):
    mensaje_norm = normalizar_texto(mensaje)
    if 'primaria' in mensaje_norm or 'secundaria' in mensaje_norm:
        return 'tipo_cuenta'
    for faq, patrones in FAQ_SWITCH_PATTERNS.items():
        if any(patron in mensaje_norm for patron in patrones):
            return faq
    return None


def construir_respuesta_faq_switch(tipo_faq):
    if tipo_faq == 'switch2':
        return {
            'respuesta': 'Si, sirven para ambas Switch, incluida Switch 2.',
            'acciones': [],
            'opciones': [],
        }

    if tipo_faq == 'online':
        return {
            'respuesta': 'Si, se puede jugar online.',
            'acciones': [],
            'opciones': [],
        }

    if tipo_faq == 'tipo_cuenta':
        return {
            'respuesta': (
                'Tipos de cuenta\n\n'
                'Nintendo Switch:\n'
                '- Solo vendemos primarias\n'
                '- Juegas desde tu perfil personal\n\n'
                'PS4 y PS5:\n'
                '- Vendemos primaria y secundaria\n'
                '- En secundaria juegas desde el usuario entregado'
            ),
            'acciones': [],
            'opciones': [],
        }

    if tipo_faq == 'permanencia':
        return {
            'respuesta': 'Si, son juegos de duracion indefinida. El resto de condiciones lo puedes revisar en terminos.',
            'acciones': [
                {'type': 'open_route', 'label': 'Ver terminos', 'route': '/terminos'}
            ],
            'opciones': [],
        }

    if tipo_faq == 'riesgo':
        return {
            'respuesta': 'En Nintendo Switch si puede existir riesgo de perdida o bloqueo. Para ese tema revisa los terminos y condiciones.',
            'acciones': [
                {'type': 'open_route', 'label': 'Ver terminos', 'route': '/terminos'}
            ],
            'opciones': [],
        }

    return None


def tokenizar_intencion(texto):
    return [
        token for token in normalizar_texto(texto).split()
        if token and token not in STOPWORDS_INTENCION
    ]


def coincide_keyword_aproximada(mensaje_norm, keywords):
    tokens = tokenizar_intencion(mensaje_norm)
    for keyword in keywords:
        keyword_norm = normalizar_texto(keyword)
        if not keyword_norm:
            continue
        if keyword_norm in mensaje_norm:
            return True
        keyword_tokens = tokenizar_intencion(keyword_norm)
        if keyword_tokens and frase_coincide_aproximada(keyword_tokens, tokens):
            return True
        for token in tokens:
            if tokens_son_parecidos(token, keyword_norm):
                return True
    return False


def detectar_intencion_info(mensaje):
    mensaje_norm = normalizar_texto(mensaje)
    for nombre, keywords in INFO_KEYWORDS.items():
        if coincide_keyword_aproximada(mensaje_norm, keywords):
            return nombre
    return None


def mensaje_compra_menciona_producto(mensaje):
    mensaje_norm = normalizar_texto(mensaje)
    if not any(fragmento in mensaje_norm for fragmento in ['compr', 'conpr']):
        return False

    tokens_genericos = {
        'como', 'es', 'la', 'el', 'los', 'las', 'un', 'una', 'de', 'del', 'para', 'que', 'cual',
        'proceso', 'funciona', 'hacer', 'hago', 'hace', 'puedo', 'quiero', 'seria', 'realiza',
        'explicas', 'explicame', 'compra', 'comprar', 'compro', 'compras', 'comprarlo', 'comprarla',
        'conpra', 'conprar', 'conpro', 'conpras'
    }
    tokens = [token for token in tokenizar_intencion(mensaje) if token not in tokens_genericos]
    tokens_texto = [token for token in tokens if not token.isdigit()]
    tokens_numericos = [token for token in tokens if token.isdigit()]
    return bool(tokens_texto or tokens_numericos)


def construir_respuesta_catalogo_general(productos, categorias):
    categorias_con_ejemplos = []
    for categoria in categorias.values():
        categoria_id = categoria.get('id') or ''
        nombre = categoria.get('name', '').strip()
        if not nombre:
            continue
        ejemplos = [p.get('name', '').strip() for p in productos if p.get('categoryId') == categoria_id and p.get('name')][:3]
        if ejemplos:
            categorias_con_ejemplos.append((nombre, ejemplos))

    if not categorias_con_ejemplos:
        return {
            'respuesta': 'Vendemos juegos digitales, suscripciones y streaming. Si quieres, dime una consola o un juego y te ayudo a buscarlo.',
            'acciones': [],
        }

    bloques = []
    for nombre, ejemplos in categorias_con_ejemplos[:4]:
        bloques.append(f"- {nombre}: {', '.join(ejemplos)}")

    return {
        'respuesta': (
            "En Panda Store vendemos juegos digitales, suscripciones y streaming.\n\n"
            "Categorias y ejemplos:\n"
            f"{'\n'.join(bloques)}\n\n"
            "Si quieres, dime el nombre del juego o la consola y te ayudo a encontrarlo."
        ),
        'acciones': [
            {'type': 'send_message', 'label': 'Promociones', 'message': 'promociones'},
            {'type': 'send_message', 'label': 'Medios de pago', 'message': 'medios de pago'}
        ],
    }


def construir_respuesta_info(intencion, productos=None, categorias=None):
    if intencion == 'catalogo':
        return construir_respuesta_catalogo_general(productos or [], categorias or {})

    if intencion == 'formato':
        return {
            'respuesta': (
                "Formato de los productos\n\n"
                "En Panda Store trabajamos con productos digitales.\n"
                "No vendemos juegos fisicos ni hacemos envios fisicos.\n\n"
                "Despues de la compra te enviamos los datos e instrucciones para usar tu producto."
            ),
            'acciones': [
                {'type': 'send_message', 'label': 'Como es la entrega', 'message': 'como es la entrega'},
                {'type': 'send_message', 'label': 'Como comprar', 'message': 'como compro'},
            ],
        }

    if intencion == 'promociones':
        return {
            'respuesta': (
                "Promociones Panda Store\n\n"
                "Revisa las promos activas desde los botones de abajo.\n"
                "Tambien puedes abrir el pack de juegos de Nintendo Switch."
            ),
            'acciones': [
                {'type': 'open_route', 'label': 'Ver promociones', 'route': '/promos'},
                {'type': 'open_url', 'label': 'Ver pack de juegos', 'url': LINKS_TIENDAS['pack_switch']}
            ],
        }

    if intencion == 'pagos':
        return {
            'respuesta': (
                "Medios de pago\n\n"
                "Chile:\n"
                "- Transferencia bancaria\n"
                "- Deposito\n"
                "- Tarjeta de credito\n"
                "- Tarjeta de debito\n\n"
                "Internacional:\n"
                "- Tarjeta internacional\n"
                "- Transferencia internacional\n"
                "- Crypto\n"
                "- PayPal (USD)"
            ),
            'acciones': [],
        }

    if intencion == 'compra':
        return {
            'respuesta': (
                "Como comprar en Panda Store\n\n"
                "1. Busca el juego o suscripcion que quieres del catalogo.\n"
                "2. Agregalo al carrito con el boton + o entra al detalle del producto.\n"
                "3. Ve al carrito y revisa tu pedido.\n"
                "4. Completa el pago con el metodo que prefieras.\n"
                "5. Despues te enviamos los datos e instrucciones para usar tu compra.\n\n"
                "Si quieres, puedo ayudarte a buscar un juego o explicarte los medios de pago."
            ),
            'acciones': [
                {'type': 'send_message', 'label': 'Buscar un juego', 'message': 'que juegos venden'},
                {'type': 'send_message', 'label': 'Ver medios de pago', 'message': 'medios de pago'}
            ],
        }

    if intencion == 'instalacion':
        return {
            'respuesta': (
                "Instalacion Nintendo\n\n"
                "Abre la guia paso a paso desde el boton de abajo.\n"
                "Si despues te queda alguna duda, tambien te puedo orientar."
            ),
            'acciones': [
                {'type': 'open_route', 'label': 'Ver instalacion', 'route': '/instalacion-nintendo'}
            ],
        }

    if intencion == 'terminos':
        return {
            'respuesta': (
                "Terminos y seguridad\n\n"
                "Puedes revisar las condiciones de compra y la informacion de seguridad desde el boton de abajo."
            ),
            'acciones': [
                {'type': 'open_route', 'label': 'Ver terminos', 'route': '/terminos'}
            ],
        }

    if intencion == 'entrega':
        return {
            'respuesta': (
                "Entrega Panda Store\n\n"
                "La entrega es digital.\n"
                "Te enviamos los datos e instrucciones por nuestros canales de contacto.\n\n"
                "Si quieres, tambien puedo ayudarte con instalacion o soporte."
            ),
            'acciones': [
                {'type': 'open_route', 'label': 'Ver instalacion', 'route': '/instalacion-nintendo'},
                {'type': 'open_url', 'label': 'Hablar con soporte', 'url': LINKS_TIENDAS['whatsapp']}
            ],
        }

    if intencion == 'contacto':
        return {
            'respuesta': (
                "Soporte Panda Store\n\n"
                "Si quieres hablar con una persona, usa el canal que te quede mas comodo."
            ),
            'acciones': construir_acciones_contacto(),
        }

    return None


def detectar_intencion_categoria(mensaje):
    mensaje_norm = normalizar_texto(mensaje)
    for nombre, config in INTENCION_CATEGORIA.items():
        if coincide_keyword_aproximada(mensaje_norm, config['keywords']):
            return nombre
    return None


def construir_respuesta_categoria(intencion, productos, categorias):
    config = INTENCION_CATEGORIA.get(intencion)
    if not config:
        return None

    productos_filtrados = []
    filtro_nombres = config.get('filtro_nombres')
    filtro_categoria = config.get('filtro_categoria')
    categoria_id_encontrada = None

    if filtro_nombres:
        for producto in productos:
            nombre_norm = normalizar_texto(producto.get('name', ''))
            if any(kw in nombre_norm for kw in filtro_nombres):
                productos_filtrados.append(producto)
    elif filtro_categoria:
        for producto in productos:
            cat_id = producto.get('categoryId', '')
            cat_nombre = normalizar_texto(obtener_categoria_nombre(producto, categorias))
            if filtro_categoria in cat_nombre:
                productos_filtrados.append(producto)
                if not categoria_id_encontrada:
                    categoria_id_encontrada = cat_id

    if not productos_filtrados:
        return None

    es_consola = config.get('es_consola', False)
    pregunta = config.get('pregunta')

    if es_consola or pregunta:
        muestra = productos_filtrados[:6]
        nombres_muestra = [p.get('name', 'Sin nombre') for p in muestra]
        total = len(productos_filtrados)

        texto = pregunta or ''
        texto += f"\n\nTenemos {total} productos en esta categoria."
        texto += "\nAlgunos ejemplos:\n"
        for i, nombre in enumerate(nombres_muestra, 1):
            texto += f"{i}. {nombre}\n"
        if total > len(muestra):
            texto += f"\n...y {total - len(muestra)} mas."
        texto += "\n\nEscribeme el nombre del que te interesa o visita el catalogo completo."

        acciones = []
        if categoria_id_encontrada:
            acciones.append({
                'type': 'open_route',
                'label': 'Ver catalogo completo',
                'route': f'/categoria/{categoria_id_encontrada}',
            })
        acciones.extend(construir_acciones_contacto())

        return {
            'respuesta': texto,
            'opciones': construir_opciones_chat(muestra, categorias),
            'acciones': acciones,
        }

    opciones = construir_opciones_chat(productos_filtrados[:8], categorias)
    return {
        'respuesta': config.get('mensaje', ''),
        'opciones': opciones,
        'acciones': [],
    }


def construir_acciones_compra(producto, categorias):
    categoria = obtener_categoria_nombre(producto, categorias).lower()
    acciones = []
    base = dict(producto)

    def resumir_precio_boton(payload):
        valores = []
        if payload.get('priceCLP') not in [None, '']:
            valores.append(formatear_moneda(payload.get('priceCLP'), 'CLP'))
        if payload.get('priceUSD') not in [None, '']:
            valores.append(formatear_moneda(payload.get('priceUSD'), 'USD'))
        return ' / '.join(valores)

    def construir_etiqueta_con_precio(base_label, payload):
        precio_resumido = resumir_precio_boton(payload)
        if not precio_resumido:
            return base_label
        return f"{base_label} - {precio_resumido}"

    def agregar_acciones(payload, buy_label, cart_label):
        acciones.append({'type': 'buy', 'label': construir_etiqueta_con_precio(buy_label, payload), 'producto': payload})
        acciones.append({'type': 'add_to_cart', 'label': construir_etiqueta_con_precio(cart_label, payload), 'producto': payload})

    if categoria in ['streaming', 'suscripciones'] and isinstance(producto.get('preciosPorMes'), list):
        for precio in producto.get('preciosPorMes', []):
            if not isinstance(precio, dict):
                continue
            meses = precio.get('meses') or precio.get('mes') or precio.get('duracion') or precio.get('periodo')
            payload = dict(base)
            payload['priceCLP'] = precio.get('clp') or precio.get('priceCLP')
            payload['priceUSD'] = precio.get('usd') or precio.get('priceUSD')
            if meses:
                payload['meses'] = meses
            buy_label = f"Comprar {meses} mes{'es' if str(meses) != '1' else ''}" if meses else 'Comprar ahora'
            cart_label = f"Agregar {meses} mes{'es' if str(meses) != '1' else ''}" if meses else 'Agregar al carrito'
            agregar_acciones(payload, buy_label, cart_label)
        if acciones:
            acciones.append({'type': 'go_to_cart', 'label': 'Ir al carrito'})
        return acciones[:13]

    if producto.get('pricePrimariaCLP') or producto.get('pricePrimariaUSD'):
        payload = dict(base)
        payload['variante'] = 'Primaria'
        payload['priceCLP'] = producto.get('pricePrimariaCLP')
        payload['priceUSD'] = producto.get('pricePrimariaUSD')
        agregar_acciones(payload, 'Comprar primaria', 'Agregar primaria')

    if producto.get('priceSecundariaCLP') or producto.get('priceSecundariaUSD'):
        payload = dict(base)
        payload['variante'] = 'Secundaria'
        payload['priceCLP'] = producto.get('priceSecundariaCLP')
        payload['priceUSD'] = producto.get('priceSecundariaUSD')
        agregar_acciones(payload, 'Comprar secundaria', 'Agregar secundaria')

    if acciones:
        acciones.append({'type': 'go_to_cart', 'label': 'Ir al carrito'})
        return acciones[:5]

    if producto.get('priceCLP') or producto.get('priceUSD'):
        agregar_acciones(base, 'Comprar ahora', 'Agregar al carrito')
        acciones.append({'type': 'go_to_cart', 'label': 'Ir al carrito'})

    return acciones


FRASES_CONVERSACIONALES = {
    'gracias', 'muchas gracias', 'thanks', 'ok', 'okay', 'listo', 'entiendo',
    'ya', 'ya entendi', 'perfecto', 'genial', 'buena', 'buena onda', 'chevere',
    'que cool', 'cool', 'excelente', 'super', 'de acuerdo', 'claro',
    'no entiendo', 'no entendi', 'como', 'que', 'que quieres decir', 'no te entendi',
    'a que te refieres', 'que significa eso', 'explicame', 'no me queda claro',
    'hola', 'buenas', 'buenas tardes', 'buenas noches', 'buenos dias', 'hey',
    'chao', 'adios', 'bye', 'hasta luego', 'nos vemos',
    'jaja', 'jajaja', 'xd', 'lol', 'jeje',
}

FRASES_RESPUESTA_CORTA = {
    'si', 'no', 'sip', 'sep', 'nop', 'nel', 'dale', 'va', 'simon', 'nel',
    'bueno', 'malo', 'puede ser', 'tal vez', 'quizas', 'creo que si', 'creo que no',
    'ambos', 'los dos', 'cualquiera', 'el primero', 'el segundo', 'el tercero',
    'la primera', 'la segunda', 'la tercera',
}


def es_mensaje_conversacional(mensaje, historial):
    """Detect messages that are conversational in nature and should go to OpenAI
    instead of the product search pipeline."""
    mensaje_norm = normalizar_texto(mensaje)

    if mensaje_norm in FRASES_CONVERSACIONALES:
        return True

    if mensaje_norm in FRASES_RESPUESTA_CORTA and historial:
        return True

    if len(mensaje_norm.split()) <= 2 and not any(
        palabra in mensaje_norm.split()
        for palabra in PALABRAS_INTENCION_PRODUCTO
    ):
        tokens = tokenizar_consulta(mensaje)
        if not tokens:
            return True

    if '?' in str(mensaje) and len(mensaje_norm.split()) <= 4:
        tokens = tokenizar_consulta(mensaje)
        if not tokens or all(len(t) < 3 for t in tokens):
            return True

    return False


def es_mensaje_buscar_otro(mensaje, historial):
    mensaje_norm = normalizar_texto(mensaje)
    frases = {
        'otro', 'otra', 'busco otro', 'busco otra', 'otro juego', 'otra opcion',
        'otra opcion mejor', 'ninguno', 'ninguna', 'no me interesa', 'alguno otro'
    }
    if mensaje_norm not in frases:
        return False
    return historial_tiene_lista_opciones(historial)


def es_consulta_fuera_de_tema(mensaje):
    mensaje_norm = normalizar_texto(mensaje)
    tokens = set(tokenizar_consulta(mensaje))

    if tokens & PALABRAS_FUERA_DE_TEMA:
        return True

    if re.fullmatch(r'[0-9\s\+\-\*\/\=\(\)\.]+', mensaje.strip()):
        return True

    patrones = [
        r'ejercicio[s]? matem',
        r'resolver .*ecuacion',
        r'cuanto es\s+[0-9\s\+\-\*\/\=\(\)]+',
        r'ayuda.*tarea',
    ]
    return any(re.search(patron, mensaje_norm) for patron in patrones)

def sugerir_similares(nombre, productos):
    similares = buscar_productos_relevantes(nombre, productos, limite=3)
    return similares[:3]


def buscar_categorias_relevantes(consulta, categorias):
    consulta_norm = normalizar_texto(consulta)
    relevantes = []
    for categoria in categorias.values():
        nombre = categoria.get('name', '')
        nombre_norm = normalizar_texto(nombre)
        score = 0
        if nombre_norm and nombre_norm in consulta_norm:
            score += 40
        overlap = set(tokenizar_consulta(consulta)) & set(tokenizar_consulta(nombre))
        score += len(overlap) * 10
        if score > 0:
            relevantes.append((score, categoria))
    relevantes.sort(key=lambda item: item[0], reverse=True)
    return [categoria for _, categoria in relevantes[:3]]


def construir_contexto_productos(productos_relevantes, categorias):
    if not productos_relevantes:
        return 'No se encontraron productos claramente relevantes.'

    bloques = []
    for producto in productos_relevantes:
        categoria_nombre = obtener_categoria_nombre(producto, categorias) or 'Sin categoria'
        precio = formatear_precios_producto(producto, categorias)
        bloques.append(
            f"- Producto: {producto.get('name', 'Sin nombre')}\n"
            f"  Consola/Categoria: {categoria_nombre}\n"
            f"  Precio: {precio}"
        )
    return '\n'.join(bloques)


def construir_contexto_categorias(categorias_relevantes, productos, categorias):
    if not categorias_relevantes:
        return 'No hay categorias claramente relevantes.'

    bloques = []
    for categoria in categorias_relevantes:
        relacionados = [p.get('name', '') for p in productos if p.get('categoryId') == categoria.get('id')][:4]
        bloques.append(
            f"- Categoria: {categoria.get('name', 'Sin nombre')}\n"
            f"  Productos ejemplo: {', '.join(relacionados) if relacionados else 'Sin productos de ejemplo'}"
        )
    return '\n'.join(bloques)


def construir_historial_openai(historial):
    mensajes = []
    if not isinstance(historial, list):
        return mensajes

    for item in historial[-12:]:
        if not isinstance(item, dict):
            continue
        texto = str(item.get('text', '') or item.get('content', '') or '').strip()
        origen = str(item.get('from', '') or item.get('role', '') or '').strip().lower()

        if origen in ['bot', 'assistant', 'asistente', 'system']:
            partes = []
            if texto:
                partes.append(texto)
            opciones = item.get('options') or []
            if opciones:
                nombres_opciones = [str(o.get('title', '')).strip() for o in opciones if isinstance(o, dict) and o.get('title')]
                if nombres_opciones:
                    partes.append('[Opciones mostradas: ' + ', '.join(nombres_opciones) + ']')
            acciones = item.get('actions') or []
            if acciones:
                nombres_acciones = [str(a.get('label', '')).strip() for a in acciones if isinstance(a, dict) and a.get('label')]
                productos_accion = [str((a.get('producto') or {}).get('name', '')).strip() for a in acciones if isinstance(a, dict) and (a.get('producto') or {}).get('name')]
                if productos_accion:
                    partes.append('[Producto mostrado: ' + ', '.join(set(productos_accion)) + ']')
                elif nombres_acciones:
                    partes.append('[Botones: ' + ', '.join(nombres_acciones) + ']')
            contenido = '\n'.join(partes)
            if contenido:
                mensajes.append({'role': 'assistant', 'content': contenido})
        elif origen in ['user', 'usuario']:
            if texto:
                mensajes.append({'role': 'user', 'content': texto})

    return mensajes


def responder_con_openai(mensaje, contexto_productos, contexto_categorias, historial=None):
    mensajes = [
        {
            'role': 'system',
            'content': PROMPT_BASE + "\nCONTEXTO DE PRODUCTOS:\n" + contexto_productos + "\n\nCONTEXTO DE CATEGORIAS:\n" + contexto_categorias + "\n\nINSTRUCCIONES FINALES:\n- Lee todo el historial antes de responder. Pon atencion al contexto reciente para entender de que habla el usuario.\n- Si el usuario responde algo corto como un pais, un numero, un si/no o una aclaracion, interpretalo segun la pregunta anterior del chat.\n- Si el usuario cambia de tema, acepta el cambio con naturalidad y responde sobre el nuevo tema.\n- Si no entiendes la pregunta del usuario, pidele que te explique mejor. No inventes una respuesta.\n- Si el mensaje es ambiguo o podria significar varias cosas, pregunta al usuario cual opcion quiso decir.\n- Si el usuario pregunta por un juego o precio, responde solo con: titulo, consola/categoria y precio.\n- Si el usuario pregunta que venden, menciona juegos digitales, suscripciones y streaming.\n- No incluyas descripcion del juego salvo que el usuario la pida explicitamente.\n- Si el usuario pide precio, menciona el precio exacto del contexto.\n- Si el usuario pide soporte o instalacion, responde esa ayuda directamente y sin URLs visibles.\n- Si no hay coincidencia clara de producto, dilo con honestidad y pregunta si se referia a otra cosa.\n- Si la consulta es general como 'que juegos venden', responde con categorias y algunos ejemplos del contexto.\n- Usa 🇨🇱 para precios en pesos chilenos y 🇺🇸 para precios en dolares.\n- Ordena la respuesta con bloques cortos y faciles de leer.\n- No respondas con bloques tecnicos ni JSON.\n- No escribas URLs completas.\n- [Opciones mostradas: ...] y [Producto mostrado: ...] en el historial indican lo que el bot le presento al usuario. Usalos para entender el contexto."
        },
    ]

    mensajes.extend(construir_historial_openai(historial))
    mensajes.append({'role': 'user', 'content': mensaje})

    if openai_client is not None:
        respuesta = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=mensajes,
            temperature=0.6,
            max_tokens=450,
        )
        contenido = (((respuesta.choices or [None])[0]).message.content if getattr((respuesta.choices or [None])[0], 'message', None) else '') or ''
        contenido = str(contenido).strip()
        if not contenido:
            raise ValueError('OpenAI returned an empty response')
        return contenido

    if not OPENAI_API_KEY:
        raise RuntimeError('OPENAI_API_KEY is not configured')

    respuesta = openai.ChatCompletion.create(
        model=OPENAI_MODEL,
        messages=mensajes,
        temperature=0.6,
        max_tokens=450,
        request_timeout=OPENAI_TIMEOUT_SECONDS,
    )
    contenido = str(((respuesta.get('choices') or [{}])[0].get('message') or {}).get('content') or '').strip()
    if not contenido:
        raise ValueError('Legacy OpenAI client returned an empty response')
    return contenido


def build_fallback_response(productos_relevantes, categorias_relevantes, productos, categorias):
    if productos_relevantes:
        producto = productos_relevantes[0]
        categoria_nombre = obtener_categoria_nombre(producto, categorias)
        precio = formatear_precios_producto(producto, categorias)
        return (
            f"{producto.get('name', 'Sin nombre')}\n\n"
            f"Categoria: {categoria_nombre}\n"
            f"Precio: {precio}\n\n"
            "Si quieres, tambien te ayudo con soporte, instalacion o promociones."
        )
    if categorias_relevantes:
        categoria = categorias_relevantes[0]
        relacionados = [p.get('name', '') for p in productos if p.get('categoryId') == categoria.get('id')][:4]
        return (
            f"Categoria: {categoria.get('name', '')}\n\n"
            f"Ejemplos: {', '.join(relacionados) if relacionados else 'sin ejemplos cargados'}\n\n"
            "Tambien puedo ayudarte con soporte, instalacion o promociones."
        )
    return 'Puedo ayudarte con juegos, suscripciones, streaming, precios, soporte, instalacion y promociones. Dime que necesitas.'

@app.route('/chat', methods=['POST'])
def chat():
    client_id = get_client_identifier()
    try:
        payload = validate_chat_payload(request.get_json(silent=True) or {})
        mensaje = payload['mensaje']
        historial = payload['historial']
        enforce_rate_limit(client_id, mensaje)
    except ValueError as exc:
        log_chat_event('invalid_payload', client_id=client_id, error=str(exc))
        return jsonify({'error': str(exc)}), 400
    except PermissionError as exc:
        log_chat_event('rate_limited', client_id=client_id, error=str(exc))
        return jsonify({'error': str(exc)}), 429
    except Exception:
        logger.exception('Unexpected error while validating /chat request')
        return jsonify({'error': 'No se pudo procesar la solicitud'}), 400

    productos = obtener_productos()
    categorias = obtener_categorias()
    log_chat_event('chat_received', client_id=client_id, message=mensaje, history_size=len(historial))

    if es_consulta_para_humano(mensaje, historial):
        log_chat_event('handoff_whatsapp', client_id=client_id)
        return jsonify(construir_whatsapp_handoff(historial + [{'from': 'user', 'text': mensaje}]))

    respuesta_contextual = resolver_seleccion_por_contexto(mensaje, historial, productos, categorias)
    if respuesta_contextual:
        log_chat_event('context_selection', client_id=client_id, message=mensaje)
        return jsonify(respuesta_contextual)

    tipo_faq_switch = detectar_faq_switch(mensaje)
    if tipo_faq_switch and (tipo_faq_switch == 'tipo_cuenta' or contexto_es_nintendo_switch(mensaje, historial)):
        respuesta_switch = construir_respuesta_faq_switch(tipo_faq_switch)
        if respuesta_switch:
            log_chat_event('switch_faq', client_id=client_id, faq=tipo_faq_switch)
            return jsonify(respuesta_switch)

    if es_mensaje_buscar_otro(mensaje, historial):
        return jsonify({'respuesta': RESPUESTA_BUSCAR_OTRO, 'acciones': construir_acciones_contacto(), 'opciones': []})

    if es_consulta_fuera_de_tema(mensaje):
        log_chat_event('off_topic', client_id=client_id)
        return jsonify({'respuesta': RESPUESTA_FUERA_DE_TEMA, 'acciones': [], 'opciones': []})

    intencion_info = detectar_intencion_info(mensaje)
    if intencion_info == 'compra' and mensaje_compra_menciona_producto(mensaje):
        intencion_info = None
    if intencion_info:
        respuesta_info = construir_respuesta_info(intencion_info, productos=productos, categorias=categorias)
        if respuesta_info:
            log_chat_event('info_intent', client_id=client_id, intent=intencion_info)
            if 'opciones' not in respuesta_info:
                respuesta_info['opciones'] = []
            return jsonify(respuesta_info)

    intencion_cat = detectar_intencion_categoria(mensaje)
    if intencion_cat:
        respuesta_cat = construir_respuesta_categoria(intencion_cat, productos, categorias)
        if respuesta_cat:
            log_chat_event('category_intent', client_id=client_id, intent=intencion_cat)
            return jsonify(respuesta_cat)

    respuesta_refinada = construir_respuesta_refinar_busqueda(mensaje, historial, productos, categorias)
    if respuesta_refinada:
        log_chat_event('refined_search', client_id=client_id, message=mensaje)
        if 'opciones' not in respuesta_refinada:
            respuesta_refinada['opciones'] = []
        return jsonify(respuesta_refinada)

    if es_mensaje_conversacional(mensaje, historial):
        log_chat_event('conversational', client_id=client_id, message=mensaje)
        contexto_productos = construir_contexto_productos([], categorias)
        contexto_categorias = construir_contexto_categorias([], productos, categorias)
        try:
            respuesta = responder_con_openai(mensaje, contexto_productos, contexto_categorias, historial=historial)
        except Exception:
            logger.exception('OpenAI error on conversational message')
            respuesta = 'No estoy seguro de entender. \u00bfMe puedes dar mas detalles sobre lo que buscas?'
        return jsonify({'respuesta': respuesta, 'acciones': [], 'opciones': []})

    productos_relevantes = buscar_productos_relevantes(mensaje, productos)
    productos_relevantes = expandir_variantes_relacionadas(mensaje, productos_relevantes, productos, categorias)
    categorias_relevantes = buscar_categorias_relevantes(mensaje, categorias)
    consulta_producto = consulta_parece_producto(mensaje, productos_relevantes, categorias_relevantes)
    consulta_ambigua = consulta_producto and es_consulta_ambigua(mensaje, productos_relevantes)

    if consulta_ambigua:
        log_chat_event('ambiguous_results', client_id=client_id, total=len(productos_relevantes))
        return jsonify({
            'respuesta': construir_respuesta_opciones(productos_relevantes, categorias),
            'opciones': construir_opciones_chat(productos_relevantes, categorias),
            'acciones': [],
        })

    if consulta_producto and not productos_relevantes and not categorias_relevantes:
        log_chat_event('catalog_miss', client_id=client_id, message=mensaje)
        contexto_productos = construir_contexto_productos([], categorias)
        contexto_categorias = construir_contexto_categorias([], productos, categorias)
        try:
            respuesta_ai = responder_con_openai(mensaje, contexto_productos, contexto_categorias, historial=historial)
        except Exception:
            logger.exception('OpenAI error on catalog miss')
            respuesta_ai = None
        if respuesta_ai:
            return jsonify({'respuesta': respuesta_ai, 'acciones': construir_acciones_contacto(), 'opciones': []})
        return jsonify({'respuesta': CONTACTO_REDIRECT, 'acciones': construir_acciones_contacto(), 'opciones': []})

    contexto_productos = construir_contexto_productos(productos_relevantes, categorias)
    contexto_categorias = construir_contexto_categorias(categorias_relevantes, productos, categorias)

    try:
        respuesta = responder_con_openai(mensaje, contexto_productos, contexto_categorias, historial=historial)
    except Exception as exc:
        logger.exception('OpenAI fallback triggered')
        log_chat_event('openai_fallback', client_id=client_id, error=str(exc))
        respuesta = build_fallback_response(productos_relevantes, categorias_relevantes, productos, categorias)

    acciones = []
    opciones = []
    if consulta_producto and productos_relevantes and not consulta_ambigua:
        producto_principal = productos_relevantes[0]
        if producto_requiere_selector_plan(producto_principal, categorias):
            respuesta = ''
            opciones = construir_opciones_chat([producto_principal], categorias)
        elif producto_tiene_tarjeta_simple(producto_principal, categorias):
            respuesta = ''
            acciones = construir_acciones_producto_unico(producto_principal, categorias)
            opciones = construir_opciones_chat([producto_principal], categorias)
        else:
            acciones = construir_acciones_compra(producto_principal, categorias)

    if not isinstance(respuesta, str):
        respuesta = str(respuesta or '').strip()
    return jsonify({'respuesta': respuesta, 'acciones': acciones, 'opciones': opciones})


@app.route('/chat/telemetry', methods=['POST'])
def chat_telemetry():
    client_id = get_client_identifier()
    if not telemetry_is_authorized():
        log_chat_event('telemetry_unauthorized', client_id=client_id)
        return jsonify({'error': 'No autorizado'}), 401
    data = request.get_json(silent=True) or {}
    event_name = str(data.get('event', '') or '').strip().lower()
    allowed_events = {'add_to_cart', 'buy_now', 'go_to_cart'}
    if event_name not in allowed_events:
        return jsonify({'error': 'Evento no permitido'}), 400
    log_chat_event('frontend_action', client_id=client_id, event=event_name, metadata=data.get('metadata', {}))
    return jsonify({'ok': True})

if __name__ == '__main__':
    if USE_WAITRESS:
        try:
            from waitress import serve
            serve(app, host=APP_HOST, port=APP_PORT)
        except Exception:
            logger.exception('Failed to start waitress server, falling back to Flask development server')
            app.run(host=APP_HOST, port=APP_PORT, debug=APP_DEBUG)
    else:
        app.run(host=APP_HOST, port=APP_PORT, debug=APP_DEBUG)
