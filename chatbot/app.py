
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
    "No encontre ese juego en el catalogo ahora mismo.\n\n"
    "Si quieres, te dejo botones de contacto para revisar disponibilidad o buscar una alternativa."
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

PALABRAS_REFINAR_BUSQUEDA = {
    'otro', 'otra', 'busco', 'buscar', 'quiero', 'alguno', 'alguna', 'mas',
    'similar', 'parecido', 'parecida', 'opcion', 'opciones', 'de', 'del', 'el',
    'la', 'los', 'las', 'un', 'una'
}

INFO_KEYWORDS = {
    'promociones': {'promocion', 'promociones', 'promo', 'promos', 'ofertas', 'oferta', 'descuento', 'descuentos'},
    'instalacion': {'instalacion', 'instalar', 'instalo', 'guia', 'tutorial', 'como instalar', 'descargar', 'instalkacion'},
    'pagos': {'pago', 'pagos', 'medio de pago', 'medios de pago', 'como pagar', 'tarjeta', 'transferencia', 'paypal', 'crypto'},
    'terminos': {'terminos', 'condiciones', 'seguridad', 'garantia', 'garantias', 'legal', 'terminos y condiciones'},
    'contacto': {'contacto', 'contactar', 'soporte', 'ayuda', 'humano', 'persona', 'whatsapp', 'instagram', 'telegram', 'asesor'},
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


def sanitize_history(historial):
    if not isinstance(historial, list):
        raise ValueError('historial debe ser una lista')

    historial_sanitizado = []
    for item in historial[:MAX_HISTORY_ITEMS]:
        if not isinstance(item, dict):
            continue
        texto = str(item.get('text', '') or item.get('content', '') or '').strip()
        origen = str(item.get('from', '') or item.get('role', '') or '').strip().lower()
        if not texto:
            continue
        if len(texto) > MAX_HISTORY_TEXT_LENGTH:
            texto = texto[:MAX_HISTORY_TEXT_LENGTH]
        if origen in ['user', 'usuario']:
            from_value = 'user'
        elif origen in ['bot', 'assistant', 'asistente', 'system']:
            from_value = 'bot'
        else:
            continue
        historial_sanitizado.append({'from': from_value, 'text': texto})
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
    'quiero', 'necesito', 'busco', 'tienen', 'tienes', 'hay', 'me', 'puedes', 'puedo',
    'como', 'instalacion', 'instalar', 'soporte', 'ayuda', 'precio', 'precios',
    'valor', 'vale', 'cuesta', 'categoria', 'categorias', 'juegos', 'juego', 'para',
    'con', 'en', 'por', 'favor', 'hablar', 'cliente', 'promocion', 'promociones'
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
    return [token for token in normalizar_texto(texto).split() if token and token not in STOPWORDS]


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

    if tokens_consulta and tokens_consulta.issubset(tokens_nombre):
        score += 20

    similitud = SequenceMatcher(None, consulta_norm, nombre_norm).ratio()
    score += int(similitud * 30)

    if tokens_consulta:
        for token in tokens_consulta:
            for token_nombre in tokens_nombre:
                if SequenceMatcher(None, token, token_nombre).ratio() >= 0.82:
                    score += 8
                    break

    return score

def buscar_productos_relevantes(consulta, productos, limite=None):
    puntuados = []
    for producto in productos:
        score = puntuar_producto(consulta, producto)
        if score > 0:
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
    if productos_relevantes or categorias_relevantes:
        return True
    if tokens & PALABRAS_INTENCION_PRODUCTO:
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
                f"No encontre una alternativa mas precisa para '{consulta_refinada}'.\n\n"
                "Si quieres, escribe el nombre exacto del juego o usa un boton de contacto para que te ayudemos a revisarlo."
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
    if any(frase in mensaje_norm for frase in PALABRAS_FRUSTRACION):
        return True
    if 'soporte' in mensaje_norm and ('humano' in mensaje_norm or 'persona' in mensaje_norm):
        return True
    historial_usuario = [
        normalizar_texto(item.get('text', ''))
        for item in historial[-6:]
        if isinstance(item, dict) and str(item.get('from', '')).lower() == 'user'
    ]
    if len(historial_usuario) >= 3 and len({texto for texto in historial_usuario if texto}) <= 2:
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
    return {
        'respuesta': '',
        'acciones': construir_acciones_compra(producto, categorias),
        'opciones': [],
    }


def construir_respuesta_acciones_filtradas(acciones):
    return {'respuesta': '', 'acciones': acciones, 'opciones': []}


def resolver_seleccion_por_contexto(mensaje, historial, productos, categorias):
    ultimo = obtener_ultimo_mensaje_interactivo(historial)
    if not ultimo:
        return None

    mensaje_norm = normalizar_texto(mensaje)
    indice = extraer_indice_opcion(mensaje)
    opciones = ultimo.get('options') or []
    acciones = ultimo.get('actions') or []

    if opciones:
        if len(opciones) == 1 and ('esa misma' in mensaje_norm or 'ese mismo' in mensaje_norm):
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

        for opcion in opciones:
            title_norm = normalizar_texto(opcion.get('title', ''))
            if title_norm and title_norm in mensaje_norm:
                payload = ((opcion.get('action') or {}).get('producto') or {})
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

        if 'esa misma' in mensaje_norm or 'ese mismo' in mensaje_norm:
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
            'respuesta': 'Para Nintendo Switch solo vendemos primarias y juegas desde tu perfil personal.',
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


def coincide_keyword_aproximada(mensaje_norm, keywords):
    tokens = mensaje_norm.split()
    for keyword in keywords:
        keyword_norm = normalizar_texto(keyword)
        if not keyword_norm:
            continue
        if keyword_norm in mensaje_norm:
            return True
        keyword_tokens = keyword_norm.split()
        if keyword_tokens and all(token in tokens for token in keyword_tokens):
            return True
        for token in tokens:
            if len(token) < 5 or len(keyword_norm) < 5:
                continue
            if SequenceMatcher(None, token, keyword_norm).ratio() >= 0.82:
                return True
    return False


def detectar_intencion_info(mensaje):
    mensaje_norm = normalizar_texto(mensaje)
    for nombre, keywords in INFO_KEYWORDS.items():
        if coincide_keyword_aproximada(mensaje_norm, keywords):
            return nombre
    return None


def construir_respuesta_info(intencion):
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

    if intencion == 'contacto':
        return {
            'respuesta': (
                "Soporte Panda Store\n\n"
                "Si quieres hablar con una persona, usa el canal que te quede mas comodo."
            ),
            'acciones': construir_acciones_contacto(),
        }

    return None


def construir_acciones_compra(producto, categorias):
    categoria = obtener_categoria_nombre(producto, categorias).lower()
    acciones = []
    base = dict(producto)

    def agregar_acciones(payload, buy_label, cart_label):
        acciones.append({'type': 'buy', 'label': buy_label, 'producto': payload})
        acciones.append({'type': 'add_to_cart', 'label': cart_label, 'producto': payload})

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
        return acciones[:4]

    if producto.get('priceCLP') or producto.get('priceUSD'):
        agregar_acciones(base, 'Comprar ahora', 'Agregar al carrito')
        acciones.append({'type': 'go_to_cart', 'label': 'Ir al carrito'})

    return acciones


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
        if not texto:
            continue
        if origen in ['user', 'usuario']:
            role = 'user'
        elif origen in ['bot', 'assistant', 'asistente', 'system']:
            role = 'assistant'
        else:
            continue
        mensajes.append({'role': role, 'content': texto})
    return mensajes


def responder_con_openai(mensaje, contexto_productos, contexto_categorias, historial=None):
    mensajes = [
        {
            'role': 'system',
            'content': PROMPT_BASE + "\nCONTEXTO DE PRODUCTOS:\n" + contexto_productos + "\n\nCONTEXTO DE CATEGORIAS:\n" + contexto_categorias + "\n\nINSTRUCCIONES FINALES:\n- Manten continuidad conversacional con el historial reciente.\n- Si el usuario responde algo corto como un pais, un numero, un si/no o una aclaracion, interpretalo segun la pregunta anterior del chat.\n- Si el usuario pregunta por un juego o precio, responde solo con: titulo, consola/categoria y precio.\n- Si el usuario pregunta que venden, menciona juegos digitales, suscripciones y streaming.\n- No incluyas descripcion del juego salvo que el usuario la pida explicitamente.\n- Si el usuario pide precio, menciona el precio exacto del contexto.\n- Si el usuario pide soporte o instalacion, responde esa ayuda directamente y sin URLs visibles.\n- Si no hay coincidencia clara de producto, dilo con honestidad y luego ayuda igual.\n- Si la consulta es general como 'que juegos venden', responde con categorias y algunos ejemplos del contexto.\n- Usa 🇨🇱 para precios en pesos chilenos y 🇺🇸 para precios en dolares.\n- Ordena la respuesta con bloques cortos y faciles de leer.\n- No cambies de tema si el usuario esta respondiendo a una pregunta previa.\n- No respondas con bloques tecnicos ni JSON.\n- No escribas URLs completas."
        },
    ]

    mensajes.extend(construir_historial_openai(historial))
    mensajes.append({'role': 'user', 'content': mensaje})

    if openai_client is not None:
        respuesta = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=mensajes,
            temperature=0.5,
            max_tokens=350,
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
        temperature=0.5,
        max_tokens=350,
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
    if tipo_faq_switch and contexto_es_nintendo_switch(mensaje, historial):
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
    if intencion_info:
        respuesta_info = construir_respuesta_info(intencion_info)
        if respuesta_info:
            log_chat_event('info_intent', client_id=client_id, intent=intencion_info)
            if 'opciones' not in respuesta_info:
                respuesta_info['opciones'] = []
            return jsonify(respuesta_info)

    respuesta_refinada = construir_respuesta_refinar_busqueda(mensaje, historial, productos, categorias)
    if respuesta_refinada:
        log_chat_event('refined_search', client_id=client_id, message=mensaje)
        if 'opciones' not in respuesta_refinada:
            respuesta_refinada['opciones'] = []
        return jsonify(respuesta_refinada)

    productos_relevantes = buscar_productos_relevantes(mensaje, productos)
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
